export type FormatParams = {
	/** The raw value to format, already sanitized to the characters the pattern consumes. */
	value: string;
	/** The pattern to format against: `0` copies one input character, `*` hides one, anything else is a literal separator. */
	pattern: string;
	/** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a given value according to a specified pattern.
 *
 * The pattern is read character by character:
 * - `0` consumes one character of `value` and copies it;
 * - `*` consumes one character of `value` and emits `*` in its place, hiding it;
 * - anything else is a literal separator, emitted only while `value` still has characters left.
 *
 * `pad` counts both `0` and `*` as slots, so a value shorter than the pattern is left padded
 * with zeros before it is consumed.
 *
 * @param {FormatParams} params - The parameters for formatting.
 * @param {string} params.value - The value to be formatted.
 * @param {string} params.pattern - The pattern to format the value against.
 * @param {boolean} [params.pad] - Whether to pad the value with leading zeros.
 * @returns {string} The formatted value.
 *
 * @example
 * ```typescript
 * format({ value: "123456", pattern: "000-000" }); // "123-456"
 * format({ value: "123", pattern: "0000-000", pad: true }); // "0000-123"
 * format({ value: "12345678909", pattern: "***.000.000-**" }); // "***.456.789-**"
 * ```
 */
export const format = ({ pad, value, pattern }: FormatParams): string => {
	let formatted = "";
	let valueIndex = 0;
	let paddedValue = value;

	if (pad === true) {
		const separatorsLength = pattern.replaceAll(/[0*]/g, "").length;
		paddedValue = value.padStart(pattern.length - separatorsLength, "0");
	}

	for (const char of pattern) {
		if (char === "0" || char === "*") {
			if (valueIndex >= paddedValue.length) break;
			formatted += char === "*" ? "*" : paddedValue[valueIndex];
			valueIndex++;
		} else if (valueIndex < paddedValue.length) {
			formatted += char;
		}
	}

	return formatted;
};
