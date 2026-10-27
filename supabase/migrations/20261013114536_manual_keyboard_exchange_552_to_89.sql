-- Einmalige, ausdruecklich freigegebene manuelle Ausnahme am 13.10.2026.
-- Ausschliesslich zwei Tastaturen; keine Ausleihe oder Schadensmeldung schreiben.
lock table public.inventory_set,public.inventory_component,public.set_component_assignment,public.set_person_assignment in access exclusive mode;
alter table public.set_component_assignment disable trigger guard_introduction_component_removal;
do $exchange$
declare target public.inventory_set%rowtype; donor public.inventory_set%rowtype;
 old_component public.inventory_component%rowtype; replacement public.inventory_component%rowtype;
 old_link public.set_component_assignment%rowtype; source_link public.set_component_assignment%rowtype;
 new_link public.set_component_assignment%rowtype; actor uuid; auth_actor text;
 exchange_time timestamptz:=now(); before_snapshot jsonb; after_snapshot jsonb; assignment_hash text;
begin
 select au.id,ai.provider_user_id into strict actor,auth_actor from public.app_user au join public.auth_identity ai on ai.app_user_id=au.id where au.email='markus.hacker@ezsh.de' and au.status='active' and ai.provider='supabase';
 perform set_config('request.jwt.claim.sub',auth_actor,true);
 if not public.current_app_user_has_role('admin') then raise exception 'Admin erforderlich'; end if;
 select * into strict target from public.inventory_set where legacy_set_id=89;
 select * into strict donor from public.inventory_set where legacy_set_id=552;
 select * into strict old_component from public.inventory_component where legacy_inventory_number='E000939 / 0089';
 select * into strict replacement from public.inventory_component where legacy_inventory_number='E001068 / 0218';
 select * into strict old_link from public.set_component_assignment where component_id=old_component.id and valid_until is null;
 select * into strict source_link from public.set_component_assignment where component_id=replacement.id and valid_until is null;
 if target.availability<>'ipad_einfuehrung' or target.storage_label<>'W5 - 16' or target.assigned_person_id is null
 or old_link.set_id<>target.id or source_link.set_id<>donor.id
 or old_link.role<>'keyboard' or source_link.role<>'keyboard'
 or old_component.category<>'keyboard' or replacement.category<>'keyboard'
 or replacement.condition not in('ok','beschädigt_nutzbar')
 or old_link.valid_from>exchange_time or source_link.valid_from>exchange_time then raise exception 'Bestand nicht mehr passend'; end if;
 select md5(string_agg(to_jsonb(a)::text,'' order by a.id)) into assignment_hash from public.set_person_assignment a where set_id in(target.id,donor.id);
 before_snapshot:=jsonb_build_object('target',jsonb_build_object('id',target.id,'person_id',target.assigned_person_id,'availability',target.availability,'condition',target.condition,'storage_label',target.storage_label),
 'donor',jsonb_build_object('id',donor.id,'person_id',donor.assigned_person_id,'availability',donor.availability,'condition',donor.condition,'storage_label',donor.storage_label),
 'old_assignment',to_jsonb(old_link),'source_assignment',to_jsonb(source_link),'old_component_condition',old_component.condition,'replacement_condition',replacement.condition);
 update public.set_component_assignment set valid_until=exchange_time where id in(old_link.id,source_link.id);
 insert into public.set_component_assignment(set_id,component_id,role,legacy_set_id,valid_from,source)
 values(target.id,replacement.id,'keyboard',target.legacy_set_id,exchange_time,'manual_exception_keyboard_exchange_20261013') returning * into new_link;
 update public.inventory_component set condition='defekt' where id=old_component.id;
 update public.inventory_set set condition='unvollständig' where id=donor.id;
 if assignment_hash is distinct from(select md5(string_agg(to_jsonb(a)::text,'' order by a.id)) from public.set_person_assignment a where set_id in(target.id,donor.id)) then raise exception 'Ausleihe wurde veraendert'; end if;
 after_snapshot:=jsonb_build_object('target',jsonb_build_object('id',target.id,'person_id',target.assigned_person_id,'availability',target.availability,'condition',target.condition,'storage_label',target.storage_label),
 'donor',jsonb_build_object('id',donor.id,'person_id',donor.assigned_person_id,'availability',donor.availability,'condition','unvollständig','storage_label',donor.storage_label),
 'new_assignment',to_jsonb(new_link),'old_component_condition','defekt','replacement_condition',replacement.condition,
 'exchanged_at','2026-10-13','reason','Ausdruecklich freigegebene manuelle Ausnahme trotz offener Ausgabe Set 552; Tastatur 218 liegt physisch bei der iPad-Verwaltung; kein neuer Schadensfall');
 insert into public.set_introduction_audit(actor_id,object_type,object_id,before_data,after_data)
 values(actor,'manual_component_exchange',target.id,before_snapshot,after_snapshot);
end $exchange$;
alter table public.set_component_assignment enable trigger guard_introduction_component_removal;
set constraints all immediate;
