import { useState } from "react";
import { Switch } from "@handamade/psi-react";

export default function SwitchBasic() {
  const [on, setOn] = useState(true);
  return (
    <Switch checked={on} onChange={(e) => setOn(e.target.checked)}>
      Weekly digest
    </Switch>
  );
}
