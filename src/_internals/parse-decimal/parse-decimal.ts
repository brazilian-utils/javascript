export type ParseDecimalOptions = {
	/** How many trailing digits of a value written without any separator are minor units, so `2` reads "1234" as 12.34 (default: `0`). */
	minorUnits?: number;
	/** Longest run of digits a decimal separator may introduce; a longer run makes it a thousands separator (default: `2`). */
	maxFractionDigits?: number;
};

/**
 * Reads a decimal number out of a string written in the Brazilian convention.
 *
 * The last `,` or `.` followed by 1 to `maxFractionDigits` digits is the decimal separator;
 * every other `,` or `.` is a thousands separator and is dropped. A value written without any
 * separator is read as minor units, i.e. divided by `10 ** minorUnits`. A `-` written before
 * the first digit makes the result negative, and negative zero is normalized to zero.
 *
 * @param {string} value - The string to read.
 * @param {ParseDecimalOptions} [options] - Optional reading options.
 * @param {number} [options.minorUnits] - Minor unit digits of a value written without separators. Defaults to 0.
 * @param {number} [options.maxFractionDigits] - Longest fraction a decimal separator may introduce. Defaults to 2.
 * @returns {number} The parsed number, or 0 when the value holds no digits.
 *
 * @example
 * ```typescript
 * parseDecimal("R$ 1.234,56"); // 1234.56
 * parseDecimal("R$ 1.234"); // 1234
 * parseDecimal("1234"); // 1234
 * parseDecimal("1234", { minorUnits: 2 }); // 12.34
 * parseDecimal("-R$ 1,00"); // -1
 * ```
 */
export const parseDecimal = (value: string, options?: ParseDecimalOptions): number => {
	if (typeof value !== "string") return 0;

	const minorUnits = options?.minorUnits ?? 0;
	const maxFractionDigits = options?.maxFractionDigits ?? 2;

	const [prefix] = value.split(/\d/, 1);
	const sign = prefix.includes("-") ? -1 : 1;

	const cleaned = value.replaceAll(/[^\d.,]/g, "");
	const separatorIndex = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));

	if (separatorIndex === -1) {
		return sign * (Number.parseInt(cleaned, 10) / 10 ** minorUnits) || 0;
	}

	const fraction = cleaned.slice(separatorIndex + 1);
	const isDecimal = fraction.length <= maxFractionDigits;
	const integerPart = (isDecimal ? cleaned.slice(0, separatorIndex) : cleaned).replaceAll(
		/\D/g,
		"",
	);
	const numeric = isDecimal ? `${integerPart}.${fraction}` : integerPart;

	return sign * Number.parseFloat(numeric) || 0;
};
