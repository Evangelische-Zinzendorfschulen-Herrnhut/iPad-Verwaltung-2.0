do $$
declare
  target_assignment_id constant uuid := '0b0b2b42-9aea-48e2-8044-e1c04a22103f';
  target_set_id constant uuid := '0abb4acb-dcf0-4d40-a1a6-6f2e475fdd3e';
  target_person_id constant uuid := '9aae4f7f-fbcd-44c5-a54e-ac5544a58890';
  target_count integer;
begin
  lock table public.set_person_assignment in share row exclusive mode;

  select count(*)
  into target_count
  from public.set_person_assignment assignment
  join public.inventory_set inventory_set on inventory_set.id = assignment.set_id
  where assignment.id = target_assignment_id
    and assignment.set_id = target_set_id
    and assignment.person_id = target_person_id
    and assignment.returned_at is null
    and inventory_set.legacy_set_id = 133;

  if target_count <> 1 then
    raise exception 'Die erwartete offene Falschausgabe von Set 133 wurde nicht eindeutig gefunden.';
  end if;

  delete from public.set_person_assignment
  where id = target_assignment_id
    and set_id = target_set_id
    and person_id = target_person_id
    and returned_at is null;

  get diagnostics target_count = row_count;
  if target_count <> 1 then
    raise exception 'Die Falschausgabe von Set 133 wurde nicht entfernt.';
  end if;
end $$;
