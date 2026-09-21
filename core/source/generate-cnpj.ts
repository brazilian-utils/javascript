import { FIRST_WEIGHTS, SECOND_WEIGHTS, cnpjCheckDigit, randomCnpjBase } from "./lib/cnpj";
import { isRepeatedRun } from "./lib/digits";

/**
 * A 12-digit base repeats with probability 1 in 10^11; this many redraws leave a repeated base in
 * the result with probability under 10^-88, the documented fallback a bounded `for` needs in
 * place of the published implementation's unbounded `while`.
 */
const MAX_BASE_ATTEMPTS = 8;

/**
 * Generates a valid random CNPJ (Cadastro Nacional da Pessoa Jurídica) in the numeric format: 14
 * digits, under the check digit rule both CNPJ versions share.
 *
 * Matches the published `generateCnpj()` called with no options: a random 8-digit root and
 * 4-digit branch (the "número de ordem"), redrawn while every digit of the 12-digit base is the
 * same, followed by its two check digits. The alphanumeric version and a chosen branch are DX
 * concerns layered on the same base and check digit rule, not a different generator.
 */
export function generateCnpj(): string {
	let base = randomCnpjBase();

	for (let attempt = 0; attempt < MAX_BASE_ATTEMPTS; attempt++) {
		if (!isRepeatedRun(base)) {
			break;
		}

		base = randomCnpjBase();
	}

	// Both calls need a full 14-character value: the trailing positions the shorter weight list
	// never reads are filled with a placeholder digit purely to satisfy that length.
	const firstDigit = str.fromInt(cnpjCheckDigit(`${base}00`, FIRST_WEIGHTS));
	const secondDigit = str.fromInt(cnpjCheckDigit(`${base}${firstDigit}0`, SECOND_WEIGHTS));

	return `${base}${firstDigit}${secondDigit}`;
}
