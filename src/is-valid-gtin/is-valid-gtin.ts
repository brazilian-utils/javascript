import { mod10 } from "../_internals/mod10/mod10";
import { ALL_ZEROS_REGEX, DIGITS_REGEX, GTIN_LENGTHS } from "./constants";

/** How many digits a GTIN may be written with. */
export type GtinLength = 8 | 12 | 13 | 14;

/** Options of `isValidGtin`. */
export type IsValidGtinOptions = {
	/** The lengths to accept (default: all four, 8, 12, 13 and 14). */
	lengths?: GtinLength[];
};

/**
 * Validates a GTIN (Global Trade Item Number, the number under an EAN/UPC barcode).
 *
 * Covers the four structures of the GS1 General Specifications, the same four the NF-e accepts
 * in `cEAN` and `cEANTrib`: GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) and GTIN-14 (DUN-14). The value
 * must be a string of 8, 12, 13 or 14 digits, surrounding whitespace aside, whose last digit is
 * the GS1 modulo 10 check digit: weights 3 and 1 alternating from the right, the sum subtracted
 * from the nearest equal or higher multiple of ten. This is what rules I03-10 and I12-10 of the
 * NF-e check (rejections 611 and 612). The `"SEM GTIN"` literal the NF-e uses for a product
 * without a GTIN is not a GTIN, so it is not valid here. Leading zeros count, so a number is
 * never accepted.
 *
 * The prefix does not change the verdict: Restricted Circulation Numbers (prefixes 02, 04 and 20
 * to 29, the codes a shop prints on its own scale labels) and the ISSN, ISBN and coupon ranges
 * share the structure and the check digit. SEFAZ checks the prefix against its own "Tabela
 * Prefixo GS1" (rules I03-20 and I12-20), which could not be read to say which ranges it accepts.
 * `getGtinInfo` tells the restricted and the Brazilian prefixes
 * apart for the caller that needs to. Whether the number is registered with GS1 (the Cadastro
 * Centralizado de GTIN lookup of rules 9I03-10 and 9I12-10) cannot be checked offline.
 *
 * A value of zeros only is rejected, although its check digit is valid. That is a rule of this
 * library: no NF-e rule rejects it (rejection 611 is only the check digit), and the GS1 General
 * Specifications reserve the GS1 Prefix 0000000 for Restricted Circulation Numbers within a
 * company (table 1-4) rather than forbid it. Zeros are rejected as the usual placeholder for a
 * missing GTIN, which the NF-e writes as "SEM GTIN".
 *
 * @param {string} value - The GTIN to be validated, digits only.
 * @param {IsValidGtinOptions} [options] - Optional options.
 * @param {GtinLength[]} [options.lengths] - The lengths to accept. Defaults to all four.
 * @returns {boolean} True if the GTIN is valid, false otherwise.
 *
 * @see Official: https://ref.gs1.org/standards/genspecs/
 * GS1 General Specifications, release 26.0: section 7.9.1 (check digit, tables 7-8 and 7-9);
 * tables 1-4 and 1-5 (GS1 Prefix 0000000 and GS1-8 Prefixes 000 to 099, Restricted Circulation
 * Numbers within a company).
 * @see Official: https://www.gs1.org/services/how-calculate-check-digit-manually
 * GS1, "How to calculate a check digit manually", source of the 6291041500213 example.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=SrQT9ys8ODo%3D
 * SEFAZ Nota Técnica 2021.003 (Validação GTIN, replaces NT 2017.001), v1.50 of September 2026:
 * fields I03 `cEAN` and I12 `cEANTrib`, rules I03-10 and I12-10 (rejections 611 and 612, "com
 * dígito de controle inválido").
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Oc+fygAxwmc%3D
 * "Tabela Prefixo GS1" of the Portal da NF-e, the table rules I03-20 and I12-20 check the prefix
 * against (not readable from where this was written, so its contents are not relied on).
 *
 * @example
 * ```typescript
 * isValidGtin("7890000000017"); // true (GTIN-13, GS1 Brasil prefix)
 * isValidGtin("6291041500213"); // true (the GS1 example)
 * isValidGtin("78912342"); // true (GTIN-8)
 * isValidGtin("061414112345"); // true (GTIN-12)
 * isValidGtin("17890000000014"); // true (GTIN-14)
 * isValidGtin("7890000000018"); // false (wrong check digit)
 * isValidGtin("17890000000014", { lengths: [8, 12, 13] }); // false (GTIN-14 not accepted)
 * isValidGtin("SEM GTIN"); // false
 * isValidGtin("0000000000000"); // false (zeros only, a rule of this library)
 * ```
 */
export const isValidGtin = (value: string, options?: IsValidGtinOptions): boolean => {
	if (typeof value !== "string") return false;

	const digits = value.trim();

	if (!DIGITS_REGEX.test(digits) || ALL_ZEROS_REGEX.test(digits)) return false;

	const length = GTIN_LENGTHS.find((candidate) => candidate === digits.length);

	if (length === undefined) return false;

	const lengths = options?.lengths;

	if (Array.isArray(lengths) && !lengths.includes(length)) return false;

	return mod10(digits.slice(0, -1), { variant: "gs1" }) === Number(digits.at(-1));
};
