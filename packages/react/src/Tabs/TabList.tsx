import { useRef } from "react";
import type { ReactNode, Ref } from "react";
import { useTabsContext } from "./Tabs.js";
import { useTabsKeyboard } from "./useTabsKeyboard.js";
import styles from "./tabs.module.css";

export interface TabListProps {
  /**
   * Accessible name for the tab set. Declared here rather than inherited so
   * docgen keeps it in the manifest (D60) — a tablist without a name is
   * announced as an unlabelled group, and the prop would otherwise be
   * invisible to an agent reading the manifest.
   */
  "aria-label"?: string;
  /** One `Tab` per view. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the tablist element. */
  ref?: Ref<HTMLDivElement>;
}

/** The `role="tablist"` container (D67). Owns the roving tabindex: the whole
 * list is one Tab stop, and the arrow keys move between tabs inside it. */
export function TabList({ "aria-label": ariaLabel, children, className, ref }: TabListProps) {
  const { orientation, onValueChange } = useTabsContext("TabList");
  const innerRef = useRef<HTMLDivElement | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const handleKeyDown = useTabsKeyboard({ listRef: innerRef, orientation, onValueChange });

  return (
    <div
      ref={setRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={[styles.list, className].filter(Boolean).join(" ")}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
