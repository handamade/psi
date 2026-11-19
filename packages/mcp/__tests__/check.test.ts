import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import { CheckInputError, MAX_CODE, checkMarkdown } from "../src/check/index.js";
import { literalUnion } from "../src/check/rules.js";
import type { PsiIndex } from "../src/types.js";
import { loadTestIndex } from "./test-index.js";

let index: PsiIndex;
beforeAll(async () => {
  index = await loadTestIndex();
});

const IMPORT = 'import { Button, IconButton, IconPlus } from "@handamade/psi-react";\n';
const run = (code: string) => checkMarkdown(code, index);
const lines = (md: string, rule: string) => md.split("\n").filter((l) => l.includes(`**${rule}**`));

describe("literalUnion", () => {
  it("reads string and number unions, and refuses anything else", () => {
    expect(literalUnion('"accent" | "ghost"')).toEqual(["accent", "ghost"]);
    expect(literalUnion("24 | 32 | 40 | 48")).toEqual([24, 32, 40, 48]);
    expect(literalUnion("boolean")).toBeNull();
    expect(literalUnion('"a" | string')).toBeNull();
  });
});

describe("check: the API rules", () => {
  it("passes correct code, including pass-through, aria-*, data-*, key and ref", () => {
    const md = run(
      IMPORT +
        'export const A = () => <Button variant="accent" size={32} onClick={() => {}} aria-describedby="h" data-test="x" key="k">Save</Button>;',
    );
    expect(md).toContain("No problems found.");
    expect(md).toContain("1 Psi element: Button.");
  });

  it("flags an import Psi does not export, with the nearest name", () => {
    const md = run('import { Buton } from "@handamade/psi-react";\n');
    expect(lines(md, "unknown-export")[0]).toMatch(/`1:10`.*`Buton`.*did you mean `Button`\?/);
  });

  it("flags an unknown prop, with the nearest name", () => {
    const md = run(IMPORT + '<Button varient="accent">Save</Button>');
    expect(lines(md, "unknown-prop")[0]).toMatch(/`varient`.*did you mean `variant`\?/);
  });

  it("flags a value outside the prop's union, and lists the valid ones", () => {
    const md = run(IMPORT + '<Button size="md" variant="primary">Save</Button>');
    const found = lines(md, "invalid-value");
    expect(found).toHaveLength(2);
    expect(found.join("\n")).toContain("24 | 32 | 40 | 48");
    expect(found.join("\n")).toContain('"accent"');
  });

  it("treats a number written as a string as wrong", () => {
    expect(lines(run(IMPORT + '<Button size="32">Save</Button>'), "invalid-value")[0]).toContain('"32"');
  });

  it("flags a missing required prop", () => {
    const md = run(IMPORT + "<IconButton><IconPlus /></IconButton>");
    expect(lines(md, "missing-required")[0]).toContain("`aria-label`");
  });

  it("follows an aliased import", () => {
    const md = run('import { Button as B } from "@handamade/psi-react";\n<B size="md">x</B>');
    expect(lines(md, "invalid-value")[0]).toContain("`Button`");
  });

  it("checks Psi names with no import, and leaves other components alone", () => {
    const md = run('<Button size="md">x</Button>\n<ProductCard tone="loud" />');
    expect(lines(md, "invalid-value")).toHaveLength(1);
    expect(md).toContain("Not checked: ProductCard (not a Psi export).");
  });

  it("with a Psi import, leaves a component imported from elsewhere alone", () => {
    const md = run(IMPORT + 'import { Card } from "./my-card";\n<Card tone="loud" />');
    expect(md).toContain("Not checked: Card (not imported from @handamade/psi-react).");
    expect(md).toContain("No problems found.");
  });

  it("with no Psi import, leaves a component imported from elsewhere alone", () => {
    const md = run('import { Card } from "./my-card";\n<Card tone="loud" />');
    expect(md).toContain("No problems found.");
    expect(md).toContain("Not checked: Card (imported from elsewhere).");
  });

  it("does not judge spreads or computed values, and says so", () => {
    // Semicolons: without them, "</Button>" + newline + "<IconButton" reads as a less-than.
    const md = run(IMPORT + "<Button {...rest} size={size}>x</Button>;\n<IconButton {...p}><IconPlus /></IconButton>;");
    expect(md).toContain("No problems found.");
    expect(md).toContain("a spread on `Button` at 2:1");
    expect(md).toContain("a computed `size` on `Button` at 2:19");
  });

  it("reports a parse error as a finding, not an exception", () => {
    const md = run('<Button size="md"');
    expect(lines(md, "parse")).toHaveLength(1);
    expect(lines(md, "parse")[0]).toMatch(/^- `1:\d+`/);
  });

  it("reads sibling elements with no wrapper, at their own positions", () => {
    const code = '<Button>A</Button><Button size="md">B</Button>';
    const md = run(code);
    expect(lines(md, "invalid-value")[0]).toContain(`\`1:${code.indexOf('size="md"') + 1}\``);
  });

  it("does not let a fragment retry hide a syntax error", () => {
    const md = run("<Button>x</Button>\nlet y = ;");
    expect(lines(md, "parse")).toHaveLength(1);
    expect(md).not.toContain("No problems found.");
  });

  it("labels a Psi export with no manifest entry in no-import mode", () => {
    const md = run("<ToastContext />");
    expect(md).toContain("a Psi export with no manifest entry");
    expect(md).not.toContain("not a Psi export");
  });

  it("checks an icon's props like a component's (D145)", () => {
    const md = run('<IconSearch size={16} strokeWidth={1.5} className="a" style={{}} aria-label="x" data-x="1" foo="y" />');
    expect(md).toContain("1 Psi element: IconSearch.");
    expect(md).not.toContain("no manifest entry");
    expect(lines(md, "unknown-prop")).toHaveLength(1);
    expect(md).toContain("`IconSearch` has no prop `foo`.");
  });

  it("checks an imported icon", () => {
    const md = run(`import { IconTrash } from "@handamade/psi-react";\nexport const A = () => <IconTrash sise={16} />;`);
    expect(md).toContain("`IconTrash` has no prop `sise`; did you mean `size`?");
  });

  it("hints the component's own prop before a DOM attribute (D145)", () => {
    const md = run('<Combobox aria-label="Owner" options={[]} onValueChange={f} />');
    expect(md).toContain("did you mean `onChange`?");
    expect(md).not.toContain("onVolumeChange");
    expect(md).not.toContain("onInputChange");
    expect(md).toContain("`SegmentedControl`");
  });

  it("still hints a plain typo of a DOM attribute, and no far one", () => {
    expect(run("<Button onClik={f}>Go</Button>")).toContain("did you mean `onClick`?");
    expect(run("<Button foo>Go</Button>")).toContain("`Button` has no prop `foo`.");
  });

  it("does not check a component defined in the same file as Psi's", () => {
    const md = run(IMPORT + "function Card() { return null; }\nconst Panel = () => null;\nexport const A = () => <><Card foo /><Panel bar /></>;");
    expect(lines(md, "unknown-prop")).toHaveLength(0);
    expect(md).toContain("defined in this file");
  });

  it("does not list computed values on props that are not literal unions", () => {
    const md = run(IMPORT + "<Button onClick={go} className={cx} size={n}>x</Button>");
    expect(md).toContain("computed `size`");
    expect(md).not.toContain("computed `onClick`");
    expect(md).not.toContain("computed `className`");
  });

  it("refuses code over the cap", () => {
    expect(() => run("x".repeat(MAX_CODE + 1))).toThrow(CheckInputError);
  });
});

describe("check: slots (D45 contracts)", () => {
  const PSI =
    'import { Banner, Button, DescriptionItem, DescriptionList, Link, Menu, Tab, TabList, TabPanel, Tabs } from "@handamade/psi-react";\n';

  it("accepts text in a slot with an accepts list, as the D45 validator does", () => {
    const md = run(PSI + '<Banner action="Undo">Saved.</Banner>');
    expect(lines(md, "slot")).toHaveLength(0);
    expect(lines(run(PSI + "<DescriptionList>text</DescriptionList>"), "slot")).toHaveLength(0);
  });

  it("flags a child the slot does not accept", () => {
    const md = run(PSI + "<DescriptionList><p>x</p></DescriptionList>");
    expect(lines(md, "slot")[0]).toMatch(/`DescriptionList`'s children take DescriptionItem; got <p>\./);
  });

  it("flags too few children", () => {
    const md = run(PSI + "<DescriptionList></DescriptionList>");
    expect(lines(md, "slot")[0]).toContain("`DescriptionList`'s children need at least 1 child.");
  });

  it("checks a slot passed as a prop", () => {
    const bad = run(PSI + '<Banner action={<Link href="/">Undo</Link>}>Saved.</Banner>');
    expect(lines(bad, "slot")[0]).toMatch(/`Banner`'s `action` takes .*Button.*; got <Link>\./);
    const good = run(PSI + "<Banner action={<Button>Undo</Button>}>Saved.</Banner>");
    expect(lines(good, "slot")).toHaveLength(0);
  });

  it("accepts a member of a named contract", () => {
    // Banner's action accepts the inline-content contract, which includes Tag.
    const md = run('import { Banner, Tag } from "@handamade/psi-react";\n<Banner action={<Tag>New</Tag>}>Saved.</Banner>');
    expect(lines(md, "slot")).toHaveLength(0);
  });

  it("does not treat a component imported from elsewhere as Psi's", () => {
    const md = run(PSI + 'import { Link as RouterLink } from "react-router";\n<Banner action={<RouterLink to="/">Undo</RouterLink>}>Saved.</Banner>');
    expect(lines(md, "slot")).toHaveLength(1);
  });

  it("reports a missing required body once, from missing-required", () => {
    const md = run(PSI + "<Menu open onClose={close} trigger={<Button>Open</Button>}></Menu>");
    expect(lines(md, "missing-required")).toHaveLength(1);
    expect(lines(md, "missing-required")[0]).toContain("`Menu` needs `children`.");
    expect(lines(md, "slot")).toHaveLength(0);
  });

  it("looks through fragments, and skips computed children", () => {
    expect(lines(run(PSI + "<DescriptionList><><p>x</p></></DescriptionList>"), "slot")).toHaveLength(1);
    const md = run(PSI + "<DescriptionList>{items.map((i) => <DescriptionItem key={i} term={i}>x</DescriptionItem>)}</DescriptionList>");
    expect(lines(md, "slot")).toHaveLength(0);
    expect(md).toContain("computed children of `DescriptionList`");
  });

  it("passes a correct Tabs tree", () => {
    const md = run(
      PSI +
        '<Tabs value="a" onValueChange={() => {}}><TabList aria-label="Sections"><Tab value="a">A</Tab></TabList><TabPanel value="a">x</TabPanel></Tabs>',
    );
    expect(lines(md, "slot")).toHaveLength(0);
    expect(lines(md, "accessible-name")).toHaveLength(0);
    expect(md).toContain("No problems found.");
  });
});

describe("check: accessible names", () => {
  it("flags a TabList with no name", () => {
    const md = run('import { TabList, Tab } from "@handamade/psi-react";\n<TabList><Tab value="a">A</Tab></TabList>');
    expect(lines(md, "accessible-name")[0]).toContain("`TabList` needs an accessible name: pass `aria-label`.");
  });

  it("does not repeat what missing-required already says", () => {
    // IconButton's aria-label is a required prop, so missing-required reports it.
    const md = run(IMPORT + "<IconButton><IconPlus /></IconButton>");
    expect(lines(md, "missing-required")).toHaveLength(1);
    expect(lines(md, "accessible-name")).toHaveLength(0);
  });

  it("skips an element with a spread", () => {
    expect(lines(run('import { TabList } from "@handamade/psi-react";\n<TabList {...p} />'), "accessible-name")).toHaveLength(0);
  });
});

describe("check: every docs example is clean", () => {
  const dir = fileURLToPath(new URL("../../docs/examples/", import.meta.url));
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .sort();

  it("finds the examples", () => {
    expect(files.length).toBeGreaterThanOrEqual(40);
  });

  it.each(files)("%s has no API findings", (file) => {
    const md = run(readFileSync(dir + file, "utf8"));
    for (const rule of ["parse", "slot", "unknown-prop", "invalid-value", "unknown-export", "accessible-name"]) {
      expect(lines(md, rule), `${file}: ${rule}`).toEqual([]);
    }
  });
});
