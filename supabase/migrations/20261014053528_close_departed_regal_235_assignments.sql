do $$
declare
  target_assignment_ids uuid[] := array[
    '234c84ba-0060-4967-b59d-382433f66c00'::uuid,
    'a204db7a-ca3c-4c87-9c1f-b3add9f44d65'::uuid,
    '9cbd9026-0c64-4d9a-a625-b6badc0f5823'::uuid,
    'b061fc94-2c83-44e7-a497-3b5d096f7f7b'::uuid,
    'ba33f1db-6caf-4675-83e4-c62293bb17b0'::uuid,
    '2cfb185b-95a5-4c25-87ee-76b34e89df05'::uuid
  ];
  target_count integer;
begin
  lock table public.set_person_assignment in share row exclusive mode;

  select count(*)
  into target_count
  from public.set_person_assignment assignment
  join public.inventory_set inventory_set on inventory_set.id = assignment.set_id
  join public.person person on person.id = assignment.person_id
  where assignment.id = any(target_assignment_ids)
    and assignment.returned_at is null
    and person.status = 'ausgeschieden'
    and inventory_set.storage_label like 'Regal 2.35%';

  if target_count <> 6 then
    raise exception 'Erwartet wurden 6 offene Regal-Ausgaben ausgeschiedener Personen, gefunden wurden %.', target_count;
  end if;

  update public.set_person_assignment
  set returned_at = date '2026-04-24',
      return_note = concat_ws(
        E'\n',
        nullif(return_note, ''),
        'Rückgabe nachträglich erfasst: Person ausgeschieden; Set bereits im Regal 2.35.'
      )
  where id = any(target_assignment_ids)
    and returned_at is null;

  get diagnostics target_count = row_count;
  if target_count <> 6 then
    raise exception 'Es wurden % statt 6 Ausgaben geschlossen.', target_count;
  end if;
end $$;
