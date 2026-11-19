import { describe, expect, it } from "vitest";
import { bindingExpr, bindingValue, isFunctionType, parseBinding, pascalCase, setterName, wrapperName } from "./pattern-bindings.js";
import { validatePatterns } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

describe("parseBinding", () => {
  it("parses the five forms", () => {
    expect(parseBinding("{state:open}")).toEqual({ kind: "state", key: "open" });
    expect(parseBinding("{set:open:false}")).toEqual({ kind: "set", key: "open", value: false });
    expect(parseBinding("{set:page:1}")).toEqual({ kind: "set", key: "page", value: 1 });
    expect(parseBinding("{set:value:all}")).toEqual({ kind: "set", key: "value", value: "all" });
    expect(parseBinding("{toggle:open}")).toEqual({ kind: "toggle", key: "open" });
    expect(parseBinding("{setter:value}")).toEqual({ kind: "setter", key: "value" });
    expect(parseBinding("{input:onConfirm}")).toEqual({ kind: "input", key: "onConfirm" });
  });
  it("returns null for anything that is not a binding", () => {
    expect(parseBinding("{param:size}")).toBeNull();
    expect(parseBinding("{content:title}")).toBeNull();
    expect(parseBinding("open")).toBeNull();
    expect(parseBinding(true)).toBeNull();
    expect(parseBinding(32)).toBeNull();
  });
  it("throws on a near miss", () => {
    expect(() => parseBinding("{state:Open}")).toThrow(/malformed binding "\{state:Open\}"/);
    expect(() => parseBinding("{toggle:}")).toThrow(/malformed binding/);
    expect(() => parseBinding("{set:open}")).toThrow(/malformed binding/);
  });
});

describe("binding helpers", () => {
  it("names setters and wrappers", () => {
    expect(setterName("sidebarOpen")).toBe("setSidebarOpen");
    expect(pascalCase("row-actions")).toBe("RowActions");
    expect(pascalCase("app-shell")).toBe("AppShell");
    // Suffixed, so app-shell's wrapper never collides with the AppShell it imports.
    expect(wrapperName("app-shell")).toBe("AppShellPattern");
    expect(wrapperName("row-actions")).toBe("RowActionsPattern");
  });
  it("tells function types apart", () => {
    expect(isFunctionType("() => void")).toBe(true);
    expect(isFunctionType("(page: number) => void")).toBe(true);
    expect(isFunctionType("boolean")).toBe(false);
  });
  it("emits each binding's expression", () => {
    expect(bindingExpr({ kind: "state", key: "open" })).toBe("open");
    expect(bindingExpr({ kind: "input", key: "onConfirm" })).toBe("onConfirm");
    expect(bindingExpr({ kind: "setter", key: "value" })).toBe("setValue");
    expect(bindingExpr({ kind: "toggle", key: "open" })).toBe("() => setOpen(!open)");
    expect(bindingExpr({ kind: "set", key: "open", value: false })).toBe("() => setOpen(false)");
    expect(bindingExpr({ kind: "set", key: "value", value: "all" })).toBe('() => setValue("all")');
  });
  it("resolves each binding against a scope", () => {
    const calls: unknown[] = [];
    const scope = { values: { open: false, onEdit: "edit-fn" }, setters: { open: (v: unknown) => calls.push(v) } };
    expect(bindingValue({ kind: "state", key: "open" }, scope)).toBe(false);
    expect(bindingValue({ kind: "input", key: "onEdit" }, scope)).toBe("edit-fn");
    expect(bindingValue({ kind: "setter", key: "open" }, scope)).toBe(scope.setters.open);
    (bindingValue({ kind: "toggle", key: "open" }, scope) as () => void)();
    (bindingValue({ kind: "set", key: "open", value: 7 }, scope) as () => void)();
    expect(calls).toEqual([true, 7]);
  });
});

const menu: ManifestComponent = {
  name: "Menu",
  slots: [
    { name: "trigger", accepts: { components: ["Button"] }, cardinality: "1..1" },
    { name: "body", accepts: { components: ["MenuItem"] }, cardinality: "1..*" },
  ],
  props: [
    { name: "open", type: "boolean", required: true, default: null },
    { name: "onClose", type: "(reason: MenuCloseReason) => void", required: true, default: null },
    { name: "trigger", type: "ReactElement", required: true, default: null },
    { name: "children", type: "ReactNode", required: true, default: null },
  ],
};
const menuItem: ManifestComponent = {
  name: "MenuItem",
  slots: [],
  props: [
    { name: "children", type: "ReactNode", required: true, default: null },
    { name: "onSelect", type: "() => void", required: true, default: null },
  ],
};
const button: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [{ name: "variant", type: '"ghost" | "danger"', required: false, default: "neutral" }],
};
const components = [menu, menuItem, button];
const attributes = { Button: ["onClick", "aria-expanded"] };

const menuPattern = (over: Partial<Pattern> = {}): Pattern => ({
  id: "row-actions", intent: "i", match: ["m"], parameters: [], gaps: [], requires: [],
  content: { trigger: "Actions", edit: "Edit" },
  state: [{ key: "open", initial: false }],
  inputs: [{ key: "onEdit", type: "() => void" }],
  compose: {
    component: "Menu",
    props: { open: "{state:open}", onClose: "{set:open:false}" },
    slots: {
      trigger: [{ component: "Button", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
      body: [{ component: "MenuItem", props: { onSelect: "{input:onEdit}" }, content: "edit" }],
    },
  },
  ...over,
});
const ok = (p: Pattern) => validatePatterns([p], components, {}, [], attributes);
const withCompose = (edit: (c: Pattern["compose"]) => void): Pattern => {
  const p = menuPattern();
  edit(p.compose);
  return p;
};

describe("validatePatterns: state and inputs (D143)", () => {
  it("accepts a fully bound pattern", () => {
    expect(() => ok(menuPattern())).not.toThrow();
  });
  it("accepts a pass-through attribute the component forwards, and rejects one it does not", () => {
    expect(() => validatePatterns([menuPattern()], components, {}, [], {})).toThrow(/unknown prop "onClick" on component "Button"/);
  });
  it("rejects an undeclared state or input", () => {
    expect(() => ok(withCompose((c) => { c.props!.open = "{state:shown}"; }))).toThrow(/state "shown" referenced but not declared/);
    expect(() =>
      ok(withCompose((c) => { (c.slots!.body[0] as { props: Record<string, unknown> }).props.onSelect = "{input:onDelete}"; })),
    ).toThrow(/input "onDelete" referenced but not declared/);
  });
  it("rejects a declared key nothing uses", () => {
    expect(() => ok(menuPattern({ state: [{ key: "open", initial: false }, { key: "extra", initial: 0 }] }))).toThrow(
      /state "extra" declared but never referenced/,
    );
    expect(() =>
      ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "onCopy", type: "() => void" }] })),
    ).toThrow(/input "onCopy" declared but never referenced/);
  });
  it("rejects {toggle:} on a state that is not boolean", () => {
    expect(() => ok(menuPattern({ state: [{ key: "open", initial: 0 }] }))).toThrow(/\{toggle:open\} needs a boolean state/);
  });
  it("rejects a callback binding on a value prop, and a value binding on a callback prop", () => {
    expect(() => ok(withCompose((c) => { c.props!.open = "{set:open:false}"; c.props!.onClose = "{state:open}"; }))).toThrow(
      /\{set:open\} on prop "open": a callback binding needs a function-typed prop/,
    );
    expect(() => ok(withCompose((c) => { c.props!.onClose = "{state:open}"; }))).toThrow(
      /\{state:open\} on prop "onClose": a value binding needs a prop that is not a function/,
    );
  });
  it("rejects a binding in a text position", () => {
    expect(() => ok(withCompose((c) => { c.slots!.body.push("{state:open}"); }))).toThrow(
      /binding "\{state:open\}" used outside a prop position/,
    );
  });
  it("rejects malformed, duplicate and storyless keys", () => {
    expect(() => ok(menuPattern({ state: [{ key: "Open", initial: false }] }))).toThrow(/state key "Open" is not a camelCase identifier/);
    expect(() => ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "open", type: "boolean", story: true }] }))).toThrow(
      /key "open" declared twice/,
    );
    expect(() => ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "label", type: "string" }] }))).toThrow(
      /input "label" needs a story value/,
    );
  });
  it("rejects a key the preset module cannot declare", () => {
    expect(() => ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "useState", type: "() => void" }] }))).toThrow(
      /input key "useState" is a reserved name/,
    );
    for (const word of ["delete", "default", "new", "function"]) {
      expect(() => ok(menuPattern({ state: [{ key: "open", initial: false }, { key: word, initial: false }] })), word).toThrow(
        new RegExp(`state key "${word}" is a reserved name`),
      );
    }
  });
  it("rejects a key that is another key's setter", () => {
    expect(() =>
      ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "setOpen", type: "(open: boolean) => void" }] })),
    ).toThrow(/key "setOpen" is the setter of state "open"/);
    expect(() => ok(menuPattern({ state: [{ key: "open", initial: false }, { key: "setOpen", initial: false }] }))).toThrow(
      /key "setOpen" is the setter of state "open"/,
    );
  });
  it("rejects an unbound required prop", () => {
    expect(() => ok(withCompose((c) => { delete c.props!.onClose; }))).toThrow(
      /compose: required prop "onClose" on "Menu" is not bound/,
    );
    expect(() =>
      ok(withCompose((c) => { delete (c.slots!.body[0] as { props?: Record<string, unknown> }).props; })),
    ).toThrow(/compose\.body\[0\]: required prop "onSelect" on "MenuItem" is not bound/);
  });
  it("counts a slot fill as binding its prop, and body or content as binding children", () => {
    // `trigger` is bound by the trigger slot; Menu's `children` by its body
    // fills; MenuItem's `children` by its `content` key.
    expect(() => ok(menuPattern())).not.toThrow();
    expect(() => ok(withCompose((c) => { delete (c.slots!.body[0] as { content?: string }).content; }))).toThrow(
      /required prop "children" on "MenuItem" is not bound/,
    );
  });
});
