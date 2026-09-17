/**
 * Structural format of each supported professional council registration number.
 *
 * The citations for these shapes live on the JSDoc of `isValidRegistroProfissional`, which is
 * also where the councils that publish no number format at all are named.
 */

export type RegistroProfissionalCouncil = "OAB" | "CRM" | "CRO" | "CRP" | "CRC";

/**
 * Registration number followed by the UF of the seccional (OAB) or of the regional (CRM), the
 * same shape for both councils.
 */
export const PROFESSIONAL_NUMBER_UF_REGEX = /^(?<number>\d{4,6})(?<uf>[A-Z]{2})$/;

export const CRO_REGEX = /^(?<number>\d{3,6})(?<uf>[A-Z]{2})$/;

export const CRP_REGEX = /^(?<region>\d{2})(?<number>\d{4,6})$/;

/**
 * UF, six digits, the tipo de registro (`O` Originário or `P` Provisório), the check digit and,
 * for a Registro Transferido or Secundário, the `T`/`S` suffix plus the UF of the destination CRC.
 */
export const CRC_REGEX =
	/^(?<uf>[A-Z]{2})(?<number>\d{6})(?<category>[OP])(?<checkDigit>\d)(?:(?<transfer>[TS])(?<transferUf>[A-Z]{2}))?$/;

/** Lowest regional code of the CFP system, CRP-01. */
export const CRP_MIN_REGION = 1;

/** Highest regional code of the CFP system, CRP-24. */
export const CRP_MAX_REGION = 24;
