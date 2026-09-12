import { CNAE_SUBCLASSES } from "../_internals/constants/cnae";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { formatCnae } from "../format-cnae/format-cnae";

/**
 * A CNAE (Classificação Nacional de Atividades Econômicas) subclass.
 */
export type Cnae = {
	/** The subclass code formatted as `NNNN-N/NN`. */
	code: string;
	/** The official subclass description. */
	description: string;
};

/**
 * Looks a CNAE (Classificação Nacional de Atividades Econômicas) subclass code up in the
 * official CNAE 2.3 table.
 *
 * @param {string|number} value - The CNAE code to look up, with or without the
 * `NNNN-N/NN` mask.
 * @returns {Cnae|null} The matching subclass, or null when the code is unknown or invalid.
 *
 * @example
 * ```typescript
 * getCnae("6201501"); // { code: "6201-5/01", description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA" }
 * getCnae(111301); // { code: "0111-3/01", description: "CULTIVO DE ARROZ" } (a number is padded to 7 digits)
 * getCnae("0000000"); // null
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 */
export const getCnae = (value: string | number): Cnae | null => {
	if (isNullish(value)) return null;

	const digits =
		typeof value === "number" ? String(value).padStart(7, "0") : sanitizeToDigits(value);

	if (!(digits in CNAE_SUBCLASSES)) return null;

	return { code: formatCnae(digits), description: CNAE_SUBCLASSES[digits] };
};
