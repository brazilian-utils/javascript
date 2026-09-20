import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

/** A CEP, reusable wherever a schema needs one. */
export const cepSchema = z.string().refine(isValidCep, "Enter a valid CEP");

export const signupSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  cep: cepSchema,
});

export type Signup = z.infer<typeof signupSchema>;
