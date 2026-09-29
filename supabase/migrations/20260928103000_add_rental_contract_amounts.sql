alter table public.purchase_invoice
  add column if not exists monthly_gross_rent numeric(12, 2),
  add column if not exists contract_total numeric(12, 2);

alter table public.purchase_invoice
  add constraint purchase_invoice_monthly_gross_rent_nonnegative
    check (monthly_gross_rent is null or monthly_gross_rent >= 0),
  add constraint purchase_invoice_contract_total_nonnegative
    check (contract_total is null or contract_total >= 0);

comment on column public.purchase_invoice.monthly_gross_rent is
  'Monatliche Bruttomiete eines Mietvertrags.';
comment on column public.purchase_invoice.contract_total is
  'Gesamte Bruttosumme ueber die vereinbarte Grundlaufzeit.';
