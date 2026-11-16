import { Button } from "@handamade/psi-react";

export default function ButtonVariants() {
  return (
    <div className="psi-gap-8" style={{ display: "flex", flexWrap: "wrap" }}>
      <Button variant="accent">Save</Button>
      <Button variant="neutral">Cancel</Button>
      <Button variant="ghost">More</Button>
      <Button variant="danger">Delete</Button>
    </div>
  );
}
