import { token, set, cap, slot, ref } from "../dsl/builders.js";
import type { ThemeDef } from "../dsl/types.js";

export const darkTheme: ThemeDef = {
  bgPrimary: token({ from: slot.ink, l: set(0.15), c: set(0.01) }),
  bgSecondary: token({ from: slot.ink, l: set(0.2), c: set(0.015) }),

  fgPrimary: token({ from: slot.canvas, l: set(0.93), c: set(0.01) }),
  fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
  fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
  fgQuaternary: token({ from: ref.fgPrimary, alpha: 0.3 }),
  fgPrimaryInverted: token({ from: slot.ink, l: set(0.15) }),
  fgStaticWhite: token({ from: slot.canvas, l: set(1.0), c: set(0) }),
  fgStaticBlack: token({ from: slot.ink, l: set(0.25), c: cap(0.03) }),

  /** Label ink on fillAccent (D37). Brands whose accent can't carry white
   * (e.g. ember #ff7847, white = 2.62:1) override this instead of mangling
   * their anchor. */
  fgOnAccent: token({ from: ref.fgStaticWhite }),

  fgAccent: token({ from: slot.accent, l: set(0.75), c: cap(0.23) }),
  fgSuccess: token({ from: slot.success, l: set(0.75), c: cap(0.23) }),
  fgWarning: token({ from: slot.warning, l: set(0.75), c: cap(0.23) }),
  fgDanger: token({ from: slot.danger, l: set(0.75), c: cap(0.23) }),

  fillNeutral1: token({ from: slot.ink, l: set(0.18), c: set(0.012) }),
  fillNeutral2: token({ from: slot.ink, l: set(0.2), c: set(0.015) }),
  fillNeutral3: token({ from: slot.ink, l: set(0.23), c: set(0.018) }),
  fillNeutral4: token({ from: slot.ink, l: set(0.26), c: set(0.02) }),
  fillNeutral5: token({ from: slot.ink, l: set(0.29), c: set(0.022) }),
  fillNeutral6: token({ from: slot.ink, l: set(0.32), c: set(0.025) }),

  fillAccent: token({ from: slot.accent }),
  fillSuccess: token({ from: slot.success }),
  fillWarning: token({ from: slot.warning }),
  fillDanger: token({ from: slot.danger }),

  fillTintAccent: token({ from: ref.fgAccent, alpha: 0.15 }),
  fillTintSuccess: token({ from: ref.fgSuccess, alpha: 0.15 }),
  fillTintWarning: token({ from: ref.fgWarning, alpha: 0.15 }),
  fillTintDanger: token({ from: ref.fgDanger, alpha: 0.15 }),

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
