import { Count, NavItem, NavTree } from "@handamade/psi-react";

/** A neutral count, and an attention count with a label, at the end of navigation entries. */
export default function CountBasic() {
  return (
    <div style={{ inlineSize: "16rem" }}>
      <NavTree aria-label="Example">
        <NavItem href="#cards" count={<Count value={238} />}>
          Cards
        </NavItem>
        <NavItem href="#stuck" count={<Count value={4} tone="attention" label="4 stuck" />}>
          Stuck
        </NavItem>
        <NavItem href="#all" count={<Count value={1204} />}>
          All records
        </NavItem>
      </NavTree>
    </div>
  );
}
