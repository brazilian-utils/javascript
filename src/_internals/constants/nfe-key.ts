/** Characters of a DF-e (NF-e, NFC-e, CT-e or MDF-e) access key (chave de acesso). */
export const NFE_KEY_LENGTH = 44;

/**
 * Start (0 based) of the 12 characters of the key that may be letters: the root and the order
 * of an alphanumeric CNPJ, positions 7 to 18 of the key.
 */
export const NFE_KEY_ALPHANUMERIC_START = 6;

/**
 * End (0 based, exclusive) of the 12 characters of the key that may be letters. The two CNPJ
 * check digits that follow (positions 19 and 20) stay digits, like every other field.
 */
export const NFE_KEY_ALPHANUMERIC_END = 18;

/**
 * The access key once its mask is removed and its letters upper cased: `TChNFe` of
 * `tiposBasico_v4.00.xsd` (PL_010), `[0-9]{6}[0-9A-Z]{12}[0-9]{26}`, the pattern `TChDFe` of the
 * CT-e (PL_CTe_400_RTC) and `TChMDFe` of the MDF-e (PL_MDFe_300b) repeat.
 */
export const NFE_KEY_REGEX = /^\d{6}[0-9A-Z]{12}\d{26}$/;

/**
 * The prefixes the `Id` attribute of a DF-e XML puts in front of the 44 characters, one per
 * document: `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom`. Stripped before the key is read,
 * since `NF3e` carries a digit of its own. Shared by `getNfeKeyInfo` and `parseNfeKey`.
 */
export const XML_ID_PREFIX_REGEX = /^(?:nfe|cte|mdfe|bpe|nf3e|nfcom)/i;
