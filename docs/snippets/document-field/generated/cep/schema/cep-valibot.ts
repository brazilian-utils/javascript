import { isValidCep } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

/** A CEP, reusable wherever a schema needs one. */
export const cepSchema = v.pipe(
  v.string(),
  v.check((cep) => isValidCep(cep), "Enter a valid CEP"),
);

export const signupSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Enter your name")),
  cep: cepSchema,
});

export type Signup = v.InferOutput<typeof signupSchema>;
