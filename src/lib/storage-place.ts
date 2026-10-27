// Slash-separated places belong only to the exact storage location Regal.
const regalPlacePattern = /^Regal\s*-\s*([1-9]\d*\/[1-9]\d*)\s*$/i;

export function validateStorageLabel(label: string | null): string | null {
  if (label?.includes("/") && !regalPlacePattern.test(label)) {
    // Preserve existing wagon separator syntax (e.g. W1/4).
    if (!/^W[1-6]\s*\/\s*(0?[1-9]|[12]\d|30)\s*$/i.test(label)) {
      throw new Error("Plätze mit Schrägstrich sind nur als Regal - 4/1 zulässig.");
    }
  }
  return label;
}

export function parseStoragePlace(storageLabel: string | null) {
  if (!storageLabel) {
    return null;
  }

  const regalMatch = storageLabel.match(regalPlacePattern);
  if (regalMatch) return regalMatch[1];
  // Do not truncate a slash-separated slot into an integer.
  if (/-\s*\d+\//.test(storageLabel)) return null;

  const wagonMatch = storageLabel.match(/\bW[1-6]\b\D*(\d{1,2})\b/i);
  const storageSlotMatch = storageLabel.match(
    /\b(?:Schrank\s+\d+|Regal\s+\d+(?:\.\d+)?)\s*-\s*(\d{1,2})\s*$/i,
  );
  const match = wagonMatch ?? storageSlotMatch;
  const place = match ? Number.parseInt(match[1], 10) : Number.NaN;

  return Number.isInteger(place) && place >= 1 && place <= 30 ? place : null;
}
