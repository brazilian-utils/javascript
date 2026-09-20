import { useId, type ComponentProps } from "react";
import { formatCep, parseCep } from "@brazilian-utils/brazilian-utils";
import { useMask } from "./use-mask";

type CepFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> & {
  /** The CEP without its mask, the way the form holds it. */
  value: string;
  /** Called with the CEP without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** Masks a CEP while it is typed. Validation belongs to the form. */
export function CepField({ value, onChange, errorMessage, ...props }: CepFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const ref = useMask(formatCep);

  return (
    <>
      <label htmlFor={id}>CEP</label>
      <input
        {...props}
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        value={formatCep(value)}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorId}
        onChange={(event) => onChange(parseCep(event.currentTarget.value))}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <p id={errorId} role="alert">
        {errorMessage}
      </p>
    </>
  );
}
