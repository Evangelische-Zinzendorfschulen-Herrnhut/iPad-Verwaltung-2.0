const aliases: Record<string, string> = {
  unvollstaendig: "unvollständig",
  beschaedigt: "beschädigt_nutzbar",
  beschädigt: "beschädigt_nutzbar",
  beschaedigt_nutzbar: "beschädigt_nutzbar",
};

export function normalizeCondition(value: string) {
  const normalized = value.trim().toLowerCase();
  return aliases[normalized] ?? normalized;
}

export function conditionLabel(value: string | null | undefined) {
  if (!value) return "-";
  const labels: Record<string, string> = {
    ok: "OK",
    unvollständig: "Unvollständig",
    beschädigt_nutzbar: "Beschädigt, nutzbar",
    defekt: "Defekt",
    gesperrt_kein_mdm: "Gesperrt, kein MDM",
    unklar: "Unklar",
  };
  return labels[normalizeCondition(value)] ?? value;
}
