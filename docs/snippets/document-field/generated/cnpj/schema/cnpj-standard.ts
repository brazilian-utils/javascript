import { toStandardSchema, isValidCnpj } from "@brazilian-utils/brazilian-utils";

/** A CNPJ as a Standard Schema, with no schema library at all. */
export const cnpjSchema = toStandardSchema(isValidCnpj, {
  message: "Enter a valid CNPJ",
  options: { version: 2 },
});

// Every form library takes it as is, the way it takes a Zod, Valibot or ArkType schema:
// <form.Field name="cnpj" validators={{ onChange: cnpjSchema }} />   (TanStack Form)

// On its own, it validates through the interface of the specification:
export function parseCnpj(value: unknown) {
  const result = cnpjSchema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
