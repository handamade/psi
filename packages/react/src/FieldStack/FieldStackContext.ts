import { createContext } from "react";

/** Where a Field's label sits (D115): above its control, or beside it on the
 * inline-start side. */
export type FieldLabelPosition = "top" | "start";

/** What a FieldStack tells the Fields inside it. Its presence also tells a
 * Field that it is a row of the stack's grid. */
export interface FieldStackContextValue {
  labelPosition: FieldLabelPosition;
}

export const FieldStackContext = createContext<FieldStackContextValue | null>(null);
