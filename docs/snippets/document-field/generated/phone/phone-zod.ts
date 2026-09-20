import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

export const signupSchema = z.object({
  phone: z.string().refine(isValidPhone, "Enter a valid Phone"),
});

export type Signup = z.infer<typeof signupSchema>;
