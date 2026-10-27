do $$
declare
  target_assignment_id constant uuid := '63564912-966b-4d6f-a4dd-350c31177f20';
  target_set_id constant uuid := '1e8423c4-586a-4313-a06a-65654abae371';
  target_person_id constant uuid := '95a50e01-5546-4e33-9e5c-dd376c753700';
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
    and inventory_set.legacy_set_id = 362;

  if target_count <> 1 then
    raise exception 'Die erwartete offene Falschausgabe von Set 362 wurde nicht eindeutig gefunden.';
  end if;

  delete from public.set_person_assignment
  where id = target_assignment_id
    and set_id = target_set_id
    and person_id = target_person_id
    and returned_at is null;

  get diagnostics target_count = row_count;
  if target_count <> 1 then
    raise exception 'Die Falschausgabe von Set 362 wurde nicht entfernt.';
  end if;
end $$;
