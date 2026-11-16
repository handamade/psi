/* global URL, document */
// D115 engine spike. Opens fixture.html in Chromium, WebKit and Firefox and
// checks the five things the plan's CSS depends on. Run from the repo root:
//   node docs/superpowers/plans/assets/d115-spike/spike.mjs [fixture-file]   (default fixture.html)
// Needs `pnpm exec playwright install webkit firefox` once.
import { chromium, webkit, firefox } from "@playwright/test";

const url = new URL(`./${process.argv[2] ?? "fixture.html"}`, import.meta.url).href;
const WIDE = ["name", "group", "status", "long", "combo", "s24", "s40", "s48", "ta"];
const ONE_LINE = ["name", "group", "combo", "s24", "s40", "s48"];

function judge(m) {
  const checks = {};
  const labelLefts = WIDE.map((k) => m[k].label.l);
  const controlLefts = WIDE.map((k) => m[k].control.l);
  checks["labels share one column (incl. the legend)"] = new Set(labelLefts).size === 1;
  checks["controls share one column (incl. the fieldset)"] = new Set(controlLefts).size === 1;
  checks["the label column is capped at 240px"] = m.long.label.w <= 240;
  checks["one-line controls: label centre within 4px of control centre"] = ONE_LINE.every(
    (k) => Math.abs(m[k].label.cy - m[k].control.cy) <= 4,
  );
  checks["legend on the first option's line (within 2px)"] = Math.abs(m.status.label.cy - m.status.control.cy) <= 2;
  checks["textarea: label top within 8px of the textarea's top"] = Math.abs(m.ta.label.t - m.ta.control.t) <= 8;
  checks["narrow: label above control"] = m.nname.label.b <= m.nname.control.t;
  checks["narrow: legend above its options"] = m.nstatus.label.b <= m.nstatus.control.t;
  return checks;
}

let measured = 0;
for (const [name, type] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
  let browser;
  try {
    browser = await type.launch({ timeout: 30000 });
  } catch (e) {
    console.log(`\n== ${name}: launch failed, not measured (${String(e.message).split("\n")[0]})`);
    continue;
  }
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(url);
  const m = await page.evaluate(() => {
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { l: Math.round(b.left), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), cy: Math.round((b.top + b.bottom) / 2) };
    };
    const out = {};
    for (const f of document.querySelectorAll("[data-k]")) {
      const label = f.querySelector(".label");
      const control = f.querySelector(".radios label, input:not([type=radio]), select, textarea, .combo");
      out[f.dataset.k] = { label: box(label), control: box(control) };
    }
    return out;
  });
  console.log(`\n== ${name} (${browser.version()})`);
  for (const [check, ok] of Object.entries(judge(m))) console.log(`${ok ? "PASS" : "FAIL"}  ${check}`);
  console.log(JSON.stringify(m));
  measured++;
  await browser.close();
}
if (measured === 0) {
  console.log("\nNo engine was measured.");
  process.exitCode = 1;
}
