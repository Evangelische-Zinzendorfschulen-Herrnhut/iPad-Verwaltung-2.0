import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { releaseReturnedSet } from "../actions/release-set";
import { SectionTabs } from "../section-tabs";
import DamageNewPage from "./[setId]/damage/new/page";
import {
  PersonSelectionList,
  type PersonSelectionOption,
} from "./person-selection-list";
import { SetsFilterForm } from "./sets-filter-form";
import { SetsTable, type SetsTableRow } from "./sets-table";

export const metadata: Metadata = {
  title: "Sets | iPad-Verwaltung",
};

type InventorySetRow = {
  id: string;
  legacy_set_id: number;
  condition: string;
  availability: string;
  legacy_status: string | null;
  storage_label: string | null;
  marker: string | null;
  assigned_person_id: string | null;
  assigned_person: PersonAssignmentRow["person"] | PersonAssignmentRow["person"][];
};

type ComponentAssignmentRow = {
  set_id: string;
  role: string;
  component: {
    id: string;
    legacy_inventory_number: string;
    category: string;
    model: string | null;
    serial_number: string | null;
    condition: string;
    legacy_status: string | null;
  } | null;
};

type RawComponentAssignmentRow = Omit<ComponentAssignmentRow, "component"> & {
  component: ComponentAssignmentRow["component"] | ComponentAssignmentRow["component"][];
};

type PersonAssignmentRow = {
  id: string;
  set_id: string;
  issued_at: string | null;
  returned_at?: string | null;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
};

type RawPersonAssignmentRow = Omit<PersonAssignmentRow, "person"> & {
  person: PersonAssignmentRow["person"] | PersonAssignmentRow["person"][];
};

type PersonClassAssignmentRow = {
  person_id: string;
  school_class: {
    grade_level: number | null;
    label: string;
  } | null;
};

type RawPersonClassAssignmentRow = Omit<
  PersonClassAssignmentRow,
  "school_class"
> & {
  school_class:
    | PersonClassAssignmentRow["school_class"]
    | PersonClassAssignmentRow["school_class"][];
};

type SupplementalAssignmentRow = {
  id: string;
  item_type: string;
  label: string | null;
  quantity: number;
  set_id: string;
};

type SchoolClassOptionRow = {
  id: string;
  label: string;
  grade_level: number | null;
};

type PersonOptionRow = {
  id: string;
  legacy_user_id: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  person_type: string;
};

type SetSort = "set" | "person" | "first_name" | "class";

const PAGE_SIZE = 50;
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

function getPageParam(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = Number.parseInt(getSingleParam(searchParams, "page"), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

const SET_LIST_FILTER_PARAMS = [
  "q",
  "setId",
  "availability",
  "condition",
  "class",
  "sort",
] as const;

const SET_LIST_FILTER_AND_PAGE_PARAMS = [
  ...SET_LIST_FILTER_PARAMS,
  "page",
] as const;

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildDamageHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("damage", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseDamageHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildDetailHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("detail", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseDetailHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildIssueHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("issue", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseIssueHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildProblemHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("problem", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseProblemHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildReturnHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("return", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseReturnHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
}

function buildStorageHref(
  params: Record<string, string | string[] | undefined>,
  setId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("storage", setId);
  return `/sets?${nextParams.toString()}`;
}

function buildCloseStorageHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of SET_LIST_FILTER_AND_PAGE_PARAMS) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/sets?${queryString}` : "/sets";
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

function normalizeCheckbox(value: FormDataEntryValue | null) {
  return value === "on";
}

function personTypeLabel(value: string) {
  const labels: Record<string, string> = {
    lehrer: "Lehrer",
    mitarbeiter: "Mitarbeiter",
    praktikant: "Praktikant",
    referendar: "Referendar",
    schueler: "Schüler",
  };

  return labels[value] ?? value;
}

function formatPerson(
  person: PersonAssignmentRow["person"],
  schoolClassLabel?: string,
) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  const label = name || person.email || "-";
  const suffix =
    person.person_type === "schueler"
      ? schoolClassLabel
      : personTypeLabel(person.person_type);

  return suffix ? `${label} (${suffix})` : label;
}

function componentLabel(component: ComponentAssignmentRow["component"]) {
  if (!component) {
    return "-";
  }

  const model = component.model ? ` · ${component.model}` : "";
  return `${component.legacy_inventory_number}${model}`;
}

function deriveSetCondition(
  storedCondition: string,
  components: Map<string, ComponentAssignmentRow> | undefined,
) {
  const requiredComponents = ["ipad", "pencil", "keyboard"]
    .map((role) => components?.get(role)?.component ?? null);

  if (requiredComponents.some((component) => !component)) {
    return "unvollständig";
  }

  if (requiredComponents.some((component) => component?.condition === "defekt")) {
    return "defekt";
  }

  if (requiredComponents.some((component) => component?.condition === "unklar")) {
    return "unklar";
  }

  return storedCondition === "unklar" ? "ok" : storedCondition;
}

function pencilAccessory(component: ComponentAssignmentRow["component"]) {
  const model = component?.model?.toLocaleLowerCase("de-DE") ?? "";

  if (model.includes("tucano")) {
    return {
      fieldValue: "usb_c_cable",
      label: "USB-C-Ladekabel",
      required: true,
    };
  }

  if (
    model.includes("apple pencil") &&
    !model.includes("2") &&
    !model.includes("usb-c")
  ) {
    return {
      fieldValue: "cap",
      label: "Pencil-Kappe",
      required: true,
    };
  }

  return {
    fieldValue: "none",
    label: "Pencil-Zubehör",
    required: false,
  };
}

function supplementalLabel(assignment: SupplementalAssignmentRow) {
  const labels: Record<string, string> = {
    hdmi_cable: "HDMI-Kabel",
    other: "Zusatzmaterial",
  };
  const label = assignment.label || labels[assignment.item_type] || assignment.item_type;

  return assignment.quantity > 1 ? `${label} (${assignment.quantity}x)` : label;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: number | string | null | undefined;
}) {
  const usesInventoryFont = [
    "Adapter",
    "iPad",
    "Pencil",
    "Tastatur",
  ].includes(label);

  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm font-medium text-zinc-900 ${
          usesInventoryFont ? "inventory-number" : ""
        }`}
      >
        {value === null || value === undefined || value === "" ? "-" : value}
      </dd>
    </div>
  );
}

function deriveAvailability(
  set: InventorySetRow,
  person: PersonAssignmentRow["person"],
  schoolClass?: PersonClassAssignmentRow["school_class"],
  assignment?: PersonAssignmentRow,
) {
  if (!person) {
    return set.availability;
  }

  if (assignment && !assignment.issued_at) {
    return set.availability;
  }

  if (person.person_type === "schueler") {
    return schoolClass?.grade_level && schoolClass.grade_level <= 6
      ? "zugeordnet"
      : "ausgegeben";
  }

  return "ausgegeben";
}

function getSortParam(
  searchParams: Record<string, string | string[] | undefined>,
): SetSort {
  const sort = getSingleParam(searchParams, "sort");

  if (sort === "person" || sort === "first_name" || sort === "class") {
    return sort;
  }

  return "set";
}

function personSortLabel(person: PersonAssignmentRow["person"]) {
  if (!person) {
    return "";
  }

  return [person.last_name, person.first_name, person.email]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

function personFirstNameSortLabel(person: PersonAssignmentRow["person"]) {
  if (!person) {
    return "";
  }

  return [person.first_name, person.last_name, person.email]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
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

async function returnSet(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const assignmentId = normalizeRequiredText(formData.get("assignment_id"));
  const setId = normalizeRequiredText(formData.get("set_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";
  const returnedAt =
    normalizeRequiredText(formData.get("returned_at")) ||
    new Date().toISOString().slice(0, 10);
  const storageLabel = normalizeOptionalText(formData.get("storage_label"));
  const returnNote = normalizeOptionalText(formData.get("return_note"));
  const returnDefects = normalizeOptionalText(formData.get("return_defects"));
  const returnResolutions = normalizeOptionalText(
    formData.get("return_resolutions"),
  );
  const ipadPresent = normalizeCheckbox(formData.get("return_ipad_present"));
  const powerAdapterPresent = normalizeCheckbox(
    formData.get("return_power_adapter_present"),
  );
  const chargingCablePresent = normalizeCheckbox(
    formData.get("return_charging_cable_present"),
  );
  const pencilPresent = normalizeCheckbox(formData.get("return_pencil_present"));
  const pencilCapPresent = normalizeCheckbox(
    formData.get("return_pencil_cap_present"),
  );
  const pencilAccessoryKind =
    normalizeRequiredText(formData.get("pencil_accessory_kind")) || "none";
  const keyboardPresent = normalizeCheckbox(
    formData.get("return_keyboard_present"),
  );
  const hasAdapter = normalizeCheckbox(formData.get("has_return_adapter"));
  const hasHdmi = normalizeCheckbox(formData.get("has_return_hdmi"));
  const adapterReturned = normalizeCheckbox(formData.get("return_adapter_present"));
  const hdmiReturned = normalizeCheckbox(formData.get("return_hdmi_present"));
  const hdmiAssignmentId = normalizeRequiredText(
    formData.get("hdmi_assignment_id"),
  );
  const missingRequiredParts = [
    ipadPresent,
    powerAdapterPresent,
    chargingCablePresent,
    pencilPresent,
    pencilAccessoryKind === "none" ? true : pencilCapPresent,
    keyboardPresent,
  ].some((present) => !present);
  const supplementalNotes = [
    hasAdapter
      ? `Adapter zurückgegeben: ${adapterReturned ? "ja" : "nein"}`
      : null,
    hasHdmi ? `HDMI-Kabel zurückgegeben: ${hdmiReturned ? "ja" : "nein"}` : null,
  ];
  const combinedNote = [returnNote, ...supplementalNotes]
    .filter(Boolean)
    .join("\n");

  if (!assignmentId || !setId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("set_person_assignment")
    .select("id,set_id")
    .eq("id", assignmentId)
    .eq("set_id", setId)
    .is("returned_at", null)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    redirect(returnTo);
  }

  const { error: returnError } = await supabase
    .from("set_person_assignment")
    .update({
      return_charging_cable_present: chargingCablePresent,
      return_defects: returnDefects,
      return_ipad_present: ipadPresent,
      return_keyboard_present: keyboardPresent,
      return_note: combinedNote || null,
      return_pencil_cap_present: pencilCapPresent,
      return_pencil_present: pencilPresent,
      return_power_adapter_present: powerAdapterPresent,
      return_resolutions: returnResolutions,
      returned_at: returnedAt,
    })
    .eq("id", assignmentId)
    .is("returned_at", null);

  if (returnError) {
    throw returnError;
  }

  const { error: setError } = await supabase
    .from("inventory_set")
    .update({
      assigned_person_id: null,
      availability: "blockiert",
      condition: missingRequiredParts ? "unvollständig" : "ok",
      legacy_user_id: null,
      storage_label: storageLabel,
    })
    .eq("id", setId);

  if (setError) {
    throw setError;
  }

  if (hasHdmi && hdmiAssignmentId && hdmiReturned) {
    const { error: supplementalError } = await supabase
      .from("set_supplemental_assignment")
      .update({ returned_at: returnedAt })
      .eq("id", hdmiAssignmentId)
      .eq("set_id", setId)
      .eq("item_type", "hdmi_cable")
      .is("returned_at", null);

    if (supplementalError) {
      throw supplementalError;
    }
  }

  redirect(returnTo);
}

async function updateSetStorage(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";
  const storageLabel = normalizeOptionalText(formData.get("storage_label"));

  if (!setId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_set")
    .update({ storage_label: storageLabel })
    .eq("id", setId);

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

async function issueSet(formData: FormData) {
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
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";
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

  if (setError) {
    throw setError;
  }

  if (personError) {
    throw personError;
  }

  if (activeAssignmentError) {
    throw activeAssignmentError;
  }

  if (componentAssignmentsError) {
    throw componentAssignmentsError;
  }

  if (!set || !person || person.status !== "aktiv" || activeAssignment) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_invalid`);
  }

  const requiredRoles = new Set(["ipad", "pencil", "keyboard"]);
  const blockingConditions = new Set(["defekt", "gesperrt_kein_mdm"]);
  const validComponents = (componentAssignments ?? []).filter((assignment) => {
    const component = Array.isArray(assignment.component)
      ? assignment.component[0]
      : assignment.component;

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
    "Vorbereitung zur Ausgabe über Set-Liste.",
  ]
    .filter(Boolean)
    .join("\n");

  const { error: insertError } = await supabase
    .from("set_person_assignment")
    .insert({
      issued_at: null,
      issue_note: combinedNote || null,
      legacy_assignment_id: nextLegacyAssignmentId,
      legacy_status: "prepared_issue",
      legacy_user_id: person.legacy_user_id ?? 0,
      person_id: personId,
      set_id: setId,
    });

  if (insertError) {
    throw insertError;
  }

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

  if (updateSetError) {
    throw updateSetError;
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}prepared=1`);
}

async function createTaskForSet(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const target = normalizeRequiredText(formData.get("target")) || "set";
  const title = normalizeRequiredText(formData.get("title"));
  const description = normalizeOptionalText(formData.get("description"));
  const priority =
    normalizeRequiredText(formData.get("priority")) === "hoch"
      ? "hoch"
      : "normal";
  const dueDate = normalizeOptionalText(formData.get("due_date"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";

  if (!setId || !title) {
    redirect(returnTo);
  }

  const supabase = await createClient();

  if (target === "set") {
    const { data: set, error: setError } = await supabase
      .from("inventory_set")
      .select("id")
      .eq("id", setId)
      .maybeSingle();

    if (setError) {
      throw setError;
    }

    if (!set) {
      redirect(returnTo);
    }

    const { error } = await supabase.from("task").insert({
      created_by_user_id: appUser.id,
      description,
      due_date: dueDate,
      priority,
      related_object_id: setId,
      related_object_type: "set",
      title,
    });

    if (error) {
      throw error;
    }

    redirect(returnTo);
  }

  const componentId = target.startsWith("component:")
    ? target.slice("component:".length)
    : "";

  if (!componentId) {
    redirect(returnTo);
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("set_component_assignment")
    .select("id")
    .eq("set_id", setId)
    .eq("component_id", componentId)
    .is("valid_until", null)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    redirect(returnTo);
  }

  const { error } = await supabase.from("task").insert({
    created_by_user_id: appUser.id,
    description,
    due_date: dueDate,
    priority,
    related_object_id: componentId,
    related_object_type: "komponente",
    title,
  });

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

async function completeSetIssue(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const setId = normalizeRequiredText(formData.get("set_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/sets";
  const issuedAt =
    normalizeRequiredText(formData.get("issued_at")) ||
    new Date().toISOString().slice(0, 10);
  const issueNote = normalizeOptionalText(formData.get("issue_note"));

  if (!setId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const [
    { data: set, error: setError },
    { data: assignment, error: assignmentError },
  ] = await Promise.all([
    supabase
      .from("inventory_set")
      .select("id,availability,condition,assigned_person_id")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("set_person_assignment")
      .select("id,issue_note,person:person_id(id,legacy_user_id,status)")
      .eq("set_id", setId)
      .is("returned_at", null)
      .is("issued_at", null)
      .maybeSingle(),
  ]);

  if (setError) {
    throw setError;
  }

  if (assignmentError) {
    throw assignmentError;
  }

  const assignmentPerson = Array.isArray(assignment?.person)
    ? assignment?.person[0]
    : assignment?.person;

  if (
    !set ||
    !assignment ||
    !assignmentPerson ||
    assignmentPerson.status !== "aktiv" ||
    set.availability !== "zugeordnet" ||
    !["ok", "beschädigt_nutzbar"].includes(set.condition)
  ) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=issue_invalid`);
  }

  const combinedNote = [
    assignment.issue_note,
    issueNote,
    `Tatsächliche Ausgabe am ${issuedAt} über Set-Liste.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { error: assignmentUpdateError } = await supabase
    .from("set_person_assignment")
    .update({
      issued_at: issuedAt,
      issue_note: combinedNote || null,
      legacy_status: "manual_issue",
      legacy_user_id: assignmentPerson.legacy_user_id ?? 0,
    })
    .eq("id", assignment.id)
    .is("returned_at", null)
    .is("issued_at", null);

  if (assignmentUpdateError) {
    throw assignmentUpdateError;
  }

  const { error: setUpdateError } = await supabase
    .from("inventory_set")
    .update({
      availability: "ausgegeben",
      legacy_user_id: assignmentPerson.legacy_user_id,
      notes: combinedNote || null,
      storage_label: null,
    })
    .eq("id", setId);

  if (setUpdateError) {
    throw setUpdateError;
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}issued=1`);
}

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = getSingleParam(params, "q").trim();
  const setIdQuery = getSingleParam(params, "setId").trim();
  const availabilityFilter = getSingleParam(params, "availability");
  const conditionFilter = getSingleParam(params, "condition");
  const classFilter = getSingleParam(params, "class");
  const damageSetId = getSingleParam(params, "damage");
  const detailSetId = getSingleParam(params, "detail");
  const issueSetId = getSingleParam(params, "issue");
  const problemSetId = getSingleParam(params, "problem");
  const returnSetId = getSingleParam(params, "return");
  const storageSetId = getSingleParam(params, "storage");
  const sort = getSortParam(params);
  const page = getPageParam(params);
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "readonly"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const canManageSets = hasAnyRole(appUser, ["admin", "ipad_verwaltung"]);
  const canEditSetStorage = canManageSets;
  const [{ data: classOptionData }, { data: personOptionData }] = await Promise.all([
    supabase
      .from("school_class")
      .select("id,label,grade_level")
      .eq("active", true)
      .order("grade_level", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    canManageSets
      ? supabase
          .from("person")
          .select("id,legacy_user_id,first_name,last_name,email,person_type")
          .eq("status", "aktiv")
          .order("last_name", { ascending: true, nullsFirst: false })
          .order("first_name", { ascending: true, nullsFirst: false })
          .limit(5000)
      : Promise.resolve({ data: [] }),
  ]);
  const classOptions = (classOptionData ?? []) as SchoolClassOptionRow[];
  const personOptions = (personOptionData ?? []) as PersonOptionRow[];
  const personOptionClassByPersonId = new Map<string, string>();

  for (const personIdBatch of chunkValues(
    personOptions.map((person) => person.id),
  )) {
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
  let setQuery = supabase
    .from("inventory_set")
    .select(
      "id,legacy_set_id,condition,availability,legacy_status,storage_label,marker,assigned_person_id,assigned_person:assigned_person_id(id,first_name,last_name,email,person_type)",
    );

  const requiredSetIdsByFilter: string[][] = [];

  if (setIdQuery) {
    const numericSetId = Number.parseInt(setIdQuery, 10);
    const matchingSetIds = new Set<string>();

    if (Number.isInteger(numericSetId)) {
      const { data: matchingSetsById, error: matchingSetsByIdError } =
        await supabase
          .from("inventory_set")
          .select("id")
          .eq("legacy_set_id", numericSetId);

      if (matchingSetsByIdError) {
        throw matchingSetsByIdError;
      }

      for (const set of matchingSetsById ?? []) {
        matchingSetIds.add(set.id);
      }
    }

    requiredSetIdsByFilter.push([...matchingSetIds]);
  }

  if (query) {
    const matchingSetIds = new Set<string>();

    const { data: matchingComponents } = await supabase
      .from("inventory_component")
      .select("id")
      .ilike("legacy_inventory_number", `%${query}%`);
    const matchingComponentIds = (matchingComponents ?? []).map(
      (component) => component.id,
    );

    if (matchingComponentIds.length > 0) {
      const matchingComponentAssignments = [];

      for (const componentIdBatch of chunkValues(matchingComponentIds)) {
        const { data, error } = await supabase
          .from("set_component_assignment")
          .select("set_id")
          .is("valid_until", null)
          .in("component_id", componentIdBatch);

        if (error) {
          throw error;
        }

        matchingComponentAssignments.push(...(data ?? []));
      }

      for (const assignment of matchingComponentAssignments) {
        if (assignment.set_id) {
          matchingSetIds.add(assignment.set_id);
        }
      }
    }

    const { data: matchingPeople } = await supabase
      .from("person")
      .select("id")
      .or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`,
      );
    const matchingPersonIds = (matchingPeople ?? []).map((person) => person.id);

    if (matchingPersonIds.length > 0) {
      const matchingPersonAssignments = [];
      const matchingAssignedSets = [];

      for (const personIdBatch of chunkValues(matchingPersonIds)) {
        const [
          currentAssignmentsResult,
          assignedSetsResult,
        ] = await Promise.all([
          supabase
            .from("set_person_assignment")
            .select("set_id")
            .in("person_id", personIdBatch),
          supabase
            .from("inventory_set")
            .select("id")
            .in("assigned_person_id", personIdBatch),
        ]);

        if (currentAssignmentsResult.error) {
          throw currentAssignmentsResult.error;
        }

        if (assignedSetsResult.error) {
          throw assignedSetsResult.error;
        }

        matchingPersonAssignments.push(...(currentAssignmentsResult.data ?? []));
        matchingAssignedSets.push(...(assignedSetsResult.data ?? []));
      }

      for (const assignment of matchingPersonAssignments) {
        if (assignment.set_id) {
          matchingSetIds.add(assignment.set_id);
        }
      }

      for (const set of matchingAssignedSets) {
        if (set.id) {
          matchingSetIds.add(set.id);
        }
      }
    }

    requiredSetIdsByFilter.push([...matchingSetIds]);
  }

  if (classFilter) {
    const selectedClass = classOptions.find(
      (schoolClass) => schoolClass.label === classFilter,
    );
    const matchingClassSetIds = new Set<string>();

    if (selectedClass) {
      const { data: matchingClassAssignments } = await supabase
        .from("person_class_assignment")
        .select("person_id")
        .is("valid_until", null)
        .eq("school_class_id", selectedClass.id);
      const matchingClassPersonIds = (matchingClassAssignments ?? []).map(
        (assignment) => assignment.person_id,
      );

      if (matchingClassPersonIds.length > 0) {
        const matchingSetAssignments = [];
        const matchingAssignedSets = [];

        for (const personIdBatch of chunkValues(matchingClassPersonIds)) {
          const [
            currentAssignmentsResult,
            assignedSetsResult,
          ] = await Promise.all([
            supabase
              .from("set_person_assignment")
              .select("set_id")
              .is("returned_at", null)
              .in("person_id", personIdBatch),
            supabase
              .from("inventory_set")
              .select("id")
              .in("assigned_person_id", personIdBatch),
          ]);

          if (currentAssignmentsResult.error) {
            throw currentAssignmentsResult.error;
          }

          if (assignedSetsResult.error) {
            throw assignedSetsResult.error;
          }

          matchingSetAssignments.push(...(currentAssignmentsResult.data ?? []));
          matchingAssignedSets.push(...(assignedSetsResult.data ?? []));
        }

        for (const assignment of matchingSetAssignments) {
          if (assignment.set_id) {
            matchingClassSetIds.add(assignment.set_id);
          }
        }

        for (const set of matchingAssignedSets) {
          if (set.id) {
            matchingClassSetIds.add(set.id);
          }
        }
      }
    }

    requiredSetIdsByFilter.push([...matchingClassSetIds]);
  }

  for (const requiredSetIds of requiredSetIdsByFilter) {
    setQuery = requiredSetIds.length
      ? setQuery.in("id", requiredSetIds)
      : setQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (conditionFilter) {
    setQuery = setQuery.eq("condition", conditionFilter);
  }

  const [
    setsResult,
    setCountResult,
    componentCountResult,
    currentAssignmentCountResult,
  ] = await Promise.all([
    setQuery.order("legacy_set_id", { ascending: true }).limit(1000),
    supabase.from("inventory_set").select("id", { count: "exact", head: true }),
    supabase
      .from("inventory_component")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("set_person_assignment")
      .select("id", { count: "exact", head: true })
      .is("returned_at", null)
      .not("issued_at", "is", null),
  ]);

  const candidateSets = (setsResult.data ?? []) as InventorySetRow[];
  const candidateSetIds = candidateSets.map((set) => set.id);
  const rawPersonAssignments: RawPersonAssignmentRow[] = [];

  for (const setIdBatch of chunkValues(candidateSetIds)) {
    const { data, error } = await supabase
      .from("set_person_assignment")
      .select(
        "id,set_id,issued_at,person:person_id(id,first_name,last_name,email,person_type)",
      )
      .is("returned_at", null)
      .in("set_id", setIdBatch);

    if (error) {
      throw error;
    }

    rawPersonAssignments.push(...((data ?? []) as RawPersonAssignmentRow[]));
  }

  const personAssignments = rawPersonAssignments.map((assignment) => ({
    ...assignment,
    person: Array.isArray(assignment.person)
      ? (assignment.person[0] ?? null)
      : assignment.person,
  }));
  const personBySetId = new Map<string, PersonAssignmentRow["person"]>();
  const currentAssignmentBySetId = new Map<string, PersonAssignmentRow>();

  for (const assignment of personAssignments) {
    personBySetId.set(assignment.set_id, assignment.person);
    currentAssignmentBySetId.set(assignment.set_id, assignment);
  }

  for (const set of candidateSets) {
    if (!personBySetId.has(set.id)) {
      personBySetId.set(set.id, normalizeJoined(set.assigned_person));
    }
  }

  const visiblePersonIds = [
    ...new Set(
      personAssignments
        .map((assignment) => assignment.person?.id)
        .concat(
          candidateSets.map(
            (set) => normalizeJoined(set.assigned_person)?.id,
          ),
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rawClassAssignments: RawPersonClassAssignmentRow[] = [];

  for (const personIdBatch of chunkValues(visiblePersonIds)) {
    const { data, error } = await supabase
      .from("person_class_assignment")
      .select("person_id,school_class:school_class_id(label,grade_level)")
      .is("valid_until", null)
      .in("person_id", personIdBatch);

    if (error) {
      throw error;
    }

    rawClassAssignments.push(
      ...((data ?? []) as RawPersonClassAssignmentRow[]),
    );
  }

  const classAssignments = rawClassAssignments.map((assignment) => ({
    ...assignment,
    school_class: Array.isArray(assignment.school_class)
      ? (assignment.school_class[0] ?? null)
      : assignment.school_class,
  }));
  const classByPersonId = new Map<string, string>();
  const classDetailByPersonId = new Map<
    string,
    PersonClassAssignmentRow["school_class"]
  >();

  for (const assignment of classAssignments) {
    if (assignment.school_class?.label) {
      classByPersonId.set(assignment.person_id, assignment.school_class.label);
      classDetailByPersonId.set(assignment.person_id, assignment.school_class);
    }
  }

  const filteredSets = availabilityFilter
    ? candidateSets.filter((set) => {
        const person = personBySetId.get(set.id) ?? null;
        const schoolClass = person
          ? classDetailByPersonId.get(person.id)
          : undefined;

        const currentAssignment = currentAssignmentBySetId.get(set.id);

        return (
          deriveAvailability(set, person, schoolClass, currentAssignment) ===
          availabilityFilter
        );
      })
    : candidateSets;
  const sortedSets = [...filteredSets].sort((firstSet, secondSet) => {
    if (sort === "person") {
      const personComparison = personSortLabel(
        personBySetId.get(firstSet.id) ?? null,
      ).localeCompare(
        personSortLabel(personBySetId.get(secondSet.id) ?? null),
        "de-DE",
        { numeric: true },
      );

      return personComparison || firstSet.legacy_set_id - secondSet.legacy_set_id;
    }

    if (sort === "first_name") {
      const personComparison = personFirstNameSortLabel(
        personBySetId.get(firstSet.id) ?? null,
      ).localeCompare(
        personFirstNameSortLabel(personBySetId.get(secondSet.id) ?? null),
        "de-DE",
        { numeric: true },
      );

      return personComparison || firstSet.legacy_set_id - secondSet.legacy_set_id;
    }

    if (sort === "class") {
      const firstPerson = personBySetId.get(firstSet.id) ?? null;
      const secondPerson = personBySetId.get(secondSet.id) ?? null;
      const firstClass = firstPerson
        ? (classByPersonId.get(firstPerson.id) ?? "")
        : "";
      const secondClass = secondPerson
        ? (classByPersonId.get(secondPerson.id) ?? "")
        : "";
      const classComparison = firstClass.localeCompare(secondClass, "de-DE", {
        numeric: true,
      });

      return (
        classComparison ||
        personSortLabel(firstPerson).localeCompare(
          personSortLabel(secondPerson),
          "de-DE",
          { numeric: true },
        ) ||
        firstSet.legacy_set_id - secondSet.legacy_set_id
      );
    }

    return firstSet.legacy_set_id - secondSet.legacy_set_id;
  });
  const filteredCount = sortedSets.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;
  const sets = sortedSets.slice(rangeStart, rangeEnd);
  const setIds = sets.map((set) => set.id);
  const componentAssignmentsResult =
    setIds.length > 0
      ? await supabase
        .from("set_component_assignment")
        .select("set_id,role,component:component_id(id,legacy_inventory_number,category,model,serial_number,condition,legacy_status)")
          .is("valid_until", null)
          .in("set_id", setIds)
      : { data: [] };
  const supplementalAssignmentsResult =
    setIds.length > 0
      ? await supabase
          .from("set_supplemental_assignment")
          .select("id,set_id,item_type,quantity,label")
          .is("returned_at", null)
          .in("set_id", setIds)
      : { data: [] };
  const rawPreviousPersonAssignments: RawPersonAssignmentRow[] = [];

  for (const setIdBatch of chunkValues(setIds)) {
    const { data, error } = await supabase
      .from("set_person_assignment")
      .select(
        "id,set_id,issued_at,returned_at,person:person_id(id,first_name,last_name,email,person_type)",
      )
      .not("returned_at", "is", null)
      .in("set_id", setIdBatch)
      .order("returned_at", { ascending: false });

    if (error) {
      throw error;
    }

    rawPreviousPersonAssignments.push(
      ...((data ?? []) as RawPersonAssignmentRow[]),
    );
  }

  const previousPersonBySetId = new Map<string, PersonAssignmentRow["person"]>();

  for (const assignment of rawPreviousPersonAssignments) {
    if (previousPersonBySetId.has(assignment.set_id)) {
      continue;
    }

    previousPersonBySetId.set(
      assignment.set_id,
      Array.isArray(assignment.person)
        ? (assignment.person[0] ?? null)
        : assignment.person,
    );
  }

  const componentAssignments = (
    (componentAssignmentsResult.data ?? []) as RawComponentAssignmentRow[]
  ).map((assignment) => ({
    ...assignment,
    component: Array.isArray(assignment.component)
      ? (assignment.component[0] ?? null)
      : assignment.component,
  }));
  const componentsBySetId = new Map<string, Map<string, ComponentAssignmentRow>>();

  for (const assignment of componentAssignments) {
    if (!componentsBySetId.has(assignment.set_id)) {
      componentsBySetId.set(assignment.set_id, new Map());
    }

    componentsBySetId.get(assignment.set_id)?.set(assignment.role, assignment);
  }
  const supplementalBySetId = new Map<string, SupplementalAssignmentRow[]>();

  for (const assignment of (supplementalAssignmentsResult.data ??
    []) as SupplementalAssignmentRow[]) {
    if (!supplementalBySetId.has(assignment.set_id)) {
      supplementalBySetId.set(assignment.set_id, []);
    }

    supplementalBySetId.get(assignment.set_id)?.push(assignment);
  }

  const displayedFrom = filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayedTo = Math.min(currentPage * PAGE_SIZE, filteredCount);
  const hasActiveFilters = Boolean(
    query || setIdQuery || availabilityFilter || conditionFilter || classFilter,
  );
  const setRows: SetsTableRow[] = sets.map((set) => {
    const components = componentsBySetId.get(set.id);
    const ipad = components?.get("ipad")?.component ?? null;
    const pencil = components?.get("pencil")?.component ?? null;
    const keyboard = components?.get("keyboard")?.component ?? null;
    const person = personBySetId.get(set.id) ?? null;
    const currentAssignment = currentAssignmentBySetId.get(set.id);
    const schoolClass = person ? classDetailByPersonId.get(person.id) : undefined;
    const availability = deriveAvailability(set, person, schoolClass, currentAssignment);
    const isPreparedIssue = Boolean(currentAssignment && !currentAssignment.issued_at);
    const previousPerson = previousPersonBySetId.get(set.id) ?? null;
    const condition = deriveSetCondition(set.condition, components);
    const componentOptions = ["ipad", "pencil", "keyboard", "adapter"]
      .map((role) => {
        const component = components?.get(role)?.component ?? null;

        if (!component) {
          return null;
        }

        const labels: Record<string, string> = {
          adapter: "Adapter",
          ipad: "iPad",
          keyboard: "Tastatur",
          pencil: "Pencil",
        };

        return {
          id: component.id,
          label: `${labels[role] ?? role}: ${componentLabel(component)}`,
          role,
        };
      })
      .filter(
        (component): component is {
          id: string;
          label: string;
          role: string;
        } => Boolean(component),
      );

    return {
      availability,
      components: componentOptions,
      condition,
      damageHref:
        availability === "ausgegeben" || availability === "frei"
          ? buildDamageHref(params, set.id)
          : null,
      devicesHref: `/geraete?set=${set.legacy_set_id}`,
      detailHref: buildDetailHref(params, set.id),
      id: set.id,
      ipad: componentLabel(ipad),
      ipadMdmHref: ipad?.serial_number
        ? `https://mdm.evssn.de/#/devices/inventory?page=0&limit=100&search=${encodeURIComponent(ipad.serial_number)}`
        : null,
      issueHref:
        canManageSets &&
        (availability === "frei" || isPreparedIssue) &&
        condition === "ok"
          ? buildIssueHref(params, set.id)
          : null,
      issueLabel: isPreparedIssue ? "Set ausgeben" : "Set vorbereiten",
      keyboard: componentLabel(keyboard),
      legacySetId: set.legacy_set_id,
      legacyStatus: set.legacy_status,
      pencil: componentLabel(pencil),
      person: formatPerson(
        person,
        person ? classByPersonId.get(person.id) : undefined,
      ),
      previousPerson:
        (availability === "frei" || availability === "blockiert") && previousPerson
          ? formatPerson(previousPerson)
          : null,
      problemHref:
        availability === "ausgegeben" || availability === "frei"
          ? buildProblemHref(params, set.id)
          : null,
      releaseReturnTo: buildCloseStorageHref(params),
      releasable: canEditSetStorage && availability === "blockiert" && set.condition === "ok",
      returnProtocolHref: currentAssignment
        ? null
        : `/sets/${set.id}/return-protocol`,
      returnSetHref:
        person && currentAssignment && currentAssignment.issued_at
          ? buildReturnHref(params, set.id)
          : null,
      storageHref:
        canEditSetStorage && availability !== "ausgegeben"
          ? buildStorageHref(params, set.id)
          : null,
      storageLabel: set.storage_label || "-",
    };
  });
  const setToShowDetail = sets.find((set) => set.id === detailSetId) ?? null;
  const setToIssue = sets.find((set) => set.id === issueSetId) ?? null;
  const setToReturn = sets.find((set) => set.id === returnSetId) ?? null;
  const setToEditStorage = sets.find((set) => set.id === storageSetId) ?? null;
  const assignmentToIssue = setToIssue
    ? currentAssignmentBySetId.get(setToIssue.id)
    : undefined;
  const personToIssue = setToIssue
    ? (personBySetId.get(setToIssue.id) ?? null)
    : null;
  const isPreparedIssue = Boolean(assignmentToIssue && !assignmentToIssue.issued_at);
  const assignmentToReturn = setToReturn
    ? currentAssignmentBySetId.get(setToReturn.id)
    : undefined;
  const personToReturn = setToReturn
    ? (personBySetId.get(setToReturn.id) ?? null)
    : null;
  const classToReturn =
    personToReturn && classByPersonId.has(personToReturn.id)
      ? classByPersonId.get(personToReturn.id)
      : undefined;
  const componentsToReturn = setToReturn
    ? componentsBySetId.get(setToReturn.id)
    : undefined;
  const supplementalToReturn = setToReturn
    ? (supplementalBySetId.get(setToReturn.id) ?? [])
    : [];
  const pencilToReturn = componentsToReturn?.get("pencil")?.component ?? null;
  const pencilAccessoryToReturn = pencilAccessory(pencilToReturn);
  const returnCloseHref = buildCloseReturnHref(params);
  const storageCloseHref = buildCloseStorageHref(params);
  const detailCloseHref = buildCloseDetailHref(params);
  const issueCloseHref = buildCloseIssueHref(params);
  const personToShowDetail = setToShowDetail
    ? (personBySetId.get(setToShowDetail.id) ?? null)
    : null;
  const classToShowDetail =
    personToShowDetail && classByPersonId.has(personToShowDetail.id)
      ? classByPersonId.get(personToShowDetail.id)
      : undefined;
  const previousPersonToShowDetail = setToShowDetail
    ? (previousPersonBySetId.get(setToShowDetail.id) ?? null)
    : null;
  const detailComponents = setToShowDetail
    ? componentsBySetId.get(setToShowDetail.id)
    : undefined;
  const detailSupplemental = setToShowDetail
    ? (supplementalBySetId.get(setToShowDetail.id) ?? [])
    : [];
  const issueComponents = setToIssue
    ? componentsBySetId.get(setToIssue.id)
    : undefined;
  const detailAvailability = setToShowDetail
    ? deriveAvailability(
        setToShowDetail,
        personToShowDetail,
        personToShowDetail
          ? classDetailByPersonId.get(personToShowDetail.id)
          : undefined,
      )
    : null;
  const returnDateDefault = new Date().toISOString().slice(0, 10);
  const issueDateDefault = returnDateDefault;
  const returnSupplementalComponents = [
    componentsToReturn?.get("adapter")?.component
      ? {
          assignmentId: null,
          field: "return_adapter_present",
          hasField: "has_return_adapter",
          idField: null,
          label: "Lightning-USB-Adapter",
          value: componentLabel(componentsToReturn.get("adapter")?.component ?? null),
        }
      : null,
    ...supplementalToReturn.map((assignment) => ({
      assignmentId: assignment.id,
      field:
        assignment.item_type === "hdmi_cable"
          ? "return_hdmi_present"
          : `return_supplemental_${assignment.id}`,
      hasField:
        assignment.item_type === "hdmi_cable"
          ? "has_return_hdmi"
          : `has_return_supplemental_${assignment.id}`,
      idField:
        assignment.item_type === "hdmi_cable" ? "hdmi_assignment_id" : null,
      label: supplementalLabel(assignment),
      value: "ohne Inventarnummer",
    })),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/">
              iPad-Verwaltung 2.0
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Sets und Komponenten
            </h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="sets" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Sets</p>
            <p className="mt-2 text-2xl font-semibold">{setCountResult.count ?? 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Komponenten</p>
            <p className="mt-2 text-2xl font-semibold">
              {componentCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aktuelle Ausgaben</p>
            <p className="mt-2 text-2xl font-semibold">
              {currentAssignmentCountResult.count ?? 0}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Set-Liste</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? `${displayedFrom}-${displayedTo} von ${filteredCount} Treffern angezeigt.`
                : `${displayedFrom}-${displayedTo} von ${setCountResult.count ?? 0} Sets angezeigt.`}
            </p>
          </div>

        <SetsFilterForm
          availability={availabilityFilter}
          classFilter={classFilter}
          classOptions={classOptions.map((schoolClass) => schoolClass.label)}
          condition={conditionFilter}
          hasActiveFilters={hasActiveFilters}
          key={`${query}:${setIdQuery}:${availabilityFilter}:${conditionFilter}:${classFilter}:${sort}`}
          query={query}
          setIdQuery={setIdQuery}
          sort={sort}
        />

          {sets.length > 0 ? (
            <SetsTable
              releaseAction={releaseReturnedSet}
              rows={setRows}
              taskAction={createTaskForSet}
            />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Sets fuer die aktuelle Auswahl gefunden.
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

        {setToShowDetail ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Set-Liste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Datensatz anzeigen
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Set {setToShowDetail.legacy_set_id}
                  </p>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={detailCloseHref}
                >
                  Schließen
                </Link>
              </div>

              <div className="grid gap-6 px-6 py-6">
                <section className="grid gap-3">
                  <h3 className="font-semibold">Set</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="Setnummer" value={setToShowDetail.legacy_set_id} />
                    <DetailField label="Verfügbarkeit" value={detailAvailability} />
                    <DetailField label="Zustand" value={setToShowDetail.condition} />
                    <DetailField label="Lagerort" value={setToShowDetail.storage_label} />
                    <DetailField label="Legacy-Status" value={setToShowDetail.legacy_status} />
                    <DetailField label="Marker" value={setToShowDetail.marker} />
                  </dl>
                </section>

                <section className="grid gap-3">
                  <h3 className="font-semibold">Person</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailField
                      label="Aktuelle Person"
                      value={formatPerson(personToShowDetail, classToShowDetail)}
                    />
                    <DetailField
                      label="Letzter Nutzer"
                      value={
                        personToShowDetail
                          ? null
                          : formatPerson(previousPersonToShowDetail)
                      }
                    />
                  </dl>
                </section>

                <section className="grid gap-3">
                  <h3 className="font-semibold">Komponenten</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailField
                      label="iPad"
                      value={componentLabel(detailComponents?.get("ipad")?.component ?? null)}
                    />
                    <DetailField
                      label="Pencil"
                      value={componentLabel(detailComponents?.get("pencil")?.component ?? null)}
                    />
                    <DetailField
                      label="Tastatur"
                      value={componentLabel(detailComponents?.get("keyboard")?.component ?? null)}
                    />
                    <DetailField
                      label="Adapter"
                      value={componentLabel(detailComponents?.get("adapter")?.component ?? null)}
                    />
                    <DetailField
                      label="Zusatzmaterial"
                      value={
                        detailSupplemental.length > 0
                          ? detailSupplemental.map(supplementalLabel).join(", ")
                          : null
                      }
                    />
                  </dl>
                </section>
              </div>
            </aside>
          </div>
        ) : null}

        {setToIssue && canManageSets ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Set-Liste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {isPreparedIssue ? "Set ausgeben" : "Set vorbereiten"}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Set {setToIssue.legacy_set_id}
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
                action={isPreparedIssue ? completeSetIssue : issueSet}
                className="grid gap-6 px-6 py-6"
              >
                <input name="set_id" type="hidden" value={setToIssue.id} />
                <input name="return_to" type="hidden" value={issueCloseHref} />

                <section className="grid gap-3 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">Set</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="iPad" value={componentLabel(issueComponents?.get("ipad")?.component ?? null)} />
                    <DetailField label="Pencil" value={componentLabel(issueComponents?.get("pencil")?.component ?? null)} />
                    <DetailField label="Tastatur" value={componentLabel(issueComponents?.get("keyboard")?.component ?? null)} />
                    <DetailField label="Zustand" value={setToIssue.condition} />
                    <DetailField label="Lagerort" value={setToIssue.storage_label} />
                  </dl>
                </section>

                <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">
                    {isPreparedIssue ? "Ausgabe" : "Vorbereitung"}
                  </h3>

                  {isPreparedIssue ? (
                    <DetailField
                      label="Vorbereitet für"
                      value={formatPerson(
                        personToIssue,
                        personToIssue
                          ? classByPersonId.get(personToIssue.id)
                          : undefined,
                      )}
                    />
                  ) : (
                    <div className="grid gap-1 text-sm font-medium">
                      <span>Person</span>
                      <PersonSelectionList people={personSelectionOptions} />
                    </div>
                  )}

                  {isPreparedIssue ? (
                    <label className="flex flex-col gap-1 text-sm font-medium md:max-w-52">
                      Ausgabedatum
                      <input
                        className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={issueDateDefault}
                        name="issued_at"
                        required
                        type="date"
                      />
                    </label>
                  ) : (
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Lagerort
                      <input
                        className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={setToIssue.storage_label ?? ""}
                        name="storage_label"
                        placeholder="z. B. W1 - 02, Schrank1"
                      />
                    </label>
                  )}

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Interne Ausgabenotiz
                    <textarea
                      className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      name="issue_note"
                      placeholder={
                        isPreparedIssue
                          ? "Optional, z. B. tatsächlicher Ausgabeort oder Besonderheiten"
                          : "Optional, z. B. Zubehör, Besonderheiten oder Vorbereitungshinweis"
                      }
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
                    {isPreparedIssue ? "Set ausgeben" : "Vorbereitung speichern"}
                  </button>
                </div>
              </form>
            </aside>
          </div>
        ) : null}

        {setToEditStorage ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Set-Liste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Lagerort ändern
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Set {setToEditStorage.legacy_set_id}
                  </p>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={storageCloseHref}
                >
                  Schließen
                </Link>
              </div>

              <form action={updateSetStorage} className="grid gap-5 px-6 py-6">
                <input name="set_id" type="hidden" value={setToEditStorage.id} />
                <input name="return_to" type="hidden" value={storageCloseHref} />

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Lagerort
                  <input
                    className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                    defaultValue={setToEditStorage.storage_label ?? ""}
                    name="storage_label"
                    placeholder="z. B. W1 - 04, Schrank1 oder Regal1"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
                  <Link
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                    href={storageCloseHref}
                  >
                    Abbrechen
                  </Link>
                  <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                    Speichern
                  </button>
                </div>
              </form>
            </aside>
          </div>
        ) : null}

        {problemSetId ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-5xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Sets und Komponenten
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Problem melden
                  </h2>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={buildCloseProblemHref(params)}
                >
                  Schließen
                </Link>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <DamageNewPage
                  params={Promise.resolve({ setId: problemSetId })}
                  searchParams={Promise.resolve({
                    embedded: "1",
                    mode: "problem",
                    return_to: buildCloseProblemHref(params),
                  })}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {damageSetId ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-5xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Sets und Komponenten
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Schaden oder Verlust melden
                  </h2>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={buildCloseDamageHref(params)}
                >
                  Schließen
                </Link>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <DamageNewPage
                  params={Promise.resolve({ setId: damageSetId })}
                  searchParams={Promise.resolve({
                    embedded: "1",
                    return_to: buildCloseDamageHref(params),
                  })}
                />
              </div>
            </aside>
          </div>
        ) : null}

        {setToReturn ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Set-Liste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Set {setToReturn.legacy_set_id} zurücknehmen
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    {formatPerson(personToReturn, classToReturn)}
                  </p>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={returnCloseHref}
                >
                  Schließen
                </Link>
              </div>

              {assignmentToReturn ? (
                <form action={returnSet} className="grid gap-6 px-6 py-6">
                  <input
                    name="assignment_id"
                    type="hidden"
                    value={assignmentToReturn.id}
                  />
                  <input name="set_id" type="hidden" value={setToReturn.id} />
                  <input name="return_to" type="hidden" value={returnCloseHref} />
                  <input
                    name="pencil_accessory_kind"
                    type="hidden"
                    value={pencilAccessoryToReturn.fieldValue}
                  />

                  <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                    <div>
                      <h3 className="font-semibold">Rückgabedaten</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Die Rückgabe beendet die aktuelle Zuordnung und blockiert
                        das Set bis zum Zurücksetzen.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Rückgabedatum
                        <input
                          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                          defaultValue={returnDateDefault}
                          name="returned_at"
                          type="date"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Lagerort
                        <input
                          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                          defaultValue={setToReturn.storage_label ?? ""}
                          name="storage_label"
                          placeholder="z. B. W4 - 04"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                    <div>
                      <h3 className="font-semibold">Vollständigkeit</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Haken entfernen, wenn ein Teil fehlt.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                        <input
                          className="mt-1 h-4 w-4"
                          defaultChecked
                          name="return_ipad_present"
                          type="checkbox"
                        />
                        <span>
                          iPad
                          <span className="inventory-number block text-xs font-normal text-zinc-500">
                            {componentLabel(
                              componentsToReturn?.get("ipad")?.component ?? null,
                            )}
                          </span>
                        </span>
                      </label>

                      <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                        <input
                          className="mt-1 h-4 w-4"
                          defaultChecked
                          name="return_power_adapter_present"
                          type="checkbox"
                        />
                        <span>Netzteil</span>
                      </label>

                      <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                        <input
                          className="mt-1 h-4 w-4"
                          defaultChecked
                          name="return_charging_cable_present"
                          type="checkbox"
                        />
                        <span>Ladekabel</span>
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                        <input
                          className="mt-1 h-4 w-4"
                          defaultChecked
                          name="return_pencil_present"
                          type="checkbox"
                        />
                        <span>
                          Pencil
                          <span className="inventory-number block text-xs font-normal text-zinc-500">
                            {componentLabel(
                              componentsToReturn?.get("pencil")?.component ??
                                null,
                            )}
                          </span>
                        </span>
                      </label>

                      {pencilAccessoryToReturn.required ? (
                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked
                            name="return_pencil_cap_present"
                            type="checkbox"
                          />
                          <span>{pencilAccessoryToReturn.label}</span>
                        </label>
                      ) : null}

                      <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                        <input
                          className="mt-1 h-4 w-4"
                          defaultChecked
                          name="return_keyboard_present"
                          type="checkbox"
                        />
                        <span>
                          Tastatur
                          <span className="inventory-number block text-xs font-normal text-zinc-500">
                            {componentLabel(
                              componentsToReturn?.get("keyboard")?.component ??
                                null,
                            )}
                          </span>
                        </span>
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                    {returnSupplementalComponents.length > 0 ? (
                      <>
                        <div>
                          <h3 className="font-semibold">Zusatzmaterial</h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            Nur tatsächlich zugeordnetes Zusatzmaterial.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {returnSupplementalComponents.map((component) =>
                            component ? (
                              <label
                                className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium"
                                key={component.field}
                              >
                                <input
                                  name={component.hasField}
                                  type="hidden"
                                  value="on"
                                />
                                {component.idField ? (
                                  <input
                                    name={component.idField}
                                    type="hidden"
                                    value={component.assignmentId}
                                  />
                                ) : null}
                                <input
                                  className="mt-1 h-4 w-4"
                                  defaultChecked
                                  name={component.field}
                                  type="checkbox"
                                />
                                <span>
                                  {component.label}
                                  <span className="inventory-number block text-xs font-normal text-zinc-500">
                                    {component.value}
                                  </span>
                                </span>
                              </label>
                            ) : null,
                          )}
                        </div>
                      </>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Festgestellte Mängel
                        <textarea
                          className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                          name="return_defects"
                          placeholder="Welche Mängel wurden bei der Rückgabe festgestellt?"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Festlegungen zur Behebung
                        <textarea
                          className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                          name="return_resolutions"
                          placeholder="Welche Absprachen oder Maßnahmen wurden festgelegt?"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Interne Rückgabe-Bemerkung
                      <textarea
                        className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        name="return_note"
                        placeholder="Optional: interne Hinweise, die nicht in die Mängel-Felder gehören"
                      />
                    </label>
                  </section>

                  <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-4">
                    <Link
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                      href={returnCloseHref}
                    >
                      Abbrechen
                    </Link>
                    <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                      Rückgabe speichern
                    </button>
                  </div>
                </form>
              ) : (
                <div className="px-6 py-8 text-sm text-zinc-600">
                  Für dieses Set gibt es keine offene Ausleihe, die zurückgenommen
                  werden kann.
                </div>
              )}
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
