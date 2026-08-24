import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { PersonenTable, type PersonenTableRow } from "./personen-table";

export const metadata: Metadata = {
  title: "Personen | iPad-Verwaltung",
};

type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  person_type: string;
  status: string;
  jahrgang: number | null;
  notes: string | null;
};

type PersonClassAssignmentRow = {
  school_class: {
    label: string;
    school_year: {
      status: string;
    } | {
      status: string;
    }[] | null;
  } | null;
};

type SchoolYearRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
};

type SchoolClassRow = {
  id: string;
  label: string;
  grade_level: number | null;
  jahrgang: number | null;
  track: number | null;
  is_upper_school: boolean;
  school_year: {
    label: string;
    status: string;
  } | null;
};

type RawSchoolClassRow = Omit<SchoolClassRow, "school_year"> & {
  school_year:
    | {
        label: string;
        status: string;
      }
    | {
        label: string;
        status: string;
      }[]
    | null;
};

const PAGE_SIZE = 50;

function formatName(person: PersonRow) {
  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || "Ohne Namen";
}

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

function getPageParam(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = Number.parseInt(getSingleParam(searchParams, "page"), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  return normalizeOptionalText(value) ?? "";
}

function normalizeOptionalNumber(value: FormDataEntryValue | null) {
  const text = normalizeOptionalText(value);

  if (!text) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function appendFlagToHref(href: string, key: string, value: string) {
  return `${href}${href.includes("?") ? "&" : "?"}${key}=${value}`;
}

function escapeSearchTerm(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function buildPersonSearchFilter(query: string) {
  const terms = query
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const filters: string[] = [];

  for (const term of terms) {
    const escapedTerm = escapeSearchTerm(term);

    filters.push(
      `first_name.ilike.%${escapedTerm}%`,
      `last_name.ilike.%${escapedTerm}%`,
      `email.ilike.%${escapedTerm}%`,
    );
  }

  return filters.join(",");
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "type", "status", "class"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `/personen?${queryString}` : "/personen";
}

function buildCurrentListHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "type", "status", "class", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/personen?${queryString}` : "/personen";
}

function buildNewPersonHref(params: Record<string, string | string[] | undefined>) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "type", "status", "class", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("new", "1");

  return `/personen?${nextParams.toString()}`;
}

function buildDetailHref(personId: string, returnTo: string) {
  const params = new URLSearchParams();
  params.set("returnTo", returnTo);

  return `/personen/${personId}?${params.toString()}`;
}

function buildEditHref(personId: string, returnTo: string) {
  const params = new URLSearchParams();
  params.set("edit", "1");
  params.set("returnTo", returnTo);

  return `/personen/${personId}?${params.toString()}`;
}

async function createPerson(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/personen";
  const firstName = normalizeOptionalText(formData.get("first_name"));
  const lastName = normalizeOptionalText(formData.get("last_name"));
  const personType = normalizeRequiredText(formData.get("person_type"));
  const status = normalizeRequiredText(formData.get("status"));

  if (!personType || !status || (!firstName && !lastName)) {
    redirect(appendFlagToHref(returnTo, "error", "missing_required"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person")
    .insert({
      email: normalizeOptionalText(formData.get("email")),
      first_name: firstName,
      jahrgang: normalizeOptionalNumber(formData.get("jahrgang")),
      last_name: lastName,
      notes: normalizeOptionalText(formData.get("notes")),
      person_type: personType,
      status,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  redirect(`/personen/${data.id}?created=1&returnTo=${encodeURIComponent("/personen")}`);
}

export default async function PersonenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = getSingleParam(params, "q").trim();
  const typeFilter = getSingleParam(params, "type");
  const statusFilter = getSingleParam(params, "status");
  const classFilter = getSingleParam(params, "class");
  const isCreatingPerson = getSingleParam(params, "new") === "1";
  const error = getSingleParam(params, "error");
  const page = getPageParam(params);
  const rangeStart = (page - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE - 1;
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const supabase = await createClient();
  let peopleQuery = supabase
    .from("person")
    .select("id,first_name,last_name,email,person_type,status,jahrgang,notes", {
      count: "exact",
    });

  if (query) {
    peopleQuery = peopleQuery.or(buildPersonSearchFilter(query));
  }

  if (typeFilter) {
    peopleQuery = peopleQuery.eq("person_type", typeFilter);
  }

  if (statusFilter) {
    peopleQuery = peopleQuery.eq("status", statusFilter);
  }

  const { data: classAssignmentData } = await supabase
    .from("person_class_assignment")
    .select("person_id,school_class:school_class_id(label,school_year:school_year_id(status))")
    .is("valid_until", null)
    .limit(1000);
  const rawVisibleClassAssignments = (classAssignmentData ?? []) as unknown as {
    person_id: string;
    school_class:
      | PersonClassAssignmentRow["school_class"]
      | PersonClassAssignmentRow["school_class"][];
  }[];
  const visibleClassAssignments = rawVisibleClassAssignments.map((assignment) => {
    const schoolClass = Array.isArray(assignment.school_class)
      ? (assignment.school_class[0] ?? null)
      : assignment.school_class;
    const schoolYear = Array.isArray(schoolClass?.school_year)
      ? (schoolClass.school_year[0] ?? null)
      : (schoolClass?.school_year ?? null);

    return {
      person_id: assignment.person_id,
      school_class: schoolClass
        ? {
            ...schoolClass,
            school_year: schoolYear,
          }
        : null,
    };
  });
  const activeYearClassAssignments = visibleClassAssignments.filter((assignment) => {
    const schoolClass = Array.isArray(assignment.school_class)
      ? (assignment.school_class[0] ?? null)
      : assignment.school_class;

    return schoolClass?.school_year?.status === "aktiv";
  });
  const classPersonIds = new Set(
    classFilter
      ? activeYearClassAssignments
          .filter((assignment) => {
            const schoolClass = Array.isArray(assignment.school_class)
              ? (assignment.school_class[0] ?? null)
              : assignment.school_class;

            return schoolClass?.label === classFilter;
          })
          .map((assignment) => assignment.person_id)
      : [],
  );

  if (classFilter) {
    peopleQuery = classPersonIds.size
      ? peopleQuery.in("id", [...classPersonIds])
      : peopleQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const [
    peopleResult,
    peopleCountResult,
    activePeopleCountResult,
    studentsCountResult,
    activeTeachingPeopleCountResult,
    activeStudentsResult,
    yearsResult,
    classesResult,
  ] = await Promise.all([
    peopleQuery
      .order("last_name", { ascending: true, nullsFirst: false })
      .order("first_name", { ascending: true, nullsFirst: false })
      .range(rangeStart, rangeEnd),
    supabase.from("person").select("id", { count: "exact", head: true }),
    supabase
      .from("person")
      .select("id", { count: "exact", head: true })
      .eq("status", "aktiv"),
    supabase
      .from("person")
      .select("id", { count: "exact", head: true })
      .eq("person_type", "schueler")
      .eq("status", "aktiv"),
    supabase
      .from("person")
      .select("id", { count: "exact", head: true })
      .in("person_type", ["lehrer", "referendar", "praktikant"])
      .eq("status", "aktiv"),
    supabase
      .from("person")
      .select("id")
      .eq("person_type", "schueler")
      .eq("status", "aktiv")
      .limit(1000),
    supabase
      .from("school_year")
      .select("id,label,start_date,end_date,status")
      .order("start_date", { ascending: false })
      .limit(5),
    supabase
      .from("school_class")
      .select("id,label,grade_level,jahrgang,track,is_upper_school,school_year:school_year_id!inner(label,status)")
      .eq("school_year.status", "aktiv")
      .order("grade_level", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true })
      .limit(100),
  ]);

  const people = (peopleResult.data ?? []) as PersonRow[];
  const currentClassByPersonId = new Map(
    activeYearClassAssignments.map((assignment) => {
      const schoolClass = Array.isArray(assignment.school_class)
        ? (assignment.school_class[0] ?? null)
        : assignment.school_class;

      return [assignment.person_id, schoolClass?.label ?? null];
    }),
  );
  const filteredPeopleCount = peopleResult.count ?? people.length;
  const totalPages = Math.max(1, Math.ceil(filteredPeopleCount / PAGE_SIZE));
  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const displayedFrom =
    filteredPeopleCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayedTo = Math.min(currentPage * PAGE_SIZE, filteredPeopleCount);
  const peopleCount = peopleCountResult.count ?? people.length;
  const activePeopleCount = activePeopleCountResult.count ?? 0;
  const studentsCount = studentsCountResult.count ?? 0;
  const activeTeachingPeopleCount = activeTeachingPeopleCountResult.count ?? 0;
  const activeStudentIds = new Set(
    (activeStudentsResult.data ?? []).map((person) => person.id as string),
  );
  const schoolYears = (yearsResult.data ?? []) as SchoolYearRow[];
  const schoolClasses = ((classesResult.data ?? []) as RawSchoolClassRow[])
    .map((schoolClass) => ({
      ...schoolClass,
      school_year: Array.isArray(schoolClass.school_year)
        ? (schoolClass.school_year[0] ?? null)
        : schoolClass.school_year,
    }))
    .filter((schoolClass) => schoolClass.school_year?.status === "aktiv");
  const classOptions = [
    ...new Set(schoolClasses.map((schoolClass) => schoolClass.label)),
  ];
  const activeStudentCountByClass = new Map<string, number>();

  for (const assignment of activeYearClassAssignments) {
    if (!activeStudentIds.has(assignment.person_id)) {
      continue;
    }

    const schoolClass = Array.isArray(assignment.school_class)
      ? (assignment.school_class[0] ?? null)
      : assignment.school_class;

    if (!schoolClass?.label) {
      continue;
    }

    activeStudentCountByClass.set(
      schoolClass.label,
      (activeStudentCountByClass.get(schoolClass.label) ?? 0) + 1,
    );
  }

  const hasActiveFilters = Boolean(
    query || typeFilter || statusFilter || classFilter,
  );
  const currentListHref = buildCurrentListHref(params);
  const canEditPeople = hasAnyRole(appUser, ["admin"]);
  const newPersonHref = buildNewPersonHref(params);
  const personTableRows: PersonenTableRow[] = people.map((person, index) => ({
    classLabel: currentClassByPersonId.get(person.id) ?? null,
    detailHref: buildDetailHref(person.id, currentListHref),
    editHref: buildEditHref(person.id, currentListHref),
    email: person.email,
    id: person.id,
    jahrgang: person.jahrgang,
    name: formatName(person),
    personType: person.person_type,
    position: displayedFrom + index,
    status: person.status,
  }));

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/">
              iPad-Verwaltung 2.0
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Personen und Klassen
            </h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="personen" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Personen gesamt</p>
            <p className="mt-2 text-2xl font-semibold">{peopleCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aktive Personen</p>
            <p className="mt-2 text-2xl font-semibold">{activePeopleCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aktive Schueler</p>
            <p className="mt-2 text-2xl font-semibold">{studentsCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aktive Lehrpersonen</p>
            <p className="mt-2 text-2xl font-semibold">
              {activeTeachingPeopleCount}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h2 className="font-semibold">Personen</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {hasActiveFilters
                  ? `${displayedFrom}-${displayedTo} von ${filteredPeopleCount} Treffern angezeigt.`
                  : `${displayedFrom}-${displayedTo} von ${peopleCount} Personen angezeigt, alphabetisch sortiert.`}
              </p>
            </div>
            {canEditPeople ? (
              isCreatingPerson ? (
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={currentListHref}
                >
                  Abbrechen
                </Link>
              ) : (
                <Link
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  href={newPersonHref}
                >
                  Neue Person
                </Link>
              )
            ) : null}
          </div>

          {error === "missing_required" ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              Bitte mindestens Vorname oder Nachname sowie Typ und Status ausfuellen.
            </div>
          ) : null}

          {isCreatingPerson && canEditPeople ? (
            <form action={createPerson} className="grid gap-4 border-b border-zinc-200 px-4 py-4">
              <input name="return_to" type="hidden" value={newPersonHref} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Nachname
                  <input className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" name="last_name" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Vorname
                  <input className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" name="first_name" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  E-Mail
                  <input className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" name="email" type="email" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Typ
                  <select className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" defaultValue="schueler" name="person_type">
                    <option value="schueler">Schueler</option>
                    <option value="lehrer">Lehrer</option>
                    <option value="mitarbeiter">Mitarbeiter</option>
                    <option value="referendar">Referendar</option>
                    <option value="praktikant">Praktikant</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Status
                  <select className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" defaultValue="aktiv" name="status">
                    <option value="aktiv">Aktiv</option>
                    <option value="ausgeschieden">Ausgeschieden</option>
                    <option value="verstorben">Verstorben</option>
                    <option value="dublette">Dublette</option>
                    <option value="test">Test</option>
                    <option value="unklar">Unklar</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Jahrgang
                  <input className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" max="2100" min="2000" name="jahrgang" type="number" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Anmerkung
                <textarea className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2" name="notes" />
              </label>
              <div>
                <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Person anlegen
                </button>
              </div>
            </form>
          ) : null}

          <form className="grid gap-3 border-b border-zinc-200 px-4 py-4 md:grid-cols-[minmax(180px,1fr)_160px_160px_180px_auto]">
            <input name="page" type="hidden" value="1" />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Suche
              <input
                className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                defaultValue={query}
                name="q"
                placeholder="Name oder E-Mail"
                type="search"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium">
              Typ
              <select
                className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                defaultValue={typeFilter}
                name="type"
              >
                <option value="">Alle</option>
                <option value="schueler">Schueler</option>
                <option value="lehrer">Lehrer</option>
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="referendar">Referendar</option>
                <option value="praktikant">Praktikant</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium">
              Status
              <select
                className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                defaultValue={statusFilter}
                name="status"
              >
                <option value="">Alle</option>
                <option value="aktiv">Aktiv</option>
                <option value="ausgeschieden">Ausgeschieden</option>
                <option value="verstorben">Verstorben</option>
                <option value="dublette">Dublette</option>
                <option value="test">Test</option>
                <option value="unklar">Unklar</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium">
              Klasse
              <select
                className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                defaultValue={classFilter}
                name="class"
              >
                <option value="">Alle</option>
                {classOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                Filtern
              </button>
              {hasActiveFilters ? (
                <Link
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href="/personen"
                >
                  Zuruecksetzen
                </Link>
              ) : null}
            </div>
          </form>

          {people.length > 0 ? (
            <PersonenTable canEdit={canEditPeople} rows={personTableRows} />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Noch keine Personen vorhanden. Der naechste Schritt ist der
              Import aus der bisherigen SQLite-Datenbank.
            </div>
          )}

          {filteredPeopleCount > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm">
              <p className="text-zinc-600">
                Seite {currentPage} von {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    className="rounded-md border border-zinc-300 px-3 py-2 font-medium transition hover:bg-zinc-50"
                    href={buildPageHref(params, currentPage - 1)}
                  >
                    Zurueck
                  </Link>
                ) : (
                  <span className="rounded-md border border-zinc-200 px-3 py-2 font-medium text-zinc-400">
                    Zurueck
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link
                    className="rounded-md border border-zinc-300 px-3 py-2 font-medium transition hover:bg-zinc-50"
                    href={buildPageHref(params, currentPage + 1)}
                  >
                    Weiter
                  </Link>
                ) : (
                  <span className="rounded-md border border-zinc-200 px-3 py-2 font-medium text-zinc-400">
                    Weiter
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="font-semibold">Schuljahre</h2>
            </div>
            {schoolYears.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {schoolYears.map((schoolYear) => (
                  <div
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    key={schoolYear.id}
                  >
                    <div>
                      <p className="font-medium">{schoolYear.label}</p>
                      <p className="text-zinc-500">
                        {schoolYear.start_date} bis {schoolYear.end_date}
                      </p>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium">
                      {schoolYear.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-zinc-600">
                Noch keine Schuljahre angelegt.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="font-semibold">Klassen und Jahrgangsgruppen</h2>
            </div>
            {schoolClasses.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {schoolClasses.map((schoolClass) => (
                  <div className="px-4 py-3 text-sm" key={schoolClass.id}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium">{schoolClass.label}</p>
                      <span className="text-zinc-500">
                        {activeStudentCountByClass.get(schoolClass.label) ?? 0}{" "}
                        aktive Schueler
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-500">
                      {schoolClass.school_year?.label ?? "ohne Schuljahr"} ·
                      Klasse {schoolClass.grade_level ?? "-"}, Jahrgang{" "}
                      {schoolClass.jahrgang ?? "-"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-zinc-600">
                Noch keine Klassen angelegt.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
