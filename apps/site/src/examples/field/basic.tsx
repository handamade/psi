import { Field, Input } from "@handamade/psi-react";

export default function FieldBasic() {
  return (
    <Field label="Email" description="We only use it to send receipts.">
      <Input type="email" placeholder="you@example.com" />
    </Field>
  );
}
