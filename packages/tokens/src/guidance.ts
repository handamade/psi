export const guidance = {
  variants: [
    { variant: "accent", intent: "Primary action, draws attention", typicalUse: "Submit, CTA, main action in a group" },
    { variant: "accent-subtle", intent: "Accent tone, lower visual weight", typicalUse: "Selected state, active filter, soft CTA" },
    { variant: "neutral", intent: "Default, structurally present", typicalUse: "Secondary actions, toolbar buttons" },
    { variant: "neutral-subtle", intent: "Minimal chrome", typicalUse: "Inline actions, table row actions" },
    { variant: "ghost", intent: "No visible container until hover", typicalUse: "Icon-only triggers, compact toolbars" },
    { variant: "danger", intent: "Destructive action", typicalUse: "Delete, remove, disconnect" },
    { variant: "danger-subtle", intent: "Destructive context, low urgency", typicalUse: "Warning badges, soft destructive hints" },
    { variant: "success | warning", intent: "Status communication (Tag only)", typicalUse: "Status badges, labels" },
  ],
  rules: [
    "One accent per visual group; everything else neutral or ghost.",
    "danger only for actions with real consequences.",
    "Sizes are px numbers (24|32|40|48), never S/M/L.",
    "Typography tokens are --ds-text-{size}-{lineHeight}-{weight}.",
    "Override component tokens (--ds-{component}-*), not semantic tokens, for one-off theming.",
  ],
  states: { hover: "L - 0.04", active: "L - 0.08", disabled: "element opacity 0.4 (keeps hue)", focus: "2px ring var(--ds-{component}-focus-ring)" },
  typographyDefaults: { body: "16-24-regular", compactUI: "14-20-regular", heading: "24-32-medium", caption: "12-16-regular" },
  fonts: {
    roles: ["sans", "serif", "mono", "display"],
    note: "Font roles are brand-level (D29). The DS ships no font files: consumers load each brand's webfonts themselves.",
    brands: { ember: { archivo: "800,900 (display/sans)", ibmPlexSerif: "400 (serif)", ibmPlexMono: "400,500 (mono)" } },
  },
  motion: {
    durations: [150, 200, 350, 450, 600],
    easings: { standard: "ease", "in-out": "ease-in-out", soft: "cubic-bezier(0.2, 0.6, 0.2, 1)" },
    reducedMotion: "All --ds-duration-* zero under prefers-reduced-motion (D30). Always drive transitions/animations with duration tokens; never hardcode times.",
    recipes: {
      pulseDown: "App-level keyframe (the DS ships none): @keyframes pulse-down { 0%,100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(6px); opacity: 1; } } — drive with var(--ds-ease-in-out).",
    },
  },
} as const;
