import { Button, Input, Select, Toolbar } from "@handamade/psi-react";

export default function ToolbarBasic() {
  return (
    <Toolbar>
      <Input type="search" aria-label="Search projects" placeholder="Search" />
      <Select aria-label="Status" defaultValue="all">
        <option value="all">All</option>
        <option value="active">Active</option>
      </Select>
      <Button variant="neutral">Filter</Button>
    </Toolbar>
  );
}
