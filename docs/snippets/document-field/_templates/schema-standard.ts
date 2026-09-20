import { toStandardSchema, @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";

// A Standard Schema for one field, with no schema library: every form library takes it as is,
// as it takes a Zod, Valibot or ArkType schema.
export const @@kind@@Schema = toStandardSchema(@@validatorFn@@, {
  message: "Enter a valid @@label@@",@@validatorOptions@@
});
