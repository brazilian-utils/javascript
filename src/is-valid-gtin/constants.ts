import { type GtinLength } from "./is-valid-gtin";

/** A GTIN is written with digits only, so anything else is turned down before it is measured. */
export const DIGITS_REGEX = /^\d+$/;

/**
 * The four GTIN structures of the GS1 General Specifications, the same four the NF-e leiaute
 * accepts in `cEAN` and `cEANTrib` (NT 2021.003, chapter 3, fields I03 and I12: "GTIN-8, GTIN-12,
 * GTIN-13 ou GTIN-14").
 */
export const GTIN_LENGTHS: readonly GtinLength[] = [8, 12, 13, 14];
