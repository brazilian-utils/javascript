import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

export const signupSchema = z.object({
  cep: z.string().refine(isValidCep, "Enter a valid CEP"),
});

export type Signup = z.infer<typeof signupSchema>;
