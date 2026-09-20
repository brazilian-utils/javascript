import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

export const signupSchema = z.object({
  cnpj: z.string().refine((cnpj) => isValidCnpj(cnpj, { version: 2 }), "Enter a valid CNPJ"),
});

export type Signup = z.infer<typeof signupSchema>;
