import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "@handamade/psi-react";

import { examples } from "../examples/registry";
import { CodeView } from "./CodeView";

export function ExampleTabs({ slug, name, html }: { slug: string; name: string; html: string }) {
  const [value, setValue] = useState("preview");
  const entry = examples.find((e) => e.slug === slug && e.name === name);
  if (!entry) throw new Error(`No example ${slug}/${name}`);
  const { Component, source } = entry;
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList aria-label={`Example: ${name}`}>
        <Tab value="preview">Preview</Tab>
        <Tab value="code">Code</Tab>
      </TabList>
      <TabPanel value="preview">
        <div className="example-preview">
          <Component />
        </div>
      </TabPanel>
      <TabPanel value="code">
        <CodeView html={html} code={source} />
      </TabPanel>
    </Tabs>
  );
}
