import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { OBFUSCATED_PATTERN, PATTERN } from "./constants";

/** Options of `formatVoterId`. */
export type FormatVoterIdOptions = {
	/** Whether to left pad the value with zeros up to the 12 digits of a voter id (default: `false`). */
	pad?: boolean;
	/** Whether to hide the first 3 digits and the 2 check digits with `*` (default: `false`, read for truthiness). */
	obfuscate?: boolean;
};

/**
 * Formats a Brazilian voter id (título de eleitor) for display.
 *
 * Uses the 12-digit grouping "0000 0000 00 00". The TSE drops the leading zeros of the
 * sequential number when it issues a voter id, so an id can have fewer than 12 digits: by default
 * a shorter value is formatted from the left, as a partially typed id, and `pad: true` restores
 * the dropped zeros first, so `formatVoterId("123450159", { pad: true })` gives
 * "0001 2345 01 59", the grouping `isValidVoterId` checks the value against. Digits past the 12th
 * are dropped.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The voter id value to be formatted.
 * @param {FormatVoterIdOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - If true, left pads the value with zeros up to 12 digits,
 * restoring the leading zeros of a voter id issued without them.
 * @param {boolean} [options.obfuscate] - If truthy, hides the first 3 digits and the 2 check
 * digits. Read for truthiness, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted voter id string.
 *
 * @example
 * ```typescript
 * formatVoterId("123456780124"); // "1234 5678 01 24"
 * formatVoterId("123450159", { pad: true }); // "0001 2345 01 59"
 * formatVoterId("123456780124", { obfuscate: true }); // "***4 5678 01 **"
 * formatVoterId(-123456780124); // "" (not a non-negative safe integer)
 * ```
 *
 * No authority publishes a masking rule for the voter id, so `obfuscate` applies the one the Leis
 * de Diretrizes Orçamentárias set for publishing a CPF, a number with the same structure: the
 * first 3 digits and the 2 check digits are hidden, and the federative union code stays visible.
 *
 * Resolução TSE nº 23.659/2021, art. 36, gives the voter id "até 12 algarismos", its first eight
 * "sequenciados, desprezando-se, na emissão, os zeros à esquerda", so there is no 13-digit
 * grouping.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * Resolução TSE nº 23.659/2021, art. 36: "composto por até 12 algarismos", "os oito primeiros
 * algarismos serão sequenciados, desprezando-se, na emissão, os zeros à esquerda".
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm
 * Lei nº 14.194/2021 (LDO 2022), art. 149: the CPF of the terceirizados it publishes is disclosed
 * so as to "ocultar os três primeiros dígitos e os dois dígitos verificadores", the rule first set
 * by Lei nº 12.309/2010 (LDO 2011), art. 87, § 5º, and repeated by the LDOs after it: the CPF
 * rule `obfuscate` borrows.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15321.htm
 * Lei nº 15.321/2025, the LDO for 2026.
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const formatVoterId = (value: string | number, options?: FormatVoterIdOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeToDigits(value),
				pattern: (options?.obfuscate ?? false) ? OBFUSCATED_PATTERN : PATTERN,
			})
		: "";
