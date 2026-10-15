import { createContext, useContext, useId, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./radio-group.module.css";

/** What a RadioGroup gives its Radios (D104). */
export interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  select: (value: string) => void;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "role"> {
  /** `Radio` children. */
  children?: ReactNode;
  /** The radios' shared `name`. Generated when absent. */
  name?: string;
  /** The selected value (controlled). */
  value?: string;
  /** The initially selected value (uncontrolled). */
  defaultValue?: string;
  /** Called with the value of the radio the user selects. */
  onValueChange?: (value: string) => void;
  /** Disables every radio in the group. @default false */
  disabled?: boolean;
  /** Stack the radios, or lay them in a row. @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Accessible name when the group stands alone. Inside `Field group` the
   * legend names the group instead. */
  "aria-label"?: string;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

/** A set of native radios sharing one name (D104). The browser supplies the
 * keyboard: Tab enters on the checked radio, and the arrows move and select.
 * Inside `Field group` the fieldset and legend form and name the group, so
 * this adds no role; standalone it is `role="radiogroup"` and needs
 * `aria-label` or `aria-labelledby`. A required or invalid Field makes every
 * radio `required` and `aria-invalid`. */
export function RadioGroup({
  children,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  orientation = "vertical",
  className,
  ref,
  ...rest
}: RadioGroupProps) {
  const field = useContext(FieldContext);
  const autoName = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const selected = value !== undefined ? value : uncontrolled;
  const inFieldGroup = field?.group === true;

  const select = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  const cls = [styles.group, orientation === "horizontal" && styles.horizontal, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...rest}
      ref={ref}
      className={cls}
      role={inFieldGroup ? undefined : "radiogroup"}
      data-psi-radio-group
    >
      <RadioGroupContext.Provider
        value={{
          name: name ?? autoName,
          value: selected,
          select,
          disabled,
          required: field?.required ?? false,
          invalid: field?.invalid ?? false,
        }}
      >
        {children}
      </RadioGroupContext.Provider>
    </div>
  );
}
