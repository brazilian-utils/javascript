import {
	CERTIDAO_BASE_LENGTH,
	CERTIDAO_FORMAT_REGEX,
	CERTIDAO_LENGTH,
	CERTIDAO_SERVICE_CODE,
} from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CERTIDAO_TYPES } from "../get-certidao-info/constants";
import { type CertidaoType } from "../get-certidao-info/get-certidao-info";

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
 * printed as "000000 00 00 0000 0 00000 000 0000000 00". The serviço is fixed at `55`, the code
 * art. 473, III assigns to the registro civil das pessoas naturais, so a matrícula carrying any
 * other pair there is rejected. Both check digits are modulus 11: the
 * first weights the 30 base digits by 2, 3, ... 10, 0, 1, 2, ... restarting the cycle every 11
 * digits, the second weights the 31 digits that include the first check digit by 1, 2, ... 10,
 * 0, 1, ... In both passes the check digit is the remainder itself, with a remainder of 10 read
 * as 1.
 *
 * The book-type digit (fifteenth position of the matrícula) always has to name one of the nine
 * books (see `CertidaoType`, reused from `getCertidaoInfo`), so a matrícula whose digit is `0` is
 * rejected however good its check digits are, the same way `getCertidaoInfo` returns `null` for
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
 * isValidCertidao("09400301542011100110002005191744"); // false (serviço is not 55)
 * isValidCertidao("123456"); // false (wrong length)
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["birth"] }); // true
 * isValidCertidao("104539 01 55 2013 1 00012 021 0000123 21", { accept: ["death"] }); // false
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Código Nacional de Normas da Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento
 * CNJ nº 149/2023), art. 473 as currently published: the in-force layout of the 32 digit
 * matrícula. Inciso II and §§ 1º and 3º to 5º carry the redação of the Provimento CN nº 237, de
 * 13/07/2026; the rest of the article, § 2º included, and the digit layout this library depends
 * on, come from the Provimento CN nº 182, de 17/09/2024.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311
 * Provimento CNJ nº 2, de 27/04/2009, art. 1º and 2º, which instituted the modelos únicos de
 * certidão and ordered that "as certidões passarão a consignar matrícula que identifica o código
 * nacional da serventia, o código do acervo, o tipo do serviço prestado, o tipo do livro, o número
 * do livro, o número da folha, o número do termo e o digito verificador" (revoked; historical).
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1310
 * Provimento CNJ nº 3, de 17/11/2009, art. 7º, which is where that matrícula first got its digit
 * structure: "a matrícula, de inserção obrigatória nas certidões (primeira e demais vias) emitidas
 * pelos Cartórios de Registro Civil das Pessoas Naturais a partir de 1º de janeiro de 2010, é
 * formada pelos seguintes elementos", incisos I to IX fixing the same 6 + 2 + 2 + 4 + 1 + 5 + 3 +
 * 7 + 2 positions art. 473 carries today (revoked; historical).
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Worked example of the two check digits (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const isValidCertidao = (value: string, options?: IsValidCertidaoOptions): boolean => {
	if (typeof value !== "string") return false;

	const digits = sanitizeToDigits(value);

	if (!CERTIDAO_FORMAT_REGEX.test(value.trim())) return false;

	if (digits.slice(8, 10) !== CERTIDAO_SERVICE_CODE) return false;

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
