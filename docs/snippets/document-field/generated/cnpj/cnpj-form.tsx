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
        rules={{ validate: (value) => isValidCnpj(value, { version: 2 }) || "Enter a valid CNPJ" }}
        render={({ field, fieldState }) => (
          <>
            <CnpjField {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
