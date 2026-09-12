import { calculateCeiCheckDigit } from "../calculate-cei-check-digit/calculate-cei-check-digit";
import { CEI_BASE_LENGTH, CEI_FORMAT_REGEX } from "../constants/cei";
import { isRepeatedDigits } from "../is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

/**
 * Validates a number that follows the CEI (Cadastro Específico do INSS) numbering, which the
 * CNO (Cadastro Nacional de Obras) kept when it replaced the CEI for construction works.
 *
 * The number has 12 digits printed as "00.000.00000/00": 11 base digits and one check digit.
 * The check digit weights the base by 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4, adds the tens part of
 * that sum to its units part and takes the complement of the units digit of the result to 10,
 * mapping 10 back to 0.
 *
 * @param {string|number} value - The CEI or CNO value to be validated.
 * @returns {boolean} True if the value is a valid CEI or CNO number, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCeiCnoNumber("11.583.00249/85"); // true
 * isValidCeiCnoNumber("277297118187"); // true
 * isValidCeiCnoNumber(249859674386); // true
 * isValidCeiCnoNumber("24.985.96743/68"); // false (invalid check digit)
 * isValidCeiCnoNumber("000000000000"); // false (repeated digits)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 * @see Based on: https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs
 * Second, independent reference implementation agreeing with the first.
 */
export const isValidCeiCnoNumber = (value: string | number): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (!CEI_FORMAT_REGEX.test(String(value).trim())) return false;

	if (isRepeatedDigits(digits)) return false;

	return (
		calculateCeiCheckDigit(digits.slice(0, CEI_BASE_LENGTH)) ===
		digits.charCodeAt(CEI_BASE_LENGTH) - 48
	);
};
