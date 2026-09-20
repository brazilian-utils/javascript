import { toStandardSchema, isValidCep } from "@brazilian-utils/brazilian-utils";

// A Standard Schema for one field, with no schema library: every form library takes it as is,
// as it takes a Zod, Valibot or ArkType schema.
export const cepSchema = toStandardSchema(isValidCep, {
  message: "Enter a valid CEP",
});
