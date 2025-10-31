type FormatOptions = {
  precision?: number;
};

/**
 * Formats a number as Brazilian currency string (BRL)
 * @param value - The number to be formatted
 * @param options - Formatting options
 * @param options.precision - Number of decimal places (default: 2)
 * @returns The formatted currency string
 * @example
 * format(1234.56) // returns "1.234,56"
 * format(1234.56, { precision: 3 }) // returns "1.234,560"
 */
export function format(value: number, options: FormatOptions = { precision: 2 }): string {
  return value
    .toFixed(options.precision)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

/**
 * Parses a string representing Brazilian currency format into a number.
 * Removes all non-digit characters and converts the result to a decimal number.
 * 
 * @param value - The string value to be parsed (e.g., "R$ 1.234,56" or "1234,56")
 * @returns The parsed number value (e.g., 1234.56)
 * 
 * @example
 * ```typescript
 * parse("R$ 1.234,56") // returns 1234.56
 * parse("1234,56") // returns 1234.56
 * parse("R$ 0,50") // returns 0.50
 * parse("") // returns 0
 * ```
 */
export function parse(value: string): number {
  return parseInt(value.replace(/\D/g, '') || '0', 10) / 100;
}
