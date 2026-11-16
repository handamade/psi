import { useState } from "react";
import { NavGroup, NavItem, NavTree } from "@handamade/psi-react";

import type { NavSection } from "../content/docs-nav";

export function DocsNav({ nav, currentPath }: { nav: NavSection[]; currentPath: string }) {
  // Every group starts open; NavGroup is controlled-only (D88).
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(nav.map((s) => [s.label, true])),
  );
  return (
    <NavTree aria-label="Docs">
      {nav.map((section) => (
        <NavGroup
          key={section.label}
          label={section.label}
          open={open[section.label] ?? true}
          onOpenChange={(next) => setOpen((o) => ({ ...o, [section.label]: next }))}
        >
          {section.links.map((link) => (
            <NavItem key={link.href} href={link.href} current={link.href === currentPath}>
              {link.label}
            </NavItem>
          ))}
        </NavGroup>
      ))}
    </NavTree>
  );
}
