import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { folderMessages, readDamageFolder } from "@/lib/sharepoint/folder-service";
import { SharePointFolderControls } from "./sharepoint-folder-controls";

export async function SharePointFolderSection({ caseId }: { caseId: string }) {
  const [actor, folder] = await Promise.all([getCurrentAppUser(), readDamageFolder(caseId)]);
  return <SharePointFolderControls caseId={caseId} canManage={hasAnyRole(actor, ["admin", "ipad_verwaltung"])}
    status={folder?.status ?? null} webUrl={folder?.web_url ?? null}
    message={folder?.error_code ? folderMessages[folder.error_code] || folderMessages.graph_unavailable : null} />;
}
