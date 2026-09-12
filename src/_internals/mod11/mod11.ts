type Mod11Variant = "boleto" | "arrecadacao" | "bank";

export type Mod11Options = {
	/** Which modulo 11 rule to apply (default: `"boleto"`). */
	variant?: Mod11Variant;
	/** Highest weight of the cycling weight sequence (default: 9). */
	maxWeight?: number;
};

const REMAINDER_OVERRIDES: Record<Mod11Variant, Record<number, number>> = {
	boleto: { 0: 1, 1: 1 },
	arrecadacao: { 0: 0, 1: 0, 10: 1 },
	bank: { 0: 0 },
};

const DEFAULT_MAX_WEIGHT = 9;

/**
 * Calculates a modulus 11 check digit for a given string of digits.
 *
 * @param {string} value - The digits to calculate the check digit for.
 * @param {Mod11Options} [options] - Optional options.
 * @param {Mod11Variant} [options.variant] - The remainder mapping to apply. Defaults to `"boleto"`.
 * @param {number} [options.maxWeight] - The highest multiplier before wrapping back to 2. Defaults to 9.
 * @returns {number} The calculated check digit: 1-9 for `"boleto"`, 0-9 for `"arrecadacao"` and
 * 0-10 for `"bank"` (where 10 is the bank specific exceptional digit).
 *
 * @example
 * ```typescript
 * mod11("0019758600001026560000001149718606852452211"); // 6 (DV geral of a boleto barcode)
 * mod11("01230067896", { variant: "arrecadacao" }); // 0
 * mod11("00210169", { variant: "bank" }); // 6 (Banco do Brasil, conta 00210169-6)
 * mod11("0238069", { variant: "bank", maxWeight: 7 }); // 2 (Bradesco, conta 0238069-2)
 * ```
 */
export const mod11 = (value: string, options?: Mod11Options): number => {
	const maxWeight = options?.maxWeight ?? DEFAULT_MAX_WEIGHT;
	const overrides = REMAINDER_OVERRIDES[options?.variant ?? "boleto"];

	let weight = 2;
	let sum = 0;

	for (let i = value.length - 1; i >= 0; i--) {
		sum += (value.charCodeAt(i) - 48) * weight;
		weight = weight < maxWeight ? weight + 1 : 2;
	}

	const remainder = sum % 11;

	return remainder in overrides ? overrides[remainder] : 11 - remainder;
};
