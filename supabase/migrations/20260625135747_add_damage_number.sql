create sequence if not exists public.damage_case_number_seq;

alter table public.damage_case
  add column damage_number bigint;

with numbered_cases as (
  select
    id,
    row_number() over (
      order by
        legacy_damage_id nulls last,
        reported_at,
        created_at,
        id
    ) as next_number
  from public.damage_case
)
update public.damage_case damage_case
set damage_number = numbered_cases.next_number
from numbered_cases
where damage_case.id = numbered_cases.id;

select setval(
  'public.damage_case_number_seq',
  coalesce((select max(damage_number) from public.damage_case), 0) + 1,
  false
);

alter table public.damage_case
  alter column damage_number set default nextval('public.damage_case_number_seq'),
  alter column damage_number set not null,
  add constraint damage_case_damage_number_unique unique (damage_number);

comment on column public.damage_case.damage_number is
  'Fortlaufende, menschlich lesbare Schadensnummer. Technischer Primaerschluessel bleibt id/uuid.';
