import { useId, type ComponentProps } from "react";
import { useMask } from "./use-mask";

type Mask = {
  /** Formats what is typed, as it is typed. */
  format: (value: string) => string;
  /** Takes the mask off, for whoever holds the value. */
  parse: (value: string) => string;
};

type FieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> & {
  label: string;
  /** The value without its mask, the way a form holds it. */
  value: string;
  /** Called with the value without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
  /** How to mask the field, when it is a field that is masked. */
  mask?: Mask;
};

/** A labelled input that says what is wrong with it, masked when it is given a mask. */
export function Field({ label, value, onChange, errorMessage, mask, ...props }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const ref = useMask({
    format: mask?.format ?? ((typed) => typed),
    parse: mask?.parse ?? ((typed) => typed),
    value,
    onChange: ({ parsedValue }) => onChange(parsedValue),
  });

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        ref={ref}
        id={id}
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
