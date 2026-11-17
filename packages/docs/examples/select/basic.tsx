import { useState } from "react";
import { Field, Select } from "@handamade/psi-react";

export default function SelectBasic() {
  const [region, setRegion] = useState("eu");
  return (
    <Field label="Region">
      <Select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="eu">Europe</option>
        <option value="us">United States</option>
        <option value="ap">Asia Pacific</option>
      </Select>
    </Field>
  );
}
