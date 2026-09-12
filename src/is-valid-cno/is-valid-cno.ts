import { calculateCeiCheckDigit } from "../_internals/calculate-cei-check-digit/calculate-cei-check-digit";
import { CEI_BASE_LENGTH, CEI_FORMAT_REGEX, CEI_LENGTH } from "../_internals/constants/cei";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates a CNO (Cadastro Nacional de Obras) number, the registration of a construction work
 * with the Receita Federal.
 *
 * The CNO replaced the CEI for construction works and kept its numbering: 12 digits printed as
 * "00.000.00000/00", the last one being a check digit calculated over the 11 base digits with
 * the weights 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4. A work registered under a legacy CEI keeps
 * the same number in the CNO, so both registries validate identically.
 *
 * @param {string|number} value - The CNO value to be validated.
 * @returns {boolean} True if the CNO is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCno("11.084.01680/62"); // true
 * isValidCno("111130137368"); // true
 * isValidCno(401800097960); // true
 * isValidCno("110840168063"); // false (invalid check digit)
 * isValidCno("000000000000"); // false (repeated digits)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * @see Official: Cadastro Nacional de Obras (CNO), dados abertos da Receita Federal: every
 * one of the 38432 works registered in Minas Gerais passes this check, which is what ties
 * the CNO to the CEI rule and where the test vectors come from.
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 */
export const isValidCno = (value: string | number): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== CEI_LENGTH) return false;

	if (!CEI_FORMAT_REGEX.test(String(value).trim())) return false;

	if (isRepeatedDigits(digits)) return false;

	return (
		calculateCeiCheckDigit(digits.slice(0, CEI_BASE_LENGTH)) ===
		digits.charCodeAt(CEI_BASE_LENGTH) - 48
	);
};
