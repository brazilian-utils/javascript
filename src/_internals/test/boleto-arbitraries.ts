import * as fc from "fast-check";

import { assembleBoletoArrecadacao } from "../assemble-boleto-arrecadacao/assemble-boleto-arrecadacao";
import { assembleBoletoBancario } from "../assemble-boleto-bancario/assemble-boleto-bancario";
import { ARRECADACAO_SEGMENTS } from "../constants/arrecadacao";
import { digits } from "./arbitraries";

/** Arbitraries of valid boletos; see `document-arbitraries.ts`. */

/**
 * @param {"bancario" | "arrecadacao"} [type] The type of the boletos; bancário by default.
 * @returns {fc.Arbitrary<string>} Valid linhas digitáveis, unmasked.
 */
export const boletos = (type?: "bancario" | "arrecadacao"): fc.Arbitrary<string> =>
	type === "arrecadacao"
		? fc
				.record({
					segment: fc.constantFrom(...ARRECADACAO_SEGMENTS),
					useMod11: fc.boolean(),
					hasEffectiveValue: fc.boolean(),
					body: digits(40),
				})
				.map((parts) => assembleBoletoArrecadacao(parts))
		: fc
				.record({ field1: digits(9), field2: digits(10), field3: digits(10), tail: digits(15) })
				.map((parts) => assembleBoletoBancario(parts));
