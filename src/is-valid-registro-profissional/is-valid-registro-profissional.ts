import { DATA, type StateCode } from "../_internals/constants/states";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import {
	CRC_REGEX,
	CRM_REGEX,
	CRO_REGEX,
	CRP_REGEX,
	OAB_REGEX,
	type RegistroProfissionalCouncil,
} from "./constants";

export type IsValidRegistroProfissionalOptions = {
	/** The professional council that issued the registration number. */
	council: RegistroProfissionalCouncil;
	/** The UF the registration is expected to belong to. Ignored for `"CRP"` (see below). */
	stateCode?: StateCode;
};

const REGEX_BY_COUNCIL: Record<RegistroProfissionalCouncil, RegExp> = {
	OAB: OAB_REGEX,
	CRM: CRM_REGEX,
	CRO: CRO_REGEX,
	CRP: CRP_REGEX,
	CRC: CRC_REGEX,
};

const isKnownStateCode = (value: string): boolean => DATA.some((state) => state.code === value);

/**
 * Checks the structure of a professional council registration number (registro/inscrição
 * profissional).
 *
 * This is a structural check only: it validates the digit count and, for the councils whose
 * number embeds the UF, that the UF is a real Brazilian state code, optionally matching
 * `options.stateCode`. It never computes or asserts a check digit, even for CRC, whose format
 * includes one (the digit is only checked for presence and shape).
 *
 * Supported councils and what is validated:
 * - `"OAB"` (Ordem dos Advogados do Brasil): 4 to 6 digits + UF, e.g. `"123456/SP"`.
 * - `"CRM"` (Conselho Regional de Medicina): 4 to 6 digits + UF, e.g. `"123456-SP"`.
 * - `"CRO"` (Conselho Regional de Odontologia): 3 to 6 digits + UF, e.g. `"12345/SP"`.
 * - `"CRP"` (Conselho Regional de Psicologia): 2 digit regional code + 4 to 6 digits, e.g.
 *   `"06/12345"`. The regional code is not a literal UF (some regions cover more than one
 *   state), so `options.stateCode` is ignored for this council.
 * - `"CRC"` (Conselho Regional de Contabilidade): UF + 4 to 6 digits + category (`"O"` for
 *   Contador/Organização Contábil or `"T"` for Técnico em Contabilidade) + 1 check digit
 *   whose value is not verified, e.g. `"SP-123456/O-3"`.
 *
 * CREA (Conselho Regional de Engenharia e Agronomia) is not supported: since the 2016 national
 * unification (RNP) its registration number format could not be confirmed from an official,
 * publicly documented source.
 *
 * @param {string} value - The registration number to be validated.
 * @param {IsValidRegistroProfissionalOptions} options - The validation options.
 * @param {RegistroProfissionalCouncil} options.council - The issuing council.
 * @param {string} [options.stateCode] - The expected UF, ignored for `"CRP"`.
 * @returns {boolean} True if the value has the structure of a registration number for the
 * given council, false otherwise.
 *
 * @example
 * ```typescript
 * isValidRegistroProfissional("123456/SP", { council: "OAB" }); // true
 * isValidRegistroProfissional("123456-SP", { council: "OAB", stateCode: "SP" }); // true
 * isValidRegistroProfissional("123456-RJ", { council: "OAB", stateCode: "SP" }); // false (UF mismatch)
 * isValidRegistroProfissional("06/12345", { council: "CRP" }); // true
 * isValidRegistroProfissional("SP-123456/O-3", { council: "CRC" }); // true
 * isValidRegistroProfissional("123456", { council: "OAB" }); // false (no UF)
 * ```
 */
export const isValidRegistroProfissional = (
	value: string,
	options: IsValidRegistroProfissionalOptions,
): boolean => {
	if (typeof value !== "string") return false;

	if (typeof options !== "object" || options === null) return false;

	const regex = REGEX_BY_COUNCIL[options.council];

	if (!regex) return false;

	const match = regex.exec(sanitizeToAlphanumeric(value));

	if (!match?.groups) return false;

	const { uf } = match.groups;

	if (!uf) return true;

	if (!isKnownStateCode(uf)) return false;

	return !options.stateCode || uf === options.stateCode;
};
