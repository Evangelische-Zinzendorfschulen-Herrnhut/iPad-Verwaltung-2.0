alter table public.set_person_assignment
  drop constraint if exists set_person_assignment_dates_valid;

comment on column public.set_person_assignment.returned_at is
  'Legacy-Rueckgabedatum. Kann bei historischen Importdaten vor issued_at liegen und muss app-seitig als Datenkonflikt angezeigt werden.';
