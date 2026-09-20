import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

/** A CNPJ, reusable wherever a schema needs one. */
export const cnpjSchema = v.pipe(
  v.string(),
  v.check((cnpj) => isValidCnpj(cnpj, { version: 2 }), "Enter a valid CNPJ"),
);

export const signupSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Enter your name")),
  cnpj: cnpjSchema,
});

export type Signup = v.InferOutput<typeof signupSchema>;
