import { DEFAULT_PRECISION, clampPrecision } from "../_internals/clamp-precision/clamp-precision";
import { parseDecimal } from "../_internals/parse-decimal/parse-decimal";

/** Options of `parseCurrency`. */
export type ParseCurrencyOptions = {
	/** Number of decimal places used as the minor unit scale. Fractions accept up to two digits, or `precision` digits when it is greater. Defaults to 2, clamped to 0-20. */
	precision?: number;
};

/**
 * Parses a string representing Brazilian currency format into a number.
 *
 * The last `,` or `.` followed by 1 to 2 digits (or up to `precision` digits, when that is
 * larger) is the decimal separator; every other `,` or `.` is a thousands separator, so
 * `"R$ 1.234,56"` parses to 1234.56 and `"R$ 1.234"` to 1234. A value written without any
 * separator keeps the cents convention and is divided by `10 ** precision`, so `"1234"`
 * parses to 12.34. A `-` written before the first digit is preserved, so `"-R$ 1,00"` parses
 * to -1.
 *
 * @param {string} value - The string value to be parsed (e.g., "R$ 1.234,56" or "1234,56")
 * @param {ParseCurrencyOptions} [options] - Optional parsing options.
 * @param {number} options.precision - The number of decimal places used as the minor unit scale. Fractions accept up to two digits, or `precision` digits when it is greater. Defaults to 2, clamped to 0-20.
 * @returns {number} The parsed number value (e.g., 1234.56)
 *
 * @example
 * ```typescript
 * parseCurrency("R$ 1.234,56"); // returns 1234.56
 * parseCurrency("1234,56"); // returns 1234.56
 * parseCurrency("R$ 0,50"); // returns 0.50
 * parseCurrency("R$ 1.234"); // returns 1234
 * parseCurrency("1234"); // returns 12.34
 * parseCurrency("-R$ 1,00"); // returns -1
 * parseCurrency("R$ 1,001", { precision: 3 }); // returns 1.001
 * parseCurrency(""); // returns 0
 * ```
 */
export const parseCurrency = (value: string, options?: ParseCurrencyOptions): number => {
	const precision = clampPrecision(options?.precision);

	return parseDecimal(value, {
		minorUnits: precision,
		maxFractionDigits: Math.max(DEFAULT_PRECISION, precision),
	});
};
