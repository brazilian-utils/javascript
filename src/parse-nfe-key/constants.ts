/**
 * Valid `mod` (modelo do documento) values shared by every DF-e access key: 55 NF-e, 57 CT-e,
 * 58 MDF-e, 65 NFC-e and 67 CT-e OS (Conhecimento de Transporte Eletrônico para Outros
 * Serviços), the model the CT-e MOC assigns to the transporte de pessoas, valores e excesso de
 * bagagem, which shares the same 44 digit key.
 */
export const VALID_MODELS = ["55", "57", "58", "65", "67"] as const;

/**
 * The `tpEmis` (forma de emissão) codes the MOC assigns: 1 normal, 2 contingência FS-IA,
 * 3 contingência SCAN, 4 contingência DPEC/EPEC, 5 contingência FS-DA, 6 contingência SVC-AN,
 * 7 contingência SVC-RS and 9 contingência off-line da NFC-e. 8 is not assigned.
 */
export const VALID_EMISSION_TYPES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 9];

/** Digits, optional whitespace between groups, optional `NFe` prefix from the XML `Id` attribute. */
export const FORMAT_REGEX = /^(?:nfe)?[\d\s]+$/i;

/** Start of the document number (nNF) inside the 44 digit key. */
export const NUMBER_START = 25;

/** End (exclusive) of the document number (nNF) inside the 44 digit key. */
export const NUMBER_END = 34;

/** A document number of all zeros is not a valid nNF. */
export const ABSENT_NUMBER = "000000000";
