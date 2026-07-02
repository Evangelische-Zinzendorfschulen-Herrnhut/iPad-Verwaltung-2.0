import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { SectionTabs } from "../../section-tabs";
import { loadWagenOverview } from "../wagen-overview";

export const metadata: Metadata = {
  title: "W1 | iPad-Verwaltung",
};

export default async function W1SetsPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const rows = await loadWagenOverview("W1");
  const occupiedPlaces = rows.filter((row) => row.storagePlace).length;
  const assignedSets = rows.filter((row) => row.person).length;
  const incompleteSets = rows.filter((row) => row.condition !== "ok").length;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/sets">
              Sets und Inventar
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Wagen W1
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white"
              href="/sets/w1/export.xlsx"
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
            <p className="text-sm text-zinc-500">Sets in W1</p>
            <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Plätze erkannt</p>
            <p className="mt-2 text-2xl font-semibold">{occupiedPlaces}/30</p>
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
            <Link
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
              href="/sets"
            >
              Alle Sets
            </Link>
          </div>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Platz</th>
                    <th className="px-4 py-3 font-medium">Set</th>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Klasse</th>
                    <th className="px-4 py-3 font-medium">iPad</th>
                    <th className="px-4 py-3 font-medium">Pencil</th>
                    <th className="px-4 py-3 font-medium">Tastatur</th>
                    <th className="px-4 py-3 font-medium">Verfügbarkeit</th>
                    <th className="px-4 py-3 font-medium">Zustand</th>
                    <th className="px-4 py-3 font-medium">Lagerort</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      className="border-t border-zinc-100 hover:bg-zinc-50"
                      key={row.id}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {row.storagePlace ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {row.legacySetId}
                      </td>
                      <td className="px-4 py-3">{row.person || "-"}</td>
                      <td className="px-4 py-3">{row.classLabel || "-"}</td>
                      <td className="px-4 py-3">{row.ipad || "-"}</td>
                      <td className="px-4 py-3">{row.pencil || "-"}</td>
                      <td className="px-4 py-3">{row.keyboard || "-"}</td>
                      <td className="px-4 py-3">{row.availability}</td>
                      <td className="px-4 py-3">{row.condition}</td>
                      <td className="px-4 py-3">{row.storageLabel || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Sets mit Lagerort W1 gefunden.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
