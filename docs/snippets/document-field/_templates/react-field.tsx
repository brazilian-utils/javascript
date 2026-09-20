import { useId, type ComponentProps } from "react";
@@imports@@

@@mask@@

type @@Name@@FieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function @@Name@@Field({ value, onChange, ...props }: @@Name@@FieldProps) {
  // The message is tied to the field, so a screen reader reads it with the field.
  const messageId = useId();
  const valid = @@validator@@;
  const complete = valid || value.length === @@length@@;

  return (
    <label>
      @@label@@
      <input
        {...props}
        inputMode="@@inputMode@@"
        autoComplete="@@autocomplete@@"
        placeholder="@@placeholder@@"
        value={value}
        aria-invalid={complete && !valid}
        aria-describedby={complete ? messageId : undefined}
        onChange={(event) =>
          onChange(
            mask({
              input: event.currentTarget,
              inputType: (event.nativeEvent as InputEvent).inputType,
              format: @@format@@,
            }),
          )
        }
      />
      {complete && (
        <output id={messageId}>{valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@"}</output>
      )}
    </label>
  );
}
