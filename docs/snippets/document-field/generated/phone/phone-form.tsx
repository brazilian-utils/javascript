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
        rules={{ validate: (value) => isValidPhone(value) || "Enter a valid Phone" }}
        render={({ field, fieldState }) => (
          <>
            <PhoneField {...field} aria-describedby="phone-error" />
            {/* On the page from the start, so a screen reader announces the message it gets. */}
            <p id="phone-error" role="alert">
              {fieldState.error?.message}
            </p>
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
