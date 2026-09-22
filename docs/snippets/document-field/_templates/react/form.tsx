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
          <@@Name@@Field {...field} errorMessage={fieldState.error?.message} />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
