/** Unterrichtsnutzung beginnt vor der regulaeren Ausgabe zur Mitnahme. */
export function assignmentPhase(assignment: {
  ipad_introduction_at: string | null;
  issued_at: string | null;
  returned_at: string | null;
}): "prepared" | "introduction" | "issued" | "returned" {
  if (assignment.returned_at) return "returned";
  if (assignment.issued_at) return "issued";
  if (assignment.ipad_introduction_at) return "introduction";
  return "prepared";
}
