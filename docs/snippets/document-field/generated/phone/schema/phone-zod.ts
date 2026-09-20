import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

/** A Phone, reusable wherever a schema needs one. */
export const phoneSchema = z.string().refine(isValidPhone, "Enter a valid Phone");

export const signupSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  phone: phoneSchema,
});

export type Signup = z.infer<typeof signupSchema>;
