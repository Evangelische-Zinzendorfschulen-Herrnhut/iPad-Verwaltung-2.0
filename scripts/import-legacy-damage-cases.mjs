import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      const value = rawValue.trim().replace(/^['"]|['"]$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeDate(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const germanMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (germanMatch) {
    return `${germanMatch[3]}-${germanMatch[2].padStart(2, "0")}-${germanMatch[1].padStart(2, "0")}`;
  }

  return null;
}

function readLegacyRows(sqlitePath, tableName, orderBy) {
  const output = execFileSync(
    "sqlite3",
    ["-json", sqlitePath, `select * from "${tableName}" order by ${orderBy}`],
    { encoding: "utf8" },
  );

  return JSON.parse(output);
}

async function loadMap(supabase, table, select, keyField, valueField) {
  const map = new Map();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + 999);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const key = row[keyField];
      const value = row[valueField];

      if (key !== null && key !== undefined && value) {
        map.set(key, value);
      }
    }

    if (!data || data.length < 1000) {
      break;
    }

    from += 1000;
  }

  return map;
}

function normalizeStatus(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (text.includes("abgeschlossen")) {
    return "abgeschlossen";
  }

  if (text.includes("bearbeitung")) {
    return "in_bearbeitung";
  }

  return "offen";
}

function normalizeCaseType(row) {
  const text = [
    row.Kategorie,
    row.Kurzbeschreibung,
    row.SchadenBeschreibung,
    row.Hergang,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("verlust") || text.includes("abhanden")) {
    return "verlust";
  }

  if (
    text.includes("funktions") ||
    text.includes("backup") ||
    text.includes("speicher") ||
    text.includes("garantie") ||
    text.includes("reagiert nicht")
  ) {
    return "technisches_problem";
  }

  return "schaden";
}

function normalizeAffectedItem(row) {
  const text = [row.BetroffenerSlot, row.Kategorie]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("tastatur")) {
    return "keyboard";
  }

  if (text.includes("pencil") || text.includes("tucano")) {
    return "pencil";
  }

  if (text.includes("adapter")) {
    return "adapter";
  }

  if (text.includes("hdmi")) {
    return "hdmi_cable";
  }

  if (text.includes("maus") || text.includes("magic")) {
    return "magic_mouse";
  }

  if (text.includes("ipad") || text.includes("display") || text.includes("backup")) {
    return "ipad";
  }

  return "other";
}

function normalizeBillingAssessment(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (text.includes("eltern")) {
    return "abrechenbar";
  }

  if (text.includes("schule") || text.includes("garantie")) {
    return "nicht_abrechenbar";
  }

  return "unklar";
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const sqlitePath = resolve(process.cwd(), requireEnv("LEGACY_SQLITE_PATH"));
const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const damageRows = readLegacyRows(sqlitePath, "Schaden", "SchadenID");
const today = new Date().toISOString().slice(0, 10);

const peopleByLegacyUserId = await loadMap(
  supabase,
  "person",
  "id,legacy_user_id",
  "legacy_user_id",
  "id",
);
const setsByLegacySetId = await loadMap(
  supabase,
  "inventory_set",
  "id,legacy_set_id",
  "legacy_set_id",
  "id",
);
const componentsByInventoryNumber = await loadMap(
  supabase,
  "inventory_component",
  "id,legacy_inventory_number",
  "legacy_inventory_number",
  "id",
);
const assignmentsByLegacyAssignmentId = await loadMap(
  supabase,
  "set_person_assignment",
  "id,legacy_assignment_id",
  "legacy_assignment_id",
  "id",
);

let imported = 0;
let withoutSet = 0;
let withoutPerson = 0;

for (const row of damageRows) {
  const setId = setsByLegacySetId.get(normalizeInteger(row.SetID)) ?? null;
  const personId = peopleByLegacyUserId.get(normalizeInteger(row.UserID)) ?? null;
  const shortDescription =
    normalizeText(row.Kurzbeschreibung) ??
    normalizeText(row.SchadenBeschreibung) ??
    `Legacy-Schadensfall ${row.SchadenID}`;

  if (!setId) {
    withoutSet += 1;
  }

  if (!personId) {
    withoutPerson += 1;
  }

  const { error } = await supabase.from("damage_case").upsert(
    {
      legacy_damage_id: row.SchadenID,
      legacy_source: normalizeText(row.Quelle),
      legacy_source_id: normalizeText(row.QuelleID),
      set_id: setId,
      replacement_set_id:
        setsByLegacySetId.get(normalizeInteger(row.ErsatzSetID)) ?? null,
      set_person_assignment_id:
        assignmentsByLegacyAssignmentId.get(normalizeInteger(row.ZuordnungID)) ??
        null,
      person_id: personId,
      component_id:
        componentsByInventoryNumber.get(normalizeText(row.SchadensgeraetInvNr)) ??
        null,
      replacement_component_id:
        componentsByInventoryNumber.get(normalizeText(row.ErsatzgeraetInvNr)) ??
        null,
      case_type: normalizeCaseType(row),
      affected_item: normalizeAffectedItem(row),
      status: normalizeStatus(row.Status),
      legacy_status: normalizeText(row.Status),
      legacy_exchange_status: normalizeText(row.AustauschStatus),
      legacy_insurance_warranty: normalizeText(row.VersicherungGarantie),
      reported_at:
        normalizeDate(row.GemeldetAm) ?? normalizeDate(row.ErstelltAm) ?? today,
      occurred_at: normalizeDate(row.PassiertAm),
      replacement_issued_at: normalizeDate(row.ErsatzAusgegebenAm),
      short_description: shortDescription,
      detail_description: normalizeText(row.SchadenBeschreibung),
      incident_description: normalizeText(row.Hergang),
      location: normalizeText(row.Ort),
      witnesses: normalizeText(row.Zeugen),
      handler: normalizeText(row.Bearbeiter),
      internal_note: normalizeText(row.Anmerkungen),
      affected_components_raw: normalizeText(row.BetroffeneKomponenten),
      import_status: normalizeText(row.ImportStatus),
      import_hint: normalizeText(row.ImportHinweis),
      billing_assessment: normalizeBillingAssessment(row.VersicherungGarantie),
    },
    { onConflict: "legacy_damage_id" },
  );

  if (error) {
    throw error;
  }

  imported += 1;
}

console.log(
  JSON.stringify(
    {
      legacy_damage_rows: damageRows.length,
      imported,
      without_set: withoutSet,
      without_person: withoutPerson,
    },
    null,
    2,
  ),
);
