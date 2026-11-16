import { useState } from "react";
import { AppShell, Button, NavBar, NavGroup, NavItem, NavTree, Text } from "@handamade/psi-react";

export default function AppShellBasic() {
  const [reports, setReports] = useState(true);
  return (
    <AppShell
      style={{ height: 320 }}
      mainId="example-main"
      sidebarId="example-sidebar"
      header={<NavBar fluid navLabel="Example" brand={<strong>Acme</strong>} actions={<Button size={32}>Invite</Button>} />}
      sidebar={
        <NavTree aria-label="Workspace">
          <NavItem href="#" current>
            Overview
          </NavItem>
          <NavGroup label="Reports" open={reports} onOpenChange={setReports}>
            <NavItem href="#">Weekly</NavItem>
            <NavItem href="#">Monthly</NavItem>
          </NavGroup>
        </NavTree>
      }
    >
      <Text as="h2" size={18} weight="medium">
        Overview
      </Text>
      <Text tone="secondary">The sidebar and the page scroll on their own.</Text>
    </AppShell>
  );
}
