import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Start | iPad-Verwaltung",
};

const foundations = [
  { label: "Personen und Klassen", href: "/personen" },
  { label: "Sets und Komponenten", href: "/sets" },
  { label: "Geräteliste", href: "/geraete" },
  { label: "Schadensfälle", href: "/schadensfaelle" },
  { label: "Aus- und Rückgabeliste", href: "/ausgaben" },
  { label: "Legacy-Import", href: null },
];

type DashboardSlice = {
  color: string;
  label: string;
  value: number;
};

type DashboardChart = {
  href: string;
  slices: DashboardSlice[];
  title: string;
  totalLabel: string;
};

type DashboardSetRow = {
  availability: string;
  assigned_person: DashboardPerson | DashboardPerson[] | null;
  id: string;
};

type DashboardPerson = {
  id: string;
  person_type: string;
};

type DashboardAssignmentRow = {
  person: DashboardPerson | DashboardPerson[] | null;
  set_id: string;
};

type DashboardClassAssignmentRow = {
  person_id: string;
  school_class: {
    grade_level: number | null;
  } | {
    grade_level: number | null;
  }[] | null;
};

const CHART_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0f766e",
];

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const rawValue = row[key];
    const value =
      typeof rawValue === "string" && rawValue.trim() ? rawValue : "unbekannt";

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([label, value], index) => ({
      color: CHART_COLORS[index % CHART_COLORS.length],
      label,
      value,
    }));
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue.trim() || "unbekannt";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([label, value], index) => ({
      color: CHART_COLORS[index % CHART_COLORS.length],
      label,
      value,
    }));
}

function normalizeJoined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function chunkValues<T>(values: T[], size = 100) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function deriveSetAvailability(
  set: DashboardSetRow,
  person: DashboardPerson | null,
  schoolClass?: { grade_level: number | null } | null,
) {
  if (!person) {
    return set.availability;
  }

  if (person.person_type === "schueler") {
    return schoolClass?.grade_level && schoolClass.grade_level <= 6
      ? "zugeordnet"
      : "ausgegeben";
  }

  return "ausgegeben";
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    abgeschlossen: "Abgeschlossen",
    aktiv: "Aktiv",
    ausgegeben: "Ausgegeben",
    ausgeschieden: "Ausgeschieden",
    bericht_erzeugt: "Bericht erzeugt",
    bericht_unterschrieben: "Bericht unterschrieben",
    defekt: "Defekt",
    frei: "Frei",
    in_bearbeitung: "In Bearbeitung",
    lehrer: "Lehrer",
    mitarbeiter: "Mitarbeiter",
    offen: "Offen",
    praktikant: "Praktikant",
    referendar: "Referendar",
    reserviert: "Reserviert",
    schueler: "Schueler",
    storniert: "Storniert",
    unbekannt: "Unbekannt",
    zugeordnet: "Zugeordnet",
  };

  return labels[value] ?? value;
}

function buildPieBackground(slices: DashboardSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return "#e4e4e7";
  }

  let cursor = 0;
  const parts = slices.map((slice) => {
    const start = cursor;
    const end = cursor + (slice.value / total) * 100;
    cursor = end;

    return `${slice.color} ${start}% ${end}%`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

function PieChartCard({ chart }: { chart: DashboardChart }) {
  const total = chart.slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Link
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
      href={chart.href}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">{chart.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{chart.totalLabel}</p>
        </div>
        <div
          aria-label={`${chart.title}: ${total} Eintraege`}
          className="grid size-24 shrink-0 place-items-center rounded-full"
          role="img"
          style={{ background: buildPieBackground(chart.slices) }}
        >
          <div className="grid size-14 place-items-center rounded-full bg-white text-sm font-semibold shadow-sm">
            {total}
          </div>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        {chart.slices.length > 0 ? (
          chart.slices.slice(0, 5).map((slice) => (
            <div className="flex items-center justify-between gap-3" key={slice.label}>
              <dt className="flex min-w-0 items-center gap-2 text-zinc-600">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate">{slice.label}</span>
              </dt>
              <dd className="font-medium">{slice.value}</dd>
            </div>
          ))
        ) : (
          <div className="text-zinc-500">Noch keine Daten vorhanden</div>
        )}
      </dl>
    </Link>
  );
}

async function getDashboardCharts(appUser: Awaited<ReturnType<typeof getCurrentAppUser>>) {
  if (!appUser) {
    return [];
  }

  const canSeeDashboard = appUser.roles.some((role) =>
    ["admin", "ipad_verwaltung", "buchhaltung", "readonly"].includes(role),
  );

  if (!canSeeDashboard) {
    return [];
  }

  const supabase = await createClient();
  const [setsResult, peopleResult, damageCasesResult] =
    await Promise.all([
      supabase
        .from("inventory_set")
        .select("id,availability,assigned_person:assigned_person_id(id,person_type)")
        .limit(10000),
      supabase
        .from("person")
        .select("person_type")
        .eq("status", "aktiv")
        .limit(10000),
      supabase.from("damage_case").select("status").limit(10000),
    ]);

  if (
    setsResult.error ||
    peopleResult.error ||
    damageCasesResult.error
  ) {
    throw (
      setsResult.error ??
      peopleResult.error ??
      damageCasesResult.error
    );
  }

  const sets = (setsResult.data ?? []) as DashboardSetRow[];
  const setIds = sets.map((set) => set.id);
  const currentAssignments: DashboardAssignmentRow[] = [];

  for (const setIdBatch of chunkValues(setIds)) {
    const { data, error } = await supabase
      .from("set_person_assignment")
      .select("set_id,person:person_id(id,person_type)")
      .is("returned_at", null)
      .in("set_id", setIdBatch);

    if (error) {
      throw error;
    }

    currentAssignments.push(...((data ?? []) as DashboardAssignmentRow[]));
  }

  const personBySetId = new Map<string, DashboardPerson | null>();

  for (const assignment of currentAssignments) {
    personBySetId.set(assignment.set_id, normalizeJoined(assignment.person));
  }

  for (const set of sets) {
    if (!personBySetId.has(set.id)) {
      personBySetId.set(set.id, normalizeJoined(set.assigned_person));
    }
  }

  const visiblePersonIds = [
    ...new Set(
      [...personBySetId.values()]
        .map((person) => person?.id)
      .filter((id): id is string => Boolean(id)),
    ),
  ];
  const classAssignments: DashboardClassAssignmentRow[] = [];

  const classByPersonId = new Map<string, { grade_level: number | null } | null>();

  for (const personIdBatch of chunkValues(visiblePersonIds)) {
    const { data, error } = await supabase
      .from("person_class_assignment")
      .select("person_id,school_class:school_class_id(grade_level)")
      .is("valid_until", null)
      .in("person_id", personIdBatch);

    if (error) {
      throw error;
    }

    classAssignments.push(...((data ?? []) as DashboardClassAssignmentRow[]));
  }

  for (const assignment of classAssignments) {
    classByPersonId.set(
      assignment.person_id,
      normalizeJoined(assignment.school_class),
    );
  }

  const setAvailabilityValues = sets.map((set) => {
    const person = personBySetId.get(set.id) ?? null;
    const schoolClass = person ? classByPersonId.get(person.id) : undefined;

    return deriveSetAvailability(set, person, schoolClass);
  });
  const setSlices = countValues(setAvailabilityValues).map((slice) => ({
    ...slice,
    label: formatStatus(slice.label),
  }));
  const personSlices = countBy(peopleResult.data ?? [], "person_type").map((slice) => ({
    ...slice,
    label: formatStatus(slice.label),
  }));
  const damageCaseSlices = countBy(damageCasesResult.data ?? [], "status").map(
    (slice) => ({
      ...slice,
      label: formatStatus(slice.label),
    }),
  );

  return [
    {
      href: "/sets",
      slices: setSlices,
      title: "Sets nach Verfügbarkeit",
      totalLabel: `${setsResult.data?.length ?? 0} Sets`,
    },
    {
      href: "/schadensfaelle",
      slices: damageCaseSlices,
      title: "Schadensfälle nach Status",
      totalLabel: `${damageCasesResult.data?.length ?? 0} Fälle`,
    },
    {
      href: "/personen?status=aktiv",
      slices: personSlices,
      title: "Aktive Personen nach Typ",
      totalLabel: `${peopleResult.data?.length ?? 0} aktive Personen`,
    },
  ];
}

export default async function Home() {
  const appUser = await getCurrentAppUser();
  const dashboardCharts = await getDashboardCharts(appUser);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            iPad-Verwaltung 2.0
          </p>
          {appUser ? (
            <form action="/auth/sign-out" method="post">
              <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
                Abmelden
              </button>
            </form>
          ) : (
            <Link
              className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              href="/login"
            >
              Anmelden
            </Link>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center">
        <div className="mt-4 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            iPad-Verwaltung EZSH
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Die zentrale Arbeitsoberfläche für iPad-Sets: Bestände im Blick,
            Ausgaben und Rückgaben sauber dokumentiert, Schadensfälle
            nachvollziehbar gesteuert.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {appUser ? (
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Angemeldet als
              </p>
              <p className="mt-1 text-lg font-semibold">{appUser.email}</p>
              <p className="mt-2 text-sm text-zinc-600">
                Rollen:{" "}
                {appUser.roles.length > 0 ? appUser.roles.join(", ") : "keine"}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Nicht angemeldet
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Melde dich an, um die Rollen- und Datenbankanbindung zu pruefen.
              </p>
            </div>
          )}
        </div>

        {dashboardCharts.length > 0 ? (
          <section className="mt-6 grid gap-3 lg:grid-cols-2">
            {dashboardCharts.map((chart) => (
              <PieChartCard chart={chart} key={chart.title} />
            ))}
          </section>
        ) : null}

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {foundations.map((item) => (
            item.href ? (
              <Link
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
                href={item.href}
                key={item.label}
              >
                <p className="font-medium">{item.label}</p>
              </Link>
            ) : (
              <div
                key={item.label}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium">{item.label}</p>
              </div>
            )
          ))}
        </div>
        </div>
      </section>
    </main>
  );
}
