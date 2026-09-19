import * as fc from "fast-check";

import { anyValue } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import * as library from "../../index";
import { type McpTool, TOOLS } from "../constants";
import { callTool, type CallToolParams, type CallToolResult } from "./call-tool";

const BOLETO = "00190000090114971860168524522114675860000102656";
const NFE_KEY = "35170458716523000119550010000000121000123458";
const CERTIDAO = "104539 01 55 2013 1 00012 021 0000123 21";
const IBAN = "BR1500000000000010932840814P2";
const PIX_PAYLOAD =
	"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

/** Every deterministic tool with the arguments of a documented example and the exact JSON answer. */
const EXACT_CASES: [name: string, args: Record<string, unknown>, text: string][] = [
	["addBusinessDays", { date: "2024-12-31", amount: 1 }, '"2025-01-02"'],
	[
		"addBusinessDays",
		{ date: "2024-07-08", amount: 1, options: { stateCode: "SP" } },
		'"2024-07-10"',
	],
	["capitalize", { value: "JOSÉ DA SILVA" }, '"José da Silva"'],
	["capitalize", { value: "empresa ltda", options: { upperCaseWords: [] } }, '"Empresa Ltda"'],
	[
		"convertCurrencyToWords",
		{ value: 1523.45 },
		'"mil quinhentos e vinte e três reais e quarenta e cinco centavos"',
	],
	["convertDateToWords", { value: "2024-01-02" }, '"dois de janeiro de dois mil e vinte e quatro"'],
	[
		"convertDateToWords",
		{ value: "02/03/2024", options: { style: "month" } },
		'"2 de março de 2024"',
	],
	["convertLicensePlateToMercosul", { value: "ABC1234" }, '"ABC1C34"'],
	["convertNumberToWords", { value: 1001 }, '"mil e um"'],
	["convertNumberToWords", { value: 2, options: { gender: "feminine" } }, '"duas"'],
	["differenceInBusinessDays", { laterDate: "2024-01-03", earlierDate: "2024-01-02" }, "1"],
	["formatBoleto", { value: BOLETO }, '"00190.00009 01149.718601 68524.522114 6 75860000102656"'],
	["formatCaepf", { value: "29311861000184" }, '"293.118.610/001-84"'],
	["formatCei", { value: "277297118187" }, '"27.729.71181/87"'],
	["formatCep", { value: "9250000", options: { pad: true } }, '"09250-000"'],
	[
		"formatCertidao",
		{ value: "10453901552013100012021000012321" },
		'"104539 01 55 2013 1 00012 021 0000123 21"',
	],
	["formatCnae", { value: "6201501" }, '"6201-5/01"'],
	["formatCnh", { value: "2650306461", options: { pad: true } }, '"026503064-61"'],
	["formatCno", { value: "111130137368" }, '"11.113.01373/68"'],
	["formatCnpj", { value: "12OUT345000199", options: { version: 2 } }, '"12.OUT.345/0001-99"'],
	["formatCnpj", { value: "12345678000195", options: { obfuscate: true } }, '"**.345.678/0001-**"'],
	["formatCns", { value: "123456789010000" }, '"123 4567 8901 0000"'],
	["formatCpf", { value: "746506880", options: { pad: true } }, '"007.465.068-80"'],
	["formatCpf", { value: "12345678909", options: { obfuscate: true } }, '"***.456.789-**"'],
	["formatCurrency", { value: 10_756.11 }, '"10.756,11"'],
	["formatCurrency", { value: 10, options: { symbol: true, precision: 3 } }, '"R$ 10,000"'],
	["formatIban", { value: IBAN }, '"BR15 0000 0000 0000 1093 2840 814P 2"'],
	["formatLegalNature", { value: "2062" }, '"206-2"'],
	["formatLicensePlate", { value: "abc1234" }, '"ABC-1234"'],
	["formatNcm", { value: "84713012" }, '"8471.30.12"'],
	["formatNfeKey", { value: "12345" }, '"1234 5"'],
	["formatPassport", { value: "AB-123.456" }, '"AB123456"'],
	["formatPhone", { value: "11900000000", options: { mask: "nanp" } }, '"(11) 90000-0000"'],
	["formatPis", { value: "12345678901" }, '"123.45678.90-1"'],
	["formatProcessoJuridico", { value: "00020802520125150049" }, '"0002080-25.2012.5.15.0049"'],
	["formatVoterId", { value: "1234567880191" }, '"1234 5678 8 01 91"'],
	[
		"generatePixPayload",
		{
			key: "123.456.789-09",
			merchantName: "Fulano de Tal",
			merchantCity: "Brasília",
			amount: 123.45,
		},
		'"00020126330014br.gov.bcb.pix0111123456789095204000053039865406123.455802BR5913Fulano de Tal6008Brasilia62070503***630479EE"',
	],
	["generatePixPayload", { merchantName: "Fulano", merchantCity: "Brasília" }, "null"],
	["generateProcessoJuridico", { court: 10 }, "null"],
	[
		"getAreaCodeInfo",
		{ value: "61" },
		'{"areaCode":61,"stateCode":"DF","stateName":"Distrito Federal","regionCode":"CO","regionName":"Centro-Oeste","stateCodes":["DF","GO"]}',
	],
	["getAreaCodesByState", { stateCode: "sp" }, "[11,12,13,14,15,16,17,18,19]"],
	[
		"getBankByCode",
		{ value: "001" },
		'{"code":"001","ispb":"00000000","name":"Banco do Brasil S.A."}',
	],
	[
		"getBankByIspb",
		{ value: "60701190" },
		'{"code":"341","ispb":"60701190","name":"ITAÚ UNIBANCO S.A."}',
	],
	[
		"getBoletoInfo",
		{ value: BOLETO, options: { referenceDate: "2018-07-01" } },
		'{"amount":102656,"expirationDate":"2018-07-15","bankCode":"001"}',
	],
	["getBoletoInfo", { value: "invalid" }, "null"],
	[
		"getCbo",
		{ value: "2124-05" },
		'{"code":"212405","description":"Analista de desenvolvimento de sistemas"}',
	],
	[
		"getCertidaoInfo",
		{ value: CERTIDAO },
		'{"registryCns":"104539","acervo":"01","service":"55","year":2013,"type":"birth","typeCode":1,"book":"00012","page":"021","term":"0000123","checkDigits":"21"}',
	],
	[
		"getCfop",
		{ value: "1101" },
		'{"code":"1101","description":"Compra para industrialização ou produção rural"}',
	],
	["getCnae", { value: "0111301" }, '{"code":"0111301","description":"CULTIVO DE ARROZ"}'],
	["getFormatLicensePlate", { value: "ABC1D23" }, '"LLLNLNN"'],
	[
		"getIbanInfo",
		{ value: IBAN },
		'{"countryCode":"BR","checkDigits":"15","bankIspb":"00000000","branch":"00001","account":"0932840814","accountType":"P","owner":"2"}',
	],
	[
		"getLegalNature",
		{ value: "2208" },
		'{"code":"2208","description":"Entidade Binacional Itaipu","category":{"code":"2","description":"Entidades Empresariais"},"legacy":true,"currentCode":"2275"}',
	],
	[
		"getMunicipalityByCode",
		{ value: "3550308" },
		'{"code":"3550308","name":"São Paulo","stateCode":"SP"}',
	],
	[
		"getNfeKeyInfo",
		{ value: NFE_KEY },
		'{"stateCode":"SP","year":2017,"month":4,"taxId":"58716523000119","model":"55","series":1,"number":12,"emissionType":1,"code":"00012345","checkDigit":8}',
	],
	[
		"getPixKeyInfo",
		{ value: "Fulano@Example.COM " },
		'{"type":"email","value":"fulano@example.com"}',
	],
	[
		"getPixPayloadInfo",
		{ value: PIX_PAYLOAD },
		'{"merchantName":"Fulano de Tal","merchantCity":"BRASILIA","pointOfInitiation":"static","key":"123e4567-e12b-12d1-a456-426655440000"}',
	],
	[
		"getStateByIbgeCode",
		{ value: "35" },
		'{"code":"SP","name":"São Paulo","regionCode":"SE","regionName":"Sudeste","ibgeCode":35}',
	],
	["getStateCodeByName", { name: "sao paulo" }, '"SP"'],
	["getStateNameByCode", { stateCode: "sp" }, '"São Paulo"'],
	["getTimezoneByState", { stateCode: "am" }, '"America/Manaus"'],
	["isBusinessDay", { date: "2024-01-02" }, "true"],
	["isBusinessDay", { date: "2024-02-13" }, "false"],
	["isBusinessDay", { date: "2024-02-13", options: { includeOptional: false } }, "true"],
	["isHoliday", { targetDate: "2024-01-01" }, "true"],
	["isHoliday", { targetDate: "2024-07-09" }, "false"],
	["isHoliday", { targetDate: "2024-07-09", stateCode: "SP" }, "true"],
	["isValidBankAccount", { bankCode: "341", agency: "2545", account: "02366", digit: "1" }, "true"],
	[
		"isValidBankAccount",
		{ bankCode: "341", agency: "2545", account: "02366", digit: "2" },
		"false",
	],
	["isValidBoleto", { value: BOLETO }, "true"],
	["isValidCaepf", { value: "293.118.610/001-84" }, "true"],
	["isValidCbo", { value: "2124-05" }, "true"],
	["isValidCei", { value: "11.583.00249/85" }, "true"],
	["isValidCep", { value: "01310100" }, "true"],
	["isValidCertidao", { value: CERTIDAO }, "true"],
	["isValidCertidao", { value: CERTIDAO, options: { accept: ["death"] } }, "false"],
	["isValidCfop", { value: "5102" }, "true"],
	["isValidCnae", { value: "6201-5/01" }, "true"],
	["isValidCnh", { value: "00000000119" }, "true"],
	["isValidCno", { value: "11.084.01680/62" }, "true"],
	["isValidCnpj", { value: "q0slfmbd7vx439" }, "false"],
	["isValidCnpj", { value: "q0slfmbd7vx439", options: { version: 2 } }, "true"],
	["isValidCns", { value: "700000000000005" }, "true"],
	["isValidCpf", { value: "111 444 777 35" }, "true"],
	["isValidCpf", { value: "155151475" }, "false"],
	["isValidCreditCard", { value: "4111111111111111" }, "true"],
	["isValidCsosn", { value: "101" }, "true"],
	["isValidCst", { value: "06", options: { tax: "pis" } }, "true"],
	["isValidCst", { value: "06", options: { tax: "icms" } }, "false"],
	["isValidEmail", { value: "john.doe@hotmail.com" }, "true"],
	["isValidIban", { value: IBAN }, "true"],
	["isValidIe", { value: "109161793", stateCode: "go" }, "true"],
	["isValidLandlinePhone", { value: "1130000000" }, "true"],
	["isValidLegalNature", { value: "2062" }, "true"],
	["isValidLicensePlate", { value: "ABC-1234" }, "true"],
	["isValidMobilePhone", { value: "11612345678" }, "true"],
	["isValidMobilePhone", { value: "11612345678", options: { version: 2 } }, "false"],
	["isValidNcm", { value: "8471.30.12" }, "true"],
	["isValidNfeKey", { value: NFE_KEY }, "true"],
	["isValidPassport", { value: "AB123456" }, "true"],
	["isValidPhone", { value: "0800 123 4567" }, "false"],
	["isValidPhone", { value: "0800 123 4567", options: { accept: ["service"] } }, "true"],
	["isValidPis", { value: "12056412847" }, "true"],
	["isValidPixKey", { value: "fulano@example.com" }, "true"],
	["isValidPixKey", { value: "fulano@example.com", options: { accept: ["cpf"] } }, "false"],
	["isValidPixPayload", { value: PIX_PAYLOAD }, "true"],
	["isValidProcessoJuridico", { value: "0002080-25.2012.5.15.0049" }, "true"],
	["isValidRegistroProfissional", { value: "123456/SP", council: "OAB" }, "true"],
	["isValidRegistroProfissional", { value: "123456-RJ", council: "OAB", stateCode: "SP" }, "false"],
	["isValidRenavam", { value: "00639884962" }, "true"],
	["isValidServicePhone", { value: "4004-1234" }, "true"],
	["isValidVin", { value: "1HGCM82633A004352" }, "true"],
	["isValidVoterId", { value: "102385010671" }, "true"],
	[
		"parseBoleto",
		{ value: "00190.00009 01149.718601 68524.522114 6 75860000102656" },
		`"${BOLETO}"`,
	],
	["parseCaepf", { value: "293.118.610/001-84" }, '"29311861000184"'],
	["parseCbo", { value: "2124-05" }, '"212405"'],
	["parseCei", { value: "27.729.71181/87" }, '"277297118187"'],
	["parseCep", { value: "92500-000" }, '"92500000"'],
	["parseCertidao", { value: CERTIDAO }, '"10453901552013100012021000012321"'],
	["parseCfop", { value: "5.102" }, '"5102"'],
	["parseCnae", { value: "6201-5/01" }, '"6201501"'],
	["parseCnh", { value: "026503064-61" }, '"02650306461"'],
	["parseCno", { value: "11.113.01373/68" }, '"111130137368"'],
	["parseCnpj", { value: "12.OUT.345/0001-99" }, '"12345000199"'],
	["parseCnpj", { value: "12.OUT.345/0001-99", options: { version: 2 } }, '"12OUT345000199"'],
	["parseCns", { value: "123 4567 8901 0000" }, '"123456789010000"'],
	["parseCpf", { value: "746.506.880-00" }, '"74650688000"'],
	["parseCurrency", { value: "R$ 1.234,56" }, "1234.56"],
	["parseCurrency", { value: "1,2345", options: { precision: 4 } }, "1.2345"],
	["parseIban", { value: "br15-0000.0000/0000 1093 2840 814p-2" }, `"${IBAN}"`],
	["parseLegalNature", { value: "206-2" }, '"2062"'],
	["parseLicensePlate", { value: "abc-1234" }, '"ABC1234"'],
	["parseNcm", { value: "8471.30.12" }, '"84713012"'],
	["parseNfeKey", { value: `NFe${NFE_KEY}` }, `"${NFE_KEY}"`],
	["parsePassport", { value: " AB 123 456 " }, '"AB123456"'],
	["parsePhone", { value: "+55 (11) 98765-4321" }, '"11987654321"'],
	["parsePis", { value: "123.45678.90-1" }, '"12345678901"'],
	["parseProcessoJuridico", { value: "0002080-25.2012.5.15.0049" }, '"00020802520125150049"'],
	["parseVoterId", { value: "1234 5678 8 01 91" }, '"1234567880191"'],
	["removeAccents", { value: "São Paulo" }, '"Sao Paulo"'],
	["subBusinessDays", { date: "2024-01-08", amount: 1 }, '"2024-01-05"'],
];

/** The random generators: the arguments and the shape every answer has. */
const GENERATOR_CASES: [name: string, args: Record<string, unknown>, shape: RegExp][] = [
	["generateBoleto", {}, /^"\d{47}"$/],
	["generateBoleto", { type: "arrecadacao" }, /^"8\d{47}"$/],
	["generateCep", {}, /^"\d{8}"$/],
	["generateCnh", {}, /^"\d{11}"$/],
	["generateCnpj", {}, /^"\d{14}"$/],
	["generateCnpj", { version: 2, branch: 1 }, /^"[0-9A-Z]{8}0001\d{2}"$/],
	["generateCpf", {}, /^"\d{11}"$/],
	["generateCpf", { stateCode: "SP" }, /^"\d{8}8\d{2}"$/],
	["generateLegalNature", {}, /^"\d{4}"$/],
	["generateLicensePlate", { format: "LLLNNNN" }, /^"[A-Z]{3}\d{4}"$/],
	["generateLicensePlate", { format: "LLLNLNN" }, /^"[A-Z]{3}\d[A-Z]\d{2}"$/],
	["generatePassport", {}, /^"[A-Z]{2}\d{6}"$/],
	["generatePhone", { type: "mobile" }, /^"\d{2}9\d{8}"$/],
	["generatePis", {}, /^"\d{11}"$/],
	["generateProcessoJuridico", { year: 2999, court: 5 }, /^"\d{9}29995\d{6}"$/],
	["generateRenavam", {}, /^"\d{11}"$/],
	["generateVoterId", {}, /^"\d{8}28\d{2}"$/],
	["generateVoterId", { stateCode: "SP" }, /^"\d{8}01\d{2}"$/],
];

/** The list tools: the arguments, the number of entries and the first entry of the answer. */
const LIST_CASES: [name: string, args: Record<string, unknown>, length: number, first: unknown][] =
	[
		["getHolidays", { year: 2024 }, 13, { name: "Ano novo", date: "2024-01-01", type: "national" }],
		[
			"getLegalNaturesByCategory",
			{ category: "4" },
			6,
			{
				code: "4014",
				description: "Empresa Individual Imobiliária",
				category: { code: "4", description: "Pessoas Físicas" },
				legacy: false,
			},
		],
		[
			"getLegalNaturesByCategory",
			{ category: "2", options: { includeLegacy: true } },
			33,
			{
				code: "2011",
				description: "Empresa Pública",
				category: { code: "2", description: "Entidades Empresariais" },
				legacy: false,
			},
		],
		[
			"getMunicipalities",
			{ stateCode: "SP" },
			645,
			{ code: "3500105", name: "Adamantina", stateCode: "SP" },
		],
		[
			"getStates",
			{},
			27,
			{ code: "AC", name: "Acre", regionCode: "N", regionName: "Norte", ibgeCode: 12 },
		],
	];

const NETWORK_TOOLS = ["getAddressInfoByCep", "getCepInfoByAddress"];

const findTool = (name: string): McpTool => {
	const tool = TOOLS.find((candidate) => candidate.name === name);
	if (tool === undefined) throw new Error(`No tool named ${name}`);

	return tool;
};

const call = (name: string, args: Record<string, unknown>): Promise<CallToolResult> =>
	callTool({ tool: findTool(name), args, library });

const FAKE_TOOL: McpTool = {
	name: "fake",
	description: "A tool for the tests.",
	parameters: ["value", "options"],
	inputSchema: {
		type: "object",
		properties: { value: { type: "string" }, options: { type: "object", properties: {} } },
		required: ["value"],
		additionalProperties: false,
	},
};

const visitSchema = (schema: McpTool["inputSchema"]): void => {
	if (schema.type === "object") {
		expect(schema.additionalProperties).toBe(false);
		expect(schema.properties).toBeDefined();
	}

	const properties = schema.properties ?? {};
	for (const key of schema.required ?? []) expect(Object.keys(properties)).toContain(key);
	for (const property of Object.values(properties)) visitSchema(property);
	if (schema.items !== undefined) visitSchema(schema.items);
};

const returnUndefined = (): undefined => undefined;

const returnAsynchronously = (value: string): Promise<string[]> => Promise.resolve([value]);

const throwRangeError = (): never => {
	throw new RangeError("out of range");
};

const rejectOffline = (): Promise<never> => Promise.reject(new Error("offline"));

const catchFailure = async (fakes: Record<string, unknown>): Promise<unknown> => {
	try {
		return await callTool({ tool: FAKE_TOOL, args: {}, library: fakes });
	} catch (error) {
		return error;
	}
};

const OFFLINE_TOOLS = TOOLS.filter((tool) => tool.network !== true);

const anyOfflineTool = fc.constantFrom(...OFFLINE_TOOLS);

const anyValueTool = fc.constantFrom(
	...OFFLINE_TOOLS.filter((tool) => tool.inputSchema.required?.join(",") === "value"),
);

const anyArguments = fc.dictionary(
	fc.constantFrom("value", "options", "date", "__proto__", "x"),
	anyValue,
);

describe("callTool", () => {
	describe("the tool table against the library", () => {
		for (const [name, args, text] of EXACT_CASES) {
			test(`should answer ${name}(${JSON.stringify(args)}) with ${text}`, async () => {
				expect(await call(name, args)).toStrictEqual({
					content: [{ type: "text", text }],
					isError: false,
				});
			});
		}

		for (const [name, args, shape] of GENERATOR_CASES) {
			test(`should answer ${name}(${JSON.stringify(args)}) with a value shaped as ${String(shape)}`, async () => {
				const result = await call(name, args);

				expect(result.isError).toBe(false);
				expect(result.content[0].text).toMatch(shape);
			});
		}

		for (const [name, args, length, first] of LIST_CASES) {
			test(`should answer ${name}(${JSON.stringify(args)}) with ${length} entries`, async () => {
				const result = await call(name, args);
				const list: unknown[] = JSON.parse(result.content[0].text);

				expect(result.isError).toBe(false);
				expect(list).toHaveLength(length);
				expect(list[0]).toStrictEqual(first);
			});
		}

		test("should answer getBanks with the bank list, Banco do Brasil first", async () => {
			const result = await call("getBanks", {});
			const banks: unknown[] = JSON.parse(result.content[0].text);

			expect(result.isError).toBe(false);
			expect(banks.length).toBeGreaterThan(100);
			expect(banks[0]).toStrictEqual({
				code: "001",
				ispb: "00000000",
				name: "Banco do Brasil S.A.",
			});
		});

		test("should answer getLegalNatures with the map of codes in force, or with the retired ones too", async () => {
			const inForceResult = await call("getLegalNatures", {});
			const allResult = await call("getLegalNatures", { includeLegacy: true });
			const inForce = JSON.parse(inForceResult.content[0].text);
			const all = JSON.parse(allResult.content[0].text);

			expect(Object.keys(inForce)).toHaveLength(92);
			expect(inForce["2062"]).toBe("Sociedade Empresária Limitada");
			expect(inForce["2208"]).toBeUndefined();
			expect(Object.keys(all)).toHaveLength(100);
			expect(all["2208"]).toBe("Entidade Binacional Itaipu");
		});

		test("should report the rejection of a network tool as a tool error, without any request", async () => {
			expect(await call("getAddressInfoByCep", { value: "123" })).toStrictEqual({
				content: [{ type: "text", text: "GetAddressInfoByCepValidationError: CEP inválido" }],
				isError: true,
			});
			expect(
				await call("getCepInfoByAddress", { federalUnit: "XX", city: "Ouro Preto", street: "Rua" }),
			).toStrictEqual({
				content: [{ type: "text", text: "GetCepInfoByAddressValidationError: Invalid UF: XX" }],
				isError: true,
			});
		});

		test("should have a case for every tool", () => {
			const covered = new Set([
				...EXACT_CASES.map(([name]) => name),
				...GENERATOR_CASES.map(([name]) => name),
				...LIST_CASES.map(([name]) => name),
				...NETWORK_TOOLS,
				"getBanks",
				"getLegalNatures",
			]);

			expect(TOOLS.map((tool) => tool.name).filter((name) => !covered.has(name))).toStrictEqual([]);
		});
	});

	describe("the tool table", () => {
		const DEPRECATED = new Set([
			"formatCEP",
			"formatCNPJ",
			"formatCPF",
			"generateCNPJ",
			"generateCPF",
			"getCities",
			"getMunicipality",
			"isValidCEP",
			"isValidCNPJ",
			"isValidCPF",
			"isValidIE",
			"isValidPIS",
		]);

		test("should list one tool per public function, the deprecated ones aside", () => {
			const functions = Object.entries(library)
				.filter(([name, value]) => typeof value === "function" && !/^[A-Z]/.test(name))
				.map(([name]) => name)
				.filter((name) => !DEPRECATED.has(name))
				.toSorted();

			expect(TOOLS.map((tool) => tool.name)).toStrictEqual(functions);
			expect(TOOLS).toHaveLength(136);
		});

		test("should mark the two CEP lookups, and only them, as network tools", () => {
			expect(TOOLS.filter((tool) => tool.network).map((tool) => tool.name)).toStrictEqual(
				NETWORK_TOOLS,
			);
		});

		test("should name tools within the characters and the length the specification allows", () => {
			for (const tool of TOOLS) {
				expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
				expect(tool.description.length).toBeGreaterThan(20);
			}
		});

		test("should close every object schema and require only properties it lists", () => {
			for (const tool of TOOLS) {
				expect(tool.inputSchema.type).toBe("object");
				visitSchema(tool.inputSchema);
			}
		});

		test("should pass only properties the input schema lists", () => {
			for (const tool of TOOLS) {
				const listed = Object.keys(tool.inputSchema.properties ?? {});
				const passed = tool.parameters === "object" ? listed : tool.parameters;

				expect([...passed].toSorted()).toStrictEqual(listed.toSorted());
			}
		});
	});

	describe("arguments", () => {
		test("should pass the listed properties positionally, a missing one as undefined", async () => {
			const calls: unknown[][] = [];
			const fake = (...args: unknown[]): string => {
				calls.push(args);
				return "ok";
			};

			await callTool({ tool: FAKE_TOOL, args: { value: "a", options: {} }, library: { fake } });
			await callTool({ tool: FAKE_TOOL, args: { value: "b" }, library: { fake } });

			expect(calls).toStrictEqual([
				["a", {}],
				["b", undefined],
			]);
		});

		test("should pass the whole arguments object when the tool takes one", async () => {
			const calls: unknown[][] = [];
			const fake = (...args: unknown[]): null => {
				calls.push(args);
				return null;
			};
			const tool: McpTool = { ...FAKE_TOOL, parameters: "object" };

			await callTool({ tool, args: { value: "a" }, library: { fake } });

			expect(calls).toStrictEqual([[{ value: "a" }]]);
		});

		test("should answer arguments that break the schema with a tool error and not call the function", async () => {
			let called = false;
			const fake = (): void => {
				called = true;
			};

			expect(await callTool({ tool: FAKE_TOOL, args: {}, library: { fake } })).toStrictEqual({
				content: [{ type: "text", text: "arguments.value is required" }],
				isError: true,
			});
			expect(
				await callTool({ tool: FAKE_TOOL, args: { value: 1 }, library: { fake } }),
			).toStrictEqual({
				content: [{ type: "text", text: "arguments.value must be of type string" }],
				isError: true,
			});
			expect(called).toBe(false);
			expect(await call("isHoliday", { targetDate: "01/01/2024" })).toStrictEqual({
				content: [
					{
						type: "text",
						text: "arguments.targetDate must be a calendar date written as YYYY-MM-DD",
					},
				],
				isError: true,
			});
			expect(await call("generateCpf", { stateCode: "XX" })).toMatchObject({ isError: true });
		});
	});

	describe("results", () => {
		test("should write undefined as null and a Date as a calendar date", async () => {
			expect(
				await callTool({
					tool: FAKE_TOOL,
					args: { value: "" },
					library: { fake: returnUndefined },
				}),
			).toStrictEqual({ content: [{ type: "text", text: "null" }], isError: false });
			expect(
				await callTool({
					tool: FAKE_TOOL,
					args: { value: "" },
					library: { fake: () => ({ on: new Date(2024, 0, 1) }) },
				}),
			).toStrictEqual({ content: [{ type: "text", text: '{"on":"2024-01-01"}' }], isError: false });
		});

		test("should await an asynchronous function", async () => {
			const fakes = { fake: returnAsynchronously };

			expect(
				await callTool({ tool: FAKE_TOOL, args: { value: "a" }, library: fakes }),
			).toStrictEqual({ content: [{ type: "text", text: '["a"]' }], isError: false });
		});

		test("should answer an error the function throws or rejects with as a tool error", async () => {
			const args = { value: "" };
			const thrown = await callTool({ tool: FAKE_TOOL, args, library: { fake: throwRangeError } });
			const rejected = await callTool({ tool: FAKE_TOOL, args, library: { fake: rejectOffline } });

			expect(thrown).toStrictEqual({
				content: [{ type: "text", text: "RangeError: out of range" }],
				isError: true,
			});
			expect(rejected).toStrictEqual({
				content: [{ type: "text", text: "Error: offline" }],
				isError: true,
			});
		});

		test("should reject when the library has no function named after the tool", async () => {
			const inherited: Record<string, unknown> = Object.create({ fake: returnUndefined });
			const failures = await Promise.all(
				[{}, { fake: "not a function" }, inherited].map((candidate) => catchFailure(candidate)),
			);

			expect(failures.map(String)).toStrictEqual([
				"TypeError: The library has no function named fake",
				"TypeError: The library has no function named fake",
				"TypeError: The library has no function named fake",
			]);
			expect(failures.every((failure) => failure instanceof TypeError)).toBe(true);
		});

		test("should check the arguments only once the function is found", async () => {
			expect(await catchFailure({ fake: returnUndefined })).toStrictEqual({
				content: [{ type: "text", text: "arguments.value is required" }],
				isError: true,
			});
		});
	});

	describe("properties", () => {
		test("should answer every offline tool, whatever the value, without an error", async () => {
			const property = fc.asyncProperty(anyValueTool, fc.string(), async (tool, value) => {
				const valueSchema = tool.inputSchema.properties?.["value"];
				const args = { value: valueSchema?.type === "number" ? value.length : value };
				const result = await callTool({ tool, args, library });
				const text: unknown = JSON.parse(result.content[0].text);

				expect(result.isError).toBe(false);
				expect(text === undefined).toBe(false);
			});

			await fc.assert(property);
		});

		test("should never reject on arbitrary arguments", async () => {
			const property = fc.asyncProperty(anyOfflineTool, anyArguments, async (tool, args) => {
				const result = await callTool({ tool, args, library });

				expect(typeof result.isError).toBe("boolean");
				expect(typeof result.content[0].text).toBe("string");
			});

			await fc.assert(property);
		});
	});
});

describe("callTool types", () => {
	test("should take the tool, the arguments and the library and resolve to a tool result", () => {
		expectTypeOf(callTool).parameter(0).toEqualTypeOf<CallToolParams>();
		expectTypeOf(callTool).returns.toEqualTypeOf<Promise<CallToolResult>>();
		expectTypeOf<CallToolResult["content"]>().toEqualTypeOf<[{ type: "text"; text: string }]>();
		expectTypeOf<CallToolResult["isError"]>().toEqualTypeOf<boolean>();
	});
});
