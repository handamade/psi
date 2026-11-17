import { useState } from "react";
import { Button, IconChevronDown, Menu, MenuItem, MenuSeparator, MenuText } from "@handamade/psi-react";

export default function MenuBasic() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Menu
      open={open}
      onClose={close}
      aria-label="Project actions"
      trigger={
        <Button variant="neutral" aria-expanded={open} onClick={() => setOpen(!open)}>
          Actions
          <IconChevronDown aria-hidden="true" />
        </Button>
      }
    >
      <MenuItem onSelect={close}>Rename</MenuItem>
      <MenuItem onSelect={close}>Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem variant="danger" onSelect={close}>
        Delete
      </MenuItem>
      <MenuSeparator />
      <MenuText>Last edited today</MenuText>
    </Menu>
  );
}
