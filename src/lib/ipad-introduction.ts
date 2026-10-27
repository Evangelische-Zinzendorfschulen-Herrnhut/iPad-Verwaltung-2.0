export const INTRODUCTION = "ipad_einfuehrung";
export function berlinToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function wagonPlace(label: string | null | undefined) {
  const match = label?.match(/^(W[1-6])\s*[-/:]\s*(0?[1-9]|[12]\d|30)\s*$/);
  return match ? {wagon:match[1],place:Number(match[2])} : null;
}
export function validIssueDate(value: string, today = berlinToday()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value && value <= today;
}
export function canSupplyReplacement(availability: string, personId: string | null, activeAssignment: boolean) {
  return ["frei","blockiert"].includes(availability) && !personId && !activeAssignment;
}
