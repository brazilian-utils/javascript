import { useId, type ComponentProps } from "react";
import { formatCpf, parseCpf } from "@brazilian-utils/brazilian-utils";
import { useMask } from "./use-mask";

type CpfFieldProps = Omit<ComponentProps<"input">, "value" | "onChange" | "ref"> & {
  /** The CPF without its mask, the way the form holds it. */
  value: string;
  /** Called with the CPF without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** Masks a CPF while it is typed. Validation belongs to the form. */
export function CpfField({ value, onChange, errorMessage, ...props }: CpfFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const ref = useMask(formatCpf);

  return (
    <>
      <label htmlFor={id}>CPF</label>
      <input
        {...props}
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={formatCpf(value)}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorId}
        onChange={(event) => onChange(parseCpf(event.currentTarget.value))}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <p id={errorId} role="alert">
        {errorMessage}
      </p>
    </>
  );
}
