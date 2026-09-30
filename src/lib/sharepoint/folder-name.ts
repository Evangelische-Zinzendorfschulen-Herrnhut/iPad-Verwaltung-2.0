export function normalizeFolderPart(value: string) {
  return value.normalize("NFC").replace(/[\x00-\x1f\x7f"*:<>?/\\|#%]/g, "-")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[ .-]+|[ .-]+$/g, "");
}

export function damageFolderName(number: number | string, person: { first_name: string; last_name: string } | null, inventory: string | null) {
  if (!/^\d+$/.test(String(number))) throw new Error("Invalid damage number");
  const suffix = person
    ? `${normalizeFolderPart(person.last_name) || "Unbekannt"}-${normalizeFolderPart(person.first_name) || "Unbekannt"}`
    : inventory ? `Inventar-${normalizeFolderPart(inventory) || "Unbekannt"}` : "Ohne-Zuordnung";
  const prefix = `Schaden-${String(number).padStart(6, "0")}_`;
  return prefix + Array.from(suffix).slice(0, 180 - prefix.length).join("").replace(/[ .-]+$/g, "");
}

export function safeSharePointUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "ezshde.sharepoint.com"
      && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}
