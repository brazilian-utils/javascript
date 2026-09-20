import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

export const signupSchema = v.object({
  cpf: v.pipe(v.string(), v.check((cpf) => isValidCpf(cpf), "Enter a valid CPF")),
});

export type Signup = v.InferOutput<typeof signupSchema>;
