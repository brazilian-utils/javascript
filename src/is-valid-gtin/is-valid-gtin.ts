import { type GtinLength, getGtinInfo } from "../get-gtin-info/get-gtin-info";

export type { GtinLength } from "../get-gtin-info/get-gtin-info";

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
 * share the structure and the check digit, and the "Tabela Prefixo GS1" SEFAZ validates `cEAN`
 * against lists them as valid. `getGtinInfo` tells the restricted and the Brazilian prefixes
 * apart for the caller that needs to. Whether the number is registered with GS1 (the Cadastro
 * Centralizado de GTIN lookup of rules 9I03-10 and 9I12-10) cannot be checked offline.
 *
 * @param {string} value - The GTIN to be validated, digits only.
 * @param {IsValidGtinOptions} [options] - Optional options.
 * @param {GtinLength[]} [options.lengths] - The lengths to accept. Defaults to all four.
 * @returns {boolean} True if the GTIN is valid, false otherwise.
 *
 * @see Official: https://ref.gs1.org/standards/genspecs/
 * GS1 General Specifications, release 26.0: section 7.9.1 (check digit, tables 7-8 and 7-9).
 * @see Official: https://www.gs1.org/services/how-calculate-check-digit-manually
 * GS1, "How to calculate a check digit manually", source of the 6291041500213 example.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=SrQT9ys8ODo%3D
 * SEFAZ Nota Técnica 2021.003 (Validação GTIN, replaces NT 2017.001): fields I03 `cEAN` and I12
 * `cEANTrib`, rules I03-10 and I12-10.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Oc+fygAxwmc%3D
 * "Tabela Prefixo GS1" of the Portal da NF-e, the prefix ranges rules I03-20 and I12-20 accept.
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
 * ```
 */
export const isValidGtin = (value: string, options?: IsValidGtinOptions): boolean => {
	const info = getGtinInfo(value);

	if (info === null) return false;

	const lengths = options?.lengths;

	return Array.isArray(lengths) ? lengths.includes(info.length) : true;
};
