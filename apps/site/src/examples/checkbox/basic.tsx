import { useState } from "react";
import { Checkbox, Field } from "@handamade/psi-react";

export default function CheckboxBasic() {
  const [checked, setChecked] = useState(true);
  return (
    <Field label="Notifications" group>
      <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
        Email me about new releases
      </Checkbox>
    </Field>
  );
}
