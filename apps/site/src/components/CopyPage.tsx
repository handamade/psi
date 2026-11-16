import { CopyButton } from "@handamade/psi-react";

import { announce } from "../lib/announce";

/** The twin is embedded at build, so the button has its value without a fetch. */
export function CopyPage({ markdown }: { markdown: string }) {
  return (
    <CopyButton
      value={markdown}
      label="Copy page"
      size={24}
      variant="neutral-subtle"
      onCopy={(result) => announce(result === "copied" ? "Page copied as markdown" : "Copy failed")}
    />
  );
}
