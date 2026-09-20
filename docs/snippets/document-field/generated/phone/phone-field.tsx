import { useId, type ComponentProps } from "react";
import { formatPhone, parsePhone } from "@brazilian-utils/brazilian-utils";

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

type PhoneFieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** The Phone without its mask, the way the form holds it. */
  value: string;
  /** Called with the Phone without its mask. */
  onChange: (value: string) => void;
};

/** Masks a Phone while it is typed. Validation belongs to the form. */
export function PhoneField({ value, onChange, ...props }: PhoneFieldProps) {
  const id = useId();

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
        onChange={(event) => {
          const masked = mask({
            input: event.currentTarget,
            inputType: (event.nativeEvent as InputEvent).inputType,
            format: (value) => formatPhone(value, { mask: "nanp" }),
          });

          onChange(parsePhone(masked));
        }}
      />
    </>
  );
}
