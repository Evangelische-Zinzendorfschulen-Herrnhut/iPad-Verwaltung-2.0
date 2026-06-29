import { NextRequest } from "next/server";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createSimpleWorkbook } from "@/lib/xlsx/simple-workbook";

type AssignmentStatus = "active" | "all" | "returned";
type AssignmentSort = "issued_asc" | "name_asc" | "returned_desc";

type AssignmentRow = {
  id: string;
  issued_at: string | null;
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
  } | null;
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type PencilComponentRow = {
  component: {
    legacy_inventory_number: string | null;
    model: string | null;
  } | null;
  set_id: string;
};

type RawPencilComponentRow = Omit<PencilComponentRow, "component"> & {
  component: PencilComponentRow["component"] | PencilComponentRow["component"][];
};

type RawAssignmentRow = Omit<AssignmentRow, "person" | "set"> & {
  person: AssignmentRow["person"] | AssignmentRow["person"][];
  set: AssignmentRow["set"] | AssignmentRow["set"][];
};

type RawClassAssignmentRow = {
  person_id: string;
  school_class:
    | {
        label: string;
      }
    | {
        label: string;
      }[]
    | null;
};

const QUERY_BATCH_SIZE = 100;

function getStatusParam(searchParams: URLSearchParams): AssignmentStatus {
  const status = searchParams.get("status") ?? "";

  if (status === "active" || status === "all" || status === "returned") {
    return status;
  }

  return "returned";
}

function getSortParam(searchParams: URLSearchParams): AssignmentSort {
  const sort = searchParams.get("sort") ?? "";

  if (sort === "issued_asc" || sort === "name_asc") {
    return sort;
  }

  return "returned_desc";
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

function escapeSupabaseSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00`));
}

function formatPerson(person: AssignmentRow["person"]) {
  if (!person) {
    return "";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "";
}

function pencilAccessoryLabel(component: PencilComponentRow["component"]) {
  const model = component?.model?.toLocaleLowerCase("de-DE") ?? "";
  const inventoryNumber = component?.legacy_inventory_number
    ? ` (${component.legacy_inventory_number})`
    : "";

  if (model.includes("tucano")) {
    return `Pencil-Zubehör Tucano Pencil${inventoryNumber}: USB-C-Ladekabel`;
  }

  if (model.includes("apple pencil") && model.includes("1")) {
    return `Pencil-Zubehör Apple Pencil 1${inventoryNumber}: Kappe`;
  }

  return `Pencil-Zubehör${inventoryNumber}: Art nicht ermittelt`;
}

function missingParts(
  assignment: AssignmentRow,
  pencilComponent: PencilComponentRow["component"],
) {
  const missing = [
    assignment.return_ipad_present === false ? "iPad" : null,
    assignment.return_power_adapter_present === false ? "Netzteil" : null,
    assignment.return_charging_cable_present === false ? "Ladekabel" : null,
    assignment.return_pencil_present === false ? "Pencil" : null,
    assignment.return_pencil_cap_present === false
      ? pencilAccessoryLabel(pencilComponent)
      : null,
    assignment.return_keyboard_present === false ? "Tastatur" : null,
    assignment.return_note?.includes("Adapter zurückgegeben: nein")
      ? "Lightning-USB-Adapter"
      : null,
    assignment.return_note?.includes("HDMI-Kabel zurückgegeben: nein")
      ? "HDMI-Kabel"
      : null,
  ].filter((part): part is string => Boolean(part));

  return missing;
}

function sortAssignments(assignments: AssignmentRow[], sort: AssignmentSort) {
  if (sort === "name_asc") {
    return [...assignments].sort((firstAssignment, secondAssignment) => {
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
    });
  }

  if (sort === "issued_asc") {
    return [...assignments].sort((firstAssignment, secondAssignment) => {
      return (
        (firstAssignment.issued_at ?? "").localeCompare(
          secondAssignment.issued_at ?? "",
        ) ||
        (firstAssignment.set?.legacy_set_id ?? 0) -
          (secondAssignment.set?.legacy_set_id ?? 0)
      );
    });
  }

  return [...assignments].sort((firstAssignment, secondAssignment) => {
    return (
      (secondAssignment.returned_at ?? "").localeCompare(
        firstAssignment.returned_at ?? "",
      ) ||
      (secondAssignment.issued_at ?? "").localeCompare(
        firstAssignment.issued_at ?? "",
      ) ||
      (firstAssignment.set?.legacy_set_id ?? 0) -
        (secondAssignment.set?.legacy_set_id ?? 0)
    );
  });
}

export async function GET(request: NextRequest) {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    return new Response("Nicht berechtigt", { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") ?? "").trim();
  const status = getStatusParam(searchParams);
  const sort = getSortParam(searchParams);
  const classFilter = (searchParams.get("class") ?? "").trim();
  const issuedTo = (searchParams.get("to") ?? "").trim();
  const returnedFrom = (searchParams.get("returned_from") ?? "").trim();
  const supabase = await createClient();
  let assignmentsQuery = supabase
    .from("set_person_assignment")
    .select(
      "id,issued_at,return_charging_cable_present,return_defects,return_ipad_present,return_keyboard_present,returned_at,return_note,return_pencil_cap_present,return_pencil_present,return_power_adapter_present,return_resolutions,set:set_id(id,legacy_set_id),person:person_id(id,first_name,last_name,email)",
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

      for (const setIdBatch of chunkValues(
        (matchingSets ?? []).map((set) => set.id),
      )) {
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

    for (const personIdBatch of chunkValues(
      (matchingPeople ?? []).map((person) => person.id),
    )) {
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
    const { data: classRows, error: classRowsError } = await supabase
      .from("school_class")
      .select("id")
      .eq("active", true)
      .eq("label", classFilter)
      .limit(1);

    if (classRowsError) {
      throw classRowsError;
    }

    const classId = classRows?.[0]?.id;
    const matchingAssignmentIds = new Set<string>();

    if (classId) {
      const { data: matchingClassAssignments, error: classError } =
        await supabase
          .from("person_class_assignment")
          .select("person_id")
          .is("valid_until", null)
          .eq("school_class_id", classId);

      if (classError) {
        throw classError;
      }

      for (const personIdBatch of chunkValues(
        (matchingClassAssignments ?? []).map((assignment) => assignment.person_id),
      )) {
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

  const { data: assignmentData, error: assignmentsError } =
    await assignmentsQuery.limit(5000);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignments = ((assignmentData ?? []) as RawAssignmentRow[]).map(
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
      return [assignment.person_id, schoolClass?.label ?? ""];
    }),
  );
  const setIds = [
    ...new Set(
      assignments
        .map((assignment) => assignment.set?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rawPencilComponents: RawPencilComponentRow[] = [];

  for (const setIdBatch of chunkValues(setIds)) {
    const { data, error } = await supabase
      .from("set_component_assignment")
      .select(
        "set_id,component:component_id(legacy_inventory_number,model)",
      )
      .eq("role", "pencil")
      .is("valid_until", null)
      .in("set_id", setIdBatch);

    if (error) {
      throw error;
    }

    rawPencilComponents.push(...((data ?? []) as RawPencilComponentRow[]));
  }

  const pencilBySetId = new Map(
    rawPencilComponents.map((assignment) => [
      assignment.set_id,
      normalizeJoined(assignment.component),
    ]),
  );
  const sortedAssignments = sortAssignments(assignments, sort);
  const headers = [
    "Set",
    "Person",
    "Klasse",
    "Ausgabe",
    "Rückgabe",
    "Fehlende Komponenten/Zubehör",
    "Mängel",
    "Festlegungen",
    "Bemerkung",
  ];
  const missingRows = [headers];
  const completeRows = [headers];

  for (const assignment of sortedAssignments) {
    const missing = missingParts(
      assignment,
      assignment.set?.id ? (pencilBySetId.get(assignment.set.id) ?? null) : null,
    );
    const row = [
      assignment.set?.legacy_set_id ? `Set ${assignment.set.legacy_set_id}` : "",
      formatPerson(assignment.person),
      assignment.person ? (classByPersonId.get(assignment.person.id) ?? "") : "",
      formatDate(assignment.issued_at),
      formatDate(assignment.returned_at),
      missing.join(", "),
      assignment.return_defects ?? "",
      assignment.return_resolutions ?? "",
      assignment.return_note ?? "",
    ];

    if (missing.length > 0) {
      missingRows.push(row);
    } else {
      completeRows.push(row);
    }
  }

  const workbook = createSimpleWorkbook([
    { name: "Fehlende Rueckgaben", rows: missingRows },
    { name: "Vollstaendige Rueckgaben", rows: completeRows },
  ]);
  const filename = `ipad-rueckgaben-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(workbook, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
