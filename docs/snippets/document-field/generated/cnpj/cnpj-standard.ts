import { toStandardSchema, isValidCnpj } from "@brazilian-utils/brazilian-utils";

// A Standard Schema for one field, with no schema library: every form library takes it as is,
// as it takes a Zod, Valibot or ArkType schema.
export const cnpjSchema = toStandardSchema(isValidCnpj, {
  message: "Enter a valid CNPJ",
  options: { version: 2 },
});
