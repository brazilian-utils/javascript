import { DATA, type StateCode } from "../_internals/constants/states";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import {
	CRC_REGEX,
	CRO_REGEX,
	CRP_MAX_REGION,
	CRP_MIN_REGION,
	CRP_REGEX,
	PROFESSIONAL_NUMBER_UF_REGEX,
	type RegistroProfissionalCouncil,
} from "./constants";

/** The options `isValidRegistroProfissional` takes: the professional council and, optionally, the UF the registration must belong to. */
export type IsValidRegistroProfissionalOptions = {
	/** The professional council that issued the registration number. */
	council: RegistroProfissionalCouncil;
	/** The UF the registration is expected to belong to. Ignored for `"CRP"` (see below). */
	stateCode?: StateCode;
};

const REGEX_BY_COUNCIL: Record<RegistroProfissionalCouncil, RegExp> = {
	OAB: PROFESSIONAL_NUMBER_UF_REGEX,
	CRM: PROFESSIONAL_NUMBER_UF_REGEX,
	CRO: CRO_REGEX,
	CRP: CRP_REGEX,
	CRC: CRC_REGEX,
};

const isKnownStateCode = (value: string): boolean => DATA.some((state) => state.code === value);

const isKnownCrpRegion = (value: string): boolean => {
	const region = Number(value);

	return region >= CRP_MIN_REGION && region <= CRP_MAX_REGION;
};

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
 *   `"06/12345"`. The regional code must be one of the 24 Conselhos Regionais of the CFP
 *   system, CRP-01 to CRP-24. It is not a literal UF (some regions cover more than one state),
 *   so `options.stateCode` is ignored for this council.
 * - `"CRC"` (Conselho Regional de Contabilidade): UF + 6 digits + the tipo de registro (`"O"`
 *   Originário, `"P"` Provisório or `"T"` Transferido) + 1 check digit whose value is not
 *   verified, e.g. `"SP-123456/O-3"`. The letter says nothing about the professional category:
 *   the Manual de Registro states that the distinction between `"O"` and `"P"` applies
 *   "independentemente da categoria profissional do contabilista", and `"T"` comes from the
 *   Resolução CFC nº 1.707/2023, art. 5º, parágrafo único, which appends it to the número do
 *   Registro Originário when a registration is transferred to another CRC.
 *
 * CREA (Conselho Regional de Engenharia e Agronomia) is not supported: since the 2016 national
 * unification (RNP) its registration number format could not be confirmed from an official,
 * publicly documented source.
 *
 * Only the CRC and the CRP shapes rest on a published source. The OAB, the CFM and the CFO do
 * not publish the format of the numbers their seccionais and regionais issue, so the digit
 * ranges accepted for `"OAB"`, `"CRM"` and `"CRO"` are conventional rather than normative.
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
 *
 * @see Official: https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf Manual de
 * Registro do Sistema CFC/CRCs, item 1.1: the CRC registration is the sigla of the UF, six
 * sequential digits, the letter of the tipo de registro and a check digit, with "UF-000001/P-7"
 * and "UF-000002/O-5" as its own worked examples.
 * @see Official: https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/ Conselho
 * Federal de Psicologia: the 24 Conselhos Regionais of the system, numbered CRP-01 to CRP-24.
 * @see Based on: https://www.oab.org.br/ Ordem dos Advogados do Brasil (OAB), which publishes
 * no format for the número de inscrição and the seccional.
 * @see Based on: https://portal.cfm.org.br/ Conselho Federal de Medicina (CRM), which publishes
 * no format for the registration number and the UF.
 * @see Based on: https://cfo.org.br/ Conselho Federal de Odontologia (CRO), which publishes no
 * format for the registration number and the UF.
 */
export const isValidRegistroProfissional = (
	value: string,
	options: IsValidRegistroProfissionalOptions,
): boolean => {
	if (typeof value !== "string") return false;

	if (typeof options !== "object" || options === null) return false;

	if (!Object.hasOwn(REGEX_BY_COUNCIL, options.council)) return false;

	const regex = REGEX_BY_COUNCIL[options.council];

	const match = regex.exec(sanitizeToAlphanumeric(value));

	if (!match?.groups) return false;

	const { region, uf } = match.groups;

	if (region !== undefined && !isKnownCrpRegion(region)) return false;

	if (uf === undefined) return true;

	if (!isKnownStateCode(uf)) return false;

	return !options.stateCode || uf === options.stateCode;
};
