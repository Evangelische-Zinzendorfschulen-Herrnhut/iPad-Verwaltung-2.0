-- Personen, Schuljahre, Klassen und Klassen-Zuordnungen
-- Grundlage: specs/data/schema-persons-classes.md

create extension if not exists citext;
create extension if not exists pgcrypto;

create type public.person_type as enum (
  'schueler',
  'lehrer',
  'mitarbeiter',
  'referendar',
  'praktikant'
);

create type public.person_status as enum (
  'aktiv',
  'ausgeschieden',
  'verstorben',
  'dublette',
  'test',
  'unklar'
);

create type public.school_year_status as enum (
  'geplant',
  'vorbereitet',
  'aktiv',
  'abgeschlossen'
);

create type public.class_assignment_source as enum (
  'import',
  'rollover',
  'manual'
);

create table public.person (
  id uuid primary key default gen_random_uuid(),
  legacy_user_id integer unique,
  first_name text,
  last_name text,
  email citext,
  person_type public.person_type not null,
  status public.person_status not null default 'aktiv',
  jahrgang integer,
  notes text,
  import_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_jahrgang_reasonable
    check (jahrgang is null or (jahrgang between 2000 and 2100))
);

create table public.school_year (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date not null,
  end_date date not null,
  status public.school_year_status not null default 'geplant',
  activated_at timestamptz,
  activated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_year_dates_valid check (end_date > start_date),
  constraint school_year_starts_august check (
    extract(month from start_date) = 8
    and extract(day from start_date) = 1
  ),
  constraint school_year_ends_july check (
    extract(month from end_date) = 7
    and extract(day from end_date) = 31
  )
);

create table public.school_class (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_year(id) on delete cascade,
  jahrgang integer,
  grade_level integer,
  label text not null,
  track integer,
  is_upper_school boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_class_unique_label_per_year unique (school_year_id, label),
  constraint school_class_grade_level_valid
    check (grade_level is null or grade_level between 5 and 12),
  constraint school_class_track_valid
    check (track is null or track between 1 and 4),
  constraint school_class_jahrgang_reasonable
    check (jahrgang is null or (jahrgang between 2000 and 2100))
);

create table public.person_class_assignment (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person(id) on delete cascade,
  school_class_id uuid not null references public.school_class(id) on delete cascade,
  valid_from date not null,
  valid_until date,
  source public.class_assignment_source not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_class_assignment_dates_valid
    check (valid_until is null or valid_until >= valid_from)
);

create unique index person_class_assignment_one_current_per_person
  on public.person_class_assignment (person_id)
  where valid_until is null;

create index person_legacy_user_id_idx on public.person (legacy_user_id);
create index person_type_status_idx on public.person (person_type, status);
create index person_name_idx on public.person (last_name, first_name);
create index person_email_idx on public.person (email);
create index school_class_school_year_idx on public.school_class (school_year_id);
create index school_class_grade_idx on public.school_class (school_year_id, grade_level);
create index person_class_assignment_class_idx
  on public.person_class_assignment (school_class_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger person_set_updated_at
  before update on public.person
  for each row execute function public.set_updated_at();

create trigger school_year_set_updated_at
  before update on public.school_year
  for each row execute function public.set_updated_at();

create trigger school_class_set_updated_at
  before update on public.school_class
  for each row execute function public.set_updated_at();

create trigger person_class_assignment_set_updated_at
  before update on public.person_class_assignment
  for each row execute function public.set_updated_at();

create or replace function public.school_year_label_for_date(target_date date)
returns text
language sql
immutable
as $$
  select case
    when extract(month from target_date) >= 8 then
      extract(year from target_date)::int::text
      || '/'
      || lpad(((extract(year from target_date)::int + 1) % 100)::text, 2, '0')
    else
      (extract(year from target_date)::int - 1)::text
      || '/'
      || lpad((extract(year from target_date)::int % 100)::text, 2, '0')
  end;
$$;

create or replace function public.expected_grade_level(
  schueler_jahrgang integer,
  school_year_start_year integer
)
returns integer
language sql
immutable
as $$
  select case
    when schueler_jahrgang is null or school_year_start_year is null then null
    else school_year_start_year - schueler_jahrgang + 5
  end;
$$;

alter table public.person enable row level security;
alter table public.school_year enable row level security;
alter table public.school_class enable row level security;
alter table public.person_class_assignment enable row level security;

comment on table public.person is
  'Personen fuer Set-Zuordnung und Ausleihhistorie. Legacy User wird ueber legacy_user_id referenziert.';
comment on column public.person.jahrgang is
  'Fachlicher Jahrgang. Bei spaeterem Schuleintritt der Jahrgang, der der Eintrittsklasse entspricht.';
comment on table public.school_year is
  'Schuljahr vom 01.08. bis 31.07., z. B. 2025/26.';
comment on table public.school_class is
  'Konkrete Klasse oder Oberstufen-Jahrgangsgruppe in einem Schuljahr.';
comment on table public.person_class_assignment is
  'Historisierte Zuordnung von Personen zu Klassen oder Jahrgangsgruppen.';
