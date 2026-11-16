import { AspectRatio, Skeleton } from "@handamade/psi-react";

export default function AspectRatioBasic() {
  return (
    <div style={{ maxInlineSize: 320 }}>
      <AspectRatio ratio={16 / 9}>
        <Skeleton variant="block" />
      </AspectRatio>
    </div>
  );
}
