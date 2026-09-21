import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faUserCheck, faArrowUpRightFromSquare, faLock, faBookmark, faRotate, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
const availabilityStyles: Record<string, { label: string; colors: string }> = {
  frei: { label: "Frei", colors: "bg-emerald-100 text-emerald-800" },
  zugeordnet: { label: "Zugeordnet", colors: "bg-violet-100 text-violet-800" },
  ausgegeben: { label: "Ausgegeben", colors: "bg-blue-100 text-blue-800" },
  blockiert: { label: "Blockiert", colors: "bg-red-100 text-red-800" },
  reserviert: { label: "Reserviert", colors: "bg-violet-100 text-violet-800" },
  zurücksetzen: { label: "Zurücksetzen", colors: "bg-amber-100 text-amber-800" },
  unklar: { label: "Unklar", colors: "bg-zinc-100 text-zinc-700" },
};

export function SetAvailabilityBadge({ value }: { value: string | null | undefined }) {
  const normalized = (value?.trim().toLowerCase() || "unklar").replace("zuruecksetzen", "zurücksetzen");
  const icons = { frei: faCircleCheck, zugeordnet: faUserCheck, ausgegeben: faArrowUpRightFromSquare, blockiert: faLock, reserviert: faBookmark, zurücksetzen: faRotate };
  const icon = icons[normalized as keyof typeof icons] ?? faCircleQuestion;
  const style = availabilityStyles[normalized];

  return (
    <span className={`inline-flex items-center gap-2 rounded-md px-2 py-1 ${style?.colors ?? "bg-zinc-100 text-zinc-700"}`}>
      <FontAwesomeIcon icon={icon} aria-hidden="true" className="h-3 w-3 shrink-0" />
      {style?.label ?? value}
    </span>
  );
}
