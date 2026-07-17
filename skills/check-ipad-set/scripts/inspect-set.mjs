#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

function readEnv(path = ".env.local") {
  const entries = {};
  const text = fs.readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    entries[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return entries;
}

function uniqueById(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows ?? []) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function decodeXmlText(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readZipEntries(path) {
  const buffer = fs.readFileSync(path);
  const entries = new Map();
  let offset = 0;

  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const dataStart = fileNameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;
    const fileName = buffer.toString("utf8", fileNameStart, fileNameEnd);
    const compressed = buffer.subarray(dataStart, dataEnd);
    const data =
      compression === 0
        ? compressed
        : compression === 8
          ? zlib.inflateRawSync(compressed)
          : null;

    if (data) {
      entries.set(fileName, data.toString("utf8"));
    }

    offset = dataEnd;
  }

  return entries;
}

function parseSharedStrings(xml) {
  if (!xml) return [];

  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const textParts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
    return textParts.map((part) => decodeXmlText(part[1])).join("");
  });
}

function parseCellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] ?? "";
  const inlineText = cellXml.match(/<is\b[^>]*>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);

  if (inlineText) {
    return decodeXmlText(inlineText[1]).trim();
  }

  const value = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1];
  if (value == null) return "";

  if (type === "s") {
    return String(sharedStrings[Number(value)] ?? "").trim();
  }

  return decodeXmlText(value).trim();
}

function parseWorksheetRows(xml, sharedStrings) {
  if (!xml) return [];

  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const cellXml = cellMatch[0];
      const ref = attributes.match(/\br="([A-Z]+)(\d+)"/)?.[1] ?? "";
      const index = ref
        ? [...ref].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1
        : row.length;
      row[index] = parseCellValue(cellXml, sharedStrings);
    }

    return row;
  });
}

function readLoosePowerSupplyRows(path = "input/Lose Netzteile.xlsx") {
  if (!fs.existsSync(path)) return [];

  const entries = readZipEntries(path);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml"));
  const worksheet =
    entries.get("xl/worksheets/sheet1.xml") ??
    [...entries.entries()].find(([name]) => name.startsWith("xl/worksheets/"))?.[1];
  const rows = parseWorksheetRows(worksheet, sharedStrings);
  const headers = (rows[0] ?? []).map((header) => String(header ?? "").trim());

  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
}

function normalizeInventoryNeedle(inventoryNumber) {
  return String(inventoryNumber ?? "").split(" / ")[0].trim();
}

function checkLoosePowerSupply(currentComponents) {
  const ipadInventoryNumber = currentComponents.find((row) => row.role === "ipad")
    ?.component?.legacy_inventory_number;
  const needle = normalizeInventoryNeedle(ipadInventoryNumber);
  const rows = readLoosePowerSupplyRows();
  const match = rows.find((row) =>
    normalizeInventoryNeedle(row.InvNr).toLowerCase() === needle.toLowerCase(),
  );

  return {
    found: Boolean(match),
    icon: match ? "🟢" : "🔴",
    inventoryNumber: ipadInventoryNumber ?? null,
    match: match
      ? {
          invNr: match.InvNr || null,
          user: match.User || null,
          klasse: match.Klasse || null,
          anmerkung: match.Anmerkung || null,
        }
      : null,
  };
}

function formatSetSuffix(setNumber) {
  return String(setNumber).padStart(4, "0");
}

async function main() {
  const setNumber = Number(process.argv[2]);
  if (!Number.isInteger(setNumber)) {
    console.error("Usage: inspect-set.mjs <set-number>");
    process.exit(2);
  }

  const env = readEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: set, error: setError } = await supabase
    .from("inventory_set")
    .select("id,legacy_set_id,availability,condition,storage_label,assigned_person:assigned_person_id(id,first_name,last_name,email,person_type)")
    .eq("legacy_set_id", setNumber)
    .single();
  if (setError) throw setError;

  const componentSelect = "id,legacy_inventory_number,legacy_set_number,category,manufacturer,model,condition,legacy_status,serial_number,storage_label,notes";
  const { data: currentComponents, error: currentError } = await supabase
    .from("set_component_assignment")
    .select(`id,role,valid_from,valid_until,component:component_id(${componentSelect})`)
    .eq("set_id", set.id)
    .is("valid_until", null)
    .order("role");
  if (currentError) throw currentError;

  const { data: legacyComponents, error: legacyError } = await supabase
    .from("inventory_component")
    .select(componentSelect)
    .eq("legacy_set_number", setNumber)
    .order("category");
  if (legacyError) throw legacyError;

  const requiredRoles = ["ipad", "pencil", "keyboard"];
  const currentRoles = new Set(currentComponents.map((row) => row.role).filter(Boolean));
  const missingRequiredRoles = requiredRoles.filter((role) => !currentRoles.has(role));
  const setSuffix = formatSetSuffix(setNumber);
  const { data: suffixComponents, error: suffixComponentsError } = missingRequiredRoles.length
    ? await supabase
        .from("inventory_component")
        .select(componentSelect)
        .ilike("legacy_inventory_number", `% / ${setSuffix}`)
        .order("category")
    : { data: [], error: null };
  if (suffixComponentsError) throw suffixComponentsError;

  const suffixIds = suffixComponents.map((component) => component.id);
  const { data: suffixAssignments, error: suffixAssignmentsError } = suffixIds.length
    ? await supabase
        .from("set_component_assignment")
        .select("component_id,role,valid_from,valid_until,set:set_id(legacy_set_id,availability,condition,storage_label)")
        .in("component_id", suffixIds)
        .is("valid_until", null)
        .order("role")
    : { data: [], error: null };
  if (suffixAssignmentsError) throw suffixAssignmentsError;

  const legacyIds = legacyComponents.map((component) => component.id);
  const { data: legacyAssignments, error: legacyAssignmentsError } = legacyIds.length
    ? await supabase
        .from("set_component_assignment")
        .select("component_id,role,valid_from,valid_until,set:set_id(legacy_set_id,availability,condition,storage_label)")
        .in("component_id", legacyIds)
        .is("valid_until", null)
        .order("role")
    : { data: [], error: null };
  if (legacyAssignmentsError) throw legacyAssignmentsError;

  const { data: supplemental, error: supplementalError } = await supabase
    .from("set_supplemental_assignment")
    .select("item_type,quantity,label,issued_at,returned_at,note")
    .eq("set_id", set.id)
    .is("returned_at", null)
    .order("item_type");
  if (supplementalError) throw supplementalError;

  const { data: openPersonAssignments, error: assignmentError } = await supabase
    .from("set_person_assignment")
    .select("issued_at,returned_at,person:person_id(id,first_name,last_name,email,person_type)")
    .eq("set_id", set.id)
    .is("returned_at", null)
    .order("issued_at", { ascending: false });
  if (assignmentError) throw assignmentError;

  const currentIds = currentComponents.map((row) => row.component?.id).filter(Boolean);
  const relevantIds = [...new Set([...legacyIds, ...currentIds])];
  const damageSelect = "id,damage_number,legacy_damage_id,legacy_source,legacy_source_id,case_type,problem_type,affected_item,status,legacy_status,reported_at,occurred_at,short_description,affected_components_raw,import_hint,billing_assessment,inventory_set:set_id(legacy_set_id),component:component_id(legacy_inventory_number,category),replacement_component:replacement_component_id(legacy_inventory_number,category),person:person_id(first_name,last_name,email,person_type)";

  const directDamageFilter = relevantIds.length
    ? `component_id.in.(${relevantIds.join(",")}),replacement_component_id.in.(${relevantIds.join(",")})`
    : "id.eq.00000000-0000-0000-0000-000000000000";
  const { data: directDamage, error: directDamageError } = await supabase
    .from("damage_case")
    .select(damageSelect)
    .or(directDamageFilter)
    .order("reported_at", { ascending: false });
  if (directDamageError) throw directDamageError;

  const { data: setDamage, error: setDamageError } = await supabase
    .from("damage_case")
    .select(damageSelect)
    .eq("set_id", set.id)
    .order("reported_at", { ascending: false });
  if (setDamageError) throw setDamageError;

  const rawNeedles = legacyComponents
    .map((component) => component.legacy_inventory_number.split(" / ")[0])
    .filter(Boolean)
    .slice(0, 8);
  const rawClauses = [
    `affected_components_raw.ilike.%${String(setNumber).padStart(4, "0")}%`,
    `affected_components_raw.ilike.%${setNumber}%`,
    ...rawNeedles.flatMap((needle) => [
      `affected_components_raw.ilike.%${needle}%`,
      `short_description.ilike.%${needle}%`,
    ]),
  ];
  const { data: rawDamage, error: rawDamageError } = await supabase
    .from("damage_case")
    .select(damageSelect)
    .or(rawClauses.join(","))
    .order("reported_at", { ascending: false });
  if (rawDamageError) throw rawDamageError;

  console.log(JSON.stringify({
    set,
    currentComponents,
    legacyComponents,
    currentAssignmentsForLegacyComponents: legacyAssignments,
    missingRequiredRoles,
    suffixComponentSearch: {
      searched: missingRequiredRoles.length > 0,
      suffix: setSuffix,
      components: suffixComponents,
      currentAssignmentsForSuffixComponents: suffixAssignments,
    },
    supplemental,
    openPersonAssignments,
    loosePowerSupplyCheck: checkLoosePowerSupply(currentComponents),
    damageCases: {
      directComponentOrReplacement: uniqueById(directDamage),
      setLevel: uniqueById(setDamage),
      rawLegacyTextMatches: uniqueById(rawDamage),
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
