/** Digits of an Inscrição SUFRAMA written in full, sector code with its leading zero included. */
export const SUFRAMA_LENGTH = 9;

/**
 * The `SS.NNNN.LLD` fields, the sector with or without its leading zero, split as `isValidCpf`
 * splits its groups: any run of whitespace, `.`, `-` or `/` between two fields.
 */
export const SUFRAMA_FORMAT_REGEX = /^\d{1,2}[\s.\-/]*\d{4}[\s.\-/]*\d{2}[\s.\-/]*\d$/;
