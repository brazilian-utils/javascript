import { useId, type ComponentProps } from "react";
@@fieldImports@@

@@mask@@

type @@Name@@FieldProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  /** The @@label@@ without its mask, the way the form holds it. */
  value: string;
  /** Called with the @@label@@ without its mask. */
  onChange: (value: string) => void;
};

/** Masks a @@label@@ while it is typed. Validation belongs to the form. */
export function @@Name@@Field({ value, onChange, ...props }: @@Name@@FieldProps) {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>@@label@@</label>
      <input
        {...props}
        id={id}
        inputMode="@@inputMode@@"
        autoComplete="@@autocomplete@@"
        placeholder="@@placeholder@@"
        value={@@formatValue@@}
        onChange={(event) => {
          const masked = mask({
            input: event.currentTarget,
            inputType: (event.nativeEvent as InputEvent).inputType,
            format: @@format@@,
          });

          onChange(@@parseMaskedVar@@);
        }}
      />
    </>
  );
}
