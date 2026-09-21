import { digitAt, keepDigits } from "./lib/digits";
import { cpfCheckDigit, isRepeated } from "./lib/cpf";

/**
 * The mask a CPF may be written with. The class spells out the 25 code points JavaScript's `\s`
 * matches, because `\s` itself means a different set in Python and in Go.
 */
const CPF_FORMAT =
	/^[0-9]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{2}$/;

const CPF_LENGTH = 11;

/**
 * Validates a CPF (Cadastro de Pessoas Físicas).
 *
 * The core takes the value as written, accepting the usual mask characters; turning a host value
 * into a string is the DX's job.
 */
export function isValidCpf(cpf: string): boolean {
	if (!re.test(CPF_FORMAT, str.trim(cpf))) {
		return false;
	}

	const digits = keepDigits(cpf);

	if (digits.length !== CPF_LENGTH) {
		return false;
	}

	if (isRepeated(digits)) {
		return false;
	}

	return digitAt(digits, 9) === cpfCheckDigit(digits, 9) && digitAt(digits, 10) === cpfCheckDigit(digits, 10);
}
