import "server-only";
import { safeSharePointUrl } from "./folder-name";

export type GraphConfig = { tenantId: string; clientId: string; clientSecret: string; driveId: string; parentId: string };
export class FolderError extends Error {
  constructor(public code: string) { super(code); }
}
export function graphConfig(env: NodeJS.ProcessEnv = process.env): GraphConfig | null {
  const values = [env.SHAREPOINT_TENANT_ID, env.SHAREPOINT_CLIENT_ID, env.SHAREPOINT_CLIENT_SECRET, env.SHAREPOINT_DRIVE_ID, env.SHAREPOINT_CASES_ITEM_ID];
  if (values.some((value) => !value?.trim())) return null;
  const [tenantId, clientId, clientSecret, driveId, parentId] = values as string[];
  if (![tenantId, clientId].every((value) => /^[0-9a-f-]{36}$/i.test(value))) return null;
  return { tenantId, clientId, clientSecret, driveId, parentId };
}

type Item = { id?: string; name?: string; webUrl?: string; folder?: object; parentReference?: { id?: string; driveId?: string }; createdBy?: { application?: { id?: string } } };
export async function ensureGraphFolder(config: GraphConfig, name: string, fetcher: typeof fetch = fetch) {
  const auth = await fetcher(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: "POST", body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
    cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!auth.ok) throw new FolderError("graph_auth");
  const token = await auth.json();
  if (typeof token.access_token !== "string") throw new FolderError("graph_auth");
  const base = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(config.driveId)}/items/${encodeURIComponent(config.parentId)}`;
  const request = (url: string, options: RequestInit = {}) => fetcher(url, { ...options,
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10000), redirect: "error" });
  const validate = (item: Item, recovery: boolean) => {
    const webUrl = safeSharePointUrl(item.webUrl);
    if (!item.id || !item.folder || !webUrl || item.name !== name || item.parentReference?.id !== config.parentId || item.parentReference?.driveId !== config.driveId) throw new FolderError("invalid_response");
    // Never adopt an unrelated existing folder on a name conflict.
    if (recovery && item.createdBy?.application?.id?.toLowerCase() !== config.clientId.toLowerCase()) throw new FolderError("folder_conflict");
    return { itemId: item.id, webUrl };
  };
  const response = await request(`${base}/children`, { method: "POST", body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
  if (response.ok) return validate(await response.json(), false);
  if (response.status === 409) {
    const existing = await request(`${base}:/${encodeURIComponent(name)}?$select=id,name,webUrl,folder,parentReference,createdBy`);
    if (existing.ok) return validate(await existing.json(), true);
    throw new FolderError("folder_conflict");
  }
  throw new FolderError(response.status === 401 ? "graph_auth" : response.status === 403 ? "graph_access" : "graph_unavailable");
}
