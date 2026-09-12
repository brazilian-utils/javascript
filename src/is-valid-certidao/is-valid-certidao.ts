import {
	CERTIDAO_BASE_LENGTH,
	CERTIDAO_FORMAT_REGEX,
	CERTIDAO_LENGTH,
} from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CERTIDAO_TYPES } from "../parse-certidao/constants";
import type { CertidaoType } from "../parse-certidao/parse-certidao";

export type IsValidCertidaoOptions = {
	/** Kinds of certidão (book types) that count as valid (default: all of them). */
	accept?: CertidaoType[];
};

const getCheckDigit = (value: string): number => {
	let weight = CERTIDAO_LENGTH - value.length;
	let sum = 0;

	for (let i = 0; i < value.length; i++) {
		sum += (value.charCodeAt(i) - 48) * weight;
		weight = weight < 10 ? weight + 1 : 0;
	}

	const remainder = sum % 11;

	return remainder === 10 ? 1 : remainder;
};

/**
 * Validates the matrícula of a certidão de registro civil (nascimento, casamento, óbito and the
 * other acts kept by a serventia de registro civil das pessoas naturais).
 *
 * The matrícula has 32 digits laid out as 6 (CNS da serventia) + 2 (acervo) + 2 (serviço) +
 * 4 (ano) + 1 (tipo do livro) + 5 (livro) + 3 (folha) + 7 (termo) + 2 (dígitos verificadores),
 * printed as "000000 00 00 0000 0 00000 000 0000000 00". Both check digits are modulus 11: the
 * first weights the 30 base digits by 2, 3, ... 10, 0, 1, 2, ... restarting the cycle every 11
 * digits, the second weights the 31 digits that include the first check digit by 1, 2, ... 10,
 * 0, 1, ... In both passes the check digit is the remainder itself, with a remainder of 10 read
 * as 1.
 *
 * `options.accept` restricts which of the nine books (see `CertidaoType`, reused from
 * `parseCertidao`) count as valid: when given, the book-type digit (fifteenth position of the
 * matrícula) must map to one of the listed types, so a matrícula whose digit is `0` or greater
 * than `9` (not one of the nine defined books) is also rejected. When omitted, every book type
 * is accepted and the digit is not otherwise checked, matching the previous behavior.
 *
 * @param {string|number} value - The matrícula value to be validated.
 * @param {IsValidCertidaoOptions} [options] - Optional validation options.
 * @param {CertidaoType[]} [options.accept] - The book types to accept. Defaults to all of them.
 * @returns {boolean} True if the matrícula is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21"); // true
 * isValidCertidao("09430001552010100020112000012087"); // true
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 22"); // false (invalid check digits)
 * isValidCertidao("123456"); // false (wrong length)
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["birth"] }); // true
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["death"] }); // false
 * ```
 *
 * @see Official: Provimento CNJ 46/2015, art. 1º and Anexo (Código Nacional de Serventias).
 * @see Based on: http://ghiorzi.org/DVnew.htm Worked example of the two check digits
 * (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const isValidCertidao = (
	value: string | number,
	options?: IsValidCertidaoOptions,
): boolean => {
	if (typeof value !== "string" && typeof value !== "number") return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== CERTIDAO_LENGTH) return false;

	if (!CERTIDAO_FORMAT_REGEX.test(String(value).trim())) return false;

	const base = digits.slice(0, CERTIDAO_BASE_LENGTH);
	const first = getCheckDigit(base);
	const second = getCheckDigit(`${base}${first}`);

	if (digits.slice(CERTIDAO_BASE_LENGTH) !== `${first}${second}`) return false;

	const accept = options?.accept;

	if (!Array.isArray(accept)) return true;

	const typeCode = digits.charCodeAt(14) - 48;
	const type: CertidaoType | undefined = CERTIDAO_TYPES[typeCode - 1];

	return type !== undefined && accept.includes(type);
};
