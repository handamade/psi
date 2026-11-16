import { Field, FieldStack, Input, Select } from "@handamade/psi-react";

export default function FieldStackBasic() {
  return (
    <FieldStack labelPosition="start">
      <Field label="Name">
        <Input />
      </Field>
      <Field label="Email">
        <Input type="email" />
      </Field>
      <Field label="Role">
        <Select defaultValue="editor">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </Select>
      </Field>
    </FieldStack>
  );
}
