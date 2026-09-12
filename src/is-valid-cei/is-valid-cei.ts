import { calculateCeiCheckDigit } from "../_internals/calculate-cei-check-digit/calculate-cei-check-digit";
import { CEI_BASE_LENGTH, CEI_FORMAT_REGEX, CEI_LENGTH } from "../_internals/constants/cei";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates a CEI (Cadastro Específico do INSS) number.
 *
 * The CEI identifies an employer that has no CNPJ, such as a construction work or a rural
 * producer. It has 12 digits printed as "00.000.00000/00": 11 base digits and one check digit.
 * The check digit weights the base by 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4, adds the tens part of
 * that sum to its units part and takes the complement of the units digit of the result to 10,
 * mapping 10 back to 0. The CEI was replaced by the CNO for construction works and by the CAEPF
 * for individuals, but numbers already issued keep their meaning and their check digit.
 *
 * @param {string|number} value - The CEI value to be validated.
 * @returns {boolean} True if the CEI is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCei("11.583.00249/85"); // true
 * isValidCei("277297118187"); // true
 * isValidCei(249859674386); // true
 * isValidCei("24.985.96743/68"); // false (invalid check digit)
 * isValidCei("000000000000"); // false (repeated digits)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 * @see Based on: https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs
 * Second, independent reference implementation agreeing with the first.
 */
export const isValidCei = (value: string | number): boolean => {
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
