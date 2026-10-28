import listSearch from "./helpers/list-search.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/list-navigation.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

// Exercise the provider's rendered event handlers with a controlled router.
// React owns transition scheduling; resolve/reject stand in for router completion.
function harness() {
  let active = 0;
  const requests = [];
  const globals = { location: new URL("http://localhost/sets/w1?storage=W1") };
  globalThis.window = globals;
  const exports = {};
  const start = (callback) => { active++; try { callback(); } catch (error) { active--; throw error; } };
  const push = (href) => requests.push({ href, finish: () => { active--; }, fail: () => { active--; } });
  const imports = (name) => {
    if (name.endsWith("/list-search")) return listSearch;
    if (name === "react/jsx-runtime") return require(name);
    if (name === "react") return {
      createContext: () => ({ Provider: "provider" }), useContext: () => [active > 0, start],
      useRef: () => ({ current: null }), useLayoutEffect: () => {},
      useTransition: () => [active > 0, start],
    };
    if (name === "next/navigation") return { useRouter: () => ({ push }) };
    throw Error(name);
  };
  new Function("require", "exports", compiled)(imports, exports);
  function render() {
    const tree = exports.ListNavigationProvider({ children: "old list" });
    const [content, status] = tree.props.children;
    return { content, status, busy: content.props["aria-busy"] };
  }
  function click(href, overrides = {}) {
    const link = { href: new URL(href, globals.location).href, target: "", hasAttribute: () => false };
    const event = { target: { closest: () => link }, button: 0, preventDefault() { this.prevented = true; }, stopPropagation() {}, ...overrides };
    render().content.props.onClickCapture(event);
    return event;
  }
  return { render, click, requests, exports, navigate: (href) => start(() => push(href)) };
}

test("all eight central list destinations are registered", () => {
  const h = harness();
  assert.deepEqual([...h.exports.listPaths], ["/sets", "/sets/w1", "/geraete", "/personen", "/ausgaben", "/aufgaben", "/schadensfaelle", "/rechnungen"]);
});

test("filter link immediately blocks old content; only completion releases it", () => {
  const h = harness();
  assert.equal(h.click("?storage=W2").prevented, true);
  assert.equal(h.requests[0].href, "/sets/w1?storage=W2");
  assert.equal(h.render().busy, true);
  assert.equal(h.render().content.props.inert, true);
  assert.equal(h.render().status.props.role, "status");
  h.click("?storage=W3");
  assert.equal(h.requests.length, 1);
  h.requests[0].finish();
  assert.equal(h.render().busy, false);
  assert.equal(h.render().status.props.children, null);
});

test("overlapping programmatic filter transitions cannot release each other early", () => {
  const h = harness();
  h.navigate("/sets?q=first");
  h.navigate("/sets?q=second");
  assert.equal(h.render().busy, true);
  h.requests[0].finish();
  assert.equal(h.render().busy, true);
  h.requests[1].finish();
  assert.equal(h.render().busy, false);
});

test("navigation failure releases the old content", () => {
  const h = harness();
  h.click("/geraete?page=2");
  h.requests[0].fail();
  assert.equal(h.render().busy, false);
  assert.equal(h.render().content.props.inert, false);
});

test("modified clicks, export, external and same URL retain native behavior", () => {
  const h = harness();
  for (const [href, opts] of [["?storage=W2", { ctrlKey: true }], ["?storage=W2", { button: 1 }], ["https://example.com/sets", {}], ["/sets/w1/export.xlsx", {}], ["?storage=W1", {}], ["#top", {}]]) {
    assert.equal(h.click(href, opts).prevented, undefined);
  }
  assert.equal(h.requests.length, 0);
});

test("GET form search and pagination use shared navigation; POST actions do not", () => {
  const h = harness();
  const OriginalFormData = globalThis.FormData;
  globalThis.FormData = class { *[Symbol.iterator]() { yield ["q", "M40"]; yield ["page", "2"]; } };
  try {
    const form = { method: "post", action: "http://localhost/personen", target: "" };
    const event = { target: form, nativeEvent: {}, preventDefault() { this.defaultPrevented = true; } };
    h.render().content.props.onSubmit(event);
    assert.equal(h.requests.length, 0);
    form.method = "get";
    h.render().content.props.onSubmit(event);
    assert.equal(h.requests[0].href, "/personen?q=M40&page=2");
    assert.equal(h.render().busy, true);
    h.requests[0].finish();
    assert.equal(h.render().busy, false);
  } finally { globalThis.FormData = OriginalFormData; }
});

test("all client filter forms share the provider rather than independent transitions", () => {
  for (const path of ["sets/sets-filter-form", "sets/w1/storage-filter-form", "geraete/geraete-filter-form", "aufgaben/tasks-filter-form", "ausgaben/assignment-filter-form", "schadensfaelle/damage-cases-filter-form"]) {
    const text = readFileSync(new URL(`../src/app/${path}.tsx`, import.meta.url), "utf8");
    assert.match(text, /useListTransition\(\)/);
    assert.doesNotMatch(text, /useTransition\(\)/);
  }
});


test("slow status appears after eight seconds and its timer is cleaned up", () => {
  let slow = false;
  let timer;
  let cleanup;
  let cancelled;
  globalThis.window = {
    setTimeout(callback, delay) { timer = { callback, delay }; return 123; },
    clearTimeout(id) { cancelled = id; },
  };
  const testedModule = { exports: {} };
  const imports = (name) => {
    if (name.endsWith("/list-search")) return listSearch;
    if (name === "react/jsx-runtime") return require(name);
    if (name === "react") return {
      createContext: () => ({}), useState: () => [slow, (value) => { slow = value; }],
      useEffect: (effect) => { cleanup = effect(); },
    };
    return {};
  };
  new Function("require", "module", "exports", compiled + "\nexports.LoadingStatus = LoadingStatus;")(imports, testedModule, testedModule.exports);
  const first = JSON.stringify(testedModule.exports.LoadingStatus());
  assert.doesNotMatch(first, /länger als üblich/);
  assert.equal(timer.delay, 8000);
  timer.callback();
  assert.match(JSON.stringify(testedModule.exports.LoadingStatus()), /länger als üblich/);
  cleanup();
  assert.equal(cancelled, 123);
});

test("error view focuses its message and exposes retry without raw error data", () => {
  const text = readFileSync(new URL("../src/app/error.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  let focused = false;
  let retried = false;
  const testedModule = { exports: {} };
  const imports = (name) => name === "react/jsx-runtime" ? require(name) : {
    useRef: () => ({ current: { focus() { focused = true; } } }),
    useEffect: (effect) => effect(), useTransition: () => [false, (action) => action()],
  };
  new Function("require", "module", "exports", code)(imports, testedModule, testedModule.exports);
  const tree = testedModule.exports.default({ error: new Error("SECRET"), reset() { retried = true; } });
  assert.equal(focused, true);
  assert.doesNotMatch(JSON.stringify(tree), /SECRET/);
  const buttons = tree.props.children.find((node) => node.type === "div");
  buttons.props.children[0].props.onClick();
  assert.equal(retried, true);
  assert.equal(buttons.props.children[0].props.disabled, false);
});


test("native persons GET search trims q or removes empty q while retaining other filters", () => {
  const OriginalFormData = globalThis.FormData;
  try {
    for (const value of ["  Name  ", "", "   "]) {
      const h = harness();
      globalThis.FormData = class { *[Symbol.iterator]() { yield ["q", value]; yield ["type", "lehrer"]; yield ["status", "aktiv"]; yield ["class", "10-1"]; yield ["page", "1"]; } };
      const event = { target: { method: "get", action: "http://localhost/personen", target: "" }, nativeEvent: {}, preventDefault() { this.defaultPrevented = true; } };
      assert.equal(h.requests.length, 0);
      h.render().content.props.onSubmit(event);
      assert.equal(h.requests.length, 1);
      const params = new URL(h.requests[0].href, "http://localhost").searchParams;
      assert.equal(params.get("q"), value.trim() || null);
      assert.equal(params.get("type"), "lehrer"); assert.equal(params.get("status"), "aktiv");
      assert.equal(params.get("class"), "10-1"); assert.equal(params.get("page"), "1");
      assert.equal(h.render().busy, true);
    }
  } finally { globalThis.FormData = OriginalFormData; }
});
