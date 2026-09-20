import { @@validatorFn@@ } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

export const signupSchema = type({
  @@kind@@: type("string").narrow(
    (@@kind@@, ctx) => @@validatorCtx@@ || ctx.mustBe("a valid @@label@@"),
  ),
});

export type Signup = typeof signupSchema.infer;
