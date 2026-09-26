import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import {
	ABSENT_NUMBER,
	CHECK_DIGIT_INDEX,
	CODE_START,
	CPF_PADDING,
	FORMAT_REGEX,
	GENERATOR_ENVIRONMENTS,
	GENERATOR_ENVIRONMENT_INDEX,
	MONTH_START,
	NUMBER_START,
	TAX_ID_START,
	TAX_ID_TYPES,
	TAX_ID_TYPE_INDEX,
	YEAR_START,
} from "../_internals/constants/nfse-key";
import { mod11 } from "../_internals/mod11/mod11";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";

/**
 * Checks the "Inscrição Federal" against its "Tipo de Inscrição Federal" digit: a CNPJ as it is,
 * a CPF behind its `000` padding, and anything else (an unknown type) rejected.
 *
 * @param {string} typeDigit - The "Tipo de Inscrição Federal" digit of the key.
 * @param {string} registration - The 14 positions of the "Inscrição Federal".
 * @returns {boolean} True if the registration is a valid CPF or CNPJ of that type.
 */
const isValidTaxId = (typeDigit: string, registration: string): boolean => {
	const taxIdType = TAX_ID_TYPES[typeDigit];
	if (taxIdType === "cnpj") return isValidCnpj(registration);
	return (
		taxIdType === "cpf" &&
		registration.startsWith(CPF_PADDING) &&
		isValidCpf(registration.slice(CPF_PADDING.length))
	);
};

/**
 * Validates the access key (chave de acesso) of a national NFS-e, the Nota Fiscal de Serviço
 * eletrônica of the Sistema Nacional NFS-e.
 *
 * The key is one block of 50 digits:
 * `Cód.Mun.(7) Amb.Ger.(1) Tipo de Inscrição Federal(1) Inscrição Federal(14) nNFSe(13) AAMM(4)
 * Cód.Num.(9) DV(1)`. The `NFS` literal the `Id` attribute of `infNFSe` puts in front of it is
 * stripped, with surrounding whitespace. The key has no printed mask (the DANFSe prints it as a
 * single block), so a separator anywhere in it is rejected instead of being stripped. The keys
 * of the municipal NFS-e models that are not the national standard are out of scope, and so is
 * the 44 digit DF-e key, which `isValidNfeKey` covers.
 *
 * The municipality code must start with an IBGE UF code, `ambGer` must be 1 (municipality) or 2
 * (Sistema Nacional NFS-e), the registration type 1 (CPF, left padded with `000`) or 2 (CNPJ)
 * with a CPF or CNPJ whose own check digits are valid, `nNFSe` must not be all zeros and the
 * month must be 01 to 12. The check digit (DV) is a modulus 11 over the first 49 digits, weights
 * 2 to 9 cycling from the right, where a remainder of 0 or 1 gives 0. `getNfseKeyInfo` states
 * what each rule is taken from.
 *
 * Keys carrying an alphanumeric CNPJ are not accepted yet, since no official document states how
 * a letter enters the check digit of the key.
 *
 * @param {string} value - The access key value to be validated.
 * @returns {boolean} True if the access key is valid, false otherwise.
 *
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
 * Sistema Nacional NFS-e, current technical documentation: `NFSe-ESQUEMAS_XSD-v1.01`
 * (`tiposSimples_v1.01.xsd`: `TSIdNFSe`, `TSChaveNFSe`) and `ANEXO_I-SEFIN_ADN-DPS_NFSe-SNNFSe`
 * v1.01 (field `NFSe/infNFSe/id`, rules E1263, E1280, E1284 and E0042).
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-emissao-decisao-administrativa-e-judicial.pdf
 * Manual de Contribuintes, Emissão por Decisão Administrativa ou Judicial, field `id`: "O dígito
 * verificador deve ser calculado segundo o algoritmo do módulo 11".
 *
 * @example
 * ```typescript
 * isValidNfseKey("35503082258716523000119000000000001226011357924683"); // true (CNPJ issuer, SP)
 * isValidNfseKey("NFS35503082258716523000119000000000001226011357924683"); // true (XML Id prefix)
 * isValidNfseKey("43149021100040364478829000000000105725120484407255"); // true (CPF issuer, RS)
 * isValidNfseKey("35503082258716523000119000000000001226011357924684"); // false (check digit)
 * isValidNfseKey("3550308 2 2 58716523000119 0000000000012 2601 135792468 3"); // false (no mask)
 * ```
 */
export const isValidNfseKey = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const match = FORMAT_REGEX.exec(value.trim());

	if (match === null) return false;

	const [, digits] = match;
	const ambGer = Number(digits[GENERATOR_ENVIRONMENT_INDEX]);
	const month = Number(digits.slice(MONTH_START, CODE_START));

	return (
		IBGE_UF_CODES[digits.slice(0, 2)] !== undefined &&
		GENERATOR_ENVIRONMENTS.some((candidate) => candidate === ambGer) &&
		isValidTaxId(digits[TAX_ID_TYPE_INDEX], digits.slice(TAX_ID_START, NUMBER_START)) &&
		digits.slice(NUMBER_START, YEAR_START) !== ABSENT_NUMBER &&
		month >= 1 &&
		month <= 12 &&
		mod11(digits.slice(0, CHECK_DIGIT_INDEX), { variant: "arrecadacao" }) ===
			Number(digits[CHECK_DIGIT_INDEX])
	);
};
