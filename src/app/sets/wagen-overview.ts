import { createClient } from "@/lib/supabase/server";

type InventorySetRow = {
  id: string;
  legacy_set_id: number;
  condition: string;
  availability: string;
  legacy_status: string | null;
  storage_label: string | null;
  assigned_person_id: string | null;
  assigned_person:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        person_type: string;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        person_type: string;
      }[]
    | null;
};

type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  person_type: string;
};

type RawPersonAssignmentRow = {
  set_id: string;
  person: PersonRow | PersonRow[] | null;
};

type RawClassAssignmentRow = {
  person_id: string;
  school_class:
    | {
        label: string;
        grade_level: number | null;
      }
    | {
        label: string;
        grade_level: number | null;
      }[]
    | null;
};

type ComponentRow = {
  legacy_inventory_number: string | null;
  model: string | null;
  condition: string | null;
};

type RawComponentAssignmentRow = {
  set_id: string;
  role: string;
  component: ComponentRow | ComponentRow[] | null;
};

export type WagenOverviewRow = {
  availability: string;
  classLabel: string;
  condition: string;
  id: string;
  ipad: string;
  keyboard: string;
  legacySetId: number;
  legacyStatus: string;
  pencil: string;
  person: string;
  storageLabel: string;
  storagePlace: number | null;
};

const QUERY_BATCH_SIZE = 100;

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

function formatPerson(person: PersonRow | null) {
  if (!person) {
    return "";
  }

  return [person.last_name, person.first_name].filter(Boolean).join(", ")
    || person.email
    || "";
}

function componentLabel(component: ComponentRow | null) {
  if (!component) {
    return "";
  }

  const model = component.model ? ` · ${component.model}` : "";
  const condition =
    component.condition && component.condition !== "ok"
      ? ` · ${component.condition}`
      : "";

  return `${component.legacy_inventory_number ?? ""}${model}${condition}`.trim();
}

function deriveAvailability(
  set: InventorySetRow,
  person: PersonRow | null,
  schoolClass?: { grade_level: number | null },
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

function parseStoragePlace(storageLabel: string | null) {
  if (!storageLabel) {
    return null;
  }

  const match = storageLabel.match(/\bW1\b\D*(\d{1,2})\b/i);
  const place = match ? Number.parseInt(match[1], 10) : Number.NaN;

  return Number.isInteger(place) && place >= 1 && place <= 30 ? place : null;
}

export async function loadWagenOverview(wagenLabel: "W1") {
  const supabase = await createClient();
  const { data: setData, error: setError } = await supabase
    .from("inventory_set")
    .select(
      "id,legacy_set_id,condition,availability,legacy_status,storage_label,assigned_person_id,assigned_person:assigned_person_id(id,first_name,last_name,email,person_type)",
    )
    .ilike("storage_label", `${wagenLabel}%`)
    .order("storage_label", { ascending: true })
    .order("legacy_set_id", { ascending: true });

  if (setError) {
    throw setError;
  }

  const sets = (setData ?? []) as InventorySetRow[];
  const setIds = sets.map((set) => set.id);
  const rawPersonAssignments: RawPersonAssignmentRow[] = [];
  const rawComponentAssignments: RawComponentAssignmentRow[] = [];

  for (const setIdBatch of chunkValues(setIds)) {
    const [personAssignmentsResult, componentAssignmentsResult] =
      await Promise.all([
        supabase
          .from("set_person_assignment")
          .select("set_id,person:person_id(id,first_name,last_name,email,person_type)")
          .is("returned_at", null)
          .in("set_id", setIdBatch),
        supabase
          .from("set_component_assignment")
          .select(
            "set_id,role,component:component_id(legacy_inventory_number,model,condition)",
          )
          .is("valid_until", null)
          .in("set_id", setIdBatch),
      ]);

    if (personAssignmentsResult.error) {
      throw personAssignmentsResult.error;
    }

    if (componentAssignmentsResult.error) {
      throw componentAssignmentsResult.error;
    }

    rawPersonAssignments.push(
      ...((personAssignmentsResult.data ?? []) as RawPersonAssignmentRow[]),
    );
    rawComponentAssignments.push(
      ...((componentAssignmentsResult.data ?? []) as RawComponentAssignmentRow[]),
    );
  }

  const personBySetId = new Map<string, PersonRow | null>();

  for (const assignment of rawPersonAssignments) {
    personBySetId.set(assignment.set_id, normalizeJoined(assignment.person));
  }

  for (const set of sets) {
    if (!personBySetId.has(set.id)) {
      personBySetId.set(set.id, normalizeJoined(set.assigned_person));
    }
  }

  const personIds = [
    ...new Set(
      [...personBySetId.values()]
        .map((person) => person?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rawClassAssignments: RawClassAssignmentRow[] = [];

  for (const personIdBatch of chunkValues(personIds)) {
    const { data, error } = await supabase
      .from("person_class_assignment")
      .select("person_id,school_class:school_class_id(label,grade_level)")
      .is("valid_until", null)
      .in("person_id", personIdBatch);

    if (error) {
      throw error;
    }

    rawClassAssignments.push(...((data ?? []) as RawClassAssignmentRow[]));
  }

  const classByPersonId = new Map<
    string,
    { label: string; grade_level: number | null }
  >();

  for (const assignment of rawClassAssignments) {
    const schoolClass = normalizeJoined(assignment.school_class);

    if (schoolClass) {
      classByPersonId.set(assignment.person_id, schoolClass);
    }
  }

  const componentsBySetId = new Map<string, Map<string, ComponentRow | null>>();

  for (const assignment of rawComponentAssignments) {
    if (!componentsBySetId.has(assignment.set_id)) {
      componentsBySetId.set(assignment.set_id, new Map());
    }

    componentsBySetId
      .get(assignment.set_id)
      ?.set(assignment.role, normalizeJoined(assignment.component));
  }

  return sets
    .map((set): WagenOverviewRow => {
      const person = personBySetId.get(set.id) ?? null;
      const schoolClass = person ? classByPersonId.get(person.id) : undefined;
      const components = componentsBySetId.get(set.id);

      return {
        availability: deriveAvailability(set, person, schoolClass),
        classLabel: schoolClass?.label ?? "",
        condition: set.condition,
        id: set.id,
        ipad: componentLabel(components?.get("ipad") ?? null),
        keyboard: componentLabel(components?.get("keyboard") ?? null),
        legacySetId: set.legacy_set_id,
        legacyStatus: set.legacy_status ?? "",
        pencil: componentLabel(components?.get("pencil") ?? null),
        person: formatPerson(person),
        storageLabel: set.storage_label ?? "",
        storagePlace: parseStoragePlace(set.storage_label),
      };
    })
    .sort((first, second) => {
      if (first.storagePlace && second.storagePlace) {
        return (
          first.storagePlace - second.storagePlace ||
          first.legacySetId - second.legacySetId
        );
      }

      if (first.storagePlace) {
        return -1;
      }

      if (second.storagePlace) {
        return 1;
      }

      return (
        first.storageLabel.localeCompare(second.storageLabel, "de-DE", {
          numeric: true,
        }) || first.legacySetId - second.legacySetId
      );
    });
}
