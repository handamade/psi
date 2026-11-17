import { useState } from "react";
import { Field, Radio, RadioGroup } from "@handamade/psi-react";

export default function RadioGroupBasic() {
  const [plan, setPlan] = useState("team");
  return (
    <Field label="Plan" group>
      <RadioGroup name="plan" value={plan} onValueChange={setPlan}>
        <Radio value="solo">Solo</Radio>
        <Radio value="team">Team</Radio>
        <Radio value="org">Organisation</Radio>
      </RadioGroup>
    </Field>
  );
}
