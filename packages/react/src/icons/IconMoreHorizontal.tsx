import type { SVGAttributes } from "react";

interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
}

/** Ellipsis / "more" glyph (D70) — the trigger `row-actions` has always
 * specified and the icon set never had. Filled dots rather than stroked
 * circles: at 20px a stroked 1px-radius circle renders as a smudge. */
export function IconMoreHorizontal({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
