/* No token family and no CSS Module, as CursorPagination has none: every
   visual is Button's, which binds its own tokens and draws the focus ring. */
import { Button } from "../Button/Button.js";
import type { ButtonProps } from "../Button/Button.js";
import { IconCopy } from "../icons/index.js";

export interface CopyButtonProps {
  /** The text written to the clipboard. */
  value: string;
  /** Visible text of the button. @default "Copy" */
  label?: string;
  /** Button height in px. @default 32 */
  size?: 24 | 32 | 40 | 48;
  /** Button variant. @default "ghost" */
  variant?: ButtonProps["variant"];
  /** Called with the outcome once the clipboard write settles. `"failed"` covers
   * a rejected write and an environment with no clipboard API. */
  onCopy?: (result: "copied" | "failed") => void;
  className?: string;
}

/** Not a live region: it renders no role and no `aria-live`, never changes its
 * label or icon after a copy, and announces nothing. The application speaks
 * the result — route `onCopy` through its announcer or a Toast (D86).
 *
 * Copies `value` to the clipboard when pressed. A `Button` with a leading
 * `IconCopy` and a visible label; the icon only reinforces the word. */
export function CopyButton({
  value,
  label = "Copy",
  size = 32,
  variant = "ghost",
  onCopy,
  className,
}: CopyButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
        if (!clip?.writeText) {
          onCopy?.("failed");
          return;
        }
        clip.writeText(value).then(
          () => onCopy?.("copied"),
          () => onCopy?.("failed"),
        );
      }}
    >
      <IconCopy size={16} aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}
