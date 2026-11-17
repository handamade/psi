import { Button, Panel, Stack, Text } from "@handamade/psi-react";

export default function PanelBasic() {
  return (
    <Panel padding={24}>
      <Stack gap={12}>
        <Text as="h3" size={16} weight="medium">
          Billing
        </Text>
        <Text tone="secondary">Next invoice on 1 March.</Text>
        <div>
          <Button size={32}>Manage plan</Button>
        </div>
      </Stack>
    </Panel>
  );
}
