import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
} from "../icons/index.js";

/** The status axis every feedback component shares: Toast (D64), and Banner
 * and InlineAlert (D86). `neutral` carries no status. */
export type StatusVariant = "neutral" | "success" | "warning" | "danger";

/** The variant's icon, always rendered `aria-hidden`: the meaning is carried
 * by the status word, never by colour and shape alone. */
export const statusIcons: Record<StatusVariant, typeof IconInfo> = {
  neutral: IconInfo,
  success: IconCheck,
  warning: IconAlertTriangle,
  danger: IconAlertCircle,
};

/** Visually hidden status word, so the variant's meaning never rests on
 * colour and shape alone. `neutral` carries no status, so it gets no prefix.
 * A component's `statusLabel` (D83) replaces it (string) or drops it (null). */
export const statusPrefix: Record<StatusVariant, string | null> = {
  neutral: null,
  success: "Success:",
  warning: "Warning:",
  danger: "Error:",
};

/** The word a component renders: the default for the variant unless the
 * consumer set `statusLabel`. */
export function resolveStatusPrefix(variant: StatusVariant, statusLabel: string | null | undefined): string | null {
  return statusLabel === undefined ? statusPrefix[variant] : statusLabel;
}
