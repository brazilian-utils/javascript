import { CERTIDAO_BASE_LENGTH } from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCertidao } from "../is-valid-certidao/is-valid-certidao";
import { CERTIDAO_TYPES } from "./constants";

/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of the
 * codes 1 to 9. `parseCertidao` names the book of a matrícula with one of these, and
 * `isValidCertidao` accepts a list of them.
 */
export type CertidaoType =
	| "birth"
	| "marriage"
	| "religious-marriage"
	| "death"
	| "stillbirth"
	| "banns"
	| "other"
	| "emancipation"
	| "interdiction";

/** The fields `parseCertidao` reads out of the matrícula of a certidão de registro civil. */
export type Certidao = {
	/** The 6 digit CNS (Código Nacional de Serventia) of the serventia that issued the act. */
	registryCns: string;
	/** Acervo the book belongs to: "01" the serventia's own, "02" a collection it absorbed. */
	acervo: string;
	/** Service rendered by the serventia, "55" for registro civil das pessoas naturais. */
	service: string;
	/** Four digit year the act was recorded. */
	year: number;
	/** The book the act belongs to, as an English name. */
	type: CertidaoType;
	/** Raw book code, 1 to 9, as printed in the fifteenth position of the matrícula. */
	typeCode: number;
	/** The 5 digit book (livro) number, zero padded. */
	book: string;
	/** The 3 digit page (folha) number, zero padded. */
	page: string;
	/** The 7 digit term (termo) number, zero padded. */
	term: string;
	/** The 2 modulus 11 check digits of the matrícula. */
	checkDigits: string;
};

/**
 * Parses the matrícula of a certidão de registro civil into its fields.
 *
 * Accepts the same input forms as `isValidCertidao` and returns `null` when the matrícula is
 * not valid or when its book code is not one of the nine books defined by the Provimento, since
 * an unknown book cannot be named.
 *
 * @param {string|number} value - The matrícula value to be parsed.
 * @returns {Certidao | null} The parsed matrícula, or `null` when it is not valid.
 *
 * @example
 * ```typescript
 * parseCertidao("104539 01 55 2013 1 00012 021 0000123 21");
 * // { registryCns: "104539", acervo: "01", service: "55", year: 2013, type: "birth",
 * //   typeCode: 1, book: "00012", page: "021", term: "0000123", checkDigits: "21" }
 *
 * parseCertidao("invalid"); // null
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
export const parseCertidao = (value: string | number): Certidao | null => {
	if (!isValidCertidao(value)) return null;

	const digits = sanitizeToDigits(value);
	const typeCode = digits.charCodeAt(14) - 48;

	const type: CertidaoType | undefined = CERTIDAO_TYPES[typeCode - 1];

	if (type === undefined) return null;

	return {
		registryCns: digits.slice(0, 6),
		acervo: digits.slice(6, 8),
		service: digits.slice(8, 10),
		year: Number(digits.slice(10, 14)),
		type,
		typeCode,
		book: digits.slice(15, 20),
		page: digits.slice(20, 23),
		term: digits.slice(23, CERTIDAO_BASE_LENGTH),
		checkDigits: digits.slice(CERTIDAO_BASE_LENGTH),
	};
};
