import { Controller, useForm } from "react-hook-form";
@@formImports@@
import { @@Name@@Field } from "./@@kind@@-field";

export function @@Name@@Form() {
  const { control, handleSubmit } = useForm({
    defaultValues: { @@kind@@: "" },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="@@kind@@"
        control={control}
        rules={{ validate: (value) => @@validator@@ || "Enter a valid @@label@@" }}
        render={({ field, fieldState }) => (
          <>
            <@@Name@@Field {...field} aria-describedby="@@kind@@-error" />
            {/* On the page from the start, so a screen reader announces the message it gets. */}
            <p id="@@kind@@-error" role="alert">
              {fieldState.error?.message}
            </p>
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
