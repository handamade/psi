import { useCallback, useState } from "react";

/** What the hook needs from an option: its identity, and whether it's
 * disabled. Disabled options are reachable (D130, D131); only picking them is
 * refused, and that's the owner's business. */
export interface ActiveOptionItem {
  value: string;
  disabled?: boolean;
}

/** "none": nothing highlighted, until the next move. "follow": the first
 * option, whatever it is now — what typing asks for, so a list that arrives
 * later (an async read) is highlighted from its top. "value": one option,
 * kept by identity. */
type Intent = { kind: "none" } | { kind: "follow" } | { kind: "value"; value: string };

export interface ActiveOption {
  /** The highlighted option's value, or null. Always an option in the
   * current list: it never names one that's gone. */
  active: string | null;
  /** Highlight one option by value (pointer hover, opening on the picked one). */
  setActive: (value: string | null) => void;
  /** Highlight the first option now and after every list change, until
   * something else is chosen. */
  follow: () => void;
  /** Highlight nothing. */
  clear: () => void;
  /** One step, wrapping at the ends. From nothing, +1 lands on the first
   * option and -1 on the last. */
  move: (step: 1 | -1) => void;
  /** Ten options, stopping at the ends. */
  page: (direction: 1 | -1) => void;
  first: () => void;
  last: () => void;
}

const PAGE = 10;

/** An `aria-activedescendant` highlight that moves through a list while real
 * focus stays elsewhere, in the Combobox's input (D130).
 *
 * When the list changes, the highlight stays on the same option, by value,
 * if it's still there; otherwise it moves to the first option; on an empty
 * list it clears. A fallback to the first is then an ordinary highlight, kept
 * by value through the next change. Menu answers the same question
 * differently (D131: the neighbour), because a menu item disappears under
 * the user's focus, while a combobox list changes because the user typed. */
export function useActiveOption(items: readonly ActiveOptionItem[]): ActiveOption {
  const [intent, setIntent] = useState<Intent>({ kind: "none" });

  // Resolve during render, so `active` is never stale for a frame.
  let active: string | null = null;
  if (intent.kind === "follow") active = items[0]?.value ?? null;
  else if (intent.kind === "value") {
    if (items.some((item) => item.value === intent.value)) active = intent.value;
    else {
      // Gone: the first option, or nothing. Store it, so the fallback is kept
      // by value from here on (React re-renders before committing).
      const next: Intent = items.length > 0 ? { kind: "value", value: items[0].value } : { kind: "none" };
      active = items[0]?.value ?? null;
      setIntent(next);
    }
  }

  const index = active === null ? -1 : items.findIndex((item) => item.value === active);
  const at = useCallback(
    (i: number) => {
      const item = items[i];
      if (item) setIntent({ kind: "value", value: item.value });
    },
    [items],
  );

  const n = items.length;
  return {
    active,
    setActive: (value) => setIntent(value === null ? { kind: "none" } : { kind: "value", value }),
    follow: () => setIntent({ kind: "follow" }),
    clear: () => setIntent({ kind: "none" }),
    move: (step) => {
      if (n === 0) return;
      if (index === -1) at(step === 1 ? 0 : n - 1);
      else at((index + step + n) % n);
    },
    page: (direction) => {
      if (n === 0) return;
      const from = index === -1 ? (direction === 1 ? -1 : n) : index;
      at(Math.min(n - 1, Math.max(0, from + direction * PAGE)));
    },
    first: () => at(0),
    last: () => at(n - 1),
  };
}
