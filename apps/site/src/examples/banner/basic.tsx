import { useState } from "react";
import { Banner, Button } from "@handamade/psi-react";

export default function BannerBasic() {
  const [visible, setVisible] = useState(true);
  if (!visible) return <Button onClick={() => setVisible(true)}>Show banner</Button>;
  return (
    <Banner
      variant="warning"
      title="Scheduled maintenance"
      action={<Button size={24}>Details</Button>}
      onDismiss={() => setVisible(false)}
    >
      Billing is read-only on Sunday from 02:00 to 03:00 UTC.
    </Banner>
  );
}
