import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

/** A CPF, reusable wherever a schema needs one. */
export const cpfSchema = v.pipe(
  v.string(),
  v.check((cpf) => isValidCpf(cpf), "Enter a valid CPF"),
);

export const signupSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Enter your name")),
  cpf: cpfSchema,
});

export type Signup = v.InferOutput<typeof signupSchema>;
