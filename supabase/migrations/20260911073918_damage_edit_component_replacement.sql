-- Atomic replacement when editing a damage case. Existing creation workflow is unchanged.
create table public.damage_component_exchange_log (
 id uuid primary key default gen_random_uuid(),
 damage_case_id uuid not null references public.damage_case(id),
 actor_id uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 old_assignment jsonb not null,
 source_assignment jsonb,
 new_assignment jsonb not null
);
alter table public.damage_component_exchange_log enable row level security;
grant select, insert on public.damage_component_exchange_log to authenticated;
create policy exchange_log_read on public.damage_component_exchange_log for select to authenticated
 using (public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));
create policy exchange_log_insert on public.damage_component_exchange_log for insert to authenticated
 with check (pg_trigger_depth() > 0 and actor_id = auth.uid() and public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));

create function public.exchange_damage_component_on_edit() returns trigger
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
 if new.replacement_component_id is not distinct from old.replacement_component_id then return new; end if;
 if auth.uid() is null or not public.current_app_user_has_any_role(array['admin','ipad_verwaltung']) then
  raise exception 'Keine Berechtigung zum Komponententausch.';
 end if;
 if old.replacement_component_id is not null then
  raise exception 'Ein bereits dokumentierter Austausch darf nicht überschrieben werden. Bitte einen neuen Schadensfall anlegen.';
 end if;
 if new.component_id is null or new.set_id is null or new.component_id = new.replacement_component_id then
  raise exception 'Für den Austausch werden ein Set und zwei verschiedene Komponenten benötigt.';
 end if;
 if new.component_id is distinct from old.component_id or new.set_id is distinct from old.set_id then
  raise exception 'Die ursprüngliche Schadenszuordnung darf beim Austausch nicht verändert werden.';
 end if;
 if new.replacement_issued_at is null or new.replacement_issued_at > current_date then
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
 update public.inventory_component set condition='defekt' where id=new.component_id;
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
revoke all on function public.exchange_damage_component_on_edit() from public, anon, authenticated;
create trigger damage_component_exchange_on_edit before update of replacement_component_id on public.damage_case
 for each row execute function public.exchange_damage_component_on_edit();
