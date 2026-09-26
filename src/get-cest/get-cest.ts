import { CEST_SEGMENTS, CEST_TABLE } from "../_internals/constants/cest";
import { padLookupCode } from "../_internals/pad-lookup-code/pad-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCest } from "../is-valid-cest/is-valid-cest";

const CEST_LENGTH = 7;
const SEGMENT_LENGTH = 2;

/**
 * A CEST (Código Especificador da Substituição Tributária).
 */
export type Cest = {
	/** The 7 digit code, without the mask. Use `formatCest` for the `NN.NNN.NN` form. */
	code: string;
	/** The description of the goods, as the annex of Convênio ICMS 142/18 words it. */
	description: string;
	/** The name of the segment the first two digits stand for, from Anexo I of Convênio ICMS 142/18. */
	segment: string;
};

/**
 * Looks a CEST (Código Especificador da Substituição Tributária) up in the annexes of Convênio
 * ICMS 142/18.
 *
 * The table is Anexos II to XXVI of the consolidated text in force (last amended by Convênio
 * ICMS 180/24), and the segment names come from Anexo I. Only the wording in force of each item
 * is kept: a revoked item (`"03.001.00"`) gives `null`.
 *
 * A CEST has 7 digits: the first two are the segment, the third to the fifth the item of the
 * segment and the last two the specification of the item (cláusula sexta, IV). A string is only
 * read as a code when it is written in one of the documented forms: the 7 digits, or the
 * `NN.NNN.NN` form the annexes print, with a single separator between the groups and optional
 * surrounding whitespace. Anything else (`"abc0500100"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer,
 * since a sign, a decimal point or a rounded magnitude would otherwise be read as a code the
 * caller never wrote.
 *
 * The leading zero of segments 01 to 09 is part of the code, so a value written as bare digits
 * is left padded with zeros to 7 whether it comes as a string or as a number: `500100`,
 * `"500100"` and `"0500100"` are the same code. A masked value already carries its separators
 * and is read as written.
 *
 * @param {string|number} value - The CEST to look up, with or without the `NN.NNN.NN` mask,
 * e.g. `"05.001.00"`, `"0500100"` or `500100`.
 * @returns {Cest|null} The matching entry, or null when the code is unknown or invalid, which is
 * exactly when `isValidCest` returns false.
 *
 * @example
 * ```typescript
 * getCest("05.001.00"); // { code: "0500100", description: "Cimento", segment: "Cimentos" }
 * getCest("0500100"); // { code: "0500100", description: "Cimento", segment: "Cimentos" }
 * getCest(500100); // { code: "0500100", description: "Cimento", segment: "Cimentos" }
 * getCest("03.001.00"); // null (a revoked item)
 * getCest("0000000"); // null
 * getCest("abc0500100"); // null (not a documented form)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18
 * Convênio ICMS 142/18, the consolidated text: cláusula sexta, IV (the 7 digits), Anexo I (the
 * segments) and Anexos II to XXVI (the codes and their descriptions).
 */
export const getCest = (value: string | number): Cest | null => {
	if (!isValidCest(value)) return null;

	const code = sanitizeToDigits(padLookupCode(value, CEST_LENGTH));

	return {
		code,
		description: CEST_TABLE[code],
		segment: CEST_SEGMENTS[code.slice(0, SEGMENT_LENGTH)],
	};
};
