import { useId, type ComponentProps } from "react";
import { formatPhone, parsePhone } from "@brazilian-utils/brazilian-utils";
import { useMask } from "./use-mask";

type PhoneFieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** The Phone without its mask, the way the form holds it. */
  value: string;
  /** Called with the Phone without its mask. */
  onChange: (value: string) => void;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
};

/** Masks a Phone while it is typed. Validation belongs to the form. */
export function PhoneField({ value, onChange, errorMessage, ...props }: PhoneFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const maskValue = useMask((value: string) => formatPhone(value, { mask: "nanp" }));

  return (
    <>
      <label htmlFor={id}>Phone</label>
      <input
        {...props}
        id={id}
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(00) 00000-0000"
        value={formatPhone(value, { mask: "nanp" })}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorId}
        onChange={(event) => onChange(parsePhone(maskValue(event)))}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <p id={errorId} role="alert">
        {errorMessage}
      </p>
    </>
  );
}
