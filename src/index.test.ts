import { describe, expect, test } from "./_internals/test/runtime";
import {
	type AddressInfo,
	type AreaCodeInfo,
	type Bank,
	type BoletoInfo,
	type BusinessDayOptions,
	type CapitalizeOptions,
	type Cbo,
	type CepAddressInfo,
	type CepProvider,
	type CertidaoInfo,
	type CertidaoType,
	type Cfop,
	type Cnae,
	type CnpjInfo,
	type ConvertDateToWordsOptions,
	type ConvertNumberToWordsOptions,
	type CpfInfo,
	type FormatBoletoOptions,
	type FormatCaepfOptions,
	type FormatCeiOptions,
	type FormatCepOptions,
	type FormatCertidaoOptions,
	type FormatCnaeOptions,
	type FormatLegalNatureOptions,
	type FormatCnhOptions,
	type FormatCnoOptions,
	type FormatCnpjOptions,
	type FormatCnsOptions,
	type FormatCpfOptions,
	type FormatCurrencyOptions,
	type FormatNcmOptions,
	type FormatNfeKeyOptions,
	type FormatPhoneOptions,
	type FormatPisOptions,
	type FormatProcessoJuridicoOptions,
	type FormatSuframaOptions,
	type FormatVoterIdOptions,
	type GenerateBoletoParams,
	type GenerateCnpjParams,
	type GenerateLicensePlateFormat,
	type GeneratePhoneType,
	type GeneratePixPayloadParams,
	type GenerateProcessoJuridicoOptions,
	type GenerateProcessoJuridicoParams,
	type GetAddressInfoByCepOptions,
	type GetBoletoInfoOptions,
	type GetCepInfoByAddressOptions,
	type GetCepInfoByAddressParams,
	type GetCnpjInfoOptions,
	type GetHolidaysOptions,
	type GetHolidaysParams,
	type GetLegalNaturesByCategoryOptions,
	type GetLegalNaturesParams,
	type GetMunicipalityByCodeOptions,
	type GetMunicipalityByCodeParams,
	type GetMunicipalityByNameOptions,
	type GetMunicipalityByNameParams,
	type GetMunicipalityOptions,
	type GetMunicipalityParams,
	type GtinInfo,
	type GtinLength,
	type GtinType,
	type Holiday,
	type HolidayType,
	type IbanInfo,
	type IsHolidayOptions,
	type IsHolidayParams,
	type IsValidBankAccountOptions,
	type IsValidBankAccountParams,
	type IsValidCertidaoOptions,
	type IsValidCnpjOptions,
	type IsValidCstOptions,
	type IsValidGtinOptions,
	type IsValidIeParams,
	type IsValidMobilePhoneOptions,
	type IsValidPhoneOptions,
	type IsValidPixKeyOptions,
	type IsValidRegistroProfissionalParams,
	type LegalNature,
	type LegalNatureCategory,
	type LicensePlateFormat,
	type Municipality,
	type NfeKeyInfo,
	type NfeKeyModel,
	type NumberToWordsGender,
	type ParseCnpjOptions,
	type ParseCurrencyOptions,
	type PhoneMask,
	type PhoneType,
	type PhoneVersion,
	type PixKeyInfo,
	type PixKeyType,
	type PixPayloadInfo,
	type PixPointOfInitiation,
	type RegistroProfissionalCouncil,
	type State,
	type StateCode,
	type StandardSchemaV1,
	type StandardSchemaV1FailureResult,
	type StandardSchemaV1Issue,
	type StandardSchemaV1Options,
	type StandardSchemaV1PathSegment,
	type StandardSchemaV1Props,
	type StandardSchemaV1Result,
	type StandardSchemaV1SuccessResult,
	type StandardSchemaV1Types,
	type StateName,
	type ToStandardSchemaOptions,
} from "./index";
import * as brazilianUtils from "./index";

const PUBLIC = [
	"GetAddressInfoByCepError",
	"GetAddressInfoByCepNotFoundError",
	"GetAddressInfoByCepServiceError",
	"GetAddressInfoByCepValidationError",
	"GetCepInfoByAddressError",
	"GetCepInfoByAddressNotFoundError",
	"GetCepInfoByAddressValidationError",
	"addBusinessDays",
	"capitalize",
	"convertCurrencyToWords",
	"convertDateToWords",
	"convertLicensePlateToMercosul",
	"convertNumberToWords",
	"differenceInBusinessDays",
	"formatBoleto",
	"formatCEP",
	"formatCNPJ",
	"formatCPF",
	"formatCaepf",
	"formatCei",
	"formatCep",
	"formatCertidao",
	"formatCnae",
	"formatCnh",
	"formatCno",
	"formatCnpj",
	"formatCns",
	"formatCpf",
	"formatCurrency",
	"formatIban",
	"formatLegalNature",
	"formatLicensePlate",
	"formatNcm",
	"formatNfeKey",
	"formatPassport",
	"formatPhone",
	"formatPis",
	"formatProcessoJuridico",
	"formatSuframa",
	"formatVoterId",
	"generateBoleto",
	"generateCNPJ",
	"generateCPF",
	"generateCep",
	"generateCnh",
	"generateCnpj",
	"generateCpf",
	"generateLegalNature",
	"generateLicensePlate",
	"generatePassport",
	"generatePhone",
	"generatePis",
	"generatePixPayload",
	"generateProcessoJuridico",
	"generateRenavam",
	"generateSuframa",
	"generateVoterId",
	"getAddressInfoByCep",
	"getAreaCodeInfo",
	"getAreaCodesByState",
	"getBankByCode",
	"getBankByIspb",
	"getBanks",
	"getBoletoInfo",
	"getCbo",
	"getCepInfoByAddress",
	"getCertidaoInfo",
	"getCfop",
	"getCities",
	"getCnae",
	"getCnpjInfo",
	"getCpfInfo",
	"getFormatLicensePlate",
	"getGtinInfo",
	"getHolidays",
	"getIbanInfo",
	"getLegalNature",
	"getLegalNatures",
	"getLegalNaturesByCategory",
	"getMunicipalities",
	"getMunicipality",
	"getMunicipalityByCep",
	"getMunicipalityByCode",
	"getNfeKeyInfo",
	"getPixKeyInfo",
	"getPixPayloadInfo",
	"getStateByCep",
	"getStateByIbgeCode",
	"getStateCodeByName",
	"getStateNameByCode",
	"getStates",
	"getTimezoneByState",
	"isBusinessDay",
	"isHoliday",
	"isValidBankAccount",
	"isValidBoleto",
	"isValidCEP",
	"isValidCNPJ",
	"isValidCPF",
	"isValidCaepf",
	"isValidCbo",
	"isValidCei",
	"isValidCep",
	"isValidCertidao",
	"isValidCfop",
	"isValidCnae",
	"isValidCnh",
	"isValidCno",
	"isValidCnpj",
	"isValidCns",
	"isValidCpf",
	"isValidCreditCard",
	"isValidCsosn",
	"isValidCst",
	"isValidEmail",
	"isValidGtin",
	"isValidIE",
	"isValidIban",
	"isValidIe",
	"isValidLandlinePhone",
	"isValidLegalNature",
	"isValidLicensePlate",
	"isValidMobilePhone",
	"isValidNcm",
	"isValidNfeKey",
	"isValidPIS",
	"isValidPassport",
	"isValidPhone",
	"isValidPis",
	"isValidPixKey",
	"isValidPixPayload",
	"isValidProcessoJuridico",
	"isValidRegistroProfissional",
	"isValidRenavam",
	"isValidServicePhone",
	"isValidSuframa",
	"isValidVin",
	"isValidVoterId",
	"obfuscateEmail",
	"parseBoleto",
	"parseCaepf",
	"parseCbo",
	"parseCei",
	"parseCep",
	"parseCertidao",
	"parseCfop",
	"parseCnae",
	"parseCnh",
	"parseCno",
	"parseCnpj",
	"parseCns",
	"parseCpf",
	"parseCurrency",
	"parseIban",
	"parseLegalNature",
	"parseLicensePlate",
	"parseNcm",
	"parseNfeKey",
	"parsePassport",
	"parsePhone",
	"parsePis",
	"parseProcessoJuridico",
	"parseSuframa",
	"parseVoterId",
	"removeAccents",
	"subBusinessDays",
	"toStandardSchema",
].sort();

const NETWORK_ENTRY_POINTS = new Set(["getAddressInfoByCep", "getCepInfoByAddress"]);

const BAD_INPUTS: [string, unknown][] = [
	["null", null],
	["undefined", undefined],
	["a number", 123],
	["an empty string", ""],
	["a blank string", "   "],
	["an object", {}],
	["an array", []],
	["NaN", Number.NaN],
	["a boolean", true],
];

const isErrorClass = (name: string): boolean => /^[A-Z]/.test(name);

describe("Public API", () => {
	test("should export exactly the documented surface", () => {
		expect(Object.keys(brazilianUtils).sort()).toEqual(PUBLIC);
	});

	test("should not list the same export twice", () => {
		expect(PUBLIC.length).toBe(new Set(PUBLIC).size);
	});

	test("should export every documented public type", () => {
		const publicTypes: Partial<{
			AddressInfo: AddressInfo;
			AreaCodeInfo: AreaCodeInfo;
			Bank: Bank;
			BoletoInfo: BoletoInfo;
			BusinessDayOptions: BusinessDayOptions;
			CapitalizeOptions: CapitalizeOptions;
			Cbo: Cbo;
			CepAddressInfo: CepAddressInfo;
			CepProvider: CepProvider;
			CertidaoInfo: CertidaoInfo;
			CertidaoType: CertidaoType;
			Cfop: Cfop;
			Cnae: Cnae;
			CnpjInfo: CnpjInfo;
			ConvertDateToWordsOptions: ConvertDateToWordsOptions;
			ConvertNumberToWordsOptions: ConvertNumberToWordsOptions;
			CpfInfo: CpfInfo;
			FormatBoletoOptions: FormatBoletoOptions;
			FormatCaepfOptions: FormatCaepfOptions;
			FormatCeiOptions: FormatCeiOptions;
			FormatCepOptions: FormatCepOptions;
			FormatCertidaoOptions: FormatCertidaoOptions;
			FormatCnaeOptions: FormatCnaeOptions;
			FormatLegalNatureOptions: FormatLegalNatureOptions;
			FormatCnhOptions: FormatCnhOptions;
			FormatCnoOptions: FormatCnoOptions;
			FormatCnpjOptions: FormatCnpjOptions;
			FormatCnsOptions: FormatCnsOptions;
			FormatCpfOptions: FormatCpfOptions;
			FormatCurrencyOptions: FormatCurrencyOptions;
			FormatNcmOptions: FormatNcmOptions;
			FormatNfeKeyOptions: FormatNfeKeyOptions;
			FormatPhoneOptions: FormatPhoneOptions;
			FormatPisOptions: FormatPisOptions;
			FormatProcessoJuridicoOptions: FormatProcessoJuridicoOptions;
			FormatSuframaOptions: FormatSuframaOptions;
			FormatVoterIdOptions: FormatVoterIdOptions;
			GenerateBoletoParams: GenerateBoletoParams;
			GenerateCnpjParams: GenerateCnpjParams;
			GenerateLicensePlateFormat: GenerateLicensePlateFormat;
			GeneratePhoneType: GeneratePhoneType;
			GeneratePixPayloadParams: GeneratePixPayloadParams;
			GenerateProcessoJuridicoOptions: GenerateProcessoJuridicoOptions;
			GenerateProcessoJuridicoParams: GenerateProcessoJuridicoParams;
			GetAddressInfoByCepOptions: GetAddressInfoByCepOptions;
			GetBoletoInfoOptions: GetBoletoInfoOptions;
			GetCepInfoByAddressOptions: GetCepInfoByAddressOptions;
			GetCepInfoByAddressParams: GetCepInfoByAddressParams;
			GetCnpjInfoOptions: GetCnpjInfoOptions;
			GetHolidaysOptions: GetHolidaysOptions;
			GetHolidaysParams: GetHolidaysParams;
			GetLegalNaturesByCategoryOptions: GetLegalNaturesByCategoryOptions;
			GetLegalNaturesParams: GetLegalNaturesParams;
			GetMunicipalityByCodeOptions: GetMunicipalityByCodeOptions;
			GetMunicipalityByCodeParams: GetMunicipalityByCodeParams;
			GetMunicipalityByNameOptions: GetMunicipalityByNameOptions;
			GetMunicipalityByNameParams: GetMunicipalityByNameParams;
			GetMunicipalityOptions: GetMunicipalityOptions;
			GetMunicipalityParams: GetMunicipalityParams;
			GtinInfo: GtinInfo;
			GtinLength: GtinLength;
			GtinType: GtinType;
			Holiday: Holiday;
			HolidayType: HolidayType;
			IbanInfo: IbanInfo;
			IsHolidayOptions: IsHolidayOptions;
			IsHolidayParams: IsHolidayParams;
			IsValidBankAccountOptions: IsValidBankAccountOptions;
			IsValidBankAccountParams: IsValidBankAccountParams;
			IsValidCertidaoOptions: IsValidCertidaoOptions;
			IsValidCnpjOptions: IsValidCnpjOptions;
			IsValidCstOptions: IsValidCstOptions;
			IsValidGtinOptions: IsValidGtinOptions;
			IsValidIeParams: IsValidIeParams;
			IsValidMobilePhoneOptions: IsValidMobilePhoneOptions;
			IsValidPhoneOptions: IsValidPhoneOptions;
			IsValidPixKeyOptions: IsValidPixKeyOptions;
			IsValidRegistroProfissionalParams: IsValidRegistroProfissionalParams;
			LegalNature: LegalNature;
			LegalNatureCategory: LegalNatureCategory;
			LicensePlateFormat: LicensePlateFormat;
			Municipality: Municipality;
			NfeKeyInfo: NfeKeyInfo;
			NfeKeyModel: NfeKeyModel;
			NumberToWordsGender: NumberToWordsGender;
			ParseCnpjOptions: ParseCnpjOptions;
			ParseCurrencyOptions: ParseCurrencyOptions;
			PhoneMask: PhoneMask;
			PhoneType: PhoneType;
			PhoneVersion: PhoneVersion;
			PixKeyInfo: PixKeyInfo;
			PixKeyType: PixKeyType;
			PixPayloadInfo: PixPayloadInfo;
			PixPointOfInitiation: PixPointOfInitiation;
			RegistroProfissionalCouncil: RegistroProfissionalCouncil;
			State: State;
			StateCode: StateCode;
			StandardSchemaV1: StandardSchemaV1;
			StandardSchemaV1FailureResult: StandardSchemaV1FailureResult;
			StandardSchemaV1Issue: StandardSchemaV1Issue;
			StandardSchemaV1Options: StandardSchemaV1Options;
			StandardSchemaV1PathSegment: StandardSchemaV1PathSegment;
			StandardSchemaV1Props: StandardSchemaV1Props;
			StandardSchemaV1Result: StandardSchemaV1Result<unknown>;
			StandardSchemaV1SuccessResult: StandardSchemaV1SuccessResult<unknown>;
			StandardSchemaV1Types: StandardSchemaV1Types;
			StateName: StateName;
			ToStandardSchemaOptions: ToStandardSchemaOptions;
		}> = {};

		expect(publicTypes).toEqual({});
	});
});

describe("Public API contract: never throws on bad input", () => {
	const entries = Object.entries(brazilianUtils).filter(
		([name, value]) =>
			typeof value === "function" && !isErrorClass(name) && !NETWORK_ENTRY_POINTS.has(name),
	) as [string, (...args: unknown[]) => unknown][];

	for (const [name, fn] of entries) {
		for (const [label, value] of BAD_INPUTS) {
			test(`${name} should not throw for ${label}`, async () => {
				let thrown: unknown;

				try {
					const result = fn(value);

					if (result instanceof Promise) await result;
				} catch (error) {
					thrown = error;
				}

				expect(thrown).toBeUndefined();
			});

			test(`${name} should not throw for ${label} as its second argument`, async () => {
				let thrown: unknown;

				try {
					const result = fn("123", value);

					if (result instanceof Promise) await result;
				} catch (error) {
					thrown = error;
				}

				expect(thrown).toBeUndefined();
			});
		}
	}
});
