import { IconButton, IconEdit, IconTrash } from "@handamade/psi-react";

export default function IconButtonBasic() {
  return (
    <div className="psi-gap-8" style={{ display: "flex" }}>
      <IconButton aria-label="Edit" variant="ghost">
        <IconEdit aria-hidden="true" />
      </IconButton>
      <IconButton aria-label="Delete" variant="danger">
        <IconTrash aria-hidden="true" />
      </IconButton>
    </div>
  );
}
