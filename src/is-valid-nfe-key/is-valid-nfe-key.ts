import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { NFE_KEY_REGEX, XML_ID_PREFIX_REGEX } from "../_internals/constants/nfe-key";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import {
	ABSENT_NUMBER,
	AUTHORIZATION_SITE_INDEX,
	CHECK_DIGIT_INDEX,
	EMISSION_TYPE_INDEX,
	EMISSION_TYPES_BY_MODEL,
	FORBIDDEN_CODES,
	FORBIDDEN_CODE_MODELS,
	FORMAT_REGEX,
	MODEL_END,
	MODEL_START,
	NUMBER_END,
	NUMBER_START,
	VALID_MODELS,
} from "./constants";

/**
 * Rule B03-10 of the NF-e MOC. The two models it covers, NF-e and NFC-e, spend no digit on
 * `nSiteAutoriz`, so their `cNF` is always the 8 digits before the check digit.
 *
 * @param {string} model - The model of the key.
 * @param {string} key - The 44 characters of the key.
 * @returns {boolean} True when the rule turns the numeric code down.
 */
const isForbiddenCode = (model: string, key: string): boolean => {
	if (!FORBIDDEN_CODE_MODELS.includes(model)) return false;

	const code = key.slice(AUTHORIZATION_SITE_INDEX, CHECK_DIGIT_INDEX);

	return (
		FORBIDDEN_CODES.includes(code) || Number(code) === Number(key.slice(NUMBER_START, NUMBER_END))
	);
};

/**
 * Validates a DF-e (Documento Fiscal eletrônico) access key (chave de acesso).
 *
 * Covers every document whose access key is the same 44 character string: NF-e (modelo 55), NFC-e
 * (65), CT-e (57), MDF-e (58), CT-e OS (67, the Conhecimento de Transporte Eletrônico para
 * Outros Serviços), GTV-e (64, the CT-e Guia de Transporte de Valores), BP-e (63), NF3e (66)
 * and NFCom (62). The CF-e-SAT (59) is out: its 44 position "chave de consulta" is composed
 * differently. The 44 characters may be split into the printed groups of 4 by whitespace, `.`, `-`
 * or `/`, a run of them between two groups included, the same mask rule `isValidCpf` and
 * `isValidCnpj` follow; a separator inside a group of 4, or any other character, is rejected
 * instead of being stripped. The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes found
 * in the `Id` attribute of the document's XML (e.g. `Id="NFe3517...`) are stripped before that
 * check, with any whitespace between the prefix and the first group.
 *
 * The key is `cUF(2) AAMM(4) CNPJ/CPF(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)`, with
 * NFCom and NF3e spending position 36 on `nSiteAutoriz` and leaving 7 digits for `cNF`.
 * Every position is a digit except 7 to 18, the root and order of the issuer's CNPJ, which may
 * be the upper case letters of an alphanumeric CNPJ: the current schemas type the key as
 * `[0-9]{6}[0-9A-Z]{12}[0-9]{26}`, where the older ones (NF-e PL_009) had `[0-9]{44}`. A letter
 * anywhere else, the two CNPJ check digits in positions 19 and 20 included, is rejected. Lower
 * case letters are read as upper case, the same case folding `isValidCnpj` applies to an
 * alphanumeric CNPJ (`{ version: 2 }`), even though the schema pattern itself admits upper
 * case only. A CPF issuer (a key the NF-e allows since NT 2018.001) is always 11 digits left
 * padded with zeros, so a letter there always belongs to an alphanumeric CNPJ.
 * `tpEmis` must be one of the codes the MOC of that model assigns, so the accepted set changes
 * with the model: 1 to 7 and 9 for NF-e and NFC-e, `{1, 3, 4, 5, 7, 8}` for the CT-e,
 * `{1, 5, 7, 8}` for the CT-e OS, `{1, 2, 7, 8}` for the GTV-e, `{1, 2, 3}` for the MDF-e and
 * `{1, 2}` for the BP-e, the NF3e and the NFCom. Code 8, the authorização pela SVC-SP, is
 * assigned by the CT-e MOC only, never by the NF-e one.
 * The check digit (`cDV`) is a modulus 11 over the first 43 characters, weights 2-9 cycling from
 * the right, where a remainder of 0 or 1 maps to check digit 0. Each character is valued at its
 * ASCII code minus 48, which is the digit itself for `0` to `9` and 17 to 42 for `A` to `Z`, the
 * same values the alphanumeric CNPJ check digits use.
 *
 * For NF-e and NFC-e the numeric code is also checked against rule B03-10 of the NF-e MOC,
 * which forbids the twenty repeated and sequential `cNF` values it lists and a `cNF` equal to
 * the document number. The rule has applied to the documents sent after NT 2019.001, and NF-e
 * software commonly used a `cNF` equal to the document number before it, so a key authorised
 * earlier can be turned down here.
 *
 * The check digits of the issuer's CPF or CNPJ are not checked, only the key's own `cDV`: read
 * the key with `getNfeKeyInfo` and pass its `taxId` to `isValidCnpj`, or the last 11 digits of a
 * zero padded `taxId` to `isValidCpf`, to check the issuer as well.
 *
 * @param {string} value - The access key value to be validated.
 * @returns {boolean} True if the access key is valid, false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
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
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D
 * Nota Técnica Conjunta 2025.001 (CNPJ alfanumérico nos DF-e), chave de acesso: the check digit
 * is the modulus 11 "considerando o valor decimal dos caracteres com base na tabela ASCII,
 * subtraindo-se 48", and positions 7 to 18 take the letters of the alphanumeric CNPJ.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
 * NF-e NT 2026.004 v1.01 and the schema package PL_010 (v1.30): `tiposBasico_v4.00.xsd`, type
 * `TChNFe`, `<xs:pattern value="[0-9]{6}[0-9A-Z]{12}[0-9]{26}"/>`, in production from
 * 01/07/2026. The CT-e (PL_CTe_400_RTC, `TChDFe`), MDF-e (PL_MDFe_300b, `TChMDFe`) and NFCom
 * (RTC) schemas carry the same pattern.
 * @see Based on: https://github.com/nfephp-org/sped-nfe/tree/master/schemes
 * NFePHP mirror of the NF-e schema packages, where `PL_010_V1.30` has the `TChNFe` pattern
 * above and `PL_009_V4` the older `[0-9]{44}`.
 * @see Based on: https://github.com/nfephp-org/sped-common/blob/master/src/Keys.php
 * NFePHP `Keys::build`/`Keys::isValid` reference implementation, whose `ACCESS_KEY_PATTERN` is
 * `/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/` and whose `verifyingDigit` values each character as
 * `ord($char) - 48`.
 * @see Based on: https://github.com/vmarchesin/br-validate-dfe-access-key
 * Second reference implementation and source of additional test vectors.
 *
 * @example
 * ```typescript
 * isValidNfeKey("35170458716523000119550010000000121000123458"); // true (NF-e, SP)
 * isValidNfeKey("NFe35170458716523000119550010000000121000123458"); // true (XML Id prefix)
 * isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"); // true (masked)
 * isValidNfeKey("3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458"); // true (any of the mask characters)
 * isValidNfeKey("35260712ABC34501DE35550010000001231102030403"); // true (alphanumeric CNPJ 12ABC34501DE35)
 * isValidNfeKey("35260712ABC34501DEA5550010000001231102030408"); // false (a letter in position 19)
 * isValidNfeKey("351 70458716523000119550010000000121000123458"); // false (a separator inside a group of 4)
 * isValidNfeKey("99170458716523000119550010000000121000123458"); // false (invalid cUF)
 * isValidNfeKey("35170458716523000119010010000000121000123450"); // false (invalid mod)
 * ```
 */
export const isValidNfeKey = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const body = value.trim().replace(XML_ID_PREFIX_REGEX, "").trimStart();

	if (!FORMAT_REGEX.test(body)) return false;

	const key = sanitizeToAlphanumeric(body).toUpperCase();

	if (!NFE_KEY_REGEX.test(key)) return false;

	if (IBGE_UF_CODES[key.slice(0, 2)] === undefined) return false;

	const month = Number(key.slice(4, 6));

	if (month < 1 || month > 12) return false;

	const modelDigits = key.slice(MODEL_START, MODEL_END);
	const model = VALID_MODELS.find((candidate) => candidate === modelDigits);

	if (model === undefined) return false;

	if (key.slice(NUMBER_START, NUMBER_END) === ABSENT_NUMBER) return false;

	if (!EMISSION_TYPES_BY_MODEL[model].includes(Number(key[EMISSION_TYPE_INDEX]))) return false;

	if (isForbiddenCode(model, key)) return false;

	return (
		mod11(key.slice(0, CHECK_DIGIT_INDEX), { variant: "arrecadacao" }) ===
		Number(key[CHECK_DIGIT_INDEX])
	);
};
