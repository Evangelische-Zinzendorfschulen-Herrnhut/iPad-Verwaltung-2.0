"use client";

import { useState } from "react";

export function ReplacementSetSearch({ options }: {
  options: { id: string; legacy_set_id: number; storage_label: string | null }[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const matches = options.filter((option) => `${option.legacy_set_id} ${option.storage_label ?? ""}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">Ersatzset</legend>
      <label className="grid gap-1 text-sm">
        Suche nach Setnummer oder Lagerort
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-md border border-zinc-300 px-3 py-2" />
      </label>
      <input type="hidden" name="replacement_set_id" value={selected} />
      <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200">
        <label className="flex items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm">
          <input type="radio" name="replacement_set_selection" checked={!selected} onChange={() => setSelected("")} />Kein Ersatzset
        </label>
        {options.filter((option) => option.id === selected || matches.includes(option)).map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-2 text-sm last:border-0 hover:bg-zinc-50">
            <input type="radio" name="replacement_set_selection" checked={selected === option.id} onChange={() => setSelected(option.id)} />
            <span><span className="font-semibold">Set {option.legacy_set_id}</span><span className="block text-zinc-500">Frei · OK · Lagerort: {option.storage_label || "-"}</span></span>
          </label>
        ))}
        {!matches.length && <p className="px-3 py-2 text-sm text-zinc-500">{options.length ? "Keine passenden Treffer." : "Keine passenden freien Ersatzsets vorhanden."}</p>}
      </div>
    </fieldset>
  );
}
