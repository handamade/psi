import { useState } from "react";
import { NavGroup, NavItem, NavTree } from "@handamade/psi-react";

export default function NavTreeBasic() {
  const [open, setOpen] = useState(true);
  return (
    <NavTree aria-label="Guides">
      <NavItem href="#" current>
        Introduction
      </NavItem>
      <NavGroup label="Components" open={open} onOpenChange={setOpen}>
        <NavItem href="#">Button</NavItem>
        <NavItem href="#">Field</NavItem>
      </NavGroup>
    </NavTree>
  );
}
