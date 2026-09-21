"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { FieldIcon } from "../schadensfaelle/field-icon";
const Context = createContext<{ affected: string; component: string }>({ affected: "component", component: "" });
export function DamageExchangeForm({ children, action, className }: { children: ReactNode; action: (data: FormData) => void | Promise<void>; className: string }) {
  const [selection, setSelection] = useState({ affected: "component", component: "" });
  return <Context.Provider value={selection}><form action={action} className={className} onChange={(event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const billing = event.currentTarget.elements.namedItem("billing_assessment");
    const damageStatus = event.currentTarget.elements.namedItem("status");
    if ((target.name === "billing_assessment" || target.name === "status") && billing instanceof HTMLSelectElement && billing.value === "nicht_abrechenbar" && damageStatus instanceof HTMLSelectElement) {
      damageStatus.value = "abgeschlossen";
    }
    if (target.name === "affected_item") setSelection((old) => ({ ...old, affected: target.value }));
    if (target.name === "component_id") setSelection((old) => ({ ...old, component: target.value }));
  }}>{children}</form></Context.Provider>;
}
type Props = { current: { id: string; category: string }[]; components: { id: string; category: string; label: string; sourceLabel: string }[]; sets: { id: string; legacy_set_id: number; storage_label: string | null }[] };
export function DamageExchangeFields(props: Props) {
  const selection = useContext(Context);
  return <Exchange key={`${selection.affected}:${selection.component}`} {...props} {...selection} />;
}
function Exchange({ current, components, sets, affected, component }: Props & { affected: string; component: string }) {
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [query, setQuery] = useState("");
  const category = current.find((item) => item.id === component)?.category;
  const options = affected === "set" ? sets.map((item) => ({ id: item.id, label: `Set ${item.legacy_set_id}`, detail: `Lagerort: ${item.storage_label || "-"}` })) : affected === "component" && category ? components.filter((item) => item.category === category).map((item) => ({ id: item.id, label: item.label, detail: item.sourceLabel })) : [];
  const visible = status === "erforderlich" || Boolean(selected);
  const matches = visible ? options.filter((item) => item.id === selected || `${item.label} ${item.detail}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"))) : [];
  return <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
    <h3 className="font-semibold">Austausch</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium"><span className="flex items-center gap-2"><FieldIcon label="Austauschstatus" />Austauschstatus</span>
        <select name="exchange_status" value={selected ? "ausgegeben" : status} onChange={(event) => { setSelected(""); setStatus(event.target.value); }} className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="">Nicht angegeben</option><option value="erforderlich">Erforderlich</option><option value="ausgegeben" disabled>Ausgegeben</option><option value="nicht erforderlich">Nicht erforderlich</option><option value="kein Austausch">Kein Austausch</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium"><span className="flex items-center gap-2"><FieldIcon label="Ersatz ausgegeben am" />Ersatz ausgegeben am</span><input name="replacement_issued_at" type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} required={Boolean(selected)} className="rounded-md border border-zinc-300 px-3 py-2" /></label>
    </div>
    <input type="hidden" name="replacement_set_id" value={affected === "set" ? selected : ""} />
    <input type="hidden" name="replacement_component_id" value={affected === "component" ? selected : ""} />
    {visible && <fieldset className="grid gap-2"><legend className="mb-2 font-medium">{affected === "set" ? "Freies Ersatzset" : "Passende Ersatzkomponente"}</legend>
      {affected === "component" && !category ? <p className="text-sm text-zinc-500">Bitte zuerst die betroffene Komponente auswählen.</p> : affected !== "set" && affected !== "component" ? <p className="text-sm text-zinc-500">Für Zubehör ist hier kein automatischer Austausch vorgesehen.</p> : <>
      <label className="grid gap-1 text-sm">Ersatz suchen<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-md border border-zinc-300 px-3 py-2" /></label>
      <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200"><label className="flex gap-3 px-3 py-2 text-sm"><input type="radio" name="exchange_choice" checked={!selected} onChange={() => { setSelected(""); setStatus("erforderlich"); }} />Noch kein Ersatz ausgewählt</label>
        {matches.map((item) => <label key={item.id} className="flex items-center gap-3 border-t border-zinc-100 px-3 py-2 text-sm hover:bg-zinc-50"><input type="radio" name="exchange_choice" checked={selected === item.id} onChange={() => { setSelected(item.id); setStatus("ausgegeben"); if (affected === "component") setIssuedAt(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())); }} /><span><strong>{item.label}</strong><span className="block text-zinc-500">{item.detail}</span></span></label>)}
        {!matches.length && <p className="px-3 py-2 text-sm text-zinc-500">Kein passender Ersatz gefunden.</p>}
      </div></>}
    </fieldset>}
  </section>;
}
