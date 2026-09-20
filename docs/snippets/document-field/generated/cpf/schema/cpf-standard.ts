import { toStandardSchema, isValidCpf } from "@brazilian-utils/brazilian-utils";

/** A CPF as a Standard Schema, with no schema library at all. */
export const cpfSchema = toStandardSchema(isValidCpf, {
  message: "Enter a valid CPF",
});

// Every form library takes it as is, the way it takes a Zod, Valibot or ArkType schema:
// <form.Field name="cpf" validators={{ onChange: cpfSchema }} />   (TanStack Form)

// On its own, it validates through the interface of the specification:
export function parseCpf(value: unknown) {
  const result = cpfSchema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
