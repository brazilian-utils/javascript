import { Controller, useForm } from "react-hook-form";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

type SignupValues = {
  cpf: string;
};

export function SignupForm() {
  const { control, handleSubmit } = useForm<SignupValues>({
    defaultValues: { cpf: "" },
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="cpf"
        control={control}
        rules={{ validate: (cpf) => isValidCpf(cpf) || "Enter a valid CPF" }}
        render={({ field, fieldState }) => (
          <>
            <CpfField {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />
      <button type="submit">Sign up</button>
    </form>
  );
}
