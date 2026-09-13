import { CERTIDAO_BASE_LENGTH } from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCertidao } from "../is-valid-certidao/is-valid-certidao";
import { CERTIDAO_TYPES } from "./constants";

/**
 * The nine books (tipo do livro) a matrícula de registro civil can point to, in the order of the
 * codes 1 to 9. `parseCertidao` names the book of a matrícula with one of these, and
 * `isValidCertidao` accepts a list of them.
 *
 * The in-force art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de Justiça
 * lists only the codes 1 to 7. The codes 8 (`"emancipation"`) and 9 (`"interdiction"`) come from
 * the Anexo IV of the revoked Provimento CNJ nº 63/2017 and are kept because matrículas issued
 * under it are still in circulation.
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
	/** Acervo the book belongs to: "01" the serventia's own acervo; 02 and up, one per incorporated acervo. */
	acervo: string;
	/** Service rendered by the serventia, always "55", the registro civil das pessoas naturais. */
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
 * not valid, which includes a serviço other than the `55` art. 473, III fixes for the registro
 * civil das pessoas naturais, and a book code that is not one of the nine books defined by the
 * Provimento, since an unknown book cannot be named.
 *
 * Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can
 * hold, so a numeric argument always gives `null` instead of being read as a rounded value.
 *
 * @param {string} value - The matrícula value to be parsed.
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
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Código Nacional de Normas da Corregedoria Nacional de Justiça - Foro Extrajudicial (Provimento
 * CNJ nº 149/2023), art. 473 as currently published: the in-force layout of the 32 digit
 * matrícula. Inciso II and §§ 1º to 5º carry the redação of the Provimento CN nº 237, de
 * 13/07/2026; the rest of the article, and the digit layout this library depends on, come from the
 * Provimento CN nº 182, de 17/09/2024.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/1311
 * Provimento CNJ nº 2, de 27/04/2009, which instituted the modelos únicos de certidão and the
 * matrícula (revoked; historical).
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Worked example of the two check digits (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const parseCertidao = (value: string): Certidao | null => {
	if (!isValidCertidao(value)) return null;

	const digits = sanitizeToDigits(value);
	const typeCode = digits.charCodeAt(14) - 48;
	const type = CERTIDAO_TYPES[typeCode - 1];

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
