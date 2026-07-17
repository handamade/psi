import { token, set, delta, cap, slot, ref } from "../dsl/builders.js";
import type { ThemeDef } from "../dsl/types.js";

export const lightTheme: ThemeDef = {
  bgPrimary: token({ from: slot.canvas }),
  bgSecondary: token({ from: slot.canvas, l: delta(+0.03) }),

  fgPrimary: token({ from: slot.ink, l: set(0.3), c: set(0.03) }),
  fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
  fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
  fgQuaternary: token({ from: ref.fgPrimary, alpha: 0.3 }),
  fgPrimaryInverted: token({ from: slot.canvas }),
  fgStaticWhite: token({ from: slot.canvas, l: set(1.0), c: set(0) }),
  fgStaticBlack: token({ from: slot.ink, l: set(0.25), c: cap(0.03) }),

  /** Label ink on fillAccent (D37). Brands whose accent can't carry white
   * (e.g. ember #ff7847, white = 2.62:1) override this instead of mangling
   * their anchor. */
  fgOnAccent: token({ from: ref.fgStaticWhite }),

  fgAccent: token({ from: slot.accent, l: set(0.48), c: cap(0.23) }),
  // D39: status-fg caps lowered to each hue's in-gamut max at l 0.48 — the
  // values these tokens were already clamping to, so rendered hex is unchanged.
  fgSuccess: token({ from: slot.success, l: set(0.48), c: cap(0.1187) }),
  fgWarning: token({ from: slot.warning, l: set(0.48), c: cap(0.1013) }),
  fgDanger: token({ from: slot.danger, l: set(0.48), c: cap(0.1946) }),

  fillNeutral1: token({ from: slot.canvas, l: delta(+0.016), c: delta(-0.001) }),
  fillNeutral2: token({ from: slot.canvas }),
  fillNeutral3: token({ from: slot.canvas, l: delta(-0.017), c: delta(+0.001) }),
  fillNeutral4: token({ from: slot.canvas, l: delta(-0.034), c: delta(+0.002) }),
  fillNeutral5: token({ from: slot.canvas, l: delta(-0.032), c: delta(+0.003) }),
  fillNeutral6: token({ from: slot.canvas, l: delta(-0.048), c: delta(+0.004) }),

  fillAccent: token({ from: slot.accent }),
  // D39: capped at the formula, not the emerald anchor — dark fgSuccess reads
  // the same anchor at a different lightness where it IS in-gamut (see
  // default.ts comment on emerald).
  fillSuccess: token({ from: slot.success, c: cap(0.1285) }),
  fillWarning: token({ from: slot.warning }),
  fillDanger: token({ from: slot.danger }),

  fillTintAccent: token({ from: ref.fgAccent, alpha: 0.12 }),
  fillTintSuccess: token({ from: ref.fgSuccess, alpha: 0.12 }),
  fillTintWarning: token({ from: ref.fgWarning, alpha: 0.12 }),
  fillTintDanger: token({ from: ref.fgDanger, alpha: 0.12 }),

  borderFaint: token({ from: ref.fgPrimary, alpha: 0.08 }),
  borderNeutral: token({ from: ref.fgPrimary, alpha: 0.15 }),
  borderStrong: token({ from: ref.fgPrimary, alpha: 0.3 }),
  borderFocus: token({ from: ref.fgAccent }),

  // Scrims (D32): page-canvas surfaces at alpha — never text pairs, so they
  // carry no AA gate entries.
  scrimSoft: token({ from: ref.bgPrimary, alpha: 0.25 }),
  scrimMedium: token({ from: ref.bgPrimary, alpha: 0.35 }),
  scrimHeavy: token({ from: ref.bgPrimary, alpha: 0.82 }),
};
