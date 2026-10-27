"use server";
import {redirect} from "next/navigation";
import {getCurrentAppUser,hasAnyRole} from "@/lib/auth/current-user";
import {createClient} from "@/lib/supabase/server";
function normalizeRequiredText(value:FormDataEntryValue|null) {return typeof value === "string" ? value.trim() : "";}
function normalizeOptionalText(value:FormDataEntryValue|null) {return normalizeRequiredText(value)||null;}
export async function issueLegacyPreparedSet(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const requestedReturn = normalizeRequiredText(formData.get("return_to"));
  const returnTo = /^\/(sets(?:\/w1)?|ausgaben)(\?|$)/.test(requestedReturn) ? requestedReturn : "/sets";
  const issuedAt =
    normalizeRequiredText(formData.get("issued_at")) ||
    new Date().toISOString().slice(0, 10);
  const issueNote = normalizeOptionalText(formData.get("issue_note"));

  if (!setId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const [
    { data: set, error: setError },
    { data: assignment, error: assignmentError },
  ] = await Promise.all([
    supabase
      .from("inventory_set")
      .select("id,availability,condition,assigned_person_id")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("set_person_assignment")
      .select("id,issue_note,person:person_id(id,legacy_user_id,status)")
      .eq("set_id", setId)
      .is("returned_at", null)
      .is("issued_at", null)
      .maybeSingle(),
  ]);

  if (setError) {
    throw setError;
  }

  if (assignmentError) {
    throw assignmentError;
  }

  const assignmentPerson = Array.isArray(assignment?.person)
    ? assignment?.person[0]
    : assignment?.person;

  if (
    !set ||
    !assignment ||
    !assignmentPerson ||
    assignmentPerson.status !== "aktiv" ||
    set.availability !== "zugeordnet" ||
    !["ok", "beschädigt_nutzbar"].includes(set.condition)
  ) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_invalid`);
  }

  const combinedNote = [
    assignment.issue_note,
    issueNote,
    `Tatsächliche Ausgabe am ${issuedAt} über Set-Liste.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { error: assignmentUpdateError } = await supabase
    .from("set_person_assignment")
    .update({
      issued_at: issuedAt,
      issue_note: combinedNote || null,
      legacy_status: "manual_issue",
      legacy_user_id: assignmentPerson.legacy_user_id ?? 0,
    })
    .eq("id", assignment.id)
    .is("returned_at", null)
    .is("issued_at", null);

  if (assignmentUpdateError) {
    throw assignmentUpdateError;
  }

  const { error: setUpdateError } = await supabase
    .from("inventory_set")
    .update({
      availability: "ausgegeben",
      legacy_user_id: assignmentPerson.legacy_user_id,
      notes: combinedNote || null,
      storage_label: null,
    })
    .eq("id", setId);

  if (setUpdateError) {
    throw setUpdateError;
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}issued=1`);
}
