import { sanitizeToDigits } from "../sanitize-to-digits/sanitize-to-digits";

export type GenerateChecksumParams = {
	/** The digits the checksum is computed over. */
	base: string | number;
	/** A starting weight that decreases along the digits, or the explicit weight of each digit. */
	weight: number | number[];
};

/**
 * Sums every digit of a base value multiplied by its weight, the shared first step of the
 * modulus 11 check digits used by CPF, PIS and friends.
 *
 * @param {GenerateChecksumParams} params - The checksum parameters.
 * @param {string|number} params.base - The value whose digits are summed. Non digits are ignored.
 * @param {number|number[]} params.weight - Either the weight of the leftmost digit, decreasing
 * by one towards the right, or one explicit weight per digit.
 * @returns {number} The weighted sum of the digits.
 *
 * @example
 * ```typescript
 * generateChecksum({ base: "123456789", weight: 10 }); // 210
 * generateChecksum({ base: "123", weight: [1, 2, 3] }); // 14
 * ```
 */
export function generateChecksum({ base, weight }: GenerateChecksumParams): number {
	const digits = sanitizeToDigits(base);

	let sum = 0;

	const len = digits.length;

	if (typeof weight === "number") {
		let w = weight;
		for (let i = 0; i < len; i++, w--) {
			const digit = digits.charCodeAt(i) - 48;
			sum += digit * w;
		}
	} else {
		for (let i = 0; i < len; i++) {
			const digit = digits.charCodeAt(i) - 48;
			sum += digit * weight[i];
		}
	}

	return sum;
}
