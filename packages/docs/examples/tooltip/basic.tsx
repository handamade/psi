import { IconButton, IconCopy, Tooltip } from "@handamade/psi-react";

export default function TooltipBasic() {
  return (
    <Tooltip content="Copy link">
      <IconButton aria-label="Copy link" variant="ghost">
        <IconCopy aria-hidden="true" />
      </IconButton>
    </Tooltip>
  );
}
