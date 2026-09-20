import { useId, type ComponentProps } from "react";
import { formatPhone, isValidPhone } from "@brazilian-utils/brazilian-utils";

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
  value: string;
  onChange: (value: string) => void;
};

export function PhoneField({ value, onChange, ...props }: PhoneFieldProps) {
  // The message is tied to the field, so a screen reader reads it with the field.
  const messageId = useId();
  const valid = isValidPhone(value);
  const complete = valid || value.length === 15;

  return (
    <label>
      Phone
      <input
        {...props}
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(00) 00000-0000"
        value={value}
        aria-invalid={complete && !valid}
        aria-describedby={complete ? messageId : undefined}
        onChange={(event) =>
          onChange(
            mask({
              input: event.currentTarget,
              inputType: (event.nativeEvent as InputEvent).inputType,
              format: (value) => formatPhone(value, { mask: "nanp" }),
            }),
          )
        }
      />
      {complete && (
        <output id={messageId}>{valid ? "✓ Valid Phone" : "✗ Invalid Phone"}</output>
      )}
    </label>
  );
}
