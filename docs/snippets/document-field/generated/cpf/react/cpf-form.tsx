import { Controller, useForm } from "react-hook-form";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

export function CpfForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: { cpf: "" },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="cpf"
        control={control}
        rules={{
          required: "Enter a CPF",
          validate: (value) => isValidCpf(value) || "Enter a valid CPF",
        }}
        render={({ field, fieldState }) => (
          <CpfField {...field} errorMessage={fieldState.error?.message} />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
