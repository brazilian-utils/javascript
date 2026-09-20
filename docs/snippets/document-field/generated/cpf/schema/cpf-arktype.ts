import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

/** A CPF, reusable wherever a schema needs one. */
export const cpfSchema = type("string").narrow(
  (cpf, ctx) => isValidCpf(cpf) || ctx.mustBe("a valid CPF"),
);

export const signupSchema = type({
  name: "string > 0",
  cpf: cpfSchema,
});

export type Signup = typeof signupSchema.infer;
