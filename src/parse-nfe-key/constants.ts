/** Valid `mod` (modelo do documento) values shared by every DF-e access key. */
export const VALID_MODELS = ["55", "57", "58", "65"] as const;

/** Digits, optional whitespace between groups, optional `NFe` prefix from the XML `Id` attribute. */
export const FORMAT_REGEX = /^(?:nfe)?[\d\s]+$/i;

/** Start of the document number (nNF) inside the 44 digit key. */
export const NUMBER_START = 25;

/** End (exclusive) of the document number (nNF) inside the 44 digit key. */
export const NUMBER_END = 34;

/** A document number of all zeros is not a valid nNF. */
export const ABSENT_NUMBER = "000000000";
