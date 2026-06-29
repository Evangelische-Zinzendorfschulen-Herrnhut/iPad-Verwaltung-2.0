-- Inventar-Komponenten, Sets und Ausgabehistorie
-- Grundlage: Legacy-Tabellen Device, Sets und SetUserZuordnung

create type public.component_category as enum (
  'ipad',
  'pencil',
  'keyboard',
  'adapter',
  'mouse',
  'other'
);

create type public.component_condition as enum (
  'ok',
  'beschädigt_nutzbar',
  'defekt',
  'unklar',
  'gesperrt_kein_mdm'
);

create type public.set_condition as enum (
  'ok',
  'unvollständig',
  'defekt',
  'unklar'
);

create type public.set_availability as enum (
  'frei',
  'ausgegeben',
  'blockiert',
  'unklar'
);

create table public.inventory_component (
  id uuid primary key default gen_random_uuid(),
  legacy_inventory_number text not null unique,
  legacy_set_number integer,
  category public.component_category not null,
  manufacturer text,
  model text,
  condition public.component_condition not null default 'unklar',
  legacy_status text,
  serial_number text,
  invoice_position_number integer,
  notes text,
  storage_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_set (
  id uuid primary key default gen_random_uuid(),
  legacy_set_id integer not null unique,
  legacy_user_id integer,
  assigned_person_id uuid references public.person(id),
  condition public.set_condition not null default 'unklar',
  availability public.set_availability not null default 'unklar',
  legacy_status text,
  legacy_email citext,
  storage_label text,
  marker text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.set_component_assignment (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.inventory_set(id) on delete cascade,
  component_id uuid not null references public.inventory_component(id) on delete restrict,
  role public.component_category not null,
  legacy_set_id integer,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  source text not null default 'legacy_import',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint set_component_assignment_dates_valid
    check (valid_until is null or valid_until >= valid_from)
);

create unique index set_component_assignment_one_current_role_per_set
  on public.set_component_assignment (set_id, role)
  where valid_until is null and role in ('ipad', 'pencil', 'keyboard');

create unique index set_component_assignment_one_current_set_per_component
  on public.set_component_assignment (component_id)
  where valid_until is null;

create table public.set_person_assignment (
  id uuid primary key default gen_random_uuid(),
  legacy_assignment_id integer not null unique,
  set_id uuid not null references public.inventory_set(id) on delete cascade,
  person_id uuid references public.person(id),
  legacy_user_id integer not null,
  issued_at date,
  returned_at date,
  legacy_status text,
  issue_note text,
  return_note text,
  return_ipad_present boolean,
  return_power_adapter_present boolean,
  return_charging_cable_present boolean,
  return_pencil_present boolean,
  return_pencil_cap_present boolean,
  return_keyboard_present boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint set_person_assignment_dates_valid
    check (returned_at is null or issued_at is null or returned_at >= issued_at)
);

create unique index set_person_assignment_one_current_set
  on public.set_person_assignment (set_id)
  where returned_at is null;

create index inventory_component_category_idx
  on public.inventory_component (category);
create index inventory_component_legacy_set_number_idx
  on public.inventory_component (legacy_set_number);
create index inventory_set_assigned_person_idx
  on public.inventory_set (assigned_person_id);
create index inventory_set_availability_idx
  on public.inventory_set (availability);
create index set_person_assignment_person_idx
  on public.set_person_assignment (person_id);
create index set_person_assignment_legacy_user_idx
  on public.set_person_assignment (legacy_user_id);

create trigger inventory_component_set_updated_at
  before update on public.inventory_component
  for each row execute function public.set_updated_at();

create trigger inventory_set_set_updated_at
  before update on public.inventory_set
  for each row execute function public.set_updated_at();

create trigger set_component_assignment_set_updated_at
  before update on public.set_component_assignment
  for each row execute function public.set_updated_at();

create trigger set_person_assignment_set_updated_at
  before update on public.set_person_assignment
  for each row execute function public.set_updated_at();

alter table public.inventory_component enable row level security;
alter table public.inventory_set enable row level security;
alter table public.set_component_assignment enable row level security;
alter table public.set_person_assignment enable row level security;

create policy "admin and ipad_verwaltung read inventory components"
  on public.inventory_component
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages inventory components"
  on public.inventory_component
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read inventory sets"
  on public.inventory_set
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages inventory sets"
  on public.inventory_set
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read set component assignments"
  on public.set_component_assignment
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages set component assignments"
  on public.set_component_assignment
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read set person assignments"
  on public.set_person_assignment
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages set person assignments"
  on public.set_person_assignment
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.inventory_component is
  'Einzelne inventarisierte Komponenten wie iPad, Pencil, Tastatur, Adapter oder Maus.';
comment on table public.inventory_set is
  'Ausgebbare Set-Huelle mit historischer Legacy-Set-ID und aktueller fachlicher Bewertung.';
comment on table public.set_component_assignment is
  'Historisierte Zuordnung von Komponenten zu Sets.';
comment on table public.set_person_assignment is
  'Historisierte Ausgabe und Rueckgabe von Sets an Personen.';
