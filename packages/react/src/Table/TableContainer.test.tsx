import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
