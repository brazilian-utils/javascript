import { Controller, useForm } from "react-hook-form";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

export function CpfForm() {
  const { control, handleSubmit } = useForm({ defaultValues: { cpf: "" } });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="cpf"
        control={control}
        rules={{ validate: (value) => isValidCpf(value) || "Enter a valid CPF" }}
        render={({ field, fieldState }) => (
          <>
            <CpfField {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
