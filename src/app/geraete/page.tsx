import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { GeraeteFilterForm } from "./geraete-filter-form";
import { GeraeteTable, type GeraeteTableRow } from "./geraete-table";

type ComponentRow = {
  category: string;
  condition: string;
  id: string;
  invoice_position_number: number | null;
  legacy_inventory_number: string;
  legacy_set_number: number | null;
  legacy_status: string | null;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
  serial_number: string | null;
  storage_label: string | null;
};

type ComponentAssignmentRow = {
  component_id: string;
  role: string;
  set: {
    availability: string;
    condition: string;
    legacy_set_id: number;
    storage_label: string | null;
  } | null;
};

type RawComponentAssignmentRow = Omit<ComponentAssignmentRow, "set"> & {
  set: ComponentAssignmentRow["set"] | ComponentAssignmentRow["set"][];
};

type DeviceSort = "inventory" | "category" | "set" | "condition";

const PAGE_SIZE = 75;
const QUERY_BATCH_SIZE = 1000;

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

function getSortParam(
  searchParams: Record<string, string | string[] | undefined>,
): DeviceSort {
  const sort = getSingleParam(searchParams, "sort");

  if (sort === "category" || sort === "set" || sort === "condition") {
    return sort;
  }

  return "inventory";
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  return buildGeraeteHref(params, { page });
}

function buildGeraeteHref(
  params: Record<string, string | string[] | undefined>,
  options?: { edit?: string | null; page?: number },
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "set", "category", "condition", "assignment", "sort"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const page =
    options?.page ?? Number.parseInt(getSingleParam(params, "page"), 10);

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  if (options?.edit) {
    nextParams.set("edit", options.edit);
  }

  const queryString = nextParams.toString();
  return queryString ? `/geraete?${queryString}` : "/geraete";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function categoryLabel(value: string) {
  const labels: Record<string, string> = {
    adapter: "Adapter",
    ipad: "iPad",
    keyboard: "Tastatur",
    mouse: "Magic-Maus",
    other: "Sonstiges",
    pencil: "Pencil",
  };

  return labels[value] ?? value;
}

function conditionLabel(value: string) {
  const labels: Record<string, string> = {
    "beschädigt_nutzbar": "Beschädigt, nutzbar",
    defekt: "Defekt",
    "gesperrt_kein_mdm": "Gesperrt, kein MDM",
    ok: "Ok",
    unklar: "Unklar",
  };

  return labels[value] ?? value;
}

function formatSet(assignment: ComponentAssignmentRow | undefined) {
  if (!assignment?.set) {
    return "-";
  }

  return String(assignment.set.legacy_set_id);
}

function inventoryNumberSetPart(inventoryNumber: string) {
  const match = inventoryNumber.match(/\/\s*(\d+)\s*$/);

  if (!match) {
    return null;
  }

  return String(Number.parseInt(match[1], 10));
}

function assignmentKind(assignment: ComponentAssignmentRow | undefined) {
  if (!assignment?.set) {
    return "unassigned";
  }

  return assignment.set.availability === "frei" ? "free_set" : "assigned_set";
}

function assignmentLabel(assignment: ComponentAssignmentRow | undefined) {
  if (!assignment?.set) {
    return "Ohne Set";
  }

  return assignment.set.availability === "frei"
    ? "In freiem Set"
    : "In zugeordnetem/ausgegebenem Set";
}

function matchesQuery(
  component: ComponentRow,
  assignment: ComponentAssignmentRow | undefined,
  query: string,
) {
  if (!query) {
    return true;
  }

  const needle = query.toLocaleLowerCase("de-DE");
  const haystack = [
    component.legacy_inventory_number,
    component.legacy_set_number,
    component.manufacturer,
    component.model,
    component.serial_number,
    component.legacy_status,
    component.storage_label,
    component.notes,
    assignment?.role,
    assignment?.set?.legacy_set_id,
    assignment?.set?.availability,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLocaleLowerCase("de-DE");

  return haystack.includes(needle);
}

function matchesSetFilter(
  component: ComponentRow,
  assignment: ComponentAssignmentRow | undefined,
  setFilter: string,
) {
  if (!setFilter) {
    return true;
  }

  const normalizedFilter = setFilter.trim();
  const normalizedInventorySetPart = inventoryNumberSetPart(
    component.legacy_inventory_number,
  );

  return (
    String(component.legacy_set_number ?? "") === normalizedFilter ||
    String(assignment?.set?.legacy_set_id ?? "") === normalizedFilter ||
    normalizedInventorySetPart === normalizedFilter
  );
}

function sortValue(component: ComponentRow, assignment: ComponentAssignmentRow | undefined) {
  return {
    category: `${component.category} ${component.legacy_inventory_number}`,
    condition: `${component.condition} ${component.legacy_inventory_number}`,
    inventory: component.legacy_inventory_number,
    set: `${assignment?.set?.legacy_set_id ?? 999999} ${component.legacy_inventory_number}`,
  };
}

async function fetchAllComponents(supabase: Awaited<ReturnType<typeof createClient>>) {
  const components: ComponentRow[] = [];

  for (let from = 0; ; from += QUERY_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("inventory_component")
      .select(
        "id,legacy_inventory_number,legacy_set_number,category,manufacturer,model,condition,legacy_status,serial_number,invoice_position_number,notes,storage_label",
      )
      .order("legacy_inventory_number", { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    components.push(...((data ?? []) as ComponentRow[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      return components;
    }
  }
}

async function fetchAllCurrentAssignments(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const assignments: RawComponentAssignmentRow[] = [];

  for (let from = 0; ; from += QUERY_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("set_component_assignment")
      .select(
        "component_id,role,set:set_id(legacy_set_id,availability,condition,storage_label)",
      )
      .is("valid_until", null)
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    assignments.push(...((data ?? []) as RawComponentAssignmentRow[]));

    if (!data || data.length < QUERY_BATCH_SIZE) {
      return assignments;
    }
  }
}

async function updateComponent(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const componentId = normalizeRequiredText(formData.get("component_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/geraete";
  const legacyInventoryNumber = normalizeRequiredText(
    formData.get("legacy_inventory_number"),
  );
  const category = normalizeRequiredText(formData.get("category"));
  const condition = normalizeRequiredText(formData.get("condition"));

  if (!componentId || !legacyInventoryNumber || !category || !condition) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_component")
    .update({
      category,
      condition,
      invoice_position_number: normalizeOptionalNumber(
        formData.get("invoice_position_number"),
      ),
      legacy_inventory_number: legacyInventoryNumber,
      legacy_set_number: normalizeOptionalNumber(formData.get("legacy_set_number")),
      legacy_status: normalizeOptionalText(formData.get("legacy_status")),
      manufacturer: normalizeOptionalText(formData.get("manufacturer")),
      model: normalizeOptionalText(formData.get("model")),
      notes: normalizeOptionalText(formData.get("notes")),
      serial_number: normalizeOptionalText(formData.get("serial_number")),
      storage_label: normalizeOptionalText(formData.get("storage_label")),
    })
    .eq("id", componentId);

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

async function completeComponentRepair(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const componentId = normalizeRequiredText(formData.get("component_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/geraete";

  if (!componentId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_component")
    .update({ condition: "ok" })
    .eq("id", componentId)
    .eq("condition", "defekt");

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

export default async function GeraetePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = getSingleParam(params, "q").trim();
  const setFilter = getSingleParam(params, "set").trim();
  const categoryFilter = getSingleParam(params, "category");
  const conditionFilter = getSingleParam(params, "condition");
  const assignmentFilter = getSingleParam(params, "assignment");
  const sort = getSortParam(params);
  const page = getPageParam(params);
  const editComponentId = getSingleParam(params, "edit");
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const canEditComponents = hasAnyRole(appUser, ["admin"]);
  const supabase = await createClient();
  const [
    components,
    rawAssignments,
    componentCountResult,
    setAssignedCountResult,
  ] = await Promise.all([
    fetchAllComponents(supabase),
    fetchAllCurrentAssignments(supabase),
    supabase
      .from("inventory_component")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("set_component_assignment")
      .select("id", { count: "exact", head: true })
      .is("valid_until", null),
  ]);
  const assignments = rawAssignments.map(
    (assignment) => ({
      ...assignment,
      set: Array.isArray(assignment.set)
        ? (assignment.set[0] ?? null)
        : assignment.set,
    }),
  );
  const assignmentByComponentId = new Map<string, ComponentAssignmentRow>();

  for (const assignment of assignments) {
    assignmentByComponentId.set(assignment.component_id, assignment);
  }

  const unassignedCount =
    (componentCountResult.count ?? components.length) -
    (setAssignedCountResult.count ?? assignments.length);

  const filteredComponents = components
    .filter((component) => {
      const assignment = assignmentByComponentId.get(component.id);

      if (categoryFilter && component.category !== categoryFilter) {
        return false;
      }

      if (conditionFilter && component.condition !== conditionFilter) {
        return false;
      }

      if (assignmentFilter) {
        if (assignmentFilter === "set" && !assignment?.set) {
          return false;
        }

        if (
          assignmentFilter !== "set" &&
          assignmentKind(assignment) !== assignmentFilter
        ) {
          return false;
        }
      }

      return (
        matchesSetFilter(component, assignment, setFilter) &&
        matchesQuery(component, assignment, query)
      );
    })
    .sort((first, second) => {
      const firstAssignment = assignmentByComponentId.get(first.id);
      const secondAssignment = assignmentByComponentId.get(second.id);
      const firstSortValue = sortValue(first, firstAssignment)[sort];
      const secondSortValue = sortValue(second, secondAssignment)[sort];

      return firstSortValue.localeCompare(secondSortValue, "de-DE", {
        numeric: true,
      });
    });
  const filteredCount = filteredComponents.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;
  const visibleComponents = filteredComponents.slice(rangeStart, rangeEnd);
  const visibleRows: GeraeteTableRow[] = visibleComponents.map((component) => {
    const assignment = assignmentByComponentId.get(component.id);

    return {
      assignmentLabel: assignmentLabel(assignment),
      categoryLabel: categoryLabel(component.category),
      condition: component.condition,
      conditionLabel: conditionLabel(component.condition),
      editHref: canEditComponents
        ? buildGeraeteHref(params, {
            edit: component.id,
            page: currentPage,
          })
        : null,
      id: component.id,
      inventoryNumberSetPart: inventoryNumberSetPart(
        component.legacy_inventory_number,
      ),
      legacyInventoryNumber: component.legacy_inventory_number,
      legacySetNumber: component.legacy_set_number,
      legacyStatus: component.legacy_status,
      manufacturerModel: [component.manufacturer, component.model]
        .filter(Boolean)
        .join(" · "),
      serialNumber: component.serial_number,
      setLabel: formatSet(assignment),
      storageLabel:
        assignment?.set?.storage_label || component.storage_label || "-",
    };
  });
  const displayedFrom = filteredCount === 0 ? 0 : rangeStart + 1;
  const displayedTo = Math.min(rangeEnd, filteredCount);
  const hasActiveFilters = Boolean(
    query || setFilter || categoryFilter || conditionFilter || assignmentFilter,
  );
  const editComponent = canEditComponents
    ? (components.find((component) => component.id === editComponentId) ?? null)
    : null;
  const editAssignment = editComponent
    ? assignmentByComponentId.get(editComponent.id)
    : undefined;
  const closeEditHref = buildGeraeteHref(params, {
    edit: null,
    page: currentPage,
  });

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/">
              iPad-Verwaltung 2.0
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Geräteliste
            </h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="geraete" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Komponenten</p>
            <p className="mt-2 text-2xl font-semibold">
              {componentCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">In Sets</p>
            <p className="mt-2 text-2xl font-semibold">
              {setAssignedCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Ohne Set</p>
            <p className="mt-2 text-2xl font-semibold">
              {unassignedCount}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Komponenten</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? `${displayedFrom}-${displayedTo} von ${filteredCount} Treffern angezeigt.`
                : `${displayedFrom}-${displayedTo} von ${componentCountResult.count ?? 0} Komponenten angezeigt.`}
            </p>
          </div>

          <GeraeteFilterForm
            assignment={assignmentFilter}
            category={categoryFilter}
            condition={conditionFilter}
            hasActiveFilters={hasActiveFilters}
            key={`${query}:${setFilter}:${categoryFilter}:${conditionFilter}:${assignmentFilter}:${sort}`}
            query={query}
            setFilter={setFilter}
            sort={sort}
          />

          {visibleComponents.length > 0 ? (
            <GeraeteTable
              canEditComponents={canEditComponents}
              completeRepairAction={completeComponentRepair}
              rows={visibleRows}
            />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Geräte für die aktuelle Auswahl gefunden.
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
      {editComponent ? (
        <div className="fixed inset-0 z-40 bg-zinc-950/25">
          <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Gerät bearbeiten
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {editComponent.legacy_inventory_number}
                </h2>
              </div>
              <Link
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                href={closeEditHref}
              >
                Schließen
              </Link>
            </div>

            <form action={updateComponent} className="grid gap-6 px-6 py-6">
              <input name="component_id" type="hidden" value={editComponent.id} />
              <input name="return_to" type="hidden" value={closeEditHref} />

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <div>
                  <h3 className="font-semibold">Gerätedaten</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Stammdaten der einzelnen Komponente.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Inventarnummer
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.legacy_inventory_number}
                      name="legacy_inventory_number"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Kategorie
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.category}
                      name="category"
                      required
                    >
                      <option value="ipad">iPad</option>
                      <option value="pencil">Pencil</option>
                      <option value="keyboard">Tastatur</option>
                      <option value="adapter">Adapter</option>
                      <option value="mouse">Magic-Maus</option>
                      <option value="other">Sonstiges</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Hersteller
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.manufacturer ?? ""}
                      name="manufacturer"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Modell
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.model ?? ""}
                      name="model"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Zustand
                    <select
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.condition}
                      name="condition"
                      required
                    >
                      <option value="ok">Ok</option>
                      <option value="beschädigt_nutzbar">
                        Beschädigt, nutzbar
                      </option>
                      <option value="defekt">Defekt</option>
                      <option value="gesperrt_kein_mdm">
                        Gesperrt, kein MDM
                      </option>
                      <option value="unklar">Unklar</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Seriennummer
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.serial_number ?? ""}
                      name="serial_number"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Lagerort
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.storage_label ?? ""}
                      name="storage_label"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Legacy-Status
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.legacy_status ?? ""}
                      name="legacy_status"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Legacy-Setnummer
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.legacy_set_number ?? ""}
                      inputMode="numeric"
                      name="legacy_set_number"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Rechnungsposition
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.invoice_position_number ?? ""}
                      inputMode="numeric"
                      name="invoice_position_number"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Notizen
                  <textarea
                    className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={editComponent.notes ?? ""}
                    name="notes"
                  />
                </label>
              </section>

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <div>
                  <h3 className="font-semibold">Aktuelle Zuordnung</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Die Set-Zuordnung wird in diesem Schritt nur angezeigt.
                  </p>
                </div>
                <dl className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Set</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSet(editAssignment)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Rolle im Set</dt>
                    <dd className="mt-1 font-semibold">
                      {editAssignment?.role
                        ? categoryLabel(editAssignment.role)
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Verfügbarkeit</dt>
                    <dd className="mt-1 font-semibold">
                      {editAssignment?.set?.availability ?? "-"}
                    </dd>
                  </div>
                </dl>
              </section>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-4">
                <Link
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={closeEditHref}
                >
                  Abbrechen
                </Link>
                <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                  Speichern
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
