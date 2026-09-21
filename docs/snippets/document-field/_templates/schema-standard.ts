import { toStandardSchema, @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import { useField } from "vee-validate";

/** A @@label@@ as a Standard Schema, with no schema library at all. */
export const @@kind@@Schema = toStandardSchema(@@validatorFn@@, {
  message: "Enter a valid @@label@@",@@validatorOptions@@
});

/**
 * Every form library that speaks the interface takes it as it is. This is VeeValidate; TanStack
 * Form takes the same schema as `validators={{ onChange: @@kind@@Schema }}` on a field, and
 * react-hook-form through `standardSchemaResolver` once the schema covers the whole form.
 */
export function use@@Name@@Field() {
  return useField("@@kind@@", @@kind@@Schema);
}

/** On its own, it validates through the interface of the specification. */
export function parse@@Name@@(value: unknown) {
  const result = @@kind@@Schema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
