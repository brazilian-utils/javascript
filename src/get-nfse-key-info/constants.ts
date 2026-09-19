/**
 * Shape of the key: one block of 50 digits, the pattern of `TSChaveNFSe` in
 * `tiposSimples_v1.01.xsd`, optionally behind the `NFS` literal the `Id` attribute of `infNFSe`
 * puts in front of it (`TSIdNFSe`). The DANFSe prints the key the same way ("em único bloco
 * contendo 50 dígitos", Nota Técnica SE/CGNFS-e 008, item 2.1.1), so there is no mask to accept.
 * The digits are the first capture group.
 */
export const FORMAT_REGEX = /^(?:nfs)?(\d{50})$/i;

/**
 * The `ambGer` (ambiente gerador) codes of `TSAmbGeradorNFSe`: 1 for the system of the
 * municipality (Prefeitura), 2 for the Sistema Nacional NFS-e (Sefin Nacional).
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

/** Position of `ambGer` inside the 50 digit key. */
export const GENERATOR_ENVIRONMENT_INDEX = 7;

/** Position of the "Tipo de Inscrição Federal" inside the 50 digit key. */
export const TAX_ID_TYPE_INDEX = 8;

/** Start of the "Inscrição Federal" inside the 50 digit key. */
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
