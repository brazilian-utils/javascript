import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

/** A Phone, reusable wherever a schema needs one. */
export const phoneSchema = type("string").narrow(
  (phone, ctx) => isValidPhone(phone) || ctx.mustBe("a valid Phone"),
);

export const signupSchema = type({
  name: "string > 0",
  phone: phoneSchema,
});

export type Signup = typeof signupSchema.infer;
