import { CPF_BASE_LENGTH, CPF_FISCAL_REGION_BY_STATE } from "../_internals/constants/cpf";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { type StateCode } from "../_internals/constants/states";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";

/** The fields `getCpfInfo` reads out of a CPF. */
export type CpfInfo = {
	/** The first 8 digits, the sequential number of the registration. */
	base: string;
	/**
	 * The 9th digit, the Região Fiscal of the Receita Federal the CPF was registered in: `"1"` to
	 * `"9"` for the 1ª to the 9ª Região Fiscal and `"0"` for the 10ª.
	 */
	fiscalRegion: string;
	/** The two letter codes of the states of that Região Fiscal, sorted by state name. */
	states: StateCode[];
	/** The 2 check digits. */
	checkDigits: string;
};

const CHECK_DIGITS_START = CPF_BASE_LENGTH + 1;

/**
 * Reads the fields a CPF (Cadastro de Pessoas Físicas) encodes: the 8 digit base, the Região
 * Fiscal digit with the states it covers, and the 2 check digits.
 *
 * The Receita Federal is split into ten Regiões Fiscais, and the 9th digit of a CPF is the one of
 * the address given when the number was first registered. It tells where the CPF was issued, not
 * where its holder was born or lives today, and a region with more than one state does not tell
 * which of them it was.
 *
 * Accepts the same input forms as `isValidCpf`, masked or not, with whitespace around and between
 * the groups, and returns `null` whenever `isValidCpf` would return `false`.
 *
 * @param {string} value - The CPF to be read.
 * @returns {CpfInfo|null} The fields of the CPF, or `null` when it is not a valid CPF.
 *
 * @example
 * ```typescript
 * getCpfInfo("123.456.789-09");
 * // {
 * //   base: "12345678",
 * //   fiscalRegion: "9",
 * //   states: ["PR", "SC"],
 * //   checkDigits: "09",
 * // }
 *
 * getCpfInfo("12345678909"); // same result (no mask)
 * getCpfInfo("12345678900"); // null (invalid check digits)
 * getCpfInfo("00000000000"); // null (reserved number)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf
 * Folheto "Cadastros: CPF e CNPJ" of the Receita Federal: the 9th digit is the Região Fiscal, and
 * the states of each of the ten regions.
 * @see Official: https://www.gov.br/receitafederal/pt-br/composicao/srrf
 * Superintendências Regionais da Receita Federal: the states under each of the 1ª to the 10ª
 * Região Fiscal, the 10ª (Rio Grande do Sul) being the digit 0.
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 */
export const getCpfInfo = (value: string): CpfInfo | null => {
	if (!isValidCpf(value)) return null;

	const digits = sanitizeToDigits(value);
	const fiscalRegion = digits.charAt(CPF_BASE_LENGTH);

	return {
		base: digits.slice(0, CPF_BASE_LENGTH),
		fiscalRegion,
		states: STATE_CODES.filter((state) => CPF_FISCAL_REGION_BY_STATE[state] === fiscalRegion),
		checkDigits: digits.slice(CHECK_DIGITS_START),
	};
};
