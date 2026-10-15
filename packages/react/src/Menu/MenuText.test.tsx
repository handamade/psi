// jsdom's default stylesheet hides every `[popover]`, so role queries pass
// `{ hidden: true }`, as in useMenuKeyboard.test.tsx.
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { MenuSeparator } from "./MenuSeparator.js";
import { MenuText } from "./MenuText.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Account</Button>;

function openAccountMenu(describedBy?: string) {
  return render(
    <Menu open onClose={() => {}} trigger={trigger} aria-label="Account" aria-describedby={describedBy}>
      <MenuItem onSelect={() => {}}>Profile</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => {}}>Sign out</MenuItem>
      <MenuSeparator />
      <MenuText id="build">Build 1.4.2</MenuText>
    </Menu>,
  );
}

const menu = () => screen.getByRole("menu", { hidden: true });
const item = (name: string) => screen.getByRole("menuitem", { name, hidden: true });
const line = () => screen.getByText("Build 1.4.2");

describe("MenuText (D99)", () => {
  it("renders inside the menu element, with no role and not hidden", () => {
    openAccountMenu();
    expect(menu()).toContainElement(line());
    expect(line()).not.toHaveAttribute("role");
    expect(line()).not.toHaveAttribute("aria-hidden");
    expect(line()).toHaveAttribute("data-psi-menu-text");
    expect(line()).not.toHaveAttribute("tabindex");
  });

  it("is never a menuitem", () => {
    openAccountMenu();
    expect(screen.getAllByRole("menuitem", { hidden: true }).map((el) => el.textContent)).toEqual([
      "Profile",
      "Sign out",
    ]);
  });

  it("is skipped by Arrow Down: from the last item focus wraps to the first", () => {
    openAccountMenu();
    item("Sign out").focus();
    fireEvent.keyDown(menu(), { key: "ArrowDown" });
    expect(item("Profile")).toHaveFocus();
  });

  it("is skipped by End: focus goes to the last item", () => {
    openAccountMenu();
    item("Profile").focus();
    fireEvent.keyDown(menu(), { key: "End" });
    expect(item("Sign out")).toHaveFocus();
  });

  it("is skipped by typeahead on its own first letter", () => {
    openAccountMenu();
    item("Profile").focus();
    fireEvent.keyDown(menu(), { key: "b" });
    expect(line()).not.toHaveFocus();
    expect(item("Profile")).toHaveFocus();
  });

  it("can be the menu's description through aria-describedby", () => {
    openAccountMenu("build");
    expect(menu()).toHaveAttribute("aria-describedby", "build");
    expect(line()).toHaveAttribute("id", "build");
  });

  it("is not the menu's description unless the consumer asks", () => {
    openAccountMenu();
    expect(menu()).not.toHaveAttribute("aria-describedby");
  });
});
