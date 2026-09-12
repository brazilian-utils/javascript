import { describe, expect, test } from "./_internals/test/runtime";
import type {
	AddBusinessDaysParams,
	AddressInfo,
	AreaCodeInfo,
	Bank,
	BoletoInfo,
	CapitalizeOptions,
	Cbo,
	CepAddressInfo,
	CepProvider,
	Certidao,
	CertidaoType,
	Cfop,
	Cnae,
	ConvertCurrencyToWordsOptions,
	ConvertDateToWordsOptions,
	ConvertNumberToWordsOptions,
	DifferenceInBusinessDaysParams,
	FormatBoletoOptions,
	FormatCaepfOptions,
	FormatCeiOptions,
	FormatCepOptions,
	FormatCertidaoOptions,
	FormatCnhOptions,
	FormatCnoOptions,
	FormatCnpjOptions,
	FormatCnsOptions,
	FormatCpfOptions,
	FormatCurrencyOptions,
	FormatPhoneOptions,
	FormatPisOptions,
	FormatProcessoJuridicoOptions,
	GenerateBoletoOptions,
	GenerateLicensePlateFormat,
	GeneratePhoneType,
	GeneratePixPayloadParams,
	GenerateProcessoJuridicoOptions,
	GetAddressInfoByCepOptions,
	GetBoletoInfoOptions,
	GetCepInfoByAddressOptions,
	GetHolidaysOptions,
	GetMunicipalityByCodeOptions,
	GetMunicipalityByNameOptions,
	GetMunicipalityOptions,
	Holiday,
	HolidayType,
	Iban,
	IsBusinessDayOptions,
	IsHolidayOptions,
	IsValidBankAccountOptions,
	IsValidBankAccountParams,
	IsValidCertidaoOptions,
	IsValidCnpjOptions,
	IsValidCstOptions,
	IsValidMobilePhoneOptions,
	IsValidPhoneOptions,
	IsValidPixKeyOptions,
	IsValidRegistroProfissionalOptions,
	LegalNature,
	LicensePlateFormat,
	Municipality,
	NfeKey,
	NumberToWordsGender,
	ParseCnpjOptions,
	ParseCurrencyOptions,
	PhoneMask,
	PhoneType,
	PhoneVersion,
	PixKey,
	PixKeyType,
	PixPayload,
	PixPointOfInitiation,
	RegistroProfissionalCouncil,
	State,
	StateCode,
	StateName,
	WordsCase,
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
	"getCfop",
	"getCities",
	"getCnae",
	"getFormatLicensePlate",
	"getHolidays",
	"getLegalNature",
	"getLegalNatures",
	"getMunicipalities",
	"getMunicipality",
	"getMunicipalityByCode",
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
	"isValidVin",
	"isValidVoterId",
	"parseBoleto",
	"parseCep",
	"parseCertidao",
	"parseCnh",
	"parseCnpj",
	"parseCpf",
	"parseCurrency",
	"parseIban",
	"parseLegalNature",
	"parseLicensePlate",
	"parseNfeKey",
	"parsePassport",
	"parsePhone",
	"parsePis",
	"parsePixKey",
	"parsePixPayload",
	"parseProcessoJuridico",
	"parseVoterId",
	"removeAccents",
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
			AddBusinessDaysParams: AddBusinessDaysParams;
			AddressInfo: AddressInfo;
			AreaCodeInfo: AreaCodeInfo;
			Bank: Bank;
			BoletoInfo: BoletoInfo;
			CapitalizeOptions: CapitalizeOptions;
			Cbo: Cbo;
			CepAddressInfo: CepAddressInfo;
			CepProvider: CepProvider;
			Certidao: Certidao;
			CertidaoType: CertidaoType;
			Cfop: Cfop;
			Cnae: Cnae;
			ConvertCurrencyToWordsOptions: ConvertCurrencyToWordsOptions;
			ConvertDateToWordsOptions: ConvertDateToWordsOptions;
			ConvertNumberToWordsOptions: ConvertNumberToWordsOptions;
			DifferenceInBusinessDaysParams: DifferenceInBusinessDaysParams;
			FormatBoletoOptions: FormatBoletoOptions;
			FormatCaepfOptions: FormatCaepfOptions;
			FormatCeiOptions: FormatCeiOptions;
			FormatCepOptions: FormatCepOptions;
			FormatCertidaoOptions: FormatCertidaoOptions;
			FormatCnhOptions: FormatCnhOptions;
			FormatCnoOptions: FormatCnoOptions;
			FormatCnpjOptions: FormatCnpjOptions;
			FormatCnsOptions: FormatCnsOptions;
			FormatCpfOptions: FormatCpfOptions;
			FormatCurrencyOptions: FormatCurrencyOptions;
			FormatPhoneOptions: FormatPhoneOptions;
			FormatPisOptions: FormatPisOptions;
			FormatProcessoJuridicoOptions: FormatProcessoJuridicoOptions;
			GenerateBoletoOptions: GenerateBoletoOptions;
			GenerateLicensePlateFormat: GenerateLicensePlateFormat;
			GeneratePhoneType: GeneratePhoneType;
			GeneratePixPayloadParams: GeneratePixPayloadParams;
			GenerateProcessoJuridicoOptions: GenerateProcessoJuridicoOptions;
			GetAddressInfoByCepOptions: GetAddressInfoByCepOptions;
			GetBoletoInfoOptions: GetBoletoInfoOptions;
			GetCepInfoByAddressOptions: GetCepInfoByAddressOptions;
			GetHolidaysOptions: GetHolidaysOptions;
			GetMunicipalityByCodeOptions: GetMunicipalityByCodeOptions;
			GetMunicipalityByNameOptions: GetMunicipalityByNameOptions;
			GetMunicipalityOptions: GetMunicipalityOptions;
			Holiday: Holiday;
			HolidayType: HolidayType;
			Iban: Iban;
			IsBusinessDayOptions: IsBusinessDayOptions;
			IsHolidayOptions: IsHolidayOptions;
			IsValidBankAccountOptions: IsValidBankAccountOptions;
			IsValidBankAccountParams: IsValidBankAccountParams;
			IsValidCertidaoOptions: IsValidCertidaoOptions;
			IsValidCnpjOptions: IsValidCnpjOptions;
			IsValidCstOptions: IsValidCstOptions;
			IsValidMobilePhoneOptions: IsValidMobilePhoneOptions;
			IsValidPhoneOptions: IsValidPhoneOptions;
			IsValidPixKeyOptions: IsValidPixKeyOptions;
			IsValidRegistroProfissionalOptions: IsValidRegistroProfissionalOptions;
			LegalNature: LegalNature;
			LicensePlateFormat: LicensePlateFormat;
			Municipality: Municipality;
			NfeKey: NfeKey;
			NumberToWordsGender: NumberToWordsGender;
			ParseCnpjOptions: ParseCnpjOptions;
			ParseCurrencyOptions: ParseCurrencyOptions;
			PhoneMask: PhoneMask;
			PhoneType: PhoneType;
			PhoneVersion: PhoneVersion;
			PixKey: PixKey;
			PixKeyType: PixKeyType;
			PixPayload: PixPayload;
			PixPointOfInitiation: PixPointOfInitiation;
			RegistroProfissionalCouncil: RegistroProfissionalCouncil;
			State: State;
			StateCode: StateCode;
			StateName: StateName;
			WordsCase: WordsCase;
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
