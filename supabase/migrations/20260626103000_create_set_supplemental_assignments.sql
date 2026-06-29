create type public.supplemental_item_type as enum (
  'hdmi_cable',
  'other'
);

create table public.set_supplemental_assignment (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.inventory_set(id) on delete cascade,
  item_type public.supplemental_item_type not null,
  quantity integer not null default 1 check (quantity > 0),
  label text,
  issued_at date,
  returned_at date,
  note text,
  source text not null default 'manual_assignment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint set_supplemental_assignment_dates_valid
    check (returned_at is null or issued_at is null or returned_at >= issued_at)
);

create unique index set_supplemental_assignment_one_current_item_per_set
  on public.set_supplemental_assignment (set_id, item_type)
  where returned_at is null;

create index set_supplemental_assignment_set_idx
  on public.set_supplemental_assignment (set_id);

create trigger set_supplemental_assignment_set_updated_at
  before update on public.set_supplemental_assignment
  for each row execute function public.set_updated_at();

alter table public.set_supplemental_assignment enable row level security;

create policy "admin and ipad_verwaltung read set supplemental assignments"
  on public.set_supplemental_assignment
  for select
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin manages set supplemental assignments"
  on public.set_supplemental_assignment
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.set_supplemental_assignment is
  'Historisierte Zuordnung von nicht inventarisierten Zusatzmaterialien zu Sets, z. B. HDMI-Kabel.';
