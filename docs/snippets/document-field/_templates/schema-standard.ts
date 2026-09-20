import { toStandardSchema, @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";

/** A @@label@@ as a Standard Schema, with no schema library at all. */
export const @@kind@@Schema = toStandardSchema(@@validatorFn@@, {
  message: "Enter a valid @@label@@",@@validatorOptions@@
});

// Every form library takes it as is, the way it takes a Zod, Valibot or ArkType schema:
// <form.Field name="@@kind@@" validators={{ onChange: @@kind@@Schema }} />   (TanStack Form)

// On its own, it validates through the interface of the specification:
export function parse@@Name@@(value: unknown) {
  const result = @@kind@@Schema["~standard"].validate(value);

  // The specification allows an asynchronous validator; this one always answers right away.
  if (result instanceof Promise) throw new TypeError("Unexpected asynchronous validation");
  if (result.issues) throw new Error(result.issues[0]?.message);

  return result.value;
}
