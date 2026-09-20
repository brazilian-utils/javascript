import { toStandardSchema, isValidPhone } from "@brazilian-utils/brazilian-utils";

/** A Phone as a Standard Schema, with no schema library at all. */
export const phoneSchema = toStandardSchema(isValidPhone, {
  message: "Enter a valid Phone",
});

// Every form library takes it as is, the way it takes a Zod, Valibot or ArkType schema:
// <form.Field name="phone" validators={{ onChange: phoneSchema }} />   (TanStack Form)

// On its own, it validates through the interface of the specification:
export function parsePhone(value: unknown) {
  const result = phoneSchema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
