import { useState } from "react";
import { Field, Input } from "@handamade/psi-react";

export default function FieldWithError() {
  const [value, setValue] = useState("not-an-email");
  const invalid = !value.includes("@");
  return (
    <Field label="Email" required error={invalid ? "Enter an address with an @." : undefined}>
      <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} />
    </Field>
  );
}
