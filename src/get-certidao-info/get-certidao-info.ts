import { CERTIDAO_BASE_LENGTH } from "../_internals/constants/certidao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCertidao } from "../is-valid-certidao/is-valid-certidao";
import { CERTIDAO_TYPES } from "./constants";

/**
 * The books (tipo do livro) a matrícula de registro civil can point to. `getCertidaoInfo` names
 * the book of a matrícula with one of the first seven, codes 1 to 7, and `isValidCertidao`
 * accepts a list of them.
 *
 * Art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de Justiça (Provimento
 * CNJ nº 149/2023, as amended by the Provimentos CN nº 182/2024 and nº 237/2026) lists only the
 * codes 1 to 7, from "1: Livro A (Nascimento)" to "7: Livro E (Demais atos relativos ao registro
 * civil)". `"emancipation"` and `"interdiction"`, the codes 8 and 9 of the Provimento CNJ nº 3/2009
 * (revoked by the Provimento CNJ nº 63/2017) that some community references still list, are never
 * returned: the table in force has no such codes, so `isValidCertidao` rejects a
 * matrícula carrying them and `getCertidaoInfo` returns `null` for it. They stay in this union
 * only so that code written against 2.4.0, which accepted them, still compiles; listing them in
 * `isValidCertidao`'s `accept` matches nothing.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/5243
 * Provimento CNJ nº 149/2023, art. 473, V: "1: Livro A (Nascimento)" to "7: Livro E (Demais atos
 * relativos ao registro civil)".
 */
export type CertidaoType =
	| "birth"
	| "marriage"
	| "religious-marriage"
	| "death"
	| "stillbirth"
	| "banns"
	| "other"
	/** Never returned: book code 8 is not in the official table (see `CertidaoType`). */
	| "emancipation"
	/** Never returned: book code 9 is not in the official table (see `CertidaoType`). */
	| "interdiction";

/** The fields `getCertidaoInfo` reads out of the matrícula of a certidão de registro civil. */
export type CertidaoInfo = {
	/** The 6 digit CNS (Código Nacional de Serventia) of the serventia that issued the act. */
	registryCns: string;
	/**
	 * Acervo the book belongs to: `"01"` the serventia's own acervo; `"02"` and up, one per
	 * incorporated acervo. Art. 473, §§ 3º to 5º splits the incorporated ones by the date the
	 * origin serventia was extinguished or deactivated: up to 31 December 2009 the matrícula
	 * carries the CNS of the incorporating unit and an acervo code from `"02"` up, one per
	 * incorporation in their numeric order; from 1 January 2010 on it carries the CNS of the
	 * incorporated unit itself and the acervo code `"01"`, counted as that unit's own acervo. When
	 * one acervo is split between two or more successor serventias, each of them uses its own CNS
	 * with the acervo code `"02"`.
	 */
	acervo: string;
	/** Service rendered by the serventia, always "55", the registro civil das pessoas naturais. */
	service: string;
	/** Four digit year the act was recorded. */
	year: number;
	/** The book the act belongs to, as an English name. */
	type: CertidaoType;
	/** Raw book code, 1 to 7, as printed in the fifteenth position of the matrícula. */
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
 * civil das pessoas naturais, and a book code that is not one of the seven books of art. 473, V
 * (0, 8 or 9), since an unknown book cannot be named.
 *
 * Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can
 * hold, so a numeric argument always gives `null` instead of being read as a rounded value.
 *
 * @param {string} value - The matrícula value to be parsed.
 * @returns {CertidaoInfo | null} The parsed matrícula, or `null` when it is not valid.
 *
 * @example
 * ```typescript
 * getCertidaoInfo("104539 01 55 2013 1 00012 021 0000123 21");
 * // { registryCns: "104539", acervo: "01", service: "55", year: 2013, type: "birth",
 * //   typeCode: 1, book: "00012", page: "021", term: "0000123", checkDigits: "21" }
 *
 * getCertidaoInfo("invalid"); // null
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
 * 7 + 2 positions art. 473 carries today (revoked by the Provimento CNJ nº 63/2017; historical).
 * Its inciso V also listed "8: Livro E (Desdobrado para registro específico das Emancipações)"
 * and "9: Livro E (Desdobrado para registro específico das Interdições)", which art. 473, V no
 * longer has, and its inciso IX had the check digits "formado automaticamente por meio do
 * programa" the CNJ Corregedoria handed to the registrars, whose algorithm was never published.
 * @see Based on: http://ghiorzi.org/DVnew.htm
 * Worked example of the two check digits (sums 288 and 309).
 * @see Based on: https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts
 * Reference implementation, and the source of the matrículas used as test vectors.
 * @see Based on: https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php
 * Third reference implementation agreeing on the weights and on the remainder of 10 read as 1.
 */
export const getCertidaoInfo = (value: string): CertidaoInfo | null => {
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
