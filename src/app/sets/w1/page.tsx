import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { SectionTabs } from "../../section-tabs";
import { loadWagenOverview } from "../wagen-overview";
import { WagenTable } from "./wagen-table";

export const metadata: Metadata = {
  title: "Lagerliste | iPad-Verwaltung",
};

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

function getSingleParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getStorageFilter(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const storage = getSingleParam(searchParams, "storage");

  return storageFilters.some((filter) => filter.value === storage)
    ? storage
    : "W1";
}

export default async function W1SetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const appUser = await getCurrentAppUser();
  const params = await searchParams;

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const canManageSets = hasAnyRole(appUser, ["admin", "ipad_verwaltung"]);
  const selectedStorage = getStorageFilter(params);
  const query = getSingleParam(params, "q").trim();
  const selectedStorageLabel =
    storageFilters.find((filter) => filter.value === selectedStorage)?.label
    ?? "Wagen W1";
  const rows = await loadWagenOverview(
    selectedStorage === "all" ? null : selectedStorage,
    query,
  );
  const occupiedPlaces = rows.filter((row) => row.storagePlace).length;
  const assignedSets = rows.filter((row) => row.person).length;
  const incompleteSets = rows.filter((row) => row.condition !== "ok").length;
  const isWagenFilter = /^W[1-6]$/.test(selectedStorage);
  const storageSummaryLabel =
    selectedStorage === "all"
      ? "Sets mit Lagerort"
      : `Sets in ${selectedStorageLabel}`;
  const emptyStateLabel =
    selectedStorage === "all"
      ? "Keine Sets mit Lagerort gefunden."
      : `Keine Sets mit Lagerort ${selectedStorageLabel} gefunden.`;
  const exportParams = new URLSearchParams();

  if (selectedStorage !== "W1") {
    exportParams.set("storage", selectedStorage);
  }

  if (query) {
    exportParams.set("q", query);
  }

  const exportQuery = exportParams.toString();
  const exportHref = exportQuery
    ? `/sets/w1/export.xlsx?${exportQuery}`
    : "/sets/w1/export.xlsx";

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/sets">
              Sets und Komponenten
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Lagerliste
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white"
              href={exportHref}
            >
              XLSX herunterladen
            </a>
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
                Abmelden
              </button>
            </form>
          </div>
        </header>

        <SectionTabs active="wagen-w1" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">{storageSummaryLabel}</p>
            <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Plätze erkannt</p>
            <p className="mt-2 text-2xl font-semibold">
              {isWagenFilter ? `${occupiedPlaces}/30` : occupiedPlaces}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Auffälligkeiten</p>
            <p className="mt-2 text-2xl font-semibold">{incompleteSets}</p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h2 className="font-semibold">Set-Überblick</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {assignedSets} Sets sind aktuell einer Person zugeordnet.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <form className="flex flex-wrap items-end gap-3" method="get">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Lagerort
                  <select
                    className="min-w-44 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                    defaultValue={selectedStorage}
                    name="storage"
                  >
                    {storageFilters.map((filter) => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Suche
                  <input
                    className="min-w-64 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                    defaultValue={query}
                    name="q"
                    placeholder="Person, Set oder Inventarnummer"
                  />
                </label>
                <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50">
                  Filtern
                </button>
              </form>
              <Link
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                href="/sets"
              >
                Alle Sets
              </Link>
            </div>
          </div>

          {rows.length > 0 ? (
            <WagenTable canManageSets={canManageSets} rows={rows} />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              {emptyStateLabel}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
