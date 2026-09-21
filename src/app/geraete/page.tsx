import { conditionLabel } from "@/lib/condition";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { GeraeteFilterForm } from "./geraete-filter-form";
import { GeraeteTable, type GeraeteTableRow } from "./geraete-table";
import { PageSizeSelect } from "./page-size-select";

export const metadata: Metadata = {
  title: "Geräte | iPad-Verwaltung",
};

type ComponentRow = {
  category: string;
  condition: string;
  id: string;
  invoice_position: InvoicePositionRow | InvoicePositionRow[] | null;
  invoice_position_number: number | null;
  legacy_inventory_number: string;
  legacy_set_number: number | null;
  legacy_status: string | null;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
  purchase_date: string | null;
  serial_number: string | null;
  storage_label: string | null;
};

type InvoicePositionRow = {
  invoice: InvoiceRow | InvoiceRow[] | null;
  legacy_invoice_position_number: number | null;
};

type InvoiceRow = {
  invoice_date: string | null;
  legacy_invoice_number: number | null;
  supplier: string | null;
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

type InventoryComponentListRow = {
  assignment_component_id: string | null;
  assignment_role: string | null;
  category: string;
  condition: string;
  id: string;
  invoice_date: string | null;
  invoice_legacy_number: number | null;
  invoice_legacy_position_number: number | null;
  invoice_position_number: number | null;
  invoice_supplier: string | null;
  legacy_inventory_number: string;
  legacy_set_number: number | null;
  legacy_status: string | null;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
  purchase_date: string | null;
  serial_number: string | null;
  set_availability: string | null;
  set_condition: string | null;
  set_legacy_set_id: number | null;
  set_storage_label: string | null;
  storage_label: string | null;
  assigned_count: number;
  component_count: number;
  total_count: number;
};

type DeviceSort = "inventory" | "category" | "set" | "condition";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
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

function getPageSizeParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const parsed = Number.parseInt(getSingleParam(searchParams, "pageSize"), 10);

  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : DEFAULT_PAGE_SIZE;
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
  options?: { edit?: string | null; page?: number; storage?: string | null },
) {
  const nextParams = new URLSearchParams();

  for (const key of [
    "q",
    "set",
    "category",
    "condition",
    "assignment",
    "sort",
    "pageSize",
  ]) {
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

  if (options?.storage) {
    nextParams.set("storage", options.storage);
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

function normalizeOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function normalizeJoined<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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


function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
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

function chunkValues<T>(values: T[], size = QUERY_BATCH_SIZE) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
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
    component.purchase_date,
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
        "id,legacy_inventory_number,legacy_set_number,category,manufacturer,model,condition,legacy_status,serial_number,invoice_position_number,invoice_position:invoice_position_id(legacy_invoice_position_number,invoice:invoice_id(invoice_date,legacy_invoice_number,supplier)),notes,purchase_date,storage_label",
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

function canUsePagedComponentQuery({
  assignmentFilter,
  query,
  sort,
}: {
  assignmentFilter: string;
  query: string;
  sort: DeviceSort;
}) {
  return !assignmentFilter && sort !== "set" && !query;
}

function inventorySetPartSearchPatterns(setFilter: string) {
  const parsed = Number.parseInt(setFilter, 10);

  if (!Number.isInteger(parsed)) {
    return [`%/ ${setFilter}`, `%/${setFilter}`];
  }

  return Array.from(new Set([
    `%/ ${parsed}`,
    `%/${parsed}`,
    `%/ ${String(parsed).padStart(4, "0")}`,
    `%/${String(parsed).padStart(4, "0")}`,
  ]));
}

async function fetchComponentIdsForSetFilter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setFilter: string,
) {
  if (!setFilter) {
    return null;
  }

  const matchingComponentIds = new Set<string>();
  const numericSetFilter = Number.parseInt(setFilter, 10);
  const [legacySetComponentsResult, assignedSetComponentsResult, inventoryPartResults] =
    await Promise.all([
      Number.isInteger(numericSetFilter)
        ? supabase
            .from("inventory_component")
            .select("id")
            .eq("legacy_set_number", numericSetFilter)
        : Promise.resolve({ data: [], error: null }),
      Number.isInteger(numericSetFilter)
        ? supabase
            .from("set_component_assignment")
            .select("component_id,set:set_id!inner(legacy_set_id)")
            .is("valid_until", null)
            .eq("set.legacy_set_id", numericSetFilter)
        : Promise.resolve({ data: [], error: null }),
      Promise.all(
        inventorySetPartSearchPatterns(setFilter).map((pattern) =>
          supabase
            .from("inventory_component")
            .select("id")
            .ilike("legacy_inventory_number", pattern),
        ),
      ),
    ]);

  if (legacySetComponentsResult.error) {
    throw legacySetComponentsResult.error;
  }

  if (assignedSetComponentsResult.error) {
    throw assignedSetComponentsResult.error;
  }

  for (const result of inventoryPartResults) {
    if (result.error) {
      throw result.error;
    }

    for (const component of result.data ?? []) {
      matchingComponentIds.add(component.id);
    }
  }

  for (const component of legacySetComponentsResult.data ?? []) {
    matchingComponentIds.add(component.id);
  }

  for (const assignment of assignedSetComponentsResult.data ?? []) {
    if (assignment.component_id) {
      matchingComponentIds.add(assignment.component_id);
    }
  }

  return [...matchingComponentIds];
}

async function fetchAssignmentsForComponents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  componentIds: string[],
) {
  const assignments: RawComponentAssignmentRow[] = [];

  for (const componentIdBatch of chunkValues(componentIds)) {
    const { data, error } = await supabase
      .from("set_component_assignment")
      .select(
        "component_id,role,set:set_id(legacy_set_id,availability,condition,storage_label)",
      )
      .is("valid_until", null)
      .in("component_id", componentIdBatch);

    if (error) {
      throw error;
    }

    assignments.push(...((data ?? []) as RawComponentAssignmentRow[]));
  }

  return assignments;
}

function componentFromListRow(row: InventoryComponentListRow): ComponentRow {
  return {
    category: row.category,
    condition: row.condition,
    id: row.id,
    invoice_position:
      row.invoice_legacy_position_number ||
      row.invoice_date ||
      row.invoice_legacy_number ||
      row.invoice_supplier
        ? {
            invoice: {
              invoice_date: row.invoice_date,
              legacy_invoice_number: row.invoice_legacy_number,
              supplier: row.invoice_supplier,
            },
            legacy_invoice_position_number: row.invoice_legacy_position_number,
          }
        : null,
    invoice_position_number: row.invoice_position_number,
    legacy_inventory_number: row.legacy_inventory_number,
    legacy_set_number: row.legacy_set_number,
    legacy_status: row.legacy_status,
    manufacturer: row.manufacturer,
    model: row.model,
    notes: row.notes,
    purchase_date: row.purchase_date,
    serial_number: row.serial_number,
    storage_label: row.storage_label,
  };
}

function assignmentFromListRow(
  row: InventoryComponentListRow,
): RawComponentAssignmentRow | null {
  if (!row.assignment_component_id || !row.assignment_role) {
    return null;
  }

  return {
    component_id: row.assignment_component_id,
    role: row.assignment_role,
    set:
      row.set_legacy_set_id ||
      row.set_availability ||
      row.set_condition ||
      row.set_storage_label
        ? {
            availability: row.set_availability ?? "",
            condition: row.set_condition ?? "",
            legacy_set_id: row.set_legacy_set_id ?? 0,
            storage_label: row.set_storage_label,
          }
        : null,
  };
}

function shouldUseComponentListRpc({
  assignmentFilter,
  query,
  sort,
}: {
  assignmentFilter: string;
  query: string;
  sort: DeviceSort;
}) {
  return Boolean(assignmentFilter || query || sort === "set");
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
      purchase_date: normalizeOptionalDate(formData.get("purchase_date")),
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
  const { data: repairedComponent, error } = await supabase
    .from("inventory_component")
    .update({
      condition: "ok",
      legacy_status: "ok",
      notes: "Umtausch/Reparatur abgeschlossen.",
    })
    .eq("id", componentId)
    .eq("condition", "defekt")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  redirect(
    `${returnTo}${returnTo.includes("?") ? "&" : "?"}${
      repairedComponent ? "repair_completed=1" : "repair_unchanged=1"
    }`,
  );
}

async function updateComponentStorage(formData: FormData) {
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
    .update({ storage_label: normalizeOptionalText(formData.get("storage_label")) })
    .eq("id", componentId);

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
  const pageSize = getPageSizeParam(params);
  const editComponentId = getSingleParam(params, "edit");
  const storageComponentId = getSingleParam(params, "storage");
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const canEditComponents = hasAnyRole(appUser, ["admin"]);
  const supabase = await createClient();
  const rangeStart = (page - 1) * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;
  const useRpcComponentList = shouldUseComponentListRpc({
    assignmentFilter,
    query,
    sort,
  });
  const filteredComponentIds =
    !useRpcComponentList && setFilter
      ? await fetchComponentIdsForSetFilter(supabase, setFilter)
      : null;
  const baseComponentSelect =
    "id,legacy_inventory_number,legacy_set_number,category,manufacturer,model,condition,legacy_status,serial_number,invoice_position_number,invoice_position:invoice_position_id(legacy_invoice_position_number,invoice:invoice_id(invoice_date,legacy_invoice_number,supplier)),notes,purchase_date,storage_label";
  let directComponentQuery = supabase
    .from("inventory_component")
    .select(baseComponentSelect, { count: "exact" });

  if (filteredComponentIds) {
    directComponentQuery = filteredComponentIds.length
      ? directComponentQuery.in("id", filteredComponentIds)
      : directComponentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (categoryFilter) {
    directComponentQuery = directComponentQuery.eq("category", categoryFilter);
  }

  if (conditionFilter) {
    directComponentQuery = directComponentQuery.eq("condition", conditionFilter);
  }

  directComponentQuery = directComponentQuery
    .order("legacy_inventory_number", { ascending: true })
    .range(rangeStart, rangeEnd);

  const [componentListResult, directComponentResult, totalCountResult, assignedCountResult] =
    await Promise.all([
      useRpcComponentList
        ? supabase.rpc("inventory_component_list", {
            p_assignment_filter: assignmentFilter || null,
            p_category: categoryFilter || null,
            p_condition: conditionFilter || null,
            p_limit: pageSize,
            p_offset: rangeStart,
            p_query: query || null,
            p_set_filter: setFilter || null,
            p_sort: sort,
          })
        : Promise.resolve({ data: [], error: null }),
      useRpcComponentList
        ? Promise.resolve({ count: null, data: [], error: null })
        : directComponentQuery,
      supabase
        .from("inventory_component")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("set_component_assignment")
        .select("id", { count: "exact", head: true })
        .is("valid_until", null),
    ]);

  if (componentListResult.error) {
    throw componentListResult.error;
  }

  if (directComponentResult.error) {
    throw directComponentResult.error;
  }

  const componentListRows =
    (componentListResult.data ?? []) as InventoryComponentListRow[];
  const components = useRpcComponentList
    ? componentListRows.map(componentFromListRow)
    : ((directComponentResult.data ?? []) as ComponentRow[]);
  const rawAssignments = useRpcComponentList
    ? componentListRows
        .map(assignmentFromListRow)
        .filter((assignment): assignment is RawComponentAssignmentRow =>
          Boolean(assignment),
        )
    : await fetchAssignmentsForComponents(
        supabase,
        components.map((component) => component.id),
      );
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

  const componentCount = totalCountResult.count ?? componentListRows[0]?.component_count ?? 0;
  const setAssignedCount =
    assignedCountResult.count ?? componentListRows[0]?.assigned_count ?? 0;
  const unassignedCount = componentCount - setAssignedCount;

  const filteredCount = useRpcComponentList
    ? (componentListRows[0]?.total_count ?? 0)
    : (directComponentResult.count ?? components.length);
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const visibleComponents = components;
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
      purchaseDateLabel: formatDate(component.purchase_date),
      serialNumber: component.serial_number,
      setHref: assignment?.set
        ? `/sets?setId=${encodeURIComponent(String(assignment.set.legacy_set_id))}`
        : null,
      setLabel: formatSet(assignment),
      storageHref: canEditComponents
        ? buildGeraeteHref(params, {
            page: currentPage,
            storage: component.id,
          })
        : null,
      storageLabel:
        component.storage_label || assignment?.set?.storage_label || "-",
    };
  });
  const displayedFrom =
    filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayedTo = Math.min(currentPage * pageSize, filteredCount);
  const hasActiveFilters = Boolean(
    query || setFilter || categoryFilter || conditionFilter || assignmentFilter,
  );
  const editComponent = canEditComponents
    ? (components.find((component) => component.id === editComponentId) ?? null)
    : null;
  const storageComponent = canEditComponents
    ? (components.find((component) => component.id === storageComponentId) ?? null)
    : null;
  const storageAssignment = storageComponent
    ? assignmentByComponentId.get(storageComponent.id)
    : undefined;
  const editAssignment = editComponent
    ? assignmentByComponentId.get(editComponent.id)
    : undefined;
  const editInvoicePosition = normalizeJoined(editComponent?.invoice_position);
  const editInvoice = normalizeJoined(editInvoicePosition?.invoice);
  const closeEditHref = buildGeraeteHref(params, {
    edit: null,
    page: currentPage,
  });
  const closeStorageHref = buildGeraeteHref(params, {
    page: currentPage,
    storage: null,
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
              {componentCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">In Sets</p>
            <p className="mt-2 text-2xl font-semibold">
              {setAssignedCount}
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
                : `${displayedFrom}-${displayedTo} von ${componentCount} Komponenten angezeigt.`}
            </p>
          </div>

          <GeraeteFilterForm
            assignment={assignmentFilter}
            category={categoryFilter}
            condition={conditionFilter}
            hasActiveFilters={hasActiveFilters}
            key={`${query}:${setFilter}:${categoryFilter}:${conditionFilter}:${assignmentFilter}:${sort}:${pageSize}`}
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

          {filteredCount > pageSize ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-zinc-600">
                  Seite {currentPage} von {totalPages}
                </p>
                <form action="/geraete" className="flex items-center gap-2">
                  {query ? <input name="q" type="hidden" value={query} /> : null}
                  {setFilter ? (
                    <input name="set" type="hidden" value={setFilter} />
                  ) : null}
                  {categoryFilter ? (
                    <input name="category" type="hidden" value={categoryFilter} />
                  ) : null}
                  {conditionFilter ? (
                    <input name="condition" type="hidden" value={conditionFilter} />
                  ) : null}
                  {assignmentFilter ? (
                    <input
                      name="assignment"
                      type="hidden"
                      value={assignmentFilter}
                    />
                  ) : null}
                  {sort !== "inventory" ? (
                    <input name="sort" type="hidden" value={sort} />
                  ) : null}
                  <label className="flex items-center gap-2 font-medium text-zinc-700">
                    Einträge
                    <PageSizeSelect pageSize={pageSize} />
                  </label>
                </form>
              </div>
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
                <h2 className="inventory-number mt-1 text-2xl font-semibold tracking-tight">
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
                      className="inventory-number rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
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
                      <option value="ok">OK</option>
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
                  <h3 className="font-semibold">Rechnungsdaten</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Einkaufsdaten der verknüpften Rechnungsposition.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Anschaffungsdatum
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editComponent.purchase_date ?? ""}
                      name="purchase_date"
                      type="date"
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

                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      Lieferant
                    </p>
                    <p className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                      {editInvoice?.supplier ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      Rechnungsnummer
                    </p>
                    <p className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                      {editInvoice?.legacy_invoice_number ?? "-"}
                    </p>
                  </div>
                </div>
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
      {storageComponent ? (
        <div className="fixed inset-0 z-40 bg-zinc-950/25">
          <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Geräte-Lagerort
                </p>
                <h2 className="inventory-number mt-1 text-2xl font-semibold tracking-tight">
                  {storageComponent.legacy_inventory_number}
                </h2>
              </div>
              <Link
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                href={closeStorageHref}
              >
                Schließen
              </Link>
            </div>

            <form action={updateComponentStorage} className="grid gap-6 px-6 py-6">
              <input
                name="component_id"
                type="hidden"
                value={storageComponent.id}
              />
              <input name="return_to" type="hidden" value={closeStorageHref} />

              <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                <div>
                  <h3 className="font-semibold">Lagerort der Komponente</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Dieser Lagerort gehoert zum einzelnen Geraet und ist
                    unabhaengig vom Lagerort des Sets.
                  </p>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Lagerort
                  <input
                    className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={storageComponent.storage_label ?? ""}
                    name="storage_label"
                    placeholder="z. B. W2 - 24, Schrank1 oder Regal1"
                  />
                </label>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Aktuelles Set</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSet(storageAssignment)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Set-Lagerort</dt>
                    <dd className="mt-1 font-semibold">
                      {storageAssignment?.set?.storage_label ?? "-"}
                    </dd>
                  </div>
                </dl>
              </section>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-4">
                <Link
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={closeStorageHref}
                >
                  Abbrechen
                </Link>
                <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                  Lagerort speichern
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
