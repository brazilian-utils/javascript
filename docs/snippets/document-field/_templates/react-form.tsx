import { Controller, useForm } from "react-hook-form";
@@formImports@@
import { @@Name@@Field } from "./@@kind@@-field";

export function @@Name@@Form() {
  const { control, handleSubmit } = useForm({ defaultValues: { @@kind@@: "" } });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="@@kind@@"
        control={control}
        rules={{ validate: (value) => @@validator@@ || "Enter a valid @@label@@" }}
        render={({ field, fieldState }) => (
          <>
            <@@Name@@Field {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
