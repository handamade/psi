import { AspectRatio, Button, Card, Skeleton, Stack, Text } from "@handamade/psi-react";

export default function CardBasic() {
  return (
    <div style={{ maxInlineSize: 320 }}>
      <Card
        media={
          <AspectRatio ratio={16 / 9}>
            <Skeleton variant="block" />
          </AspectRatio>
        }
      >
        <Stack gap={8}>
          <Text as="h3" size={16} weight="medium">
            Spring release
          </Text>
          <Text tone="secondary">New themes, a faster table and two fixes.</Text>
          <div>
            <Button variant="neutral" size={32}>
              Read notes
            </Button>
          </div>
        </Stack>
      </Card>
    </div>
  );
}
