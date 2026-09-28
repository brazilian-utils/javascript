import { toStandardSchema, @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import { sValidator } from "@hono/standard-validator";
import { FieldApi, FormApi } from "@tanstack/form-core";
import { initTRPC } from "@trpc/server";
import { useField } from "vee-validate";

const isValid = @@standardValidator@@;

/** A @@label@@ as a Standard Schema, with no schema library at all. */
export const @@kind@@Schema = toStandardSchema<string>(isValid, {
  message: "Enter a valid @@label@@",
});

// Everything that speaks the interface takes it as it is, next to a Zod, Valibot or ArkType
// schema. A few of them, all with the same @@kind@@Schema:

/** VeeValidate: the rules of a field. */
export const use@@Name@@Field = () => useField("@@kind@@", @@kind@@Schema);

/** TanStack Form: a field's validator, `validators={{ onChange: @@kind@@Schema }}`. */
export const @@kind@@Field = new FieldApi({
  form: new FormApi({ defaultValues: { @@kind@@: "" } }),
  name: "@@kind@@",
  validators: { onChange: @@kind@@Schema },
});

/** tRPC: what a procedure takes. */
export const @@kind@@Procedure = initTRPC
  .create()
  .procedure.input(@@kind@@Schema)
  .query(({ input }) => input);

/** Hono: what a route takes. */
export const @@kind@@Route = sValidator("param", @@kind@@Schema);

// react-hook-form takes one through `standardSchemaResolver`, once the schema covers the whole
// form: `useForm({ resolver: standardSchemaResolver(signupSchema) })`.
