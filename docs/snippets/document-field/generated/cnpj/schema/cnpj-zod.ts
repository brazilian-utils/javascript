import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

/** A CNPJ, reusable wherever a schema needs one. */
export const cnpjSchema = z.string().refine((cnpj) => isValidCnpj(cnpj, { version: 2 }), "Enter a valid CNPJ");

export const signupSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  cnpj: cnpjSchema,
});

export type Signup = z.infer<typeof signupSchema>;
