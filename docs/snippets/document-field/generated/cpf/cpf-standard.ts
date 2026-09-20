import { toStandardSchema, isValidCpf } from "@brazilian-utils/brazilian-utils";

// A Standard Schema for one field, with no schema library: every form library takes it as is,
// as it takes a Zod, Valibot or ArkType schema.
export const cpfSchema = toStandardSchema(isValidCpf, {
  message: "Enter a valid CPF",
});
