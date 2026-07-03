create type public.damage_problem_type as enum (
  'hardware',
  'software'
);

alter table public.damage_case
  add column problem_type public.damage_problem_type,
  add constraint damage_case_problem_type_matches_case_type
    check (
      problem_type is null
      or case_type = 'technisches_problem'
    );

comment on type public.damage_problem_type is
  'Fachliche Einordnung eines technischen Problems als Hardware- oder Softwareproblem.';

comment on column public.damage_case.problem_type is
  'Nur fuer technische Probleme gesetzt. Hardwareprobleme koennen Komponenten als defekt markieren; Softwareprobleme werden geloest oder durch Zuruecksetzen bearbeitet.';
