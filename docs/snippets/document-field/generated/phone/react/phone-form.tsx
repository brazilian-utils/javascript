import { Controller, useForm } from "react-hook-form";
import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { PhoneField } from "./phone-field";

export function PhoneForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: { phone: "" },
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <Controller
        name="phone"
        control={control}
        rules={{
          required: "Enter a Phone",
          validate: (value) => isValidPhone(value) || "Enter a valid Phone",
        }}
        render={({ field, fieldState }) => (
          <PhoneField {...field} errorMessage={fieldState.error?.message} />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
