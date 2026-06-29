import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { AssignmentFilterForm } from "./assignment-filter-form";
import { AssignmentsTable, type AssignmentTableRow } from "./assignments-table";

type AssignmentStatus = "active" | "all" | "returned";
type AssignmentSort = "issued_asc" | "name_asc" | "returned_desc";

type AssignmentRow = {
  id: string;
  issued_at: string | null;
  issue_note: string | null;
  return_charging_cable_present: boolean | null;
  return_defects: string | null;
  return_ipad_present: boolean | null;
  return_keyboard_present: boolean | null;
  returned_at: string | null;
  return_note: string | null;
  return_pencil_cap_present: boolean | null;
  return_pencil_present: boolean | null;
  return_power_adapter_present: boolean | null;
  return_resolutions: string | null;
  set: {
    id: string;
    legacy_set_id: number;
    availability: string;
  } | null;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
};

type RawAssignmentRow = Omit<AssignmentRow, "person" | "set"> & {
  person: AssignmentRow["person"] | AssignmentRow["person"][];
  set: AssignmentRow["set"] | AssignmentRow["set"][];
};

type ClassAssignmentRow = {
  person_id: string;
  school_class: {
    label: string;
  } | null;
};

type SchoolClassOptionRow = {
  id: string;
  label: string;
  grade_level: number | null;
};

type RawClassAssignmentRow = Omit<ClassAssignmentRow, "school_class"> & {
  school_class: ClassAssignmentRow["school_class"] | ClassAssignmentRow["school_class"][];
};

type ComponentAssignmentRow = {
  component: {
    legacy_inventory_number: string;
    model: string | null;
  } | null;
  id: string;
  role: string;
  set_id: string;
  valid_from: string;
  valid_until: string | null;
};

type RawComponentAssignmentRow = Omit<ComponentAssignmentRow, "component"> & {
  component:
    | ComponentAssignmentRow["component"]
    | ComponentAssignmentRow["component"][];
};

type SupplementalAssignmentRow = {
  id: string;
  item_type: string;
  label: string | null;
  quantity: number;
  returned_at: string | null;
};

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

function getStatusParam(
  searchParams: Record<string, string | string[] | undefined>,
): AssignmentStatus {
  const status = getSingleParam(searchParams, "status");

  if (status === "active" || status === "all" || status === "returned") {
    return status;
  }

  return "returned";
}

function getSortParam(
  searchParams: Record<string, string | string[] | undefined>,
): AssignmentSort {
  const sort = getSingleParam(searchParams, "sort");

  if (sort === "issued_asc" || sort === "name_asc") {
    return sort;
  }

  return "returned_desc";
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "class", "to", "returned_from", "sort"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `/ausgaben?${queryString}` : "/ausgaben";
}

function buildEditHref(
  params: Record<string, string | string[] | undefined>,
  assignmentId: string,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "class", "to", "returned_from", "sort", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  nextParams.set("edit", assignmentId);
  return `/ausgaben?${nextParams.toString()}`;
}

function buildCloseEditHref(
  params: Record<string, string | string[] | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "class", "to", "returned_from", "sort", "page"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/ausgaben?${queryString}` : "/ausgaben";
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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

function formatPerson(person: AssignmentRow["person"]) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "-";
}

function escapeSupabaseSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function componentLabel(component: ComponentAssignmentRow["component"]) {
  if (!component) {
    return "-";
  }

  const model = component.model ? ` · ${component.model}` : "";
  return `${component.legacy_inventory_number}${model}`;
}

function supplementalLabel(assignment: SupplementalAssignmentRow) {
  const labels: Record<string, string> = {
    hdmi_cable: "HDMI-Kabel",
    other: "Zusatzmaterial",
  };
  const label = assignment.label || labels[assignment.item_type] || assignment.item_type;

  return assignment.quantity > 1 ? `${label} (${assignment.quantity}x)` : label;
}

function stripSupplementalReturnLines(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.startsWith("Adapter zurückgegeben:") &&
        !line.startsWith("HDMI-Kabel zurückgegeben:"),
    )
    .join("\n")
    .trim();
}

function deriveReturnComplete(assignment: AssignmentRow) {
  if (!assignment.returned_at) {
    return null;
  }

  const requiredParts = [
    assignment.return_ipad_present,
    assignment.return_power_adapter_present,
    assignment.return_charging_cable_present,
    assignment.return_pencil_present,
    assignment.return_pencil_cap_present,
    assignment.return_keyboard_present,
  ];
  const hasMissingMainPart = requiredParts.some((present) => present === false);
  const hasMissingSupplemental =
    assignment.return_note?.includes("Adapter zurückgegeben: nein") ||
    assignment.return_note?.includes("HDMI-Kabel zurückgegeben: nein");

  return !hasMissingMainPart && !hasMissingSupplemental;
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

function normalizeOptionalCheckbox(value: FormDataEntryValue | null) {
  return value === "on";
}

async function updateAssignment(formData: FormData) {
  "use server";

  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const assignmentId = normalizeRequiredText(formData.get("assignment_id"));
  const returnTo = normalizeRequiredText(formData.get("return_to")) || "/ausgaben";
  const issuedAt = normalizeOptionalText(formData.get("issued_at"));
  const returnedAt = normalizeOptionalText(formData.get("returned_at"));
  const issueNote = normalizeOptionalText(formData.get("issue_note"));
  const returnNote = normalizeOptionalText(formData.get("return_note"));
  const returnDefects = normalizeOptionalText(formData.get("return_defects"));
  const returnResolutions = normalizeOptionalText(
    formData.get("return_resolutions"),
  );

  if (!assignmentId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("set_person_assignment")
    .select("id,set_id,returned_at")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    redirect(returnTo);
  }

  const updateValues: {
    issue_note: string | null;
    issued_at: string | null;
    return_charging_cable_present?: boolean;
    return_defects: string | null;
    return_ipad_present?: boolean;
    return_keyboard_present?: boolean;
    return_note: string | null;
    return_pencil_cap_present?: boolean;
    return_pencil_present?: boolean;
    return_power_adapter_present?: boolean;
    return_resolutions: string | null;
    returned_at?: string | null;
  } = {
    issue_note: issueNote,
    issued_at: issuedAt,
    return_defects: returnDefects,
    return_note: returnNote,
    return_resolutions: returnResolutions,
  };

  if (assignment.returned_at) {
    const hasAdapter = normalizeOptionalCheckbox(formData.get("has_return_adapter"));
    const hasHdmi = normalizeOptionalCheckbox(formData.get("has_return_hdmi"));
    const adapterReturned = normalizeOptionalCheckbox(
      formData.get("return_adapter_present"),
    );
    const hdmiReturned = normalizeOptionalCheckbox(formData.get("return_hdmi_present"));
    const hdmiAssignmentId = normalizeRequiredText(
      formData.get("hdmi_assignment_id"),
    );
    const supplementalNotes = [
      hasAdapter
        ? `Adapter zurückgegeben: ${adapterReturned ? "ja" : "nein"}`
        : null,
      hasHdmi ? `HDMI-Kabel zurückgegeben: ${hdmiReturned ? "ja" : "nein"}` : null,
    ];
    const combinedNote = [returnNote, ...supplementalNotes]
      .filter(Boolean)
      .join("\n");

    updateValues.return_charging_cable_present = normalizeOptionalCheckbox(
      formData.get("return_charging_cable_present"),
    );
    updateValues.return_ipad_present = normalizeOptionalCheckbox(
      formData.get("return_ipad_present"),
    );
    updateValues.return_keyboard_present = normalizeOptionalCheckbox(
      formData.get("return_keyboard_present"),
    );
    updateValues.return_pencil_cap_present = normalizeOptionalCheckbox(
      formData.get("return_pencil_cap_present"),
    );
    updateValues.return_pencil_present = normalizeOptionalCheckbox(
      formData.get("return_pencil_present"),
    );
    updateValues.return_power_adapter_present = normalizeOptionalCheckbox(
      formData.get("return_power_adapter_present"),
    );
    updateValues.return_note = combinedNote || null;
    updateValues.returned_at = returnedAt || assignment.returned_at;

    if (hasHdmi && hdmiAssignmentId) {
      const { error: supplementalError } = await supabase
        .from("set_supplemental_assignment")
        .update({
          returned_at: hdmiReturned ? updateValues.returned_at : null,
        })
        .eq("id", hdmiAssignmentId)
        .eq("set_id", assignment.set_id)
        .eq("item_type", "hdmi_cable");

      if (supplementalError) {
        throw supplementalError;
      }
    }
  }

  const { error: updateError } = await supabase
    .from("set_person_assignment")
    .update(updateValues)
    .eq("id", assignmentId);

  if (updateError) {
    throw updateError;
  }

  redirect(returnTo);
}

export default async function AusgabenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = getSingleParam(params, "q").trim();
  const status = getStatusParam(params);
  const sort = getSortParam(params);
  const classFilter = getSingleParam(params, "class").trim();
  const issuedTo = getSingleParam(params, "to").trim();
  const returnedFrom = getSingleParam(params, "returned_from").trim();
  const editAssignmentId = getSingleParam(params, "edit").trim();
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
  const { data: classOptionData } = await supabase
    .from("school_class")
    .select("id,label,grade_level")
    .eq("active", true)
    .order("grade_level", { ascending: true, nullsFirst: false })
    .order("label", { ascending: true });
  const classOptions = (classOptionData ?? []) as SchoolClassOptionRow[];
  let assignmentsQuery = supabase
    .from("set_person_assignment")
    .select(
      "id,issued_at,issue_note,return_charging_cable_present,return_defects,return_ipad_present,return_keyboard_present,returned_at,return_note,return_pencil_cap_present,return_pencil_present,return_power_adapter_present,return_resolutions,set:set_id(id,legacy_set_id,availability),person:person_id(id,first_name,last_name,email,person_type)",
      { count: "exact" },
    );
  const requiredAssignmentIdsByFilter: string[][] = [];

  if (status === "active") {
    assignmentsQuery = assignmentsQuery.is("returned_at", null);
  }

  if (status === "returned") {
    assignmentsQuery = assignmentsQuery.not("returned_at", "is", null);
  }

  if (issuedTo) {
    assignmentsQuery = assignmentsQuery.lte("issued_at", issuedTo);
  }

  if (returnedFrom) {
    assignmentsQuery = assignmentsQuery.gte("returned_at", returnedFrom);
  }

  if (query) {
    const escapedQuery = escapeSupabaseSearch(query);
    const numericQuery = Number.parseInt(query, 10);
    const matchingAssignmentIds = new Set<string>();

    if (Number.isInteger(numericQuery)) {
      const { data: matchingSets, error: setError } = await supabase
        .from("inventory_set")
        .select("id")
        .eq("legacy_set_id", numericQuery);

      if (setError) {
        throw setError;
      }

      const matchingSetIds = (matchingSets ?? []).map((set) => set.id);

      for (const setIdBatch of chunkValues(matchingSetIds)) {
        const { data, error } = await supabase
          .from("set_person_assignment")
          .select("id")
          .in("set_id", setIdBatch);

        if (error) {
          throw error;
        }

        for (const assignment of data ?? []) {
          matchingAssignmentIds.add(assignment.id);
        }
      }
    }

    const { data: matchingPeople, error: peopleError } = await supabase
      .from("person")
      .select("id")
      .or(
        `first_name.ilike.%${escapedQuery}%,last_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`,
      );

    if (peopleError) {
      throw peopleError;
    }

    const matchingPersonIds = (matchingPeople ?? []).map((person) => person.id);

    for (const personIdBatch of chunkValues(matchingPersonIds)) {
      const { data, error } = await supabase
        .from("set_person_assignment")
        .select("id")
        .in("person_id", personIdBatch);

      if (error) {
        throw error;
      }

      for (const assignment of data ?? []) {
        matchingAssignmentIds.add(assignment.id);
      }
    }

    requiredAssignmentIdsByFilter.push([...matchingAssignmentIds]);
  }

  if (classFilter) {
    const selectedClass = classOptions.find(
      (schoolClass) => schoolClass.label === classFilter,
    );
    const matchingAssignmentIds = new Set<string>();

    if (selectedClass) {
      const { data: matchingClassAssignments, error: classError } =
        await supabase
          .from("person_class_assignment")
          .select("person_id")
          .is("valid_until", null)
          .eq("school_class_id", selectedClass.id);

      if (classError) {
        throw classError;
      }

      const matchingPersonIds = (matchingClassAssignments ?? []).map(
        (assignment) => assignment.person_id,
      );

      for (const personIdBatch of chunkValues(matchingPersonIds)) {
        const { data, error } = await supabase
          .from("set_person_assignment")
          .select("id")
          .in("person_id", personIdBatch);

        if (error) {
          throw error;
        }

        for (const assignment of data ?? []) {
          matchingAssignmentIds.add(assignment.id);
        }
      }
    }

    requiredAssignmentIdsByFilter.push([...matchingAssignmentIds]);
  }

  for (const requiredAssignmentIds of requiredAssignmentIdsByFilter) {
    assignmentsQuery = requiredAssignmentIds.length
      ? assignmentsQuery.in("id", requiredAssignmentIds)
      : assignmentsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const orderedAssignmentsQuery =
    sort === "issued_asc"
      ? assignmentsQuery
          .order("issued_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
      : assignmentsQuery
          .order("returned_at", { ascending: false, nullsFirst: false })
          .order("issued_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

  const [
    assignmentsResult,
    allCountResult,
    activeCountResult,
    returnedCountResult,
  ] = await Promise.all([
    sort === "name_asc"
      ? orderedAssignmentsQuery.limit(1000)
      : orderedAssignmentsQuery.range(rangeStart, rangeEnd),
    supabase
      .from("set_person_assignment")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("set_person_assignment")
      .select("id", { count: "exact", head: true })
      .is("returned_at", null),
    supabase
      .from("set_person_assignment")
      .select("id", { count: "exact", head: true })
      .not("returned_at", "is", null),
  ]);

  if (assignmentsResult.error) {
    throw assignmentsResult.error;
  }

  const assignments = ((assignmentsResult.data ?? []) as RawAssignmentRow[]).map(
    (assignment) => ({
      ...assignment,
      person: normalizeJoined(assignment.person),
      set: normalizeJoined(assignment.set),
    }),
  );
  const personIds = [
    ...new Set(
      assignments
        .map((assignment) => assignment.person?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rawClassAssignments: RawClassAssignmentRow[] = [];

  for (const personIdBatch of chunkValues(personIds)) {
    const { data, error } = await supabase
      .from("person_class_assignment")
      .select("person_id,school_class:school_class_id(label)")
      .is("valid_until", null)
      .in("person_id", personIdBatch);

    if (error) {
      throw error;
    }

    rawClassAssignments.push(...((data ?? []) as RawClassAssignmentRow[]));
  }

  const classByPersonId = new Map(
    rawClassAssignments.map((assignment) => {
      const schoolClass = normalizeJoined(assignment.school_class);
      return [assignment.person_id, schoolClass?.label ?? "-"];
    }),
  );
  const filteredCount = assignmentsResult.count ?? assignments.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));

  if (page > totalPages) {
    redirect(buildPageHref(params, totalPages));
  }

  const currentPage = Math.min(page, totalPages);
  const displayedFrom =
    filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayedTo = Math.min(currentPage * PAGE_SIZE, filteredCount);
  const hasActiveFilters = Boolean(
    query ||
      status !== "returned" ||
      classFilter ||
      issuedTo ||
      returnedFrom ||
      sort !== "returned_desc",
  );
  const sortedAssignments =
    sort === "name_asc"
      ? [...assignments].sort((firstAssignment, secondAssignment) => {
          const firstName = formatPerson(firstAssignment.person).toLocaleLowerCase(
            "de-DE",
          );
          const secondName = formatPerson(secondAssignment.person).toLocaleLowerCase(
            "de-DE",
          );

          return (
            firstName.localeCompare(secondName, "de-DE", { numeric: true }) ||
            (firstAssignment.set?.legacy_set_id ?? 0) -
              (secondAssignment.set?.legacy_set_id ?? 0)
          );
        })
      : assignments;
  const visibleAssignments =
    sort === "name_asc"
      ? sortedAssignments.slice(rangeStart, rangeStart + PAGE_SIZE)
      : sortedAssignments;
  const rows: AssignmentTableRow[] = visibleAssignments.map((assignment) => {
    const setId = assignment.set?.id ?? "";
    const legacySetId = assignment.set?.legacy_set_id;
    const isActive = !assignment.returned_at;

    return {
      classLabel: assignment.person
        ? (classByPersonId.get(assignment.person.id) ?? "-")
        : "-",
      editHref: buildEditHref(params, assignment.id),
      id: assignment.id,
      issuedAt: formatDate(assignment.issued_at),
      person: formatPerson(assignment.person),
      returnComplete: deriveReturnComplete(assignment),
      returnHref:
        isActive && setId ? `/sets?return=${setId}` : null,
      returnProtocolHref:
        !isActive && setId ? `/sets/${setId}/return-protocol` : null,
      returnedAt: formatDate(assignment.returned_at),
      setHref: setId ? `/sets?q=${legacySetId ?? ""}&sort=set` : "/sets",
      setLabel: legacySetId ? `Set ${legacySetId}` : "Set -",
      status: isActive ? "Aktiv" : "Zurückgegeben",
    };
  });
  const closeEditHref = buildCloseEditHref(params);
  const selectedAssignment =
    editAssignmentId && assignments.some((assignment) => assignment.id === editAssignmentId)
      ? assignments.find((assignment) => assignment.id === editAssignmentId)
      : null;
  const editAssignment =
    editAssignmentId && !selectedAssignment
      ? await supabase
          .from("set_person_assignment")
          .select(
            "id,issued_at,issue_note,return_charging_cable_present,return_defects,return_ipad_present,return_keyboard_present,returned_at,return_note,return_pencil_cap_present,return_pencil_present,return_power_adapter_present,return_resolutions,set:set_id(id,legacy_set_id,availability),person:person_id(id,first_name,last_name,email,person_type)",
          )
          .eq("id", editAssignmentId)
          .maybeSingle()
      : null;
  const assignmentToEdit =
    selectedAssignment ??
    (editAssignment?.data
      ? {
          ...(editAssignment.data as RawAssignmentRow),
          person: normalizeJoined((editAssignment.data as RawAssignmentRow).person),
          set: normalizeJoined((editAssignment.data as RawAssignmentRow).set),
        }
      : null);

  if (editAssignment?.error) {
    throw editAssignment.error;
  }

  const editSetId = assignmentToEdit?.set?.id ?? null;
  const [editComponentAssignmentsResult, editSupplementalAssignmentsResult] =
    editSetId
      ? await Promise.all([
          supabase
            .from("set_component_assignment")
            .select(
              "id,set_id,role,valid_from,valid_until,component:component_id(legacy_inventory_number,model)",
            )
            .eq("set_id", editSetId)
            .eq("role", "adapter")
            .order("valid_from", { ascending: false }),
          supabase
            .from("set_supplemental_assignment")
            .select("id,item_type,quantity,label,returned_at")
            .eq("set_id", editSetId)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

  if ("error" in editComponentAssignmentsResult && editComponentAssignmentsResult.error) {
    throw editComponentAssignmentsResult.error;
  }

  if ("error" in editSupplementalAssignmentsResult && editSupplementalAssignmentsResult.error) {
    throw editSupplementalAssignmentsResult.error;
  }

  const editComponents = (
    (editComponentAssignmentsResult.data ?? []) as RawComponentAssignmentRow[]
  ).map((assignment) => ({
    ...assignment,
    component: normalizeJoined(assignment.component),
  }));
  const editAdapter = editComponents[0] ?? null;
  const editSupplementals =
    (editSupplementalAssignmentsResult.data ?? []) as SupplementalAssignmentRow[];
  const editHdmi = editSupplementals.find(
    (assignment) => assignment.item_type === "hdmi_cable",
  );
  const editReturnNote = stripSupplementalReturnLines(
    assignmentToEdit?.return_note ?? null,
  );
  const adapterReturnedFromNote =
    assignmentToEdit?.return_note?.includes("Adapter zurückgegeben: nein")
      ? false
      : true;
  const hdmiReturnedFromNote =
    assignmentToEdit?.return_note?.includes("HDMI-Kabel zurückgegeben: nein")
      ? false
      : true;
  const editSupplementalComponents = [
    editAdapter
      ? {
          assignmentId: null,
          checked: adapterReturnedFromNote,
          field: "return_adapter_present",
          hasField: "has_return_adapter",
          idField: null,
          label: "Lightning-USB-Adapter",
          value: componentLabel(editAdapter.component),
        }
      : null,
    editHdmi
      ? {
          assignmentId: editHdmi.id,
          checked: editHdmi.returned_at !== null || hdmiReturnedFromNote,
          field: "return_hdmi_present",
          hasField: "has_return_hdmi",
          idField: "hdmi_assignment_id",
          label: supplementalLabel(editHdmi),
          value: "ohne Inventarnummer",
        }
      : null,
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
              Aus- und Rückgaben
            </h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <SectionTabs active="ausgaben" />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Ausleihen gesamt</p>
            <p className="mt-2 text-2xl font-semibold">{allCountResult.count ?? 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aktive Ausgaben</p>
            <p className="mt-2 text-2xl font-semibold">
              {activeCountResult.count ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Zurückgegeben</p>
            <p className="mt-2 text-2xl font-semibold">
              {returnedCountResult.count ?? 0}
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="font-semibold">Aus- und Rückgabeliste</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? `${displayedFrom}-${displayedTo} von ${filteredCount} Treffern angezeigt.`
                : `${displayedFrom}-${displayedTo} von ${allCountResult.count ?? 0} Einträgen angezeigt.`}
            </p>
          </div>

          <AssignmentFilterForm
            classFilter={classFilter}
            classOptions={classOptions.map((schoolClass) => schoolClass.label)}
            hasActiveFilters={hasActiveFilters}
            key={`${query}:${status}:${classFilter}:${issuedTo}:${returnedFrom}:${sort}`}
            query={query}
            returnedFrom={returnedFrom}
            sort={sort}
            status={status}
            to={issuedTo}
          />

          {rows.length > 0 ? (
            <AssignmentsTable rows={rows} />
          ) : (
            <div className="px-4 py-8 text-sm text-zinc-600">
              Keine Aus- oder Rückgaben für die aktuelle Auswahl gefunden.
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

        {assignmentToEdit ? (
          <div className="fixed inset-0 z-40 bg-zinc-950/25">
            <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Aus- und Rückgabeliste
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Eintrag bearbeiten
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    {assignmentToEdit.set?.legacy_set_id
                      ? `Set ${assignmentToEdit.set.legacy_set_id}`
                      : "Set -"}{" "}
                    · {formatPerson(assignmentToEdit.person)}
                  </p>
                </div>
                <Link
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50"
                  href={closeEditHref}
                >
                  Schließen
                </Link>
              </div>

              <form
                action={updateAssignment}
                className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-6"
              >
                <input
                  name="assignment_id"
                  type="hidden"
                  value={assignmentToEdit.id}
                />
                <input name="return_to" type="hidden" value={closeEditHref} />

                <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">Ausgabe</h3>
                  <label className="flex flex-col gap-1 text-sm font-medium md:max-w-56">
                    Ausgabedatum
                    <input
                      className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={assignmentToEdit.issued_at ?? ""}
                      name="issued_at"
                      type="date"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Ausgabe-Notiz
                    <textarea
                      className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={assignmentToEdit.issue_note ?? ""}
                      name="issue_note"
                    />
                  </label>
                </section>

                <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
                  <h3 className="font-semibold">Rückgabe</h3>
                  {assignmentToEdit.returned_at ? (
                    <>
                      <label className="flex flex-col gap-1 text-sm font-medium md:max-w-56">
                        Rückgabedatum
                        <input
                          className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                          defaultValue={assignmentToEdit.returned_at}
                          name="returned_at"
                          type="date"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_ipad_present ?? true
                            }
                            name="return_ipad_present"
                            type="checkbox"
                          />
                          <span>iPad</span>
                        </label>

                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_power_adapter_present ??
                              true
                            }
                            name="return_power_adapter_present"
                            type="checkbox"
                          />
                          <span>Netzteil</span>
                        </label>

                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_charging_cable_present ??
                              true
                            }
                            name="return_charging_cable_present"
                            type="checkbox"
                          />
                          <span>Ladekabel</span>
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_pencil_present ?? true
                            }
                            name="return_pencil_present"
                            type="checkbox"
                          />
                          <span>Pencil</span>
                        </label>

                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_pencil_cap_present ?? true
                            }
                            name="return_pencil_cap_present"
                            type="checkbox"
                          />
                          <span>Pencil-Zubehör</span>
                        </label>

                        <label className="flex items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 text-sm font-medium">
                          <input
                            className="mt-1 h-4 w-4"
                            defaultChecked={
                              assignmentToEdit.return_keyboard_present ?? true
                            }
                            name="return_keyboard_present"
                            type="checkbox"
                          />
                          <span>Tastatur</span>
                        </label>
                      </div>

                      {editSupplementalComponents.length > 0 ? (
                        <div className="grid gap-3">
                          <div>
                            <h4 className="font-semibold">Zusatzmaterial</h4>
                            <p className="mt-1 text-sm text-zinc-500">
                              Nur tatsächlich zugeordnetes Zusatzmaterial.
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {editSupplementalComponents.map((component) =>
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
                                      value={component.assignmentId ?? ""}
                                    />
                                  ) : null}
                                  <input
                                    className="mt-1 h-4 w-4"
                                    defaultChecked={component.checked}
                                    name={component.field}
                                    type="checkbox"
                                  />
                                  <span>
                                    {component.label}
                                    <span className="block text-xs font-normal text-zinc-500">
                                      {component.value}
                                    </span>
                                  </span>
                                </label>
                              ) : null,
                            )}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Diese Ausgabe ist noch aktiv. Die Rückgabe wird über den
                      Rücknahme-Workflow erfasst.
                    </p>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Festgestellte Mängel
                      <textarea
                        className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={assignmentToEdit.return_defects ?? ""}
                        name="return_defects"
                        placeholder="Welche Mängel wurden bei der Rückgabe festgestellt?"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Festlegungen zur Behebung
                      <textarea
                        className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                        defaultValue={assignmentToEdit.return_resolutions ?? ""}
                        name="return_resolutions"
                        placeholder="Welche Absprachen oder Maßnahmen wurden festgelegt?"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Interne Rückgabe-Bemerkung
                    <textarea
                      className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                      defaultValue={editReturnNote}
                      name="return_note"
                    />
                  </label>
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
      </section>
    </main>
  );
}
