import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { isStateCode } from "../_internals/is-state-code/is-state-code";
import { readStateCode } from "../_internals/read-state-code/read-state-code";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import {
	CRC_REGEX,
	CRO_REGEX,
	CRO_SUFFIXES_BY_CATEGORY,
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

const isKnownCroCategory = (category: string, suffix: string | undefined): boolean =>
	Object.hasOwn(CRO_SUFFIXES_BY_CATEGORY, category) &&
	(suffix === undefined || CRO_SUFFIXES_BY_CATEGORY[category].includes(suffix));

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
 * - `"CRO"` (Conselho Regional de Odontologia): 3 to 6 digits + UF, e.g. `"12345/SP"`, or the
 *   form of the Consolidação das Normas do CFO, art. 115, § 1º: the sigla of the Conselho
 *   Regional first, joined by a hyphen to the category of the inscrição when there is one, then
 *   the number, with `-IS` for a secundária and `-R` for a remida, e.g. `"CRO-SP 12345"`,
 *   `"CRO-SP-TPD 1234"`, `"CRO-SP-PV 1234"`, `"CRO-SP 12345-IS"`.
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
 * Only the CRO form of art. 115, the CRC shape and the CRP regional codes rest on a published
 * source. The CFO's Consolidação das Normas (Resolução CFO-63/2005), art. 115, § 1º, has each
 * number "precedido da sigla do Conselho Regional", with the category letters listed above, but
 * no digit count, so the 3 to 6 digits of both CRO shapes and the number-then-UF shape are
 * conventional. The CFP page lists the 24 Conselhos Regionais and nothing else (the CRP-25 of
 * Amapá is only a 2023 proposal of the CRP-10), so the 4 to 6 digit body of a CRP number is as
 * unsourced as the OAB and CRM ranges. The CRC shape `UF-000000/O-D` is the one of the Manual de
 * Registro of 2009; the Resolução CFC nº 1.707/2023 in force only says that "a numeração do
 * Registro Originário será única e sequencial em cada CRC" and adds the `T` of the transfer, and
 * no longer has the Provisório (`P`) and Secundário (`S`) registrations the manual describes,
 * which are still accepted for the numbers issued under it; the manual's check digit is
 * "calculado de forma automatizada pelo sistema de cadastro" and its algorithm is not published.
 * The OAB (Provimento nº 95/2000, Regulamento Geral) and the CFM (Decreto nº 44.045/1958, art.
 * 9º) do not publish the format of the numbers their seccionais and regionais issue, so the digit
 * ranges accepted for `"OAB"` and `"CRM"` are conventional rather than normative, and two
 * counterexamples are known: the OAB/SP public search field is `maxlength="7"` and rejects only
 * inputs of two characters or fewer, and the CFM's Manual de Procedimentos Administrativos
 * documents a `300` prefixed CRM for foreign-trained physicians and a trailing `P` for inscrição
 * provisória, neither of which the accepted shape can express.
 *
 * Everything it needs travels in a single object, the shape `isValidBankAccount` takes: a
 * registration number means nothing without the council that issued it, so the two are read
 * together. A value that is not an object, or one missing `value` or `council`, is `false` like
 * any other registration it cannot recognise.
 *
 * @param {IsValidRegistroProfissionalParams} params - The registration to be validated.
 * @param {string} params.value - The registration number, e.g. `"123456/SP"`.
 * @param {RegistroProfissionalCouncil} params.council - The issuing council.
 * @param {string} [params.stateCode] - The expected UF, letter case and surrounding whitespace
 * ignored (`"sp"` is `"SP"`); ignored for `"CRP"`.
 * @returns {boolean} True if the value has the structure of a registration number for the
 * given council, false otherwise.
 *
 * @example
 * ```typescript
 * isValidRegistroProfissional({ value: "123456/SP", council: "OAB" }); // true
 * isValidRegistroProfissional({ value: "123456-SP", council: "OAB", stateCode: "SP" }); // true
 * isValidRegistroProfissional({ value: "123456-RJ", council: "OAB", stateCode: "SP" }); // false (UF mismatch)
 * isValidRegistroProfissional({ value: "CRO-SP-TPD 1234", council: "CRO" }); // true (CFO art. 115)
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
 * @see Official: https://www.oab.org.br/util/print?numero=95/2000&print=Legislacao&origem=Provimentos
 * Provimento nº 95/2000 of the Conselho Federal da OAB (Cadastro Nacional dos Advogados), art. 2º,
 * parágrafo único, as worded by the Provimento nº 227/2024: the CNA keeps "o número e o tipo de
 * inscrição na OAB (advogado, estagiário ou suplementar)", with no format for the number.
 * @see Official: https://www.planalto.gov.br/ccivil_03/decreto/1950-1969/d44045.htm
 * Decreto nº 44.045/1958, art. 9º, the regulation of the Conselhos de Medicina: a "carteira
 * profissional numerada" with the "número da inscrição anotada nesse Conselho Regional", and no
 * format for it.
 * @see Official: https://transparencia.cfo.org.br/wp-content/uploads/2023/09/Consolida%C3%A7%C3%A3o-das-Normas-Atualizado-emsetembro-de-2023.pdf
 * Consolidação das Normas para Procedimentos nos Conselhos de Odontologia (Resolução CFO-63/2005,
 * updated to September 2023), art. 115, § 1º: "o número de inscrição principal atribuído a
 * cirurgião-dentista será precedido da sigla do Conselho Regional", the other categories "ligada
 * por hífen às letras" `TPD`, `TSB`, `ASB`, `APD`, `CLM`/`CLF`, `LPM`/`LPF`, `PV` and `T`, the
 * secundária "seguido das letras 'IS', ligadas por hífen" and the remida "seguida da letra 'R'".
 * @see Official: https://transparencia.cfp.org.br/wp-content/uploads/2025/12/Classificacao-de-Portes-dos-CRPs-2026.csv
 * Conselho Federal de Psicologia, classification of the CRPs for 2026 (Resolução CFP nº 08/2024):
 * the same 24 regionals, CRP 01 to CRP 24.
 */
export const isValidRegistroProfissional = (params: IsValidRegistroProfissionalParams): boolean => {
	if (isNullish(params)) return false;

	const { value, council, stateCode } = params;

	if (typeof value !== "string") return false;

	if (!Object.hasOwn(REGEX_BY_COUNCIL, council)) return false;

	const regex = REGEX_BY_COUNCIL[council];

	const match = regex.exec(sanitizeToAlphanumeric(value));

	if (!match?.groups) return false;

	const { region, uf: trailingUf, councilUf, category, suffix, transferUf } = match.groups;
	const uf = trailingUf ?? councilUf;

	if (region !== undefined && !isKnownCrpRegion(region)) return false;

	if (councilUf !== undefined && !isKnownCroCategory(category ?? "", suffix)) return false;

	if (transferUf !== undefined && !isStateCode(transferUf)) return false;

	if (uf === undefined) return true;

	if (!isStateCode(uf)) return false;

	return !stateCode || uf === readStateCode(stateCode);
};
