import { Button, NavBar } from "@handamade/psi-react";

export default function NavBarBasic() {
  return (
    <NavBar
      fluid
      brand={<strong>Acme</strong>}
      navLabel="Main"
      actions={<Button variant="accent" size={32}>Sign up</Button>}
    >
      <a href="#">Product</a>
      <a href="#">Pricing</a>
      <a href="#">Docs</a>
    </NavBar>
  );
}
