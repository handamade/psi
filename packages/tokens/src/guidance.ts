export const guidance = {
  variants: [
    { variant: "accent", intent: "Primary action, draws attention", typicalUse: "Submit, CTA, main action in a group" },
    { variant: "accent-subtle", intent: "Accent tone, lower visual weight", typicalUse: "Selected state, active filter, soft CTA" },
    { variant: "neutral", intent: "Default, structurally present", typicalUse: "Secondary actions, toolbar buttons" },
    { variant: "neutral-subtle", intent: "Minimal chrome", typicalUse: "Inline actions, table row actions" },
    { variant: "ghost", intent: "No visible container until hover", typicalUse: "Icon-only triggers, compact toolbars" },
    { variant: "outline", intent: "Bordered ghost — visible structure, no fill until hover", typicalUse: "Marketing CTA, download button; hover fills accent" },
    { variant: "danger", intent: "Destructive action", typicalUse: "Delete, remove, disconnect" },
    { variant: "danger-subtle", intent: "Destructive context, low urgency", typicalUse: "Warning badges, soft destructive hints" },
    { variant: "success | warning", intent: "Status communication (Tag only)", typicalUse: "Status badges, labels" },
  ],
  rules: [
    "One accent per visual group; everything else neutral or ghost.",
    "danger only for actions with real consequences.",
    "Sizes are px numbers (24|32|40|48), never S/M/L.",
    "Typography tokens are --psi-text-{size}-{lineHeight}-{weight}.",
    "Override component tokens (--psi-{component}-*), not semantic tokens, for one-off theming.",
    "--psi-button-font overrides button typography across all sizes (documented D34 override; ember → mono).",
    "Wrap labeled form controls in Field — label association, description/error line, aria-describedby and aria-invalid come wired; don't hand-roll label+message rows.",
    "Use Dialog for blocking modal flows — title/footer slots, dismissible gate; danger stays on the footer Buttons, one accent per group.",
  ],
  states: { hover: "L - 0.04", active: "L - 0.08", disabled: "element opacity 0.4 (keeps hue)", focus: "2px ring var(--psi-{component}-focus-ring)" },
  typographyDefaults: { body: "16-24-regular", compactUI: "14-20-regular", heading: "24-32-medium", caption: "12-16-regular" },
  fonts: {
    roles: ["sans", "serif", "mono", "display"],
    note: "Font roles are brand-level (D29). The DS ships no font files: consumers load each brand's webfonts themselves.",
    brands: { ember: { archivo: "800,900 (display/sans)", ibmPlexSerif: "400 (serif)", ibmPlexMono: "400,500 (mono)" } },
    scope: "Brand font stacks fully apply when data-psi-theme is on the root <html> element (the standard consumer setup). In nested subtree theming, --psi-text-*/--psi-display-* combos keep the default stacks: custom properties substitute at :root.",
  },
  motion: {
    durations: [150, 200, 350, 450, 600],
    easings: { standard: "ease", "in-out": "ease-in-out", soft: "cubic-bezier(0.2, 0.6, 0.2, 1)" },
    reducedMotion: "All --psi-duration-* zero under prefers-reduced-motion (D30). Always drive transitions/animations with duration tokens; never hardcode times.",
    recipes: {
      pulseDown: "App-level keyframe (the DS ships none): @keyframes pulse-down { 0%,100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(6px); opacity: 1; } } — drive with var(--psi-ease-in-out).",
    },
  },
  layout: {
    breakpoints: { sm: 560, md: 960 },
    note: "Breakpoints are build-time constants (D31): import { breakpoints } from '@handamade/psi-tokens/types'. CSS vars cannot drive @media.",
    container: "Use .psi-container — max-width 1312px, gutter 40px stepping to 24px under md.",
    zIndex: { nav: 100, overlay: 1000, tooltip: 1100 },
  },
  recipes: {
    mediaTint: "Apply .psi-media-tint to media elements; the brand defines --psi-media-tint (D35). Hover/focus reveals true color over --psi-duration-450 --psi-ease-soft.",
    sectionHeader: "SectionHeader ships as a recipe, not a component (v1.2 non-goal): baseline-aligned flex row — mono annotation (--psi-text-mono-14-20-regular, --psi-fg-accent) + h2 (.psi-display-32-32-extrabold) + optional trailing meta, border-bottom 1px var(--psi-border-faint), padding-bottom var(--psi-space-20).",
  },
  tags: {
    accentRule:
      "Tags are passive labels and do not count against 'one accent per visual group' — that rule governs interactive emphasis (buttons/CTAs). D40.",
    badges: {
      highlight: "accent-subtle",
      meta: "neutral-subtle",
      status: "success | warning | danger",
    },
  },
} as const;
