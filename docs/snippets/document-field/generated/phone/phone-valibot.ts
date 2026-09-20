import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import * as v from "valibot";

export const signupSchema = v.object({
  phone: v.pipe(v.string(), v.check((phone) => isValidPhone(phone), "Enter a valid Phone")),
});

export type Signup = v.InferOutput<typeof signupSchema>;
