import { CEP_LENGTH } from "../_internals/constants/cep";
import { CEP_RANGES } from "../_internals/constants/cep-ranges";

/**
 * Generates a random Brazilian CEP (postal code).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 * A CEP has no check digit, so the CEP is drawn inside the ranges the Correios assign to the
 * states, each CEP with the same chance: it always belongs to a state, so `getStateByCep` never
 * answers `null` for it. `00000-000` to `00999-999` and `78900-000` to `78999-999`, which no state
 * owns, are never generated. Up to 2.4.0 any 8 digit string could come out, about 1 in 90 of them
 * (1.1%) in one of those two ranges. A range is the block a state owns, not a promise that every
 * CEP in it is in use, so the CEP generated may not be the CEP of a real address.
 *
 * @returns {string} A random 8 digit CEP without formatting.
 *
 * @example
 * ```typescript
 * generateCep(); // "01310930"
 * getStateByCep(generateCep()) !== null; // true
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 * The ranges the CEP is drawn in.
 */
export const generateCep = (): string => {
	const total = CEP_RANGES.reduce((sum, range) => sum + range.end - range.start + 1, 0);
	let offset = Math.floor(Math.random() * total);
	let cep = CEP_RANGES[0].start;

	for (const range of CEP_RANGES) {
		const size = range.end - range.start + 1;

		if (offset < size) {
			cep = range.start + offset;
			break;
		}

		offset -= size;
	}

	return String(cep).padStart(CEP_LENGTH, "0");
};
