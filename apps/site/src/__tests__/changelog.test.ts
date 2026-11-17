import { describe, expect, it } from "vitest";
import { changelogMd, entryAnchor } from "../lib/changelog";

describe("changelogMd", () => {
  it("one heading per entry, newest first, with date and body", () => {
    const md = changelogMd([
      { date: "2026-11-17", tag: "release", title: "0.34.0 — a Combobox", body: "Body one." },
      { date: "2026-11-16", tag: "release", title: "0.33.0 — a pager", body: "Body two.", link: { label: "Docs", href: "/docs/" } },
    ]);
    expect(md.startsWith("# Changelog\n")).toBe(true);
    expect(md.indexOf("## 0.34.0 — a Combobox")).toBeLessThan(md.indexOf("## 0.33.0 — a pager"));
    expect(md).toContain("2026-11-17");
    expect(md).toContain("[Docs](https://psi.kurkin.de/docs/)");
  });
});

describe("entryAnchor", () => {
  it("uses the version for a release and a slug of the title otherwise, so no two anchors collide", () => {
    expect(entryAnchor("0.34.0 — a Combobox")).toBe("0-34-0");
    expect(entryAnchor("Psi 0.5.0 — Field, Dialog, and slot contracts")).toBe("psi-0-5-0-field-dialog-and-slot-contracts");
    expect(entryAnchor("The system has a name: Psi (Ψ)")).toBe("the-system-has-a-name-psi");
    expect(entryAnchor("The system has a name: Psi (Ψ)")).not.toBe(entryAnchor("The design system gets a public home"));
  });
});
