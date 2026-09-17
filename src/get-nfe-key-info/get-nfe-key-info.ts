import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { NFE_KEY_LENGTH, XML_ID_PREFIX_REGEX } from "../_internals/constants/nfe-key";
import { type StateCode } from "../_internals/constants/states";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	ABSENT_NUMBER,
	AUTHORIZATION_SITE_MODELS,
	EMISSION_TYPES_BY_MODEL,
	FORBIDDEN_CODES,
	FORBIDDEN_CODE_MODELS,
	FORMAT_REGEX,
	NUMBER_END,
	NUMBER_START,
	VALID_MODELS,
} from "./constants";

export type { StateCode } from "../_internals/constants/states";

/**
 * The document models a DF-e access key can carry: `"55"` NF-e, `"57"` CT-e, `"58"` MDF-e,
 * `"62"` NFCom, `"63"` BP-e, `"64"` GTV-e, `"65"` NFC-e, `"66"` NF3e and `"67"` CT-e OS.
 * Spelled out instead of derived from `VALID_MODELS` because the allowlist is internal and API
 * Extractor cannot name it in the public report; the type test of `get-nfe-key-info.test.ts` pins
 * the two together so they cannot drift apart.
 */
export type NfeKeyModel = "55" | "57" | "58" | "62" | "63" | "64" | "65" | "66" | "67";

/** The fields `getNfeKeyInfo` reads out of a DF-e access key (chave de acesso). */
export type NfeKeyInfo = {
	/** Two letter code of the issuing state (UF), read from the IBGE UF code. */
	stateCode: StateCode;
	/** Four digit issue year. */
	year: number;
	/** Issue month, 1 to 12. */
	month: number;
	/** The 14 digit CNPJ (or zero padded CPF) of the issuer. */
	taxId: string;
	/** Document model: "55" NF-e, "57" CT-e, "58" MDF-e, "62" NFCom, "63" BP-e, "64" GTV-e, "65" NFC-e, "66" NF3e, "67" CT-e OS. */
	model: NfeKeyModel;
	/** Document series, 0 to 999. */
	series: number;
	/** Document number, 1 to 999999999. */
	number: number;
	/** Emission type code (tpEmis), one of the codes the MOC of that model assigns. */
	emissionType: number;
	/**
	 * Site of the authorizer that received the document (`nSiteAutoriz`), 0 to 9. Only NFCom
	 * (`"62"`) and NF3e (`"66"`) spend a digit of the key on it.
	 */
	authorizationSite?: number;
	/** The numeric code (cNF) drawn by the issuer: 7 digits for NFCom and NF3e, 8 for the rest. */
	code: string;
	/** The modulo 11 check digit of the key. */
	checkDigit: number;
};

const EMISSION_TYPE_INDEX = 34;

const AUTHORIZATION_SITE_INDEX = 35;

const SHORT_CODE_START = 36;

const CODE_END = 43;

const CHECK_DIGIT_INDEX = 43;

const isForbiddenCode = (model: string, code: string, number: number): boolean =>
	FORBIDDEN_CODE_MODELS.includes(model) &&
	(FORBIDDEN_CODES.includes(code) || Number(code) === number);

/**
 * Parses a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) into its fields.
 *
 * Covers every document whose access key is the same 44 digit string: NF-e (modelo 55), NFC-e
 * (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) and NFCom (62).
 * Accepts the same input forms as `isValidNfeKey` (the printed mask of 4 digit groups, split by
 * whitespace, `.`, `-` or `/`, and the `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes
 * of the XML `Id` attribute) and returns `null` when the key is not valid.
 *
 * The emission type (`tpEmis`) is checked against the codes the MOC of that model assigns, so
 * the accepted set changes with the model: 1 to 7 and 9 for NF-e and NFC-e, `{1, 3, 4, 5, 7, 8}`
 * for the CT-e, `{1, 5, 7, 8}` for the CT-e OS and `{1, 2, 7, 8}` for the GTV-e (8 is the
 * authorização pela SVC-SP of the CT-e MOC), `{1, 2, 3}` for the MDF-e and `{1, 2}` for the
 * BP-e, the NF3e and the NFCom.
 *
 * NFCom and NF3e write `nSiteAutoriz` in position 36 and only 7 digits of `cNF` after it, so
 * `authorizationSite` is filled for those two models and `code` is 7 characters long instead of
 * 8; every other model leaves `authorizationSite` out and reads an 8 digit `code`.
 *
 * For NF-e and NFC-e the numeric code is also checked against rule B03-10 of the NF-e MOC,
 * which forbids the twenty repeated and sequential codes it lists and a `cNF` equal to the
 * document number. That rule arrived with NT 2019.001, so it can turn down a key authorised
 * before it, and no other MOC states it, which is why it is not applied to the other models.
 * A document number of all zeros is turned down for every model, following the leiaute rather
 * than a choice of this library: `nNF` is typed `TNF` in `tiposBasico_v4.00.xsd`, whose pattern
 * is `[1-9]{1}[0-9]{0,8}`, and the Anexo I of every other model repeats the same regex for its
 * own number field (`nCT`, `nMDF`, `nBP`, `nNF`).
 *
 * @param {string} value - The access key value to be parsed.
 * @returns {NfeKeyInfo | null} The parsed access key, or `null` when it is not valid.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 * @see Official: https://dfe-portal.svrs.rs.gov.br/NFE/Documentos
 * NF-e schema package (PL_010b, NT2025.002 v1.30): `tiposBasico_v4.00.xsd`, the `TNF` and
 * `TCodUfIBGE` types.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2007/AJ_009_07
 * Ajuste SINIEF 09/07, cláusula primeira, caput: the CT-e, modelo 57.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2019/AJ036_19
 * Ajuste SINIEF 36/19, cláusula primeira: the CT-e OS, modelo 67.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2020/ajuste-sinief-03-20
 * Ajuste SINIEF 03/20, cláusula primeira: the GTV-e, modelo 64.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/CTE/Documentos
 * CT-e MOC 4.00, Anexo I ("MOC CTe 4.00 Anexo I - Leiaute e Regras de Validação"): the `tpEmis`
 * domains D19, D27 and D15. Published by the SVRS dfe-portal, like the BP-e, NF3e and NFCom
 * manuals below; the cte.fazenda.gov.br manual index answers "Sistema temporariamente
 * indisponível" permanently.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/BPE/Documentos
 * BP-e MOC 1.00b, Visão Geral and Anexo I: modelo 63.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/NF3e/Documentos
 * NF3e MOC 1.00a, Visão Geral and Anexo I: modelo 66 and `nSiteAutoriz`.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/NFCOM/Documentos
 * NFCom MOC 1.00a, Visão Geral and Anexo I: modelo 62 and `nSiteAutoriz`.
 * @see Based on: https://github.com/nfephp-org/sped-common/blob/master/src/Keys.php
 * NFePHP `Keys::build` reference implementation, source of the SP and RS test vectors.
 * @see Based on: https://github.com/vmarchesin/br-validate-dfe-access-key
 * Second reference implementation.
 *
 * @example
 * ```typescript
 * getNfeKeyInfo("35170458716523000119550010000000121000123458");
 * // { stateCode: "SP", year: 2017, month: 4, taxId: "58716523000119", model: "55",
 * //   series: 1, number: 12, emissionType: 1, code: "00012345", checkDigit: 8 }
 *
 * getNfeKeyInfo("invalid"); // null
 * ```
 */
export const getNfeKeyInfo = (value: string): NfeKeyInfo | null => {
	if (typeof value !== "string") return null;

	const body = value.trim().replace(XML_ID_PREFIX_REGEX, "").trimStart();

	if (!FORMAT_REGEX.test(body)) return null;

	const digits = sanitizeToDigits(body);

	if (digits.length !== NFE_KEY_LENGTH) return null;

	const uf = digits.slice(0, 2);

	const stateCode = IBGE_UF_CODES[uf];

	if (stateCode === undefined) return null;

	const month = Number(digits.slice(4, 6));

	if (month < 1 || month > 12) return null;

	const modelDigits = digits.slice(20, 22);
	const model = VALID_MODELS.find((candidate) => candidate === modelDigits);

	if (model === undefined) return null;

	if (digits.slice(NUMBER_START, NUMBER_END) === ABSENT_NUMBER) return null;

	const emissionType = Number(digits[EMISSION_TYPE_INDEX]);

	if (!EMISSION_TYPES_BY_MODEL[model].includes(emissionType)) return null;

	const hasAuthorizationSite = AUTHORIZATION_SITE_MODELS.includes(model);
	const code = digits.slice(
		hasAuthorizationSite ? SHORT_CODE_START : AUTHORIZATION_SITE_INDEX,
		CODE_END,
	);
	const number = Number(digits.slice(NUMBER_START, NUMBER_END));

	if (isForbiddenCode(model, code, number)) return null;

	const checkDigit = Number(digits[CHECK_DIGIT_INDEX]);

	if (mod11(digits.slice(0, CHECK_DIGIT_INDEX), { variant: "arrecadacao" }) !== checkDigit) {
		return null;
	}

	const parsed: NfeKeyInfo = {
		stateCode,
		year: 2000 + Number(digits.slice(2, 4)),
		month,
		taxId: digits.slice(6, 20),
		model,
		series: Number(digits.slice(22, 25)),
		number,
		emissionType,
		code,
		checkDigit,
	};

	if (hasAuthorizationSite) parsed.authorizationSite = Number(digits[AUTHORIZATION_SITE_INDEX]);

	return parsed;
};
