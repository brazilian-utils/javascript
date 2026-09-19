import { type GtinLength, type GtinType } from "./get-gtin-info";

/** A GTIN is written with digits only, so anything else is turned down before it is measured. */
export const DIGITS_REGEX = /^\d+$/;

/**
 * The four GTIN structures of the GS1 General Specifications, the same four the NF-e leiaute
 * accepts in `cEAN` and `cEANTrib` (NT 2021.003, chapter 3, fields I03 and I12: "GTIN-8, GTIN-12,
 * GTIN-13 ou GTIN-14").
 */
export const GTIN_LENGTHS: readonly GtinLength[] = [8, 12, 13, 14];

/** The name GS1 gives to the structure of each length. */
export const GTIN_TYPES: Record<GtinLength, GtinType> = {
	8: "GTIN-8",
	12: "GTIN-12",
	13: "GTIN-13",
	14: "GTIN-14",
};

/** Every GTIN is compared in its 14 digit form, left padded with zeros. */
export const NORMALIZED_LENGTH = 14;

/**
 * The six zeros a GTIN-8 gets in the 14 digit form. GS1 leaves the prefixes 0000001 to 0000099
 * unused so that no longer GTIN collides with one (General Specifications, table 1-4), and the
 * "Tabela Prefixo GS1" of the Portal da NF-e reads the prefix the same way: from positions 7 to 9
 * when the first six are zeros, from positions 2 to 4 otherwise.
 */
export const GS1_8_PADDING = "000000";

/** The GS1 Prefixes of GS1 Brasil, the ones NT 2021.003 calls "prefixo do Brasil". */
export const BRAZILIAN_PREFIXES: readonly string[] = ["789", "790"];

/**
 * The GS1 Prefix ranges table 1-4 of the General Specifications sets aside for Restricted
 * Circulation Numbers: 02 and 20 to 29 (within a geographic region) and 04 (within a company).
 * The range 0000000 falls under the GS1-8 reading below.
 */
export const RESTRICTED_PREFIX_REGEX = /^(?:02|04|2)/;

/**
 * The GS1-8 Prefix ranges table 1-5 of the General Specifications sets aside for Restricted
 * Circulation Numbers within a company: 000 to 099 and 200 to 299.
 */
export const RESTRICTED_GS1_8_PREFIX_REGEX = /^[02]/;
