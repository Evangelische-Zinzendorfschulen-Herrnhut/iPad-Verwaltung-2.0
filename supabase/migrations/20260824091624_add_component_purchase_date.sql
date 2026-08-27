alter table public.inventory_component
  add column purchase_date date;

update public.inventory_component component
set purchase_date = invoice.invoice_date
from public.purchase_invoice_position invoice_position
join public.purchase_invoice invoice
  on invoice.id = invoice_position.invoice_id
where component.invoice_position_id = invoice_position.id
  and component.purchase_date is null
  and invoice.invoice_date is not null;

comment on column public.inventory_component.purchase_date is
  'Direktes Anschaffungsdatum der Komponente; kann aus Rechnungsdaten stammen oder manuell gepflegt werden.';
