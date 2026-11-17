import { Skeleton, Stack } from "@handamade/psi-react";

export default function SkeletonBasic() {
  return (
    <Stack gap={12}>
      <Skeleton variant="text" lines={3} />
      <Skeleton variant="block" size={48} />
    </Stack>
  );
}
