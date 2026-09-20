import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

/** A CNPJ, reusable wherever a schema needs one. */
export const cnpjSchema = type("string").narrow(
  (cnpj, ctx) => isValidCnpj(cnpj, { version: 2 }) || ctx.mustBe("a valid CNPJ"),
);

export const signupSchema = type({
  name: "string > 0",
  cnpj: cnpjSchema,
});

export type Signup = typeof signupSchema.infer;
