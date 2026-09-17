/** Digits of a DF-e (NF-e, NFC-e, CT-e or MDF-e) access key (chave de acesso). */
export const NFE_KEY_LENGTH = 44;

/**
 * The prefixes the `Id` attribute of a DF-e XML puts in front of the 44 digits, one per
 * document: `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom`. Stripped before the digits are
 * read, since `NF3e` carries a digit of its own. Shared by `getNfeKeyInfo` and `parseNfeKey`.
 */
export const XML_ID_PREFIX_REGEX = /^(?:nfe|cte|mdfe|bpe|nf3e|nfcom)/i;
