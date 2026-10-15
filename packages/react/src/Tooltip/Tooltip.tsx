import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type ReactElement,
  type ReactNode,
} from "react";
import styles from "./tooltip.module.css";

type Placement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip content. */
  content: ReactNode;
  /** The trigger element (must accept onFocus/Blur). */
  children: ReactElement<Record<string, unknown>>;
  /** Preferred placement. @default "top" */
  placement?: Placement;
}

const placementClass: Record<Placement, string> = {
  top: styles.top,
  bottom: styles.bottom,
  left: styles.left,
  right: styles.right,
};

/** Hover must not open the tooltip on incidental mouse-over (WCAG 1.4.13). */
const HOVER_DELAY_MS = 150;

/** Short hover/focus hint attached to a single trigger element. */
export function Tooltip({
  content,
  children,
  placement = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const timerRef = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  // Clear any pending open timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  // Escape dismisses the tooltip while it is visible (WCAG 1.4.13).
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, hide]);

  // Hover lives on the wrapper, which holds the trigger and the bubble, so
  // the pointer can move onto the bubble without leaving (WCAG 1.4.13
  // hoverable, D105). The child's own mouse handlers run untouched.
  const onMouseEnter = () => {
    clearTimer();
    timerRef.current = window.setTimeout(show, HOVER_DELAY_MS);
  };
  const onMouseLeave = () => {
    clearTimer();
    hide();
  };

  const trigger = cloneElement(children, {
    "aria-describedby": visible ? id : undefined,
    onFocus: (e: React.FocusEvent) => {
      show();
      const childOnFocus = children.props.onFocus as
        | ((e: React.FocusEvent) => void)
        | undefined;
      childOnFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      clearTimer();
      hide();
      const childOnBlur = children.props.onBlur as
        | ((e: React.FocusEvent) => void)
        | undefined;
      childOnBlur?.(e);
    },
  });

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {trigger}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={[styles.tooltip, placementClass[placement]]
            .filter(Boolean)
            .join(" ")}
        >
          {content}
        </span>
      )}
    </span>
  );
}
