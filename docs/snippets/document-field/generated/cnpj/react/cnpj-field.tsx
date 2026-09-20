import { useId, type ComponentProps } from "react";
import { formatCnpj, parseCnpj } from "@brazilian-utils/brazilian-utils";
import { useMask } from "./use-mask";

type CnpjFieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** The CNPJ without its mask, the way the form holds it. */
  value: string;
  /** Called with the CNPJ without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** Masks a CNPJ while it is typed. Validation belongs to the form. */
export function CnpjField({ value, onChange, errorMessage, ...props }: CnpjFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const maskValue = useMask((value: string) => formatCnpj(value, { version: 2 }));

  return (
    <>
      <label htmlFor={id}>CNPJ</label>
      <input
        {...props}
        id={id}
        inputMode="text"
        autoComplete="off"
        placeholder="00.ABC.000/0001-00"
        value={formatCnpj(value, { version: 2 })}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorId}
        onChange={(event) => onChange(parseCnpj(maskValue(event), { version: 2 }))}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <p id={errorId} role="alert">
        {errorMessage}
      </p>
    </>
  );
}
