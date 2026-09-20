import { Controller, useForm } from "react-hook-form";
import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { CepField } from "./cep-field";

export function CepForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: { cep: "" },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="cep"
        control={control}
        rules={{
          required: "Enter a CEP",
          validate: (value) => isValidCep(value) || "Enter a valid CEP",
        }}
        render={({ field, fieldState }) => (
          <>
            <CepField
              {...field}
              aria-invalid={fieldState.invalid}
              aria-describedby="cep-error"
            />
            {/* On the page from the start, and announced when it gets its text: nothing moves
                focus to the field, so the message has to speak for itself. */}
            <p id="cep-error" role="alert">
              {fieldState.error?.message}
            </p>
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
