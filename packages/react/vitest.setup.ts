import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Polyfill dialog element methods for jsdom
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
}

// Polyfill Popover API for jsdom (D53 — Menu). Mirrors the dialog polyfill
// above: enough surface for controlled open/close assertions, not a spec
// implementation. Real browsers use the native API; the top layer, light
// dismiss and Esc are exercised in Playwright VR, not here.
if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {
    this.setAttribute("data-open", "");
    this.dispatchEvent(new Event("toggle"));
  };
}

if (!HTMLElement.prototype.hidePopover) {
  HTMLElement.prototype.hidePopover = function () {
    this.removeAttribute("data-open");
    this.dispatchEvent(new Event("toggle"));
  };
}
