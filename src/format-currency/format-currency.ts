import { DEFAULT_PRECISION, clampPrecision } from "../_internals/clamp-precision/clamp-precision";
import { parseDecimal } from "../_internals/parse-decimal/parse-decimal";

/** Options of `formatCurrency`. */
export type FormatCurrencyOptions = {
	/** Whether to prefix the result with the "R$" currency symbol (default: `false`). */
	symbol?: boolean;
	/** Number of decimal places to show. Defaults to 2, clamped to 0-20. */
	precision?: number;
};

let formatters: Map<string, Intl.NumberFormat> | undefined;

const getFormatter = (symbol: boolean, precision: number): Intl.NumberFormat => {
	formatters ??= new Map<string, Intl.NumberFormat>();

	const key = `${symbol}|${precision}`;
	const cached = formatters.get(key);

	// Stryker disable next-line ConditionalExpression: this is a performance cache; a freshly constructed Intl.NumberFormat with the same options formats identically to a cached one, so skipping the cache never changes the output
	if (cached) return cached;

	const formatter = new Intl.NumberFormat("pt-BR", {
		style: symbol ? "currency" : "decimal",
		currency: "BRL",
		currencyDisplay: symbol ? "symbol" : undefined,
		maximumFractionDigits: precision,
		minimumFractionDigits: precision,
	});

	// Stryker disable next-line CallExpression: this is a performance cache; not populating it only means the next call rebuilds an equivalent formatter, which formats identically
	formatters.set(key, formatter);

	return formatter;
};

const toNumber = (value: unknown, precision: number): number => {
	if (typeof value === "string") {
		return parseDecimal(value, { maxFractionDigits: Math.max(DEFAULT_PRECISION, precision) });
	}

	return Number(value);
};

/**
 * Formats a given value as a currency string in Brazilian Real (BRL).
 *
 * String inputs are read by the same rule as `parseCurrency`, except that a value written
 * without any separator stays in whole units: the last `,` or `.` followed by 1 to 2 digits
 * (or up to `precision` digits, when that is larger) is the decimal separator, every other
 * `,` or `.` is a thousands separator, and a `-` written before the first digit is preserved.
 * So `"1.234,56"` formats as `"1.234,56"`, `"-10.5"` as `"-10,50"` and `"1234"` as
 * `"1.234,00"`.
 *
 * A value that is not a finite number, such as `NaN`, `Infinity` or `-Infinity`, formats as
 * an empty string, and so does a value that cannot be coerced to a number at all, such as a
 * symbol, a null-prototype object or a plain object (`Number({})` is `NaN`); every other
 * value goes through `Number()` the way 2.3.0 did, so `null`, `[]` and `true` still format.
 *
 * The precision is clamped to `0-20`, the range Node's `Intl.NumberFormat` accepts, and a
 * precision that is not a finite number falls back to 2.
 *
 * @param {string|number} value - The value to be formatted. Can be a string or a number.
 * @param {FormatCurrencyOptions} [options] - Optional formatting options.
 * @param {boolean} options.symbol - If true, includes the currency symbol in the formatted string.
 * @param {number} options.precision - The number of decimal places to include in the formatted string. Defaults to 2, clamped to 0-20.
 * @returns {string} The formatted currency string, or an empty string when the value is not finite.
 *
 * The `R$` prefix and the comma before the centavos are the ones Lei nº 9.069/1995, art. 1º,
 * §§ 1º and 2º prescribes; the `.` grouping comes from the CLDR pt-BR locale data behind
 * `Intl.NumberFormat`.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l9069.htm
 * @see Based on: https://cldr.unicode.org/
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56); // "1.234,56"
 * formatCurrency(1234.56, { symbol: true }); // "R$ 1.234,56"
 * formatCurrency(-10.5); // "-10,50"
 * formatCurrency("1.234,56"); // "1.234,56"
 * formatCurrency("1234"); // "1.234,00"
 * formatCurrency(Number.NaN); // ""
 * ```
 */
export const formatCurrency = (value: string | number, options?: FormatCurrencyOptions): string => {
	const precision = clampPrecision(options?.precision);

	try {
		const enhancedValue = toNumber(value, precision);

		if (!Number.isFinite(enhancedValue)) return "";

		return getFormatter(Boolean(options?.symbol), precision)
			.format(enhancedValue)
			.replaceAll("\u00A0", " ");
	} catch {
		return "";
	}
};
