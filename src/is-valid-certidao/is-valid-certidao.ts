import {
	CERTIDAO_BASE_LENGTH,
	CERTIDAO_FORMAT_REGEX,
	CERTIDAO_LENGTH,
} from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CERTIDAO_TYPES } from "../parse-certidao/constants";
import { type CertidaoType } from "../parse-certidao/parse-certidao";

/** Options of `isValidCertidao`. */
export type IsValidCertidaoOptions = {
	/** Kinds of certidão (book types) that count as valid (default: all of them). */
	accept?: CertidaoType[];
};

const getCheckDigit = (value: string): number => {
	let weight = CERTIDAO_LENGTH - value.length;
	let sum = 0;

	for (let i = 0; i < value.length; i++) {
		sum += (value.charCodeAt(i) - 48) * weight;
		weight += 1;
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
 * The book-type digit (fifteenth position of the matrícula) always has to name one of the nine
 * books (see `CertidaoType`, reused from `parseCertidao`), so a matrícula whose digit is `0` is
 * rejected however good its check digits are, the same way `parseCertidao` returns `null` for
 * it. `options.accept` narrows that further to the listed types; when it is omitted, or when it
 * is not an array, every book type is accepted.
 *
 * Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can
 * hold, so a numeric argument is always rejected instead of being read as a rounded value.
 *
 * @param {string} value - The matrícula value to be validated.
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
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243 Código Nacional de Normas da
 * Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento CNJ nº 149/2023), art. 473
 * in the wording of the Provimento CN nº 182, de 17/09/2024: the in-force layout of the 32
 * digit matrícula.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311 Provimento CNJ nº 2, de 27/04/2009,
 * which instituted the modelos únicos de certidão and the matrícula (revoked; historical).
 * @see Based on: http://ghiorzi.org/DVnew.htm Worked example of the two check digits
 * (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const isValidCertidao = (value: string, options?: IsValidCertidaoOptions): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (!CERTIDAO_FORMAT_REGEX.test(value.trim())) return false;

	const base = digits.slice(0, CERTIDAO_BASE_LENGTH);
	const first = getCheckDigit(base);
	const second = getCheckDigit(`${base}${first}`);

	if (digits.slice(CERTIDAO_BASE_LENGTH) !== `${first}${second}`) return false;

	const typeCode = digits.charCodeAt(14) - 48;
	const type: CertidaoType | undefined = CERTIDAO_TYPES[typeCode - 1];

	if (type === undefined) return false;

	const accept = options?.accept;

	if (!Array.isArray(accept)) return true;

	return accept.includes(type);
};
