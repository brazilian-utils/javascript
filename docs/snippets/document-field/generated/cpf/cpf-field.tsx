import { useId, type ComponentProps } from "react";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

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
  value: string;
  onChange: (value: string) => void;
};

export function CpfField({ value, onChange, ...props }: CpfFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const valid = isValidCpf(value);
  const complete = valid || value.length === 14;

  return (
    <>
      <label htmlFor={id}>CPF</label>
      <input
        {...props}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={value}
        aria-invalid={complete && !valid}
        // The message describes the field, next to whatever the form has to say about it.
        aria-describedby={[props["aria-describedby"], messageId].filter(Boolean).join(" ")}
        onChange={(event) =>
          onChange(
            mask({
              input: event.currentTarget,
              inputType: (event.nativeEvent as InputEvent).inputType,
              format: formatCpf,
            }),
          )
        }
      />
      {/* A live region is announced when its text changes, so it stays on the page, empty. */}
      <output id={messageId} htmlFor={id}>
        {complete && (valid ? "✓ Valid CPF" : "✗ Invalid CPF")}
      </output>
    </>
  );
}
