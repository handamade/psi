import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "@handamade/psi-react";

export default function TabsBasic() {
  const [value, setValue] = useState("overview");
  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabList aria-label="Account">
        <Tab value="overview">Overview</Tab>
        <Tab value="billing">Billing</Tab>
      </TabList>
      <TabPanel value="overview">Your plan, usage and members.</TabPanel>
      <TabPanel value="billing">Invoices and payment method.</TabPanel>
    </Tabs>
  );
}
