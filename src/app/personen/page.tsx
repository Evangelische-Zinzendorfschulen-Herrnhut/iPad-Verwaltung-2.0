import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";

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
  const page = getPageParam(params);
  const rangeStart = (page - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE - 1;
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  let peopleQuery = supabase
    .from("person")
    .select("id,first_name,last_name,email,person_type,status,jahrgang,notes", {
      count: "exact",
    });

  if (query) {
    const escapedQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
    peopleQuery = peopleQuery.or(
      `first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`,
    );
  }

  if (typeFilter) {
    peopleQuery = peopleQuery.eq("person_type", typeFilter);
  }

  if (statusFilter) {
    peopleQuery = peopleQuery.eq("status", statusFilter);
  }

  const { data: classAssignmentData } = await supabase
    .from("person_class_assignment")
    .select("person_id,school_class:school_class_id(label)")
    .is("valid_until", null)
    .limit(1000);
  const visibleClassAssignments = (classAssignmentData ?? []) as {
    person_id: string;
    school_class:
      | PersonClassAssignmentRow["school_class"]
      | PersonClassAssignmentRow["school_class"][];
  }[];
  const classPersonIds = new Set(
    classFilter
      ? visibleClassAssignments
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
      .select("id,label,grade_level,jahrgang,track,is_upper_school,school_year:school_year_id(label,status)")
      .order("grade_level", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true })
      .limit(40),
  ]);

  const people = (peopleResult.data ?? []) as PersonRow[];
  const currentClassByPersonId = new Map(
    visibleClassAssignments.map((assignment) => {
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
  const schoolClasses = ((classesResult.data ?? []) as RawSchoolClassRow[]).map(
    (schoolClass) => ({
      ...schoolClass,
      school_year: Array.isArray(schoolClass.school_year)
        ? (schoolClass.school_year[0] ?? null)
        : schoolClass.school_year,
    }),
  );
  const classOptions = schoolClasses.map((schoolClass) => schoolClass.label);
  const activeStudentCountByClass = new Map<string, number>();

  for (const assignment of visibleClassAssignments) {
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
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Personen</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? `${displayedFrom}-${displayedTo} von ${filteredPeopleCount} Treffern angezeigt.`
                : `${displayedFrom}-${displayedTo} von ${peopleCount} Personen angezeigt, alphabetisch sortiert.`}
            </p>
          </div>

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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Klasse</th>
                    <th className="px-4 py-3 font-medium">Typ</th>
                    <th className="px-4 py-3 font-medium">E-Mail</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Jahrgang</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => (
                    <tr className="border-t border-zinc-100" key={person.id}>
                      <td className="px-4 py-3 font-medium">
                        {formatName(person)}
                      </td>
                      <td className="px-4 py-3">
                        {currentClassByPersonId.get(person.id) ?? "-"}
                      </td>
                      <td className="px-4 py-3">{person.person_type}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {person.email ?? "-"}
                      </td>
                      <td className="px-4 py-3">{person.status}</td>
                      <td className="px-4 py-3">{person.jahrgang ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
