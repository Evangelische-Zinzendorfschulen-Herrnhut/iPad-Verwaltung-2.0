"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export async function updateDamageStatus(id: string, setId: string, status: string) {
  const user = await getCurrentAppUser();
  if (!hasAnyRole(user, ["admin", "ipad_verwaltung"])) return { error: "Keine Berechtigung." };
  if (!["entwurf", "offen", "in_bearbeitung", "bericht_erzeugt", "bericht_unterschrieben", "abgeschlossen", "storniert"].includes(status)) return { error: "Ungültiger Status." };
  const supabase = await createClient();
  const current = await supabase.from("damage_case").select("status,internal_note,updated_at").eq("id", id).eq("set_id", setId).single();
  if (current.error || !current.data) return { error: "Schadensfall konnte nicht geladen werden." };
  if (current.data.status === status) return { error: null };
  const note = [current.data.internal_note, `Statusänderung ${new Date().toISOString()} durch Nutzer ${user!.id}: ${current.data.status} → ${status}.`].filter(Boolean).join("\n");
  const result = await supabase.from("damage_case").update({ status, internal_note: note }).eq("id", id).eq("set_id", setId).eq("updated_at", current.data.updated_at).select("id");
  if (result.error) return { error: "Status konnte nicht gespeichert werden." };
  if (!result.data?.length) return { error: "Der Schadensfall wurde inzwischen geändert. Bitte erneut versuchen." };
  revalidatePath("/sets");
  revalidatePath("/schadensfaelle");
  return { error: null };
}
