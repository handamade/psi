import { CopyButton, useToast, ToastProvider } from "@handamade/psi-react";

function Copy() {
  const toast = useToast();
  return (
    <CopyButton
      value="npm install @handamade/psi-react"
      label="Copy install command"
      onCopy={(result) =>
        toast.show(
          result === "copied"
            ? { variant: "success", message: "Copied to the clipboard." }
            : { variant: "danger", message: "Could not copy." },
        )
      }
    />
  );
}

export default function CopyButtonBasic() {
  return (
    <ToastProvider>
      <Copy />
    </ToastProvider>
  );
}
