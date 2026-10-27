do $$
declare
  target_set_id constant uuid := '0abb4acb-dcf0-4d40-a1a6-6f2e475fdd3e';
  inventory_note constant text := 'Inventur 2026-10-14: Bestand geprüft. Vorhanden ist nur das iPad E000283 / 0133. Pencil E000633 / 0133 physisch nicht vorhanden und wegen ungeklärten Verbleibs ausgetragen; Tastatur fehlt. Set bleibt unvollständig und blockiert.';
  active_component_count integer;
begin
  lock table public.inventory_set, public.set_component_assignment in share row exclusive mode;

  select count(*)
  into active_component_count
  from public.set_component_assignment
  where set_id = target_set_id
    and valid_until is null;

  if active_component_count <> 1
    or not exists (
      select 1
      from public.set_component_assignment assignment
      join public.inventory_component component on component.id = assignment.component_id
      where assignment.set_id = target_set_id
        and assignment.valid_until is null
        and assignment.role = 'ipad'
        and component.legacy_inventory_number = 'E000283 / 0133'
    ) then
    raise exception 'Der erwartete Ein-Komponenten-Bestand von Set 133 wurde nicht gefunden.';
  end if;

  update public.inventory_set
  set condition = 'unvollständig',
      availability = 'blockiert',
      legacy_status = 'unvollständig',
      notes = concat_ws(E'\n', nullif(notes, ''), inventory_note)
  where id = target_set_id
    and legacy_set_id = 133;
end $$;
