import { useState } from "react";
import { Field, Textarea } from "@handamade/psi-react";

export default function TextareaBasic() {
  const [note, setNote] = useState("");
  return (
    <Field label="Note" description="Visible to your team.">
      <Textarea rows={4} maxLength={200} showCounter value={note} onChange={(e) => setNote(e.target.value)} />
    </Field>
  );
}
