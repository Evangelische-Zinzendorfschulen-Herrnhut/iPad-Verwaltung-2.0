import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createSimpleWorkbook } from "@/lib/xlsx/simple-workbook";
import { loadWagenOverview } from "../../wagen-overview";

const storageFilters = [
  { label: "Wagen W1", value: "W1" },
  { label: "Wagen W2", value: "W2" },
  { label: "Wagen W3", value: "W3" },
  { label: "Wagen W4", value: "W4" },
  { label: "Wagen W5", value: "W5" },
  { label: "Wagen W6", value: "W6" },
  { label: "Schrank1", value: "Schrank1" },
  { label: "Schrank2", value: "Schrank2" },
  { label: "Regal1", value: "Regal1" },
  { label: "Alle Lagerorte", value: "all" },
];

function getStorageFilter(searchParams: URLSearchParams) {
  const storage = searchParams.get("storage") ?? "";

  return storageFilters.some((filter) => filter.value === storage)
    ? storage
    : "W1";
}

function slugifyStorage(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    return new Response("Nicht berechtigt", { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const selectedStorage = getStorageFilter(searchParams);
  const selectedStorageLabel =
    storageFilters.find((filter) => filter.value === selectedStorage)?.label
    ?? "Wagen W1";
  const query = (searchParams.get("q") ?? "").trim();
  const rows = await loadWagenOverview(
    selectedStorage === "all" ? null : selectedStorage,
    query,
  );
  const workbook = createSimpleWorkbook([
    {
      name: selectedStorageLabel,
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
  const filename = `ipad-lagerliste-${slugifyStorage(selectedStorage)}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(workbook, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
