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
        rules={{
          required: "Enter a @@label@@",
          validate: (value) => @@validator@@ || "Enter a valid @@label@@",
        }}
        render={({ field, fieldState }) => (
          <>
            <@@Name@@Field
              {...field}
              aria-invalid={fieldState.invalid}
              aria-describedby="@@kind@@-error"
            />
            {/* On the page from the start, and announced when it gets its text: nothing moves
                focus to the field, so the message has to speak for itself. */}
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
