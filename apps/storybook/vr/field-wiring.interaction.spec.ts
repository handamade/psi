import { test, expect } from "@playwright/test";

/** D135 — a Checkbox or Switch in a Field that is not a group. Chromium names it by the Field's label and its own
 * (two <label>s, in DOM order), describes it by the Field's message, and exposes it invalid. Read from the browser's
 * own accessibility tree over CDP, not from Playwright's name computation: the two-label name is the browser's to
 * compute. Before D135 the box measured name "Email me weekly", no description and invalid false. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

const cases = [
  ["components-checkbox--in-a-field", "checkbox"],
  ["components-switch--in-a-field", "switch"],
] as const;

for (const [id, role] of cases) {
  test(`${id}: named by both labels, described and invalid in Chromium's tree @interaction`, async ({ page }) => {
    await page.goto(story(id), { waitUntil: "networkidle" });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const controls = nodes.filter((n) => n.role?.value === role && !n.ignored);
    expect(controls.length).toBeGreaterThan(0);
    const first = controls[0]!;
    expect(first.name?.value).toBe("Notifications Email me weekly");
    expect(first.description?.value).toBe("Choose how we reach you.");
    expect(first.properties?.find((p) => p.name === "invalid")?.value.value).toBe("true");
  });
}

test("a box in a Field without a label keeps its own name and takes the message @interaction", async ({ page }) => {
  await page.goto(story("components-checkbox--in-a-field"), { waitUntil: "networkidle" });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const box = nodes.find((n) => n.role?.value === "checkbox" && n.name?.value === "I accept the terms");
  expect(box?.description?.value).toBe("You must accept the terms.");
});
