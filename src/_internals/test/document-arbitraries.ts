import * as fc from "fast-check";

import { calculateCnhFirstVerifier } from "../calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { calculateCnpjCheckDigit } from "../calculate-cnpj-check-digit/calculate-cnpj-check-digit";
import { calculateCpfCheckDigit } from "../calculate-cpf-check-digit/calculate-cpf-check-digit";
import { calculatePisCheckDigit } from "../calculate-pis-check-digit/calculate-pis-check-digit";
import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../constants/cnpj";

/**
 * Arbitraries of valid documents, for the properties that need one ("a valid CPF stays valid under
 * any mask"). A property must not call a `generate*` utility for that: those draw from
 * `Math.random()`, which the seed fast-check reports on a failure does not control, so the failing
 * document could be neither replayed nor shrunk. These are built from fast-check primitives (the
 * free digits plus the check digits computed from them) and are drawn inside a property with
 * `fc.gen()`: `fc.property(fc.gen(), (g) => { const cpf = g(cpfs); ... })`.
 *
 * The `generate*` utilities keep their own tests; these do not replace them. The voter ID and
 * processo arbitraries are in `registry-arbitraries.ts`, the boleto ones in `boleto-arbitraries.ts`
 * and the phone ones in `phone-arbitraries.ts`: a file imports at most ten modules.
 */

const NUMERIC = "0123456789";

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Strings of `length` characters of `alphabet` that are never one character repeated: the second
 * character is the first one moved by a non-zero offset, so a document that rejects a repeated
 * base (`000.000.000-00`) is valid by construction, with nothing filtered out.
 * @param {string} alphabet The characters to draw from, two or more.
 * @param {number} length How many characters the string holds, two or more.
 * @returns {fc.Arbitrary<string>} Strings whose first two characters differ.
 */
const unrepeated = (alphabet: string, length: number): fc.Arbitrary<string> =>
	fc
		.tuple(
			fc.integer({ min: 0, max: alphabet.length - 1 }),
			fc.integer({ min: 1, max: alphabet.length - 1 }),
			fc.array(fc.integer({ min: 0, max: alphabet.length - 1 }), {
				minLength: length - 2,
				maxLength: length - 2,
			}),
		)
		.map(([first, offset, rest]) =>
			[first, (first + offset) % alphabet.length, ...rest]
				.map((index) => alphabet.charAt(index))
				.join(""),
		);

/**
 * @returns {fc.Arbitrary<string>} Valid CPFs, unmasked.
 */
export const cpfs = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 9).map((base) => {
		const first = String(calculateCpfCheckDigit(base));
		return base + first + String(calculateCpfCheckDigit(base + first));
	});

/**
 * @param {1 | 2} [version] The CNPJ version: numeric (`1`, the default) or alphanumeric (`2`).
 * @returns {fc.Arbitrary<string>} Valid CNPJs of that version, unmasked.
 */
export const cnpjs = (version?: 1 | 2): fc.Arbitrary<string> =>
	unrepeated(version === 2 ? ALPHANUMERIC : NUMERIC, 12).map((base) => {
		const first = String(calculateCnpjCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS));
		return base + first + String(calculateCnpjCheckDigit(base + first, CNPJ_SECOND_DIGIT_WEIGHTS));
	});

/**
 * @returns {fc.Arbitrary<string>} Valid CNH numbers.
 */
export const cnhs = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 9).map((base) => {
		const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);
		return `${base}${firstVerifier}${calculateCnhSecondVerifier({ base, decrement })}`;
	});

/**
 * @returns {fc.Arbitrary<string>} Valid PIS/PASEP numbers, unmasked.
 */
export const pisNumbers = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 10).map((base) => `${base}${calculatePisCheckDigit(base)}`);
