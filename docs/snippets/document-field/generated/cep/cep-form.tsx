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
        rules={{ validate: (value) => isValidCep(value) || "Enter a valid CEP" }}
        render={({ field, fieldState }) => (
          <>
            <CepField {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
