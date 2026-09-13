import { CNAE_FORMAT_REGEX, CNAE_SUBCLASSES } from "../_internals/constants/cnae";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { formatCnae } from "../format-cnae/format-cnae";

const CNAE_LENGTH = 7;

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
 * official CNAE-Subclasses 2.3 table, the current subclass revision of CNAE 2.0.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 7
 * digits, or the `NNNN-N/NN` mask, with a single separator (space, `.`, `-` or `/`) between the groups and optional
 * surrounding whitespace. Anything else (`"0111abc301"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
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
 * getCnae("0111abc301"); // null (not a documented form)
 * getCnae(-111301); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 * @see Official: https://concla.ibge.gov.br/busca-online-cnae.html
 * CONCLA's CNAE search and structure browser, which publishes CNAE-Subclasses 2.3.
 */
export const getCnae = (value: string | number): Cnae | null => {
	if (!isLookupCode(value)) return null;

	const subclass =
		typeof value === "number" ? String(value).padStart(CNAE_LENGTH, "0") : value.trim();

	if (!CNAE_FORMAT_REGEX.test(subclass)) return null;

	const digits = sanitizeToDigits(subclass);
	const description = CNAE_SUBCLASSES[digits];

	if (description === undefined) return null;

	return { code: formatCnae(digits), description };
};
