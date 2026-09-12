import {
	ARRECADACAO_BARCODE_LENGTH,
	ARRECADACAO_BLOCK_LENGTH,
	ARRECADACAO_BLOCKS,
	ARRECADACAO_CHECK_DIGIT_POSITION,
	ARRECADACAO_LINE_LENGTH,
	ARRECADACAO_PRODUCT,
	ARRECADACAO_VALUE_END,
	ARRECADACAO_VALUE_START,
} from "../constants/arrecadacao";
import { mod10 } from "../mod10/mod10";
import { mod11 } from "../mod11/mod11";

export type ArrecadacaoInfo = {
	/** The 44 digit barcode rebuilt from the linha digitável. */
	barcode: string;
	/** Arrecadação segment (1 to 7, or 9 for the bank's own use), the kind of biller the bank slip belongs to. */
	segment: number;
	/** Whether the amount is an effective value (`true`) or a reference quantity (`false`). */
	hasEffectiveValue: boolean;
	/** Amount in cents. */
	amount: number;
};

const getCheckDigitAlgorithm = (barcode: string): ((value: string) => number) | null => {
	const identifier = barcode[2];

	if (identifier === "6" || identifier === "7") return mod10;
	if (identifier === "8" || identifier === "9") {
		return (value: string) => mod11(value, { variant: "arrecadacao" });
	}

	return null;
};

const lineToBarcode = (line: string): string =>
	Array.from({ length: ARRECADACAO_BLOCKS }, (_, block) => {
		const start = block * (ARRECADACAO_BLOCK_LENGTH + 1);
		return line.slice(start, start + ARRECADACAO_BLOCK_LENGTH);
	}).join("");

/**
 * Validates an arrecadação bank slip and returns its parsed information.
 *
 * Accepts both the 44 digit barcode and the 48 digit linha digitável. The block
 * check digits are only verified for the linha digitável, since they are not represented in
 * the barcode, where §03-E states they are not represented.
 *
 * @param {string} digits - Sanitized digits of the bank slip.
 * @returns {ArrecadacaoInfo | null} The parsed information, or null when it is not a valid arrecadação bank slip.
 *
 * @example
 * ```typescript
 * parseArrecadacao("846100000005246100291102005460339004695895061080");
 * // { barcode: "8461...", segment: 4, hasEffectiveValue: true, amount: 2461 }
 * ```
 */
export const parseArrecadacao = (digits: string): ArrecadacaoInfo | null => {
	if (!digits.startsWith(ARRECADACAO_PRODUCT)) return null;

	const isLine = digits.length === ARRECADACAO_LINE_LENGTH;

	if (!isLine && digits.length !== ARRECADACAO_BARCODE_LENGTH) return null;

	const barcode = isLine ? lineToBarcode(digits) : digits;

	const checkDigit = getCheckDigitAlgorithm(barcode);

	if (!checkDigit) return null;

	const withoutCheckDigit =
		barcode.slice(0, ARRECADACAO_CHECK_DIGIT_POSITION) +
		barcode.slice(ARRECADACAO_CHECK_DIGIT_POSITION + 1);

	if (checkDigit(withoutCheckDigit) !== barcode.charCodeAt(ARRECADACAO_CHECK_DIGIT_POSITION) - 48)
		return null;

	if (isLine) {
		for (let block = 0; block < ARRECADACAO_BLOCKS; block++) {
			const value = barcode.slice(
				block * ARRECADACAO_BLOCK_LENGTH,
				(block + 1) * ARRECADACAO_BLOCK_LENGTH,
			);
			const expected =
				digits.charCodeAt(block * (ARRECADACAO_BLOCK_LENGTH + 1) + ARRECADACAO_BLOCK_LENGTH) - 48;

			if (checkDigit(value) !== expected) return null;
		}
	}

	const segment = barcode.charCodeAt(1) - 48;

	if (segment === 0 || segment === 8) return null;

	const identifier = barcode[2];

	return {
		barcode,
		segment,
		hasEffectiveValue: identifier === "6" || identifier === "8",
		amount: Number(barcode.slice(ARRECADACAO_VALUE_START, ARRECADACAO_VALUE_END)),
	};
};
