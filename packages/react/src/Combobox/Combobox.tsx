import { useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import { Tag } from "../Tag/Tag.js";
import { useAnchoredPopup } from "../internal/popup/useAnchoredPopup.js";
import { usePopupPlacement } from "../internal/popup/usePopupPlacement.js";
import { useActiveOption } from "../internal/listbox/useActiveOption.js";
import { defaultFilter } from "./filter.js";
import type { ComboboxOption } from "./types.js";
import styles from "./combobox.module.css";

export type { ComboboxOption } from "./types.js";

/** Decides whether an option stays in the list for the text typed (D130). */
export type ComboboxFilter = (option: ComboboxOption, text: string) => boolean;

type InputAttributes = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "multiple" | "children" | "role" | "list" | "name" | "required" | "disabled" | "placeholder"
>;

interface ComboboxBaseProps extends InputAttributes {
  /** The choices, as data: each option's label is what the filter reads. */
  options: ComboboxOption[];
  /** The default (undefined) is a "contains" match on the label that ignores
   * case and accents. A function replaces it. `false` hands the list to the
   * caller: the options are shown as given, and nothing is filtered.
   * @default "contains", case- and accent-blind */
  filter?: ComboboxFilter | false;
  /** The text in the input, controlled. Pair with onInputChange. */
  inputValue?: string;
  /** Called with the text whenever it changes: typing, a pick, a revert on
   * blur, a clear. A caller that reads options as the user types listens
   * here. */
  onInputChange?: (text: string) => void;
  /** A read is in flight: a status line shows, and the listbox is
   * aria-busy. Keep passing the last options; they stay on screen. @default false */
  loading?: boolean;
  /** A line after the listbox, for a cut-off caller-owned list ("Showing 50
   * of 812. Keep typing to narrow it."). */
  moreMessage?: ReactNode;
  /** Show error styling. Inside a Field, the Field's error also lights this. @default false */
  error?: boolean;
  /** @default false */
  disabled?: boolean;
  placeholder?: string;
  /** Writes hidden inputs, one per value, so a native form submits the
   * values rather than the text. */
  name?: string;
  /** Sets the input's custom validity while the value is empty, so native
   * validation and :invalid work. Inside a Field, the Field's required also
   * sets this. @default false */
  required?: boolean;
  /** Adds a button that empties the value and the text. @default false */
  clearable?: boolean;
  /** The clear button's name. @default "Clear" */
  clearLabel?: string;
  /** The chevron button's name. @default "Show options" */
  toggleLabel?: string;
  /** Each Tag's remove button, in multi-select. @default (label) => `Remove ${label}` */
  removeLabel?: (label: string) => string;
  /** The status line when nothing matches. @default "No matches" */
  emptyMessage?: ReactNode;
  /** The status line while loading. @default "Loading…" */
  loadingMessage?: ReactNode;
  /** What the live region says after filtering. @default "1 result" / "N results" */
  resultsLabel?: (count: number) => string;
  /** When false, the Combobox has no live region of its own: an application
   * that routes every announcement through one announcer sets this and
   * speaks the count, the loading line and "No matches" itself, as with
   * Field's announce. The status lines still show and still describe the
   * input (aria-describedby). @default true (D134) */
  announce?: boolean;
  /** The list's open state, controlled (D134). Leave it unset and the list
   * opens and closes by itself. Set it and the list shows exactly while it
   * is true (and the Combobox isn't disabled): typing, the arrow keys and
   * the chevron then ask to open through onOpenChange, and a pick, Esc, Tab,
   * blur and an outside press ask to close, but nothing changes until the
   * new `open` arrives. Hold it false while a caller-owned read has failed,
   * and drop the requests made meanwhile: a stored `true` would open the
   * list by itself the moment the hold ends. */
  open?: boolean;
  /** Called when the list opens or closes, or, with `open` set, when it asks
   * to. Never called for a change made through `open`. */
  onOpenChange?: (open: boolean) => void;
  /** Goes on the root element. */
  className?: string;
  /** Forwarded ref to the `<input>`. */
  ref?: Ref<HTMLInputElement>;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  /** Pick several values, shown as Tags. @default false */
  multiple?: false;
  /** The picked option's value, controlled; null for none. */
  value?: string | null;
  /** The picked option's value, uncontrolled. */
  defaultValue?: string | null;
  /** Called with the picked value, or null when the text is emptied. */
  onChange?: (value: string | null) => void;
  /** The picked value's label, for a value the options don't hold: a preset
   * value past the first page of a server-read list, or a list not loaded
   * yet (D134). The options win when they hold the value. A new valueLabel
   * belongs to the value picked when it arrives, and the text follows it
   * unless the user is editing. */
  valueLabel?: string;
  /** Height in px. @default 32 */
  size?: 24 | 32 | 40 | 48;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  multiple: true;
  /** The picked values, controlled. */
  value?: string[];
  /** The picked values, uncontrolled. */
  defaultValue?: string[];
  /** Called with every picked value after each change. */
  onChange?: (values: string[]) => void;
  /** Single-select only (D134). */
  valueLabel?: never;
  /** Height in px; the control grows from it as Tags wrap. 24 is excluded: a
   * 24px Tag doesn't fit inside a 24px control. @default 32 */
  size?: 32 | 40 | 48;
}

/** Single-select by default; `multiple` switches value and onChange to
 * arrays (a discriminated union). */
export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

const sizeClass: Record<24 | 32 | 40 | 48, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

const defaultRemoveLabel = (label: string) => `Remove ${label}`;
const defaultResultsLabel = (count: number) => (count === 1 ? "1 result" : `${count} results`);

/** The browser's own localised "fill out this field" message, read from a
 * detached required input, so `required` needs no new translatable prop. */
function requiredMessage(): string {
  if (typeof document === "undefined") return "Required";
  const probe = document.createElement("input");
  probe.required = true;
  return probe.validationMessage || "Please fill out this field.";
}

/** Keep the control's focus where it is: pressing an option, a button or
 * the popup's scrollbar must not blur the input (D130). On mousedown, not
 * pointerdown: mousedown's default action is what moves focus, and a
 * cancelled pointerdown suppresses the compatibility mouse events without
 * holding focus (and, in user-event, the click as well). */
function keepFocus(event: MouseEvent) {
  event.preventDefault();
}

/** Search a list and pick one value, or several (D130). Focus stays in the
 * input; `aria-activedescendant` names the highlighted option. The popup is
 * a manual popover on the top layer, placed under the control and at least
 * as wide as it; it closes on an outside pointerdown, Esc, Tab and blur.
 * The list opens and closes by itself; `open` and `onOpenChange` let a
 * caller hold it (D134). In single-select, Esc restores the picked label and
 * Enter or blur settle edited text (D134). Inside a Field, the id, label,
 * description, invalid and required wiring are taken automatically, as
 * Select takes them (D49). */
export function Combobox(props: ComboboxProps) {
  const {
    options,
    filter,
    inputValue: inputValueProp,
    onInputChange,
    loading = false,
    moreMessage,
    error = false,
    disabled = false,
    placeholder,
    name,
    required: requiredProp,
    clearable = false,
    clearLabel = "Clear",
    toggleLabel = "Show options",
    removeLabel = defaultRemoveLabel,
    emptyMessage = "No matches",
    loadingMessage = "Loading…",
    resultsLabel = defaultResultsLabel,
    announce = true,
    open: openProp,
    onOpenChange,
    valueLabel,
    className,
    style,
    ref,
    multiple: multipleProp,
    value: valueProp,
    defaultValue: defaultValueProp,
    onChange: onChangeProp,
    size: sizeProp,
    onKeyDown: onKeyDownProp,
    onBlur: onBlurProp,
    ...rest
  } = props;
  const multiple = multipleProp === true;
  const size = sizeProp ?? 32;

  const field = useContext(FieldContext);
  const invalid = error || (field?.invalid ?? false);
  const required = requiredProp ?? field?.required ?? false;

  const uid = useId().replace(/:/g, "");
  const inputId = rest.id ?? field?.id ?? `psi-combobox-${uid}`;
  const listboxId = `psi-combobox-${uid}-listbox`;
  const optionId = (index: number) => `psi-combobox-${uid}-option-${index}`;
  const statusId = `psi-combobox-${uid}-status`;
  const moreId = `psi-combobox-${uid}-more`;
  const anchorName = `--psi-combobox-${uid}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);

  // ── The value: controlled or not, one string or several ──
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    if (Array.isArray(defaultValueProp)) return defaultValueProp;
    return defaultValueProp == null ? [] : [defaultValueProp];
  });
  const values: string[] = isControlled
    ? Array.isArray(valueProp)
      ? valueProp
      : valueProp == null
        ? []
        : [valueProp]
    : uncontrolled;

  // The union keeps value and onChange in step for callers; inside, one
  // string[] carries both shapes, and multiple says which one to report.
  const commit = (next: string[]) => {
    if (!isControlled) setUncontrolled(next);
    if (multiple) (onChangeProp as ((values: string[]) => void) | undefined)?.(next);
    else (onChangeProp as ((value: string | null) => void) | undefined)?.(next[0] ?? null);
  };

  // A picked value keeps its label when a caller-owned list no longer holds
  // the option (filter={false}): remember every label seen.
  // D134: a new valueLabel is the label of the value picked when it
  // arrives, stored before the options so that the options win; passing the
  // same string again stores nothing, so it never leaks onto a later pick.
  const labelCache = useRef(new Map<string, string>());
  const lastValueLabel = useRef<string | undefined>(undefined);
  if (!multiple && valueLabel !== lastValueLabel.current) {
    lastValueLabel.current = valueLabel;
    if (valueLabel !== undefined && values[0] !== undefined) labelCache.current.set(values[0], valueLabel);
  }
  for (const option of options) labelCache.current.set(option.value, option.label);
  const labelOf = (value: string) => labelCache.current.get(value) ?? value;

  // ── The text ──
  // The shown label: what the input shows when nobody is typing (D134).
  const singleLabel = !multiple && values[0] !== undefined ? labelOf(values[0]) : "";
  const [textState, setTextState] = useState(singleLabel);
  const text = inputValueProp ?? textState;
  const writeText = (next: string) => {
    if (inputValueProp === undefined) setTextState(next);
    if (next !== text) onInputChange?.(next);
  };
  /** Single-select text that differs from the shown label (D134). */
  const edited = !multiple && text !== singleLabel;

  // A single-select's text follows its value when the value changes: a pick,
  // a clear, or a controlled value set from outside. It also follows the
  // shown label when that changes under unedited text: a valueLabel or an
  // options page that arrives after the value (D134).
  const valueKey = values.join("\u0000");
  const lastValueKey = useRef(valueKey);
  const lastLabel = useRef(singleLabel);
  useEffect(() => {
    const previousKey = lastValueKey.current;
    const previousLabel = lastLabel.current;
    lastValueKey.current = valueKey;
    lastLabel.current = singleLabel;
    if (multiple) return;
    if (valueKey !== previousKey) writeText(singleLabel);
    else if (singleLabel !== previousLabel && text === previousLabel) writeText(singleLabel);
    // writeText is recreated each render; the value and its label are the triggers.
  }, [valueKey, singleLabel, multiple]);

  // ── The list ──
  // D134: controlled by `open` when it's set; otherwise our own state. Every
  // open and close goes through requestOpen, which reports it.
  const [openState, setOpenState] = useState(false);
  const open = (openProp ?? openState) && !disabled;
  const requestOpen = (next: boolean) => {
    if (next === open) return;
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  // Opening by key or chevron shows the whole list; typing filters (plan).
  const [filtering, setFiltering] = useState(false);
  const visible = useMemo(() => {
    if (filter === false || !filtering) return options;
    const fn = filter ?? defaultFilter;
    return options.filter((option) => fn(option, text));
  }, [options, filter, filtering, text]);

  const active = useActiveOption(visible);
  const activeIndex = active.active === null ? -1 : visible.findIndex((o) => o.value === active.active);

  const close = () => requestOpen(false);
  /** Open the list unfiltered. "picked-first" / "picked-last": highlight the
   * picked option, else the first / last (Down / Up). "picked": the picked
   * option, else nothing (the chevron). "none": nothing (Alt + Down). */
  const openWith = (highlight: "picked-first" | "picked-last" | "picked" | "none") => {
    if (disabled) return;
    setFiltering(false);
    requestOpen(true);
    if (highlight === "none") {
      active.clear();
      return;
    }
    const picked = options.find((o) => values.includes(o.value));
    if (picked) active.setActive(picked.value);
    else if (highlight === "picked") active.clear();
    else if (highlight === "picked-first") active.setActive(options[0]?.value ?? null);
    else active.setActive(options[options.length - 1]?.value ?? null);
  };

  usePopupPlacement({ popoverRef: popupRef, anchorRef: rootRef, open, placement: "bottom-start", anchorName, matchWidth: true });
  // close() reads open, openProp and onOpenChange; nothing else changes it.
  const dismiss = useCallback(() => close(), [open, openProp, onOpenChange]);
  const popupProps = useAnchoredPopup({ popoverRef: popupRef, anchorRef: rootRef, open, mode: "manual", onDismiss: dismiss });

  // Keep the highlighted option in view as it moves.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(optionId(activeIndex));
    el?.scrollIntoView?.({ block: "nearest" });
    // optionId is derived from uid, which is stable.
  }, [open, activeIndex]);

  // ── Picking ──
  const pick = (option: ComboboxOption) => {
    if (option.disabled) return;
    setFiltering(false);
    if (multiple) {
      const next = values.includes(option.value)
        ? values.filter((v) => v !== option.value)
        : [...values, option.value];
      commit(next);
      active.setActive(option.value);
      writeText("");
    } else {
      commit([option.value]);
      writeText(option.label);
      close();
    }
  };

  const removeValue = (value: string) => {
    commit(values.filter((v) => v !== value));
    inputRef.current?.focus();
  };

  /** Leave an edit: emptied text clears the value; other edited text goes
   * back to the shown label. Blur does this, and Enter with nothing
   * highlighted (D134). */
  const settle = () => {
    if (text === "") {
      if (values.length > 0) commit([]);
    } else if (text !== singleLabel) {
      writeText(singleLabel);
    }
    setFiltering(false);
  };

  const clearAll = () => {
    commit([]);
    writeText("");
    setFiltering(false);
    inputRef.current?.focus();
  };

  // ── required: custom validity from the value, not the text ──
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setCustomValidity(required && values.length === 0 ? requiredMessage() : "");
  }, [required, values.length]);

  // Tag has no prop for its button: take each remove button out of the Tab
  // order, so the Combobox is one Tab stop (D130).
  useLayoutEffect(() => {
    rootRef.current
      ?.querySelectorAll<HTMLButtonElement>("[data-psi-combobox-tags] button")
      .forEach((button) => (button.tabIndex = -1));
  });

  // ── Keyboard ──
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDownProp?.(event);
    if (event.defaultPrevented) return;
    const { key, altKey } = event;

    if (key === "ArrowDown") {
      event.preventDefault();
      if (!open) openWith(altKey ? "none" : "picked-first");
      else if (!altKey) active.move(1);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        if (!altKey) openWith("picked-last");
      } else if (altKey) close();
      else active.move(-1);
      return;
    }
    if ((key === "PageDown" || key === "PageUp") && open) {
      event.preventDefault();
      active.page(key === "PageDown" ? 1 : -1);
      return;
    }
    if (key === "Enter") {
      if (open) {
        // The key belongs to the list while it's open: never submit.
        event.preventDefault();
        const option = activeIndex >= 0 ? visible[activeIndex] : undefined;
        if (option) pick(option);
        else if (!multiple) {
          // D134: nothing highlighted settles the text, as leaving does.
          settle();
          close();
        }
      } else if (edited) {
        // D134: edited text never submits an old value.
        event.preventDefault();
        settle();
      }
      return;
    }
    if (key === "Escape") {
      if (multiple) {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        } else if (text !== "") {
          event.preventDefault();
          event.stopPropagation();
          writeText("");
          setFiltering(false);
        }
      } else if (open || edited) {
        // D134: Esc cancels the edit. It restores the shown label and never
        // clears a value; unedited and closed, it reaches a parent Dialog.
        event.preventDefault();
        event.stopPropagation();
        if (open) close();
        if (edited) {
          writeText(singleLabel);
          setFiltering(false);
        }
      }
      return;
    }
    if (key === "Tab") {
      if (open) close();
      return;
    }
    if (key === "Backspace" && multiple && text === "" && values.length > 0) {
      event.preventDefault();
      commit(values.slice(0, -1));
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    writeText(event.target.value);
    setFiltering(true);
    active.follow();
    if (!open && !disabled) requestOpen(true);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlurProp?.(event);
    close();
    if (multiple) return;
    settle();
  };

  // A pointerdown anywhere on the control that isn't the input keeps focus
  // in the input, and moves it there if it wasn't.
  const handleRootMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === inputRef.current || disabled) return;
    if (popupRef.current?.contains(event.target as Node)) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const count = visible.length;
  const empty = count === 0;
  const announcement = !open ? "" : loading ? loadingMessage : empty ? emptyMessage : resultsLabel(count);
  // D134: expanded only while a listbox shows; a status line alone isn't one.
  const expanded = open && !empty;
  const showStatus = loading || empty;
  // The lines outside the listbox describe the input while they show (a
  // hidden element still lends its text when named, so name it only then).
  const describedBy =
    [
      field?.describedBy,
      rest["aria-describedby"],
      open && showStatus && statusId,
      open && moreMessage && moreId,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const listboxName = field?.labelId
    ? { "aria-labelledby": field.labelId }
    : rest["aria-labelledby"]
      ? { "aria-labelledby": rest["aria-labelledby"] }
      : rest["aria-label"]
        ? { "aria-label": rest["aria-label"] }
        : {};
  const hasValue = values.length > 0 || text !== "";

  const cls = [
    styles.combobox,
    sizeClass[size],
    multiple && styles.multiple,
    invalid && styles.error,
    disabled && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={cls}
      style={style}
      data-psi-combobox
      data-size={size}
      onMouseDown={handleRootMouseDown}
    >
      <div className={styles.values} data-psi-combobox-tags={multiple || undefined}>
        {multiple &&
          values.map((value) => (
            <Tag
              key={value}
              variant="neutral"
              subtle
              className={styles.tag}
              onDismiss={disabled ? undefined : () => removeValue(value)}
              dismissLabel={removeLabel(labelOf(value))}
            >
              {labelOf(value)}
            </Tag>
          ))}
        <input
          {...rest}
          ref={setInputRef}
          id={inputId}
          type="text"
          role="combobox"
          className={styles.input}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </div>
      <div className={styles.actions}>
        {clearable && hasValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            className={styles.button}
            aria-label={clearLabel}
            onMouseDown={keepFocus}
            onClick={clearAll}
            data-psi-combobox-clear
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          className={[styles.button, styles.toggle].join(" ")}
          aria-label={toggleLabel}
          aria-expanded={expanded}
          aria-controls={listboxId}
          data-open={open || undefined}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={() => {
            if (open) close();
            else openWith("picked");
            inputRef.current?.focus();
          }}
          data-psi-combobox-toggle
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      {name !== undefined &&
        (multiple ? (
          values.map((value) => <input key={value} type="hidden" name={name} value={value} />)
        ) : (
          <input type="hidden" name={name} value={values[0] ?? ""} />
        ))}
      <div
        ref={popupRef}
        {...popupProps}
        className={styles.popup}
        data-psi-combobox-popup
        onMouseDown={keepFocus}
      >
        {showStatus && (
          <div id={statusId} className={styles.status} data-psi-combobox-status>
            {loading ? loadingMessage : emptyMessage}
          </div>
        )}
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className={styles.listbox}
          aria-multiselectable={multiple || undefined}
          aria-busy={loading || undefined}
          hidden={empty || undefined}
          {...listboxName}
        >
          {visible.map((option, index) => {
            const selected = values.includes(option.value);
            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                className={styles.option}
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                data-highlighted={index === activeIndex || undefined}
                onPointerMove={() => {
                  if (active.active !== option.value) active.setActive(option.value);
                }}
                onClick={() => {
                  pick(option);
                  inputRef.current?.focus();
                }}
              >
                <span className={styles.check} aria-hidden="true">
                  {selected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className={styles.optionText}>
                  <span data-psi-combobox-option-label>{option.label}</span>
                  {option.description && (
                    <span className={styles.description}> {option.description}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {moreMessage && (
          <div id={moreId} className={styles.status} data-psi-combobox-more>
            {moreMessage}
          </div>
        )}
      </div>
      {announce && (
        <div className="psi-sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      )}
    </div>
  );
}
