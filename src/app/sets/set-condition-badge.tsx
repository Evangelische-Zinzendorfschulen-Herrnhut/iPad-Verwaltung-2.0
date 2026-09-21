import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faPuzzlePiece, faTriangleExclamation, faLock, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { conditionLabel, normalizeCondition } from "@/lib/condition";

export function SetConditionBadge({
  value,
}: {
  value: number | string | null | undefined;
}) {
  const normalized = normalizeCondition(String(value ?? "unklar"));
  const colors = normalized === "ok"
    ? "bg-emerald-100 text-emerald-800"
    : normalized === "defekt"
      ? "bg-red-100 text-red-800"
      : normalized === "unvollständig"
        ? "bg-amber-100 text-amber-800"
        : "bg-zinc-100 text-zinc-700";

  const icon = normalized === "ok" ? faCircleCheck : normalized === "unvollständig" ? faPuzzlePiece : normalized === "defekt" || normalized === "beschädigt_nutzbar" ? faTriangleExclamation : normalized === "gesperrt_kein_mdm" ? faLock : faCircleQuestion;

  return (
    <span className={`inline-flex items-center gap-2 rounded-md px-2 py-1 ${colors}`}>
      <FontAwesomeIcon icon={icon} aria-hidden="true" className="h-3 w-3 shrink-0" />
      {conditionLabel(String(value || "unklar"))}
    </span>
  );
}
