do $$
declare
  target_assignment_id constant uuid := '67c8d30f-f1bf-4bcf-8238-269bf7aee612';
  target_set_id constant uuid := 'cada62a1-aaa8-4fba-9d01-4ba9d41553a3';
  target_person_id constant uuid := 'df6aecba-fb20-424d-af05-2670f01660b9';
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
    and inventory_set.legacy_set_id = 93;

  if target_count <> 1 then
    raise exception 'Die erwartete offene Falschausgabe von Set 93 wurde nicht eindeutig gefunden.';
  end if;

  delete from public.set_person_assignment
  where id = target_assignment_id
    and set_id = target_set_id
    and person_id = target_person_id
    and returned_at is null;

  get diagnostics target_count = row_count;
  if target_count <> 1 then
    raise exception 'Die Falschausgabe von Set 93 wurde nicht entfernt.';
  end if;
end $$;
