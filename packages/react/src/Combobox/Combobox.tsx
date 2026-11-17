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
 * The open state is internal: the list opens and closes with typing. Inside
 * a Field, the id, label, description, invalid and required wiring are
 * taken automatically, as Select takes them (D49). */
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
    className,
    style,
    ref,
    multiple: _multiple,
    value: _value,
    defaultValue: _defaultValue,
    onChange: _onChange,
    size: sizeProp,
    onKeyDown: onKeyDownProp,
    onBlur: onBlurProp,
    ...rest
  } = props;
  const multiple = props.multiple === true;
  const size = sizeProp ?? 32;

  const field = useContext(FieldContext);
  const invalid = error || (field?.invalid ?? false);
  const required = requiredProp ?? field?.required ?? false;
  const describedBy =
    [field?.describedBy, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const uid = useId().replace(/:/g, "");
  const inputId = rest.id ?? field?.id ?? `psi-combobox-${uid}`;
  const listboxId = `psi-combobox-${uid}-listbox`;
  const optionId = (index: number) => `psi-combobox-${uid}-option-${index}`;
  const anchorName = `--psi-combobox-${uid}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);

  // ── The value: controlled or not, one string or several ──
  const isControlled = props.value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    const initial = props.defaultValue;
    if (Array.isArray(initial)) return initial;
    return initial == null ? [] : [initial];
  });
  const values: string[] = isControlled
    ? Array.isArray(props.value)
      ? props.value
      : props.value == null
        ? []
        : [props.value]
    : uncontrolled;

  const commit = (next: string[]) => {
    if (!isControlled) setUncontrolled(next);
    if (props.multiple === true) props.onChange?.(next);
    else props.onChange?.(next[0] ?? null);
  };

  // A picked value keeps its label when a caller-owned list no longer holds
  // the option (filter={false}): remember every label seen.
  const labelCache = useRef(new Map<string, string>());
  for (const option of options) labelCache.current.set(option.value, option.label);
  const labelOf = (value: string) => labelCache.current.get(value) ?? value;

  // ── The text ──
  const singleLabel = !multiple && values[0] !== undefined ? labelOf(values[0]) : "";
  const [textState, setTextState] = useState(singleLabel);
  const text = inputValueProp ?? textState;
  const writeText = (next: string) => {
    if (inputValueProp === undefined) setTextState(next);
    if (next !== text) onInputChange?.(next);
  };

  // A single-select's text follows its value when the value changes: a pick,
  // a clear, or a controlled value set from outside.
  const lastValueKey = useRef(values.join("\u0000"));
  useEffect(() => {
    const key = values.join("\u0000");
    if (key === lastValueKey.current) return;
    lastValueKey.current = key;
    if (!multiple) writeText(singleLabel);
    // writeText is recreated each render; the value is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join("\u0000"), multiple]);

  // ── The list ──
  const [open, setOpen] = useState(false);
  // Opening by key or chevron shows the whole list; typing filters (plan).
  const [filtering, setFiltering] = useState(false);
  const visible = useMemo(() => {
    if (filter === false || !filtering) return options;
    const fn = filter ?? defaultFilter;
    return options.filter((option) => fn(option, text));
  }, [options, filter, filtering, text]);

  const active = useActiveOption(visible);
  const activeIndex = active.active === null ? -1 : visible.findIndex((o) => o.value === active.active);

  const close = useCallback(() => setOpen(false), []);
  /** Open the list unfiltered. "picked-first" / "picked-last": highlight the
   * picked option, else the first / last (Down / Up). "picked": the picked
   * option, else nothing (the chevron). "none": nothing (Alt + Down). */
  const openWith = (highlight: "picked-first" | "picked-last" | "picked" | "none") => {
    if (disabled) return;
    setFiltering(false);
    setOpen(true);
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
  const popupProps = useAnchoredPopup({ popoverRef: popupRef, anchorRef: rootRef, open, mode: "manual", onDismiss: close });

  // Keep the highlighted option in view as it moves.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(optionId(activeIndex));
    el?.scrollIntoView?.({ block: "nearest" });
    // optionId is derived from uid, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (key === "Enter" && open) {
      // The key belongs to the list while it's open: never submit.
      event.preventDefault();
      const option = activeIndex >= 0 ? visible[activeIndex] : undefined;
      if (option) pick(option);
      return;
    }
    if (key === "Escape") {
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
    if (!open && !disabled) setOpen(true);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlurProp?.(event);
    close();
    if (multiple) return;
    if (text === "") {
      if (values.length > 0) commit([]);
    } else if (text !== singleLabel) {
      writeText(singleLabel);
    }
    setFiltering(false);
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
          aria-expanded={open}
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
          aria-expanded={open}
          aria-controls={listboxId}
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
        {(loading || empty) && (
          <div className={styles.status} data-psi-combobox-status>
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
          <div className={styles.status} data-psi-combobox-more>
            {moreMessage}
          </div>
        )}
      </div>
      <div className="psi-sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
