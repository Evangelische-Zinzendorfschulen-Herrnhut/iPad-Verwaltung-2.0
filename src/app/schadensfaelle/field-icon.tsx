"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faCircleInfo,
  faClipboardList,
  faCube,
  faEnvelope,
  faEuroSign,
  faFileImport,
  faFileLines,
  faFlag,
  faHashtag,
  faIdBadge,
  faLaptop,
  faLayerGroup,
  faLocationDot,
  faRotate,
  faShieldHalved,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type FieldIconProps = {
  label: string;
};

const iconMap: Record<string, { icon: IconDefinition; color: string }> = {
  Abrechnung: { icon: faEuroSign, color: "text-emerald-600 bg-emerald-50" },
  "Angelegt durch": { icon: faEnvelope, color: "text-sky-600 bg-sky-50" },
  Art: { icon: faClipboardList, color: "text-violet-600 bg-violet-50" },
  Austauschstatus: { icon: faRotate, color: "text-amber-600 bg-amber-50" },
  Bearbeiter: { icon: faIdBadge, color: "text-sky-600 bg-sky-50" },
  Betroffen: { icon: faCube, color: "text-orange-600 bg-orange-50" },
  "Betroffene Komponenten": { icon: faLayerGroup, color: "text-orange-600 bg-orange-50" },
  Ereignisdatum: { icon: faCalendarDays, color: "text-blue-600 bg-blue-50" },
  "Ereignisdatum | wann": {
    icon: faCalendarDays,
    color: "text-blue-600 bg-blue-50",
  },
  "Ersatz ausgegeben am": { icon: faCalendarDays, color: "text-blue-600 bg-blue-50" },
  Ersatzkomponente: { icon: faLaptop, color: "text-orange-600 bg-orange-50" },
  Ersatzset: { icon: faLayerGroup, color: "text-indigo-600 bg-indigo-50" },
  "Erste Einschätzung": { icon: faEuroSign, color: "text-emerald-600 bg-emerald-50" },
  "Erstellt am": { icon: faCalendarDays, color: "text-blue-600 bg-blue-50" },
  "Geändert am": { icon: faCalendarDays, color: "text-blue-600 bg-blue-50" },
  Haftung: { icon: faShieldHalved, color: "text-emerald-600 bg-emerald-50" },
  Hergang: { icon: faFileLines, color: "text-zinc-600 bg-zinc-50" },
  "Hergang | Wie": { icon: faFileLines, color: "text-zinc-600 bg-zinc-50" },
  Importhinweis: { icon: faFileImport, color: "text-fuchsia-600 bg-fuchsia-50" },
  Importstatus: { icon: faFileImport, color: "text-fuchsia-600 bg-fuchsia-50" },
  "Interne Notiz": { icon: faFileLines, color: "text-zinc-600 bg-zinc-50" },
  Komponente: { icon: faLaptop, color: "text-orange-600 bg-orange-50" },
  Kurzbeschreibung: { icon: faFileLines, color: "text-zinc-600 bg-zinc-50" },
  "Legacy-ID": { icon: faHashtag, color: "text-fuchsia-600 bg-fuchsia-50" },
  "Legacy-Status": { icon: faFlag, color: "text-fuchsia-600 bg-fuchsia-50" },
  Meldedatum: { icon: faCalendarDays, color: "text-blue-600 bg-blue-50" },
  Ort: { icon: faLocationDot, color: "text-red-600 bg-red-50" },
  Person: { icon: faUser, color: "text-sky-600 bg-sky-50" },
  Quelle: { icon: faFileImport, color: "text-fuchsia-600 bg-fuchsia-50" },
  "Quelle-ID": { icon: faHashtag, color: "text-fuchsia-600 bg-fuchsia-50" },
  Schadenbeschreibung: { icon: faFileLines, color: "text-zinc-600 bg-zinc-50" },
  "Schadenbeschreibung | was": {
    icon: faFileLines,
    color: "text-zinc-600 bg-zinc-50",
  },
  Set: { icon: faLayerGroup, color: "text-indigo-600 bg-indigo-50" },
  Status: { icon: faFlag, color: "text-rose-600 bg-rose-50" },
  "Versicherung/Garantie": { icon: faShieldHalved, color: "text-emerald-600 bg-emerald-50" },
  Vorgangsart: { icon: faClipboardList, color: "text-violet-600 bg-violet-50" },
  Zeugen: { icon: faUsers, color: "text-sky-600 bg-sky-50" },
};

export function FieldIcon({ label }: FieldIconProps) {
  const icon = iconMap[label] ?? {
    icon: faCircleInfo,
    color: "text-zinc-600 bg-zinc-50",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${icon.color}`}
    >
      <FontAwesomeIcon className="h-3.5 w-3.5" icon={icon.icon} />
    </span>
  );
}
