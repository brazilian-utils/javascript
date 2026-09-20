import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

export const signupSchema = z.object({
  cpf: z.string().refine(isValidCpf, "Enter a valid CPF"),
});

export type Signup = z.infer<typeof signupSchema>;
