import { useState } from "react";
import { Button, Dialog } from "@handamade/psi-react";

export default function DialogConfirm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete project
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this project?"
        dismissible={false}
        closeOnEscape
        footer={
          <>
            <Button variant="neutral" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        This removes the project and its history. It cannot be undone.
      </Dialog>
    </>
  );
}
