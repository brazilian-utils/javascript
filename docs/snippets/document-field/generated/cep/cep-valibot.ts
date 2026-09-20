import { isValidCep } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

export const signupSchema = v.object({
  cep: v.pipe(v.string(), v.check((cep) => isValidCep(cep), "Enter a valid CEP")),
});

export type Signup = v.InferOutput<typeof signupSchema>;
