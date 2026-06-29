-- Schadens-, Verlust- und Problemmeldungen
-- Grundlage: specs/features/007-damage-report-workflow.md

create type public.damage_case_type as enum (
  'schaden',
  'verlust',
  'technisches_problem'
);

create type public.damage_case_status as enum (
  'offen',
  'in_bearbeitung',
  'bericht_erzeugt',
  'bericht_unterschrieben',
  'abgeschlossen',
  'storniert'
);

create type public.damage_affected_item as enum (
  'ipad',
  'pencil',
  'keyboard',
  'power_adapter',
  'charging_cable',
  'pencil_cap',
  'adapter',
  'hdmi_cable',
  'magic_mouse',
  'other'
);

create type public.damage_billing_assessment as enum (
  'unklar',
  'abrechenbar',
  'nicht_abrechenbar'
);

create table public.damage_case (
  id uuid primary key default gen_random_uuid(),
  legacy_damage_id integer unique,
  legacy_source text,
  legacy_source_id text,
  set_id uuid references public.inventory_set(id) on delete restrict,
  replacement_set_id uuid references public.inventory_set(id) on delete set null,
  set_person_assignment_id uuid references public.set_person_assignment(id) on delete set null,
  person_id uuid references public.person(id) on delete set null,
  component_id uuid references public.inventory_component(id) on delete set null,
  replacement_component_id uuid references public.inventory_component(id) on delete set null,
  case_type public.damage_case_type not null,
  affected_item public.damage_affected_item not null,
  status public.damage_case_status not null default 'offen',
  legacy_status text,
  legacy_exchange_status text,
  legacy_insurance_warranty text,
  reported_at date not null default current_date,
  occurred_at date,
  replacement_issued_at date,
  short_description text not null,
  detail_description text,
  incident_description text,
  location text,
  witnesses text,
  handler text,
  internal_note text,
  affected_components_raw text,
  import_status text,
  import_hint text,
  billing_assessment public.damage_billing_assessment not null default 'unklar',
  created_by uuid references public.app_user(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint damage_case_short_description_not_blank
    check (length(trim(short_description)) > 0),
  constraint damage_case_dates_reasonable
    check (occurred_at is null or occurred_at <= reported_at)
);

create index damage_case_set_idx on public.damage_case (set_id);
create index damage_case_person_idx on public.damage_case (person_id);
create index damage_case_assignment_idx on public.damage_case (set_person_assignment_id);
create index damage_case_component_idx on public.damage_case (component_id);
create index damage_case_status_idx on public.damage_case (status);
create index damage_case_reported_at_idx on public.damage_case (reported_at);

create trigger damage_case_set_updated_at
  before update on public.damage_case
  for each row execute function public.set_updated_at();

alter table public.damage_case enable row level security;

create policy "admin and ipad_verwaltung read damage cases"
  on public.damage_case
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin and ipad_verwaltung manage damage cases"
  on public.damage_case
  for all
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']))
  with check (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "buchhaltung reads billing-relevant damage cases"
  on public.damage_case
  for select
  to authenticated
  using (
    public.current_app_user_has_role('buchhaltung')
    and billing_assessment = 'abrechenbar'
  );

comment on table public.damage_case is
  'Schadens-, Verlust- oder Problemmeldung zu einem Set, einer Komponente oder einer Ausleihe.';
comment on column public.damage_case.billing_assessment is
  'Erste fachliche Einschaetzung. Eine Zahlung wird erst in einem separaten Zahlungsvorgang erzeugt.';
