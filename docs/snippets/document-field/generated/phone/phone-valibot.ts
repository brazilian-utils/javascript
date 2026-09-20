import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

/** A Phone, reusable wherever a schema needs one. */
export const phoneSchema = v.pipe(
  v.string(),
  v.check((phone) => isValidPhone(phone), "Enter a valid Phone"),
);

export const signupSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Enter your name")),
  phone: phoneSchema,
});

export type Signup = v.InferOutput<typeof signupSchema>;
