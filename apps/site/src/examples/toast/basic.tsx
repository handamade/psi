import { Button, ToastProvider, useToast } from "@handamade/psi-react";

function SaveButton() {
  const toast = useToast();
  return (
    <Button variant="accent" onClick={() => toast.show({ variant: "success", message: "Changes saved." })}>
      Save changes
    </Button>
  );
}

export default function ToastBasic() {
  return (
    <ToastProvider aria-label="Example notifications">
      <SaveButton />
    </ToastProvider>
  );
}
