import { ARRECADACAO_PRODUCT } from "../constants/arrecadacao";
import { mod10 } from "../mod10/mod10";
import { mod11 } from "../mod11/mod11";

/** The choices and free digits of a boleto de arrecadação. */
export type BoletoArrecadacaoParts = {
	/** The segment digit, one of `ARRECADACAO_SEGMENTS`. */
	segment: string;
	/** Whether the check digits use modulo 11 (value identifiers 8 and 9) instead of modulo 10 (6 and 7). */
	useMod11: boolean;
	/** Whether the value field is the effective value (identifiers 6 and 8) or a reference (7 and 9). */
	hasEffectiveValue: boolean;
	/** The 40 digits after the general check digit: value, company and free field. */
	body: string;
};

const VALUE_IDENTIFIERS = {
	mod10: { effective: "6", reference: "7" },
	mod11: { effective: "8", reference: "9" },
};

/**
 * Assembles the 48 digit linha digitável of a boleto de arrecadação: the 44 digit barcode (product,
 * segment, value identifier, general check digit and `body`) split into four blocks of 11 digits,
 * each followed by its own check digit, all computed with the modulus the value identifier names.
 *
 * Shared by `generateBoleto` and by the `boletos` arbitrary of the test suite.
 *
 * @param {BoletoArrecadacaoParts} parts - The choices and the free digits.
 * @returns {string} The linha digitável, digits only.
 *
 * @example
 * ```typescript
 * assembleBoletoArrecadacao({
 *   segment: "1",
 *   useMod11: false,
 *   hasEffectiveValue: true,
 *   body: "0".repeat(40),
 * }); // "816900000000000000000000000000000000000000000000"
 * ```
 */
export const assembleBoletoArrecadacao = ({
	segment,
	useMod11,
	hasEffectiveValue,
	body,
}: BoletoArrecadacaoParts): string => {
	const checkDigit = useMod11
		? (value: string): number => mod11(value, { variant: "arrecadacao" })
		: mod10;
	const identifier =
		VALUE_IDENTIFIERS[useMod11 ? "mod11" : "mod10"][hasEffectiveValue ? "effective" : "reference"];
	const head = `${ARRECADACAO_PRODUCT}${segment}${identifier}`;
	const barcode = head + checkDigit(head + body) + body;
	let line = "";

	for (let block = 0; block < 4; block++) {
		const value = barcode.slice(block * 11, block * 11 + 11);
		line += value + checkDigit(value);
	}

	return line;
};
