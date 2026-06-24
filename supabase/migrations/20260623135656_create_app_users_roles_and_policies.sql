-- App-Benutzer, Rollen und erste RLS-Policies
-- Grundlage: specs/data/roles-and-permissions.md

create type public.app_user_status as enum (
  'active',
  'disabled'
);

create table public.app_user (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  display_name text,
  status public.app_user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table public.auth_identity (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_user(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_email citext,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint auth_identity_provider_unique unique (provider, provider_user_id)
);

create table public.role (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint role_key_format check (key ~ '^[a-z0-9_]+$')
);

create table public.user_role (
  app_user_id uuid not null references public.app_user(id) on delete cascade,
  role_id uuid not null references public.role(id) on delete cascade,
  assigned_by uuid references public.app_user(id),
  assigned_at timestamptz not null default now(),
  primary key (app_user_id, role_id)
);

create index auth_identity_app_user_idx on public.auth_identity (app_user_id);
create index auth_identity_provider_email_idx on public.auth_identity (provider_email);
create index user_role_role_idx on public.user_role (role_id);

create trigger app_user_set_updated_at
  before update on public.app_user
  for each row execute function public.set_updated_at();

insert into public.role (key, name, description)
values
  ('admin', 'Admin', 'Verwaltet Benutzer, Rollen, Stammdaten und technische Administration.'),
  ('ipad_verwaltung', 'iPad-Verwaltung', 'Verwaltet Sets, Ausgabe, Ruecknahme und Komponenten.'),
  ('buchhaltung', 'Buchhaltung', 'Bearbeitet Zahlungsvorgaenge und erhaelt Zahlungsbenachrichtigungen.')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ai.app_user_id
  from public.auth_identity ai
  join public.app_user au on au.id = ai.app_user_id
  where ai.provider = 'supabase'
    and ai.provider_user_id = auth.uid()::text
    and au.status = 'active'
  limit 1;
$$;

create or replace function public.current_app_user_has_role(role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role ur
    join public.role r on r.id = ur.role_id
    where ur.app_user_id = public.current_app_user_id()
      and r.key = role_key
  );
$$;

create or replace function public.current_app_user_has_any_role(role_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role ur
    join public.role r on r.id = ur.role_id
    where ur.app_user_id = public.current_app_user_id()
      and r.key = any(role_keys)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_has_role('admin');
$$;

alter table public.app_user enable row level security;
alter table public.auth_identity enable row level security;
alter table public.role enable row level security;
alter table public.user_role enable row level security;

create policy "admins manage app users"
  on public.app_user
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own app user"
  on public.app_user
  for select
  to authenticated
  using (id = public.current_app_user_id());

create policy "admins manage auth identities"
  on public.auth_identity
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own auth identities"
  on public.auth_identity
  for select
  to authenticated
  using (app_user_id = public.current_app_user_id());

create policy "authenticated users read roles"
  on public.role
  for select
  to authenticated
  using (true);

create policy "admins manage roles"
  on public.role
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage user roles"
  on public.user_role
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own user roles"
  on public.user_role
  for select
  to authenticated
  using (app_user_id = public.current_app_user_id());

create policy "admin and ipad_verwaltung read people"
  on public.person
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages people"
  on public.person
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read school years"
  on public.school_year
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages school years"
  on public.school_year
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read school classes"
  on public.school_class
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages school classes"
  on public.school_class
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin and ipad_verwaltung read class assignments"
  on public.person_class_assignment
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages class assignments"
  on public.person_class_assignment
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.app_user is
  'Lokales App-Benutzerprofil, getrennt vom Login-Provider.';
comment on table public.auth_identity is
  'Zuordnung zwischen lokalem App-Benutzer und externer Login-Identitaet.';
comment on table public.role is
  'Fachliche App-Rollen.';
comment on table public.user_role is
  'Zuordnung von App-Benutzern zu fachlichen Rollen.';
