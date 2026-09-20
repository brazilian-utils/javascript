import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

/** A CPF, reusable wherever a schema needs one. */
export const cpfSchema = z.string().refine(isValidCpf, "Enter a valid CPF");

export const signupSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  cpf: cpfSchema,
});

export type Signup = z.infer<typeof signupSchema>;
