import { describe, it, expect, vi } from "vitest";
import { createRef, useState } from "react";
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
const options = () => Array.from(listbox().querySelectorAll<HTMLElement>('[role="option"]'));
const optionByLabel = (label: string) => options().find((o) => o.textContent?.includes(label))!;
const highlighted = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.querySelector("[data-psi-combobox-option-label]")?.textContent ?? null : null;
};

describe("Combobox: the input (D130)", () => {
  it("is a combobox with list autocomplete, controlling the listbox", () => {
    render(<Combobox options={cities} aria-label="City" />);
    const el = input();
    expect(el.tagName).toBe("INPUT");
    expect(el).toHaveAttribute("aria-autocomplete", "list");
    expect(el).toHaveAttribute("aria-expanded", "false");
    expect(el).toHaveAttribute("autocomplete", "off");
    expect(el.getAttribute("aria-controls")).toBe(listbox().id);
    expect(el).not.toHaveAttribute("aria-activedescendant");
  });

  it("forwards ref to the input and puts className and data-psi-combobox on the root", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(<Combobox options={cities} aria-label="City" ref={ref} className="mine" />);
    expect(ref.current).toBe(input());
    const root = container.firstElementChild!;
    expect(root).toHaveClass("mine");
    expect(root).toHaveAttribute("data-psi-combobox");
  });

  it("names the listbox like the input when standalone", () => {
    render(<Combobox options={cities} aria-label="City" />);
    expect(listbox()).toHaveAttribute("aria-label", "City");
  });
});

describe("Combobox: typing and the list", () => {
  it("opens and filters on typing, highlighting the first match", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "er");
    expect(isOpen()).toBe(true);
    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(options().map((o) => o.querySelector("[data-psi-combobox-option-label]")!.textContent)).toEqual([
      "Amsterdam", "Berlin",
    ]);
    expect(highlighted()).toBe("Amsterdam");
  });

  it("filters ignoring case and accents by default", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "ZUR");
    expect(options()).toHaveLength(1);
    expect(highlighted()).toBe("Zürich");
  });

  it("takes a filter function", async () => {
    render(<Combobox options={cities} aria-label="City" filter={(o, t) => o.value.startsWith(t)} />);
    await userEvent.type(input(), "b");
    expect(options()).toHaveLength(2);
  });

  it("filter={false} shows the options as given", async () => {
    render(<Combobox options={cities} aria-label="City" filter={false} />);
    await userEvent.type(input(), "zzz");
    expect(options()).toHaveLength(4);
  });

  it("shows the whole list when opened by key, even with a picked label in the input", async () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" />);
    expect(input()).toHaveValue("Berlin");
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(options()).toHaveLength(4);
    expect(highlighted()).toBe("Berlin");
  });

  it("marks options with aria-selected and aria-disabled, and joins the description into the name", async () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" />);
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(optionByLabel("Berlin")).toHaveAttribute("aria-selected", "true");
    expect(optionByLabel("Amsterdam")).toHaveAttribute("aria-selected", "false");
    expect(optionByLabel("Brussels")).toHaveAttribute("aria-disabled", "true");
    // jsdom computes no name inside a [popover] it hides, so the name itself is
    // checked in combobox.interaction.spec.ts; here, its text and the
    // aria-hidden check mark.
    expect(optionByLabel("Berlin").textContent).toBe("Berlin Germany");
    expect(optionByLabel("Berlin").querySelector("[aria-hidden='true'] svg")).not.toBeNull();
  });
});

describe("Combobox: keyboard", () => {
  it("Down opens on the first option with nothing picked; Up on the last", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(highlighted()).toBe("Amsterdam");
    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
    await userEvent.keyboard("{ArrowUp}");
    expect(highlighted()).toBe("Zürich");
  });

  it("moves, wraps, and reaches disabled options", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    input().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(highlighted()).toBe("Brussels");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(highlighted()).toBe("Amsterdam");
  });

  it("Alt+Down opens without a highlight; Alt+Up closes", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    input().focus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(isOpen()).toBe(true);
    expect(input()).not.toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(isOpen()).toBe(false);
  });

  it("Enter picks the highlighted option, closes a single-select and shows its label", async () => {
    const onChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" onChange={onChange} />);
    await userEvent.type(input(), "ber{Enter}");
    expect(onChange).toHaveBeenCalledWith("ber");
    expect(isOpen()).toBe(false);
    expect(input()).toHaveValue("Berlin");
  });

  it("Enter on a disabled option does nothing", async () => {
    const onChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" onChange={onChange} />);
    await userEvent.type(input(), "bru{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(isOpen()).toBe(true);
  });

  it("Enter with the list open doesn't submit the form", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><Combobox options={cities} aria-label="City" /></form>);
    await userEvent.type(input(), "ber{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Esc closes an open list and stops propagation", async () => {
    const outer = vi.fn();
    render(<div onKeyDown={outer}><Combobox options={cities} aria-label="City" /></div>);
    await userEvent.type(input(), "a");
    outer.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(isOpen()).toBe(false);
    expect(outer).not.toHaveBeenCalled();
    // D134: Escape cancels the edit; with nothing picked the label is empty.
    expect(input()).toHaveValue("");
  });

  it("Esc on a closed list empties edited text when nothing is picked (D134: it restores the empty label)", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "a{Escape}{Escape}");
    expect(input()).toHaveValue("");
  });

  it("Tab closes the list and picks nothing", async () => {
    const onChange = vi.fn();
    render(<><Combobox options={cities} aria-label="City" onChange={onChange} /><button>Next</button></>);
    await userEvent.type(input(), "ber");
    await userEvent.tab();
    expect(isOpen()).toBe(false);
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Page Down and Page Up move 10 options, stopping at the ends", async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));
    render(<Combobox options={many} aria-label="Many" />);
    input().focus();
    await userEvent.keyboard("{ArrowDown}{PageDown}");
    expect(highlighted()).toBe("Option 10");
    await userEvent.keyboard("{PageDown}");
    expect(highlighted()).toBe("Option 14");
    await userEvent.keyboard("{PageUp}{PageUp}");
    expect(highlighted()).toBe("Option 0");
  });
});

describe("Combobox: single-select value", () => {
  it("is uncontrolled from defaultValue", () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="zrh" />);
    expect(input()).toHaveValue("Zürich");
  });

  it("is controlled by value, and its text follows the value", async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>("ams");
      return (
        <>
          <Combobox options={cities} aria-label="City" value={value} onChange={setValue} />
          <button onClick={() => setValue("zrh")}>Set</button>
        </>
      );
    }
    render(<Controlled />);
    expect(input()).toHaveValue("Amsterdam");
    await userEvent.click(screen.getByRole("button", { name: "Set" }));
    expect(input()).toHaveValue("Zürich");
  });

  it("a controlled value without onChange doesn't change on a pick", async () => {
    render(<Combobox options={cities} aria-label="City" value="ams" />);
    await userEvent.clear(input());
    await userEvent.type(input(), "ber{Enter}");
    await act(async () => input().blur());
    expect(input()).toHaveValue("Amsterdam");
  });

  it("on blur, text that doesn't match the picked option goes back to its label", async () => {
    render(<><Combobox options={cities} aria-label="City" defaultValue="ber" /><button>Next</button></>);
    await userEvent.type(input(), "xyz");
    await userEvent.tab();
    expect(input()).toHaveValue("Berlin");
  });

  it("leaving with the text emptied sets the value to null", async () => {
    const onChange = vi.fn();
    render(<><Combobox options={cities} aria-label="City" defaultValue="ber" onChange={onChange} /><button>Next</button></>);
    await userEvent.clear(input());
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input()).toHaveValue("");
  });

  it("reports the text through onInputChange, and takes a controlled inputValue", async () => {
    const onInputChange = vi.fn();
    const { rerender } = render(<Combobox options={cities} aria-label="City" onInputChange={onInputChange} />);
    await userEvent.type(input(), "b");
    expect(onInputChange).toHaveBeenLastCalledWith("b");
    rerender(<Combobox options={cities} aria-label="City" inputValue="Bru" onInputChange={onInputChange} />);
    expect(input()).toHaveValue("Bru");
  });

  it("keeps a picked value's label when a caller-owned list no longer holds it", () => {
    const { rerender } = render(<Combobox options={cities} aria-label="City" filter={false} value="ber" />);
    rerender(<Combobox options={[{ value: "osl", label: "Oslo" }]} aria-label="City" filter={false} value="ber" />);
    expect(input()).toHaveValue("Berlin");
  });
});

describe("Combobox: multi-select", () => {
  it("toggles a pick, keeps the list open, clears the text and shows a Tag", async () => {
    const onChange = vi.fn();
    render(<Combobox multiple options={cities} aria-label="Cities" onChange={onChange} />);
    expect(listbox()).toHaveAttribute("aria-multiselectable", "true");
    await userEvent.type(input(), "ber{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["ber"]);
    expect(isOpen()).toBe(true);
    expect(input()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Remove Berlin" })).toBeInTheDocument();
    expect(optionByLabel("Berlin")).toHaveAttribute("aria-selected", "true");
    // Enter again on the same option toggles it off.
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("Backspace in an empty input removes the last value", async () => {
    const onChange = vi.fn();
    render(<Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams", "zrh"]} onChange={onChange} />);
    input().focus();
    await userEvent.keyboard("{Backspace}");
    expect(onChange).toHaveBeenLastCalledWith(["ams"]);
    expect(screen.queryByRole("button", { name: "Remove Zürich" })).toBeNull();
  });

  it("a Tag's remove button removes its value and isn't a Tab stop", async () => {
    const onChange = vi.fn();
    render(<Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams", "zrh"]} onChange={onChange} />);
    const remove = screen.getByRole("button", { name: "Remove Amsterdam" });
    expect(remove).toHaveAttribute("tabindex", "-1");
    await userEvent.click(remove);
    expect(onChange).toHaveBeenLastCalledWith(["zrh"]);
    expect(input()).toHaveFocus();
  });

  it("is controlled by value", async () => {
    function Controlled() {
      const [values, setValues] = useState<string[]>(["ams"]);
      return <Combobox multiple options={cities} aria-label="Cities" value={values} onChange={setValues} />;
    }
    render(<Controlled />);
    await userEvent.type(input(), "zur{Enter}");
    expect(screen.getByRole("button", { name: "Remove Amsterdam" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Zürich" })).toBeInTheDocument();
  });
});

describe("Combobox: forms", () => {
  it("name writes a hidden input for a single value", async () => {
    render(<form data-testid="f"><Combobox options={cities} aria-label="City" name="city" defaultValue="ber" /></form>);
    const data = new FormData(screen.getByTestId("f") as HTMLFormElement);
    expect(data.getAll("city")).toEqual(["ber"]);
    expect(input()).not.toHaveAttribute("name");
  });

  it("name writes one hidden input per value in multi-select", () => {
    render(<form data-testid="f"><Combobox multiple options={cities} aria-label="Cities" name="cities" defaultValue={["ams", "zrh"]} /></form>);
    const data = new FormData(screen.getByTestId("f") as HTMLFormElement);
    expect(data.getAll("cities")).toEqual(["ams", "zrh"]);
  });

  it("required sets a custom validity while the value is empty", async () => {
    render(<Combobox multiple options={cities} aria-label="Cities" required />);
    expect(input()).toHaveAttribute("aria-required", "true");
    expect(input().validity.valid).toBe(false);
    await userEvent.type(input(), "ams{Enter}");
    expect(input().validity.valid).toBe(true);
  });

  it("required in single-select reads the value, not the text", async () => {
    render(<Combobox options={cities} aria-label="City" required />);
    await userEvent.type(input(), "ber");
    expect(input().validity.valid).toBe(false);
    await userEvent.keyboard("{Enter}");
    expect(input().validity.valid).toBe(true);
  });
});

describe("Combobox: inside a Field", () => {
  it("takes the id, label, description, invalid and required wiring, and names the listbox by the label", () => {
    render(
      <Field label="City" description="Where you live" error="Pick a city" required>
        <Combobox options={cities} />
      </Field>,
    );
    const el = screen.getByRole("combobox", { name: "City" });
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toHaveAttribute("aria-required", "true");
    expect(el.getAttribute("aria-describedby")).toBeTruthy();
    const label = screen.getByText("City", { selector: "label" });
    expect(listbox().getAttribute("aria-labelledby")).toBe(label.id);
  });
});

describe("Combobox: status lines and the live region", () => {
  it("says No matches in place of an empty list", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "qqq");
    expect(popup()).toHaveTextContent("No matches");
    expect(input()).not.toHaveAttribute("aria-activedescendant");
  });

  it("loading shows a status line, sets aria-busy and keeps the options", () => {
    const { rerender } = render(<Combobox options={cities} aria-label="City" filter={false} />);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    rerender(<Combobox options={cities} aria-label="City" filter={false} loading />);
    expect(popup()).toHaveTextContent("Loading…");
    expect(listbox()).toHaveAttribute("aria-busy", "true");
    expect(options()).toHaveLength(4);
  });

  it("puts the more line and the status line outside the listbox", async () => {
    render(<Combobox options={cities} aria-label="City" filter={false} moreMessage="Showing 4 of 812" loading />);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(popup()).toHaveTextContent("Showing 4 of 812");
    expect(listbox()).not.toHaveTextContent("Showing 4 of 812");
    expect(listbox()).not.toHaveTextContent("Loading…");
  });

  it("announces the result count politely", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    await userEvent.type(input(), "er");
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("2 results");
    await userEvent.type(input(), "l");
    expect(live).toHaveTextContent("1 result");
  });
});

describe("Combobox: buttons", () => {
  it("the chevron toggles the list, returns focus to the input, and isn't a Tab stop", async () => {
    render(<Combobox options={cities} aria-label="City" />);
    const toggle = screen.getByRole("button", { name: "Show options" });
    expect(toggle).toHaveAttribute("tabindex", "-1");
    await userEvent.click(toggle);
    expect(isOpen()).toBe(true);
    expect(input()).toHaveFocus();
    await userEvent.click(toggle);
    expect(isOpen()).toBe(false);
  });

  it("has no clear button by default", () => {
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("clearable empties the value and the text", async () => {
    const onChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" defaultValue="ber" clearable onChange={onChange} />);
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(clear).toHaveAttribute("tabindex", "-1");
    await userEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input()).toHaveValue("");
    expect(input()).toHaveFocus();
  });

  it("clearable empties every value in multi-select", async () => {
    const onChange = vi.fn();
    render(<Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams", "ber"]} clearable onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("clicking an option picks it and keeps focus in the input", async () => {
    const onChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" onChange={onChange} />);
    await userEvent.type(input(), "ich");
    await userEvent.click(optionByLabel("Zürich"));
    expect(onChange).toHaveBeenCalledWith("zrh");
    expect(input()).toHaveFocus();
  });

  it("clicking a disabled option picks nothing", async () => {
    const onChange = vi.fn();
    render(<Combobox options={cities} aria-label="City" onChange={onChange} />);
    await userEvent.type(input(), "b");
    await userEvent.click(optionByLabel("Brussels"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disabled disables the input and the buttons, and draws no remove buttons", () => {
    render(<Combobox multiple options={cities} aria-label="Cities" defaultValue={["ams"]} clearable disabled />);
    expect(input()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show options" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove Amsterdam" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});

describe("Combobox: translatable names", () => {
  it("each label has an English default and takes a replacement", async () => {
    render(
      <Combobox
        multiple
        options={cities}
        aria-label="Städte"
        defaultValue={["ams"]}
        clearable
        clearLabel="Leeren"
        toggleLabel="Optionen zeigen"
        removeLabel={(label) => `${label} entfernen`}
        emptyMessage="Keine Treffer"
        resultsLabel={(n) => `${n} Treffer`}
      />,
    );
    expect(screen.getByRole("button", { name: "Leeren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Optionen zeigen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amsterdam entfernen" })).toBeInTheDocument();
    await userEvent.type(input(), "er");
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("2 Treffer");
    await userEvent.type(input(), "qq");
    expect(popup()).toHaveTextContent("Keine Treffer");
  });

  it("loadingMessage replaces Loading…", () => {
    render(<Combobox options={cities} aria-label="City" loading loadingMessage="Lädt…" />);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(popup()).toHaveTextContent("Lädt…");
  });
});
