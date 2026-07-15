import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../../section-tabs";
import {
  PersonSelectionList,
  type PersonSelectionOption,
} from "../person-selection-list";
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

type PersonOptionRow = {
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  legacy_user_id: number | null;
  person_type: string;
};

type RawPersonClassAssignmentRow = {
  person_id: string;
  school_class:
    | {
        grade_level: number | null;
        label: string;
      }
    | {
        grade_level: number | null;
        label: string;
      }[]
    | null;
};

const QUERY_BATCH_SIZE = 100;

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

function normalizeJoined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function chunkValues<T>(values: T[], size = QUERY_BATCH_SIZE) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

async function prepareSetFromStorageList(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const personId = normalizeRequiredText(formData.get("person_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets/w1";
  const issueNote = normalizeOptionalText(formData.get("issue_note"));
  const storageLabel = normalizeOptionalText(formData.get("storage_label"));

  if (!setId || !personId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const [
    { data: set, error: setError },
    { data: person, error: personError },
    { data: activeAssignment, error: activeAssignmentError },
    { data: componentAssignments, error: componentAssignmentsError },
    { data: minLegacyAssignment },
  ] = await Promise.all([
    supabase
      .from("inventory_set")
      .select("id,legacy_set_id,availability,condition")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("person")
      .select("id,legacy_user_id,status")
      .eq("id", personId)
      .maybeSingle(),
    supabase
      .from("set_person_assignment")
      .select("id")
      .eq("set_id", setId)
      .is("returned_at", null)
      .maybeSingle(),
    supabase
      .from("set_component_assignment")
      .select("role,component:component_id(condition)")
      .eq("set_id", setId)
      .is("valid_until", null),
    supabase
      .from("set_person_assignment")
      .select("legacy_assignment_id")
      .lt("legacy_assignment_id", 0)
      .order("legacy_assignment_id", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (setError) throw setError;
  if (personError) throw personError;
  if (activeAssignmentError) throw activeAssignmentError;
  if (componentAssignmentsError) throw componentAssignmentsError;

  if (!set || !person || person.status !== "aktiv" || activeAssignment) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_invalid`);
  }

  const requiredRoles = new Set(["ipad", "pencil", "keyboard"]);
  const blockingConditions = new Set(["defekt", "gesperrt_kein_mdm"]);
  const validComponents = (componentAssignments ?? []).filter((assignment) => {
    const component = normalizeJoined(assignment.component);

    return (
      requiredRoles.has(assignment.role) &&
      component &&
      !blockingConditions.has(component.condition)
    );
  });

  if (
    set.availability !== "frei" ||
    !["ok", "beschädigt_nutzbar"].includes(set.condition) ||
    validComponents.length < 3
  ) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_blocked`);
  }

  const nextLegacyAssignmentId =
    minLegacyAssignment?.legacy_assignment_id &&
    minLegacyAssignment.legacy_assignment_id < 0
      ? minLegacyAssignment.legacy_assignment_id - 1
      : -1;
  const combinedNote = [
    issueNote,
    "Vorbereitung zur Ausgabe über Lagerliste.",
  ]
    .filter(Boolean)
    .join("\n");

  const { error: insertError } = await supabase.from("set_person_assignment").insert({
    issued_at: null,
    issue_note: combinedNote || null,
    legacy_assignment_id: nextLegacyAssignmentId,
    legacy_status: "prepared_issue",
    legacy_user_id: person.legacy_user_id ?? 0,
    person_id: personId,
    set_id: setId,
  });

  if (insertError) throw insertError;

  const { error: updateSetError } = await supabase
    .from("inventory_set")
    .update({
      assigned_person_id: personId,
      availability: "zugeordnet",
      legacy_user_id: person.legacy_user_id,
      notes: combinedNote || null,
      storage_label: storageLabel,
    })
    .eq("id", setId);

  if (updateSetError) throw updateSetError;

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}prepared=1`);
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
  const issueSetId = getSingleParam(params, "issue");
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
  const supabase = await createClient();
  const { data: personOptionData, error: personOptionError } = canManageSets
    ? await supabase
        .from("person")
        .select("id,legacy_user_id,first_name,last_name,email,person_type")
        .eq("status", "aktiv")
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .limit(5000)
    : { data: [], error: null };

  if (personOptionError) {
    throw personOptionError;
  }

  const personOptions = (personOptionData ?? []) as PersonOptionRow[];
  const personOptionClassByPersonId = new Map<string, string>();

  for (const personIdBatch of chunkValues(personOptions.map((person) => person.id))) {
    const { data: personOptionClassData, error: personOptionClassError } =
      await supabase
        .from("person_class_assignment")
        .select("person_id,school_class:school_class_id(label,grade_level)")
        .is("valid_until", null)
        .in("person_id", personIdBatch);

    if (personOptionClassError) {
      throw personOptionClassError;
    }

    for (const assignment of (personOptionClassData ?? []) as RawPersonClassAssignmentRow[]) {
      const schoolClass = normalizeJoined(assignment.school_class);

      if (schoolClass) {
        personOptionClassByPersonId.set(assignment.person_id, schoolClass.label);
      }
    }
  }

  const personSelectionOptions: PersonSelectionOption[] = personOptions.map(
    (person) => ({
      classLabel: personOptionClassByPersonId.get(person.id) ?? null,
      email: person.email,
      firstName: person.first_name,
      id: person.id,
      lastName: person.last_name,
      legacyUserId: person.legacy_user_id,
      personType: person.person_type,
    }),
  );
  const setToIssue = rows.find((row) => row.id === issueSetId) ?? null;
  const closeIssueParams = new URLSearchParams();

  if (selectedStorage !== "W1") {
    closeIssueParams.set("storage", selectedStorage);
  }

  if (query) {
    closeIssueParams.set("q", query);
  }

  const closeIssueQuery = closeIssueParams.toString();
  const issueCloseHref = closeIssueQuery
    ? `/sets/w1?${closeIssueQuery}`
    : "/sets/w1";

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

        {setToIssue && canManageSets ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Lagerliste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {setToIssue.issueLabel ?? "Set vorbereiten"}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Set {setToIssue.legacySetId}
                  </p>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={issueCloseHref}
                >
                  Schließen
                </Link>
              </div>

              <form
                action={prepareSetFromStorageList}
                className="grid gap-6 px-6 py-6"
              >
                <input name="set_id" type="hidden" value={setToIssue.id} />
                <input name="return_to" type="hidden" value={issueCloseHref} />

                <section className="grid gap-3 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">Set</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">iPad</dt>
                      <dd className="inventory-number mt-1 text-sm">{setToIssue.ipad || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">Pencil</dt>
                      <dd className="inventory-number mt-1 text-sm">{setToIssue.pencil || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">Tastatur</dt>
                      <dd className="inventory-number mt-1 text-sm">{setToIssue.keyboard || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">Zustand</dt>
                      <dd className="mt-1 text-sm">{setToIssue.condition}</dd>
                    </div>
                  </dl>
                </section>

                <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">Vorbereitung</h3>
                  <div className="grid gap-1 text-sm font-medium">
                    <span>Person</span>
                    <PersonSelectionList people={personSelectionOptions} />
                  </div>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Lagerort
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={setToIssue.storageLabel ?? ""}
                      name="storage_label"
                      placeholder="z. B. W1 - 02, Schrank1"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Interne Ausgabenotiz
                    <textarea
                      className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      name="issue_note"
                      placeholder="Optional, z. B. Zubehör, Besonderheiten oder Vorbereitungshinweis"
                    />
                  </label>
                </section>

                <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
                  <Link
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                    href={issueCloseHref}
                  >
                    Abbrechen
                  </Link>
                  <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                    Vorbereitung speichern
                  </button>
                </div>
              </form>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
