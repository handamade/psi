import { useState } from "react";
import { Field, Input } from "@handamade/psi-react";

export default function InputBasic() {
  const [name, setName] = useState("");
  return (
    <Field label="Project name">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My project" />
    </Field>
  );
}
