import listSearch from "./helpers/list-search.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(path) { return ts.transpileModule(readFileSync(new URL(`../src/app/${path}.tsx`, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText; }
function harness(overrides = {}, path = "geraete/geraete-filter-form", component = "GeraeteFilterForm") {
  const code = compile(path);
  const props = { assignment: "", category: "", condition: "", hasActiveFilters: false, query: "", setFilter: "", sort: "inventory", ...overrides };
  const states = [], timers = new Map(), requests = [];
  let cursor, timerId = 0, transitions = 0;
  const exports = {};
  const imports = (name) => {
    if (name.endsWith("/list-search")) return listSearch;
    if (name === "react/jsx-runtime") return require(name);
    if (name === "next/link") return { default: "a" };
    if (name === "next/navigation") return { usePathname: () => "/geraete", useRouter: () => ({ push: (url) => requests.push(url) }) };
    if (name.endsWith("/list-navigation")) return { useListTransition: () => [transitions > 0, (callback) => { transitions++; callback(); }] };
    if (name === "react") return {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (value) => { states[i] = value; }]; },
      useCallback: (callback) => callback,
      useEffect: (callback) => callback(),
    };
    throw Error(name);
  };
  new Function("require", "exports", code)(imports, exports);
  function render() {
    timers.clear();
    globalThis.window = { setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout(id) { timers.delete(id); } };
    cursor = 0;
    return exports[component](props);
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  const field = (name) => nodes(render()).find((node) => node?.props?.name === name);
  return { requests, field, render, type(value) { field("q").props.onChange({ target: { name: "q", value } }); render(); },
    flush() { for (const callback of timers.values()) callback(); },
    enter() { const event = { key: "Enter", nativeEvent: {}, currentTarget: { value: field("q").props.value }, preventDefault() { this.prevented = true; } }; field("q").props.onKeyDown(event); assert.equal(event.prevented, true); },
    pending: () => transitions,
  };
}

test("typing multiple search characters and clearing never navigates after the debounce interval", () => {
  const h = harness();
  for (const value of ["E", "E12", "E123456", ""]) { h.type(value); h.flush(); assert.equal(h.field("q").props.value, value); }
  assert.deepEqual(h.requests, []);
  assert.equal(h.pending(), 0);
});
test("Enter applies trimmed search once through the shared loading transition and retains filters", () => {
  const h = harness({ category: "ipad", condition: "ok", assignment: "set", setFilter: "343", sort: "set" });
  h.type("  E123456  "); h.enter();
  assert.deepEqual(h.requests, ["/geraete?q=E123456&category=ipad&condition=ok&assignment=set&set=343&sort=set"]);
  assert.equal(h.pending(), 1);
});
test("Enter with empty or whitespace search removes the existing URL search filter", () => {
  for (const value of ["", "   "]) {
    const h = harness({ query: "old", category: "pencil" });
    h.type(value); h.flush(); assert.equal(h.requests.length, 0); h.enter();
    assert.deepEqual(h.requests, ["/geraete?category=pencil"]);
  }
});
test("existing URL values initialize the fields without navigating", () => {
  const h = harness({ query: "E123", setFilter: "343", sort: "condition" });
  assert.equal(h.field("q").props.value, "E123");
  assert.equal(h.field("set").props.value, "343"); h.flush();
  assert.deepEqual(h.requests, []);
  h.enter(); assert.deepEqual(h.requests, ["/geraete?q=E123&set=343&sort=condition"]);
});
test("other filters and set debounce keep their behavior without applying a search draft", () => {
  const h = harness({ query: "applied" }); h.type("draft");
  h.field("category").props.onChange({ target: { name: "category", value: "ipad" } });
  assert.equal(h.requests[0], "/geraete?q=applied&category=ipad");
  h.field("set").props.onChange({ target: { value: "343" } }); h.field("set"); h.flush();
  assert.equal(h.requests[1], "/geraete?q=applied&set=343");
});

const forms = [
  ["sets/sets-filter-form", "SetsFilterForm", { availability: "frei", classFilter: "", classOptions: [], condition: "", setIdQuery: "", sort: "set" }, "availability", "blockiert"],
  ["sets/w1/storage-filter-form", "StorageFilterForm", { selectedStorage: "W2", selectedIpadStorage: "64", storageFilters: [], ipadStorageFilters: [] }, "storage", "W3"],
  ["aufgaben/tasks-filter-form", "TasksFilterForm", { status: "active", priority: "", sort: "due_asc" }, "status", "all"],
  ["ausgaben/assignment-filter-form", "AssignmentFilterForm", { classFilter: "", classOptions: [], status: "returned", returnedFrom: "", to: "", sort: "returned_desc" }, "status", "active"],
  ["schadensfaelle/damage-cases-filter-form", "DamageCasesFilterForm", { billing: "", damageNumber: "", status: "offen", type: "" }, "status", "abgeschlossen"],
];
for (const [path, component, props, filter, value] of forms) {
  test(`${component}: draft stays local, other filters retain applied q, Enter and empty Enter preserve filters`, () => {
    const h = harness({ ...props, query: "applied" }, path, component);
    assert.equal(h.field("q").props.value, "applied");
    for (const text of ["d", "dr", "draft"]) { h.type(text); h.flush(); }
    assert.equal(h.requests.length, 0);
    h.field(filter).props.onChange({ target: { name: filter, value } });
    assert.equal(new URL(h.requests[0], "http://localhost").searchParams.get("q"), "applied");
    h.type("  confirmed  "); h.enter();
    const entered = new URL(h.requests[1], "http://localhost").searchParams;
    assert.equal(entered.get("q"), "confirmed");
    h.type("   "); h.flush(); assert.equal(h.requests.length, 2); h.enter();
    const cleared = new URL(h.requests[2], "http://localhost").searchParams;
    assert.equal(cleared.has("q"), false);
    entered.delete("q"); assert.equal(cleared.toString(), entered.toString());
    assert.equal(h.pending(), 3);
  });
}
test("shared Enter handling ignores other keys and IME composition", () => {
  let calls = 0;
  const handler = listSearch.searchOnEnter(() => calls++);
  for (const [key, isComposing] of [["a", false], ["Enter", true]]) {
    handler({ key, nativeEvent: { isComposing }, preventDefault() { assert.fail("must not prevent"); } });
  }
  assert.equal(calls, 0);
});
test("special ID debounce still navigates without applying the unconfirmed search", () => {
  for (const [path, component, props, name] of [
    ["sets/sets-filter-form", "SetsFilterForm", { classOptions: [], setIdQuery: "" }, "setId"],
    ["schadensfaelle/damage-cases-filter-form", "DamageCasesFilterForm", { damageNumber: "" }, "damage"],
  ]) {
    const h = harness({ ...props, query: "applied" }, path, component); h.type("draft");
    h.field(name).props.onChange({ target: { name, value: "343" } }); h.field(name); h.flush();
    const params = new URL(h.requests[0], "http://localhost").searchParams;
    assert.equal(params.get(name), "343"); assert.equal(params.get("q"), "applied");
  }
});

test("assignment export keeps the applied search while a local draft is edited", () => {
  const h = harness({ query: "applied", classOptions: [], status: "returned", returnedFrom: "", to: "", sort: "returned_desc", classFilter: "" }, "ausgaben/assignment-filter-form", "AssignmentFilterForm");
  h.type("draft");
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  const link = nodes(h.render()).find((node) => node.props?.href?.startsWith("/ausgaben/export.xlsx"));
  assert.equal(new URL(link.props.href, "http://localhost").searchParams.get("q"), "applied");
});
