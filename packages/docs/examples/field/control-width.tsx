import { Field, FieldStack, Input, Select } from "@handamade/psi-react";

export default function FieldControlWidth() {
  return (
    <FieldStack labelPosition="start">
      <Field label="Display name" controlWidth={320}>
        <Input defaultValue="Ada Lovelace" />
      </Field>
      <Field label="ICCID" controlWidth={240} description="19 or 20 digits.">
        <Input defaultValue="89490200001234567890" />
      </Field>
      <Field label="Rows per page" controlWidth={80}>
        <Select defaultValue="50">
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </Select>
      </Field>
    </FieldStack>
  );
}
