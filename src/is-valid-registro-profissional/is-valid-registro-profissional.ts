import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { isStateCode } from "../_internals/is-state-code/is-state-code";
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

export type { StateCode } from "../_internals/constants/states";

/** The registration `isValidRegistroProfissional` checks: the number, the council that issued it and, optionally, the UF it must belong to. */
export type IsValidRegistroProfissionalParams = {
	/** The registration number to be validated, e.g. `"123456/SP"`. */
	value: string;
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
 * `params.stateCode`. It never computes or asserts a check digit, even for CRC, whose format
 * includes one (the digit is only checked for presence and shape).
 *
 * Supported councils and what is validated:
 * - `"OAB"` (Ordem dos Advogados do Brasil): 4 to 6 digits + UF, e.g. `"123456/SP"`.
 * - `"CRM"` (Conselho Regional de Medicina): 4 to 6 digits + UF, e.g. `"123456-SP"`.
 * - `"CRO"` (Conselho Regional de Odontologia): 3 to 6 digits + UF, e.g. `"12345/SP"`.
 * - `"CRP"` (Conselho Regional de Psicologia): 2 digit regional code + 4 to 6 digits, e.g.
 *   `"06/12345"`. The regional code must be one of the 24 Conselhos Regionais of the CFP
 *   system, CRP-01 to CRP-24. It is not a literal UF (some regions cover more than one state),
 *   so `params.stateCode` is ignored for this council.
 * - `"CRC"` (Conselho Regional de Contabilidade): UF + 6 digits + the tipo de registro (`"O"`
 *   Originário or `"P"` Provisório) + 1 check digit whose value is not verified, e.g.
 *   `"SP-123456/O-3"`. The letter says nothing about the professional category: the Manual de
 *   Registro states that the distinction between `"O"` and `"P"` applies "independentemente da
 *   categoria profissional do contabilista". A Registro Transferido or Secundário is written by
 *   appending `"T"` or `"S"` and the UF of the destination CRC **after** the check digit, as the
 *   Resolução CFC nº 1.707/2023, art. 5º, parágrafo único, and the Manual's own examples
 *   (`"SP-123456/O-3 T-MG"`, `"TO-654321/P-8 T-SC"`, `"PI-111222/O-5 S-AC"`) put it. Both UFs
 *   have to be real state codes; `params.stateCode` is compared against the originating one,
 *   the UF the número do Registro Originário belongs to.
 *
 * CREA (Conselho Regional de Engenharia e Agronomia) is not supported: since the 2016 national
 * unification (RNP) its registration number format could not be confirmed from an official,
 * publicly documented source.
 *
 * Only the CRC shape and the CRP regional codes rest on a published source: the CFP page lists
 * the 24 Conselhos Regionais and nothing else, so the 4 to 6 digit body of a CRP number is as
 * unsourced as the OAB, CRM and CRO ranges. The OAB, the CFM and the CFO do not publish the
 * format of the numbers their seccionais and regionais issue, so the digit ranges accepted for
 * `"OAB"`, `"CRM"` and `"CRO"` are conventional rather than normative, and two counterexamples
 * are known: the OAB/SP public search field is `maxlength="7"` and rejects only inputs of two
 * characters or fewer, and the CFM's Manual de Procedimentos Administrativos documents a `300`
 * prefixed CRM for foreign-trained physicians and a trailing `P` for inscrição provisória,
 * neither of which the accepted shape can express.
 *
 * Everything it needs travels in a single object, the shape `isValidBankAccount` takes: a
 * registration number means nothing without the council that issued it, so the two are read
 * together. A value that is not an object, or one missing `value` or `council`, is `false` like
 * any other registration it cannot recognise.
 *
 * @param {IsValidRegistroProfissionalParams} params - The registration to be validated.
 * @param {string} params.value - The registration number, e.g. `"123456/SP"`.
 * @param {RegistroProfissionalCouncil} params.council - The issuing council.
 * @param {string} [params.stateCode] - The expected UF, ignored for `"CRP"`.
 * @returns {boolean} True if the value has the structure of a registration number for the
 * given council, false otherwise.
 *
 * @example
 * ```typescript
 * isValidRegistroProfissional({ value: "123456/SP", council: "OAB" }); // true
 * isValidRegistroProfissional({ value: "123456-SP", council: "OAB", stateCode: "SP" }); // true
 * isValidRegistroProfissional({ value: "123456-RJ", council: "OAB", stateCode: "SP" }); // false (UF mismatch)
 * isValidRegistroProfissional({ value: "06/12345", council: "CRP" }); // true
 * isValidRegistroProfissional({ value: "SP-123456/O-3", council: "CRC" }); // true
 * isValidRegistroProfissional({ value: "SP-123456/O-3 T-MG", council: "CRC" }); // true (transferido)
 * isValidRegistroProfissional({ value: "SP-123456/T-3", council: "CRC" }); // false ("T" is not a tipo)
 * isValidRegistroProfissional({ value: "123456", council: "OAB" }); // false (no UF)
 * ```
 *
 * @see Official: https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf
 * Manual de Registro do Sistema CFC/CRCs, item 1.1: the CRC registration is the sigla of the UF,
 * six sequential digits, the letter of the tipo de registro and a check digit, with
 * "UF-000001/P-7" and "UF-000002/O-5" as its own worked examples; the same item adds the "T" of
 * the Registro Transferido "ao número do Registro Definitivo Originário ou Registro Provisório …
 * acompanhada de um hífen e da sigla designativa da jurisdição do CRC de destino".
 * @see Official: https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf
 * Resolução CFC nº 1.707/2023, art. 5º parágrafo único: "No caso de Registro Transferido, ao
 * número do Registro Originário será acrescentada a letra 'T', acompanhada da sigla designativa da
 * jurisdição do CRC de destino."
 * @see Official: https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/
 * Conselho Federal de Psicologia: the 24 Conselhos Regionais of the system, numbered CRP-01 to
 * CRP-24. The page establishes the regional codes only; it publishes no length for the inscription
 * number itself.
 * @see Official: https://www.oab.org.br/
 * Ordem dos Advogados do Brasil (OAB), the federal body that regulates the profession, which
 * publishes no format for the número de inscrição and the seccional.
 * @see Official: https://portal.cfm.org.br/
 * Conselho Federal de Medicina (CFM), the autarquia federal that regulates the profession, which
 * publishes no format for the registration number and the UF.
 * @see Official: https://cfo.org.br/
 * Conselho Federal de Odontologia (CFO), the autarquia federal that regulates the profession,
 * which publishes no format for the registration number and the UF.
 */
export const isValidRegistroProfissional = (params: IsValidRegistroProfissionalParams): boolean => {
	if (isNullish(params)) return false;

	const { value, council, stateCode } = params;

	if (typeof value !== "string") return false;

	if (!Object.hasOwn(REGEX_BY_COUNCIL, council)) return false;

	const regex = REGEX_BY_COUNCIL[council];

	const match = regex.exec(sanitizeToAlphanumeric(value));

	if (!match?.groups) return false;

	const { region, uf, transferUf } = match.groups;

	if (region !== undefined && !isKnownCrpRegion(region)) return false;

	if (transferUf !== undefined && !isStateCode(transferUf)) return false;

	if (uf === undefined) return true;

	if (!isStateCode(uf)) return false;

	return !stateCode || uf === stateCode;
};
