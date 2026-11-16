import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { FieldStack } from "./FieldStack.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Textarea } from "../Textarea/Textarea.js";
import { containerQueries } from "../../../tokens/src/scales/layout.js";

const stackCss = () => readFileSync(join(import.meta.dirname, "field-stack.module.css"), "utf8");
const fieldCss = () => readFileSync(join(import.meta.dirname, "../Field/field.module.css"), "utf8");

describe("FieldStack (D115)", () => {
  it("is a div with no role that forwards rest props and ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<FieldStack ref={ref} id="form-1" aria-label="x"><Field label="A"><Input /></Field></FieldStack>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root).not.toHaveAttribute("role");
    expect(root).toHaveAttribute("id", "form-1");
    expect(ref.current).toBe(root);
  });

  it("defaults to top and gap 24, and takes start and the other gaps", () => {
    const { container, rerender } = render(<FieldStack><Field label="A"><Input /></Field></FieldStack>);
    const root = () => container.firstElementChild as HTMLElement;
    expect(root()).toHaveAttribute("data-label-position", "top");
    expect(root().className).toMatch(/gap24/);
    expect(root().className).not.toMatch(/start/);
    rerender(<FieldStack labelPosition="start" gap={16}><Field label="A"><Input /></Field></FieldStack>);
    expect(root()).toHaveAttribute("data-label-position", "start");
    expect(root().className).toMatch(/gap16/);
    expect(root().className).toMatch(/start/);
  });

  it("its Fields take its position, and a Field's own prop wins", () => {
    render(
      <FieldStack labelPosition="start">
        <Field label="Name"><Input /></Field>
        <Field label="Notes" labelPosition="top"><Textarea /></Field>
      </FieldStack>,
    );
    const name = screen.getByLabelText("Name").parentElement!;
    const notes = screen.getByLabelText("Notes").parentElement!;
    expect(name).toHaveAttribute("data-label-position", "start");
    expect(name).toHaveAttribute("data-in-stack", "start");
    expect(notes).not.toHaveAttribute("data-label-position");
    expect(notes).toHaveAttribute("data-in-stack", "start");
  });

  it("a Field rendered by the consumer's own component still reads the stack", () => {
    function NameField() {
      return <Field label="Name"><Input /></Field>;
    }
    render(<FieldStack labelPosition="start"><NameField /></FieldStack>);
    expect(screen.getByLabelText("Name").parentElement).toHaveAttribute("data-label-position", "start");
  });

  it("a Field without a label renders no label element", () => {
    render(<FieldStack labelPosition="start"><Field><Input aria-label="Search" /></Field></FieldStack>);
    expect(screen.getByLabelText("Search").parentElement!.querySelector("label")).toBeNull();
  });

  it("the start stack is two columns, the label column capped, and a named size container", () => {
    const start = /\.start\s*\{([^}]*)\}/.exec(stackCss())![1];
    expect(start).toMatch(
      /grid-template-columns:\s*fit-content\(var\(--psi-field-label-max-width\)\)\s+minmax\(0,\s*1fr\);/,
    );
    expect(start).toMatch(/column-gap:\s*var\(--psi-field-column-gap\);/);
    expect(start).toMatch(/container:\s*psi-field-stack\s*\/\s*inline-size;/);
    expect(stackCss()).toMatch(/\.stack\s*>\s*\*\s*\{\s*grid-column:\s*1\s*\/\s*-1;/);
  });

  it("a Field in a start stack shares the stack's columns", () => {
    expect(fieldCss()).toMatch(/\.field\[data-in-stack="start"\]\[data-label-position="start"\]\s*\{\s*grid-template-columns:\s*subgrid;/);
  });

  it("the container query's literal equals containerQueries.fieldStackColumns", () => {
    const m = /@container psi-field-stack \(width < (\d+)px\)/.exec(fieldCss());
    expect(Number(m?.[1])).toBe(containerQueries.fieldStackColumns);
  });

  it("a start Field in a top stack lays out alone: it is marked top and never shares columns", () => {
    render(<FieldStack><Field label="Name" labelPosition="start"><Input /></Field></FieldStack>);
    const field = screen.getByLabelText("Name").parentElement!;
    expect(field).toHaveAttribute("data-label-position", "start");
    expect(field).toHaveAttribute("data-in-stack", "top");
    const rules = [...fieldCss().matchAll(/([^{}]*)\{[^}]*subgrid[^}]*\}/g)].map((m) => m[1]);
    expect(rules.length).toBeGreaterThan(0);
    for (const sel of rules) expect(sel).toContain('[data-in-stack="start"]');
  });
});
