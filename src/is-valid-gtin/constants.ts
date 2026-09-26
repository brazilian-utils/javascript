import { type GtinLength } from "./is-valid-gtin";

/** A GTIN is written with digits only, so anything else is turned down before it is measured. */
export const DIGITS_REGEX = /^\d+$/;

/**
 * A GTIN of zeros only. Its check digit works out (the GS1 check digit of zeros is zero), but GS1
 * never allocates it: every GTIN carries a GS1 Company Prefix, and the prefix 0000000 of table 1-4
 * of the General Specifications only ever holds a GTIN-8 behind it, never zeros. The NF-e leiaute
 * reserves the literal "SEM GTIN" for an item with no GTIN, so zeros are a placeholder, not a code.
 */
export const ALL_ZEROS_REGEX = /^0+$/;

/**
 * The four GTIN structures of the GS1 General Specifications, the same four the NF-e leiaute
 * accepts in `cEAN` and `cEANTrib` (NT 2021.003, chapter 3, fields I03 and I12: "GTIN-8, GTIN-12,
 * GTIN-13 ou GTIN-14").
 */
export const GTIN_LENGTHS: readonly GtinLength[] = [8, 12, 13, 14];
