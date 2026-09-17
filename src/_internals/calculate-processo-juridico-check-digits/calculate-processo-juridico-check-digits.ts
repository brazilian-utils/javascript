import { MOD_97_10_QUOTIENT, MOD_97_10_SUM } from "../constants/processo-juridico";

/** Digits of the head of the base, the largest prefix whose product by 100 still fits a double. */
const HEAD_LENGTH = 11;

/**
 * Calculates the two verifying digits (`DD`) of a processo jurídico number, the ISO 7064 MOD
 * 97-10 check of Resolução CNJ nº 65/2008, art. 1º, § 2º: 98 minus the remainder of the other 18
 * digits, read as one number and multiplied by 100, by 97.
 *
 * That 20 digit product does not fit a double, so the 18 digits are reduced in two steps: the
 * remainder of the first 11 is carried into the last 7 (times 10 to the 9th, the 7 digits times
 * the 100), which is the same remainder without ever leaving the safe integer range.
 *
 * @param {string} base - The 18 digits of the number without its verifying digits (`NNNNNNNAAAAJTROOOO`).
 * @returns {number} The verifying digits as one number, 1 to 98.
 *
 * @example
 * ```typescript
 * calculateProcessoJuridicoCheckDigits("000000120220100001"); // 29
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export const calculateProcessoJuridicoCheckDigits = (base: string): number => {
	const head = Number(base.slice(0, HEAD_LENGTH));
	const tail = Number(base.slice(HEAD_LENGTH));

	const remainder = ((head % MOD_97_10_QUOTIENT) * 1_000_000_000 + tail * 100) % MOD_97_10_QUOTIENT;

	return MOD_97_10_SUM - remainder;
};
