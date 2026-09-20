import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

export const signupSchema = type({
  cnpj: type("string").narrow(
    (cnpj, ctx) => isValidCnpj(cnpj, { version: 2 }) || ctx.mustBe("a valid CNPJ"),
  ),
});

export type Signup = typeof signupSchema.infer;
