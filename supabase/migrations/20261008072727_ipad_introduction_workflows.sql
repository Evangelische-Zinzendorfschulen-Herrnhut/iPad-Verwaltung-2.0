-- No backfill: existing sets/assignments retain their state.
create function public.ipad_wagon_place(label text) returns integer
language sql immutable strict set search_path = '' as $$
 select case when label ~ '^W[1-6][[:space:]]*[-/:][[:space:]]*(0?[1-9]|[12][0-9]|30)[[:space:]]*$'
 then substring(label from '[-/:][[:space:]]*([0-9]+)')::integer end
$$;

create table public.set_introduction_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.app_user(id),
 created_at timestamptz not null default now(),
 object_type text not null,
 object_id uuid not null,
 before_data jsonb,
 after_data jsonb not null
);
alter table public.set_introduction_audit enable row level security;
grant select on public.set_introduction_audit to authenticated;
create policy introduction_audit_read on public.set_introduction_audit for select to authenticated
 using(public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));
revoke insert, update, delete on public.set_introduction_audit from authenticated, anon;

-- Trigger-only privilege for immutable audit; no client-callable privileged RPC.
create function public.audit_set_introduction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous jsonb; following jsonb := to_jsonb(new);
 audited_keys text[] := array['id','set_id','person_id','assigned_person_id','availability','condition','storage_label','ipad_introduction_at','issued_at','returned_at'];
begin
 if tg_op = 'UPDATE' then previous := to_jsonb(old); end if;
 if (tg_table_name = 'inventory_set' and
     (following->>'availability' = 'ipad_einfuehrung' or previous->>'availability' = 'ipad_einfuehrung'))
    or (tg_table_name = 'set_person_assignment' and
     (following->>'ipad_introduction_at' is not null or previous->>'ipad_introduction_at' is not null)) then
  if previous is distinct from following then
   insert into public.set_introduction_audit(actor_id,object_type,object_id,before_data,after_data)
   values(public.current_app_user_id(),tg_table_name,new.id,
    (select jsonb_object_agg(key,value) from jsonb_each(previous) where key=any(audited_keys)),
    (select jsonb_object_agg(key,value) from jsonb_each(following) where key=any(audited_keys)));
  end if;
 end if;
 return new;
end $$;
revoke all on function public.audit_set_introduction() from public, anon, authenticated;
create trigger inventory_set_introduction_audit after insert or update on public.inventory_set
 for each row execute function public.audit_set_introduction();
create trigger assignment_introduction_audit after insert or update on public.set_person_assignment
 for each row execute function public.audit_set_introduction();

create function public.check_set_introduction() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_id uuid; s public.inventory_set%rowtype;
begin
 if tg_table_name = 'inventory_set' then target_id := new.id;
 elsif tg_op = 'DELETE' then target_id := old.set_id;
 else target_id := new.set_id; end if;
 select * into s from public.inventory_set where id=target_id;
 if s.availability = 'ipad_einfuehrung' then
  if s.assigned_person_id is null or public.ipad_wagon_place(s.storage_label) is null
    or not exists(select 1 from public.person p where p.id=s.assigned_person_id and p.person_type='schueler' and p.status='aktiv')
    or not exists(select 1 from public.person_class_assignment c where c.person_id=s.assigned_person_id and c.valid_until is null)
    or not exists(select 1 from public.set_person_assignment a where a.set_id=s.id and a.person_id=s.assigned_person_id
     and a.returned_at is null and a.issued_at is null and a.ipad_introduction_at is not null) then
   raise exception 'iPad-Einführung benötigt aktive Schülerzuordnung, Klasse, Einführungsdatum und Wagenplatz W1–W6 / 1–30.';
  end if;
 end if;
 if tg_table_name='set_person_assignment' and tg_op='UPDATE' then
  if old.set_id is distinct from new.set_id and exists(select 1 from public.inventory_set x where x.id=old.set_id and x.availability='ipad_einfuehrung') then
   raise exception 'Die aktive Einführung darf nicht einem anderen Set zugeordnet werden.';
  end if;
 end if;
 return null;
end $$;
revoke all on function public.check_set_introduction() from public, anon, authenticated;
create constraint trigger inventory_set_introduction_check after insert or update on public.inventory_set
 deferrable initially deferred for each row execute function public.check_set_introduction();
create constraint trigger assignment_introduction_check after insert or update or delete on public.set_person_assignment
 deferrable initially deferred for each row execute function public.check_set_introduction();

create function public.change_set_issue(p_set_id uuid, p_target text, p_date date, p_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare s public.inventory_set%rowtype; a public.set_person_assignment%rowtype;
begin
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zur Ausgabe.' using errcode='42501';
 end if;
 if p_target not in ('ipad_einfuehrung','ausgegeben') or p_target is null or p_date is null
   or p_date > (now() at time zone 'Europe/Berlin')::date or length(coalesce(p_note,''))>4000 then
  raise exception 'Bitte gültigen Zustand, Datum und Notiz angeben.';
 end if;
 select * into s from public.inventory_set where id=p_set_id for update;
 select * into a from public.set_person_assignment where set_id=p_set_id and returned_at is null for update;
 if s.id is null or a.id is null or s.assigned_person_id is distinct from a.person_id
   or a.person_id is null or a.issued_at is not null
   or not exists(select 1 from public.person p where p.id=a.person_id and p.status='aktiv')
   or s.availability not in ('zugeordnet','ipad_einfuehrung') then
  raise exception 'Das Set ist nicht für diesen Ausgabeübergang vorbereitet.';
 end if;
 if s.condition <> 'ok' or
   (select count(*) from public.set_component_assignment ca join public.inventory_component c on c.id=ca.component_id
     where ca.set_id=s.id and ca.valid_until is null and ca.role in ('ipad','pencil','keyboard')
      and c.condition in ('ok','beschädigt_nutzbar')) <> 3 then
  raise exception 'Bitte Vollständigkeit und Zustand des Sets vor der Ausgabe prüfen.';
 end if;
 if p_target='ipad_einfuehrung' then
  if s.availability <> 'zugeordnet' or a.ipad_introduction_at is not null
    or public.ipad_wagon_place(s.storage_label) is null then
   raise exception 'Einführung benötigt ein vorbereitetes Set mit Wagenplatz W1–W6 / 1–30.';
  end if;
  update public.set_person_assignment set ipad_introduction_at=p_date,
    issue_note=concat_ws(E'\n',nullif(issue_note,''),nullif(p_note,'')) where id=a.id;
  update public.inventory_set set availability='ipad_einfuehrung' where id=s.id;
 else
  if a.ipad_introduction_at > p_date then raise exception 'Ausgabedatum liegt vor der iPad-Einführung.'; end if;
  update public.set_person_assignment set issued_at=p_date,
    issue_note=concat_ws(E'\n',nullif(issue_note,''),nullif(p_note,'')) where id=a.id;
  update public.inventory_set set availability='ausgegeben',storage_label=null where id=s.id;
 end if;
end $$;
revoke all on function public.change_set_issue(uuid,text,date,text) from public,anon;
grant execute on function public.change_set_issue(uuid,text,date,text) to authenticated;

create function public.issue_introduction_wagon(p_wagon text,p_snapshot jsonb,p_date date)
returns integer language plpgsql security invoker set search_path = '' as $$
declare s public.inventory_set%rowtype; affected integer := 0; expected integer;
begin
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zur Wagen-Ausgabe.' using errcode='42501';
 end if;
 if p_wagon is null or p_wagon !~ '^W[1-6]$' or jsonb_typeof(p_snapshot) is distinct from 'array' then
  raise exception 'Bitte gültigen Wagen und Vorschau angeben.';
 end if;
 expected := jsonb_array_length(p_snapshot);
 if expected < 1 or expected > 30 then raise exception 'Vorschau muss 1 bis 30 Sets enthalten.'; end if;
 -- Short transaction: stable full-wagon membership even against direct table writes.
 lock table public.inventory_set in share row exclusive mode;
 if (select count(*) from public.inventory_set where availability='ipad_einfuehrung'
       and left(storage_label,2)=p_wagon) <> expected
   or (select count(distinct (x->>'id')::uuid) from jsonb_array_elements(p_snapshot) x) <> expected
   or exists(select 1 from jsonb_array_elements(p_snapshot) x where not exists(
     select 1 from public.inventory_set i where i.id=(x->>'id')::uuid
       and i.updated_at=(x->>'updated_at')::timestamptz and i.availability='ipad_einfuehrung'
       and left(i.storage_label,2)=p_wagon and i.assigned_person_id is not null)) then
  raise exception 'Bestand seit Vorschau geändert. Bitte Wagenliste neu laden und erneut bestätigen.';
 end if;
 for s in select * from public.inventory_set where availability='ipad_einfuehrung'
   and left(storage_label,2)=p_wagon order by id for update loop
  perform public.change_set_issue(s.id,'ausgegeben',p_date,null);
  affected := affected+1;
 end loop;
 return affected;
end $$;
revoke all on function public.issue_introduction_wagon(text,jsonb,date) from public,anon;
grant execute on function public.issue_introduction_wagon(text,jsonb,date) to authenticated;

-- Creation audits are inserted by BEFORE INSERT; defer the FK until the case exists.
alter table public.damage_component_exchange_log alter constraint damage_component_exchange_log_damage_case_id_fkey deferrable initially deferred;

-- The existing atomic edit trigger now also handles creation for introduction targets.
create or replace function public.exchange_damage_component_on_edit() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
 damaged public.inventory_component%rowtype;
 replacement public.inventory_component%rowtype;
 old_link public.set_component_assignment%rowtype;
 source_link public.set_component_assignment%rowtype;
 new_link public.set_component_assignment%rowtype;
 source_set public.inventory_set%rowtype;
 exchange_at timestamptz := now();
begin
 if tg_op='UPDATE' then
  if new.replacement_component_id is not distinct from old.replacement_component_id then return new; end if;
  if old.replacement_component_id is not null then raise exception 'Ein bereits dokumentierter Austausch darf nicht überschrieben werden.'; end if;
 end if;
 if new.replacement_component_id is null then return new; end if;
 if tg_op='UPDATE' and new.replacement_component_id is not distinct from old.replacement_component_id then return new; end if;
 if tg_op='INSERT' and not exists(select 1 from public.inventory_set where id=new.set_id and availability='ipad_einfuehrung') then return new; end if;
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zum Komponententausch.';
 end if;
 if tg_op='UPDATE' and old.replacement_component_id is not null then
  raise exception 'Ein bereits dokumentierter Austausch darf nicht überschrieben werden. Bitte einen neuen Schadensfall anlegen.';
 end if;
 if new.component_id is null or new.set_id is null or new.component_id = new.replacement_component_id then
  raise exception 'Für den Austausch werden ein Set und zwei verschiedene Komponenten benötigt.';
 end if;
 if tg_op='UPDATE' and (new.component_id is distinct from old.component_id or new.set_id is distinct from old.set_id) then
  raise exception 'Die ursprüngliche Schadenszuordnung darf beim Austausch nicht verändert werden.';
 end if;
 if new.replacement_issued_at is null or new.replacement_issued_at > (now() at time zone 'Europe/Berlin')::date then
  raise exception 'Bitte ein gültiges, nicht zukünftiges Austauschdatum angeben.';
 end if;
 -- Lock components in stable order, then recheck their current assignments.
 perform id from public.inventory_component where id in (new.component_id,new.replacement_component_id) order by id for update;
 select * into damaged from public.inventory_component where id=new.component_id;
 select * into replacement from public.inventory_component where id=new.replacement_component_id;
 if replacement.id is null or damaged.id is null or replacement.category <> damaged.category or replacement.condition not in ('ok','beschädigt_nutzbar') then
  raise exception 'Die Ersatzkomponente muss zur Kategorie passen und nutzbar sein.';
 end if;
 perform id from public.inventory_set where id=new.set_id for update;
 select * into old_link from public.set_component_assignment where set_id=new.set_id and component_id=new.component_id and valid_until is null for update;
 if old_link.id is null or old_link.role <> replacement.category then
  raise exception 'Die beschädigte Komponente ist nicht mehr im angegebenen Set.';
 end if;
 select * into source_link from public.set_component_assignment where component_id=new.replacement_component_id and valid_until is null for update;
 if source_link.id is not null then
  select * into source_set from public.inventory_set where id=source_link.set_id for update;
  if source_set.id is null or source_set.id=new.set_id or source_set.availability not in ('frei','blockiert') or source_set.assigned_person_id is not null
    or exists(select 1 from public.set_person_assignment where set_id=source_set.id and returned_at is null) then
   raise exception 'Ersatz darf nur aus einem freien oder blockierten Set ohne Personenzuordnung entnommen werden.';
  end if;
 end if;
 if old_link.valid_from > exchange_at or source_link.valid_from > exchange_at then raise exception 'Die Zuordnung beginnt in der Zukunft.'; end if;
 update public.set_component_assignment set valid_until=exchange_at where id=old_link.id;
 if source_link.id is not null then
  update public.set_component_assignment set valid_until=exchange_at where id=source_link.id;
  update public.inventory_set set condition='unvollständig' where id=source_link.set_id;
 end if;
 insert into public.set_component_assignment(set_id,component_id,role,legacy_set_id,valid_from,source)
 values(new.set_id,new.replacement_component_id,old_link.role,old_link.legacy_set_id,exchange_at,'damage_component_replacement') returning * into new_link;
 if new.case_type <> 'technisches_problem' or new.problem_type='hardware' then
  update public.inventory_component set condition='defekt' where id=new.component_id;
 end if;
 update public.inventory_set s set condition = case
  when (select count(distinct a.role) from public.set_component_assignment a where a.set_id=s.id and a.valid_until is null and a.role in ('ipad','pencil','keyboard')) < 3 then 'unvollständig'::public.set_condition
  when exists(select 1 from public.set_component_assignment a join public.inventory_component c on c.id=a.component_id where a.set_id=s.id and a.valid_until is null and c.condition in ('defekt','gesperrt_kein_mdm')) then 'defekt'::public.set_condition
  when exists(select 1 from public.set_component_assignment a join public.inventory_component c on c.id=a.component_id where a.set_id=s.id and a.valid_until is null and c.condition='unklar') then 'unklar'::public.set_condition
  else 'ok'::public.set_condition end where s.id=new.set_id;
 insert into public.damage_component_exchange_log(damage_case_id,old_assignment,source_assignment,new_assignment)
 values(new.id,to_jsonb(old_link),case when source_link.id is not null then to_jsonb(source_link) end,to_jsonb(new_link));
 new.legacy_exchange_status := 'ausgegeben';
 return new;
end $$;

create trigger introduction_damage_component_on_create before insert on public.damage_case
 for each row execute function public.exchange_damage_component_on_edit();

-- Only damage-trigger writes extend the inventory permissions of ipad_verwaltung.
create policy introduction_damage_components_update on public.inventory_component for update to authenticated
 using(pg_trigger_depth()>0 and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']))
 with check(pg_trigger_depth()>0 and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));
create policy introduction_damage_links_update on public.set_component_assignment for update to authenticated
 using(pg_trigger_depth()>0 and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']))
 with check(pg_trigger_depth()>0 and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));
create policy introduction_damage_links_insert on public.set_component_assignment for insert to authenticated
 with check(pg_trigger_depth()>0 and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));
grant update on public.inventory_component to authenticated;
grant insert,update on public.set_component_assignment to authenticated;

create function public.guard_introduction_component_removal() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if old.valid_until is null and exists(select 1 from public.inventory_set where id=old.set_id and availability='ipad_einfuehrung')
   and (tg_op='DELETE' or new.valid_until is not null or new.component_id is distinct from old.component_id
       or new.set_id is distinct from old.set_id or new.role is distinct from old.role)
   and pg_trigger_depth()<2 then
  raise exception 'Einführungssets dürfen nicht aufgetrennt werden. Internen Austausch über eine Schadensmeldung erfassen.';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_introduction_component_removal() from public,anon,authenticated;
create trigger guard_introduction_component_removal before update or delete on public.set_component_assignment
 for each row execute function public.guard_introduction_component_removal();

-- Full-set replacement during introduction transfers person and wagon atomically.
grant insert on public.set_introduction_audit to authenticated;
create policy introduction_audit_trigger_insert on public.set_introduction_audit for insert to authenticated
 with check(pg_trigger_depth()>0 and actor_id=public.current_app_user_id()
  and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));

create function public.exchange_introduction_set() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare s public.inventory_set%rowtype; replacement public.inventory_set%rowtype;
 a public.set_person_assignment%rowtype; new_assignment_id uuid; next_legacy_id integer;
 effective_date date := new.replacement_issued_at;
begin
 if tg_op='UPDATE' then
  if new.replacement_set_id is not distinct from old.replacement_set_id then return new; end if;
  if exists(select 1 from public.set_introduction_audit where object_type='introduction_set_exchange' and object_id=new.id) then
   raise exception 'Ein bereits dokumentierter Einführungstausch darf nicht überschrieben werden.';
  end if;
 end if;
 if new.replacement_set_id is null then return new; end if;
 select * into s from public.inventory_set where id=new.set_id;
 if s.availability <> 'ipad_einfuehrung' then return new; end if;
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zum Settausch.' using errcode='42501';
 end if;
 if tg_op='UPDATE' and old.replacement_set_id is not null then raise exception 'Bereits dokumentierten Settausch nicht überschreiben.'; end if;
 if new.replacement_component_id is not null or new.replacement_set_id=new.set_id or effective_date is null
   or effective_date > (now() at time zone 'Europe/Berlin')::date then raise exception 'Bitte gültiges Ersatzset und Austauschdatum angeben.'; end if;
 perform id from public.inventory_set where id in (new.set_id,new.replacement_set_id) order by id for update;
 select * into s from public.inventory_set where id=new.set_id;
 select * into replacement from public.inventory_set where id=new.replacement_set_id;
 select * into a from public.set_person_assignment where set_id=s.id and returned_at is null for update;
 if s.availability <> 'ipad_einfuehrung' or a.id is null or a.ipad_introduction_at is null
   or a.person_id is distinct from s.assigned_person_id or a.person_id is distinct from new.person_id
   or a.id is distinct from new.set_person_assignment_id or effective_date < a.ipad_introduction_at
   or replacement.id is null or replacement.availability <> 'frei' or replacement.condition <> 'ok'
   or replacement.assigned_person_id is not null or public.ipad_wagon_place(s.storage_label) is null
   or exists(select 1 from public.set_person_assignment where set_id=replacement.id and returned_at is null)
   or (select count(*) from public.set_component_assignment ca join public.inventory_component c on c.id=ca.component_id
       where ca.set_id=replacement.id and ca.valid_until is null and ca.role in ('ipad','pencil','keyboard') and c.condition in ('ok','beschädigt_nutzbar')) <> 3 then
  raise exception 'Ersatzset oder aktuelle Einführung ist nicht mehr gültig.';
 end if;
 select coalesce(min(legacy_assignment_id),0)-1 into next_legacy_id from public.set_person_assignment where legacy_assignment_id<0;
 update public.set_person_assignment set returned_at=effective_date,return_note=concat_ws(E'\n',return_note,'Kompletttausch während iPad-Einführung') where id=a.id;
 update public.inventory_set set availability='blockiert',assigned_person_id=null,legacy_user_id=null,storage_label=null,
  condition=case when new.case_type <> 'technisches_problem' or new.problem_type='hardware' then 'defekt'::public.set_condition else condition end where id=s.id;
 if new.case_type <> 'technisches_problem' or new.problem_type='hardware' then
  update public.inventory_component set condition='defekt' where id=coalesce(new.component_id,
    (select component_id from public.set_component_assignment where set_id=s.id and role='ipad' and valid_until is null));
 end if;
 insert into public.set_person_assignment(legacy_assignment_id,set_id,person_id,legacy_user_id,ipad_introduction_at,issued_at,issue_note,legacy_status)
 values(next_legacy_id,replacement.id,a.person_id,a.legacy_user_id,a.ipad_introduction_at,null,'Fortsetzung iPad-Einführung nach Kompletttausch','introduction_replacement') returning id into new_assignment_id;
 update public.inventory_set set availability='ipad_einfuehrung',assigned_person_id=a.person_id,
   legacy_user_id=a.legacy_user_id,storage_label=s.storage_label where id=replacement.id;
 insert into public.set_introduction_audit(actor_id,object_type,object_id,before_data,after_data)
 values(public.current_app_user_id(),'introduction_set_exchange',new.id,
  jsonb_build_object('set_id',s.id,'assignment_id',a.id,'storage_label',s.storage_label),
  jsonb_build_object('set_id',replacement.id,'assignment_id',new_assignment_id,'storage_label',s.storage_label,'exchanged_at',effective_date));
 new.legacy_exchange_status := 'ausgegeben';
 return new;
end $$;
revoke all on function public.exchange_introduction_set() from public,anon,authenticated;
create trigger introduction_full_set_exchange before insert or update of replacement_set_id on public.damage_case
 for each row execute function public.exchange_introduction_set();

-- Introduction return must finish assignment and set together (REST writes are separate transactions).
create function public.return_introduction_set(p_set_id uuid,p_assignment_id uuid,p_date date,p_checks jsonb,
 p_storage text,p_note text,p_defects text,p_resolutions text) returns void
language plpgsql security invoker set search_path = '' as $$
declare s public.inventory_set%rowtype; a public.set_person_assignment%rowtype; key text; complete boolean;
begin
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zur Rücknahme.' using errcode='42501';
 end if;
 if p_date is null or p_date>(now() at time zone 'Europe/Berlin')::date or jsonb_typeof(p_checks) is distinct from 'object' then
  raise exception 'Bitte gültiges Rückgabedatum und Vollständigkeitsprüfung angeben.';
 end if;
 foreach key in array array['return_ipad_present','return_pencil_present','return_keyboard_present','return_power_adapter_present','return_charging_cable_present','return_pencil_cap_present','pencil_accessory_required'] loop
  if jsonb_typeof(p_checks->key) is distinct from 'boolean' then raise exception 'Vollständigkeitsangaben fehlen.'; end if;
 end loop;
 select * into s from public.inventory_set where id=p_set_id for update;
 select * into a from public.set_person_assignment where id=p_assignment_id and set_id=p_set_id and returned_at is null for update;
 if s.availability is distinct from 'ipad_einfuehrung' or a.id is null or a.ipad_introduction_at>p_date then
  raise exception 'Aktuelle Einführung oder Rückgabedatum ist nicht gültig.';
 end if;
 complete := (p_checks->>'return_ipad_present')::boolean and (p_checks->>'return_pencil_present')::boolean
  and (p_checks->>'return_keyboard_present')::boolean and (p_checks->>'return_power_adapter_present')::boolean
  and (p_checks->>'return_charging_cable_present')::boolean
  and (not (p_checks->>'pencil_accessory_required')::boolean or (p_checks->>'return_pencil_cap_present')::boolean);
 update public.set_person_assignment set returned_at=p_date,return_note=p_note,return_defects=p_defects,return_resolutions=p_resolutions,
  return_ipad_present=(p_checks->>'return_ipad_present')::boolean,return_pencil_present=(p_checks->>'return_pencil_present')::boolean,
  return_keyboard_present=(p_checks->>'return_keyboard_present')::boolean,return_power_adapter_present=(p_checks->>'return_power_adapter_present')::boolean,
  return_charging_cable_present=(p_checks->>'return_charging_cable_present')::boolean,return_pencil_cap_present=(p_checks->>'return_pencil_cap_present')::boolean where id=a.id;
 update public.inventory_set set assigned_person_id=null,legacy_user_id=null,availability='blockiert',storage_label=p_storage,
  condition=case when complete then 'ok'::public.set_condition else 'unvollständig'::public.set_condition end where id=s.id;
end $$;
revoke all on function public.return_introduction_set(uuid,uuid,date,jsonb,text,text,text,text) from public,anon;
grant execute on function public.return_introduction_set(uuid,uuid,date,jsonb,text,text,text,text) to authenticated;
