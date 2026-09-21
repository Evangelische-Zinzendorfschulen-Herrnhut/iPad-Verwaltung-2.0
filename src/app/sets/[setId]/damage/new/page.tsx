import { DamageExchangeForm, DamageExchangeFields } from "../../../damage-exchange-form";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { FieldIcon } from "@/app/schadensfaelle/field-icon";

export const metadata: Metadata = {
  title: "Neuer Schaden | iPad-Verwaltung",
};

type DamageNewPageProps = {
  params: Promise<{
    setId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ComponentAssignmentRow = {
  component_id: string;
  role: string;
  component: {
    category: string;
    legacy_inventory_number: string;
    model: string | null;
  } | null;
};

type RawComponentAssignmentRow = Omit<ComponentAssignmentRow, "component"> & {
  component: ComponentAssignmentRow["component"] | ComponentAssignmentRow["component"][];
};

type CurrentAssignmentRow = {
  id: string;
  person_id: string | null;
  person: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
};

type RawCurrentAssignmentRow = Omit<CurrentAssignmentRow, "person"> & {
  person: CurrentAssignmentRow["person"] | CurrentAssignmentRow["person"][];
};

type InventoryComponentOptionRow = {
  id: string;
  category: string;
  legacy_inventory_number: string;
  model: string | null;
};

type ComponentAssignmentCandidateRow = {
  component_id: string;
  set_id: string;
};

type ActiveComponentAssignmentRow = {
  id: string;
  component_id: string;
  role: string;
  set_id: string;
  set: {
    availability: string;
    legacy_set_id: number;
  } | null;
};

type RawActiveComponentAssignmentRow = Omit<
  ActiveComponentAssignmentRow,
  "set"
> & {
  set: ActiveComponentAssignmentRow["set"] | ActiveComponentAssignmentRow["set"][];
};

function FormFieldLabel({
  children,
  label,
}: {
  children: ReactNode;
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

function normalizeJoin<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPerson(person: CurrentAssignmentRow["person"]) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "-";
}

function componentLabel(assignment: ComponentAssignmentRow) {
  const inventoryNumber = assignment.component?.legacy_inventory_number ?? "-";
  const model = assignment.component?.model ? ` · ${assignment.component.model}` : "";

  return `${assignment.role}: ${inventoryNumber}${model}`;
}

function componentOptionLabel(component: InventoryComponentOptionRow) {
  const model = component.model ? ` · ${component.model}` : "";
  return `${component.category}: ${component.legacy_inventory_number}${model}`;
}

function affectedItemLabel(value: string) {
  const labels: Record<string, string> = {
    charging_cable: "Kabel zum iPad",
    component: "Komponente",
    other: "Sonstiges Zubehör",
    power_adapter: "Netzteil zum iPad",
    set: "Set",
  };

  return labels[value] ?? value;
}

const exchangeStatusOptions = [
  { label: "Nicht angegeben", value: "" },
  { label: "Erforderlich", value: "erforderlich" },
  { label: "Ausgegeben", value: "ausgegeben" },
  { label: "Kein Austausch", value: "kein Austausch" },
  { label: "Nicht erforderlich", value: "nicht erforderlich" },
  { label: "Set getauscht", value: "Set getauscht" },
  { label: "Settausch angefragt", value: "Settausch angefragt" },
  { label: "Vorläufig", value: "vorläufig" },
];

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

function appendFlagToHref(href: string, key: string, value: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${key}=${value}`;
}

async function applyReplacementSetIssue({
  assignmentId,
  damageNumber,
  damagedComponentId,
  issuedAt,
  markDamagedPartsDefective,
  personId,
  replacementSetId,
  setId,
}: {
  assignmentId: string;
  damageNumber: number;
  damagedComponentId: string | null;
  issuedAt: string;
  markDamagedPartsDefective: boolean;
  personId: string;
  replacementSetId: string;
  setId: string;
}) {
  const supabase = await createClient();
  const [
    { data: currentAssignment, error: currentAssignmentError },
    { data: replacementAssignment, error: replacementAssignmentError },
    { data: currentSet, error: currentSetError },
    { data: replacementSet, error: replacementSetError },
    ipadAssignmentResult,
    { data: person, error: personError },
  ] = await Promise.all([
    supabase
      .from("set_person_assignment")
      .select("id,set_id,person_id,returned_at")
      .eq("id", assignmentId)
      .eq("set_id", setId)
      .is("returned_at", null)
      .maybeSingle(),
    supabase
      .from("set_person_assignment")
      .select("id")
      .eq("set_id", replacementSetId)
      .is("returned_at", null)
      .maybeSingle(),
    supabase
      .from("inventory_set")
      .select("legacy_set_id")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("inventory_set")
      .select("legacy_set_id")
      .eq("id", replacementSetId)
      .maybeSingle(),
    damagedComponentId
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("set_component_assignment")
          .select("component_id")
          .eq("set_id", setId)
          .eq("role", "ipad")
          .is("valid_until", null)
          .maybeSingle(),
    supabase
      .from("person")
      .select("legacy_user_id")
      .eq("id", personId)
      .maybeSingle(),
  ]);

  if (currentAssignmentError) {
    throw currentAssignmentError;
  }

  if (replacementAssignmentError) {
    throw replacementAssignmentError;
  }

  if (currentSetError) {
    throw currentSetError;
  }

  if (replacementSetError) {
    throw replacementSetError;
  }

  if (ipadAssignmentResult.error) {
    throw ipadAssignmentResult.error;
  }

  if (personError) {
    throw personError;
  }

  if (!currentAssignment || currentAssignment.person_id !== personId) {
    throw new Error("Aktive Ausgabe des alten Sets wurde nicht gefunden.");
  }

  if (replacementAssignment) {
    throw new Error("Ersatzset ist bereits aktiv ausgegeben.");
  }

  if (!currentSet || !replacementSet) {
    throw new Error("Setwechsel konnte nicht vorbereitet werden.");
  }

  const note = `Automatischer Setwechsel aus Schaden ${damageNumber}: Set ${currentSet.legacy_set_id} -> Set ${replacementSet.legacy_set_id}.`;
  const legacyUserId =
    person && "legacy_user_id" in person ? person.legacy_user_id : null;
  const componentIdToMarkDefective =
    damagedComponentId || ipadAssignmentResult.data?.component_id || null;

  const { error: closeAssignmentError } = await supabase
    .from("set_person_assignment")
    .update({
      returned_at: issuedAt,
      return_note: note,
    })
    .eq("id", assignmentId)
    .is("returned_at", null);

  if (closeAssignmentError) {
    throw closeAssignmentError;
  }

  const { error: newAssignmentError } = await supabase
    .from("set_person_assignment")
    .insert({
      issued_at: issuedAt,
      issue_note: note,
      legacy_assignment_id: -damageNumber,
      legacy_status: `damage_${damageNumber}_replacement_set`,
      legacy_user_id: legacyUserId ?? 0,
      person_id: personId,
      set_id: replacementSetId,
    });

  if (newAssignmentError) {
    throw newAssignmentError;
  }

  const [
    oldSetUpdate,
    replacementSetUpdate,
    damagedIpadUpdate,
  ] = await Promise.all([
    supabase
      .from("inventory_set")
      .update({
        assigned_person_id: null,
        availability: "blockiert",
        condition: markDamagedPartsDefective ? "defekt" : "unklar",
        legacy_user_id: null,
        notes: note,
      })
      .eq("id", setId),
    supabase
      .from("inventory_set")
      .update({
        assigned_person_id: personId,
        availability: "ausgegeben",
        condition: "ok",
        legacy_user_id: legacyUserId,
        notes: note,
      })
      .eq("id", replacementSetId),
    markDamagedPartsDefective && componentIdToMarkDefective
      ? supabase
          .from("inventory_component")
          .update({
            condition: "defekt",
            legacy_status: "defekt",
          })
          .eq("id", componentIdToMarkDefective)
      : Promise.resolve({ error: null }),
  ]);

  if (oldSetUpdate.error) {
    throw oldSetUpdate.error;
  }

  if (replacementSetUpdate.error) {
    throw replacementSetUpdate.error;
  }

  if (damagedIpadUpdate.error) {
    throw damagedIpadUpdate.error;
  }
}

async function applyReplacementComponentIssue({
  damagedComponentId,
  damageNumber,
  effectiveAt,
  markDamagedComponentDefective,
  replacementComponentId,
  setId,
}: {
  damagedComponentId: string;
  damageNumber: number;
  effectiveAt: string;
  markDamagedComponentDefective: boolean;
  replacementComponentId: string;
  setId: string;
}) {
  const supabase = await createClient();
  const [
    { data: currentSet, error: currentSetError },
    { data: damagedAssignmentData, error: damagedAssignmentError },
    { data: replacementAssignmentData, error: replacementAssignmentError },
    { data: damagedComponent, error: damagedComponentError },
    { data: replacementComponent, error: replacementComponentError },
  ] = await Promise.all([
    supabase
      .from("inventory_set")
      .select("legacy_set_id")
      .eq("id", setId)
      .maybeSingle(),
    supabase
      .from("set_component_assignment")
      .select("id,set_id,component_id,role,set:set_id(legacy_set_id,availability)")
      .eq("set_id", setId)
      .eq("component_id", damagedComponentId)
      .is("valid_until", null)
      .maybeSingle(),
    supabase
      .from("set_component_assignment")
      .select("id,set_id,component_id,role,set:set_id(legacy_set_id,availability)")
      .eq("component_id", replacementComponentId)
      .is("valid_until", null)
      .maybeSingle(),
    supabase
      .from("inventory_component")
      .select("id,category,legacy_inventory_number")
      .eq("id", damagedComponentId)
      .maybeSingle(),
    supabase
      .from("inventory_component")
      .select("id,category,legacy_inventory_number")
      .eq("id", replacementComponentId)
      .maybeSingle(),
  ]);

  if (currentSetError) {
    throw currentSetError;
  }

  if (damagedAssignmentError) {
    throw damagedAssignmentError;
  }

  if (replacementAssignmentError) {
    throw replacementAssignmentError;
  }

  if (damagedComponentError) {
    throw damagedComponentError;
  }

  if (replacementComponentError) {
    throw replacementComponentError;
  }

  const damagedAssignment = damagedAssignmentData
    ? ({
        ...damagedAssignmentData,
        set: normalizeJoin(
          (damagedAssignmentData as RawActiveComponentAssignmentRow).set,
        ),
      } as ActiveComponentAssignmentRow)
    : null;
  const replacementAssignment = replacementAssignmentData
    ? ({
        ...replacementAssignmentData,
        set: normalizeJoin(
          (replacementAssignmentData as RawActiveComponentAssignmentRow).set,
        ),
      } as ActiveComponentAssignmentRow)
    : null;

  if (!currentSet || !damagedAssignment || !damagedComponent || !replacementComponent) {
    throw new Error("Komponententausch konnte nicht vorbereitet werden.");
  }

  if (damagedComponent.category !== replacementComponent.category) {
    throw new Error("Ersatzkomponente passt nicht zur betroffenen Komponente.");
  }

  if (damagedAssignment.role !== replacementComponent.category) {
    throw new Error("Ersatzkomponente passt nicht zur Set-Rolle.");
  }

  if (replacementAssignment?.set_id === setId) {
    throw new Error("Ersatzkomponente ist bereits diesem Set zugeordnet.");
  }

  if (replacementAssignment?.set?.availability === "ausgegeben") {
    throw new Error("Ersatzkomponente ist einem ausgegebenen Set zugeordnet.");
  }

  const validAt = new Date(`${effectiveAt}T00:00:00.000Z`).toISOString();
  const note = `Automatischer Komponententausch aus Schaden ${damageNumber}: ${damagedComponent.legacy_inventory_number} -> ${replacementComponent.legacy_inventory_number}.`;

  if (replacementAssignment) {
    const { error: closeReplacementSourceError } = await supabase
      .from("set_component_assignment")
      .update({ valid_until: validAt, source: "damage_component_replacement" })
      .eq("id", replacementAssignment.id)
      .is("valid_until", null);

    if (closeReplacementSourceError) {
      throw closeReplacementSourceError;
    }
  }

  const { error: closeDamagedAssignmentError } = await supabase
    .from("set_component_assignment")
    .update({ valid_until: validAt, source: "damage_component_replacement" })
    .eq("id", damagedAssignment.id)
    .is("valid_until", null);

  if (closeDamagedAssignmentError) {
    throw closeDamagedAssignmentError;
  }

  const { error: newAssignmentError } = await supabase
    .from("set_component_assignment")
    .insert({
      component_id: replacementComponentId,
      legacy_set_id: currentSet.legacy_set_id,
      role: damagedAssignment.role,
      set_id: setId,
      source: "damage_component_replacement",
      valid_from: validAt,
    });

  if (newAssignmentError) {
    throw newAssignmentError;
  }

  const [damagedComponentUpdate, targetSetUpdate, sourceSetUpdate] =
    await Promise.all([
      markDamagedComponentDefective
        ? supabase
            .from("inventory_component")
            .update({
              condition: "defekt",
              legacy_status: "defekt",
            })
            .eq("id", damagedComponentId)
        : Promise.resolve({ error: null }),
      supabase
        .from("inventory_set")
        .update({ notes: note })
        .eq("id", setId),
      replacementAssignment?.set_id
        ? supabase
            .from("inventory_set")
            .update({
              condition: "unvollständig",
              notes: note,
            })
            .eq("id", replacementAssignment.set_id)
        : Promise.resolve({ error: null }),
    ]);

  if (damagedComponentUpdate.error) {
    throw damagedComponentUpdate.error;
  }

  if (targetSetUpdate.error) {
    throw targetSetUpdate.error;
  }

  if (sourceSetUpdate.error) {
    throw sourceSetUpdate.error;
  }
}

async function createDamageCase(formData: FormData) {
  "use server";

  const setId = String(formData.get("set_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const personId = String(formData.get("person_id") ?? "");
  const caseType = String(formData.get("case_type") ?? "");
  const problemType = String(formData.get("problem_type") ?? "");
  const affectedItem = String(formData.get("affected_item") ?? "");
  const status = formData.get("billing_assessment") === "nicht_abrechenbar"
    ? "abgeschlossen"
    : String(formData.get("status") ?? "offen");
  const componentId = String(formData.get("component_id") ?? "");
  const replacementComponentId = String(
    formData.get("replacement_component_id") ?? "",
  );
  const replacementSetId = String(formData.get("replacement_set_id") ?? "");
  const reportedAt = String(formData.get("reported_at") ?? "");
  const occurredAt = String(formData.get("occurred_at") ?? "");
  const replacementIssuedAt = String(formData.get("replacement_issued_at") ?? "");
  const detailDescription = String(formData.get("detail_description") ?? "").trim();
  const incidentDescription = String(
    formData.get("incident_description") ?? "",
  ).trim();
  const location = String(formData.get("location") ?? "").trim();
  const witnesses = String(formData.get("witnesses") ?? "").trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim();
  const handler = String(formData.get("handler") ?? "").trim();
  const billingAssessment = String(formData.get("billing_assessment") ?? "unklar");
  const liability = String(formData.get("liability") ?? "").trim();
  const exchangeStatus = replacementComponentId || replacementSetId ? "ausgegeben" : String(formData.get("exchange_status") ?? "").trim();
  const hasStorageLabelField = formData.has("storage_label");
  const storageLabel = String(formData.get("storage_label") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/sets");

  const validProblemTypes = ["hardware", "software"];
  const validExchangeStatuses = exchangeStatusOptions.map(
    (option) => option.value,
  );
  const normalizedProblemType =
    caseType === "schaden" || caseType === "verlust" ? "hardware" : problemType;

  if (
    (Boolean(replacementComponentId) && (affectedItem !== "component" || !componentId)) ||
    (Boolean(replacementSetId) && affectedItem !== "set") ||
    (Boolean(replacementComponentId || replacementSetId) && !replacementIssuedAt) ||
    !setId ||
    !caseType ||
    !affectedItem ||
    !reportedAt ||
    !validExchangeStatuses.includes(exchangeStatus) ||
    (caseType === "technisches_problem" &&
      !validProblemTypes.includes(normalizedProblemType))
  ) {
    redirect(appendFlagToHref(returnTo, "error", "missing_required"));
  }

  const appUser = await getCurrentAppUser();

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  if (replacementComponentId) {
    const original = await supabase.from("inventory_component").select("category").eq("id", componentId).single();
    const replacement = await supabase.from("inventory_component").select("category,condition").eq("id", replacementComponentId).single();
    const originalLink = await supabase.from("set_component_assignment").select("id").eq("component_id", componentId).eq("set_id", setId).is("valid_until", null).maybeSingle();
    const source = await supabase.from("set_component_assignment").select("set_id").eq("component_id", replacementComponentId).is("valid_until", null).maybeSingle();
    if (original.error || replacement.error || originalLink.error || source.error || !originalLink.data || source.data?.set_id === setId || original.data?.category !== replacement.data?.category || !["ok", "beschädigt_nutzbar"].includes(replacement.data?.condition ?? "")) {
      throw new Error("Die Ersatzkomponente passt nicht zur Schadenskomponente oder ist nicht verfügbar.");
    }
    if (source.data) {
    const sourceSet = await supabase.from("inventory_set").select("availability,assigned_person_id").eq("id", source.data.set_id).single();
    const sourcePerson = await supabase.from("set_person_assignment").select("id").eq("set_id", source.data.set_id).is("returned_at", null).maybeSingle();
    if (sourceSet.error || sourcePerson.error || !["frei", "blockiert"].includes(sourceSet.data?.availability ?? "") || sourceSet.data?.assigned_person_id || sourcePerson.data) {
      throw new Error("Die Ersatzkomponente muss aus einem freien oder blockierten Set ohne Personenzuordnung stammen.");
    }
    }
  }
  const [{ data: set }, { data: person }, { data: component }] = await Promise.all([
    supabase
      .from("inventory_set")
      .select("legacy_set_id")
      .eq("id", setId)
      .maybeSingle(),
    personId
      ? supabase
          .from("person")
          .select("first_name,last_name,email")
          .eq("id", personId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    componentId
      ? supabase
          .from("inventory_component")
          .select("legacy_inventory_number,model")
          .eq("id", componentId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const personLabel =
    person && "last_name" in person
      ? [person.last_name, person.first_name].filter(Boolean).join(", ") ||
        person.email ||
        "Unbekannte Person"
      : "Unbekannte Person";
  const setLabel = set?.legacy_set_id ? `Set ${set.legacy_set_id}` : "Set";
  const componentLabelText =
    component && "legacy_inventory_number" in component
      ? [
          component.legacy_inventory_number,
          component.model ? `(${component.model})` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : affectedItemLabel(affectedItem);
  const affectedLabel =
    affectedItem === "component" && componentLabelText
      ? componentLabelText
      : affectedItem === "set"
        ? setLabel
        : `${affectedItemLabel(affectedItem)} - ${setLabel}`;
  const preliminaryShortDescription = `${personLabel} - ${affectedLabel}`;

  const { data: damageCase, error } = await supabase
    .from("damage_case")
    .insert({
      set_id: setId,
      set_person_assignment_id: assignmentId || null,
      person_id: personId || null,
      component_id: componentId || null,
      replacement_component_id: replacementComponentId || null,
      replacement_set_id: replacementSetId || null,
      case_type: caseType,
      problem_type: normalizedProblemType || null,
      affected_item: affectedItem,
      status,
      reported_at: reportedAt,
      occurred_at: occurredAt || null,
      replacement_issued_at: replacementIssuedAt || null,
      short_description: preliminaryShortDescription,
      detail_description: detailDescription || null,
      incident_description: incidentDescription || null,
      location: location || null,
      witnesses: witnesses || null,
      handler: handler || null,
      internal_note: [internalNote, billingAssessment === "nicht_abrechenbar"
        ? `Automatisch abgeschlossen wegen Abrechnung „Nicht abrechenbar“ am ${new Date().toISOString()} durch Nutzer ${appUser!.id}.`
        : null].filter(Boolean).join("\n") || null,
      billing_assessment: billingAssessment,
      legacy_exchange_status: exchangeStatus || null,
      legacy_insurance_warranty: liability || null,
      created_by: appUser?.id ?? null,
    })
    .select("id,damage_number")
    .single();

  if (error) {
    throw error;
  }

  if (damageCase) {
    const shortDescription = `Schaden ${damageCase.damage_number}: ${preliminaryShortDescription}`;
    const shouldMarkDamagedPartsDefective =
      caseType !== "technisches_problem" || normalizedProblemType === "hardware";
    const { error: updateError } = await supabase
      .from("damage_case")
      .update({ short_description: shortDescription })
      .eq("id", damageCase.id);

    if (updateError) {
      throw updateError;
    }

    if (
      exchangeStatus === "ausgegeben" &&
      replacementSetId &&
      personId &&
      replacementSetId !== setId
    ) {
      await applyReplacementSetIssue({
        assignmentId,
        damageNumber: damageCase.damage_number,
        damagedComponentId: componentId || null,
        issuedAt: replacementIssuedAt || reportedAt,
        markDamagedPartsDefective: shouldMarkDamagedPartsDefective,
        personId,
        replacementSetId,
        setId,
      });
    }

    if (
      componentId &&
      replacementComponentId &&
      componentId !== replacementComponentId
    ) {
      await applyReplacementComponentIssue({
        damagedComponentId: componentId,
        damageNumber: damageCase.damage_number,
        effectiveAt: replacementIssuedAt || reportedAt,
        markDamagedComponentDefective: shouldMarkDamagedPartsDefective,
        replacementComponentId,
        setId,
      });
    }

    if (
      caseType === "technisches_problem" &&
      normalizedProblemType === "hardware" &&
      componentId
    ) {
      const { error: componentConditionError } = await supabase
        .from("inventory_component")
        .update({
          condition: "defekt",
          legacy_status: "defekt",
        })
        .eq("id", componentId);

      if (componentConditionError) {
        throw componentConditionError;
      }
    }
  }

  if (hasStorageLabelField) {
    const { error: storageError } = await supabase
      .from("inventory_set")
      .update({ storage_label: storageLabel || null })
      .eq("id", setId);

    if (storageError) {
      throw storageError;
    }
  }

  redirect(appendFlagToHref(returnTo, "damage_created", "1"));
}

export default async function DamageNewPage({
  params,
  searchParams,
}: DamageNewPageProps) {
  const { setId } = await params;
  const search = await searchParams;
  const embedded = getSingleParam(search, "embedded") === "1";
  const isProblemMode = getSingleParam(search, "mode") === "problem";
  const returnTo = getSingleParam(search, "return_to") || "/sets";
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const [
    { data: set },
    { data: assignmentData },
    { data: componentData },
    { data: setOptionsData },
    { data: componentOptionsData },
    { data: freeSetData },
    { data: currentComponentAssignmentData },
  ] = await Promise.all([
      supabase
        .from("inventory_set")
        .select("id,legacy_set_id,condition,availability,storage_label")
        .eq("id", setId)
        .maybeSingle(),
      supabase
        .from("set_person_assignment")
        .select("id,person_id,person:person_id(first_name,last_name,email,person_type)")
        .eq("set_id", setId)
        .is("returned_at", null)
        .maybeSingle(),
      supabase
        .from("set_component_assignment")
        .select("component_id,role,component:component_id(category,legacy_inventory_number,model)")
        .eq("set_id", setId)
        .is("valid_until", null)
        .order("role", { ascending: true }),
      supabase
        .from("inventory_set")
        .select("id,legacy_set_id,storage_label,person_assignments:set_person_assignment(returned_at),components:set_component_assignment(role,valid_until)")
        .eq("availability", "frei")
        .eq("condition", "ok")
        .is("assigned_person_id", null)
        .order("legacy_set_id", { ascending: true })
        .limit(1000),
      (async () => {
        const data: InventoryComponentOptionRow[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from("inventory_component")
            .select("id,category,legacy_inventory_number,model")
            .in("condition", ["ok", "beschädigt_nutzbar"])
            .order("legacy_inventory_number").range(offset, offset + 499);
          if (result.error) throw result.error;
          data.push(...result.data);
          if (result.data.length < 500) return { data };
        }
      })(),
      supabase
        .from("inventory_set")
        .select("id,legacy_set_id,condition,availability,storage_label,person_assignments:set_person_assignment(returned_at)")
        .is("assigned_person_id", null)
        .in("availability", ["frei", "blockiert"])
        .order("legacy_set_id", { ascending: true })
        .limit(1000),
      (async () => {
        const data: ComponentAssignmentCandidateRow[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from("set_component_assignment")
            .select("component_id,set_id").is("valid_until", null)
            .order("id").range(offset, offset + 499);
          if (result.error) throw result.error;
          data.push(...result.data);
          if (result.data.length < 500) return { data };
        }
      })(),
    ]);

  if (!set) {
    notFound();
  }

  const rawAssignment = assignmentData as RawCurrentAssignmentRow | null;
  const assignment = rawAssignment
    ? {
        ...rawAssignment,
        person: normalizeJoin(rawAssignment.person),
      }
    : null;

  const componentAssignments = (
    (componentData ?? []) as RawComponentAssignmentRow[]
  ).map((componentAssignment) => ({
    ...componentAssignment,
    component: normalizeJoin(componentAssignment.component),
  }));
  const setOptions = (setOptionsData ?? []).filter((option) =>
    !option.person_assignments.some((assignment) => assignment.returned_at === null)
    && ["ipad", "pencil", "keyboard"].every((role) => option.components.some((component) => component.role === role && component.valid_until === null)),
  );
  const componentOptions = (componentOptionsData ??
    []) as InventoryComponentOptionRow[];
  const freeSets = (freeSetData ?? []).filter((item) => !item.person_assignments.some((assignment) => assignment.returned_at === null));
  const currentComponentAssignments = (currentComponentAssignmentData ??
    []) as ComponentAssignmentCandidateRow[];
  const freeSetIdSet = new Set(freeSets.map((freeSet) => freeSet.id));
  const freeSetLabelById = new Map(
    freeSets.map((freeSet) => [freeSet.id, `Set ${freeSet.legacy_set_id} · ${freeSet.condition === "unvollständig" ? "Unvollständig – bevorzugt" : "Vollständiges Set"} · ${freeSet.availability === "frei" ? "Frei" : "Blockiert"} · Lagerort: ${freeSet.storage_label || "-"}`]),
  );
  const freeSetComponentSourceById = new Map(
    currentComponentAssignments
      .filter((assignment) => freeSetIdSet.has(assignment.set_id))
      .map((assignment) => [
        assignment.component_id,
        freeSetLabelById.get(assignment.set_id) ?? "freies Set",
      ]),
  );
  const assignedComponentIds = new Set(currentComponentAssignments.map((assignment) => assignment.component_id));
  const preferredSetIds = new Set(freeSets.filter((set) => set.condition === "unvollständig").map((set) => set.id));
  const preferredComponentIds = new Set(currentComponentAssignments.filter((assignment) => preferredSetIds.has(assignment.set_id)).map((assignment) => assignment.component_id));
  const replacementComponentOptions = componentOptions
    .filter(
      (component) =>
        component.id !== componentAssignments.find(
          (assignment) => assignment.component_id === component.id,
        )?.component_id &&
        (freeSetComponentSourceById.has(component.id) || !assignedComponentIds.has(component.id)),
    )
    .sort((a, b) => {
      const priority = (id: string) => preferredComponentIds.has(id) ? 0 : !assignedComponentIds.has(id) ? 1 : 2;
      return priority(a.id) - priority(b.id);
    })
    .map((component) => ({
      category: component.category,
      id: component.id,
      label: componentOptionLabel(component),
      sourceLabel:
        freeSetComponentSourceById.get(component.id) ?? "freie Einzelkomponente",
    }));
  const currentComponentOptions = componentAssignments
    .filter((assignment) => assignment.component)
    .map((assignment) => ({
      category: assignment.component?.category ?? assignment.role,
      id: assignment.component_id,
      label: componentLabel(assignment),
    }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main
      className={
        embedded ? "bg-white text-zinc-950" : "min-h-screen bg-zinc-50 text-zinc-950"
      }
    >
      <section
        className={
          embedded
            ? "flex w-full flex-col gap-5"
            : "mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10"
        }
      >
        {!embedded ? (
          <div>
            <Link className="text-sm font-medium text-zinc-500" href="/sets">
              Sets und Komponenten
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {isProblemMode ? "Problem melden" : "Schaden oder Verlust melden"}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Set {set.legacy_set_id} · {formatPerson(assignment?.person ?? null)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Set {set.legacy_set_id} · {formatPerson(assignment?.person ?? null)}
          </p>
        )}

        <DamageExchangeForm
          action={createDamageCase}
          className={
            embedded
              ? "grid gap-5"
              : "grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          }
        >
          <input name="set_id" type="hidden" value={set.id} />
          <input name="assignment_id" type="hidden" value={assignment?.id ?? ""} />
          <input name="person_id" type="hidden" value={assignment?.person_id ?? ""} />
          <input name="return_to" type="hidden" value={returnTo} />

          <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
            <h3 className="font-semibold">Kernangaben</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormFieldLabel label="Vorgangsart">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue={isProblemMode ? "technisches_problem" : "schaden"}
                  name="case_type"
                  required
                >
                  <option value="schaden">Schaden</option>
                  <option value="verlust">Verlust</option>
                  <option value="technisches_problem">Technisches Problem</option>
                </select>
              </FormFieldLabel>

              <FormFieldLabel label="Problemart">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue="hardware"
                  name="problem_type"
                >
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                </select>
              </FormFieldLabel>

              <FormFieldLabel label="Status">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue="offen"
                  name="status"
                >
                  <option value="offen">Offen</option>
                  <option value="in_bearbeitung">In Bearbeitung</option>
                  <option value="abgeschlossen">Abgeschlossen</option>
                </select>
              </FormFieldLabel>

            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFieldLabel label="Betroffen">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="affected_item"
                  required
                >
                  <option value="component">Konkrete Komponente</option>
                  <option value="set">Ganzes Set</option>
                  <option value="power_adapter">Netzteil zum iPad</option>
                  <option value="charging_cable">Kabel zum iPad</option>
                  <option value="other">Sonstiges Zubehör</option>
                </select>
              </FormFieldLabel>

              <FormFieldLabel label="Komponente">
                <select
                  className="inventory-number rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="component_id"
                >
                  <option value="">Keine Komponente mit Inventarnummer</option>
                  {currentComponentOptions.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.label}
                    </option>
                  ))}
                </select>
              </FormFieldLabel>
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
            <h3 className="font-semibold">Schaden</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormFieldLabel label="Meldedatum">
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue={today}
                  name="reported_at"
                  required
                  type="date"
                />
              </FormFieldLabel>

              <FormFieldLabel label="Ereignisdatum">
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="occurred_at"
                  type="date"
                />
              </FormFieldLabel>

              <FormFieldLabel label="Ort">
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="location"
                />
              </FormFieldLabel>
            </div>

            {isProblemMode ? (
              <FormFieldLabel label="Lagerort">
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue={set.storage_label ?? ""}
                  name="storage_label"
                  placeholder="z. B. W2 - 24, Schrank1 oder Regal1"
                />
              </FormFieldLabel>
            ) : null}

            {isProblemMode ? null : (
              <FormFieldLabel label="Hergang | Wie">
                <textarea
                  className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="incident_description"
                />
              </FormFieldLabel>
            )}

            <FormFieldLabel
              label={isProblemMode ? "Problembeschreibung" : "Schadenbeschreibung | was"}
            >
              <textarea
                className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                name="detail_description"
              />
            </FormFieldLabel>

            {isProblemMode ? null : (
              <FormFieldLabel label="Zeugen">
                <textarea
                  className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="witnesses"
                />
              </FormFieldLabel>
            )}
          </section>

          <DamageExchangeFields current={currentComponentOptions} components={replacementComponentOptions} sets={setOptions.filter((option) => option.id !== set.id)} />

          <section className="grid gap-4 rounded-lg border border-zinc-200 p-4">
            <h3 className="font-semibold">Bearbeitung</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormFieldLabel label="Haftung">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="liability"
                >
                  <option value="">Unklar</option>
                  <option value="Eltern">Eltern</option>
                  <option value="Schule">Schule</option>
                  <option value="Garantie">Garantie</option>
                </select>
              </FormFieldLabel>

              <FormFieldLabel label="Abrechnung">
                <select
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  name="billing_assessment"
                >
                  <option value="unklar">Unklar</option>
                  <option value="abrechenbar">Abrechenbar</option>
                  <option value="nicht_abrechenbar">Nicht abrechenbar</option>
                </select>
              </FormFieldLabel>

              <FormFieldLabel label="Bearbeiter">
                <input
                  className="rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                  defaultValue={appUser.fullName ?? appUser.displayName ?? appUser.email}
                  name="handler"
                />
              </FormFieldLabel>
            </div>

            <FormFieldLabel label="Interne Notiz">
              <textarea
                className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 font-normal outline-none ring-emerald-500 transition focus:ring-2"
                name="internal_note"
              />
            </FormFieldLabel>
          </section>

          <section className="rounded-lg border border-zinc-200 p-4">
            <h3 className="font-semibold">Zuordnung</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Person
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {formatPerson(assignment?.person ?? null)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Set
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {set.legacy_set_id}
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-4">
            <Link
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
              href={returnTo}
            >
              Abbrechen
            </Link>
            <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800">
              Meldung speichern
            </button>
          </div>
        </DamageExchangeForm>
      </section>
    </main>
  );
}
