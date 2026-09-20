import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

export const signupSchema = v.object({
  cnpj: v.pipe(v.string(), v.check((cnpj) => isValidCnpj(cnpj, { version: 2 }), "Enter a valid CNPJ")),
});

export type Signup = v.InferOutput<typeof signupSchema>;
