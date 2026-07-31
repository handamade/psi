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
    tagApi:
      'On Tag, subtle is a boolean prop, not part of the variant union: accent-subtle is spelled variant="accent" subtle (Tag variants: neutral | accent | success | warning | danger).',
  },
  geometry: {
    sizes: [24, 32, 40, 48],
    label: {
      paddingInline: [8, 12, 16, 20],
      paddingInlineIcon: [6, 8, 12, 16],
      gap: [4, 8, 8, 8],
      font: ["12-16-medium", "14-20-medium", "16-24-medium", "18-28-medium"],
    },
    value: {
      paddingInline: [8, 8, 12, 16],
      font: ["12-16-regular", "14-20-regular", "16-24-regular", "18-28-regular"],
    },
    components: {
      Button: "label",
      IconButton: "height-only",
      Input: "value",
      Select: "value",
    },
    note:
      "Per-size geometry is data, not CSS literals (D54). Arrays are indexed by sizes[]. Read a value as --psi-control-{size}-{prop} for the label ramp and --psi-control-value-{size}-{prop} for the value ramp; components alias these as --psi-{component}-{size}-{prop}, which is the layer to override. The value ramp is one step tighter than the label ramp because a left-aligned value wants less air than a centred label (D55).",
    iconInset:
      "A leading icon sits one step closer to the edge than text — an icon is a solid shape with no side bearing (D55). Applied by .size{n}:has(> svg:first-child) on Button. IconButton is height-only: it is square with padding 0, so no padding/gap/font token applies to it.",
    iconInsetLimits:
      "The selector matches on element order, and :first-child ignores text nodes. Two consequences. (1) An icon wrapped in a <span> never matches — fails safe, no inset; set --psi-button-{size}-padding-inline-icon yourself. (2) A TRAILING icon (<Button>Next<IconChevronRight /></Button>) makes the svg the first ELEMENT child, so the rule fires and narrows the start (text) side while the icon keeps full padding — the inverse of the intent. CSS cannot tell the two apart without a DOM signal. Put the icon first, or override --psi-button-{size}-padding-inline-icon to match --psi-button-{size}-padding-inline to disable the inset.",
  },
} as const;
