import type { ComponentProps } from "react";
@@imports@@

@@mask@@

type @@Name@@FieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function @@Name@@Field({ value, onChange, ...props }: @@Name@@FieldProps) {
  const valid = @@validator@@;
  const complete = valid || value.length === @@length@@;

  return (
    <label>
      @@label@@
      <input
        {...props}
        inputMode="@@inputMode@@"
        placeholder="@@placeholder@@"
        value={value}
        aria-invalid={complete && !valid}
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
      {complete && <output>{valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@"}</output>}
    </label>
  );
}
