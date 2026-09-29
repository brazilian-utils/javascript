import { calculateCpfCheckDigit } from "../_internals/calculate-cpf-check-digit/calculate-cpf-check-digit";
import { CPF_BASE_LENGTH, CPF_FISCAL_REGION_BY_STATE } from "../_internals/constants/cpf";
import { type StateCode } from "../_internals/constants/states";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";
import { normalizeStateCode } from "../_internals/normalize-state-code/normalize-state-code";

export type { StateCode } from "../_internals/constants/states";

/**
 * The região fiscal digit of a state, a random one for anything else. The state is read as a
 * string before the own property lookup, so a value with no string conversion (an object created
 * with `Object.create(null)`, one whose `toString` throws) is an unknown state rather than a
 * `TypeError` thrown while `Object.hasOwn` coerces it into a property key.
 *
 * @param {StateCode} [state] - The state code the CPF is generated for, if any.
 * @returns {string} The região fiscal digit of that state, or a random digit.
 */
const getStateCode = (state?: StateCode): string => {
	const code = normalizeStateCode(state);

	return hasOwnKey(CPF_FISCAL_REGION_BY_STATE, code)
		? CPF_FISCAL_REGION_BY_STATE[code]
		: generateRandomNumber(1);
};

/**
 * Generates a valid random CPF (Cadastro de Pessoas Físicas).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {StateCode} [state] - The Brazilian state code to generate a CPF for, letter case and
 * surrounding whitespace ignored (`"sp"` is `"SP"`). An unknown state
 * draws a random região fiscal digit instead of throwing, a key of the prototype chain
 * (`"__proto__"`, `"constructor"`) and a value with no string conversion included.
 * @returns {string} A valid 11-digit CPF string without formatting.
 *
 * @example
 * ```typescript
 * generateCpf(); // "12345678909"
 * generateCpf("SP"); // "12345678810" (with the SP state code, 8, in the 9th digit)
 * ```
 *
 * The região fiscal digit in the 9th position comes from the Receita Federal's folheto
 * "Cadastros: CPF e CNPJ"; the check digit rule (`REGRA_VALIDA_CPF`) is specified, with the
 * worked example `280012389-38`, in the Receita Federal's Manual de Preenchimento da
 * e-Financeira, Anexo II, Leiautes Gerais, approved by the Ato Declaratório Executivo Cofis
 * nº 10, de 19 de maio de 2026 (DOU de 25/05/2026). The approving act is cited below too; its
 * Receita Federal permalink redirects into the norms viewer, which has to be opened in a
 * browser.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf
 * @see Official: http://sped.rfb.gov.br/estatico/33/BBD9A14FFF8CB38ECEEC2FC2D3713AE716DB11/Manual%20e-Financeira%20v%202.1.2-%20Anexo%20II%20-%20Leiautes%20Gerais.pdf
 * Manual de Preenchimento da e-Financeira, Anexo II, Leiautes Gerais: `REGRA_VALIDA_CPF`.
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=151372
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/cpf.py
 */
export const generateCpf = (state?: StateCode): string => {
	let base = generateRandomNumber(CPF_BASE_LENGTH) + getStateCode(state);

	while (isRepeatedDigits(base)) {
		base = generateRandomNumber(CPF_BASE_LENGTH) + getStateCode(state);
	}

	const firstCheckDigit = String(calculateCpfCheckDigit(base));
	const secondCheckDigit = String(calculateCpfCheckDigit(base + firstCheckDigit));
	return base + firstCheckDigit + secondCheckDigit;
};
