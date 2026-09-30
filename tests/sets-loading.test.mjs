import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/sets/page.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const person = { id: "person-1", first_name: "Test", last_name: "Person", person_type: "schueler" };
const inventorySet = {
  id: "set-1", legacy_set_id: 40, inventory_number: "M40", condition: "ok",
  availability: "frei", assigned_person: person, assigned_person_id: person.id, storage_label: "W1 / 1",
};

async function render(params = {}, { role = "admin", failHistory = false, failSet = false } = {}) {
  const calls = [];
  let active = 0;
  let maxActive = 0;
  let activeDetails = 0;
  let maxActiveDetails = 0;
  const client = { from(table) {
    const call = { table, filters: [], fields: "", options: {} };
    const builder = {
      select(fields, options = {}) { call.fields = fields; call.options = options; return this; },
      then(resolve, reject) {
        calls.push(call);
        active++;
        maxActive = Math.max(maxActive, active);
        const isDetail = ["set_component_assignment", "set_supplemental_assignment"].includes(table)
          || (table === "set_person_assignment" && call.filters.some(([method, field]) => method === "not" && field === "returned_at"));
        if (isDetail) maxActiveDetails = Math.max(maxActiveDetails, ++activeDetails);
        return new Promise((done) => setImmediate(() => {
          let data = table === "inventory_set" ? [inventorySet]
            : table === "school_class" ? [{ id: "class-1", label: "10-2", grade_level: 10 }]
            : table === "person" ? [person]
            : table === "person_class_assignment" ? [{ person_id: person.id, school_class: { label: "10-2", grade_level: 10 } }]
            : [];
          for (const [method, field, value] of call.filters) {
            if (table !== "inventory_set") continue;
            if (method === "eq") data = data.filter((row) => row[field] === value);
            if (method === "in") data = data.filter((row) => value.includes(row[field]));
            if (method === "ilike") data = data.filter((row) => value.includes("%")
              ? row[field]?.toLowerCase().includes(value.replaceAll("%", "").toLowerCase())
              : row[field]?.toLowerCase() === value.toLowerCase());
          }
          active--;
          if (isDetail) activeDetails--;
          const error = failSet && table === "inventory_set" ? new Error("set failed")
            : failHistory && call.filters.some(([method, field]) => method === "not" && field === "returned_at") ? new Error("history failed") : null;
          done({ data, count: 1, error });
        })).then(resolve, reject);
      },
    };
    for (const method of ["eq", "in", "ilike", "is", "not", "order", "limit", "or"]) {
      builder[method] = (...args) => { call.filters.push([method, ...args]); return builder; };
    }
    return builder;
  } };
  const pageModule = { exports: {} };
  const imports = (name) => {
    if (name === "react/jsx-runtime") return require(name);
    if (name === "@/lib/condition") return { conditionLabel: (value) => value };
    if (name === "@/lib/supabase/server") return { createClient: async () => client };
    if (name === "@/lib/auth/current-user") return {
      getCurrentAppUser: async () => role ? { role } : null,
      hasAnyRole: (user, roles) => roles.includes(user.role),
    };
    if (name === "next/navigation") return { redirect: (url) => { throw new Error(`redirect:${url}`); } };
    return new Proxy({}, { get: (_, key) => key === "__esModule" ? true : String(key) });
  };
  new Function("require", "module", "exports", compiled)(imports, pageModule, pageModule.exports);
  const tree = await pageModule.exports.default({ searchParams: Promise.resolve(params) });
  const nodes = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { calls, nodes, maxActive, maxActiveDetails };
}

test("M40 uses a direct filter and only loads its related rows", async () => {
  const { calls, nodes } = await render({ setId: "M40" });
  const sets = calls.filter((call) => call.table === "inventory_set" && !call.options.head);
  assert.equal(sets.length, 1);
  assert.ok(sets[0].filters.some(([method, field, value]) => method === "ilike" && field === "inventory_number" && value === "M40"));
  assert.equal(calls.filter((call) => call.table === "person").length, 0);
  assert.deepEqual(calls.find((call) => call.table === "person_class_assignment").filters.find(([method, field]) => method === "in" && field === "person_id")[2], [person.id]);
  for (const call of calls.filter((call) => ["set_component_assignment", "set_supplemental_assignment"].includes(call.table))) {
    assert.deepEqual(call.filters.find(([method, field]) => method === "in" && field === "set_id")[2], ["set-1"]);
  }
  assert.equal(nodes.find((node) => node.type === "SetsTable").props.rows[0].setIdentifier, "M40");
});

test("unfiltered list does not fetch selection persons", async () => {
  const { calls } = await render();
  assert.equal(calls.some((call) => call.table === "person"), false);
});

test("opened issue dialog loads persons and class selection", async () => {
  const { calls, nodes } = await render({ setId: "M40", issue: "set-1" });
  assert.equal(calls.filter((call) => call.table === "person").length, 1);
  const selection = nodes.find((node) => node.type === "PersonSelectionList");
  assert.ok(selection);
  assert.ok(Object.values(selection.props).some((value) => Array.isArray(value) && value[0]?.classLabel === "10-2"));
});

test("readonly and nonexistent issue targets never load selection", async () => {
  for (const options of [{ role: "readonly" }, {}]) {
    const { calls } = await render({ issue: options.role ? "set-1" : "missing" }, options);
    assert.equal(calls.some((call) => call.table === "person"), false);
  }
});

test("numeric legacy ID keeps legacy and inventory matching", async () => {
  const { calls } = await render({ setId: "40" });
  assert.ok(calls.some((call) => call.filters.some(([method, field, value]) => method === "eq" && field === "legacy_set_id" && value === 40)));
});

test("condition and availability still restrict direct lookup", async () => {
  for (const params of [{ condition: "defekt" }, { availability: "blockiert" }]) {
    const { nodes } = await render({ setId: "M40", ...params });
    assert.equal(nodes.find((node) => node.type === "SetsTable")?.props.rows.length ?? 0, 0);
  }
});

test("search and class filters intersect the set lookup", async () => {
  const { nodes } = await render({ setId: "M40", q: "M40", class: "10-2" });
  assert.equal(nodes.find((node) => node.type === "SetsTable").props.rows.length, 1);
  const missingClass = await render({ setId: "M40", class: "missing" });
  assert.equal(missingClass.nodes.find((node) => node.type === "SetsTable")?.props.rows.length ?? 0, 0);
});

test("missing set does not trigger row or selection queries", async () => {
  const { calls } = await render({ setId: "missing", issue: "set-1" });
  assert.equal(calls.some((call) => ["person", "person_class_assignment", "set_component_assignment", "set_supplemental_assignment"].includes(call.table)), false);
});

test("independent queries overlap and history errors remain visible", async () => {
  assert.equal((await render({ setId: "M40" })).maxActiveDetails, 3);
  await assert.rejects(render({ setId: "M40" }, { failHistory: true }), /history failed/);
  await assert.rejects(render({ setId: "M40" }, { failSet: true }), /set failed/);
});

test("authentication and role checks happen before database access", async () => {
  await assert.rejects(render({}, { role: null }), /redirect:\/login/);
  await assert.rejects(render({}, { role: "buchhaltung" }), /redirect:\//);
});
