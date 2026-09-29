"use client";

import { MouseEvent, useEffect, useState } from "react";

type LinkedComponent = {
  id: string;
  legacy_inventory_number: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
};

type InvoicePosition = {
  id: string;
  legacy_invoice_position_number: number | null;
  position_number: string | null;
  title: string | null;
  quantity: number | null;
  unit_price: number | string | null;
  legacy_quantity: string | null;
  legacy_unit_price: string | null;
  components: LinkedComponent[];
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
  componentCount: number;
  positionCount: number;
  total: number | null;
  positions: InvoicePosition[];
};

type ContextMenuState = {
  invoice: InvoiceRow;
  x: number;
  y: number;
} | null;

type InvoicesTableProps = {
  rows: InvoiceRow[];
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCurrency(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    style: "currency",
  }).format(value);
}

function componentKindLabel(category: string) {
  return ({ ipad: "iPad", keyboard: "Tastatur", pencil: "Pencil" } as Record<string, string>)[category] ?? category;
}

export function InvoicesTable({ rows }: InvoicesTableProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
        setSelectedInvoice(null);
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function openContextMenu(event: MouseEvent<HTMLTableRowElement>, invoice: InvoiceRow) {
    event.preventDefault();
    setContextMenu({ invoice, x: event.clientX, y: event.clientY });
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm text-zinc-700">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Beleg</th>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Lieferant</th>
              <th className="px-4 py-3 text-right font-medium">Positionen</th>
              <th className="px-4 py-3 text-right font-medium">Geräte</th>
              <th className="px-4 py-3 text-right font-medium">Summe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr
                className="cursor-pointer border-t border-zinc-200 hover:bg-emerald-100"
                key={invoice.id}
                onClick={() => setSelectedInvoice(invoice)}
                onContextMenu={(event) => openContextMenu(event, invoice)}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  {invoice.document_type === "rental_contract" ? "Mietvertrag" : "Rechnung"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-950">
                  {invoice.document_number}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDate(invoice.invoice_date)}
                </td>
                <td className="px-4 py-3">{invoice.supplier || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{invoice.positionCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{invoice.componentCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-56 rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full rounded px-3 py-2 text-left font-medium text-zinc-900 hover:bg-zinc-100"
            onClick={() => {
              setSelectedInvoice(contextMenu.invoice);
              setContextMenu(null);
            }}
            type="button"
          >
            Details anzeigen
          </button>
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {contextMenu.invoice.document_type === "rental_contract" ? "Mietvertrag" : "Rechnung"} {contextMenu.invoice.document_number}
          </p>
        </div>
      ) : null}

      {selectedInvoice ? (
        <div
          className="fixed inset-0 z-40 flex bg-black/30"
          onClick={() => setSelectedInvoice(null)}
        >
          <aside
            aria-label={`${selectedInvoice.document_type === "rental_contract" ? "Mietvertrag" : "Rechnung"} ${selectedInvoice.document_number}`}
            aria-modal="true"
            className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">Beschaffungsdetails</p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  {selectedInvoice.document_type === "rental_contract" ? "Mietvertrag" : "Rechnung"} {selectedInvoice.document_number}
                </h2>
              </div>
              <button
                aria-label="Details schließen"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => setSelectedInvoice(null)}
                type="button"
              >
                Schließen
              </button>
            </div>

            {selectedInvoice.document_type === "rental_contract" ? (
              <div className="grid gap-4 border-b border-zinc-200 px-6 py-5 sm:grid-cols-4">
                <div><p className="text-xs font-medium uppercase text-zinc-500">Vertragsbeginn</p><p className="mt-1 text-sm font-medium text-zinc-950">{formatDate(selectedInvoice.contract_start)}</p></div>
                <div><p className="text-xs font-medium uppercase text-zinc-500">Laufzeit</p><p className="mt-1 text-sm font-medium text-zinc-950">{selectedInvoice.contract_term_months ? `${selectedInvoice.contract_term_months} Monate` : "-"}</p></div>
                <div><p className="text-xs font-medium uppercase text-zinc-500">Vertragsende</p><p className="mt-1 text-sm font-medium text-zinc-950">{formatDate(selectedInvoice.contract_end)}</p></div>
                <div><p className="text-xs font-medium uppercase text-zinc-500">Monatliche Bruttomiete</p><p className="mt-1 text-sm font-medium text-zinc-950">{formatCurrency(selectedInvoice.monthly_gross_rent === null ? null : Number(selectedInvoice.monthly_gross_rent))}</p></div>
              </div>
            ) : null}

            <div className="grid gap-4 border-b border-zinc-200 px-6 py-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">Datum</p>
                <p className="mt-1 text-sm font-medium text-zinc-950">{formatDate(selectedInvoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">Lieferant</p>
                <p className="mt-1 text-sm font-medium text-zinc-950">{selectedInvoice.supplier || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">{selectedInvoice.document_type === "rental_contract" ? "Vertragssumme" : "Rechnungssumme"}</p>
                <p className="mt-1 text-sm font-medium text-zinc-950">{formatCurrency(selectedInvoice.total)}</p>
              </div>
            </div>

            <section className="px-6 py-5">
              <h3 className="mb-3 font-semibold text-zinc-950">Positionen</h3>
              {selectedInvoice.positions.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm text-zinc-700">
                    <thead className="bg-zinc-100 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Positionsnummer</th>
                        <th className="px-3 py-2 font-medium">Bezeichnung</th>
                        <th className="px-3 py-2 text-right font-medium">Menge</th>
                        <th className="px-3 py-2 text-right font-medium">Einzelpreis</th>
                        <th className="px-3 py-2 text-right font-medium">Summe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.positions.map((position) => {
                        const unitPrice = Number(position.unit_price);
                        const hasUnitPrice = position.unit_price !== null && Number.isFinite(unitPrice);
                        const quantityLabel = position.quantity ?? position.legacy_quantity ?? "-";
                        const lineTotal = hasUnitPrice && position.quantity !== null
                          ? unitPrice * position.quantity
                          : null;
                        return (
                          <tr className="border-t border-zinc-200 align-top" key={position.id}>
                            <td className="whitespace-nowrap px-3 py-3 font-medium text-zinc-950">
                              {position.position_number ?? position.legacy_invoice_position_number ?? "-"}
                            </td>
                            <td className="px-3 py-3">
                              <p className="text-zinc-900">{position.title || "-"}</p>
                              {position.components.length ? (
                                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                                  {position.components.map((component) => (
                                    <li key={component.id}>
                                      {component.legacy_inventory_number ? `Gerät ${component.legacy_inventory_number}` : componentKindLabel(component.category)}: {[component.manufacturer, component.model].filter(Boolean).join(" ") || "-"}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">{quantityLabel}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{hasUnitPrice ? formatCurrency(unitPrice) : position.legacy_unit_price || "-"}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(lineTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Für diesen Beleg sind keine Positionen hinterlegt.</p>
              )}
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
