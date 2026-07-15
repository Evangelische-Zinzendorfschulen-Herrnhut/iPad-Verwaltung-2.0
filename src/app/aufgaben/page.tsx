import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "../section-tabs";
import { TasksFilterForm } from "./tasks-filter-form";
import { TasksTable, type TaskListRow } from "./tasks-table";

export const metadata: Metadata = {
  title: "Aufgaben | iPad-Verwaltung",
};

type TaskStatus = "offen" | "in_bearbeitung" | "erledigt" | "archiviert";
type TaskPriority = "normal" | "hoch";
type TaskSort =
  | "created_desc"
  | "due_asc"
  | "due_desc"
  | "priority_desc"
  | "title_asc";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  completed_at: string | null;
  created_at: string;
  created_by_user: {
    email: string;
  } | null;
  completed_by_user: {
    email: string;
  } | null;
};

type RawTaskRow = Omit<TaskRow, "completed_by_user" | "created_by_user"> & {
  completed_by_user: TaskRow["completed_by_user"] | TaskRow["completed_by_user"][];
  created_by_user: TaskRow["created_by_user"] | TaskRow["created_by_user"][];
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

function getStatusParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const status = getSingleParam(searchParams, "status");

  if (
    status === "" ||
    status === "all" ||
    status === "active" ||
    status === "offen" ||
    status === "in_bearbeitung" ||
    status === "erledigt" ||
    status === "archiviert"
  ) {
    return status || "active";
  }

  return "active";
}

function getPriorityParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const priority = getSingleParam(searchParams, "priority");

  if (priority === "hoch" || priority === "normal") {
    return priority;
  }

  return "";
}

function getSortParam(
  searchParams: Record<string, string | string[] | undefined>,
): TaskSort {
  const sort = getSingleParam(searchParams, "sort");

  if (
    sort === "created_desc" ||
    sort === "due_desc" ||
    sort === "priority_desc" ||
    sort === "title_asc"
  ) {
    return sort;
  }

  return "due_asc";
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const nextParams = new URLSearchParams();

  for (const key of ["q", "status", "priority", "sort"]) {
    const value = getSingleParam(params, key).trim();

    if (value) {
      nextParams.set(key, value);
    }
  }

  if (page > 1) {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `/aufgaben?${queryString}` : "/aufgaben";
}

function normalizeJoined<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function dateInputValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function textValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

async function createTask(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const description = textValue(formData.get("description"));
  const priority = String(formData.get("priority") ?? "normal");
  const dueDate = dateInputValue(formData.get("due_date"));
  const relatedObjectType = textValue(formData.get("related_object_type"));
  const relatedObjectId = textValue(formData.get("related_object_id"));

  if (!title) {
    redirect("/aufgaben?error=missing-title");
  }

  const appUser = await getCurrentAppUser();

  if (!appUser || !hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const hasPartialRelation = Boolean(relatedObjectType) !== Boolean(relatedObjectId);

  if (hasPartialRelation) {
    redirect("/aufgaben?error=relation-incomplete");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("task").insert({
    created_by_user_id: appUser.id,
    description,
    due_date: dueDate,
    priority: priority === "hoch" ? "hoch" : "normal",
    related_object_id: relatedObjectId,
    related_object_type: relatedObjectType,
    title,
  });

  if (error) {
    throw error;
  }

  redirect("/aufgaben");
}

async function updateTaskStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/aufgaben");

  if (
    !id ||
    !["offen", "in_bearbeitung", "erledigt", "archiviert"].includes(status)
  ) {
    redirect(returnTo);
  }

  const appUser = await getCurrentAppUser();

  if (!appUser || !hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const completedFields =
    status === "erledigt"
      ? {
          completed_at: new Date().toISOString(),
          completed_by_user_id: appUser.id,
        }
      : {
          completed_at: null,
          completed_by_user_id: null,
        };

  const { error } = await supabase
    .from("task")
    .update({
      status,
      ...completedFields,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

async function updateTask(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/aufgaben");
  const title = String(formData.get("title") ?? "").trim();
  const description = textValue(formData.get("description"));
  const priority = String(formData.get("priority") ?? "normal");
  const dueDate = dateInputValue(formData.get("due_date"));
  const status = String(formData.get("status") ?? "");

  if (
    !id ||
    !title ||
    !["offen", "in_bearbeitung", "erledigt", "archiviert"].includes(status)
  ) {
    redirect(returnTo);
  }

  const appUser = await getCurrentAppUser();

  if (!appUser || !hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const completedFields =
    status === "erledigt"
      ? {
          completed_at: new Date().toISOString(),
          completed_by_user_id: appUser.id,
        }
      : {
          completed_at: null,
          completed_by_user_id: null,
        };
  const supabase = await createClient();
  const { error } = await supabase
    .from("task")
    .update({
      description,
      due_date: dueDate,
      priority: priority === "hoch" ? "hoch" : "normal",
      status,
      title,
      ...completedFields,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  redirect(returnTo);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin"])) {
    redirect("/");
  }

  const query = getSingleParam(params, "q").trim();
  const status = getStatusParam(params);
  const priority = getPriorityParam(params);
  const sort = getSortParam(params);
  const page = getPageParam(params);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createClient();

  let taskQuery = supabase
    .from("task")
    .select(
      `
        id,
        title,
        description,
        status,
        priority,
        due_date,
        related_object_type,
        related_object_id,
        completed_at,
        created_at,
        created_by_user:created_by_user_id(email),
        completed_by_user:completed_by_user_id(email)
      `,
      { count: "exact" },
    );

  if (status === "active") {
    taskQuery = taskQuery.in("status", ["offen", "in_bearbeitung"]);
  } else if (status && status !== "all") {
    taskQuery = taskQuery.eq("status", status);
  }

  if (priority) {
    taskQuery = taskQuery.eq("priority", priority);
  }

  if (query) {
    const setNumberMatch = query.match(/^(?:set\s*)?(\d+)$/i);
    const setNumber = setNumberMatch
      ? Number.parseInt(setNumberMatch[1], 10)
      : null;
    const componentQuery = query.replace(/^komponente\s+/i, "").trim();
    const [matchingSetsResult, matchingComponentsResult] = await Promise.all([
      setNumber !== null
        ? supabase
            .from("inventory_set")
            .select("id")
            .eq("legacy_set_id", setNumber)
        : Promise.resolve({ data: [], error: null }),
      componentQuery
        ? supabase
            .from("inventory_component")
            .select("id")
            .ilike("legacy_inventory_number", `%${componentQuery}%`)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (matchingSetsResult.error) {
      throw matchingSetsResult.error;
    }

    if (matchingComponentsResult.error) {
      throw matchingComponentsResult.error;
    }

    const matchingSetIds = (matchingSetsResult.data ?? []).map((set) => set.id);
    const matchingComponentIds = (matchingComponentsResult.data ?? []).map(
      (component) => component.id,
    );
    const matchingAssignmentsResult =
      matchingSetIds.length > 0
        ? await supabase
            .from("set_component_assignment")
            .select("component_id")
            .in("set_id", matchingSetIds)
            .is("valid_until", null)
        : { data: [], error: null };

    if (matchingAssignmentsResult.error) {
      throw matchingAssignmentsResult.error;
    }

    const matchingRelatedObjectIds = Array.from(
      new Set([
        ...matchingSetIds,
        ...matchingComponentIds,
        ...(matchingAssignmentsResult.data ?? []).map(
          (assignment) => assignment.component_id,
        ),
      ]),
    );
    const escapedQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
    const searchClauses = [
      `title.ilike.%${escapedQuery}%`,
      `description.ilike.%${escapedQuery}%`,
      `related_object_type.ilike.%${escapedQuery}%`,
    ];

    if (matchingRelatedObjectIds.length > 0) {
      searchClauses.push(
        `related_object_id.in.(${matchingRelatedObjectIds.join(",")})`,
      );
    }

    taskQuery = taskQuery.or(searchClauses.join(","));
  }

  if (sort === "created_desc") {
    taskQuery = taskQuery.order("created_at", { ascending: false });
  } else if (sort === "due_desc") {
    taskQuery = taskQuery.order("due_date", {
      ascending: false,
      nullsFirst: false,
    });
  } else if (sort === "priority_desc") {
    taskQuery = taskQuery
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false });
  } else if (sort === "title_asc") {
    taskQuery = taskQuery.order("title", { ascending: true });
  } else {
    taskQuery = taskQuery
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const { count, data, error } = await taskQuery.range(from, to);

  if (error) {
    throw error;
  }

  const rawTasks = (data ?? []) as RawTaskRow[];
  const relatedSetIds = rawTasks
    .filter((task) => task.related_object_type === "set" && task.related_object_id)
    .map((task) => task.related_object_id as string);
  const relatedComponentIds = rawTasks
    .filter(
      (task) =>
        task.related_object_type === "komponente" && task.related_object_id,
    )
    .map((task) => task.related_object_id as string);
  const [
    { data: directlyRelatedSets, error: directlyRelatedSetsError },
    { data: relatedComponents, error: relatedComponentsError },
    { data: relatedComponentAssignments, error: relatedAssignmentsError },
  ] =
    await Promise.all([
      relatedSetIds.length > 0
        ? supabase
            .from("inventory_set")
            .select(
              "id,legacy_set_id,assigned_person_id,availability,condition,storage_label",
            )
            .in("id", relatedSetIds)
        : Promise.resolve({ data: [], error: null }),
      relatedComponentIds.length > 0
        ? supabase
            .from("inventory_component")
            .select("id,legacy_inventory_number,category")
            .in("id", relatedComponentIds)
        : Promise.resolve({ data: [], error: null }),
      relatedComponentIds.length > 0
        ? supabase
            .from("set_component_assignment")
            .select("component_id,set_id")
            .in("component_id", relatedComponentIds)
            .is("valid_until", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (directlyRelatedSetsError) {
    throw directlyRelatedSetsError;
  }

  if (relatedComponentsError) {
    throw relatedComponentsError;
  }

  if (relatedAssignmentsError) {
    throw relatedAssignmentsError;
  }

  const assignedSetIds = (relatedComponentAssignments ?? []).map(
    (assignment) => assignment.set_id,
  );
  const missingAssignedSetIds = assignedSetIds.filter(
    (setId) => !relatedSetIds.includes(setId),
  );
  const { data: assignedSets, error: assignedSetsError } =
    missingAssignedSetIds.length > 0
      ? await supabase
          .from("inventory_set")
          .select(
            "id,legacy_set_id,assigned_person_id,availability,condition,storage_label",
          )
          .in("id", missingAssignedSetIds)
      : { data: [], error: null };

  if (assignedSetsError) {
    throw assignedSetsError;
  }

  const allRelatedSets = [...(directlyRelatedSets ?? []), ...(assignedSets ?? [])];
  const allRelatedSetIds = allRelatedSets.map((set) => set.id);
  const { data: previousAssignments, error: previousAssignmentsError } =
    allRelatedSetIds.length > 0
      ? await supabase
          .from("set_person_assignment")
          .select("set_id,person_id,returned_at")
          .not("returned_at", "is", null)
          .in("set_id", allRelatedSetIds)
          .order("returned_at", { ascending: false })
      : { data: [], error: null };

  if (previousAssignmentsError) {
    throw previousAssignmentsError;
  }

  const previousPersonIdBySetId = new Map<string, string>();
  const previousReturnDateBySetId = new Map<string, string>();

  for (const assignment of previousAssignments ?? []) {
    if (
      assignment.person_id &&
      !previousPersonIdBySetId.has(assignment.set_id)
    ) {
      previousPersonIdBySetId.set(assignment.set_id, assignment.person_id);

      if (assignment.returned_at) {
        previousReturnDateBySetId.set(
          assignment.set_id,
          assignment.returned_at,
        );
      }
    }
  }

  const relatedPersonIds = Array.from(new Set(allRelatedSets
    .map((set) => set.assigned_person_id)
    .concat(Array.from(previousPersonIdBySetId.values()))
    .filter((personId): personId is string => Boolean(personId))));
  const [
    { data: relatedPeople, error: relatedPeopleError },
    { data: relatedClassAssignments, error: relatedClassAssignmentsError },
  ] = await Promise.all([
    relatedPersonIds.length > 0
      ? supabase
          .from("person")
          .select("id,first_name,last_name,email,person_type,status,jahrgang")
          .in("id", relatedPersonIds)
      : Promise.resolve({ data: [], error: null }),
    relatedPersonIds.length > 0
      ? supabase
          .from("person_class_assignment")
          .select("person_id,school_class:school_class_id(label)")
          .in("person_id", relatedPersonIds)
          .is("valid_until", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (relatedPeopleError) {
    throw relatedPeopleError;
  }

  if (relatedClassAssignmentsError) {
    throw relatedClassAssignmentsError;
  }

  const relatedSetById = new Map(
    allRelatedSets.map((set) => [set.id, set]),
  );
  const relatedComponentById = new Map(
    (relatedComponents ?? []).map((component) => [component.id, component]),
  );
  const assignedSetIdByComponentId = new Map(
    (relatedComponentAssignments ?? []).map((assignment) => [
      assignment.component_id,
      assignment.set_id,
    ]),
  );
  const relatedPersonById = new Map(
    (relatedPeople ?? []).map((person) => [person.id, person]),
  );
  const classLabelByPersonId = new Map(
    (relatedClassAssignments ?? []).map((assignment) => {
      const schoolClass = Array.isArray(assignment.school_class)
        ? (assignment.school_class[0] ?? null)
        : assignment.school_class;

      return [assignment.person_id, schoolClass?.label ?? null];
    }),
  );
  const tasks: TaskListRow[] = rawTasks.map((task) => {
    const assignedSetId =
      task.related_object_type === "komponente" && task.related_object_id
        ? assignedSetIdByComponentId.get(task.related_object_id)
        : null;
    const relatedSet = task.related_object_id
      ? relatedSetById.get(
          task.related_object_type === "set"
            ? task.related_object_id
            : (assignedSetId ?? ""),
        )
      : null;
    const setNumber = relatedSet?.legacy_set_id ?? null;
    const relatedComponent = task.related_object_id
      ? relatedComponentById.get(task.related_object_id)
      : null;
    const inventoryNumber = relatedComponent?.legacy_inventory_number ?? null;
    const currentPersonId = relatedSet?.assigned_person_id ?? null;
    const previousPersonId = relatedSet
      ? previousPersonIdBySetId.get(relatedSet.id)
      : null;
    const previousReturnDate = relatedSet
      ? previousReturnDateBySetId.get(relatedSet.id)
      : null;
    const personId = currentPersonId ?? previousPersonId;
    const person = personId
      ? relatedPersonById.get(personId)
      : null;
    const personName = person
      ? [person.first_name, person.last_name].filter(Boolean).join(" ") ||
        person.email ||
        "Person"
      : null;
    const personQuery = person
      ? person.email || person.last_name || person.first_name
      : null;
    const personTypeLabels: Record<string, string> = {
      lehrer: "Lehrer",
      mitarbeiter: "Mitarbeiter",
      praktikant: "Praktikant",
      referendar: "Referendar",
      schueler: "Schüler",
    };
    const personStatusLabels: Record<string, string> = {
      aktiv: "Aktiv",
      ausgeschieden: "Ausgeschieden",
      ausgetreten: "Ausgetreten",
      inaktiv: "Inaktiv",
    };
    const availabilityLabels: Record<string, string> = {
      ausgegeben: "Ausgegeben",
      blockiert: "Blockiert",
      frei: "Frei",
      reserviert: "Reserviert",
      unklar: "Unklar",
      zurücksetzen: "Zurücksetzen",
      zugeordnet: "Zugeordnet",
    };
    const conditionLabels: Record<string, string> = {
      "beschädigt_nutzbar": "Beschädigt, nutzbar",
      defekt: "Defekt",
      ok: "Ok",
      unklar: "Unklar",
      unvollständig: "Unvollständig",
    };
    const categoryLabels: Record<string, string> = {
      adapter: "Adapter",
      ipad: "iPad",
      keyboard: "Tastatur",
      mouse: "Magic-Maus",
      other: "Sonstiges",
      pencil: "Pencil",
    };
    const classLabel = personId
      ? classLabelByPersonId.get(personId)
      : null;
    const personMeta = person
      ? [
          personTypeLabels[person.person_type] ?? person.person_type,
          personStatusLabels[person.status] ?? person.status,
          classLabel
            ? `Klasse ${classLabel}`
            : person.jahrgang !== null
              ? `Jahrgang ${person.jahrgang}`
              : null,
          !currentPersonId && previousReturnDate
            ? `Rückgabe: ${new Intl.DateTimeFormat("de-DE").format(new Date(`${previousReturnDate}T00:00:00`))}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
    const relatedLinks: TaskListRow["related_links"] = [];

    if (person && personName && personQuery) {
      relatedLinks.push({
        description: personName,
        href: `/personen?q=${encodeURIComponent(personQuery)}`,
        label: currentPersonId
          ? "Zugeordnete Person"
          : "Letzte zugeordnete Person",
        meta: personMeta || undefined,
      });
    }

    if (setNumber !== null) {
      relatedLinks.push(
        {
          description: `Set ${setNumber}`,
          href: `/sets?q=${encodeURIComponent(String(setNumber))}`,
          label: "Setliste",
          meta: [
            `Verfügbarkeit: ${availabilityLabels[relatedSet?.availability ?? ""] ?? relatedSet?.availability ?? "-"}`,
            `Zustand: ${conditionLabels[relatedSet?.condition ?? ""] ?? relatedSet?.condition ?? "-"}`,
            `Lagerort: ${relatedSet?.storage_label || "-"}`,
          ].join(" · "),
        },
        {
          description: `Alle Komponenten von Set ${setNumber}`,
          href: `/geraete?set=${encodeURIComponent(String(setNumber))}`,
          label: "Geräteliste",
        },
      );
    }

    if (inventoryNumber) {
      relatedLinks.push({
        description: inventoryNumber,
        href: `/geraete?q=${encodeURIComponent(inventoryNumber)}`,
        label: "Geräteliste",
        meta: `Typ: ${categoryLabels[relatedComponent?.category ?? ""] ?? relatedComponent?.category ?? "-"}`,
      });
    }

    return {
      ...task,
      completed_by_user: normalizeJoined(task.completed_by_user),
      created_by_user: normalizeJoined(task.created_by_user),
      related_object_href:
        task.related_object_type === "set" && setNumber !== null && setNumber !== undefined
          ? `/sets?q=${encodeURIComponent(String(setNumber))}`
          : task.related_object_type === "komponente" && inventoryNumber
            ? `/geraete?q=${encodeURIComponent(inventoryNumber)}`
            : null,
      related_object_label:
        task.related_object_type === "set" && setNumber !== null && setNumber !== undefined
          ? `Set ${setNumber}`
          : task.related_object_type === "komponente" && inventoryNumber
            ? `${categoryLabels[relatedComponent?.category ?? ""] ?? relatedComponent?.category ?? "Komponente"} ${inventoryNumber}`
            : null,
      related_links: relatedLinks,
    };
  });
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasActiveFilters =
    Boolean(query) ||
    status !== "active" ||
    Boolean(priority) ||
    sort !== "due_asc";
  const currentHref = buildPageHref(params, page);
  const errorMessage =
    getSingleParam(params, "error") === "missing-title"
      ? "Titel ist ein Pflichtfeld."
      : getSingleParam(params, "error") === "relation-incomplete"
        ? "Fachbezug bitte vollständig angeben oder leer lassen."
        : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Arbeitsbereich
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Aufgaben
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Admin-only Aufgabenliste fuer operative Folgearbeiten.
            </p>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-white">
              Abmelden
            </button>
          </form>
        </header>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <SectionTabs active="aufgaben" />

          <section className="border-b border-zinc-300 bg-zinc-100 px-4 py-4 shadow-inner">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  Neue Aufgabe anlegen
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Kurze Folgearbeit ohne Objektbezug erfassen.
                </p>
              </div>
            </div>
            <form action={createTask} className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_160px_minmax(220px,1fr)_auto]">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Titel
                <input
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="title"
                  placeholder="Neue Aufgabe"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Prioritaet
                <select
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="priority"
                  defaultValue="normal"
                >
                  <option value="normal">Normal</option>
                  <option value="hoch">Hoch</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Faellig am
                <input
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="due_date"
                  type="date"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium">
                Beschreibung
                <input
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="description"
                  placeholder="Optional"
                />
              </label>

              <div className="flex items-end">
                <button className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
                  Anlegen
                </button>
              </div>
            </form>

            {errorMessage ? (
              <p className="mt-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            ) : null}
          </section>

          <TasksFilterForm
            hasActiveFilters={hasActiveFilters}
            priority={priority}
            query={query}
            sort={sort}
            status={status}
          />

          <TasksTable
            returnTo={currentHref}
            rows={tasks}
            updateAction={updateTask}
            updateStatusAction={updateTaskStatus}
          />

          <footer className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            <span>
              {count ?? 0} Aufgaben, Seite {page} von {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <a
                  className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium transition hover:bg-zinc-50"
                  href={buildPageHref(params, page - 1)}
                >
                  Zurueck
                </a>
              ) : null}
              {page < totalPages ? (
                <a
                  className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium transition hover:bg-zinc-50"
                  href={buildPageHref(params, page + 1)}
                >
                  Weiter
                </a>
              ) : null}
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
