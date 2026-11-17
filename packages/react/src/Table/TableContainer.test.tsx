import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, createRef } from "react";
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import { TableCaption } from "./TableCaption.js";
import { TableContainer } from "./TableContainer.js";
import type { TableContainerProps } from "./TableContainer.js";

const WARNING =
  "Psi TableContainer: no TableCaption inside and no aria-label or aria-labelledby; the scrolling region has no name.";

function rows() {
  return (
    <>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody><TableRow><TableCell>2026-08-05</TableCell><TableCell numeric>1,240.00</TableCell></TableRow></TableBody>
    </>
  );
}

function withCaption(props: Partial<TableContainerProps> = {}, captionId?: string) {
  return render(
    <TableContainer {...props}>
      <Table>
        <TableCaption id={captionId}>Payments</TableCaption>
        {rows()}
      </Table>
    </TableContainer>,
  );
}

afterEach(() => vi.restoreAllMocks());

function Lazy({ initialId }: { initialId?: string }) {
  const [state, setState] = useState<"none" | "shown" | "renamed">("none");
  return (
    <>
      <button onClick={() => setState("shown")}>show</button>
      <button onClick={() => setState("renamed")}>rename</button>
      <button onClick={() => setState("none")}>hide</button>
      <Table>
        {state !== "none" && (
          <TableCaption id={state === "renamed" ? "second" : initialId}>Payments</TableCaption>
        )}
        {rows()}
      </Table>
    </>
  );
}

function lazy(initialId?: string) {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<TableContainer><Lazy initialId={initialId} /></TableContainer>);
  return screen.getByRole("region");
}

describe("TableContainer (D126)", () => {
  it("is a focusable region around the table", () => {
    withCaption();
    const region = screen.getByRole("region", { name: "Payments" });
    expect(region.tagName).toBe("DIV");
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.querySelector(":scope > table")).not.toBeNull();
  });

  it("takes its name from the caption, giving the caption an id when it has none", () => {
    withCaption();
    const region = screen.getByRole("region");
    const caption = region.querySelector("caption")!;
    expect(caption.id).not.toBe("");
    expect(region.getAttribute("aria-labelledby")).toBe(caption.id);
  });

  it("keeps the caption's own id and points at it", () => {
    withCaption({}, "payments-caption");
    expect(screen.getByRole("region").getAttribute("aria-labelledby")).toBe("payments-caption");
  });

  it("lets aria-label win over the caption", () => {
    withCaption({ "aria-label": "All payments" });
    const region = screen.getByRole("region", { name: "All payments" });
    expect(region.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("lets aria-labelledby win over the caption", () => {
    render(
      <>
        <h2 id="heading">Ledger</h2>
        <TableContainer aria-labelledby="heading">
          <Table><TableCaption>Payments</TableCaption>{rows()}</Table>
        </TableContainer>
      </>,
    );
    expect(screen.getByRole("region", { name: "Ledger" }).getAttribute("aria-labelledby")).toBe("heading");
  });

  it("warns once in development when it has no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<TableContainer><Table>{rows()}</Table></TableContainer>);
    rerender(<TableContainer><Table>{rows()}</Table></TableContainer>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARNING);
  });

  it("does not warn with a caption or an aria-label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    withCaption();
    render(<TableContainer aria-label="Payments"><Table>{rows()}</Table></TableContainer>);
    expect(warn).not.toHaveBeenCalled();
  });

  it("sets max-block-size from a number in px or a CSS length string", () => {
    const { unmount } = withCaption({ maxBlockSize: 240 });
    expect(screen.getByRole("region").style.maxBlockSize).toBe("240px");
    unmount();
    withCaption({ maxBlockSize: "60vh" });
    expect(screen.getByRole("region").style.maxBlockSize).toBe("60vh");
  });

  it("forwards its ref, className, style and remaining attributes; role and tabIndex stay its own", () => {
    const ref = createRef<HTMLDivElement>();
    withCaption({ ref, className: "mine", style: { marginTop: 8 }, "data-testid": "c", role: "group", tabIndex: -1 } as Partial<TableContainerProps>);
    const region = screen.getByTestId("c");
    expect(ref.current).toBe(region);
    expect(region.className).toMatch(/container/);
    expect(region.className).toMatch(/mine/);
    expect(region.style.marginTop).toBe("8px");
    expect(region.getAttribute("role")).toBe("region");
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("leaves a caption outside a container without a generated id", () => {
    render(<Table><TableCaption>Payments</TableCaption>{rows()}</Table>);
    expect(document.querySelector("caption")!.hasAttribute("id")).toBe(false);
  });

  it("is named by a caption that arrives after the container rendered", () => {
    const region = lazy();
    expect(region.hasAttribute("aria-labelledby")).toBe(false);
    fireEvent.click(screen.getByText("show"));
    const caption = region.querySelector("caption")!;
    expect(caption.id).not.toBe("");
    expect(region.getAttribute("aria-labelledby")).toBe(caption.id);
  });

  it("follows the caption's id when it changes", () => {
    const region = lazy("first");
    fireEvent.click(screen.getByText("show"));
    expect(region.getAttribute("aria-labelledby")).toBe("first");
    fireEvent.click(screen.getByText("rename"));
    expect(region.getAttribute("aria-labelledby")).toBe("second");
  });

  it("drops aria-labelledby when the caption unmounts", () => {
    const region = lazy();
    fireEvent.click(screen.getByText("show"));
    expect(region.hasAttribute("aria-labelledby")).toBe(true);
    fireEvent.click(screen.getByText("hide"));
    expect(region.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("treats an empty aria-label or aria-labelledby as no name", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = withCaption({ "aria-label": "", "aria-labelledby": "" });
    const region = screen.getByRole("region");
    expect(region.getAttribute("aria-labelledby")).toBe(region.querySelector("caption")!.id);
    expect(region.hasAttribute("aria-label")).toBe(false);
    expect(warn).not.toHaveBeenCalled();
    unmount();
    render(<TableContainer aria-label=""><Table>{rows()}</Table></TableContainer>);
    expect(warn).toHaveBeenCalledWith(WARNING);
  });
});

describe("TableContainer follow-ups (D128)", () => {
  it("warns once under StrictMode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<StrictMode><TableContainer><Table>{rows()}</Table></TableContainer></StrictMode>);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("treats a caption's empty id as none: the offered id names the region", () => {
    withCaption({}, "");
    const region = screen.getByRole("region", { name: "Payments" });
    const caption = region.querySelector("caption")!;
    expect(caption.id).not.toBe("");
    expect(region.getAttribute("aria-labelledby")).toBe(caption.id);
  });

  it("renders no id for a caption with an empty id outside a container", () => {
    render(<Table><TableCaption id="">Payments</TableCaption>{rows()}</Table>);
    expect(document.querySelector("caption")!.hasAttribute("id")).toBe(false);
  });
});

describe("TableContainer scroll padding under a sticky header (D128)", () => {
  let observed: Element[] = [];
  let callbacks: ResizeObserverCallback[] = [];
  const height = { value: 43 };

  beforeEach(() => {
    observed = [];
    callbacks = [];
    height.value = 43;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ height: height.value, width: 0, top: 0, left: 0, right: 0, bottom: height.value, x: 0, y: 0, toJSON() {} }) as DOMRect,
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) { callbacks.push(cb); }
        observe(el: Element) { observed.push(el); }
        unobserve() {}
        disconnect() { observed = []; }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const sizeVar = () => screen.getByRole("region").style.getPropertyValue("--_psi-table-head-size");

  it("sets the header's measured block size on the container for a sticky table", () => {
    render(<TableContainer aria-label="Payments"><Table stickyHeader>{rows()}</Table></TableContainer>);
    expect(sizeVar()).toBe("43px");
    expect(observed.map((el) => el.tagName)).toEqual(["THEAD"]);
  });

  it("follows the header when it resizes", () => {
    render(<TableContainer aria-label="Payments"><Table stickyHeader>{rows()}</Table></TableContainer>);
    height.value = 64;
    act(() => callbacks.forEach((cb) => cb([], {} as ResizeObserver)));
    expect(sizeVar()).toBe("64px");
  });

  it("sets nothing for a header that does not stick", () => {
    render(<TableContainer aria-label="Payments"><Table>{rows()}</Table></TableContainer>);
    expect(sizeVar()).toBe("");
    expect(observed).toEqual([]);
  });

  it("clears it when the table stops sticking", () => {
    const { rerender } = render(<TableContainer aria-label="Payments"><Table stickyHeader>{rows()}</Table></TableContainer>);
    rerender(<TableContainer aria-label="Payments"><Table>{rows()}</Table></TableContainer>);
    expect(sizeVar()).toBe("");
  });

  it("keeps the consumer's style alongside it", () => {
    render(<TableContainer aria-label="Payments" style={{ marginTop: 8 }} maxBlockSize={240}><Table stickyHeader>{rows()}</Table></TableContainer>);
    const region = screen.getByRole("region");
    expect(region.style.marginTop).toBe("8px");
    expect(region.style.maxBlockSize).toBe("240px");
    expect(sizeVar()).toBe("43px");
  });

  it("measures once on mount where there is no ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<TableContainer aria-label="Payments"><Table stickyHeader>{rows()}</Table></TableContainer>);
    expect(sizeVar()).toBe("43px");
  });

  it("sets nothing for a sticky table outside a container", () => {
    render(<Table stickyHeader>{rows()}</Table>);
    expect(observed).toEqual([]);
  });
});
