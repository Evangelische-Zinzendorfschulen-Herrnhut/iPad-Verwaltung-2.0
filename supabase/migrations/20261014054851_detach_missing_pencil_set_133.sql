do $$
declare
  target_assignment_id constant uuid := '9c697119-8da1-4478-8f7f-09efbe030601';
  target_component_id constant uuid := '96b80b2a-2b4f-4c67-b807-d136b56ff0f4';
  target_set_id constant uuid := '0abb4acb-dcf0-4d40-a1a6-6f2e475fdd3e';
  changed_at constant timestamptz := now();
  target_count integer;
begin
  lock table public.set_component_assignment, public.inventory_component in share row exclusive mode;

  select count(*)
  into target_count
  from public.set_component_assignment assignment
  join public.inventory_component component on component.id = assignment.component_id
  join public.inventory_set inventory_set on inventory_set.id = assignment.set_id
  where assignment.id = target_assignment_id
    and assignment.component_id = target_component_id
    and assignment.set_id = target_set_id
    and assignment.role = 'pencil'
    and assignment.valid_until is null
    and component.legacy_inventory_number = 'E000633 / 0133'
    and inventory_set.legacy_set_id = 133;

  if target_count <> 1 then
    raise exception 'Der erwartete Pencil von Set 133 wurde nicht eindeutig gefunden.';
  end if;

  update public.set_component_assignment
  set valid_until = changed_at
  where id = target_assignment_id
    and valid_until is null;

  update public.inventory_component
  set condition = 'unklar',
      notes = concat_ws(
        E'\n',
        nullif(notes, ''),
        'Inventur 2026-10-14: Nicht mehr physisch bei Set 133 vorhanden; Verbleib ungeklärt. Set-Zuordnung beendet.'
      )
  where id = target_component_id;
end $$;
