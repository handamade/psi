import { describe, expect, it } from "vitest";

import { a11yMeta } from "../src/a11y-meta.js";

describe("accessibleName rules (D129)", () => {
  it("exist exactly where the notes say a component requires an accessible name", () => {
    for (const [name, entry] of Object.entries(a11yMeta)) {
      const says = /requires an accessible name/i.test(entry.notes ?? "");
      expect(entry.accessibleName !== undefined, name).toBe(says);
    }
  });

  it("name only attributes, each a non-empty list", () => {
    for (const [name, entry] of Object.entries(a11yMeta)) {
      if (!entry.accessibleName) continue;
      expect(entry.accessibleName.oneOf.length, name).toBeGreaterThan(0);
      for (const a of entry.accessibleName.oneOf) expect(a, name).toMatch(/^aria-label(ledby)?$/);
    }
  });
});
