import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useActiveOption } from "./useActiveOption.js";
import type { ActiveOptionItem } from "./useActiveOption.js";

const list = (...values: string[]): ActiveOptionItem[] => values.map((value) => ({ value }));
const twelve = list(...Array.from({ length: 12 }, (_, i) => `o${i}`));

function setup(initial: ActiveOptionItem[]) {
  return renderHook(({ items }) => useActiveOption(items), { initialProps: { items: initial } });
}

describe("useActiveOption (D130)", () => {
  it("starts with nothing highlighted", () => {
    const { result } = setup(list("a", "b"));
    expect(result.current.active).toBeNull();
  });

  it("moves down and wraps from the last to the first", () => {
    const { result } = setup(list("a", "b", "c"));
    act(() => result.current.move(1));
    expect(result.current.active).toBe("a");
    act(() => result.current.move(1));
    act(() => result.current.move(1));
    expect(result.current.active).toBe("c");
    act(() => result.current.move(1));
    expect(result.current.active).toBe("a");
  });

  it("moves up and wraps from the first to the last; from nothing, Up lands on the last", () => {
    const { result } = setup(list("a", "b", "c"));
    act(() => result.current.move(-1));
    expect(result.current.active).toBe("c");
    act(() => result.current.setActive("a"));
    act(() => result.current.move(-1));
    expect(result.current.active).toBe("c");
  });

  it("reaches disabled options", () => {
    const { result } = setup([{ value: "a" }, { value: "b", disabled: true }, { value: "c" }]);
    act(() => result.current.setActive("a"));
    act(() => result.current.move(1));
    expect(result.current.active).toBe("b");
  });

  it("pages 10 options and stops at the ends", () => {
    const { result } = setup(twelve);
    act(() => result.current.setActive("o0"));
    act(() => result.current.page(1));
    expect(result.current.active).toBe("o10");
    act(() => result.current.page(1));
    expect(result.current.active).toBe("o11");
    act(() => result.current.page(1));
    expect(result.current.active).toBe("o11");
    act(() => result.current.page(-1));
    expect(result.current.active).toBe("o1");
    act(() => result.current.page(-1));
    expect(result.current.active).toBe("o0");
  });

  it("first and last jump to the ends", () => {
    const { result } = setup(list("a", "b", "c"));
    act(() => result.current.last());
    expect(result.current.active).toBe("c");
    act(() => result.current.first());
    expect(result.current.active).toBe("a");
  });

  it("keeps the same option, by value, when the list changes and still holds it", () => {
    const { result, rerender } = setup(list("a", "b", "c"));
    act(() => result.current.setActive("b"));
    rerender({ items: list("x", "b", "y") });
    expect(result.current.active).toBe("b");
  });

  it("falls back to the first option when the highlighted one is gone", () => {
    const { result, rerender } = setup(list("a", "b", "c"));
    act(() => result.current.setActive("b"));
    rerender({ items: list("x", "y") });
    expect(result.current.active).toBe("x");
    // …and the fallback is now an ordinary highlight, kept by value.
    rerender({ items: list("w", "x") });
    expect(result.current.active).toBe("x");
  });

  it("clears on an empty list, and stays cleared when options return", () => {
    const { result, rerender } = setup(list("a", "b"));
    act(() => result.current.setActive("b"));
    rerender({ items: [] });
    expect(result.current.active).toBeNull();
    // An explicit highlight that cleared stays cleared; typing uses follow().
    rerender({ items: list("c") });
    expect(result.current.active).toBeNull();
  });

  it("follow() tracks the first option through later list changes", () => {
    const { result, rerender } = setup(list("a", "b"));
    act(() => result.current.follow());
    expect(result.current.active).toBe("a");
    rerender({ items: list("b", "a") });
    expect(result.current.active).toBe("b");
    rerender({ items: [] });
    expect(result.current.active).toBeNull();
    rerender({ items: list("z") });
    expect(result.current.active).toBe("z");
  });

  it("clear() highlights nothing, and the next move starts from the end", () => {
    const { result } = setup(list("a", "b"));
    act(() => result.current.setActive("b"));
    act(() => result.current.clear());
    expect(result.current.active).toBeNull();
    act(() => result.current.move(1));
    expect(result.current.active).toBe("a");
  });

  it("does nothing on an empty list", () => {
    const { result } = setup([]);
    act(() => result.current.move(1));
    act(() => result.current.page(1));
    expect(result.current.active).toBeNull();
  });
});
