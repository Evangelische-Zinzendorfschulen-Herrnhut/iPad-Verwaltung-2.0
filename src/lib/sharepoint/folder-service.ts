import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { damageFolderName } from "./folder-name";
import { ensureGraphFolder, FolderError, graphConfig } from "./graph";

export type FolderState = { status: string; web_url: string | null; error_code: string | null };
export const folderMessages: Record<string, string> = {
  not_configured: "Die SharePoint-Anbindung ist noch nicht eingerichtet.",
  graph_auth: "Die Microsoft-Anmeldung der App ist fehlgeschlagen.",
  graph_access: "Die App hat keinen Zugriff auf den SharePoint-Zielordner.",
  folder_conflict: "Ein gleichnamiger Ordner konnte nicht sicher zugeordnet werden. Bitte die Administration informieren.",
  destination_changed: "Die SharePoint-Zielkonfiguration wurde geändert. Bitte die Administration informieren.",
  invalid_response: "SharePoint hat keine gültige Ordnerreferenz geliefert.",
  graph_unavailable: "Der SharePoint-Ordner konnte nicht bereitgestellt werden. Bitte erneut versuchen.",
  database_unavailable: "Die Ordnerverknüpfung ist noch nicht verfügbar. Bitte die Administration informieren.",
};

export async function readDamageFolder(id: string): Promise<FolderState | null> {
  const db = await createClient();
  const { data, error } = await db.from("damage_sharepoint_folder").select("status,web_url,error_code").eq("damage_case_id", id).maybeSingle();
  return error ? { status: "failed", web_url: null, error_code: "database_unavailable" } : data;
}

function joined<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

// Called after creation or by the retry endpoint. It always authenticates the
// caller and reads the case under RLS before using the privileged DB client.
export async function provisionDamageFolder(id: string): Promise<FolderState> {
  const actor = await getCurrentAppUser();
  if (!hasAnyRole(actor, ["admin", "ipad_verwaltung"])) throw new FolderError("forbidden");
  const db = await createClient();
  const { data: row, error } = await db.from("damage_case").select("id,damage_number,person:person_id(first_name,last_name),component:component_id(legacy_inventory_number),inventory_set:set_id(inventory_number)").eq("id", id).maybeSingle();
  if (error || !row) throw new FolderError("not_found");
  const config = graphConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !url) return { status: "failed", web_url: null, error_code: "database_unavailable" };
  const serverDb = createSupabaseClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const person = joined(row.person);
  const inventory = joined(row.component)?.legacy_inventory_number || joined(row.inventory_set)?.inventory_number || null;
  const name = damageFolderName(row.damage_number, person, inventory);
  const { data: previous } = await serverDb.from("damage_sharepoint_folder").select("drive_id,parent_item_id,client_id").eq("damage_case_id", id).maybeSingle();
  const request = crypto.randomUUID();
  const { data: claims, error: claimError } = await serverDb.rpc("claim_damage_sharepoint_folder", {
    p_case_id: id, p_actor_id: actor!.id, p_name: name, p_request: request,
    p_drive_id: config?.driveId ?? previous?.drive_id ?? null,
    p_parent_id: config?.parentId ?? previous?.parent_item_id ?? null,
    p_client_id: config?.clientId ?? previous?.client_id ?? null,
  });
  if (claimError) return { status: "failed", web_url: null, error_code: claimError.message === "Destination changed" ? "destination_changed" : "database_unavailable" };
  const claim = claims?.[0];
  if (!claim) return { status: "failed", web_url: null, error_code: "database_unavailable" };
  if (claim.status === "ready" || claim.lease_token !== request) return { status: claim.status, web_url: claim.web_url, error_code: claim.error_code };
  let state: FolderState;
  let itemId: string | null = null;
  try {
    if (!config) throw new FolderError("not_configured");
    const folder = await ensureGraphFolder(config, claim.folder_name);
    itemId = folder.itemId;
    state = { status: "ready", web_url: folder.webUrl, error_code: null };
  } catch (error) {
    state = { status: "failed", web_url: null, error_code: error instanceof FolderError ? error.code : "graph_unavailable" };
  }
  const { data: finished, error: finishError } = await serverDb.rpc("finish_damage_sharepoint_folder", {
    p_case_id: id, p_actor_id: actor!.id, p_token: request,
    p_item_id: itemId, p_web_url: state.web_url, p_error: state.error_code,
  });
  // A remote folder may already exist. Keep the reservation for safe recovery;
  // never remove it or erase the damage case after a database failure.
  return finishError || !finished ? { status: "failed", web_url: null, error_code: "database_unavailable" } : state;
}
