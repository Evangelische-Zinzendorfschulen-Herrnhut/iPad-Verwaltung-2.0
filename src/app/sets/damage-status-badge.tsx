const statuses: Record<string, [string, string]> = {
  entwurf: ["Entwurf", "bg-zinc-100 text-zinc-700"],
  offen: ["Offen", "bg-amber-100 text-amber-800"],
  in_bearbeitung: ["In Bearbeitung", "bg-blue-100 text-blue-800"],
  bericht_erzeugt: ["Bericht erzeugt", "bg-violet-100 text-violet-800"],
  bericht_unterschrieben: ["Bericht unterschrieben", "bg-teal-100 text-teal-800"],
  abgeschlossen: ["Abgeschlossen", "bg-emerald-100 text-emerald-800"],
  storniert: ["Storniert", "bg-zinc-100 text-zinc-700"],
};

export function DamageStatusBadge({ value }: { value: string }) {
  const [label, colors] = statuses[value] ?? [value, "bg-zinc-100 text-zinc-700"];
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${colors}`}>{label}</span>;
}
