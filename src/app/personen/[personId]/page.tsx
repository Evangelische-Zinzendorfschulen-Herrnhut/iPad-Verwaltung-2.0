import { conditionLabel } from "@/lib/condition";
import Link from "next/link";

import {
  ObjectLinkIcon,
  objectLinkIconClassName,
} from "../../object-link-icon";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/app/section-tabs";

export const metadata: Metadata = {
  title: "Personendetail | iPad-Verwaltung",
};

type PersonDetailPageProps = {
  params: Promise<{
    personId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PersonRow = {
  created_at: string;
  email: string | null;
  first_name: string | null;
  id: string;
  import_hint: string | null;
  jahrgang: number | null;
  last_name: string | null;
  legacy_user_id: number | null;
  notes: string | null;
  person_type: string;
  status: string;
  updated_at: string;
};

type ClassAssignmentRow = {
  id: string;
  valid_from: string;
  valid_until: string | null;
  source: string;
  note: string | null;
  school_class: {
    grade_level: number | null;
    jahrgang: number | null;
    label: string;
    school_year: {
      label: string;
      status: string;
    } | null;
  } | null;
};

type RawClassAssignmentRow = Omit<ClassAssignmentRow, "school_class"> & {
  school_class:
    | (Omit<NonNullable<ClassAssignmentRow["school_class"]>, "school_year"> & {
        school_year:
          | NonNullable<ClassAssignmentRow["school_class"]>["school_year"]
          | NonNullable<ClassAssignmentRow["school_class"]>["school_year"][]
          | null;
      })
    | (Omit<NonNullable<ClassAssignmentRow["school_class"]>, "school_year"> & {
        school_year:
          | NonNullable<ClassAssignmentRow["school_class"]>["school_year"]
          | NonNullable<ClassAssignmentRow["school_class"]>["school_year"][]
          | null;
      })[]
    | null;
};

type SetAssignmentRow = {
  id: string;
  issued_at: string | null;
  returned_at: string | null;
  legacy_status: string | null;
  issue_note: string | null;
  return_note: string | null;
  inventory_set: {
    availability: string;
    condition: string;
    id: string;
    legacy_set_id: number;
    storage_label: string | null;
  } | null;
};

type RawSetAssignmentRow = Omit<SetAssignmentRow, "inventory_set"> & {
  inventory_set:
    | SetAssignmentRow["inventory_set"]
    | SetAssignmentRow["inventory_set"][]
    | null;
};

type DamageCaseRow = {
  affected_item: string;
  billing_assessment: string;
  case_type: string;
  damage_number: number;
  id: string;
  legacy_insurance_warranty: string | null;
  occurred_at: string | null;
  reported_at: string;
  short_description: string;
  status: string;
  inventory_set: {
    id: string;
    legacy_set_id: number;
  } | null;
  component: {
    legacy_inventory_number: string;
    model: string | null;
  } | null;
};

type RawDamageCaseRow = Omit<DamageCaseRow, "component" | "inventory_set"> & {
  component: DamageCaseRow["component"] | DamageCaseRow["component"][] | null;
  inventory_set:
    | DamageCaseRow["inventory_set"]
    | DamageCaseRow["inventory_set"][]
    | null;
};

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

function normalizeJoin<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatName(person: PersonRow) {
  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "Ohne Namen";
}

function personFilterQuery(person: PersonRow) {
  return person.email || person.last_name || person.first_name || "";
}

function filteredListHref(pathname: "/schadensfaelle" | "/sets", person: PersonRow) {
  const query = personFilterQuery(person).trim();

  if (!query) {
    return pathname;
  }

  const params = new URLSearchParams({ q: query });
  return `${pathname}?${params.toString()}`;
}

function setDetailHref(set: { id: string; legacy_set_id: number }) {
  const params = new URLSearchParams({
    detail: set.id,
    setId: String(set.legacy_set_id),
  });

  return `/sets?${params.toString()}`;
}

function personTypeLabel(value: string) {
  const labels: Record<string, string> = {
    lehrer: "Lehrer",
    mitarbeiter: "Mitarbeiter",
    praktikant: "Praktikant",
    referendar: "Referendar",
    schueler: "Schueler",
  };

  return labels[value] ?? value;
}

function caseTypeLabel(value: string) {
  const labels: Record<string, string> = {
    schaden: "Schaden",
    technisches_problem: "Technisches Problem",
    verlust: "Verlust",
  };

  return labels[value] ?? value;
}

function affectedItemLabel(value: string) {
  const labels: Record<string, string> = {
    adapter: "Adapter",
    charging_cable: "Kabel",
    hdmi_cable: "HDMI-Kabel",
    ipad: "iPad",
    keyboard: "Tastatur",
    magic_mouse: "Magic-Maus",
    other: "Sonstiges",
    pencil: "Pencil",
    pencil_cap: "Pencil-Kappe",
    power_adapter: "Netzteil",
    set: "Ganzes Set",
  };

  return labels[value] ?? value;
}

function componentLabel(component: DamageCaseRow["component"]) {
  if (!component) {
    return "-";
  }

  return component.model
    ? `${component.legacy_inventory_number} · ${component.model}`
    : component.legacy_inventory_number;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: number | string | null | undefined;
}) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}

export default async function PersonDetailPage({
  params,
  searchParams,
}: PersonDetailPageProps) {
  const [{ personId }, queryParams] = await Promise.all([params, searchParams]);
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const [
    personResult,
    classAssignmentsResult,
    setAssignmentsResult,
    damageCasesResult,
  ] =
    await Promise.all([
      supabase
        .from("person")
        .select(
          "id,legacy_user_id,first_name,last_name,email,person_type,status,jahrgang,notes,import_hint,created_at,updated_at",
        )
        .eq("id", personId)
        .maybeSingle(),
      supabase
        .from("person_class_assignment")
        .select(
          "id,valid_from,valid_until,source,note,school_class:school_class_id(label,grade_level,jahrgang,school_year:school_year_id(label,status))",
        )
        .eq("person_id", personId)
        .order("valid_until", { ascending: false, nullsFirst: true })
        .order("valid_from", { ascending: false })
        .limit(10),
      supabase
        .from("set_person_assignment")
        .select(
          "id,issued_at,returned_at,legacy_status,issue_note,return_note,inventory_set:set_id(id,legacy_set_id,availability,condition,storage_label)",
        )
        .eq("person_id", personId)
        .order("returned_at", { ascending: false, nullsFirst: true })
        .order("issued_at", { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from("damage_case")
        .select(
          "id,damage_number,case_type,affected_item,status,reported_at,occurred_at,short_description,billing_assessment,legacy_insurance_warranty,inventory_set:set_id(id,legacy_set_id),component:component_id(legacy_inventory_number,model)",
        )
        .eq("person_id", personId)
        .order("damage_number", { ascending: false }),
    ]);

  if (personResult.error) {
    throw personResult.error;
  }

  if (classAssignmentsResult.error) {
    throw classAssignmentsResult.error;
  }

  if (setAssignmentsResult.error) {
    throw setAssignmentsResult.error;
  }

  if (damageCasesResult.error) {
    throw damageCasesResult.error;
  }

  if (!personResult.data) {
    notFound();
  }

  const person = personResult.data as PersonRow;
  const classAssignments = (
    (classAssignmentsResult.data ?? []) as unknown as RawClassAssignmentRow[]
  ).map((assignment) => {
    const schoolClass = normalizeJoin(assignment.school_class);

    return {
      ...assignment,
      school_class: schoolClass
        ? {
            ...schoolClass,
            school_year: normalizeJoin(schoolClass.school_year),
          }
        : null,
    };
  });
  const setAssignments = ((setAssignmentsResult.data ?? []) as RawSetAssignmentRow[])
    .map((assignment) => ({
      ...assignment,
      inventory_set: normalizeJoin(assignment.inventory_set),
    }));
  const damageCases = (
    (damageCasesResult.data ?? []) as unknown as RawDamageCaseRow[]
  ).map((damageCase) => ({
    ...damageCase,
    component: normalizeJoin(damageCase.component),
    inventory_set: normalizeJoin(damageCase.inventory_set),
  }));
  const currentClass = classAssignments.find(
    (assignment) => assignment.valid_until === null,
  );
  const returnTo = getSingleParam(queryParams, "returnTo") || "/personen";
  const filteredSetsHref = filteredListHref("/sets", person);
  const filteredDamageCasesHref = filteredListHref("/schadensfaelle", person);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href={returnTo}>
              Zur Personenliste
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {formatName(person)}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {personTypeLabel(person.person_type)} · {person.status}
            </p>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="personen" />

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Stammdaten</h2>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nachname" value={person.last_name} />
            <Field label="Vorname" value={person.first_name} />
            <Field label="E-Mail" value={person.email} />
            <Field label="Legacy User-ID" value={person.legacy_user_id} />
            <Field label="Typ" value={personTypeLabel(person.person_type)} />
            <Field label="Status" value={person.status} />
            <Field label="Jahrgang" value={person.jahrgang} />
            <Field
              label="Aktuelle Klasse"
              value={currentClass?.school_class?.label}
            />
          </div>
          {person.notes || person.import_hint ? (
            <div className="grid gap-3 border-t border-zinc-100 p-4 lg:grid-cols-2">
              <Field label="Anmerkung" value={person.notes} />
              <Field label="Importhinweis" value={person.import_hint} />
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Klasse</h2>
          </div>
          {classAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Klasse</th>
                    <th className="px-4 py-3 font-medium">Schuljahr</th>
                    <th className="px-4 py-3 font-medium">Von</th>
                    <th className="px-4 py-3 font-medium">Bis</th>
                    <th className="px-4 py-3 font-medium">Quelle</th>
                    <th className="px-4 py-3 font-medium">Hinweis</th>
                  </tr>
                </thead>
                <tbody>
                  {classAssignments.map((assignment) => (
                    <tr className="border-t border-zinc-100" key={assignment.id}>
                      <td className="px-4 py-3 font-medium">
                        {assignment.school_class?.label ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.school_class?.school_year?.label ?? "-"}
                      </td>
                      <td className="px-4 py-3">{assignment.valid_from}</td>
                      <td className="px-4 py-3">
                        {assignment.valid_until ?? "aktuell"}
                      </td>
                      <td className="px-4 py-3">{assignment.source}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {assignment.note ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Klassenzuordnung vorhanden.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Set-Zuordnungen</h2>
            <Link
              className="text-sm font-semibold text-emerald-700 hover:underline"
              href={filteredSetsHref}
            >
              In der Setliste anzeigen
            </Link>
          </div>
          {setAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Set</th>
                    <th className="px-4 py-3 font-medium">Ausgabe</th>
                    <th className="px-4 py-3 font-medium">Rueckgabe</th>
                    <th className="px-4 py-3 font-medium">Verfuegbarkeit</th>
                    <th className="px-4 py-3 font-medium">Zustand</th>
                    <th className="px-4 py-3 font-medium">Lagerort</th>
                    <th className="px-4 py-3 font-medium">Legacy</th>
                  </tr>
                </thead>
                <tbody>
                  {setAssignments.map((assignment) => (
                    <tr className="border-t border-zinc-100" key={assignment.id}>
                      <td className="px-4 py-3 font-semibold">
                        {assignment.inventory_set ? (
                          <span className="inline-flex items-center gap-2 align-middle">
                            <Link
                              aria-label={`Set ${assignment.inventory_set.legacy_set_id} in der Setliste anzeigen`}
                              className={objectLinkIconClassName("set")}
                              href={setDetailHref(assignment.inventory_set)}
                              title="Set in Setliste anzeigen"
                            >
                              <ObjectLinkIcon kind="set" />
                            </Link>
                            <Link
                              className="hover:underline"
                              href={setDetailHref(assignment.inventory_set)}
                            >
                              Set {assignment.inventory_set.legacy_set_id}
                            </Link>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">{assignment.issued_at ?? "-"}</td>
                      <td className="px-4 py-3">
                        {assignment.returned_at ?? "aktiv"}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.inventory_set?.availability ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {conditionLabel(assignment.inventory_set?.condition)}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.inventory_set?.storage_label ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {assignment.legacy_status ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Set-Zuordnungen vorhanden.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Schadensfälle</h2>
            <Link
              className="text-sm font-semibold text-emerald-700 hover:underline"
              href={filteredDamageCasesHref}
            >
              In der Schadensliste anzeigen
            </Link>
          </div>
          {damageCases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nr.</th>
                    <th className="px-4 py-3 font-medium">Meldedatum</th>
                    <th className="px-4 py-3 font-medium">Art</th>
                    <th className="px-4 py-3 font-medium">Betroffen</th>
                    <th className="px-4 py-3 font-medium">Set</th>
                    <th className="px-4 py-3 font-medium">Komponente</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Haftung</th>
                    <th className="px-4 py-3 font-medium">Beschreibung</th>
                  </tr>
                </thead>
                <tbody>
                  {damageCases.map((damageCase) => (
                    <tr className="border-t border-zinc-100" key={damageCase.id}>
                      <td className="px-4 py-3 font-semibold">
                        <span className="inline-flex items-center gap-2 align-middle">
                          <Link
                            aria-label={`Schadensfall ${damageCase.damage_number} anzeigen`}
                            className={objectLinkIconClassName("damage")}
                            href={`/schadensfaelle?detail=${damageCase.id}`}
                            title="Schadensfall anzeigen"
                          >
                            <ObjectLinkIcon kind="damage" />
                          </Link>
                          <Link
                            className="hover:underline"
                            href={`/schadensfaelle?detail=${damageCase.id}`}
                          >
                            {damageCase.damage_number}
                          </Link>
                        </span>
                      </td>
                      <td className="px-4 py-3">{damageCase.reported_at}</td>
                      <td className="px-4 py-3">
                        {caseTypeLabel(damageCase.case_type)}
                      </td>
                      <td className="px-4 py-3">
                        {affectedItemLabel(damageCase.affected_item)}
                      </td>
                      <td className="px-4 py-3">
                        {damageCase.inventory_set ? (
                          <span className="inline-flex items-center gap-2 align-middle">
                            <Link
                              aria-label={`Set ${damageCase.inventory_set.legacy_set_id} in der Setliste anzeigen`}
                              className={objectLinkIconClassName("set")}
                              href={setDetailHref(damageCase.inventory_set)}
                              title="Set in Setliste anzeigen"
                            >
                              <ObjectLinkIcon kind="set" />
                            </Link>
                            <Link
                              className="hover:underline"
                              href={setDetailHref(damageCase.inventory_set)}
                            >
                              Set {damageCase.inventory_set.legacy_set_id}
                            </Link>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="inventory-number px-4 py-3">
                        {componentLabel(damageCase.component)}
                      </td>
                      <td className="px-4 py-3">{damageCase.status}</td>
                      <td className="px-4 py-3">
                        {damageCase.legacy_insurance_warranty || "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {damageCase.short_description}
                        {damageCase.occurred_at ? (
                          <span className="mt-1 block text-xs">
                            Ereignis: {damageCase.occurred_at}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Schadensfälle zu dieser Person vorhanden.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
