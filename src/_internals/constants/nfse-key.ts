/**
 * Shape of the key: 50 characters, all digits but the 14 of the "Inscrição Federal", which may
 * also be the upper case letters of an alphanumeric CNPJ, optionally behind the `NFS` literal the
 * `Id` attribute of `infNFSe` puts in front of it. It follows `TSIdNFSe` of
 * `tiposSimples_v1.01.xsd` (bundle 20260727), `NFS[0-9]{9}[0-9A-Z]{14}[0-9]{27}`, whose letter
 * window is the registration of the key structure. The DANFSe prints the key "em único bloco" (Nota Técnica
 * SE/CGNFS-e 008, item 2.1.1), so it has no printed mask; the boundaries of its fields, `Cód.Mun.(7)
 * Amb.Ger.(1) Tipo de Inscrição Federal(1) Inscrição Federal(14) nNFSe(13) AAMM(4) Cód.Num.(9)
 * DV(1)`, are where a separator is accepted, any run of whitespace, `.`, `-` or `/`, as
 * `isValidCpf` reads the boundaries of its groups. Case-insensitive, as `isValidCnpj` with version 2
 * is: `readNfseKey` joins the eight capture groups and upper cases them. Whether a letter may stand
 * in the registration at all is left to the registration type, since only a CNPJ (type 2) can
 * carry one.
 */
export const FORMAT_REGEX =
	/^(?:nfs)?(\d{7})[\s.\-/]*(\d)[\s.\-/]*(\d)[\s.\-/]*([\dA-Z]{14})[\s.\-/]*(\d{13})[\s.\-/]*(\d{4})[\s.\-/]*(\d{9})[\s.\-/]*(\d)$/i;

/**
 * Characters of the key, type `TSChaveNFSe` of the leiaute, the length `parseNfseKey` caps its
 * result at.
 */
export const NFSE_KEY_LENGTH = 50;

/**
 * The `ambGer` (ambiente gerador) codes of `TSAmbGeradorNFSe`: 1 for the system of the
 * municipality (Prefeitura), 2 for the Sistema Nacional NFS-e (Sefin Nacional). In code order,
 * so code `n` sits at index `n - 1`.
 */
export const GENERATOR_ENVIRONMENTS = [1, 2] as const;

/**
 * The "Tipo de Inscrição Federal" codes of the key, as rule E1263 of the ANEXO I states them:
 * 1 for a CPF and 2 for a CNPJ.
 */
export const TAX_ID_TYPES: Readonly<Record<string, "cpf" | "cnpj">> = { "1": "cpf", "2": "cnpj" };

/** The zeros that pad an 11 digit CPF to the 14 positions of the "Inscrição Federal" field. */
export const CPF_PADDING = "000";

/**
 * A number of all zeros is not a valid `nNFSe`: the leiaute types it `TSNNFSe`, whose pattern is
 * `[1-9]{1}[0-9]{0,12}`.
 */
export const ABSENT_NUMBER = "0000000000000";

/** Position of `ambGer` inside the 50 character key. */
export const GENERATOR_ENVIRONMENT_INDEX = 7;

/** Position of the "Tipo de Inscrição Federal" inside the 50 character key. */
export const TAX_ID_TYPE_INDEX = 8;

/** Start of the "Inscrição Federal" inside the 50 character key. */
export const TAX_ID_START = 9;

/** Start of the NFS-e number (`nNFSe`), which is also the end of the "Inscrição Federal". */
export const NUMBER_START = 23;

/** Start of the issue year and month (AAMM), which is also the end of the NFS-e number. */
export const YEAR_START = 36;

/** Start of the issue month, which is also the end of the issue year. */
export const MONTH_START = 38;

/** Start of the numeric code (Cód.Num.), which is also the end of the issue month. */
export const CODE_START = 40;

/** Position of the check digit (DV), which is also the end of the numeric code. */
export const CHECK_DIGIT_INDEX = 49;
