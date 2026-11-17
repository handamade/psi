import { useState } from "react";
import { Tag } from "@handamade/psi-react";

export default function TagBasic() {
  const [showDraft, setShowDraft] = useState(true);
  return (
    <div className="psi-gap-8" style={{ display: "flex", flexWrap: "wrap" }}>
      <Tag variant="success">Active</Tag>
      <Tag variant="warning" subtle>
        Pending
      </Tag>
      {showDraft && (
        <Tag onDismiss={() => setShowDraft(false)}>Draft</Tag>
      )}
    </div>
  );
}
