alter table public.set_person_assignment
  add column if not exists return_defects text,
  add column if not exists return_resolutions text;

comment on column public.set_person_assignment.return_defects is
  'Festgestellte Mängel bei der Set-Rückgabe für das Rückgabeprotokoll.';

comment on column public.set_person_assignment.return_resolutions is
  'Getroffene Festlegungen zur Behebung der Mängel für das Rückgabeprotokoll.';
