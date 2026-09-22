import { @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

/** A @@label@@, reusable wherever a schema needs one. */
export const @@kind@@Schema = z.string().refine(@@validatorArrow@@, "Enter a valid @@label@@");

export const signupSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  @@kind@@: @@kind@@Schema,
});

export type Signup = z.infer<typeof signupSchema>;
