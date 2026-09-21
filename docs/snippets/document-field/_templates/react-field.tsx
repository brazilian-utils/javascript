@@fieldImports@@
import { Field } from "./field";

type @@Name@@FieldProps = {
  /** The @@label@@ without its mask, the way the form holds it. */
  value: string;
  /** Called with the @@label@@ without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** The field of the form, with what makes it a @@label@@ and nothing else. */
export function @@Name@@Field(props: @@Name@@FieldProps) {
  return (
    <Field
      {...props}
      label="@@label@@"
      inputMode="@@inputMode@@"
      autoComplete="@@autocomplete@@"
      placeholder="@@placeholder@@"
      mask={{ format: @@format@@, parse: @@parse@@ }}
    />
  );
}
