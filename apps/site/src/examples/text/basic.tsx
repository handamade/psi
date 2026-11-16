import { Stack, Text } from "@handamade/psi-react";

export default function TextBasic() {
  return (
    <Stack gap={8}>
      <Text as="h2" size={18} weight="medium">
        Release notes
      </Text>
      <Text>Themes now resolve at build time.</Text>
      <Text size={12} tone="secondary">
        Updated 12 February
      </Text>
    </Stack>
  );
}
