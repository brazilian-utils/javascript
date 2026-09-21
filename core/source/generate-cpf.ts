import { cpfCheckDigit, randomCpfBase } from "./lib/cpf";
import { isRepeatedRun } from "./lib/digits";

/**
 * A 9-digit base repeats with probability 1 in 10^8; this many redraws leave a repeated base in
 * the result with probability under 10^-64, the documented fallback a bounded `for` needs in
 * place of the published implementation's unbounded `while`.
 */
const MAX_BASE_ATTEMPTS = 8;

/**
 * Generates a valid random CPF (Cadastro de Pessoas Físicas): 11 digits, under the check digit
 * rule (weights 10..2 and 11..2) the Receita Federal's Manual de Preenchimento da e-Financeira,
 * Anexo II specifies.
 *
 * Matches the published `generateCpf()` called with no state: a random 9-digit base — 8 digits
 * plus a região fiscal digit, also drawn at random here — redrawn while every digit of it is the
 * same, followed by its two check digits. The state code option is a DX concern: it only ever
 * picks which digit the 9th position draws from, never how the rest of the document is built.
 */
export function generateCpf(): string {
	let base = randomCpfBase();

	for (let attempt = 0; attempt < MAX_BASE_ATTEMPTS; attempt++) {
		if (!isRepeatedRun(base)) {
			break;
		}

		base = randomCpfBase();
	}

	// Both calls need a full 11-digit value: the trailing positions a `size` of 9 or 10 never
	// reads are filled with a placeholder digit purely to satisfy that length.
	const firstDigit = str.fromInt(cpfCheckDigit(`${base}00`, 9));
	const secondDigit = str.fromInt(cpfCheckDigit(`${base}${firstDigit}0`, 10));

	return `${base}${firstDigit}${secondDigit}`;
}
