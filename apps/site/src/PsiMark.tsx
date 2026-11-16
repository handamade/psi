/** The Ψ mark. Inline rather than a public/ asset: no extra request, and
 * `currentColor` makes it follow whatever theme the hero just derived. */
export function PsiMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2v20" />
      <path d="M6 6v5a6 6 0 0 0 12 0V6" />
    </svg>
  );
}
