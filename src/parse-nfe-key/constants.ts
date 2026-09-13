/**
 * The `mod` (modelo do documento) values `parseNfeKey` supports, every one of them a document
 * whose "chave de acesso" is the same 44 digit string built the same way: 55 NF-e, 57 CT-e,
 * 58 MDF-e, 62 NFCom, 63 BP-e, 64 GTV-e (the CT-e Guia de Transporte de Valores), 65 NFC-e,
 * 66 NF3e and 67 CT-e OS (Conhecimento de Transporte Eletrônico para Outros Serviços).
 *
 * Model 59, the CF-e-SAT, is deliberately left out: its 44 position "chave de consulta" is
 * composed differently, around a 9 digit SAT serial number and with no `tpEmis` field, so the
 * layout below does not describe it.
 */
export const VALID_MODELS = ["55", "57", "58", "62", "63", "64", "65", "66", "67"] as const;

/** One of the `mod` values `parseNfeKey` supports. */
export type ValidModel = (typeof VALID_MODELS)[number];

/**
 * The `tpEmis` (forma de emissão) codes each MOC assigns to its own document, so a code that is
 * meaningful for one document does not make a key of another valid.
 *
 * NF-e and NFC-e (MOC 7.0 Anexo I, field B22): 1 normal, 2 contingência FS-IA, 3 contingência
 * SCAN, 4 contingência EPEC, 5 contingência FS-DA, 6 contingência SVC-AN, 7 contingência SVC-RS
 * and 9 contingência off-line da NFC-e.
 *
 * CT-e (CT-e MOC 4.00 Anexo I, field D19): 1 normal, 3 Regime Especial NFF, 4 EPEC pela SVC,
 * 5 contingência FS-DA, 7 autorização pela SVC-RS and 8 autorização pela SVC-SP. CT-e OS
 * (field D27) drops 3 and 4, and the GTV-e (field D15) uses 1, 2 contingência off-line, 7 and
 * 8. Rule G011 of the same annex, "(7=SVC-RS e 8=SVC-SP)", is what makes 8 a real code here,
 * even though the NF-e MOC never assigns it.
 *
 * MDF-e (MDF-e MOC 3.00 Anexo I, domain D7): 1 normal, 2 contingência off-line and 3 Regime
 * Especial NFF. NFCom, BP-e and NF3e (their own Anexo I, domain D7): 1 normal and
 * 2 contingência off-line.
 */
export const EMISSION_TYPES_BY_MODEL: Readonly<Record<ValidModel, readonly number[]>> = {
	"55": [1, 2, 3, 4, 5, 6, 7, 9],
	"57": [1, 3, 4, 5, 7, 8],
	"58": [1, 2, 3],
	"62": [1, 2],
	"63": [1, 2],
	"64": [1, 2, 7, 8],
	"65": [1, 2, 3, 4, 5, 6, 7, 9],
	"66": [1, 2],
	"67": [1, 5, 7, 8],
};

/**
 * The models whose key spends position 36 on `nSiteAutoriz`, the site of the authorizer that
 * received the document, leaving 7 digits for the numeric code: NFCom (MOC 1.00a Visão Geral
 * §2.1.3) and NF3e (MOC 1.00a Visão Geral). Every other model writes an 8 digit code there.
 */
export const AUTHORIZATION_SITE_MODELS: readonly string[] = ["62", "66"];

/**
 * The `cNF` values rule B03-10 of the NF-e MOC turns down: "cNF não pode ser igual a 00000000,
 * 11111111, 22222222, 33333333, 44444444, 55555555, 66666666, 77777777, 88888888, 99999999,
 * 12345678, 23456789, 34567890, 45678901, 56789012, 67890123, 78901234, 89012345, 90123456,
 * 01234567".
 */
export const FORBIDDEN_CODES: readonly string[] = [
	"00000000",
	"11111111",
	"22222222",
	"33333333",
	"44444444",
	"55555555",
	"66666666",
	"77777777",
	"88888888",
	"99999999",
	"12345678",
	"23456789",
	"34567890",
	"45678901",
	"56789012",
	"67890123",
	"78901234",
	"89012345",
	"90123456",
	"01234567",
];

/** The models rule B03-10 is written for, the only ones whose `cNF` it constrains. */
export const FORBIDDEN_CODE_MODELS: readonly string[] = ["55", "65"];

/**
 * The prefixes the `Id` attribute of a DF-e XML puts in front of the 44 digits, one per
 * document: `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom`. Stripped before the digits are
 * read, since `NF3e` carries a digit of its own.
 */
export const XML_ID_PREFIX_REGEX = /^(?:nfe|cte|mdfe|bpe|nf3e|nfcom)/i;

/** Digits and optional whitespace between groups, what is left once the prefix is stripped. */
export const FORMAT_REGEX = /^[\d\s]+$/;

/** Start of the document number (nNF) inside the 44 digit key. */
export const NUMBER_START = 25;

/** End (exclusive) of the document number (nNF) inside the 44 digit key. */
export const NUMBER_END = 34;

/** A document number of all zeros is not a valid nNF. */
export const ABSENT_NUMBER = "000000000";
