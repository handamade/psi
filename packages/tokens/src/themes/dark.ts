import { token, set, cap, slot, ref } from "../dsl/builders.js";
import type { ThemeDef } from "../dsl/types.js";

export const darkTheme: ThemeDef = {
  bgPrimary: token({ from: slot.ink, l: set(0.15), c: set(0.01), scopes: ["surface"] }),
  bgSecondary: token({ from: slot.ink, l: set(0.2), c: set(0.015), scopes: ["surface"] }),

  fgPrimary: token({ from: slot.canvas, l: set(0.93), c: set(0.01), scopes: ["text"] }),
  fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7, scopes: ["text"] }),
  fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5, scopes: ["text"] }),
  fgQuaternary: token({ from: ref.fgPrimary, alpha: 0.3, scopes: ["text"] }),
  fgPrimaryInverted: token({ from: slot.ink, l: set(0.15), scopes: ["text"] }),
  fgStaticWhite: token({ from: slot.canvas, l: set(1.0), c: set(0), scopes: ["text"] }),
  fgStaticBlack: token({ from: slot.ink, l: set(0.25), c: cap(0.03), scopes: ["text"] }),

  /** Label ink on fillAccent (D37). Brands whose accent can't carry white
   * (e.g. ember #ff7847, white = 2.62:1) override this instead of mangling
   * their anchor. */
  fgOnAccent: token({ from: ref.fgStaticWhite, scopes: ["text"] }),

  // D39: caps lowered to each hue's in-gamut max at l 0.75 — the values these
  // tokens were already clamping to, so rendered hex is unchanged. fgSuccess
  // keeps the loose cap: emerald at l 0.75 is already in-gamut.
  fgAccent: token({ from: slot.accent, l: set(0.75), c: cap(0.1286), scopes: ["text"] }),
  fgSuccess: token({ from: slot.success, l: set(0.75), c: cap(0.23), scopes: ["text"] }),
  fgWarning: token({ from: slot.warning, l: set(0.75), c: cap(0.1582), scopes: ["text"] }),
  fgDanger: token({ from: slot.danger, l: set(0.75), c: cap(0.1505), scopes: ["text", "border"] }),

  fillNeutral1: token({ from: slot.ink, l: set(0.18), c: set(0.012), scopes: ["surface"] }),
  fillNeutral2: token({ from: slot.ink, l: set(0.2), c: set(0.015), scopes: ["surface"] }),
  fillNeutral3: token({ from: slot.ink, l: set(0.23), c: set(0.018), scopes: ["surface"] }),
  fillNeutral4: token({ from: slot.ink, l: set(0.26), c: set(0.02), scopes: ["surface"] }),
  fillNeutral5: token({ from: slot.ink, l: set(0.29), c: set(0.022), scopes: ["surface"] }),
  fillNeutral6: token({ from: slot.ink, l: set(0.32), c: set(0.025), scopes: ["surface"] }),

  fillAccent: token({ from: slot.accent, scopes: ["surface", "border"] }),
  // D39: capped at the formula, not the emerald anchor (see light.ts).
  fillSuccess: token({ from: slot.success, c: cap(0.1285), scopes: ["surface"] }),
  fillWarning: token({ from: slot.warning, scopes: ["surface"] }),
  fillDanger: token({ from: slot.danger, scopes: ["surface"] }),

  fillTintAccent: token({ from: ref.fgAccent, alpha: 0.15, scopes: ["surface"] }),
  fillTintSuccess: token({ from: ref.fgSuccess, alpha: 0.15, scopes: ["surface"] }),
  fillTintWarning: token({ from: ref.fgWarning, alpha: 0.15, scopes: ["surface"] }),
  fillTintDanger: token({ from: ref.fgDanger, alpha: 0.15, scopes: ["surface"] }),

  /** D46: the static-white SURFACE (switch thumb) — pure ref, byte-identical
   * with fgStaticWhite; scoped for what it is. */
  fillStaticWhite: token({ from: ref.fgStaticWhite, scopes: ["surface"] }),

  borderFaint: token({ from: ref.fgPrimary, alpha: 0.08, scopes: ["border"] }),
  borderNeutral: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["border"] }),
  borderStrong: token({ from: ref.fgPrimary, alpha: 0.3, scopes: ["border"] }),
  borderFocus: token({ from: ref.fgAccent, scopes: ["border"] }),

  // Scrims (D32): page-canvas surfaces at alpha — never text pairs, so they
  // carry no AA gate entries.
  scrimSoft: token({ from: ref.bgPrimary, alpha: 0.25, scopes: ["surface"] }),
  scrimMedium: token({ from: ref.bgPrimary, alpha: 0.35, scopes: ["surface"] }),
  scrimHeavy: token({ from: ref.bgPrimary, alpha: 0.82, scopes: ["surface"] }),

  /** D46: the deliberate inversion pair (tooltip). Pure refs — always
   * byte-identical with fgPrimary/bgPrimary in every theme — but scoped
   * for what they ARE: an inverted surface and the label on it. */
  bgInverted: token({ from: ref.fgPrimary, scopes: ["surface"] }),
  fgOnInverted: token({ from: ref.bgPrimary, scopes: ["text"] }),
};
