/** JSON Schema `type` values the tool table uses. */
export type McpJsonSchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array";

/** The JSON Schema 2020-12 subset the tool table is written in and `parseToolArguments` enforces. */
export type McpJsonSchema = {
	/** The JSON type the value must have. */
	type: McpJsonSchemaType;
	/** What the value means, shown to the model. */
	description?: string;
	/** The closed list of accepted values. */
	enum?: readonly (string | number)[];
	/** `"date"` marks a `YYYY-MM-DD` string that reaches the library as a local `Date`. */
	format?: "date";
	/** The properties an object accepts; any other property is refused. */
	properties?: Readonly<Record<string, McpJsonSchema>>;
	/** The properties an object must carry. */
	required?: readonly string[];
	/** Always `false`: tells the client that objects are closed. */
	additionalProperties?: false;
	/** The schema of every item of an array. */
	items?: McpJsonSchema;
};

/** One library function exposed as an MCP tool. */
export type McpTool = {
	/** The tool name, which is the name of the library function it calls. */
	name: string;
	/** What the tool does and what it returns, shown to the model. */
	description: string;
	/** The `arguments` properties passed positionally, or `"object"` to pass `arguments` whole. */
	parameters: readonly string[] | "object";
	/** The JSON Schema of `arguments`. */
	inputSchema: McpJsonSchema;
	/** Whether the tool queries a public web API instead of computing offline. */
	network?: true;
};

/** The modern, stateless protocol revision, negotiated per request through `_meta`. */
export const MODERN_PROTOCOL_VERSION = "2026-07-28";

/** The handshake based revisions served after `initialize`, newest first. */
export const LEGACY_PROTOCOL_VERSIONS: readonly string[] = [
	"2025-11-25",
	"2025-06-18",
	"2025-03-26",
	"2024-11-05",
];

/** Every revision the server speaks, newest first. */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [
	MODERN_PROTOCOL_VERSION,
	...LEGACY_PROTOCOL_VERSIONS,
];

/** The `_meta` key that carries the protocol version of a modern request. */
export const META_PROTOCOL_VERSION = "io.modelcontextprotocol/protocolVersion";

/** The `_meta` key that carries the client capabilities of a modern request. */
export const META_CLIENT_CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";

/** The `_meta` key a modern result identifies the server under. */
export const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

/** JSON-RPC 2.0 and MCP error codes. */
export const ERROR_CODES = {
	parseError: -32_700,
	invalidRequest: -32_600,
	methodNotFound: -32_601,
	invalidParams: -32_602,
	internalError: -32_603,
	unsupportedProtocolVersion: -32_022,
} as const;

/** How long a client may cache `server/discover` and `tools/list`: the tools never change while the process runs. */
export const CACHE_TTL_MS = 3_600_000;

/** The name the server reports in `serverInfo`. */
export const SERVER_NAME = "brazilian-utils";

/** The guidance sent to the model with `initialize` and `server/discover`. */
export const SERVER_INSTRUCTIONS =
	"Validate, format, parse, generate and look up Brazilian data (CPF, CNPJ, CEP, boleto, Pix, phone, NF-e, holidays, banks, IBGE municipalities and more) instead of answering from memory. Every tool calls the function of the same name of the @brazilian-utils/brazilian-utils package and returns its result as JSON. An invalid value is a normal result, not an error: validators answer false, formatters and parsers answer an empty string, lookups answer null or an empty list. Documents must be passed as strings, so leading zeros survive. Dates are calendar dates written as YYYY-MM-DD. Generated documents are random and synthetic: they pass the check digit rules and belong to no one. Only getAddressInfoByCep and getCepInfoByAddress use the network.";

const STATE_CODES = [
	"AC",
	"AL",
	"AM",
	"AP",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MG",
	"MS",
	"MT",
	"PA",
	"PB",
	"PE",
	"PI",
	"PR",
	"RJ",
	"RN",
	"RO",
	"RR",
	"RS",
	"SC",
	"SE",
	"SP",
	"TO",
] as const;

const STATE_CODE: McpJsonSchema = {
	type: "string",
	enum: STATE_CODES,
	description: "Two-letter code of a Brazilian state (UF).",
};

const LOOSE_STATE_CODE: McpJsonSchema = {
	type: "string",
	description: "Two-letter code of a Brazilian state (UF), in any letter case, such as SP.",
};

const VALUE: McpJsonSchema = {
	type: "string",
	description: "The value to read, with or without its mask.",
};

const DATE: McpJsonSchema = {
	type: "string",
	format: "date",
	description: "Calendar date written as YYYY-MM-DD.",
};

const PAD: McpJsonSchema = {
	type: "boolean",
	description: "Left pad the value with zeros up to the full length before masking. Default false.",
};

const CNPJ_VERSION: McpJsonSchema = {
	type: "integer",
	enum: [1, 2],
	description: "CNPJ format: 1 (default) is numeric only, 2 also covers the alphanumeric CNPJ.",
};

const PHONE_VERSION: McpJsonSchema = {
	type: "integer",
	enum: [1, 2],
	description:
		"Mobile numbering rule: 1 (default) lets the number start with 6 to 9, 2 follows Resolução Anatel 749/2022 and lets it start with 7 to 9 only.",
};

const INCLUDE_LEGACY: McpJsonSchema = {
	type: "boolean",
	description: "Also list the 8 codes a past revision of the table retired. Default false.",
};

const CERTIDAO_TYPES: McpJsonSchema = {
	type: "array",
	items: {
		type: "string",
		enum: [
			"birth",
			"marriage",
			"religious-marriage",
			"death",
			"stillbirth",
			"banns",
			"other",
			"emancipation",
			"interdiction",
		],
	},
	description: "Types of act accepted. All of them by default.",
};

const NO_INPUT: McpJsonSchema = { type: "object", properties: {}, additionalProperties: false };

const VALUE_INPUT: McpJsonSchema = {
	type: "object",
	properties: { value: VALUE },
	required: ["value"],
	additionalProperties: false,
};

const NUMBER_INPUT: McpJsonSchema = {
	type: "object",
	properties: { value: { type: "number", description: "The number to write out." } },
	required: ["value"],
	additionalProperties: false,
};

const PAD_INPUT: McpJsonSchema = {
	type: "object",
	properties: {
		value: VALUE,
		options: { type: "object", properties: { pad: PAD }, additionalProperties: false },
	},
	required: ["value"],
	additionalProperties: false,
};

const CNPJ_VERSION_INPUT: McpJsonSchema = {
	type: "object",
	properties: {
		value: VALUE,
		options: { type: "object", properties: { version: CNPJ_VERSION }, additionalProperties: false },
	},
	required: ["value"],
	additionalProperties: false,
};

const BUSINESS_DAY_OPTIONS: McpJsonSchema = {
	type: "object",
	properties: {
		stateCode: { ...STATE_CODE, description: "Also skip the holidays of this state (UF)." },
		includeOptional: {
			type: "boolean",
			description:
				"Whether optional holidays (pontos facultativos such as Carnaval and Corpus Christi) count as non-business days. Default true.",
		},
	},
	additionalProperties: false,
};

const BUSINESS_DAY_WALK_INPUT: McpJsonSchema = {
	type: "object",
	properties: {
		date: DATE,
		amount: { type: "integer", description: "How many business days to walk." },
		options: BUSINESS_DAY_OPTIONS,
	},
	required: ["date", "amount"],
	additionalProperties: false,
};

const STATE_CODE_INPUT: McpJsonSchema = {
	type: "object",
	properties: { stateCode: LOOSE_STATE_CODE },
	required: ["stateCode"],
	additionalProperties: false,
};

/** The tools the server lists, sorted by name: one per public function of the library. */
export const TOOLS: readonly McpTool[] = [
	{
		name: "addBusinessDays",
		description:
			"Add a number of Brazilian business days (dias úteis) to a date, skipping Saturdays, Sundays and Brazilian holidays; a negative amount walks backwards. Returns the resulting date, or null when the walk leaves the supported years (1900 to 2099).",
		parameters: ["date", "amount", "options"],
		inputSchema: BUSINESS_DAY_WALK_INPUT,
	},
	{
		name: "capitalize",
		description:
			"Capitalize each word the way a Brazilian name, company name or address is written: prepositions such as de, da and dos stay lower case and known acronyms stay upper case.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "string", description: "The text to capitalize." },
				options: {
					type: "object",
					properties: {
						lowerCaseWords: {
							type: "array",
							items: { type: "string" },
							description: "Words kept in lower case, replacing the default list.",
						},
						upperCaseWords: {
							type: "array",
							items: { type: "string" },
							description: "Words kept in upper case, replacing the default list.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "convertCurrencyToWords",
		description:
			'Write an amount in Brazilian Reais out in Portuguese words (por extenso), the style of cheques and contracts: 1523.45 becomes "mil quinhentos e vinte e três reais e quarenta e cinco centavos". The value is truncated to 2 decimal places. Returns "" for an unsupported value.',
		parameters: ["value"],
		inputSchema: NUMBER_INPUT,
	},
	{
		name: "convertDateToWords",
		description:
			'Write a date out in Brazilian Portuguese words (por extenso): "2024-01-01" becomes "primeiro de janeiro de dois mil e vinte e quatro". Returns "" for an invalid date.',
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "string", description: "The date, written as YYYY-MM-DD or DD/MM/YYYY." },
				options: {
					type: "object",
					properties: {
						style: {
							type: "string",
							enum: ["full", "month"],
							description:
								'"full" (default) writes day, month and year in words; "month" keeps the day and the year as digits and writes only the month in words.',
						},
						weekday: {
							type: "boolean",
							description: "Start with the day of the week. Default false.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "convertLicensePlateToMercosul",
		description:
			'Convert an old format Brazilian license plate (ABC1234) to the Mercosul format (ABC1C34) with the official table, where the 5th character, a digit, becomes a letter. Returns "" when the value is not a valid old format plate.',
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "convertNumberToWords",
		description:
			'Write an integer out in Brazilian Portuguese cardinal words (por extenso): 1235 becomes "mil duzentos e trinta e cinco". A non-integer is truncated. Returns "" outside -999999999999999 to 999999999999999.',
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "number", description: "The number to write out." },
				options: {
					type: "object",
					properties: {
						gender: {
							type: "string",
							enum: ["masculine", "feminine"],
							description:
								'Grammatical gender of the words ("um"/"dois" or "uma"/"duas"). Default masculine.',
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "differenceInBusinessDays",
		description:
			"Count the Brazilian business days (dias úteis) between two dates, with the semantics of date-fns: the walk starts at earlierDate and stops right before laterDate, and the count is negative when laterDate comes first. Returns null for a date outside the supported years (1900 to 2099).",
		parameters: ["laterDate", "earlierDate", "options"],
		inputSchema: {
			type: "object",
			properties: { laterDate: DATE, earlierDate: DATE, options: BUSINESS_DAY_OPTIONS },
			required: ["laterDate", "earlierDate"],
			additionalProperties: false,
		},
	},
	{
		name: "formatBoleto",
		description:
			"Format a boleto linha digitável, the 47 digit cobrança bancária or the 48 digit arrecadação one, with its printed mask. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCaepf",
		description:
			"Format a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number as 000.000.000/000-00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCei",
		description:
			"Format a CEI (Cadastro Específico do INSS) number as 00.000.00000/00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCep",
		description:
			"Format a CEP (Brazilian postal code) as 00000-000. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCertidao",
		description:
			"Format the 32 digit matrícula of a certidão de registro civil (birth, marriage, death) in the printed groups 6 2 2 4 1 5 3 7 2. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCnae",
		description:
			"Format a CNAE (Classificação Nacional de Atividades Econômicas) subclass code as 0000-0/00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCnh",
		description:
			"Format a CNH (driver's license) number as 000000000-00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCno",
		description:
			"Format a CNO (Cadastro Nacional de Obras) number as 00.000.00000/00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCnpj",
		description:
			"Format a CNPJ as 00.000.000/0000-00, optionally hiding the first 2 characters and the check digits. Formats as far as the characters go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						pad: PAD,
						version: CNPJ_VERSION,
						obfuscate: {
							type: "boolean",
							description:
								"Mask as **.345.678/0001-**, the gov.br display convention. Default false.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "formatCns",
		description:
			"Format a CNS (Cartão Nacional de Saúde, the SUS card) number in groups of 3 4 4 4 digits. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatCpf",
		description:
			"Format a CPF as 000.000.000-00, optionally hiding the first 3 digits and the check digits. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						pad: PAD,
						obfuscate: {
							type: "boolean",
							description: "Mask as ***.456.789-**, the gov.br display convention. Default false.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "formatCurrency",
		description:
			'Format a number in the BRL pattern: 1234.56 becomes "1.234,56", or "R$ 1.234,56" with the symbol.',
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "number", description: "The amount, in reais." },
				options: {
					type: "object",
					properties: {
						symbol: { type: "boolean", description: "Prefix the result with R$. Default false." },
						precision: { type: "integer", description: "Number of decimal places. Default 2." },
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "formatIban",
		description:
			"Format an IBAN in the ISO 13616 print grouping, blocks of 4 characters, up to the 29 characters of a Brazilian IBAN. Does not validate.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "formatLegalNature",
		description:
			"Format a legal nature (natureza jurídica) code as 000-0. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatLicensePlate",
		description:
			'Format a Brazilian license plate: an old format plate gets its hyphen (ABC-1234) and a Mercosul plate stays as ABC1D23. Returns "" for a value that cannot start a valid plate.',
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "formatNcm",
		description:
			"Format an NCM (Nomenclatura Comum do Mercosul) code as 0000.00.00. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatNfeKey",
		description:
			"Format a 44 digit DF-e access key (chave de acesso of an NF-e, NFC-e, CT-e, MDF-e and the like) in groups of 4 digits, the way the DANFE prints it. Does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatPassport",
		description:
			"Format a Brazilian passport number: upper case, without symbols, capped to 8 characters. Does not validate.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "formatPhone",
		description:
			"Format a Brazilian phone number with the chosen mask. Does not validate; use isValidPhone for that.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						mask: {
							type: "string",
							enum: ["auto", "e164", "international", "service", "sn", "nanp"],
							description:
								'"sn" (default) is the subscriber number without the DDD, "nanp" is (11) 98765-4321, "e164" is +5511987654321, "international" is +55 11 98765-4321, "service" is for numbers such as 0800, and "auto" picks the mask from the digits given.',
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "formatPis",
		description:
			"Format a PIS/PASEP/NIS number as 000.00000.00-0. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatProcessoJuridico",
		description:
			"Format a processo jurídico (lawsuit) number in the CNJ mask NNNNNNN-DD.AAAA.J.TR.OOOO. Formats as far as the digits go and does not validate.",
		parameters: ["value", "options"],
		inputSchema: PAD_INPUT,
	},
	{
		name: "formatVoterId",
		description:
			"Format a título de eleitor (voter ID) number as 0000 0000 00 00, or with the 13 digit grouping São Paulo and Minas Gerais may use. Does not validate.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "generateBoleto",
		description:
			"Generate a valid random boleto linha digitável, for tests and examples: a cobrança bancária one (47 digits) by default, or an arrecadação one (48 digits, starting with 8).",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					enum: ["bancario", "arrecadacao"],
					description: "Kind of boleto. Default bancario.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generateCep",
		description: "Generate a random CEP (Brazilian postal code), 8 digits, for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generateCnh",
		description: "Generate a valid random CNH (driver's license) number, for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generateCnpj",
		description:
			"Generate a valid random CNPJ, 14 characters without mask, for tests and examples. It is synthetic and belongs to no company.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				version: {
					type: "integer",
					enum: [1, 2],
					description: "1 (default) generates a numeric CNPJ, 2 an alphanumeric one.",
				},
				branch: {
					type: "integer",
					description:
						"The número de ordem (filial) block in positions 9 to 12, from 1 to 9999. Random by default.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generateCpf",
		description:
			"Generate a valid random CPF, 11 digits without mask, for tests and examples. It is synthetic and belongs to no one.",
		parameters: ["stateCode"],
		inputSchema: {
			type: "object",
			properties: {
				stateCode: {
					...STATE_CODE,
					description:
						"Ties the CPF to the região fiscal of this state (the 9th digit). Random by default.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generateLegalNature",
		description:
			"Generate a random legal nature (natureza jurídica) code out of the 92 codes in force, for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generateLicensePlate",
		description: "Generate a random Brazilian license plate, for tests and examples.",
		parameters: ["format"],
		inputSchema: {
			type: "object",
			properties: {
				format: {
					type: "string",
					enum: ["LLLNNNN", "LLLNLNN"],
					description:
						"LLLNNNN is the old format (ABC1234) and LLLNLNN the Mercosul format (ABC1D23). Random by default.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generatePassport",
		description:
			"Generate a random Brazilian passport number (2 letters and 6 digits), for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generatePhone",
		description:
			"Generate a random Brazilian phone number, digits only, for tests and examples. A mobile or a landline number by default; a service number has no DDD.",
		parameters: ["type"],
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					enum: ["mobile", "landline", "service"],
					description: "Kind of number. Mobile or landline, at random, by default.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generatePis",
		description: "Generate a valid random PIS/PASEP/NIS number, for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generatePixPayload",
		description:
			'Generate the payload of a Pix BR Code, the text behind a Pix QR Code and "Pix copia e cola". Give exactly one of key (static payload) or url (dynamic payload); returns null when both or neither are given, or when a field is invalid.',
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				key: {
					type: "string",
					description:
						"The Pix key: a CPF, a CNPJ, an e-mail, a mobile phone or a random key (EVP).",
				},
				url: {
					type: "string",
					description:
						"The PSP location of a dynamic payload, without the scheme, such as pix.example.com/qr/v2/1234. At most 77 characters.",
				},
				merchantName: { type: "string", description: "Name of the receiver." },
				merchantCity: { type: "string", description: "City of the receiver." },
				amount: { type: "number", description: "Amount in reais. Static payload only." },
				txid: { type: "string", description: "Transaction identifier. Static payload only." },
				description: { type: "string", description: "Free text shown to the payer." },
			},
			required: ["merchantName", "merchantCity"],
			additionalProperties: false,
		},
	},
	{
		name: "generateProcessoJuridico",
		description:
			"Generate a valid random processo jurídico (lawsuit) number in the CNJ layout, 20 digits, for tests and examples. Returns null for a year or a court out of range.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				year: {
					type: "integer",
					description:
						"Year of filing, from the current year to 9999. The current year by default.",
				},
				court: {
					type: "integer",
					description: "The órgão do Judiciário digit (J), from 1 to 9. Random by default.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "generateRenavam",
		description: "Generate a valid random RENAVAM, 11 digits, for tests and examples.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "generateVoterId",
		description:
			"Generate a valid random título de eleitor (voter ID) number, 12 digits, for tests and examples.",
		parameters: ["stateCode"],
		inputSchema: {
			type: "object",
			properties: {
				stateCode: {
					type: "string",
					enum: [...STATE_CODES, "ZZ"],
					description: "State (UF) that issued the ID, or ZZ for one issued abroad. Default ZZ.",
				},
			},
			additionalProperties: false,
		},
	},
	{
		name: "getAddressInfoByCep",
		description:
			"Look the address of a CEP up on public web APIs (ViaCEP and BrasilAPI by default, first answer wins). Returns cep, state, city, neighborhood and street; an invalid or unknown CEP and an unreachable service are reported as errors.",
		parameters: ["value", "options"],
		network: true,
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "string", description: "The CEP, 8 digits, with or without the hyphen." },
				options: {
					type: "object",
					properties: {
						providers: {
							type: "array",
							items: { type: "string", enum: ["viacep", "widenet", "brasilapi"] },
							description:
								"Providers to query. Default viacep and brasilapi; widenet no longer answers.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "getAreaCodeInfo",
		description:
			"Get the state and the region a Brazilian DDD (area code) belongs to. Returns null for a DDD that is not in use.",
		parameters: ["value"],
		inputSchema: {
			type: "object",
			properties: { value: { type: "string", description: "The DDD, 2 digits, such as 11." } },
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "getAreaCodesByState",
		description:
			"Get every DDD (area code) that serves a Brazilian state, in ascending order. Returns an empty list for an unknown state.",
		parameters: ["stateCode"],
		inputSchema: STATE_CODE_INPUT,
	},
	{
		name: "getBankByCode",
		description:
			"Look a Brazilian bank up by its 3 digit compensation code (COMPE) in the Banco Central STR participants list. Returns code, ispb and name, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getBankByIspb",
		description:
			"Look a Brazilian bank up by its 8 digit ISPB in the Banco Central STR participants list. Returns code, ispb and name, or null; only institutions that also have a COMPE code are listed.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getBanks",
		description:
			"List every Brazilian bank that has a compensation code (COMPE), from the Banco Central STR participants list, each with code, ispb and name. The list has a few hundred entries; prefer getBankByCode or getBankByIspb for a single bank.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "getBoletoInfo",
		description:
			"Read the fields of a boleto: amount in cents, expiration date and bank code, plus segment and value kind for an arrecadação one. Returns null when the boleto is not valid.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						referenceDate: {
							...DATE,
							description:
								"The date the boleto is read on, as YYYY-MM-DD, which settles the expiration date now that the fator de vencimento restarted in 2025. Today by default.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "getCbo",
		description:
			"Look a CBO (Classificação Brasileira de Ocupações) code up and get the official occupation title. Returns code and description, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getCepInfoByAddress",
		description:
			"Search the CEPs of an address on the ViaCEP public web API. Returns a list of ViaCEP records (cep, logradouro, bairro, localidade, uf and more); an invalid query, no match and an unreachable service are reported as errors.",
		parameters: "object",
		network: true,
		inputSchema: {
			type: "object",
			properties: {
				federalUnit: LOOSE_STATE_CODE,
				city: { type: "string", description: "City name; ViaCEP needs at least 3 characters." },
				street: { type: "string", description: "Street name; ViaCEP needs at least 3 characters." },
			},
			required: ["federalUnit", "city", "street"],
			additionalProperties: false,
		},
	},
	{
		name: "getCertidaoInfo",
		description:
			"Read the fields of the 32 digit matrícula of a certidão de registro civil: registry CNS, acervo, service, year, type of act (birth, marriage, death and others), book, page, term and check digits. Returns null when the matrícula is not valid.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getCfop",
		description:
			"Look a CFOP (Código Fiscal de Operações e Prestações) code up and get its official description. Returns code and description, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getCnae",
		description:
			"Look a CNAE subclass code up in the IBGE CNAE-Subclasses 2.3 table and get its official description. Returns code and description, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getFormatLicensePlate",
		description:
			"Detect the format of a Brazilian license plate: LLLNNNN (old format) or LLLNLNN (Mercosul). Returns null when the plate is not valid.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getHolidays",
		description:
			"List the Brazilian holidays of a year, from 1900 to 2099: the national ones, the movable ones (Carnaval, Sexta-feira Santa, Corpus Christi) and, with stateCode, the holidays of that state. Each entry has name, date and type (national, state, optional or religious). Municipal holidays are not covered.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				year: { type: "integer", description: "The year, from 1900 to 2099." },
				stateCode: { ...STATE_CODE, description: "Also list the holidays of this state (UF)." },
			},
			required: ["year"],
			additionalProperties: false,
		},
	},
	{
		name: "getIbanInfo",
		description:
			"Read the fields of a Brazilian IBAN: country code, check digits, bank ISPB, branch, account, account type and owner indicator. Returns null when the IBAN is not a valid Brazilian one.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getLegalNature",
		description:
			"Look a legal nature (natureza jurídica) code up in the IBGE/CONCLA table. Returns code, description, category and whether the code is a retired (legacy) one, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getLegalNatures",
		description:
			"Get the legal nature (natureza jurídica) table of IBGE/CONCLA as a map of code to description: the 92 codes in force.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: { includeLegacy: INCLUDE_LEGACY },
			additionalProperties: false,
		},
	},
	{
		name: "getLegalNaturesByCategory",
		description:
			"List the legal natures of a CONCLA category: 1 Administração Pública, 2 Entidades Empresariais, 3 Entidades sem Fins Lucrativos, 4 Pessoas Físicas, 5 Organizações Internacionais. Returns an empty list for an unknown category.",
		parameters: ["category", "options"],
		inputSchema: {
			type: "object",
			properties: {
				category: {
					type: "string",
					enum: ["1", "2", "3", "4", "5"],
					description: "The category, the first digit of the code.",
				},
				options: {
					type: "object",
					properties: { includeLegacy: INCLUDE_LEGACY },
					additionalProperties: false,
				},
			},
			required: ["category"],
			additionalProperties: false,
		},
	},
	{
		name: "getMunicipalities",
		description:
			"List the municipalities of a Brazilian state published by the IBGE, sorted by name, each with its 7 digit IBGE code, name and stateCode. The state is required here, since the whole country has 5571 entries.",
		parameters: ["stateCode"],
		inputSchema: {
			type: "object",
			properties: { stateCode: STATE_CODE },
			required: ["stateCode"],
			additionalProperties: false,
		},
	},
	{
		name: "getMunicipalityByCode",
		description:
			"Look a Brazilian municipality up by its 7 digit IBGE code. Returns code, name and stateCode, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getNfeKeyInfo",
		description:
			"Read the fields of a 44 digit DF-e access key (NF-e, NFC-e, CT-e, MDF-e and the like): state, year, month, issuer CNPJ or CPF, model, series, number, emission type, code and check digit. Returns null when the key is not valid.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getPixKeyInfo",
		description:
			"Identify a Pix key (cpf, cnpj, email, phone or evp) and normalize it to the form the DICT expects. Returns type and value, or null when it is not a valid key. It does not tell whether the key is registered.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getPixPayloadInfo",
		description:
			'Read the fields of a Pix BR Code payload ("Pix copia e cola"): key or url, merchant name and city, amount, txid, description and whether it is static or dynamic. Returns null when the payload is malformed or its CRC is wrong.',
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getStateByIbgeCode",
		description:
			"Get the Brazilian state of a 2 digit IBGE code (cUF), the code that opens every NF-e access key and every IBGE municipality code. Returns code, name, region and ibgeCode, or null.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "getStateCodeByName",
		description:
			'Get the two-letter code (UF) of a Brazilian state from its name, ignoring accents and letter case: "sao paulo" gives "SP". Returns null for an unknown name.',
		parameters: ["name"],
		inputSchema: {
			type: "object",
			properties: { name: { type: "string", description: "The state name." } },
			required: ["name"],
			additionalProperties: false,
		},
	},
	{
		name: "getStateNameByCode",
		description:
			'Get the name of a Brazilian state from its two-letter code (UF): "SP" gives "São Paulo". Returns null for an unknown code.',
		parameters: ["stateCode"],
		inputSchema: STATE_CODE_INPUT,
	},
	{
		name: "getStates",
		description:
			"List the 27 Brazilian states (the Distrito Federal included), sorted by name, each with its code, name, region code, region name and 2 digit IBGE code.",
		parameters: [],
		inputSchema: NO_INPUT,
	},
	{
		name: "getTimezoneByState",
		description:
			"Get the IANA time zone of a Brazilian state, the zone of its capital, such as America/Sao_Paulo. Returns null for an unknown state.",
		parameters: ["stateCode"],
		inputSchema: STATE_CODE_INPUT,
	},
	{
		name: "isBusinessDay",
		description:
			"Check whether a date is a Brazilian business day (dia útil): not a Saturday, a Sunday or a Brazilian holiday. Municipal holidays are not covered.",
		parameters: ["date", "options"],
		inputSchema: {
			type: "object",
			properties: { date: DATE, options: BUSINESS_DAY_OPTIONS },
			required: ["date"],
			additionalProperties: false,
		},
	},
	{
		name: "isHoliday",
		description:
			"Check whether a date is a Brazilian holiday: national, or of a state when stateCode is given. Municipal holidays are not covered.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				targetDate: DATE,
				stateCode: { ...STATE_CODE, description: "Also consider the holidays of this state (UF)." },
			},
			required: ["targetDate"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidBankAccount",
		description:
			"Check a Brazilian bank account: the bank must exist in the Banco Central list, and the agency, the account and the check digit must fit the bank. The check digit algorithm is verified for the banks that publish one (Banco do Brasil, Bradesco, Itaú, Santander and others); for the others only the structure is checked.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				bankCode: {
					type: "string",
					description: "The 3 digit compensation code (COMPE) of the bank.",
				},
				agency: { type: "string", description: "The agency number, without its check digit." },
				account: { type: "string", description: "The account number, without its check digit." },
				digit: { type: "string", description: "The check digit of the account." },
			},
			required: ["bankCode", "agency", "account", "digit"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidBoleto",
		description:
			"Check whether a boleto is valid, check digits included: the 47 digit cobrança bancária linha digitável, or the arrecadação one as its 48 digit linha digitável or its 44 digit barcode.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCaepf",
		description:
			"Check whether a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number, 14 digits, is valid, check digits included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCbo",
		description:
			"Check whether a CBO (Classificação Brasileira de Ocupações) code exists in the official occupation table.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCei",
		description:
			"Check whether a CEI (Cadastro Específico do INSS) number, 12 digits, is valid, check digit included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCep",
		description:
			"Check whether a CEP (Brazilian postal code) is well formed: 8 digits, with or without the hyphen. It does not tell whether the CEP exists; use getAddressInfoByCep for that.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCertidao",
		description:
			"Check whether the 32 digit matrícula of a certidão de registro civil (birth, marriage, death and other acts) is valid, check digits included.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: { accept: CERTIDAO_TYPES },
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidCfop",
		description:
			"Check whether a CFOP (Código Fiscal de Operações e Prestações) code exists in the official table in force.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCnae",
		description:
			"Check whether a CNAE subclass code exists in the IBGE CNAE-Subclasses 2.3 table, with or without the 0000-0/00 mask.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCnh",
		description:
			"Check whether a CNH (driver's license) number, 11 digits, is valid, check digits included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCno",
		description:
			"Check whether a CNO (Cadastro Nacional de Obras) number, 12 digits, is valid, check digit included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCnpj",
		description:
			"Check whether a CNPJ is valid, check digits included, with or without its mask. It does not tell whether the CNPJ is registered at the Receita Federal.",
		parameters: ["value", "options"],
		inputSchema: CNPJ_VERSION_INPUT,
	},
	{
		name: "isValidCns",
		description:
			"Check whether a CNS (Cartão Nacional de Saúde, the SUS card) number, 15 digits, is valid, definitive and provisional cards alike.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCpf",
		description:
			"Check whether a CPF is valid, check digits included, with or without its mask. It does not tell whether the CPF is registered at the Receita Federal.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCreditCard",
		description:
			"Check a payment card number with the Luhn algorithm (ISO/IEC 7812-1). No brand detection and no issuer lookup.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCsosn",
		description:
			"Check whether a CSOSN (Código de Situação da Operação no Simples Nacional) code is one of the 10 official codes.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidCst",
		description:
			"Check whether a CST (Código de Situação Tributária) code is valid for a tax: 3 digits (origin plus CST) for ICMS, 2 digits for IPI, PIS and COFINS.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						tax: {
							type: "string",
							enum: ["icms", "ipi", "pis", "cofins"],
							description:
								"The tax whose table is read. By default a code of any of the four tables is accepted.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidEmail",
		description:
			"Check whether an e-mail address is well formed, by a practical subset of the WHATWG HTML definition. It does not tell whether the mailbox exists.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidIban",
		description:
			"Check whether a Brazilian IBAN (BR, 29 characters) is valid, ISO 7064 MOD 97-10 check digits included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidIe",
		description:
			"Check whether an inscrição estadual (state tax registration) is valid under the rules of its state, check digits included.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: { value: VALUE, stateCode: LOOSE_STATE_CODE },
			required: ["value", "stateCode"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidLandlinePhone",
		description: "Check whether a Brazilian landline phone number, DDD included, is valid.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidLegalNature",
		description:
			"Check whether a legal nature (natureza jurídica) code exists in the IBGE/CONCLA table, retired codes included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidLicensePlate",
		description:
			"Check whether a Brazilian license plate is valid, in the old format (ABC-1234) or in the Mercosul format (ABC1D23).",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidMobilePhone",
		description: "Check whether a Brazilian mobile phone number, DDD included, is valid.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: { version: PHONE_VERSION },
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidNcm",
		description:
			"Check whether an NCM (Nomenclatura Comum do Mercosul) code, 8 digits, exists in the table published by Siscomex.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidNfeKey",
		description:
			"Check whether a 44 digit DF-e access key (chave de acesso of an NF-e, NFC-e, CT-e, MDF-e, CT-e OS, GTV-e, BP-e, NF3e or NFCom) is valid, check digit included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidPassport",
		description:
			"Check whether a Brazilian passport number is well formed: 2 letters followed by 6 digits.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidPhone",
		description:
			"Check whether a Brazilian phone number, DDD included, is valid. A +55 country code is accepted. Mobile and landline numbers are accepted by default.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						version: PHONE_VERSION,
						accept: {
							type: "array",
							items: { type: "string", enum: ["mobile", "landline", "service"] },
							description: "Kinds of number accepted. Default mobile and landline.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidPis",
		description: "Check whether a PIS/PASEP/NIS number, 11 digits, is valid, check digit included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidPixKey",
		description:
			"Check whether a Pix key is well formed: a CPF, a CNPJ, an e-mail, a mobile phone or a random key (EVP). It does not tell whether the key is registered in the DICT.",
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: VALUE,
				options: {
					type: "object",
					properties: {
						accept: {
							type: "array",
							items: { type: "string", enum: ["cpf", "cnpj", "email", "phone", "evp"] },
							description: "Kinds of key accepted. All of them by default.",
						},
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidPixPayload",
		description:
			'Check whether a Pix BR Code payload ("Pix copia e cola") is valid: TLV structure, mandatory fields, the Pix account template and the CRC-16.',
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidProcessoJuridico",
		description:
			"Check whether a processo jurídico (lawsuit) number is valid under the CNJ layout NNNNNNN-DD.AAAA.J.TR.OOOO: check digits and an existing órgão and tribunal.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidRegistroProfissional",
		description:
			"Check the structure of a professional council registration number (OAB, CRM, CRO, CRP or CRC). It does not tell whether the registration exists.",
		parameters: "object",
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "string", description: "The registration number, such as 123456/SP." },
				council: {
					type: "string",
					enum: ["OAB", "CRM", "CRO", "CRP", "CRC"],
					description: "The council that issued the registration.",
				},
				stateCode: {
					...STATE_CODE,
					description: "The state (UF) the registration must belong to.",
				},
			},
			required: ["value", "council"],
			additionalProperties: false,
		},
	},
	{
		name: "isValidRenavam",
		description: "Check whether a RENAVAM, 9 or 11 digits, is valid, check digit included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidServicePhone",
		description:
			"Check whether a number is a Brazilian service number, dialed without a DDD: 0300, 0500, 0800 and 0900 numbers, 300X and 400X numbers and the 3 digit public utility codes such as 190.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidVin",
		description:
			"Check whether a VIN (chassi), 17 characters, is valid: no I, O or Q, and the 9th position check digit of 49 CFR 565.15. That check digit is a North American rule that the Brazilian norms do not mandate, so a genuine Brazilian VIN may fail it.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "isValidVoterId",
		description:
			"Check whether a título de eleitor (voter ID) number, 12 digits or 13 for São Paulo and Minas Gerais, is valid, check digits included.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseBoleto",
		description:
			"Remove the mask of a boleto and keep its digits, at most 47 (48 for an arrecadação one).",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCaepf",
		description: "Remove the mask of a CAEPF number and keep its digits, at most 14.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCbo",
		description: "Remove the mask of a CBO code and keep its digits, at most 6.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCei",
		description: "Remove the mask of a CEI number and keep its digits, at most 12.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCep",
		description: "Remove the mask of a CEP and keep its digits, at most 8.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCertidao",
		description:
			"Remove the mask of the matrícula of a certidão de registro civil and keep its digits, at most 32.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCfop",
		description: "Remove the mask of a CFOP code and keep its digits, at most 4.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCnae",
		description: "Remove the mask of a CNAE subclass code and keep its digits, at most 7.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCnh",
		description: "Remove the mask of a CNH number and keep its digits, at most 11.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCno",
		description: "Remove the mask of a CNO number and keep its digits, at most 12.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCnpj",
		description:
			"Remove the mask of a CNPJ and keep its characters, at most 14: digits only, or letters and digits with version 2.",
		parameters: ["value", "options"],
		inputSchema: CNPJ_VERSION_INPUT,
	},
	{
		name: "parseCns",
		description: "Remove the mask of a CNS number and keep its digits, at most 15.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCpf",
		description: "Remove the mask of a CPF and keep its digits, at most 11.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseCurrency",
		description:
			'Read an amount written in the BRL pattern as a number: "R$ 1.234,56" gives 1234.56. A value written without any separator is read as cents: "12345" gives 123.45.',
		parameters: ["value", "options"],
		inputSchema: {
			type: "object",
			properties: {
				value: { type: "string", description: "The amount as written." },
				options: {
					type: "object",
					properties: {
						precision: { type: "integer", description: "Number of decimal places. Default 2." },
					},
					additionalProperties: false,
				},
			},
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "parseIban",
		description:
			"Remove the mask of an IBAN and keep its letters and digits in upper case, at most 29.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseLegalNature",
		description: "Remove the mask of a legal nature code and keep its digits, at most 4.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseLicensePlate",
		description:
			"Remove the separators of a license plate and upper case it, at most 7 characters.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseNcm",
		description: "Remove the mask of an NCM code and keep its digits, at most 8.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseNfeKey",
		description:
			"Remove the mask of a DF-e access key, and the NFe, CTe, MDFe, BPe, NF3e or NFCom prefix of the XML Id, and keep its digits, at most 44.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parsePassport",
		description:
			"Remove every symbol of a passport number and upper case it, at most 8 characters.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parsePhone",
		description:
			"Remove the mask of a Brazilian phone number and keep its digits, at most 11. A 55 country code is dropped when a 10 or 11 digit national number is left.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parsePis",
		description: "Remove the mask of a PIS/PASEP/NIS number and keep its digits, at most 11.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseProcessoJuridico",
		description: "Remove the mask of a processo jurídico number and keep its digits, at most 20.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "parseVoterId",
		description:
			"Remove the mask of a título de eleitor number and keep its digits, at most 12 (13 for São Paulo and Minas Gerais).",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "removeAccents",
		description:
			'Remove the accents, tildes and cedillas of a text: "São João" becomes "Sao Joao".',
		parameters: ["value"],
		inputSchema: {
			type: "object",
			properties: { value: { type: "string", description: "The text." } },
			required: ["value"],
			additionalProperties: false,
		},
	},
	{
		name: "subBusinessDays",
		description:
			"Subtract a number of Brazilian business days (dias úteis) from a date, skipping Saturdays, Sundays and Brazilian holidays. Returns the resulting date, or null when the walk leaves the supported years (1900 to 2099).",
		parameters: ["date", "amount", "options"],
		inputSchema: BUSINESS_DAY_WALK_INPUT,
	},
];
