import { @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

export const signupSchema = v.object({
  @@kind@@: v.pipe(v.string(), v.check(@@validatorLambda@@, "Enter a valid @@label@@")),
});

export type Signup = v.InferOutput<typeof signupSchema>;
