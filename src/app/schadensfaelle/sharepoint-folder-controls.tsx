"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { safeSharePointUrl } from "@/lib/sharepoint/folder-name";

type Props = { caseId: string; canManage: boolean; status: string | null; webUrl: string | null; message: string | null };
export function SharePointFolderControls(props: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = safeSharePointUrl(props.webUrl);
  async function retry() {
    setPending(true); setError(null);
    try {
      const result = await fetch(`/api/schadensfaelle/${encodeURIComponent(props.caseId)}/sharepoint-folder`, { method: "POST" });
      if (!result.ok) setError("Der Ordner konnte nicht bereitgestellt werden. Bitte erneut versuchen.");
      router.refresh();
    } catch { setError("Keine Verbindung. Bitte erneut versuchen."); }
    finally { setPending(false); }
  }
  return <div className="grid gap-2 text-sm">
    <span className="font-semibold">Fotos / Dateien</span>
    {url && props.status === "ready" ? <>
      <a className="font-medium text-blue-700 underline" href={url} target="_blank" rel="noopener noreferrer">Fotos in SharePoint öffnen</a>
      <p className="text-zinc-500">Fotos dort aufnehmen oder hochladen. Die schulische Microsoft-Anmeldung und SharePoint-Berechtigung sind erforderlich.</p>
    </> : <>
      <p role="status" className="text-zinc-600">{props.message || (props.status === "provisioning" ? "Der Ordner wird bereitgestellt. Bei abgebrochener Verbindung kann die Bereitstellung erneut versucht werden." : "Für diesen Schadensfall ist noch kein SharePoint-Ordner verknüpft.")}</p>
      {props.canManage ? <button type="button" className="w-fit rounded border border-zinc-300 px-3 py-2 font-medium disabled:opacity-50" disabled={pending} onClick={retry}>{pending ? "Ordner wird bereitgestellt …" : props.status === "failed" || props.status === "provisioning" ? "Bereitstellung erneut versuchen" : "SharePoint-Ordner bereitstellen"}</button> : null}
    </>}
    {error ? <p role="alert" className="text-red-700">{error}</p> : null}
  </div>;
}
