import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton.js";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function stubClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as unknown as Record<string, unknown>).clipboard;
});

describe("CopyButton (D86)", () => {
  it("shows the visible label Copy by default, and a custom one", () => {
    const { unmount } = render(<CopyButton value="abc" />);
    expect(screen.getByRole("button", { name: "Copy" })).toHaveTextContent("Copy");
    unmount();
    render(<CopyButton value="abc" label="Kopieren" />);
    expect(screen.getByRole("button", { name: "Kopieren" })).toHaveTextContent("Kopieren");
  });

  it("hides the icon from assistive tech", () => {
    render(<CopyButton value="abc" />);
    const svgs = document.querySelectorAll("svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("writes value to the clipboard, then reports copied", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const onCopy = vi.fn();
    render(<CopyButton value="ORD-1042" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("ORD-1042");
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("copied"));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("reports failed when writeText rejects", async () => {
    const user = userEvent.setup();
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("failed"));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("reports failed, without throwing, when there is no clipboard", async () => {
    const user = userEvent.setup();
    stubClipboard(undefined);
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith("failed");
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("does not throw without an onCopy", async () => {
    const user = userEvent.setup();
    stubClipboard(undefined);
    render(<CopyButton value="abc" />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
  });

  it("keeps its label and icon after a successful copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);
    const button = screen.getByRole("button", { name: "Copy" });
    const before = button.innerHTML;
    await user.click(button);
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith("copied"));
    expect(button).toHaveTextContent("Copy");
    expect(button.innerHTML).toBe(before);
  });

  it("renders no role, aria-live or status message", () => {
    const { container } = render(<CopyButton value="abc" />);
    expect(container.querySelector("[role]")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("passes className to the button", () => {
    render(<CopyButton value="abc" className="mine" />);
    expect(screen.getByRole("button").className.split(" ")).toContain("mine");
  });

  it("defaults to a 32px ghost button, and passes size and variant through", () => {
    const { unmount } = render(<CopyButton value="abc" />);
    let cls = screen.getByRole("button").className;
    expect(cls).toContain("ghost");
    expect(cls).toContain("size32");
    unmount();
    render(<CopyButton value="abc" variant="neutral" size={40} />);
    cls = screen.getByRole("button").className;
    expect(cls).toContain("neutral");
    expect(cls).not.toContain("ghost");
    expect(cls).toContain("size40");
  });

  it("is a type=button", () => {
    render(<CopyButton value="abc" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
