import { Button, Stack, Text } from "@handamade/psi-react";

export default function StackBasic() {
  return (
    <Stack gap={12} align="start">
      <Text as="h3" size={16} weight="medium">
        Invite a teammate
      </Text>
      <Text tone="secondary">They get an email with a link.</Text>
      <Button variant="accent">Send invite</Button>
    </Stack>
  );
}
