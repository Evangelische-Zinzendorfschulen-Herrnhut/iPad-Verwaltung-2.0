import Link from "next/link";

import { getCurrentAppUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const foundations = [
  { label: "Personen und Klassen", href: "/personen" },
  { label: "Komponenten und Sets", href: "/sets" },
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

function formatCategory(value: string) {
  const labels: Record<string, string> = {
    adapter: "Adapter",
    charging_cable: "Kabel",
    hdmi_cable: "HDMI-Kabel",
    ipad: "iPad",
    keyboard: "Tastatur",
    magic_mouse: "Magic-Maus",
    mouse: "Magic-Maus",
    other: "Sonstiges",
    pencil: "Pencil",
    power_adapter: "Netzteil",
  };

  return labels[value] ?? value;
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
  const [setsResult, componentsResult, peopleResult, damageCasesResult] =
    await Promise.all([
      supabase.from("inventory_set").select("availability").limit(10000),
      supabase.from("inventory_component").select("category").limit(10000),
      supabase.from("person").select("person_type").limit(10000),
      supabase.from("damage_case").select("status").limit(10000),
    ]);

  if (
    setsResult.error ||
    componentsResult.error ||
    peopleResult.error ||
    damageCasesResult.error
  ) {
    throw (
      setsResult.error ??
      componentsResult.error ??
      peopleResult.error ??
      damageCasesResult.error
    );
  }

  const setSlices = countBy(setsResult.data ?? [], "availability").map((slice) => ({
    ...slice,
    label: formatStatus(slice.label),
  }));
  const componentSlices = countBy(componentsResult.data ?? [], "category").map(
    (slice) => ({
      ...slice,
      label: formatCategory(slice.label),
    }),
  );
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
      href: "/geraete",
      slices: componentSlices,
      title: "Komponenten nach Kategorie",
      totalLabel: `${componentsResult.data?.length ?? 0} Komponenten`,
    },
    {
      href: "/personen",
      slices: personSlices,
      title: "Personen nach Typ",
      totalLabel: `${peopleResult.data?.length ?? 0} Personen`,
    },
    {
      href: "/schadensfaelle",
      slices: damageCaseSlices,
      title: "Schadensfälle nach Status",
      totalLabel: `${damageCasesResult.data?.length ?? 0} Fälle`,
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
            Arbeitsoberflaeche fuer iPad-Sets
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Das Projektgrundgeruest steht. Supabase Auth, App-Rollen und die
            erste Admin-Anmeldung sind angebunden.
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
