import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { RESERVED_NUMBERS } from "./constants";

const FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{2}$/;

const isValidChecksum = (cpf: string): boolean => {
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += (cpf.charCodeAt(i) - 48) * (10 - i);
	}
	let mod = sum % 11;
	const expected1 = mod < 2 ? 48 : 48 + 11 - mod;
	if (cpf.charCodeAt(9) !== expected1) return false;

	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += (cpf.charCodeAt(i) - 48) * (11 - i);
	}
	mod = sum % 11;
	const expected2 = mod < 2 ? 48 : 48 + 11 - mod;
	return cpf.charCodeAt(10) === expected2;
};

/**
 * Validates if a CPF (Cadastro de Pessoas Físicas) is valid.
 * Accepts the usual mask characters (`.`, `-`) and whitespace around and between groups.
 *
 * @param {string} cpf - The CPF value to be validated.
 * @returns {boolean} True if the CPF is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCpf("123.456.789-09"); // true
 * isValidCpf("12345678909"); // true
 * isValidCpf("123 456 789 09"); // true (whitespace mask)
 * isValidCpf(" 12345678909"); // true (leading whitespace)
 * isValidCpf("00000000000"); // false (reserved number)
 * isValidCpf("12345678900"); // false (invalid checksum)
 * ```
 *
 * The check digit rule (`REGRA_VALIDA_CPF`) is specified, with the worked example
 * `280012389-38`, in the Receita Federal's Manual de Preenchimento da e-Financeira, Anexo II —
 * Leiautes Gerais, approved by the Ato Declaratório Executivo Cofis nº 10, de 19 de maio de
 * 2026 (DOU de 25/05/2026). The manual states the rule in its mirror form, weights 9 down to 1 "a partir da
 * unidade" with "o resto 10 é considerado 0", which is algebraically the same digit as the
 * weights 10 down to 2 with `11 - resto` implemented above. The manual's own file used to be
 * served from `sped.rfb.gov.br`, a host that no longer answers at all, so the approving act is
 * cited below in its place; its Receita Federal permalink redirects into the norms viewer, which
 * has to be opened in a browser.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=151372
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/cpf.py
 */
export const isValidCpf = (cpf: string): boolean => {
	if (typeof cpf !== "string") return false;

	const digits = sanitizeToDigits(cpf);

	if (!FORMAT_REGEX.test(cpf.trim())) return false;

	if (RESERVED_NUMBERS.includes(digits)) return false;

	return isValidChecksum(digits);
};
