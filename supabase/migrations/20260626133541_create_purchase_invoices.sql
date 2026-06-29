-- Einkaufs- und Rechnungsdaten aus der Legacy-Datenbank
-- Grundlage: Legacy-Tabellen Rechnung und Rechnungsposition

create table public.purchase_invoice (
  id uuid primary key default gen_random_uuid(),
  legacy_invoice_number integer not null unique,
  invoice_date date,
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_invoice_position (
  id uuid primary key default gen_random_uuid(),
  legacy_invoice_position_number integer not null unique,
  invoice_id uuid references public.purchase_invoice(id) on delete set null,
  title text,
  unit_price numeric(10, 2),
  quantity integer,
  legacy_unit_price text,
  legacy_quantity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_component
  add column invoice_position_id uuid
    references public.purchase_invoice_position(id) on delete set null;

create index purchase_invoice_date_idx
  on public.purchase_invoice (invoice_date);
create index purchase_invoice_position_invoice_idx
  on public.purchase_invoice_position (invoice_id);
create index inventory_component_invoice_position_idx
  on public.inventory_component (invoice_position_id);

create trigger purchase_invoice_set_updated_at
  before update on public.purchase_invoice
  for each row execute function public.set_updated_at();

create trigger purchase_invoice_position_set_updated_at
  before update on public.purchase_invoice_position
  for each row execute function public.set_updated_at();

alter table public.purchase_invoice enable row level security;
alter table public.purchase_invoice_position enable row level security;

create policy "admin ipad_verwaltung and buchhaltung read purchase invoices"
  on public.purchase_invoice
  for select
  to authenticated
  using (
    public.current_app_user_has_any_role(array[
      'admin',
      'ipad_verwaltung',
      'buchhaltung'
    ])
  );

create policy "admin manages purchase invoices"
  on public.purchase_invoice
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin ipad_verwaltung and buchhaltung read purchase invoice positions"
  on public.purchase_invoice_position
  for select
  to authenticated
  using (
    public.current_app_user_has_any_role(array[
      'admin',
      'ipad_verwaltung',
      'buchhaltung'
    ])
  );

create policy "admin manages purchase invoice positions"
  on public.purchase_invoice_position
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.purchase_invoice is
  'Rechnungsstammdaten fuer beschaffte iPad-Komponenten.';
comment on table public.purchase_invoice_position is
  'Rechnungspositionen, ueber die Komponenten ihr Anschaffungsdatum aus der Rechnung ermitteln.';
comment on column public.inventory_component.invoice_position_id is
  'Strukturierte Verknuepfung zur Einkaufs-/Rechnungsposition; legacy invoice_position_number bleibt zur Nachvollziehbarkeit erhalten.';
