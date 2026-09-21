import { useId, type ComponentProps } from "react";
@@fieldImports@@
import { useMask } from "./use-mask";

type @@Name@@FieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> & {
  /** The @@label@@ without its mask, the way the form holds it. Left out, the field keeps its own. */
  value?: string;
  /** Called with the @@label@@ without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** Masks a @@label@@ while it is typed. Validation belongs to the form. */
export function @@Name@@Field({ value, onChange, errorMessage, ...props }: @@Name@@FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const ref = useMask({
    format: @@format@@,
    parse: @@parse@@,
    value,
    onChange: ({ parsedValue }) => onChange(parsedValue),
  });

  return (
    <>
      <label htmlFor={id}>@@label@@</label>
      <input
        {...props}
        ref={ref}
        id={id}
        inputMode="@@inputMode@@"
        autoComplete="@@autocomplete@@"
        placeholder="@@placeholder@@"
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorId}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <p id={errorId} role="alert">
        {errorMessage}
      </p>
    </>
  );
}
