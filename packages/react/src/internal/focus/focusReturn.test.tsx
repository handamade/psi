// packages/react/src/internal/focus/focusReturn.test.tsx
// D147: the one focus rule and the shared hand-back.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createFocusReturnEvent, handBackFocus, isFocusLost, useLatestRef } from "./focusReturn.js";

function setup() {
  document.body.innerHTML = `
    <div id="box"><button id="inner">Inner</button></div>
    <button id="outside">Outside</button>
    <button id="target">Target</button>
    <button id="fallback">Fallback</button>
    <button id="disabled" disabled>Disabled</button>`;
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  return { box: $("box"), inner: $("inner"), outside: $("outside"), target: $("target"), fallback: $("fallback"), disabled: $("disabled") };
}

describe("isFocusLost (D147)", () => {
  it("is true when focus is on the departing element or inside it", () => {
    const { box, inner } = setup();
    inner.focus();
    expect(isFocusLost(box)).toBe(true);
    expect(isFocusLost(inner)).toBe(true);
  });

  it("is true when focus is on <body>, by default", () => {
    const { box } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    expect(isFocusLost(box)).toBe(true);
    expect(isFocusLost(null)).toBe(true);
  });

  it("is false on <body> with includeNowhere: false", () => {
    const { box } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(isFocusLost(box, { includeNowhere: false })).toBe(false);
  });

  it("is still true inside the element with includeNowhere: false", () => {
    const { box, inner } = setup();
    inner.focus();
    expect(isFocusLost(box, { includeNowhere: false })).toBe(true);
  });

  it("is false when focus is on an unrelated element", () => {
    const { box, outside } = setup();
    outside.focus();
    expect(isFocusLost(box)).toBe(false);
    expect(isFocusLost(null)).toBe(false);
  });
});

describe("createFocusReturnEvent (D147)", () => {
  it("carries target and reason, and records preventDefault", () => {
    const { target } = setup();
    const event = createFocusReturnEvent(target, "close");
    expect(event.target).toBe(target);
    expect(event.reason).toBe("close");
    expect(event.defaultPrevented).toBe(false);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("handBackFocus (D147)", () => {
  it("calls the handler with the first non-null candidate and the reason, then focuses it", () => {
    const { box, inner, target } = setup();
    inner.focus();
    const onFocusReturn = vi.fn();
    const focused = handBackFocus({ departing: box, candidates: [null, target], reason: "close", onFocusReturn });
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ target, reason: "close" });
    expect(focused).toBe(target);
    expect(target).toHaveFocus();
  });

  it("moves nothing when the handler prevents it", () => {
    const { box, inner, target } = setup();
    inner.focus();
    const focused = handBackFocus({
      departing: box,
      candidates: [target],
      reason: "close",
      onFocusReturn: (event) => event.preventDefault(),
    });
    expect(focused).toBeNull();
    expect(inner).toHaveFocus();
  });

  it("lets a handler that focuses its own element win", () => {
    const { box, inner, target, outside } = setup();
    inner.focus();
    const focused = handBackFocus({
      departing: box,
      candidates: [target],
      reason: "close",
      onFocusReturn: () => outside.focus(),
    });
    expect(focused).toBeNull();
    expect(outside).toHaveFocus();
  });

  it("does nothing, and calls nothing, when focus is not lost", () => {
    const { box, outside, target } = setup();
    outside.focus();
    const onFocusReturn = vi.fn();
    expect(handBackFocus({ departing: box, candidates: [target], reason: "close", onFocusReturn })).toBeNull();
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(outside).toHaveFocus();
  });

  it("falls through to the next candidate when one refuses focus", () => {
    const { box, inner, disabled, fallback } = setup();
    inner.focus();
    const focused = handBackFocus({ departing: box, candidates: [disabled, fallback], reason: "close" });
    expect(focused).toBe(fallback);
    expect(fallback).toHaveFocus();
  });

  it("honours includeNowhere: false", () => {
    const { box, target } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    const onFocusReturn = vi.fn();
    handBackFocus({ departing: box, includeNowhere: false, candidates: [target], reason: "close", onFocusReturn });
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
  });
});

describe("useLatestRef (D147)", () => {
  it("holds the value of the latest render", () => {
    let seen: { current: string } | null = null;
    function Probe({ value }: { value: string }) {
      seen = useLatestRef(value);
      return null;
    }
    const { rerender } = render(<Probe value="a" />);
    rerender(<Probe value="b" />);
    expect(seen!.current).toBe("b");
  });
});
