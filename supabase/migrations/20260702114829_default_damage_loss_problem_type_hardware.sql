alter table public.damage_case
  drop constraint if exists damage_case_problem_type_matches_case_type;

update public.damage_case
set problem_type = 'hardware'
where case_type in ('schaden', 'verlust')
  and problem_type is distinct from 'hardware';

alter table public.damage_case
  add constraint damage_case_problem_type_matches_case_type
    check (
      (
        case_type in ('schaden', 'verlust')
        and problem_type = 'hardware'
      )
      or (
        case_type = 'technisches_problem'
        and (
          problem_type is null
          or problem_type in ('hardware', 'software')
        )
      )
    );

comment on column public.damage_case.problem_type is
  'Problemart des Vorgangs. Schadens- und Verlustmeldungen werden immer als Hardware erfasst; technische Probleme koennen Hardware oder Software sein.';
