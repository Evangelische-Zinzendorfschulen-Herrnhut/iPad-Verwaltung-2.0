import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createSimpleWorkbook } from "@/lib/xlsx/simple-workbook";
import { loadWagenOverview } from "../../wagen-overview";

export async function GET() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    return new Response("Nicht berechtigt", { status: 403 });
  }

  const rows = await loadWagenOverview("W1");
  const workbook = createSimpleWorkbook([
    {
      name: "Wagen W1",
      rows: [
        [
          "Platz",
          "Set",
          "Person",
          "Klasse",
          "iPad",
          "Pencil",
          "Tastatur",
          "Verfügbarkeit",
          "Zustand",
          "Lagerort",
          "Legacy-Status",
        ],
        ...rows.map((row) => [
          row.storagePlace,
          row.legacySetId,
          row.person,
          row.classLabel,
          row.ipad,
          row.pencil,
          row.keyboard,
          row.availability,
          row.condition,
          row.storageLabel,
          row.legacyStatus,
        ]),
      ],
    },
  ]);
  const filename = `ipad-wagen-w1-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(workbook, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
