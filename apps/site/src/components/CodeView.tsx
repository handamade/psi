import { CopyButton, Panel } from "@handamade/psi-react";

import { announce } from "../lib/announce";

export function CodeView({ html, code, label = "Copy code" }: { html: string; code: string; label?: string }) {
  return (
    <Panel padding={16} className="code-view">
      <span className="code-view-copy">
        <CopyButton
          value={code}
          label={label}
          size={24}
          variant="ghost"
          onCopy={(result) => announce(result === "copied" ? "Copied" : "Copy failed")}
        />
      </span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Panel>
  );
}
