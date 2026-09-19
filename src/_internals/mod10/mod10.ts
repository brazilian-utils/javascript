type Mod10Variant = "luhn" | "gs1";

export type Mod10Options = {
	/** Which modulo 10 rule to apply (default: `"luhn"`). */
	variant?: Mod10Variant;
};

/**
 * Calculates the modulus 10 check digit for a given string.
 *
 * Both variants weigh the digits from the right, alternating with 1. `"luhn"` uses the weight 2
 * and adds the digits of each product (the boleto, credit card and bank account rule). `"gs1"`
 * uses the weight 3 and adds the products as they are (the rule of the GS1 General
 * Specifications, section 7.9.1, for GTIN and the other fixed length GS1 keys).
 *
 * @param {string} str - The string to calculate the check digit for.
 * @param {Mod10Options} [options] - Optional options.
 * @param {Mod10Variant} [options.variant] - The weighting rule to apply. Defaults to `"luhn"`.
 * @returns {number} The calculated check digit (0-9).
 *
 * @example
 * ```typescript
 * mod10("001900000"); // 9
 * mod10("37610425002123456", { variant: "gs1" }); // 9
 * ```
 */
export const mod10 = (str: string, options?: Mod10Options): number => {
	const isGs1 = options?.variant === "gs1";
	const weight = isGs1 ? 3 : 2;
	let sum = 0;
	const len = str.length;
	for (let i = 0; i < len; i++) {
		const digit = str.charCodeAt(len - 1 - i) - 48;
		const result = digit * (i % 2 === 0 ? weight : 1);
		sum += !isGs1 && result > 9 ? result - 9 : result;
	}
	const mod = sum % 10;
	return mod > 0 ? 10 - mod : 0;
};
