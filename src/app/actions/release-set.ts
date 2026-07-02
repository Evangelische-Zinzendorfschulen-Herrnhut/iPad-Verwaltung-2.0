"use server";

import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function normalizeRequiredText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function releaseReturnedSet(formData: FormData) {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";

  if (!setId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { data: activeAssignment, error: activeAssignmentError } = await supabase
    .from("set_person_assignment")
    .select("id")
    .eq("set_id", setId)
    .is("returned_at", null)
    .maybeSingle();

  if (activeAssignmentError) {
    throw activeAssignmentError;
  }

  if (activeAssignment) {
    redirect(returnTo);
  }

  const { error: setError } = await supabase
    .from("inventory_set")
    .update({ availability: "frei" })
    .eq("id", setId)
    .eq("availability", "blockiert")
    .eq("condition", "ok");

  if (setError) {
    throw setError;
  }

  redirect(returnTo);
}
