import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { DamageCasesTable } from "./damage-cases-table";
import { DamageCasesFilterForm } from "./damage-cases-filter-form";
import { FieldIcon } from "./field-icon";

type DamageCaseRow = {
  id: string;
  damage_number: number;
  legacy_damage_id: number | null;
  case_type: string;
  affected_item: string;
  status: string;
  legacy_status: string | null;
  legacy_exchange_status: string | null;
  legacy_insurance_warranty: string | null;
  reported_at: string;
  occurred_at: string | null;
  short_description: string;
  billing_assessment: string;
  import_hint: string | null;
  person: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    id?: string;
    person_type?: string;
  } | null;
  inventory_set: {
    legacy_set_id: number;
    storage_label: string | null;
  } | null;
  component: {
    legacy_inventory_number: string;
    model: string | null;
  } | null;
  replacement_component: {
    legacy_inventory_number: string;
    model?: string | null;
  } | null;
};

type RawDamageCaseRow = Omit<
  DamageCaseRow,
  "component" | "inventory_set" | "person" | "replacement_component"
> & {
  component: DamageCaseRow["component"] | DamageCaseRow["component"][];
  inventory_set:
    | DamageCaseRow["inventory_set"]
    | DamageCaseRow["inventory_set"][];
  person: DamageCaseRow["person"] | DamageCaseRow["person"][];
  replacement_component:
    | DamageCaseRow["replacement_component"]
    | DamageCaseRow["replacement_component"][];
};

type DamageCaseDetail = DamageCaseRow & {
  affected_components_raw: string | null;
  created_at: string;
  detail_description: string | null;
  handler: string | null;
  import_status: string | null;
  incident_description: string | null;
  internal_note: string | null;
  legacy_source: string | null;
  legacy_source_id: string | null;
  location: string | null;
  replacement_issued_at: string | null;
  updated_at: string;
  witnesses: string | null;
  created_by_user: {
    email: string;
  } | null;
  replacement_set: {
    legacy_set_id: number;
  } | null;
};

type RawDamageCaseDetail = Omit<
  DamageCaseDetail,
  | "component"
  | "created_by_user"
  | "inventory_set"
  | "person"
  | "replacement_component"
  | "replacement_set"
> & {
  component: DamageCaseDetail["component"] | DamageCaseDetail["component"][];
  created_by_user:
    | DamageCaseDetail["created_by_user"]
    | DamageCaseDetail["created_by_user"][];
  inventory_set:
    | DamageCaseDetail["inventory_set"]
    | DamageCaseDetail["inventory_set"][];
  person: DamageCaseDetail["person"] | DamageCaseDetail["person"][];
  replacement_component:
    | DamageCaseDetail["replacement_component"]
    | DamageCaseDetail["replacement_component"][];
  replacement_set:
    | DamageCaseDetail["replacement_set"]
    | DamageCaseDetail["replacement_set"][];
};

const PAGE_SIZE = 50;

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

  for (const key of ["q", "status", "type", "billing"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `/schadensfaelle?${queryString}` : "/schadensfaelle";
}

function buildCloseDetailHref(params: Record<string, string | string[] | undefined>) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "type", "billing", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/schadensfaelle?${queryString}` : "/schadensfaelle";
}

function buildEditHref(
  params: Record<string, string | string[] | undefined>,
  id: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "type", "billing", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("edit", id);

  return `/schadensfaelle?${nextParams.toString()}`;
}

function appendFlagToHref(href: string, key: string, value: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${key}=${value}`;
}

function nullableText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function updateDamageCase(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/schadensfaelle");
  const caseType = String(formData.get("case_type") ?? "");
  const affectedItem = String(formData.get("affected_item") ?? "");
  const status = String(formData.get("status") ?? "");
  const reportedAt = String(formData.get("reported_at") ?? "");
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const replacementIssuedAt = String(formData.get("replacement_issued_at") ?? "");
  const billingAssessment = String(formData.get("billing_assessment") ?? "");
  const shortDescription = String(formData.get("short_description") ?? "").trim();

  const validCaseTypes = ["schaden", "verlust", "technisches_problem"];
  const validAffectedItems = [
    "adapter",
    "charging_cable",
    "component",
    "hdmi_cable",
    "ipad",
    "keyboard",
    "magic_mouse",
    "other",
    "pencil",
    "pencil_cap",
    "power_adapter",
    "set",
  ];
  const validStatuses = [
    "offen",
    "in_bearbeitung",
    "bericht_erzeugt",
    "bericht_unterschrieben",
    "abgeschlossen",
    "storniert",
  ];
  const validBillingAssessments = [
    "unklar",
    "abrechenbar",
    "nicht_abrechenbar",
  ];

  if (
    !id ||
    !reportedAt ||
    !shortDescription ||
    !validCaseTypes.includes(caseType) ||
    !validAffectedItems.includes(affectedItem) ||
    !validStatuses.includes(status) ||
    !validBillingAssessments.includes(billingAssessment)
  ) {
    redirect(appendFlagToHref(returnTo, "error", "missing_required"));
  }

  if (occurredAt && occurredAt > reportedAt) {
    redirect(appendFlagToHref(returnTo, "error", "invalid_dates"));
  }

  const appUser = await getCurrentAppUser();

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("damage_case")
    .update({
      affected_item: affectedItem,
      billing_assessment: billingAssessment,
      case_type: caseType,
      detail_description: nullableText(formData, "detail_description"),
      handler: nullableText(formData, "handler"),
      incident_description: nullableText(formData, "incident_description"),
      internal_note: nullableText(formData, "internal_note"),
      legacy_exchange_status: nullableText(formData, "exchange_status"),
      legacy_insurance_warranty: nullableText(formData, "liability"),
      location: nullableText(formData, "location"),
      occurred_at: occurredAt || null,
      reported_at: reportedAt,
      replacement_issued_at: replacementIssuedAt || null,
      short_description: shortDescription,
      status,
      witnesses: nullableText(formData, "witnesses"),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  redirect(appendFlagToHref(returnTo, "damage_updated", "1"));
}

function normalizeJoin<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPerson(person: DamageCaseRow["person"], schoolClassLabel?: string) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  const label = name || person.email || "-";

  return person.person_type === "schueler" && schoolClassLabel
    ? `${label} (${schoolClassLabel})`
    : label;
}

function formatSet(set: { legacy_set_id: number } | null) {
  return set ? String(set.legacy_set_id) : "-";
}

function formatComponent(
  component: { legacy_inventory_number: string; model?: string | null } | null,
) {
  if (!component) {
    return "-";
  }

  const model = component.model ? ` · ${component.model}` : "";
  return `${component.legacy_inventory_number}${model}`;
}

function affectedItemLabel(value: string) {
  const labels: Record<string, string> = {
    adapter: "Adapter",
    charging_cable: "Kabel",
    component: "Komponente",
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

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <FieldIcon label={label} />
        <span>{label}</span>
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-950">
        {value || "-"}
      </dd>
    </div>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span className="flex items-center gap-2">
        <FieldIcon label={label} />
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}

function matchesQuery(caseRow: DamageCaseRow, query: string) {
  if (!query) {
    return true;
  }

  const needle = query.toLocaleLowerCase("de-DE");
  const haystack = [
    caseRow.legacy_damage_id,
    caseRow.damage_number,
    caseRow.short_description,
    caseRow.legacy_status,
    caseRow.legacy_exchange_status,
    caseRow.legacy_insurance_warranty,
    caseRow.import_hint,
    formatPerson(caseRow.person),
    formatSet(caseRow.inventory_set),
    caseRow.component?.legacy_inventory_number,
    caseRow.replacement_component?.legacy_inventory_number,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLocaleLowerCase("de-DE");

  return haystack.includes(needle);
}

export default async function SchadensfaellePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = getSingleParam(params, "q").trim();
  const statusFilter = getSingleParam(params, "status");
  const typeFilter = getSingleParam(params, "type");
  const billingFilter = getSingleParam(params, "billing");
  const detailId = getSingleParam(params, "detail");
  const editId = getSingleParam(params, "edit");
  const page = getPageParam(params);
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "buchhaltung", "readonly"])) {
    redirect("/");
  }

  const canManageDamageCases = hasAnyRole(appUser, ["admin", "ipad_verwaltung"]);

  const supabase = await createClient();
  let damageQuery = supabase
    .from("damage_case")
    .select(
      "id,damage_number,legacy_damage_id,case_type,affected_item,status,legacy_status,legacy_exchange_status,legacy_insurance_warranty,reported_at,occurred_at,short_description,billing_assessment,import_hint,person:person_id(first_name,last_name,email),inventory_set:set_id(legacy_set_id,storage_label),component:component_id(legacy_inventory_number,model),replacement_component:replacement_component_id(legacy_inventory_number)",
    )
    .order("reported_at", { ascending: false })
    .order("damage_number", { ascending: false })
    .limit(1000);

  if (statusFilter) {
    damageQuery = damageQuery.eq("status", statusFilter);
  }

  if (typeFilter) {
    damageQuery = damageQuery.eq("case_type", typeFilter);
  }

  if (billingFilter) {
    damageQuery = damageQuery.eq("billing_assessment", billingFilter);
  }

  const [
    damageResult,
    totalCountResult,
    openCountResult,
    billingRelevantCountResult,
    detailResult,
  ] = await Promise.all([
    damageQuery,
    supabase.from("damage_case").select("id", { count: "exact", head: true }),
    supabase
      .from("damage_case")
      .select("id", { count: "exact", head: true })
      .in("status", ["offen", "in_bearbeitung"]),
    supabase
      .from("damage_case")
      .select("id", { count: "exact", head: true })
      .eq("billing_assessment", "abrechenbar"),
    detailId || editId
      ? supabase
          .from("damage_case")
          .select(
            "id,damage_number,legacy_damage_id,legacy_source,legacy_source_id,case_type,affected_item,status,legacy_status,legacy_exchange_status,legacy_insurance_warranty,reported_at,occurred_at,replacement_issued_at,short_description,detail_description,incident_description,location,witnesses,handler,internal_note,affected_components_raw,import_status,import_hint,billing_assessment,created_at,updated_at,person:person_id(id,first_name,last_name,email,person_type),inventory_set:set_id(legacy_set_id,storage_label),replacement_set:replacement_set_id(legacy_set_id),component:component_id(legacy_inventory_number,model),replacement_component:replacement_component_id(legacy_inventory_number),created_by_user:created_by(email)",
          )
          .eq("id", detailId || editId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (damageResult.error) {
    throw damageResult.error;
  }

  if (detailResult.error) {
    throw detailResult.error;
  }

  const allDamageCases = ((damageResult.data ?? []) as RawDamageCaseRow[]).map(
    (caseRow) => ({
      ...caseRow,
      component: normalizeJoin(caseRow.component),
      inventory_set: normalizeJoin(caseRow.inventory_set),
      person: normalizeJoin(caseRow.person),
      replacement_component: normalizeJoin(caseRow.replacement_component),
    }),
  );
  const filteredCases = allDamageCases.filter((caseRow) =>
    matchesQuery(caseRow, query),
  );
  const filteredCount = filteredCases.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;
  const visibleCases = filteredCases.slice(rangeStart, rangeEnd);
  const displayedFrom = filteredCount === 0 ? 0 : rangeStart + 1;
  const displayedTo = Math.min(currentPage * PAGE_SIZE, filteredCount);
  const hasActiveFilters = Boolean(
    query || statusFilter || typeFilter || billingFilter,
  );
  const detailCase = detailResult.data
    ? ({
        ...(detailResult.data as RawDamageCaseDetail),
        component: normalizeJoin(
          (detailResult.data as RawDamageCaseDetail).component,
        ),
        created_by_user: normalizeJoin(
          (detailResult.data as RawDamageCaseDetail).created_by_user,
        ),
        inventory_set: normalizeJoin(
          (detailResult.data as RawDamageCaseDetail).inventory_set,
        ),
        person: normalizeJoin((detailResult.data as RawDamageCaseDetail).person),
        replacement_component: normalizeJoin(
          (detailResult.data as RawDamageCaseDetail).replacement_component,
        ),
        replacement_set: normalizeJoin(
          (detailResult.data as RawDamageCaseDetail).replacement_set,
        ),
      } as DamageCaseDetail)
    : null;
  const editCase = editId && canManageDamageCases ? detailCase : null;
  const detailClassResult =
    detailCase?.person?.id && detailCase.person.person_type === "schueler"
      ? await supabase
          .from("person_class_assignment")
          .select("school_class:school_class_id(label)")
          .eq("person_id", detailCase.person.id)
          .is("valid_until", null)
          .maybeSingle()
      : { data: null, error: null };

  if (detailClassResult.error) {
    throw detailClassResult.error;
  }

  const detailSchoolClass = detailClassResult.data
    ? normalizeJoin(
        detailClassResult.data.school_class as { label: string } | {
          label: string;
        }[],
      )
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/">
              iPad-Verwaltung 2.0
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Schadensfälle
            </h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="schadensfaelle" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Schadensfälle</p>
            <p className="mt-2 text-2xl font-semibold">
              {totalCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Offen/in Bearbeitung</p>
            <p className="mt-2 text-2xl font-semibold">
              {openCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Abrechenbar</p>
            <p className="mt-2 text-2xl font-semibold">
              {billingRelevantCountResult.count ?? 0}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Meldungen</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? `${displayedFrom}-${displayedTo} von ${filteredCount} Treffern angezeigt.`
                : `${displayedFrom}-${displayedTo} von ${totalCountResult.count ?? 0} Meldungen angezeigt.`}
            </p>
          </div>

          <DamageCasesFilterForm
            billing={billingFilter}
            hasActiveFilters={hasActiveFilters}
            key={`${query}:${statusFilter}:${typeFilter}:${billingFilter}`}
            query={query}
            status={statusFilter}
            type={typeFilter}
          />

          {visibleCases.length > 0 ? (
            <DamageCasesTable
              canManage={canManageDamageCases}
              cases={visibleCases}
            />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Schadensfälle fuer die aktuelle Auswahl gefunden.
            </div>
          )}

          {filteredCount > PAGE_SIZE ? (
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
                    Zurück
                  </Link>
                ) : (
                  <span className="rounded-md border border-zinc-200 px-3 py-2 font-medium text-zinc-400">
                    Zurück
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
      </section>

      {detailId && detailCase ? (
        <div className="fixed inset-0 z-40 bg-zinc-950/20">
          <aside className="ml-auto flex h-full w-full max-w-6xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Ausführlicher Datensatz
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Schadensfall {detailCase.damage_number}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {detailCase.short_description}
                </p>
              </div>
              <Link
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                href={buildCloseDetailHref(params)}
              >
                Schließen
              </Link>
            </div>

            <div className="grid gap-5 p-6">
              <section className="rounded-lg border border-zinc-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
                  <h3 className="font-semibold">Schaden</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {detailCase.handler ? (
                      <span className="text-xs font-medium text-zinc-500">
                        Bearbeiter: {detailCase.handler}
                      </span>
                    ) : null}
                    {canManageDamageCases ? (
                      <Link
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50"
                        href={buildEditHref(params, detailCase.id)}
                      >
                        Bearbeiten
                      </Link>
                    ) : null}
                    <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                      {detailCase.status}
                    </span>
                  </div>
                </div>
                <dl className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Art" value={detailCase.case_type} />
                  <Field
                    label="Betroffen"
                    value={affectedItemLabel(detailCase.affected_item)}
                  />
                  <Field label="Meldedatum" value={detailCase.reported_at} />
                  <Field
                    label="Ereignisdatum | wann"
                    value={detailCase.occurred_at}
                  />
                  <Field
                    label="Hergang | Wie"
                    value={detailCase.incident_description}
                  />
                  <Field
                    label="Schadenbeschreibung | was"
                    value={detailCase.detail_description}
                  />
                  <Field label="Ort" value={detailCase.location} />
                  <Field
                    label="Haftung"
                    value={detailCase.legacy_insurance_warranty}
                  />
                  <Field label="Abrechnung" value={detailCase.billing_assessment} />
                  <Field label="Zeugen" value={detailCase.witnesses} />
                  <Field label="Interne Notiz" value={detailCase.internal_note} />
                </dl>
              </section>

              <section className="rounded-lg border border-zinc-200">
                <div className="border-b border-zinc-200 px-4 py-3">
                  <h3 className="font-semibold">Set und Komponenten</h3>
                </div>
                <dl className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label="Person"
                    value={formatPerson(detailCase.person, detailSchoolClass?.label)}
                  />
                  <div className="grid gap-4">
                    <Field label="Set" value={formatSet(detailCase.inventory_set)} />
                    <Field
                      label="Ersatzset"
                      value={formatSet(detailCase.replacement_set)}
                    />
                  </div>
                  <div className="grid gap-4">
                    <Field
                      label="Komponente"
                      value={formatComponent(detailCase.component)}
                    />
                    <Field
                      label="Ersatzkomponente"
                      value={formatComponent(detailCase.replacement_component)}
                    />
                  </div>
                  <Field
                    label="Ersatz ausgegeben am"
                    value={detailCase.replacement_issued_at}
                  />
                  <Field
                    label="Austauschstatus"
                    value={detailCase.legacy_exchange_status}
                  />
                  <Field
                    label="Betroffene Komponenten"
                    value={detailCase.affected_components_raw}
                  />
                </dl>
              </section>

              <section className="rounded-lg border border-zinc-200">
                <div className="border-b border-zinc-200 px-4 py-3">
                  <h3 className="font-semibold">Legacy und Import</h3>
                </div>
                <dl className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Legacy-ID" value={detailCase.legacy_damage_id} />
                  <Field label="Quelle" value={detailCase.legacy_source} />
                  <Field label="Quelle-ID" value={detailCase.legacy_source_id} />
                  <Field label="Legacy-Status" value={detailCase.legacy_status} />
                  <Field label="Importstatus" value={detailCase.import_status} />
                  <Field label="Importhinweis" value={detailCase.import_hint} />
                  <Field
                    label="Angelegt durch"
                    value={detailCase.created_by_user?.email}
                  />
                  <Field label="Erstellt am" value={detailCase.created_at} />
                  <Field label="Geändert am" value={detailCase.updated_at} />
                </dl>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {editCase ? (
        <div className="fixed inset-0 z-40 bg-zinc-950/20">
          <aside className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Datensatz bearbeiten
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Schadensfall {editCase.damage_number}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatPerson(editCase.person, detailSchoolClass?.label)} · Set{" "}
                  {formatSet(editCase.inventory_set)}
                </p>
              </div>
              <Link
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                href={buildCloseDetailHref(params)}
              >
                Schließen
              </Link>
            </div>

            <form action={updateDamageCase} className="grid gap-5 p-6">
              <input name="id" type="hidden" value={editCase.id} />
              <input
                name="return_to"
                type="hidden"
                value={buildEditHref(params, editCase.id)}
              />

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <h3 className="font-semibold">Kernangaben</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Vorgangsart">
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.case_type}
                      name="case_type"
                      required
                    >
                      <option value="schaden">Schaden</option>
                      <option value="verlust">Verlust</option>
                      <option value="technisches_problem">
                        Technisches Problem
                      </option>
                    </select>
                  </FormField>

                  <FormField label="Status">
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.status}
                      name="status"
                      required
                    >
                      <option value="offen">Offen</option>
                      <option value="in_bearbeitung">In Bearbeitung</option>
                      <option value="bericht_erzeugt">Bericht erzeugt</option>
                      <option value="bericht_unterschrieben">
                        Bericht unterschrieben
                      </option>
                      <option value="abgeschlossen">Abgeschlossen</option>
                      <option value="storniert">Storniert</option>
                    </select>
                  </FormField>

                  <FormField label="Betroffen">
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.affected_item}
                      name="affected_item"
                      required
                    >
                      <option value="component">Konkrete Komponente</option>
                      <option value="set">Ganzes Set</option>
                      <option value="ipad">iPad</option>
                      <option value="pencil">Pencil</option>
                      <option value="keyboard">Tastatur</option>
                      <option value="power_adapter">Netzteil</option>
                      <option value="charging_cable">Kabel</option>
                      <option value="pencil_cap">Pencil-Kappe</option>
                      <option value="adapter">Adapter</option>
                      <option value="hdmi_cable">HDMI-Kabel</option>
                      <option value="magic_mouse">Magic-Maus</option>
                      <option value="other">Sonstiges</option>
                    </select>
                  </FormField>
                </div>

                <FormField label="Kurzbeschreibung">
                  <input
                    className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editCase.short_description}
                    name="short_description"
                    required
                  />
                </FormField>
              </section>

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <h3 className="font-semibold">Schaden</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Meldedatum">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.reported_at}
                      name="reported_at"
                      required
                      type="date"
                    />
                  </FormField>

                  <FormField label="Ereignisdatum">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.occurred_at ?? ""}
                      name="occurred_at"
                      type="date"
                    />
                  </FormField>

                  <FormField label="Ort">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.location ?? ""}
                      name="location"
                    />
                  </FormField>
                </div>

                <FormField label="Hergang | Wie">
                  <textarea
                    className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editCase.incident_description ?? ""}
                    name="incident_description"
                  />
                </FormField>

                <FormField label="Schadenbeschreibung | was">
                  <textarea
                    className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editCase.detail_description ?? ""}
                    name="detail_description"
                  />
                </FormField>

                <FormField label="Zeugen">
                  <textarea
                    className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editCase.witnesses ?? ""}
                    name="witnesses"
                  />
                </FormField>
              </section>

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <h3 className="font-semibold">Bearbeitung</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Haftung">
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.legacy_insurance_warranty ?? ""}
                      name="liability"
                    >
                      <option value="">Unklar</option>
                      <option value="Eltern">Eltern</option>
                      <option value="Schule">Schule</option>
                      <option value="Garantie">Garantie</option>
                    </select>
                  </FormField>

                  <FormField label="Abrechnung">
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.billing_assessment}
                      name="billing_assessment"
                    >
                      <option value="unklar">Unklar</option>
                      <option value="abrechenbar">Abrechenbar</option>
                      <option value="nicht_abrechenbar">
                        Nicht abrechenbar
                      </option>
                    </select>
                  </FormField>

                  <FormField label="Bearbeiter">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.handler ?? ""}
                      name="handler"
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Austauschstatus">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.legacy_exchange_status ?? ""}
                      name="exchange_status"
                    />
                  </FormField>

                  <FormField label="Ersatz ausgegeben am">
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editCase.replacement_issued_at ?? ""}
                      name="replacement_issued_at"
                      type="date"
                    />
                  </FormField>
                </div>

                <FormField label="Interne Notiz">
                  <textarea
                    className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editCase.internal_note ?? ""}
                    name="internal_note"
                  />
                </FormField>
              </section>

              <section className="rounded-lg border border-zinc-200 p-4">
                <h3 className="font-semibold">Zuordnung</h3>
                <dl className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field
                    label="Person"
                    value={formatPerson(editCase.person, detailSchoolClass?.label)}
                  />
                  <div className="grid gap-4">
                    <Field label="Set" value={formatSet(editCase.inventory_set)} />
                    <Field
                      label="Ersatzset"
                      value={formatSet(editCase.replacement_set)}
                    />
                  </div>
                  <div className="grid gap-4">
                    <Field
                      label="Komponente"
                      value={formatComponent(editCase.component)}
                    />
                    <Field
                      label="Ersatzkomponente"
                      value={formatComponent(editCase.replacement_component)}
                    />
                  </div>
                </dl>
              </section>

              <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-zinc-200 bg-white py-4">
                <Link
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={buildCloseDetailHref(params)}
                >
                  Abbrechen
                </Link>
                <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Änderungen speichern
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
