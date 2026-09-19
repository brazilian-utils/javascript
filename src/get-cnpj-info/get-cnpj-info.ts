import { CNPJ_LETTER_REGEX } from "../_internals/constants/cnpj";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { isValidCnpj, type IsValidCnpjOptions } from "../is-valid-cnpj/is-valid-cnpj";

/** Options of `getCnpjInfo`. */
export type GetCnpjInfoOptions = Pick<IsValidCnpjOptions, "version">;

/** How a CNPJ is written: `"numeric"` digits only, `"alphanumeric"` with a letter in the root or the order. */
export type CnpjFormat = "numeric" | "alphanumeric";

/** The fields `getCnpjInfo` reads out of a CNPJ. */
export type CnpjInfo = {
	/** The 8 character root (raiz), positions 1 to 8, shared by every establishment of the entity. */
	root: string;
	/** The 4 character order (número de ordem) of the establishment, positions 9 to 12, the ones `generateCnpj` takes as `branch`. */
	order: string;
	/** The 2 numeric check digits (dígitos verificadores), positions 13 and 14. */
	checkDigits: string;
	/** `"alphanumeric"` when the root or the order carries a letter, `"numeric"` otherwise. */
	format: CnpjFormat;
	/**
	 * Whether the order is `0001`, the one the Receita Federal gives the headquarters (matriz)
	 * when the root is registered. A branch (filial) that later becomes the headquarters keeps
	 * its order, so only the Receita Federal registry tells the current headquarters.
	 */
	isInitialHeadquarters: boolean;
};

const ROOT_END = 8;

const ORDER_END = 12;

const INITIAL_HEADQUARTERS_ORDER = "0001";

/**
 * Parses a CNPJ (Cadastro Nacional da Pessoa Jurídica) into the fields the number encodes.
 *
 * Anexo XV of Instrução Normativa RFB nº 2.119/2022, added by Instrução Normativa RFB
 * nº 2.229/2024, lays the 14 positions out as 8 (root, raiz, the entity) + 4 (order, número de
 * ordem, the establishment) + 2 (check digits, always numeric). In the alphanumeric format,
 * assigned to new registrations from July 2026, the root and the order take the digits `0` to
 * `9` and the upper case letters `A` to `Z`, and either of them may still come out all numeric.
 *
 * Accepts the same input forms and reads `options.version` the same way as `isValidCnpj`: `1`
 * (the default) recognizes the numeric format only, `2` recognizes both, and any other value is
 * read as `1`. Returns `null` whenever `isValidCnpj` would return `false` for the same
 * arguments, so an alphanumeric CNPJ read under version `1` is `null`. The fields of an
 * alphanumeric CNPJ are returned upper cased.
 *
 * The order `0001` marks the headquarters (matriz) only at registration: the Receita Federal
 * Q&A (question 25) states that a branch (filial) can become the headquarters while keeping
 * its order, hence `isInitialHeadquarters` instead of a definitive headquarters flag.
 *
 * @param {string} value - The CNPJ to be parsed.
 * @param {GetCnpjInfoOptions} [options] - Optional options.
 * @param {1|2} [options.version] - `1` reads the numeric-only format (the default), `2` reads
 * both the numeric and the alphanumeric formats.
 * @returns {CnpjInfo|null} The parsed CNPJ, or `null` when it is not valid.
 *
 * @example
 * ```typescript
 * getCnpjInfo("12.345.678/0001-95");
 * // {
 * //   root: "12345678",
 * //   order: "0001",
 * //   checkDigits: "95",
 * //   format: "numeric",
 * //   isInitialHeadquarters: true,
 * // }
 *
 * getCnpjInfo("12.abc.345/01de-35", { version: 2 });
 * // {
 * //   root: "12ABC345",
 * //   order: "01DE",
 * //   checkDigits: "35",
 * //   format: "alphanumeric",
 * //   isInitialHeadquarters: false,
 * // }
 *
 * getCnpjInfo("12.ABC.345/01DE-35"); // null (alphanumeric, read under version 1)
 * getCnpjInfo("12.345.678/0001-90"); // null (bad check digits)
 * ```
 *
 * @see Official: http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=141102
 * Instrução Normativa RFB nº 2.229/2024, whose Anexo Único is the Anexo XV of IN RFB
 * nº 2.119/2022: positions 1 to 8 root, 9 to 12 order, 13 and 14 check digits.
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf
 * Receita Federal Q&A on the alphanumeric CNPJ: questions 21 and 23 (root and order), 25 (the
 * order `0001` and the headquarters) and the `AA345678/000A-29` and `12.345.678/000A-08`
 * examples.
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * Check digit manual, source of the `12.ABC.345/01DE-35` example.
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 * @see Based on: https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=detalharAto&tipo=INM&numeroAto=00002229&seqAto=000&valorAno=2024&orgao=RFB/MF
 * Mirror of IN RFB nº 2.229/2024 where the Anexo Único was read.
 */
export const getCnpjInfo = (value: string, options?: GetCnpjInfoOptions): CnpjInfo | null => {
	if (!isValidCnpj(value, options)) return null;

	const cnpj = sanitizeToAlphanumeric(value);
	const order = cnpj.slice(ROOT_END, ORDER_END);

	return {
		root: cnpj.slice(0, ROOT_END),
		order,
		checkDigits: cnpj.slice(ORDER_END),
		format: CNPJ_LETTER_REGEX.test(cnpj) ? "alphanumeric" : "numeric",
		isInitialHeadquarters: order === INITIAL_HEADQUARTERS_ORDER,
	};
};
