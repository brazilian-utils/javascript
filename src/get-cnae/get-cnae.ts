import { CNAE_CODES } from "../_internals/constants/cnae";
import { CNAE_DESCRIPTIONS } from "../_internals/constants/cnae-descriptions";
import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CNAE_LENGTH } from "../is-valid-cnae/constants";
import { isValidCnae } from "../is-valid-cnae/is-valid-cnae";

/**
 * A CNAE (Classificação Nacional de Atividades Econômicas) subclass.
 */
export type Cnae = {
	/** The 7 digit subclass code, without the mask. Use `formatCnae` for the `NNNN-N/NN` form. */
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
 * A CNAE subclass code is always 7 digits and its leading zeros are part of it, so a value
 * written as bare digits is left padded with zeros to 7 whether it comes as a string or as a
 * number: `111301`, `"111301"` and `"0111301"` are the same code. A masked value already
 * carries its separators and is read as written.
 *
 * `code` comes back as those 7 bare digits, like every other lookup of this library; pass it to
 * `formatCnae` for the `NNNN-N/NN` form.
 *
 * @param {string|number} value - The CNAE code to look up, with or without the
 * `NNNN-N/NN` mask.
 * @returns {Cnae|null} The matching subclass, or null when the code is unknown or invalid,
 * which is exactly when `isValidCnae` returns false.
 *
 * @example
 * ```typescript
 * getCnae("6201-5/01"); // { code: "6201501", description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA" }
 * getCnae(111301); // { code: "0111301", description: "CULTIVO DE ARROZ" } (padded to 7 digits)
 * getCnae("111301"); // { code: "0111301", description: "CULTIVO DE ARROZ" } (padded to 7 digits)
 * getCnae("0000000"); // null
 * getCnae("0111abc301"); // null (not a documented form)
 * formatCnae(getCnae("6201501")?.code); // "6201-5/01" (the mask is the formatter's job)
 * getCnae(-111301); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 * @see Official: https://concla.ibge.gov.br/busca-online-cnae.html
 * CONCLA's CNAE search and structure browser, which publishes CNAE-Subclasses 2.3.
 */
export const getCnae = (value: string | number): Cnae | null => {
	if (!isValidCnae(value)) return null;

	const code = sanitizeToDigits(padLookupCode(value, CNAE_LENGTH));

	return { code, description: CNAE_DESCRIPTIONS[findCodeIndex(CNAE_CODES, code)] };
};
