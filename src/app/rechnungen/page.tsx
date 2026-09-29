import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { InvoicesTable } from "./invoices-table";

export const metadata: Metadata = {
  title: "Beschaffung | iPad-Verwaltung",
};

type InvoiceRow = {
  id: string;
  invoice_date: string | null;
  legacy_invoice_number: number | null;
  document_type: "invoice" | "rental_contract";
  document_number: string;
  contract_start: string | null;
  contract_term_months: number | null;
  contract_end: string | null;
  monthly_gross_rent: number | string | null;
  contract_total: number | string | null;
  supplier: string | null;
};

type InvoicePositionRow = {
  id: string;
  invoice_id: string | null;
  legacy_invoice_position_number: number | null;
  position_number: string | null;
  title: string | null;
  quantity: number | null;
  unit_price: number | string | null;
  legacy_quantity: string | null;
  legacy_unit_price: string | null;
};

type ComponentInvoiceRow = {
  id: string;
  legacy_inventory_number: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  invoice_position_id: string | null;
  invoice_position: {
    invoice_id: string | null;
  } | {
    invoice_id: string | null;
  }[] | null;
};

const QUERY_BATCH_SIZE = 1000;
const inventoryNumberCollator = new Intl.Collator("de", {
  numeric: true,
  sensitivity: "base",
});

function normalizeJoined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

async function fetchAllInvoicePositions(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const positions: InvoicePositionRow[] = [];

  for (let from = 0; ; from += QUERY_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("purchase_invoice_position")
      .select("id,invoice_id,legacy_invoice_position_number,position_number,title,quantity,unit_price,legacy_quantity,legacy_unit_price")
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    positions.push(...((data ?? []) as InvoicePositionRow[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      return positions;
    }
  }
}

async function fetchAllComponentInvoiceLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const components: ComponentInvoiceRow[] = [];

  for (let from = 0; ; from += QUERY_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("inventory_component")
      .select("id,legacy_inventory_number,category,manufacturer,model,invoice_position_id,invoice_position:invoice_position_id(invoice_id)")
      .not("invoice_position_id", "is", null)
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    components.push(...((data ?? []) as ComponentInvoiceRow[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      return components;
    }
  }
}

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supplierFilter =
    typeof params.supplier === "string"
      ? params.supplier
      : "";
  const typeFilter = typeof params.type === "string" ? params.type : "";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (
    !hasAnyRole(appUser, [
      "admin",
      "ipad_verwaltung",
      "buchhaltung",
      "readonly",
    ])
  ) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: invoices, error: invoicesError },
    positions,
    componentInvoiceLinks,
  ] = await Promise.all([
    supabase
      .from("purchase_invoice")
      .select("id,legacy_invoice_number,document_type,document_number,invoice_date,supplier,contract_start,contract_term_months,contract_end,monthly_gross_rent,contract_total")
      .order("invoice_date", { ascending: false, nullsFirst: false })
      .order("legacy_invoice_number", { ascending: false }),
    fetchAllInvoicePositions(supabase),
    fetchAllComponentInvoiceLinks(supabase),
  ]);

  if (invoicesError) {
    throw invoicesError;
  }

  const positionCounts = new Map<string, number>();
  const totals = new Map<string, number>();
  const componentCounts = new Map<string, number>();
  const componentsByPosition = new Map<string, ComponentInvoiceRow[]>();
  const positionsByInvoice = new Map<string, InvoicePositionRow[]>();
  for (const position of positions) {
    if (!position.invoice_id) {
      continue;
    }

    positionCounts.set(
      position.invoice_id,
      (positionCounts.get(position.invoice_id) ?? 0) + 1,
    );
    const invoicePositions = positionsByInvoice.get(position.invoice_id) ?? [];
    invoicePositions.push(position);
    positionsByInvoice.set(position.invoice_id, invoicePositions);

    const unitPrice = Number(position.unit_price);
    const quantity = position.quantity ?? 0;

    if (Number.isFinite(unitPrice) && quantity > 0) {
      totals.set(
        position.invoice_id,
        (totals.get(position.invoice_id) ?? 0) + unitPrice * quantity,
      );
    }
  }

  for (const component of componentInvoiceLinks) {
    const invoicePosition = normalizeJoined(component.invoice_position);

    if (!invoicePosition?.invoice_id) {
      continue;
    }

    componentCounts.set(
      invoicePosition.invoice_id,
      (componentCounts.get(invoicePosition.invoice_id) ?? 0) + 1,
    );

    if (component.invoice_position_id) {
      const linkedComponents =
        componentsByPosition.get(component.invoice_position_id) ?? [];
      linkedComponents.push(component);
      componentsByPosition.set(component.invoice_position_id, linkedComponents);
    }

  }

  const rows = ((invoices ?? []) as InvoiceRow[]).map((invoice) => ({
    ...invoice,
    componentCount: componentCounts.get(invoice.id) ?? 0,
    positionCount: positionCounts.get(invoice.id) ?? 0,
    total: invoice.document_type === "rental_contract"
      ? (invoice.contract_total === null ? null : Number(invoice.contract_total))
      : (totals.get(invoice.id) ?? null),
    positions: (positionsByInvoice.get(invoice.id) ?? [])
      .map((position) => ({
        ...position,
        components: [...(componentsByPosition.get(position.id) ?? [])].sort(
          (componentA, componentB) =>
            inventoryNumberCollator.compare(
              componentA.legacy_inventory_number ?? componentA.model ?? componentA.category,
              componentB.legacy_inventory_number ?? componentB.model ?? componentB.category,
            ),
        ),
      })),
  }));
  const suppliers = Array.from(
    new Set(
      rows
        .map((invoice) => invoice.supplier?.trim())
        .filter((supplier): supplier is string => Boolean(supplier)),
    ),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const filteredRows = rows.filter((document) =>
    (!supplierFilter || document.supplier?.trim() === supplierFilter) &&
    (!typeFilter || document.document_type === typeFilter)
  );

  return (
    <main className="flex-1 bg-white">
      <SectionTabs active="rechnungen" />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Beschaffung
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {filteredRows.length} von {rows.length} Rechnungen und Mietverträgen.
            </p>
          </div>
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Typ
            <select
              className="min-w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-950 outline-none ring-emerald-500 transition focus:ring-2"
              defaultValue={typeFilter}
              name="type"
            >
              <option value="">Alle Typen</option>
              <option value="invoice">Rechnung</option>
              <option value="rental_contract">Mietvertrag</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Lieferant
            <select
              className="min-w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-950 outline-none ring-emerald-500 transition focus:ring-2"
              defaultValue={supplierFilter}
              name="supplier"
            >
              <option value="">Alle Lieferanten</option>
              {suppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
            Filtern
          </button>
        </form>

        <InvoicesTable
          rows={filteredRows}
        />
      </section>
    </main>
  );
}
