import { useId, type ComponentProps } from "react";
@@imports@@

@@mask@@

type @@Name@@FieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function @@Name@@Field({ value, onChange, ...props }: @@Name@@FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const valid = @@validator@@;
  const complete = valid || value.length === @@length@@;

  return (
    <>
      <label htmlFor={id}>@@label@@</label>
      <input
        {...props}
        id={id}
        inputMode="@@inputMode@@"
        autoComplete="@@autocomplete@@"
        placeholder="@@placeholder@@"
        value={value}
        aria-invalid={complete && !valid}
        // The message describes the field, next to whatever the form has to say about it.
        aria-describedby={[props["aria-describedby"], messageId].filter(Boolean).join(" ")}
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
      {/* A live region is announced when its text changes, so it stays on the page, empty. */}
      <output id={messageId} htmlFor={id}>
        {complete && (valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@")}
      </output>
    </>
  );
}
