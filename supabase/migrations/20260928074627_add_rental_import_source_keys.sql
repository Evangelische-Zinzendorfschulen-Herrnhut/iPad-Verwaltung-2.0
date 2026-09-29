alter table public.inventory_component
  add column source_key text;

create unique index inventory_component_source_key_unique
  on public.inventory_component (source_key)
  where source_key is not null;

create unique index purchase_invoice_position_document_position_unique
  on public.purchase_invoice_position (invoice_id, position_number)
  where position_number is not null;

comment on column public.inventory_component.source_key is
  'Stabiler externer Quellschluessel fuer idempotente Importe ohne sichtbare Inventarnummer.';
