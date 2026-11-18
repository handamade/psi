import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./Combobox.js";
import type { ComboboxOption } from "./types.js";
import { Field } from "../Field/Field.js";

const cities: ComboboxOption[] = [
  { value: "ams", label: "Amsterdam" },
  { value: "ber", label: "Berlin", description: "Germany" },
  { value: "bru", label: "Brussels", disabled: true },
  { value: "zrh", label: "Zürich" },
];

const input = () => screen.getByRole("combobox");
const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]')!;
const popup = () => document.querySelector<HTMLElement>("[data-psi-combobox-popup]")!;
const isOpen = () => popup().hasAttribute("data-open");
const status = () => document.querySelector<HTMLElement>("[data-psi-combobox-status]");
const more = () => document.querySelector<HTMLElement>("[data-psi-combobox-more]");
const describedIds = () => (input().getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
const live = () => document.querySelector('[aria-live="polite"]');

function inForm(ui: React.ReactNode, onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())) {
  render(<form onSubmit={onSubmit}>{ui}<button type="button">Next</button></form>);
  return onSubmit;
}

describe("D134 · Escape restores the shown label (single-select)", () => {
  it("Escape in an open list closes it, restores the picked label and stops propagation", async () => {
    const outer = vi.fn();
    render(<div onKeyDown={outer}><Combobox options={cities} aria-label="City" defaultValue="ber" /></div>);
    await userEvent.type(input(), "x");
    expect(isOpen()).toBe(true);
    outer.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("Berlin");
    expect(outer).not.toHaveBeenCalled();
  });

  it("two Escapes and a blur keep the picked value", async () => {
    const onChange = vi.fn();
    render(<><Combobox options={cities} aria-label="City" defaultValue="ber" onChange={onChange} name="city" /><button>Next</button></>);
    await userEvent.type(input(), "x{Escape}{Escape}");
    expect(input()).toHaveValue("Berlin");
    await userEvent.tab();
    expect(input()).toHaveValue("Berlin");
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe("ber");
  });

  it("Escape on a closed list restores edited text and stops propagation", async () => {
    const outer = vi.fn();
    render(<div onKeyDown={outer}><Combobox options={cities} aria-label="City" defaultValue="ber" /></div>);
    await userEvent.type(input(), "x");
    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("Berlinx");
    outer.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(input()).toHaveValue("Berlin");
    expect(outer).not.toHaveBeenCalled();
  });

  it("Escape on a closed list with unedited text does nothing and reaches the parent", async () => {
    const outer = vi.fn();
    render(<div onKeyDown={outer}><Combobox options={cities} aria-label="City" defaultValue="ber" /></div>);
    input().focus();
    await userEvent.keyboard("{Escape}");
    expect(input()).toHaveValue("Berlin");
    expect(outer).toHaveBeenCalled();
  });

  it("Escape restores emptied text too: it never clears a value", async () => {
    const onChange = vi.fn();
    render(<><Combobox options={cities} aria-label="City" defaultValue="ber" onChange={onChange} /><button>Next</button></>);
    await userEvent.clear(input());
    await userEvent.keyboard("{Escape}");
    expect(input()).toHaveValue("Berlin");
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a restore reports the label through onInputChange", async () => {
    const onInputChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" onInputChange={onInputChange} />);
    await userEvent.type(input(), "x{Escape}");
    expect(onInputChange).toHaveBeenLastCalledWith("Berlin");
  });
});

describe("D134 · Enter settles edited text (single-select)", () => {
  it("open with nothing highlighted: reverts unmatched text, closes, never submits", async () => {
    const onChange = vi.fn();
    const onSubmit = inForm(<Combobox options={cities} aria-label="City" defaultValue="ber" onChange={onChange} />);
    await userEvent.type(input(), "qq");
    expect(isOpen()).toBe(true);
    expect(input()).not.toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    expect(input()).toHaveValue("Berlin");
    expect(isOpen()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("open with nothing highlighted and emptied text: clears the value, as blur does", async () => {
    const onChange = vi.fn();
    render(<Combobox options={[]} filter={false} aria-label="City" defaultValue="ber" valueLabel="Berlin" onChange={onChange} />);
    await userEvent.clear(input());
    expect(isOpen()).toBe(true);
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(null);
    expect(isOpen()).toBe(false);
  });

  it("open with nothing highlighted and unedited text: closes", async () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" />);
    input().focus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(isOpen()).toBe(true);
    await userEvent.keyboard("{Enter}");
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("Berlin");
  });

  it("closed with edited text: reverts and doesn't submit", async () => {
    const onSubmit = inForm(<Combobox options={cities} aria-label="City" defaultValue="ber" />);
    await userEvent.type(input(), "x");
    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
    await userEvent.keyboard("{Enter}");
    expect(input()).toHaveValue("Berlin");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closed with unedited text: native, so it submits", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Combobox options={cities} aria-label="City" defaultValue="ber" /><button type="submit">Save</button></form>);
    input().focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("D134 · multi-select keeps D130's Escape and Enter", () => {
  it("Escape open keeps the search text; Escape closed clears it; values stay", async () => {
    const onChange = vi.fn();
    render(<Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams"]} onChange={onChange} />);
    await userEvent.type(input(), "be{Escape}");
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("be");
    await userEvent.keyboard("{Escape}");
    expect(input()).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Enter open with nothing highlighted keeps the list open", async () => {
    render(<Combobox multiple options={cities} aria-label="Cities" />);
    await userEvent.type(input(), "qq{Enter}");
    expect(isOpen()).toBe(true);
  });
});

describe("D134 · aria-expanded follows the listbox", () => {
  it("is false while no match shows, true while options show", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    const toggle = screen.getByRole("button", { name: "Show options" });
    await userEvent.type(input(), "qq");
    expect(isOpen()).toBe(true);
    expect(listbox()).toHaveAttribute("hidden");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.clear(input());
    await userEvent.type(input(), "ber");
    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(input().getAttribute("aria-controls")).toBe(listbox().id);
  });

  it("is false while loading with no options, true while loading keeps options", () => {
    const { rerender } = render(<Combobox options={[]} filter={false} loading aria-label="City" />);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(isOpen()).toBe(true);
    expect(input()).toHaveAttribute("aria-expanded", "false");
    rerender(<Combobox options={cities} filter={false} loading aria-label="City" />);
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });
});

describe("D134 · the status and more lines describe the input while they show", () => {
  it("names the status line only while it shows", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    expect(describedIds()).toEqual([]);
    await userEvent.type(input(), "qq");
    expect(describedIds()).toEqual([status()!.id]);
    expect(status()).toHaveTextContent("No matches");
    await userEvent.keyboard("{Escape}");
    expect(describedIds()).toEqual([]);
  });

  it("names the loading line and the more line, after the Field's own description", () => {
    render(
      <Field label="City" description="Where you live">
        <Combobox options={cities} filter={false} loading moreMessage="Showing 4 of 812" />
      </Field>,
    );
    const fieldIds = describedIds();
    expect(fieldIds).toHaveLength(1);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(describedIds()).toEqual([...fieldIds, status()!.id, more()!.id]);
    expect(status()).toHaveTextContent("Loading…");
  });

  it("names nothing while closed, even with a status line in the tree", () => {
    render(<Combobox options={[]} filter={false} loading aria-label="City" />);
    expect(status()).not.toBeNull();
    expect(input()).not.toHaveAttribute("aria-describedby");
  });
});

describe("D134 · announce", () => {
  it("keeps the polite live region by default", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "er");
    expect(live()).toHaveTextContent("2 results");
  });

  it("announce={false} renders no live region; the status line stays", async () => {
    const { container } = render(<Combobox options={cities} aria-label="City" announce={false} />);
    await userEvent.type(input(), "qq");
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(status()).toHaveTextContent("No matches");
    expect(describedIds()).toEqual([status()!.id]);
  });
});

describe("D134 · valueLabel", () => {
  it("shows a preset value's label when the options don't hold it", () => {
    render(<Combobox options={cities} filter={false} aria-label="Customer" defaultValue="c-4182" valueLabel="Acme GmbH" />);
    expect(input()).toHaveValue("Acme GmbH");
  });

  it("shows a label that arrives after the value", () => {
    const { rerender } = render(<Combobox options={[]} filter={false} aria-label="Customer" value="c-4182" />);
    expect(input()).toHaveValue("c-4182");
    rerender(<Combobox options={[]} filter={false} aria-label="Customer" value="c-4182" valueLabel="Acme GmbH" />);
    expect(input()).toHaveValue("Acme GmbH");
  });

  it("shows the options' label once a page holds the value", () => {
    const { rerender } = render(<Combobox options={[]} filter={false} aria-label="Customer" value="c-4182" />);
    rerender(<Combobox options={[{ value: "c-4182", label: "Acme GmbH" }]} filter={false} aria-label="Customer" value="c-4182" />);
    expect(input()).toHaveValue("Acme GmbH");
  });

  it("the options win over valueLabel", () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" valueLabel="Berlin, DE" />);
    expect(input()).toHaveValue("Berlin");
  });

  it("stays with its value: a later pick shows the picked option's label", async () => {
    render(<><Combobox options={cities} filter={false} aria-label="City" defaultValue="c-4182" valueLabel="Acme GmbH" /><button>Next</button></>);
    await userEvent.clear(input());
    await userEvent.type(input(), "x");
    // filter={false}: all four options show, and the first is highlighted.
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(input()).toHaveValue("Berlin");
    await userEvent.type(input(), "zz");
    await userEvent.tab();
    expect(input()).toHaveValue("Berlin");
  });

  it("restores and reverts to valueLabel", async () => {
    render(<><Combobox options={[]} filter={false} aria-label="Customer" defaultValue="c-4182" valueLabel="Acme GmbH" /><button>Next</button></>);
    await userEvent.type(input(), "x{Escape}");
    expect(input()).toHaveValue("Acme GmbH");
    await userEvent.type(input(), "y");
    await userEvent.tab();
    expect(input()).toHaveValue("Acme GmbH");
  });

  it("never overwrites edited text", async () => {
    function Late() {
      const [label, setLabel] = useState<string | undefined>(undefined);
      return (
        <>
          <Combobox options={[]} filter={false} aria-label="Customer" value="c-4182" valueLabel={label} />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setLabel("Acme GmbH")}>Load</button>
        </>
      );
    }
    render(<Late />);
    await userEvent.type(input(), "x");
    expect(input()).toHaveValue("c-4182x");
    await userEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(input()).toHaveValue("c-4182x");
  });
});

describe("D134 · open and onOpenChange", () => {
  it("uncontrolled: reports each change after it happens", async () => {
    const onOpenChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" onOpenChange={onOpenChange} />);
    await userEvent.type(input(), "be");
    expect(onOpenChange.mock.calls).toEqual([[true]]);
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it("controlled closed: typing, the arrows and the chevron ask to open, and nothing opens", async () => {
    const onOpenChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" open={false} onOpenChange={onOpenChange} />);
    await userEvent.type(input(), "b");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(isOpen()).toBe(false);
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).not.toHaveAttribute("aria-activedescendant");
    onOpenChange.mockClear();
    await userEvent.keyboard("{ArrowDown}");
    expect(onOpenChange).toHaveBeenCalledWith(true);
    onOpenChange.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Show options" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("b");
  });

  it("controlled closed: Escape restores and Enter settles without submitting", async () => {
    const onSubmit = inForm(<Combobox options={cities} aria-label="City" defaultValue="ber" open={false} />);
    await userEvent.type(input(), "x{Enter}");
    expect(input()).toHaveValue("Berlin");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(input(), "y{Escape}");
    expect(input()).toHaveValue("Berlin");
  });

  it("controlled open: closes are asked for, and applied only by the caller", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Combobox options={cities} aria-label="City" open onOpenChange={onOpenChange} />);
    expect(isOpen()).toBe(true);
    input().focus();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(isOpen()).toBe(true);
    rerender(<Combobox options={cities} aria-label="City" open={false} onOpenChange={onOpenChange} />);
    expect(isOpen()).toBe(false);
  });

  it("never echoes a change the caller made", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Combobox options={cities} aria-label="City" open={false} onOpenChange={onOpenChange} />);
    rerender(<Combobox options={cities} aria-label="City" open onOpenChange={onOpenChange} />);
    rerender(<Combobox options={cities} aria-label="City" open={false} onOpenChange={onOpenChange} />);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("a held-open list follows the caller, with a pick asking to close", async () => {
    function Held() {
      const [open, setOpen] = useState(false);
      const [failed, setFailed] = useState(true);
      return (
        <>
          <Combobox options={cities} aria-label="City" open={failed ? false : open} onOpenChange={setOpen} />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setFailed(false)}>Retry</button>
        </>
      );
    }
    render(<Held />);
    await userEvent.type(input(), "ber");
    expect(isOpen()).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(isOpen()).toBe(true);
    await userEvent.keyboard("{Enter}");
    expect(input()).toHaveValue("Berlin");
    expect(isOpen()).toBe(false);
  });

  it("disabled wins over open", () => {
    render(<Combobox options={cities} aria-label="City" open disabled />);
    expect(isOpen()).toBe(false);
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("blur asks to close", async () => {
    const onOpenChange = vi.fn();
    render(<><Combobox options={cities} aria-label="City" open onOpenChange={onOpenChange} /><button>Next</button></>);
    input().focus();
    await act(async () => input().blur());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
