import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

export const signupSchema = type({
  cpf: type("string").narrow(
    (cpf, ctx) => isValidCpf(cpf) || ctx.mustBe("a valid CPF"),
  ),
});

export type Signup = typeof signupSchema.infer;
