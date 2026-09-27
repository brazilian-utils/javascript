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

/**
 * A CRO number in either of two shapes, read after the separators are stripped:
 * - the conventional one, the number followed by the UF (`"12345/SP"`);
 * - the one of the Consolidação das Normas do CFO (Resolução CFO-63/2005), art. 115, § 1º: the
 *   sigla of the Conselho Regional (`CRO-SP`) before the number, joined by a hyphen to the
 *   category of the inscrição when there is one (`TPD`, `TSB`, `ASB`, `APD`, `CLM`/`CLF`,
 *   `LPM`/`LPF`, `PV` provisória, `T` temporária), and the number followed by `-IS` for an
 *   inscrição secundária of the alíneas "a" to "e" or by `-R` for an inscrição remida
 *   (`"CRO-SP 12345"`, `"CRO-SP-TPD 1234-IS"`, `"CRO-SP 12345-R"`).
 *
 * The art. 115 fixes no digit count ("numeração cronológica infinita", § 5º), so both shapes take
 * the conventional 3 to 6 digits. Which category and suffix go together is checked against
 * `CRO_SUFFIXES_BY_CATEGORY`.
 */
export const CRO_REGEX =
	/^(?:\d{3,6}(?<uf>[A-Z]{2})|CRO(?<councilUf>[A-Z]{2})(?<category>[A-Z]{1,3})?\d{3,6}(?<suffix>IS|R)?)$/;

/**
 * The categories of art. 115, § 1º, of the Consolidação das Normas do CFO (`""` for the
 * cirurgião-dentista, alínea "a", which has none), each with the suffixes its number may carry:
 * `IS` for the inscrição secundária of the alíneas "a" to "e" (alínea "j") and `R` for the
 * inscrição remida, "o mesmo da inscrição principal" (alínea "k"), which only the
 * cirurgião-dentista and the técnico em prótese dentária hold.
 */
export const CRO_SUFFIXES_BY_CATEGORY: Readonly<Record<string, readonly string[]>> = {
	"": ["IS", "R"],
	TPD: ["IS", "R"],
	TSB: ["IS"],
	ASB: ["IS"],
	APD: ["IS"],
	CLM: [],
	CLF: [],
	LPM: [],
	LPF: [],
	PV: [],
	T: [],
};

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
