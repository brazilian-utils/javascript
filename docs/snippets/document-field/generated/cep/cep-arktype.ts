import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { type } from "arktype";

/** A CEP, reusable wherever a schema needs one. */
export const cepSchema = type("string").narrow(
  (cep, ctx) => isValidCep(cep) || ctx.mustBe("a valid CEP"),
);

export const signupSchema = type({
  name: "string > 0",
  cep: cepSchema,
});

export type Signup = typeof signupSchema.infer;
