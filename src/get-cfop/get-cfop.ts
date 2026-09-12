import { CFOP_TABLE } from "../_internals/constants/cfop";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * A CFOP (Código Fiscal de Operações e Prestações) code.
 */
export type Cfop = {
	/** The 4 digit CFOP code. */
	code: string;
	/** The official operation description. */
	description: string;
};

/**
 * Looks a CFOP (Código Fiscal de Operações e Prestações) code up in the official table.
 *
 * @param {string|number} value - The CFOP code to look up.
 * @returns {Cfop|null} The matching CFOP entry, or null when the code is unknown or
 * invalid.
 *
 * @example
 * ```typescript
 * getCfop("5102"); // { code: "5102", description: "Venda de mercadoria adquirida ou recebida de terceiros" }
 * getCfop("0000"); // null
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/AJ_007_01
 * @see Based on: https://raw.githubusercontent.com/jansenfelipe/cfop/master/cfop.csv
 * Community-maintained CSV mirror of the official CFOP table used to build `CFOP_TABLE`.
 */
export const getCfop = (value: string | number): Cfop | null => {
	if (isNullish(value)) return null;

	const digits = sanitizeToDigits(value);

	if (!(digits in CFOP_TABLE)) return null;

	return { code: digits, description: CFOP_TABLE[digits] };
};
