import { NextResponse } from "next/server";
import { provisionDamageFolder } from "@/lib/sharepoint/folder-service";
import { FolderError } from "@/lib/sharepoint/graph";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Schadensfall." }, { status: 400 });
  try {
    return NextResponse.json(await provisionDamageFolder(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof FolderError && error.code === "forbidden" ? 403
      : error instanceof FolderError && error.code === "not_found" ? 404 : 503;
    return NextResponse.json({ error: status === 403 ? "Keine Berechtigung." : "Ordner konnte nicht bereitgestellt werden." }, { status });
  }
}
