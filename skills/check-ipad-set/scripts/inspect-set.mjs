#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
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
    supplemental,
    openPersonAssignments,
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
