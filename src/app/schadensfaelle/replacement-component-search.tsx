"use client";

import { useState } from "react";

export type ReplacementOption = { id: string; inventoryNumber: string; model: string | null; storage: string | null; source: string; priority: number };

export function ReplacementComponentSearch({ options }: { options: ReplacementOption[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const matches = options.filter((option) =>
    `${option.inventoryNumber} ${option.model ?? ""} ${option.storage ?? ""} ${option.source}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")),
  );
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Freie Ersatzkomponente</legend>
      <label className="grid gap-1 text-sm">
        Suche nach Inventarnummer, Modell, Set oder Lagerort
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <input type="hidden" name="replacement_inventory_number" value={selected} />
      <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200">
        <label className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm">
          <input type="radio" name="replacement_selection" checked={!selected} onChange={() => setSelected("")} />Kein Austausch
        </label>
        {options.filter((option) => option.inventoryNumber === selected || matches.includes(option)).map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm last:border-0 hover:bg-zinc-50">
            <input type="radio" name="replacement_selection" checked={selected === option.inventoryNumber} onChange={() => setSelected(option.inventoryNumber)} />
            <span><span className="inventory-number font-semibold">{option.inventoryNumber}</span><span className="block text-zinc-500">{option.model || "Modell nicht angegeben"} · {option.source} · Lagerort: {option.storage || "-"}</span></span>
          </label>
        ))}
        {!matches.length && <p className="px-3 py-2 text-sm text-zinc-500">{options.length ? "Keine passenden Treffer." : "Keine passenden freien Komponenten vorhanden."}</p>}
      </div>
    </fieldset>
  );
}
