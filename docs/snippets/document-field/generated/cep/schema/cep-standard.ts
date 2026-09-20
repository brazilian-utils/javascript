import { toStandardSchema, isValidCep } from "@brazilian-utils/brazilian-utils";

/** A CEP as a Standard Schema, with no schema library at all. */
export const cepSchema = toStandardSchema(isValidCep, {
  message: "Enter a valid CEP",
});

// Every form library takes it as is, the way it takes a Zod, Valibot or ArkType schema:
// <form.Field name="cep" validators={{ onChange: cepSchema }} />   (TanStack Form)

// On its own, it validates through the interface of the specification:
export function parseCep(value: unknown) {
  const result = cepSchema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
