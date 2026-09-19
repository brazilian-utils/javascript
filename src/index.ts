import { formatCep } from "./format-cep/format-cep";
import { formatCnpj } from "./format-cnpj/format-cnpj";
import { formatCpf } from "./format-cpf/format-cpf";
import { generateCnpj } from "./generate-cnpj/generate-cnpj";
import { generateCpf } from "./generate-cpf/generate-cpf";
import { isValidCep } from "./is-valid-cep/is-valid-cep";
import { isValidCnpj } from "./is-valid-cnpj/is-valid-cnpj";
import { isValidCpf } from "./is-valid-cpf/is-valid-cpf";
import { isValidIe } from "./is-valid-ie/is-valid-ie";
import { isValidPis } from "./is-valid-pis/is-valid-pis";

export type { Bank } from "./_internals/constants/banks";
export type { Municipality } from "./_internals/constants/cities";
export type { State, StateCode, StateName } from "./_internals/constants/states";
export type { NumberToWordsGender } from "./_internals/number-to-words/number-to-words";
export { addBusinessDays } from "./add-business-days/add-business-days";
export { type CapitalizeOptions, capitalize } from "./capitalize/capitalize";
export { convertCurrencyToWords } from "./convert-currency-to-words/convert-currency-to-words";
export {
	type ConvertDateToWordsOptions,
	convertDateToWords,
} from "./convert-date-to-words/convert-date-to-words";
export { convertLicensePlateToMercosul } from "./convert-license-plate-to-mercosul/convert-license-plate-to-mercosul";
export {
	type ConvertNumberToWordsOptions,
	convertNumberToWords,
} from "./convert-number-to-words/convert-number-to-words";
export { differenceInBusinessDays } from "./difference-in-business-days/difference-in-business-days";
export { type FormatBoletoOptions, formatBoleto } from "./format-boleto/format-boleto";
export { type FormatCaepfOptions, formatCaepf } from "./format-caepf/format-caepf";
export { type FormatCeiOptions, formatCei } from "./format-cei/format-cei";
export { type FormatCepOptions, formatCep } from "./format-cep/format-cep";
export { type FormatCertidaoOptions, formatCertidao } from "./format-certidao/format-certidao";
export { type FormatCnaeOptions, formatCnae } from "./format-cnae/format-cnae";
export { type FormatCnhOptions, formatCnh } from "./format-cnh/format-cnh";
export { type FormatCnoOptions, formatCno } from "./format-cno/format-cno";
export { type FormatCnpjOptions, formatCnpj } from "./format-cnpj/format-cnpj";
export { type FormatCnsOptions, formatCns } from "./format-cns/format-cns";
export { type FormatCpfOptions, formatCpf } from "./format-cpf/format-cpf";
export { type FormatCurrencyOptions, formatCurrency } from "./format-currency/format-currency";
export { formatIban } from "./format-iban/format-iban";
export {
	type FormatLegalNatureOptions,
	formatLegalNature,
} from "./format-legal-nature/format-legal-nature";
export { formatLicensePlate } from "./format-license-plate/format-license-plate";
export { type FormatNcmOptions, formatNcm } from "./format-ncm/format-ncm";
export { type FormatNfeKeyOptions, formatNfeKey } from "./format-nfe-key/format-nfe-key";
export { formatPassport } from "./format-passport/format-passport";
export { type FormatPhoneOptions, type PhoneMask, formatPhone } from "./format-phone/format-phone";
export { type FormatPisOptions, formatPis } from "./format-pis/format-pis";
export {
	type FormatProcessoJuridicoOptions,
	formatProcessoJuridico,
} from "./format-processo-juridico/format-processo-juridico";
export { type FormatVoterIdOptions, formatVoterId } from "./format-voter-id/format-voter-id";
export { type GenerateBoletoParams, generateBoleto } from "./generate-boleto/generate-boleto";
export { generateCep } from "./generate-cep/generate-cep";
export { generateCnh } from "./generate-cnh/generate-cnh";
export { type GenerateCnpjParams, generateCnpj } from "./generate-cnpj/generate-cnpj";
export { generateCpf } from "./generate-cpf/generate-cpf";
export { generateLegalNature } from "./generate-legal-nature/generate-legal-nature";
export {
	type GenerateLicensePlateFormat,
	generateLicensePlate,
} from "./generate-license-plate/generate-license-plate";
export { generatePassport } from "./generate-passport/generate-passport";
export { generatePhone, type GeneratePhoneType } from "./generate-phone/generate-phone";
export { generatePis } from "./generate-pis/generate-pis";
export {
	type GeneratePixPayloadParams,
	generatePixPayload,
} from "./generate-pix-payload/generate-pix-payload";
export {
	type GenerateProcessoJuridicoParams,
	generateProcessoJuridico,
} from "./generate-processo-juridico/generate-processo-juridico";
export { generateRenavam } from "./generate-renavam/generate-renavam";
export { generateVoterId } from "./generate-voter-id/generate-voter-id";
export {
	type AddressInfo,
	type CepProvider,
	GetAddressInfoByCepError,
	GetAddressInfoByCepNotFoundError,
	type GetAddressInfoByCepOptions,
	GetAddressInfoByCepServiceError,
	GetAddressInfoByCepValidationError,
	getAddressInfoByCep,
} from "./get-address-info-by-cep/get-address-info-by-cep";
export { type AreaCodeInfo, getAreaCodeInfo } from "./get-area-code-info/get-area-code-info";
export { getAreaCodesByState } from "./get-area-codes-by-state/get-area-codes-by-state";
export { getBankByCode } from "./get-bank-by-code/get-bank-by-code";
export { getBankByIspb } from "./get-bank-by-ispb/get-bank-by-ispb";
export { getBanks } from "./get-banks/get-banks";
export {
	type BoletoInfo,
	type GetBoletoInfoOptions,
	getBoletoInfo,
} from "./get-boleto-info/get-boleto-info";
export { type Cbo, getCbo } from "./get-cbo/get-cbo";
export {
	type CepAddressInfo,
	GetCepInfoByAddressError,
	GetCepInfoByAddressNotFoundError,
	type GetCepInfoByAddressParams,
	GetCepInfoByAddressValidationError,
	getCepInfoByAddress,
} from "./get-cep-info-by-address/get-cep-info-by-address";
export {
	type CertidaoInfo,
	type CertidaoType,
	getCertidaoInfo,
} from "./get-certidao-info/get-certidao-info";
export { type Cfop, getCfop } from "./get-cfop/get-cfop";
export { getCities } from "./get-cities/get-cities";
export { type Cnae, getCnae } from "./get-cnae/get-cnae";
export {
	getFormatLicensePlate,
	type LicensePlateFormat,
} from "./get-format-license-plate/get-format-license-plate";
export {
	type GetHolidaysParams,
	type Holiday,
	type HolidayType,
	getHolidays,
} from "./get-holidays/get-holidays";
export { type IbanInfo, getIbanInfo } from "./get-iban-info/get-iban-info";
export {
	type LegalNature,
	type LegalNatureCategory,
	getLegalNature,
} from "./get-legal-nature/get-legal-nature";
export { type GetLegalNaturesParams, getLegalNatures } from "./get-legal-natures/get-legal-natures";
export {
	type GetLegalNaturesByCategoryOptions,
	getLegalNaturesByCategory,
} from "./get-legal-natures-by-category/get-legal-natures-by-category";
export { getMunicipalities } from "./get-municipalities/get-municipalities";
export {
	type GetMunicipalityByCodeParams,
	type GetMunicipalityByNameParams,
	type GetMunicipalityParams,
	getMunicipality,
} from "./get-municipality/get-municipality";
export { getMunicipalityByCode } from "./get-municipality-by-code/get-municipality-by-code";
export {
	type NfeKeyInfo,
	type NfeKeyModel,
	getNfeKeyInfo,
} from "./get-nfe-key-info/get-nfe-key-info";
export {
	type PixKeyInfo,
	type PixKeyType,
	getPixKeyInfo,
} from "./get-pix-key-info/get-pix-key-info";
export {
	type PixPayloadInfo,
	type PixPointOfInitiation,
	getPixPayloadInfo,
} from "./get-pix-payload-info/get-pix-payload-info";
export { getStateByIbgeCode } from "./get-state-by-ibge-code/get-state-by-ibge-code";
export { getStateCodeByName } from "./get-state-code-by-name/get-state-code-by-name";
export { getStateNameByCode } from "./get-state-name-by-code/get-state-name-by-code";
export { getStates } from "./get-states/get-states";
export { getTimezoneByState } from "./get-timezone-by-state/get-timezone-by-state";
export { type BusinessDayOptions, isBusinessDay } from "./is-business-day/is-business-day";
export { type IsHolidayParams, isHoliday } from "./is-holiday/is-holiday";
export {
	type IsValidBankAccountParams,
	isValidBankAccount,
} from "./is-valid-bank-account/is-valid-bank-account";
export { isValidBoleto } from "./is-valid-boleto/is-valid-boleto";
export { isValidCaepf } from "./is-valid-caepf/is-valid-caepf";
export { isValidCbo } from "./is-valid-cbo/is-valid-cbo";
export { isValidCei } from "./is-valid-cei/is-valid-cei";
export { isValidCep } from "./is-valid-cep/is-valid-cep";
export {
	type IsValidCertidaoOptions,
	isValidCertidao,
} from "./is-valid-certidao/is-valid-certidao";
export { isValidCfop } from "./is-valid-cfop/is-valid-cfop";
export { isValidCnae } from "./is-valid-cnae/is-valid-cnae";
export { isValidCnh } from "./is-valid-cnh/is-valid-cnh";
export { isValidCno } from "./is-valid-cno/is-valid-cno";
export { type IsValidCnpjOptions, isValidCnpj } from "./is-valid-cnpj/is-valid-cnpj";
export { isValidCns } from "./is-valid-cns/is-valid-cns";
export { isValidCpf } from "./is-valid-cpf/is-valid-cpf";
export { isValidCreditCard } from "./is-valid-credit-card/is-valid-credit-card";
export { isValidCsosn } from "./is-valid-csosn/is-valid-csosn";
export { type IsValidCstOptions, isValidCst } from "./is-valid-cst/is-valid-cst";
export { isValidEmail } from "./is-valid-email/is-valid-email";
export { isValidIban } from "./is-valid-iban/is-valid-iban";
export { type IsValidIeParams, isValidIe } from "./is-valid-ie/is-valid-ie";
export { isValidLandlinePhone } from "./is-valid-landline-phone/is-valid-landline-phone";
export { isValidLegalNature } from "./is-valid-legal-nature/is-valid-legal-nature";
export { isValidLicensePlate } from "./is-valid-license-plate/is-valid-license-plate";
export {
	type IsValidMobilePhoneOptions,
	isValidMobilePhone,
} from "./is-valid-mobile-phone/is-valid-mobile-phone";
export { isValidNcm } from "./is-valid-ncm/is-valid-ncm";
export { isValidNfeKey } from "./is-valid-nfe-key/is-valid-nfe-key";
export { isValidPassport } from "./is-valid-passport/is-valid-passport";
export {
	type IsValidPhoneOptions,
	type PhoneType,
	type PhoneVersion,
	isValidPhone,
} from "./is-valid-phone/is-valid-phone";
export { isValidPis } from "./is-valid-pis/is-valid-pis";
export { type IsValidPixKeyOptions, isValidPixKey } from "./is-valid-pix-key/is-valid-pix-key";
export { isValidPixPayload } from "./is-valid-pix-payload/is-valid-pix-payload";
export { isValidProcessoJuridico } from "./is-valid-processo-juridico/is-valid-processo-juridico";
export type { RegistroProfissionalCouncil } from "./is-valid-registro-profissional/constants";
export {
	type IsValidRegistroProfissionalParams,
	isValidRegistroProfissional,
} from "./is-valid-registro-profissional/is-valid-registro-profissional";
export { isValidRenavam } from "./is-valid-renavam/is-valid-renavam";
export { isValidServicePhone } from "./is-valid-service-phone/is-valid-service-phone";
export { isValidVin } from "./is-valid-vin/is-valid-vin";
export { isValidVoterId } from "./is-valid-voter-id/is-valid-voter-id";
export { parseBoleto } from "./parse-boleto/parse-boleto";
export { parseCaepf } from "./parse-caepf/parse-caepf";
export { parseCbo } from "./parse-cbo/parse-cbo";
export { parseCei } from "./parse-cei/parse-cei";
export { parseCep } from "./parse-cep/parse-cep";
export { parseCertidao } from "./parse-certidao/parse-certidao";
export { parseCfop } from "./parse-cfop/parse-cfop";
export { parseCnae } from "./parse-cnae/parse-cnae";
export { parseCnh } from "./parse-cnh/parse-cnh";
export { parseCno } from "./parse-cno/parse-cno";
export { type ParseCnpjOptions, parseCnpj } from "./parse-cnpj/parse-cnpj";
export { parseCns } from "./parse-cns/parse-cns";
export { parseCpf } from "./parse-cpf/parse-cpf";
export { type ParseCurrencyOptions, parseCurrency } from "./parse-currency/parse-currency";
export { parseIban } from "./parse-iban/parse-iban";
export { parseLegalNature } from "./parse-legal-nature/parse-legal-nature";
export { parseLicensePlate } from "./parse-license-plate/parse-license-plate";
export { parseNcm } from "./parse-ncm/parse-ncm";
export { parseNfeKey } from "./parse-nfe-key/parse-nfe-key";
export { parsePassport } from "./parse-passport/parse-passport";
export { parsePhone } from "./parse-phone/parse-phone";
export { parsePis } from "./parse-pis/parse-pis";
export { parseProcessoJuridico } from "./parse-processo-juridico/parse-processo-juridico";
export { parseVoterId } from "./parse-voter-id/parse-voter-id";
export { removeAccents } from "./remove-accents/remove-accents";
export { subBusinessDays } from "./sub-business-days/sub-business-days";

/**
 * The parameters of `generateProcessoJuridico`, the 2.3.0 name of
 * `GenerateProcessoJuridicoParams`.
 *
 * @deprecated Use `GenerateProcessoJuridicoParams` instead.
 */
export type { GenerateProcessoJuridicoOptions } from "./generate-processo-juridico/generate-processo-juridico";
/**
 * The address `getCepInfoByAddress` looks up, the 2.3.0 name of `GetCepInfoByAddressParams`.
 *
 * @deprecated Use `GetCepInfoByAddressParams` instead.
 */
export type { GetCepInfoByAddressOptions } from "./get-cep-info-by-address/get-cep-info-by-address";
/**
 * The object form `getHolidays` accepts, the 2.3.0 name of `GetHolidaysParams`.
 *
 * @deprecated Use `GetHolidaysParams` instead.
 */
export type { GetHolidaysOptions } from "./get-holidays/get-holidays";
/**
 * The `getMunicipality` query by IBGE municipality code, the 2.3.0 name of
 * `GetMunicipalityByCodeParams`.
 *
 * @deprecated Use `GetMunicipalityByCodeParams` instead.
 */
export type { GetMunicipalityByCodeOptions } from "./get-municipality/get-municipality";
/**
 * The `getMunicipality` query by municipality name and state code, the 2.3.0 name of
 * `GetMunicipalityByNameParams`.
 *
 * @deprecated Use `GetMunicipalityByNameParams` instead.
 */
export type { GetMunicipalityByNameOptions } from "./get-municipality/get-municipality";
/**
 * The two ways `getMunicipality` can be queried, the 2.3.0 name of `GetMunicipalityParams`.
 *
 * @deprecated Use `GetMunicipalityParams` instead.
 */
export type { GetMunicipalityOptions } from "./get-municipality/get-municipality";
/**
 * The parameters `isHoliday` takes, the 2.3.0 name of `IsHolidayParams`.
 *
 * @deprecated Use `IsHolidayParams` instead.
 */
export type { IsHolidayOptions } from "./is-holiday/is-holiday";
/**
 * The bank account `isValidBankAccount` checks: the bank, the agency and the account with its
 * check digit.
 *
 * Kept from 2.3.0: the name violates the naming rule, since this object is the only argument
 * `isValidBankAccount` takes, but it shipped in 2.3.0 as the canonical name.
 *
 * @deprecated Use `IsValidBankAccountParams` instead.
 */
export type { IsValidBankAccountOptions } from "./is-valid-bank-account/is-valid-bank-account";
// The deprecated aliases below are declared as constants rather than as renamed re-exports
// (`export { formatCpf as formatCPF }`) so that their `@deprecated` tag survives into the bundled
// declaration file: the bundler collapses every renamed re-export of the entry point into a single
// `export { ... }` statement, which carries no documentation, while a `declare const` keeps the
// comment written right above it.
/**
 * Formats a CEP, the 1.x name of `formatCep`.
 *
 * @deprecated Use `formatCep` instead.
 */
export const formatCEP: typeof formatCep = formatCep;
/**
 * Formats a CNPJ, the 1.x name of `formatCnpj`.
 *
 * @deprecated Use `formatCnpj` instead.
 */
export const formatCNPJ: typeof formatCnpj = formatCnpj;
/**
 * Formats a CPF, the 1.x name of `formatCpf`.
 *
 * @deprecated Use `formatCpf` instead.
 */
export const formatCPF: typeof formatCpf = formatCpf;
/**
 * Generates a valid random CNPJ, the 1.x name of `generateCnpj`.
 *
 * @deprecated Use `generateCnpj` instead.
 */
export const generateCNPJ: typeof generateCnpj = generateCnpj;
/**
 * Generates a valid random CPF, the 1.x name of `generateCpf`.
 *
 * @deprecated Use `generateCpf` instead.
 */
export const generateCPF: typeof generateCpf = generateCpf;
/**
 * Checks whether a CEP is valid, the 1.x name of `isValidCep`.
 *
 * @deprecated Use `isValidCep` instead.
 */
export const isValidCEP: typeof isValidCep = isValidCep;
/**
 * Checks whether a CNPJ is valid, the 1.x name of `isValidCnpj`.
 *
 * @deprecated Use `isValidCnpj` instead.
 */
export const isValidCNPJ: typeof isValidCnpj = isValidCnpj;
/**
 * Checks whether a CPF is valid, the 1.x name of `isValidCpf`.
 *
 * @deprecated Use `isValidCpf` instead.
 */
export const isValidCPF: typeof isValidCpf = isValidCpf;
/**
 * Checks whether a state registration (inscrição estadual) is valid, the 1.x name of `isValidIe`.
 *
 * @deprecated Use `isValidIe` instead.
 */
export const isValidIE: typeof isValidIe = isValidIe;
/**
 * Checks whether a PIS/PASEP is valid, the 1.x name of `isValidPis`.
 *
 * @deprecated Use `isValidPis` instead.
 */
export const isValidPIS: typeof isValidPis = isValidPis;
