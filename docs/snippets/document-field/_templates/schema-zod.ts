import { @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import { z } from "zod";

export const signupSchema = z.object({
  @@kind@@: z.string().refine(@@validatorArrow@@, "Enter a valid @@label@@"),
});

export type Signup = z.infer<typeof signupSchema>;
