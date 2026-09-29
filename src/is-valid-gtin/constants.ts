import { type GtinLength } from "./is-valid-gtin";

/** A GTIN is written with digits only, so anything else is turned down before it is measured. */
export const DIGITS_REGEX = /^\d+$/;

/**
 * A GTIN of zeros only, which `isValidGtin` rejects by a rule of this library, not of an official
 * source. Its check digit works out (the GS1 check digit of zeros is zero), so rule I03-10 of the
 * NF-e (rejection 611, "cEAN com dígito de controle inválido", NT 2021.003 v1.30) lets it through,
 * and no NF-e rule or technical note rejects a GTIN of zeros. The GS1 General Specifications
 * (release 26.0) do not forbid it either: table 1-4 reserves the GS1 Prefix 0000000 "to issue
 * Restricted Circulation Numbers within a company", and table 1-5 the GS1-8 Prefixes 000 to 099,
 * so a GTIN of zeros is a company-internal RCN, not a number GS1 allocates for open trade. The
 * NF-e leiaute reserves the literal "SEM GTIN" for an item with no GTIN, so zeros are almost
 * always a placeholder, which is why they are rejected; the other RCN are accepted.
 */
export const ALL_ZEROS_REGEX = /^0+$/;

/**
 * The four GTIN structures of the GS1 General Specifications, the same four the NF-e leiaute
 * accepts in `cEAN` and `cEANTrib` (NT 2021.003, chapter 3, fields I03 and I12: "GTIN-8, GTIN-12,
 * GTIN-13 ou GTIN-14").
 */
export const GTIN_LENGTHS: readonly GtinLength[] = [8, 12, 13, 14];
