"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { updateDamageStatus } from "../actions/update-damage-status";

const statuses = { entwurf: "Entwurf", offen: "Offen", in_bearbeitung: "In Bearbeitung", bericht_erzeugt: "Bericht erzeugt", bericht_unterschrieben: "Bericht unterschrieben", abgeschlossen: "Abgeschlossen", storniert: "Storniert" };

export function DamageContextItem({ id, setId, status, canEdit, children }: { id: string; setId: string; status: string; canEdit: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLLIElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <li ref={root} className="relative" onContextMenu={(event) => { if (canEdit) { event.preventDefault(); setOpen(true); } }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (canEdit && event.shiftKey && event.key === "F10") { event.preventDefault(); setOpen(true); } }}>
    {children}
    {canEdit && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-xs font-medium text-emerald-700 hover:underline">Status ändern</button>}
    {open && <div className="absolute bottom-8 right-2 z-50 grid min-w-56 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl" aria-label="Schadensstatus ändern">
      {Object.entries(statuses).map(([value, label], index) => <button ref={index === 0 ? firstButton : undefined} key={value} type="button" disabled={pending || value === status} className="rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 focus:bg-zinc-100 disabled:text-zinc-400" onClick={() => startTransition(async () => {
        try {
          const result = await updateDamageStatus(id, setId, value);
          setError(result.error);
          if (!result.error) setOpen(false);
        } catch { setError("Speichern fehlgeschlagen. Bitte erneut versuchen."); }
      })}>{label}{value === status ? " (aktuell)" : ""}</button>)}
    </div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </li>;
}
