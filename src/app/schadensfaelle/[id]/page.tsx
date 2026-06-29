import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentAppUser, hasAnyRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type DetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type DamageCaseDetail = {
  affected_components_raw: string | null;
  affected_item: string;
  billing_assessment: string;
  case_type: string;
  created_at: string;
  damage_number: number;
  detail_description: string | null;
  handler: string | null;
  id: string;
  import_hint: string | null;
  import_status: string | null;
  incident_description: string | null;
  internal_note: string | null;
  legacy_damage_id: number | null;
  legacy_exchange_status: string | null;
  legacy_insurance_warranty: string | null;
  legacy_source: string | null;
  legacy_source_id: string | null;
  legacy_status: string | null;
  location: string | null;
  occurred_at: string | null;
  reported_at: string;
  replacement_issued_at: string | null;
  short_description: string;
  status: string;
  updated_at: string;
  witnesses: string | null;
  component: {
    legacy_inventory_number: string;
    model: string | null;
  } | null;
  created_by_user: {
    email: string;
  } | null;
  inventory_set: {
    legacy_set_id: number;
  } | null;
  person: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    person_type: string;
  } | null;
  replacement_component: {
    legacy_inventory_number: string;
    model: string | null;
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

function normalizeJoin<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPerson(person: DamageCaseDetail["person"]) {
  if (!person) {
    return "-";
  }

  const name = [person.last_name, person.first_name].filter(Boolean).join(", ");
  return name || person.email || "-";
}

function formatSet(set: DamageCaseDetail["inventory_set"]) {
  return set ? String(set.legacy_set_id) : "-";
}

function formatComponent(component: DamageCaseDetail["component"]) {
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
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-950">
        {value || "-"}
      </dd>
    </div>
  );
}

function FieldGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

export default async function SchadensfallDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect("/login");
  }

  if (!hasAnyRole(appUser, ["admin", "ipad_verwaltung", "buchhaltung"])) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("damage_case")
    .select(
      "id,damage_number,legacy_damage_id,legacy_source,legacy_source_id,case_type,affected_item,status,legacy_status,legacy_exchange_status,legacy_insurance_warranty,reported_at,occurred_at,replacement_issued_at,short_description,detail_description,incident_description,location,witnesses,handler,internal_note,affected_components_raw,import_status,import_hint,billing_assessment,created_at,updated_at,person:person_id(first_name,last_name,email,person_type),inventory_set:set_id(legacy_set_id),replacement_set:replacement_set_id(legacy_set_id),component:component_id(legacy_inventory_number,model),replacement_component:replacement_component_id(legacy_inventory_number,model),created_by_user:created_by(email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const rawCase = data as RawDamageCaseDetail;
  const damageCase: DamageCaseDetail = {
    ...rawCase,
    component: normalizeJoin(rawCase.component),
    created_by_user: normalizeJoin(rawCase.created_by_user),
    inventory_set: normalizeJoin(rawCase.inventory_set),
    person: normalizeJoin(rawCase.person),
    replacement_component: normalizeJoin(rawCase.replacement_component),
    replacement_set: normalizeJoin(rawCase.replacement_set),
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div>
          <Link className="text-sm font-medium text-zinc-500" href="/schadensfaelle">
            Schadensfälle
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Schadensfall {damageCase.damage_number}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {damageCase.short_description}
          </p>
        </div>

        <FieldGroup title="Kernangaben">
          <Field label="Status" value={damageCase.status} />
          <Field label="Art" value={damageCase.case_type} />
          <Field
            label="Betroffen"
            value={affectedItemLabel(damageCase.affected_item)}
          />
          <Field label="Meldedatum" value={damageCase.reported_at} />
          <Field label="Ereignisdatum" value={damageCase.occurred_at} />
          <Field label="Abrechnung" value={damageCase.billing_assessment} />
          <Field label="Person" value={formatPerson(damageCase.person)} />
          <Field label="Set" value={formatSet(damageCase.inventory_set)} />
          <Field label="Komponente" value={formatComponent(damageCase.component)} />
          <Field
            label="Ersatzset"
            value={formatSet(damageCase.replacement_set)}
          />
          <Field
            label="Ersatzkomponente"
            value={formatComponent(damageCase.replacement_component)}
          />
          <Field
            label="Ersatz ausgegeben am"
            value={damageCase.replacement_issued_at}
          />
        </FieldGroup>

        <FieldGroup title="Beschreibung">
          <Field label="Kurzbeschreibung" value={damageCase.short_description} />
          <Field label="Schadenbeschreibung" value={damageCase.detail_description} />
          <Field label="Hergang" value={damageCase.incident_description} />
          <Field label="Ort" value={damageCase.location} />
          <Field label="Zeugen" value={damageCase.witnesses} />
          <Field label="Interne Notiz" value={damageCase.internal_note} />
        </FieldGroup>

        <FieldGroup title="Legacy und Import">
          <Field label="Legacy-ID" value={damageCase.legacy_damage_id} />
          <Field label="Quelle" value={damageCase.legacy_source} />
          <Field label="Quelle-ID" value={damageCase.legacy_source_id} />
          <Field label="Legacy-Status" value={damageCase.legacy_status} />
          <Field
            label="Austauschstatus"
            value={damageCase.legacy_exchange_status}
          />
          <Field
            label="Versicherung/Garantie"
            value={damageCase.legacy_insurance_warranty}
          />
          <Field
            label="Betroffene Komponenten"
            value={damageCase.affected_components_raw}
          />
          <Field label="Bearbeiter" value={damageCase.handler} />
          <Field label="Importstatus" value={damageCase.import_status} />
          <Field label="Importhinweis" value={damageCase.import_hint} />
          <Field label="Angelegt durch" value={damageCase.created_by_user?.email} />
          <Field label="Erstellt am" value={damageCase.created_at} />
          <Field label="Geändert am" value={damageCase.updated_at} />
        </FieldGroup>
      </section>
    </main>
  );
}
