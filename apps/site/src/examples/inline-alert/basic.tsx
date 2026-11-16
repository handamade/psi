import { InlineAlert } from "@handamade/psi-react";

export default function InlineAlertBasic() {
  return (
    <InlineAlert variant="warning" title="Unsaved changes">
      Leave this page and your edits are lost.
    </InlineAlert>
  );
}
