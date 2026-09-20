import { useId, type ComponentProps } from "react";
import { formatCpf, parseCpf } from "@brazilian-utils/brazilian-utils";

type MaskParams = {
  /** The field the document is typed into. */
  input: HTMLInputElement;
  /** The `inputType` of the `input` event. */
  inputType?: string;
  /** The formatter of the document being typed. */
  format: (value: string) => string;
};

/**
 * Formats the document typed into `input` in place and keeps the caret next to
 * the character being edited, so typing, deleting or pasting anywhere works.
 * Returns the formatted value.
 */
export function mask({ input, inputType = "", format }: MaskParams): string {
  let value = input.value;
  let caret = input.selectionStart ?? value.length;

  // A deleted separator would come straight back: delete the character next to it.
  if (inputType.startsWith("delete") && format(value).length > value.length) {
    if (inputType === "deleteContentBackward") caret -= 1;
    value = value.slice(0, caret) + value.slice(caret + 1);
  }

  // Formatting what comes before the caret says where the caret goes.
  const position = format(value.slice(0, caret)).length;

  input.value = format(value);
  input.setSelectionRange(position, position);

  return input.value;
}

type CpfFieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** The CPF without its mask, the way the form holds it. */
  value: string;
  /** Called with the CPF without its mask. */
  onChange: (value: string) => void;
};

/** Masks a CPF while it is typed. Validation belongs to the form. */
export function CpfField({ value, onChange, ...props }: CpfFieldProps) {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>CPF</label>
      <input
        {...props}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={formatCpf(value)}
        onChange={(event) => {
          const masked = mask({
            input: event.currentTarget,
            inputType: (event.nativeEvent as InputEvent).inputType,
            format: formatCpf,
          });

          onChange(parseCpf(masked));
        }}
      />
    </>
  );
}
