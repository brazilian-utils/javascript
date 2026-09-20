import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

export const signupSchema = type({
  phone: type("string").narrow(
    (phone, ctx) => isValidPhone(phone) || ctx.mustBe("a valid Phone"),
  ),
});

export type Signup = typeof signupSchema.infer;
