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
          <>
            <PhoneField
              {...field}
              aria-invalid={fieldState.invalid}
              aria-describedby="phone-error"
            />
            {/* On the page from the start, and announced when it gets its text: nothing moves
                focus to the field, so the message has to speak for itself. */}
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
