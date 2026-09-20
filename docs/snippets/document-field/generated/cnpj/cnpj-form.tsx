import { Controller, useForm } from "react-hook-form";
import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { CnpjField } from "./cnpj-field";

export function CnpjForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: { cnpj: "" },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="cnpj"
        control={control}
        rules={{
          required: "Enter a CNPJ",
          validate: (value) => isValidCnpj(value, { version: 2 }) || "Enter a valid CNPJ",
        }}
        render={({ field, fieldState }) => (
          <>
            <CnpjField
              {...field}
              aria-invalid={fieldState.invalid}
              aria-describedby="cnpj-error"
            />
            {/* On the page from the start, and announced when it gets its text: nothing moves
                focus to the field, so the message has to speak for itself. */}
            <p id="cnpj-error" role="alert">
              {fieldState.error?.message}
            </p>
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
