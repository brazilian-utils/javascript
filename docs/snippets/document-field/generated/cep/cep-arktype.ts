import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

export const signupSchema = type({
  cep: type("string").narrow(
    (cep, ctx) => isValidCep(cep) || ctx.mustBe("a valid CEP"),
  ),
});

export type Signup = typeof signupSchema.infer;
