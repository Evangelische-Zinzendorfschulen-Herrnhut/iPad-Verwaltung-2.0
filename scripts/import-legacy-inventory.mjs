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

function normalizeBoolean(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return Number(value) === 1;
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

function normalizeDecimal(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const normalized = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function readLegacyRows(sqlitePath, tableName, orderBy) {
  const output = execFileSync(
    "sqlite3",
    ["-json", sqlitePath, `select * from "${tableName}" order by ${orderBy}`],
    { encoding: "utf8" },
  );

  return JSON.parse(output);
}

function normalizeCategory(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (text === "ipad") {
    return "ipad";
  }

  if (text === "pencil") {
    return "pencil";
  }

  if (text === "tastatur") {
    return "keyboard";
  }

  if (text === "adapter") {
    return "adapter";
  }

  if (text === "maus") {
    return "mouse";
  }

  return "other";
}

function normalizeCondition(value, category) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (!text || text === "ok" || text === "frei") {
    return "ok";
  }

  if (text === "gesperrt, kein mdm") {
    return category === "ipad" ? "gesperrt_kein_mdm" : "unklar";
  }

  if (text.includes("beschädigt") && text.includes("funktions")) {
    return "beschädigt_nutzbar";
  }

  if (
    [
      "defekt",
      "ausgemustert",
      "funktionslos",
      "reparatur",
      "reparatur?",
      "totalschaden",
      "displayschaden",
      "batterie leer",
      "umtausch",
      "umtausch auf garantie",
      "getauscht",
    ].includes(text)
  ) {
    return "defekt";
  }

  return "unklar";
}

function normalizeSetCondition(value) {
  const text = normalizeText(value)?.toLowerCase() ?? "";

  if (!text || text === "ok" || text === "ausgegeben" || text === "ausgabe") {
    return "ok";
  }

  if (text.includes("unvoll")) {
    return "unvollständig";
  }

  if (text.includes("defekt") || text.includes("gesperrt")) {
    return "defekt";
  }

  return "unklar";
}

function normalizeSetAvailability(setRow) {
  const status = normalizeText(setRow.SetStatus)?.toLowerCase() ?? "";

  if (status.includes("defekt") || status.includes("unvoll") || status.includes("gesperrt")) {
    return "blockiert";
  }

  if (setRow.UserID) {
    return "ausgegeben";
  }

  if (!status || status === "ok" || status === "nicht zugeordnet" || status === "zurücksetzen") {
    return "frei";
  }

  return "unklar";
}

function roleForComponent(category) {
  if (category === "keyboard") {
    return "keyboard";
  }

  return category;
}

function inventoryNumberSetSuffix(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const match = text.match(/\/\s*(\d+)\s*$/);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

async function loadPeopleByLegacyUserId(supabase) {
  const people = new Map();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("person")
      .select("id,legacy_user_id")
      .not("legacy_user_id", "is", null)
      .range(from, from + 999);

    if (error) {
      throw error;
    }

    for (const person of data ?? []) {
      people.set(person.legacy_user_id, person.id);
    }

    if (!data || data.length < 1000) {
      break;
    }

    from += 1000;
  }

  return people;
}

async function importPurchaseInvoices(supabase, invoices) {
  const invoiceByLegacyNumber = new Map();

  for (const invoice of invoices) {
    const legacyInvoiceNumber = normalizeInteger(invoice.RechnungsNr);

    if (!legacyInvoiceNumber) {
      continue;
    }

    const { data, error } = await supabase
      .from("purchase_invoice")
      .upsert(
        {
          invoice_date: normalizeDate(invoice.RechnungsDatum),
          legacy_invoice_number: legacyInvoiceNumber,
          supplier: normalizeText(invoice.Lieferant),
        },
        { onConflict: "legacy_invoice_number" },
      )
      .select("id,legacy_invoice_number")
      .single();

    if (error) {
      throw error;
    }

    invoiceByLegacyNumber.set(data.legacy_invoice_number, data.id);
  }

  return invoiceByLegacyNumber;
}

async function importPurchaseInvoicePositions(
  supabase,
  invoicePositions,
  invoiceByLegacyNumber,
) {
  const positionByLegacyNumber = new Map();

  for (const position of invoicePositions) {
    const legacyPositionNumber = normalizeInteger(position.RechnungsPositionsNr);

    if (!legacyPositionNumber) {
      continue;
    }

    const legacyInvoiceNumber = normalizeInteger(position.RechnungsNr);
    const { data, error } = await supabase
      .from("purchase_invoice_position")
      .upsert(
        {
          invoice_id: invoiceByLegacyNumber.get(legacyInvoiceNumber) ?? null,
          legacy_invoice_position_number: legacyPositionNumber,
          legacy_quantity: normalizeText(position.Anzahl),
          legacy_unit_price: normalizeText(position.Einzelpreis),
          quantity: normalizeInteger(position.Anzahl),
          title: normalizeText(position.Titel),
          unit_price: normalizeDecimal(position.Einzelpreis),
        },
        { onConflict: "legacy_invoice_position_number" },
      )
      .select("id,legacy_invoice_position_number")
      .single();

    if (error) {
      throw error;
    }

    positionByLegacyNumber.set(data.legacy_invoice_position_number, data.id);
  }

  return positionByLegacyNumber;
}

async function importComponents(supabase, devices, invoicePositionByLegacyNumber) {
  const componentByInventoryNumber = new Map();

  for (const device of devices) {
    const category = normalizeCategory(device.Kategorie);
    const invoicePositionNumber = normalizeInteger(device.RechnungsPositionsNr);
    const { data, error } = await supabase
      .from("inventory_component")
      .upsert(
        {
          legacy_inventory_number: device.InvNr,
          legacy_set_number: normalizeInteger(device.SetNr),
          category,
          model: normalizeText(device.Typ),
          condition: normalizeCondition(device.Status, category),
          legacy_status: normalizeText(device.Status),
          serial_number: normalizeText(device.Seriennummer),
          invoice_position_id:
            invoicePositionByLegacyNumber.get(invoicePositionNumber) ?? null,
          invoice_position_number: invoicePositionNumber,
          notes: normalizeText(device.Anmerkungen),
          storage_label: normalizeText(device.Lager),
        },
        { onConflict: "legacy_inventory_number" },
      )
      .select("id,legacy_inventory_number,category")
      .single();

    if (error) {
      throw error;
    }

    componentByInventoryNumber.set(data.legacy_inventory_number, data);
  }

  return componentByInventoryNumber;
}

async function importSets(supabase, sets, peopleByLegacyUserId) {
  const setByLegacyId = new Map();
  let skipped = 0;

  for (const legacySet of sets) {
    if (!normalizeInteger(legacySet.SetID)) {
      skipped += 1;
      continue;
    }

    const assignedPersonId =
      peopleByLegacyUserId.get(normalizeInteger(legacySet.UserID)) ?? null;
    const { data, error } = await supabase
      .from("inventory_set")
      .upsert(
        {
          legacy_set_id: legacySet.SetID,
          legacy_user_id: normalizeInteger(legacySet.UserID),
          assigned_person_id: assignedPersonId,
          condition: normalizeSetCondition(legacySet.SetStatus),
          availability: normalizeSetAvailability(legacySet),
          legacy_status: normalizeText(legacySet.SetStatus),
          legacy_email: normalizeText(legacySet.Email)?.toLowerCase() ?? null,
          storage_label: normalizeText(legacySet.Standort),
          marker: normalizeText(legacySet.Marker),
          notes: normalizeText(legacySet.Anmerkung),
        },
        { onConflict: "legacy_set_id" },
      )
      .select("id,legacy_set_id")
      .single();

    if (error) {
      throw error;
    }

    setByLegacyId.set(data.legacy_set_id, data.id);
  }

  return { setByLegacyId, skipped };
}

async function closeCurrentComponentAssignments(supabase) {
  const { error } = await supabase
    .from("set_component_assignment")
    .update({ valid_until: new Date().toISOString() })
    .is("valid_until", null);

  if (error) {
    throw error;
  }
}

async function importSetComponents(supabase, sets, setByLegacyId, components) {
  let inserted = 0;
  let missing = 0;
  let ipadSetSwapHintsSkipped = 0;
  let duplicateComponentsSkipped = 0;
  let duplicateRolesSkipped = 0;
  const assignedComponentIds = new Set();
  const assignedSetRoles = new Set();

  await closeCurrentComponentAssignments(supabase);

  for (const legacySet of sets) {
    const setId = setByLegacyId.get(legacySet.SetID);
    const candidates = [legacySet.iPad, legacySet.Pencil, legacySet.Tastatur];

    for (const inventoryNumber of candidates) {
      const component = components.get(normalizeText(inventoryNumber));

      if (!setId || !inventoryNumber || !component) {
        if (inventoryNumber) {
          missing += 1;
        }
        continue;
      }

      const role = roleForComponent(component.category);
      const setSuffix = inventoryNumberSetSuffix(inventoryNumber);

      if (
        role === "ipad" &&
        setSuffix !== null &&
        setSuffix !== normalizeInteger(legacySet.SetID)
      ) {
        ipadSetSwapHintsSkipped += 1;
        continue;
      }

      const setRoleKey = `${setId}:${role}`;

      if (assignedComponentIds.has(component.id)) {
        duplicateComponentsSkipped += 1;
        continue;
      }

      if (assignedSetRoles.has(setRoleKey)) {
        duplicateRolesSkipped += 1;
        continue;
      }

      const { error } = await supabase.from("set_component_assignment").insert({
        set_id: setId,
        component_id: component.id,
        role,
        legacy_set_id: legacySet.SetID,
        source: "legacy_sets_table",
      });

      if (error) {
        throw error;
      }

      assignedComponentIds.add(component.id);
      assignedSetRoles.add(setRoleKey);
      inserted += 1;
    }
  }

  return {
    inserted,
    missing,
    ipad_set_swap_hints_skipped: ipadSetSwapHintsSkipped,
    duplicate_components_skipped: duplicateComponentsSkipped,
    duplicate_roles_skipped: duplicateRolesSkipped,
  };
}

async function importPersonAssignments(
  supabase,
  assignments,
  setByLegacyId,
  peopleByLegacyUserId,
) {
  let imported = 0;
  let skipped = 0;

  for (const assignment of assignments) {
    const setId = setByLegacyId.get(assignment.SetID);

    if (!setId) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase
      .from("set_person_assignment")
      .upsert(
        {
          legacy_assignment_id: assignment.ZuordnungID,
          set_id: setId,
          person_id: peopleByLegacyUserId.get(assignment.UserID) ?? null,
          legacy_user_id: assignment.UserID,
          issued_at: normalizeDate(assignment.AusgabeDatum),
          returned_at: normalizeDate(assignment.RueckgabeDatum),
          legacy_status: normalizeText(assignment.Status),
          issue_note: normalizeText(assignment.AusgabeBemerkung),
          return_note: normalizeText(assignment.RueckgabeBemerkung),
          return_ipad_present: normalizeBoolean(assignment.RueckgabeIPadVorhanden),
          return_power_adapter_present: normalizeBoolean(
            assignment.RueckgabeNetzteilVorhanden,
          ),
          return_charging_cable_present: normalizeBoolean(
            assignment.RueckgabeLadekabelVorhanden,
          ),
          return_pencil_present: normalizeBoolean(
            assignment.RueckgabePencilVorhanden,
          ),
          return_pencil_cap_present: normalizeBoolean(
            assignment.RueckgabePencilKappeVorhanden,
          ),
          return_keyboard_present: normalizeBoolean(
            assignment.RueckgabeTastaturVorhanden,
          ),
        },
        { onConflict: "legacy_assignment_id" },
      );

    if (error) {
      throw error;
    }

    imported += 1;
  }

  return { imported, skipped };
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

const devices = readLegacyRows(sqlitePath, "Device", "InvNr");
const invoices = readLegacyRows(sqlitePath, "Rechnung", "RechnungsNr");
const invoicePositions = readLegacyRows(
  sqlitePath,
  "Rechnungsposition",
  "RechnungsPositionsNr",
);
const sets = readLegacyRows(sqlitePath, "Sets", "SetID");
const personAssignments = readLegacyRows(
  sqlitePath,
  "SetUserZuordnung",
  "ZuordnungID",
);

const peopleByLegacyUserId = await loadPeopleByLegacyUserId(supabase);
const invoiceByLegacyNumber = await importPurchaseInvoices(supabase, invoices);
const invoicePositionByLegacyNumber = await importPurchaseInvoicePositions(
  supabase,
  invoicePositions,
  invoiceByLegacyNumber,
);
const componentByInventoryNumber = await importComponents(
  supabase,
  devices,
  invoicePositionByLegacyNumber,
);
const setImportStats = await importSets(supabase, sets, peopleByLegacyUserId);
const setByLegacyId = setImportStats.setByLegacyId;
const componentAssignmentStats = await importSetComponents(
  supabase,
  sets,
  setByLegacyId,
  componentByInventoryNumber,
);
const personAssignmentStats = await importPersonAssignments(
  supabase,
  personAssignments,
  setByLegacyId,
  peopleByLegacyUserId,
);

console.log(
  JSON.stringify(
    {
      devices: devices.length,
      invoice_positions: invoicePositionByLegacyNumber.size,
      invoices: invoiceByLegacyNumber.size,
      components: componentByInventoryNumber.size,
      sets: setByLegacyId.size,
      sets_skipped_missing_legacy_id: setImportStats.skipped,
      component_assignments_inserted: componentAssignmentStats.inserted,
      component_assignments_missing_components: componentAssignmentStats.missing,
      component_assignments_ipad_set_swap_hints_skipped:
        componentAssignmentStats.ipad_set_swap_hints_skipped,
      component_assignments_duplicate_components_skipped:
        componentAssignmentStats.duplicate_components_skipped,
      component_assignments_duplicate_roles_skipped:
        componentAssignmentStats.duplicate_roles_skipped,
      person_assignments_imported: personAssignmentStats.imported,
      person_assignments_skipped: personAssignmentStats.skipped,
    },
    null,
    2,
  ),
);
