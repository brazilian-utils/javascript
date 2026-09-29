/** The Brazilian license plate formats: the old `LLLNNNN` and the Mercosul `LLLNLNN`. */
export type LicensePlateFormat = "LLLNNNN" | "LLLNLNN";

/**
 * The characters a masked plate is written with: 3 letters, a run of whitespace, `.`, `-` or `/`
 * that may be empty, then 4 letters or digits, surrounding whitespace aside. The mask can only sit
 * after the third character; any other character makes the plate invalid.
 */
export const MASKED_PLATE_REGEX = /^\s*[A-Za-z]{3}[\s.\-/]*[0-9A-Za-z]{4}\s*$/;
/** The old Brazilian plate sequence, `LLLNNNN`, over the sanitized value. */
export const OLD_FORMAT_REGEX = /^[A-Z]{3}[0-9]{4}$/;
/** The Mercosul plate sequence, `LLLNLNN`, over the sanitized value. */
export const MERCOSUL_REGEX = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
