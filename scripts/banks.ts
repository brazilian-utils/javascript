#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";

const scriptsDir = import.meta.dirname;

const BACEN_CSV_URL =
	"https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv";

const BRASIL_API_URL = "https://brasilapi.com.br/api/banks/v1";

/** How many legacy codes the generated file's header comment lists per line. */
const CODES_PER_COMMENT_LINE = 15;

type BankRow = {
	code: string;
	ispb: string;
	name: string;
};

/**
 * The COMPE codes the Bacen STR participants list no longer publishes, with the ISPB and the name
 * it last published for each one. They keep appearing in documents filled in while the institution
 * still had its own code (a TED slip, a boleto, a payroll file), so the generated table keeps them
 * marked `legacy: true`: `getBankByCode` and `getBankByIspb` still find them, `getBanks` lists them
 * only on request and `isValidBankAccount` still accepts an account of theirs.
 *
 * Hand curated. Every code below was last seen in the list on 12 September 2026, in the dataset of
 * commit e5b8f9b; the refresh of that same day, commit e0f4e2d, is the first one without them. A
 * code the Bacen list publishes again has to be removed from here by hand, and `main` throws until
 * it is, so that a current code is never published as legacy.
 */
const LEGACY_BANKS: BankRow[] = [
	{ code: "029", ispb: "33885724", name: "Banco Itaú Consignado S.A." },
	{ code: "062", ispb: "03012230", name: "Hipercard Banco Múltiplo S.A." },
	{ code: "098", ispb: "78157146", name: "Credialiança Cooperativa de Crédito Rural" },
	{
		code: "114",
		ispb: "05790149",
		name: "Central Cooperativa de Crédito no Estado do Espírito Santo - CECOOP",
	},
	{ code: "117", ispb: "92856905", name: "ADVANCED CORRETORA DE CÂMBIO LTDA" },
	{ code: "177", ispb: "65913436", name: "Guide Investimentos S.A. Corretora de Valores" },
	{ code: "184", ispb: "17298092", name: "Banco Itaú BBA S.A." },
	{ code: "253", ispb: "52937216", name: "Bexs Corretora de Câmbio S/A" },
	{ code: "270", ispb: "61444949", name: "SAGITUR CORRETORA DE CÂMBIO S.A." },
	{
		code: "279",
		ispb: "26563270",
		name: "PRIMACREDI COOPERATIVA DE CRÉDITO DE PRIMAVERA DO LESTE",
	},
	{ code: "285", ispb: "71677850", name: "FRENTE CORRETORA DE CÂMBIO S.A." },
	{
		code: "306",
		ispb: "40303299",
		name: "PORTOPAR DISTRIBUIDORA DE TITULOS E VALORES MOBILIARIOS LTDA.",
	},
	{ code: "309", ispb: "14190547", name: "CAMBIONET CORRETORA DE CÂMBIO LTDA." },
	{ code: "311", ispb: "76641497", name: "DOURADA CORRETORA DE CÂMBIO LTDA." },
	{ code: "313", ispb: "16927221", name: "AMAZÔNIA CORRETORA DE CÂMBIO LTDA." },
	{
		code: "325",
		ispb: "13293225",
		name: "Órama Distribuidora de Títulos e Valores Mobiliários S.A.",
	},
	{
		code: "328",
		ispb: "05841967",
		name: "COOPERATIVA DE ECONOMIA E CRÉDITO MÚTUO DOS FABRICANTES DE CALÇADOS DE SAPIRANGA",
	},
	{ code: "340", ispb: "09554480", name: "SUPERDIGITAL INSTITUIÇÃO DE PAGAMENTO S.A." },
	{
		code: "343",
		ispb: "24537861",
		name: "FFA SOCIEDADE DE CRÉDITO AO MICROEMPREENDEDOR E À EMPRESA DE PEQUENO PORTE LTDA.",
	},
	{
		code: "367",
		ispb: "34711571",
		name: "VITREO DISTRIBUIDORA DE TÍTULOS E VALORES MOBILIÁRIOS S.A.",
	},
	{ code: "371", ispb: "92875780", name: "WARREN CORRETORA DE VALORES MOBILIÁRIOS E CÂMBIO LTDA." },
	{ code: "429", ispb: "05676026", name: "Crediare S.A. - Crédito, financiamento e investimento" },
	{
		code: "442",
		ispb: "87963450",
		name: "MAGNETIS - DISTRIBUIDORA DE TÍTULOS E VALORES MOBILIÁRIOS LTDA",
	},
	{
		code: "459",
		ispb: "04546162",
		name: "COOPERATIVA DE CRÉDITO MÚTUO DE SERVIDORES PÚBLICOS DO ESTADO DE SÃO PAULO - CRE",
	},
	{
		code: "471",
		ispb: "04831810",
		name: "COOPERATIVA DE ECONOMIA E CREDITO MUTUO DOS SERVIDORES PUBLICOS DE PINHÃO - CRES",
	},
	{ code: "545", ispb: "17352220", name: "SENSO CORRETORA DE CAMBIO E VALORES MOBILIARIOS S.A" },
	{ code: "720", ispb: "80271455", name: "BANCO RNX S.A." },
	{ code: "739", ispb: "00558456", name: "Banco Cetelem S.A." },
	{ code: "746", ispb: "30723886", name: "Banco Modal S.A." },
];

type BrasilApiBank = {
	ispb?: string;
	code?: number;
	name?: string;
	fullName?: string;
};

const isBrasilApiBank = (value: unknown): value is BrasilApiBank =>
	typeof value === "object" &&
	value !== null &&
	(!("ispb" in value) || typeof value.ispb === "string") &&
	(!("code" in value) || typeof value.code === "number") &&
	(!("name" in value) || typeof value.name === "string") &&
	(!("fullName" in value) || typeof value.fullName === "string");

const parseCsvLine = (line: string): string[] => {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (inQuotes) {
			if (char === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				current += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			fields.push(current);
			current = "";
		} else {
			current += char;
		}
	}

	fields.push(current);

	return fields;
};

const fetchFromBacen = async (): Promise<BankRow[]> => {
	const response = await fetchWithRetry(BACEN_CSV_URL);

	if (!response.ok) {
		throw new Error(`Bacen STR participants request failed with status ${response.status}`);
	}

	const body = await response.text();
	const text = body.replace(/^\uFEFF/, "");
	const [, ...rows] = text.split(/\r\n|\n/).filter((line) => line.length > 0);

	const banks: BankRow[] = [];

	for (const row of rows) {
		const fields = parseCsvLine(row);
		const [ispb] = fields;
		const code = fields[2];
		const name = fields[5];

		if (
			ispb === undefined ||
			ispb === "" ||
			code === undefined ||
			code === "" ||
			name === undefined ||
			name === "" ||
			!/^\d{1,3}$/.test(code) ||
			Number(code) === 0
		) {
			continue;
		}

		banks.push({ code: code.padStart(3, "0"), ispb, name: name.trim() });
	}

	return banks;
};

const fetchFromBrasilApi = async (): Promise<BankRow[]> => {
	const response = await fetchWithRetry(BRASIL_API_URL);

	if (!response.ok) {
		throw new Error(`BrasilAPI banks request failed with status ${response.status}`);
	}

	const json: unknown = await response.json();

	if (!Array.isArray(json)) {
		throw new TypeError("BrasilAPI banks payload is not an array");
	}

	const banks: BankRow[] = [];

	for (const entry of json) {
		if (!isBrasilApiBank(entry) || typeof entry.code !== "number") continue;
		if (!Number.isInteger(entry.code) || entry.code <= 0 || entry.code > 999) continue;

		const ispb = entry.ispb;

		if (ispb === undefined || ispb === "") continue;

		const name = (entry.fullName ?? entry.name ?? "").trim();

		if (name === "") continue;

		banks.push({ code: String(entry.code).padStart(3, "0"), ispb, name });
	}

	return banks;
};

const main = async (): Promise<void> => {
	let banks: BankRow[];
	let source: string;

	try {
		banks = await fetchFromBacen();
		source = BACEN_CSV_URL;
	} catch (error) {
		console.error(
			`Bacen STR participants request failed, falling back to BrasilAPI: ${error instanceof Error ? error.message : String(error)}`,
		);
		banks = await fetchFromBrasilApi();
		source = BRASIL_API_URL;
	}

	const uniqueBanks = new Map<string, BankRow>();

	for (const bank of banks) {
		uniqueBanks.set(bank.code, bank);
	}

	const sorted = [...uniqueBanks.values()].sort((bankA, bankB) =>
		bankA.code > bankB.code ? 1 : -1,
	);

	if (sorted.length === 0) {
		throw new Error("Refusing to write an empty bank dataset");
	}

	const reappeared = LEGACY_BANKS.filter((bank) => uniqueBanks.has(bank.code));

	// Only the official list is taken as proof that a code is back: BrasilAPI keeps publishing
	// institutions Bacen has already dropped, and on that fallback the live row simply wins.
	if (reappeared.length > 0 && source === BACEN_CSV_URL) {
		throw new Error(
			`The Bacen STR participants list publishes ${reappeared.map((bank) => bank.code).join(", ")} again: remove the code from LEGACY_BANKS in scripts/banks.ts so it ships as a current one`,
		);
	}

	const legacyRows = LEGACY_BANKS.filter((bank) => !uniqueBanks.has(bank.code));

	const rows = [...sorted, ...legacyRows].sort((bankA, bankB) =>
		bankA.code > bankB.code ? 1 : -1,
	);

	const legacyCodes = legacyRows.map((bank) => bank.code);

	const legacyLines: string[] = [];

	for (let index = 0; index < legacyCodes.length; index += CODES_PER_COMMENT_LINE) {
		legacyLines.push(legacyCodes.slice(index, index + CODES_PER_COMMENT_LINE).join(", "));
	}

	const legacyList = legacyLines.join(",\n * ");

	const banksPath = resolve(scriptsDir, "..", "./src/_internals/constants/banks.ts");
	const banksFile = `/**
 * Brazilian STR (Sistema de Transferência de Reservas) participants that have a compensation
 * code (commonly known as COMPE), published by Banco Central do Brasil. Generated by
 * \`scripts/banks.ts\`.
 *
 * ${sorted.length} of the ${rows.length} entries are the participants the list publishes today. The other
 * ${legacyCodes.length}, the ones \`LEGACY_BANK_CODES\` lists, are codes it no longer publishes, kept because they
 * still appear in documents filled in while the institution had them:
 * ${legacyList}.
 *
 * @see Official: ${BACEN_CSV_URL}
 */
export type Bank = {
	/** Compensation code (COMPE), 3 digits, zero-padded. */
	code: string;
	/** Identificador do Sistema de Pagamentos Brasileiro (ISPB), 8 digits, zero-padded. */
	ispb: string;
	/** Institution name, as published by Banco Central do Brasil. */
	name: string;
	/**
	 * Whether the Bacen STR participants list has stopped publishing the code. \`false\` for the
	 * participants of the current list, \`true\` for a code that left it. The table below does not
	 * carry the flag on every row: \`buildBank\` derives it from \`LEGACY_BANK_CODES\`.
	 */
	legacy: boolean;
};

export const BANKS: readonly Omit<Bank, "legacy">[] = ${JSON.stringify(rows)};

/**
 * The COMPE codes of \`BANKS\` the Bacen STR participants list no longer publishes, sorted
 * ascending. \`buildBank\` turns them into \`legacy: true\`.
 *
 * They stay in the table because they keep appearing in documents filled in while the institution
 * had its code, so \`getBankByCode\` and \`getBankByIspb\` still find them and \`isValidBankAccount\`
 * still accepts an account of theirs; \`getBanks\` lists them only on request.
 */
export const LEGACY_BANK_CODES: readonly string[] = ${JSON.stringify(legacyCodes)};`;

	const compeCodes = rows.map((bank) => bank.code).join("");
	const constantsPath = resolve(scriptsDir, "..", "./src/is-valid-bank-account/constants.ts");
	const constants = await readFile(constantsPath, "utf8");
	const literal = (compeCodes.match(/.{1,90}/g) ?? []).map((chunk) => `\t"${chunk}"`).join(" +\n");
	const compeCodesPattern = /export const COMPE_CODES =\n(?:\t"\d*" \+\n)*\t"\d*";/;

	if (!compeCodesPattern.test(constants)) {
		throw new Error("COMPE_CODES literal not found in src/is-valid-bank-account/constants.ts");
	}

	const updated = constants.replace(compeCodesPattern, `export const COMPE_CODES =\n${literal};`);

	console.log(
		`Generated ${sorted.length} banks from ${source}, plus ${legacyCodes.length} legacy codes`,
	);

	await writeFile(banksPath, banksFile);
	await writeFile(constantsPath, updated);
	console.log(`Updated COMPE_CODES with ${rows.length} codes`);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
