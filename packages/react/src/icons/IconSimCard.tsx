import type { SVGAttributes } from "react";

interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
}

export function IconSimCard({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <rect x="8" y="11" width="8" height="7" rx="1" />
      <line x1="12" y1="11" x2="12" y2="18" />
    </svg>
  );
}
