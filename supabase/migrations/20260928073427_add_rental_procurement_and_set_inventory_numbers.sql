alter table public.purchase_invoice
  add column document_type text not null default 'invoice',
  add column document_number text,
  add column contract_start date,
  add column contract_term_months integer,
  add column contract_end date,
  add column notes text;

update public.purchase_invoice
set document_number = legacy_invoice_number::text
where document_number is null;

alter table public.purchase_invoice
  alter column legacy_invoice_number drop not null,
  add constraint purchase_invoice_document_type_valid
    check (document_type in ('invoice', 'rental_contract')),
  add constraint purchase_invoice_document_number_present
    check (nullif(trim(document_number), '') is not null),
  add constraint purchase_invoice_contract_term_valid
    check (contract_term_months is null or contract_term_months > 0),
  add constraint purchase_invoice_contract_dates_valid
    check (contract_end is null or contract_start is null or contract_end >= contract_start);

create unique index purchase_invoice_type_document_number_unique
  on public.purchase_invoice (document_type, document_number);

alter table public.purchase_invoice_position
  add column position_number text,
  alter column legacy_invoice_position_number drop not null;

alter table public.inventory_set
  add column inventory_number text,
  add column acquisition_type text not null default 'owned',
  add column procurement_document_id uuid
    references public.purchase_invoice(id) on delete set null,
  add column is_pool_device boolean not null default false,
  alter column legacy_set_id drop not null,
  add constraint inventory_set_identifier_present
    check (
      legacy_set_id is not null
      or nullif(trim(inventory_number), '') is not null
    ),
  add constraint inventory_set_acquisition_type_valid
    check (acquisition_type in ('owned', 'rented'));

create unique index inventory_set_inventory_number_unique
  on public.inventory_set (inventory_number)
  where inventory_number is not null;

create index inventory_set_procurement_document_idx
  on public.inventory_set (procurement_document_id);

alter table public.inventory_component
  alter column legacy_inventory_number drop not null;

comment on column public.purchase_invoice.document_type is
  'Beschaffungsbeleg: invoice fuer Rechnung oder rental_contract fuer Mietvertrag.';
comment on column public.purchase_invoice.document_number is
  'Fachliche Belegnummer; bei Mietvertraegen die Vertragsnummer.';
comment on column public.purchase_invoice.contract_start is
  'Vertragsbeginn; bleibt leer, solange das konkrete Auslieferungsdatum nicht feststeht.';
comment on column public.purchase_invoice.contract_term_months is
  'Vertraglich vereinbarte Grundlaufzeit in Monaten.';
comment on column public.purchase_invoice.contract_end is
  'Aus Vertragsbeginn und Laufzeit ermitteltes Vertragsende.';
comment on column public.inventory_set.inventory_number is
  'Aktuelle fachliche Set-Kennung, z. B. M1; unabhaengig von Legacy-Setnummern.';
comment on column public.inventory_set.acquisition_type is
  'Eigentums-/Beschaffungsart des Sets: owned oder rented.';
comment on column public.inventory_set.is_pool_device is
  'Kennzeichnet zusaetzliche Poolsets ausserhalb der regulaer berechneten Menge.';
comment on column public.inventory_component.legacy_inventory_number is
  'Historische oder aktuelle Inventarnummer; bei nummernlosen Mietset-Komponenten optional.';
