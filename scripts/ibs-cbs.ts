#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";

const scriptsDir = import.meta.dirname;

const PORTAL = "https://www.nfe.fazenda.gov.br/portal/";

/** "Documentos" > "Diversos" of the Portal Nacional da NF-e, where every table version is listed. */
const TABLES_LISTING = `${PORTAL}listaConteudo.aspx?tipoConteudo=/NJarYc9nus=`;

/** "Documentos" > "Informes Técnicos", where every version of the Informe Técnico 2025.002 is listed. */
const INFORMES_LISTING = `${PORTAL}listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=`;

/**
 * The portal answers a request without this cookie with a redirect that only sets it, and a
 * request that then arrives without an ASP.NET session with a redirect to the home page.
 * Sending the cookie up front gets the page in one request.
 */
const PORTAL_HEADERS = { Cookie: "AspxAutoDetectCookieSupport=1" };

const ANCHOR_REGEX = /<a[^>]*href="(exibirArquivo\.aspx\?conteudo=[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

/**
 * The listing title of a table version. The wording changed between versions ("Tabela de Código
 * de Classificação Tributária do IBS/CBS", "Tabela de Classificação Tributária do IBS e CBS"),
 * so only the stable part is matched.
 */
const TABLE_TITLE_REGEX =
	/Tabela de (?:Código de )?Classificação Tributária do IBS.*Publicada em (\d{2})\/(\d{2})\/(\d{4})/;

const INFORME_TITLE_REGEX =
	/Informe Técnico 2025\.002\s*-?\s*v\.(\d+\.\d+).*Publicado em (\d{2})\/(\d{2})\/(\d{4})/;

/**
 * Smallest number of rows a complete table yields. The table published on 23/06/2026 carries 18
 * CST codes and 164 classifications, and new versions only add rows or close them with a
 * `dFimVig`, so a result far below it means the workbook layout changed, not that codes were
 * revoked.
 */
const MINIMUM_CST_CODES = 15;
const MINIMUM_CLASSIFICATIONS = 150;

const CST_HEADER = "CST-IBS/CBS";
const CST_DESCRIPTION_HEADER = "Descrição CST-IBS/CBS";
const CLASS_TRIB_HEADER = "cClassTrib";
const CLASS_TRIB_NAME_HEADER = "Nome cClassTrib";
const CLASS_TRIB_DESCRIPTION_HEADER = "Descrição cClassTrib";
const END_OF_VALIDITY_HEADER = "dFimVig";

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const decodeXml = (text: string): string =>
	text.replaceAll(
		/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi,
		(entity: string, ...groups: (string | undefined)[]) => {
			const [decimal, hex, name = ""] = groups;

			if (decimal !== undefined) return String.fromCodePoint(Number(decimal));
			if (hex !== undefined) return String.fromCodePoint(Number.parseInt(hex, 16));

			return XML_ENTITIES[name] ?? entity;
		},
	);

const normalizeText = (text: string): string => text.replaceAll(/\s+/g, " ").trim();

type Listing = {
	/** Absolute download URL. */
	url: string;
	/** The title the portal lists the file under. */
	title: string;
	/** Publication date as `yyyy-mm-dd`, which sorts chronologically. */
	publishedAt: string;
	/** The groups the title regex captured. */
	groups: string[];
};

/**
 * Reads a listing page of the portal and returns the newest entry whose title matches.
 * @param {string} listingUrl - The listing page.
 * @param {RegExp} titleRegex - Matches the title; its last three groups are day, month and year.
 * @returns {Promise<Listing>} The entry with the latest publication date.
 */
const fetchLatestListing = async (listingUrl: string, titleRegex: RegExp): Promise<Listing> => {
	const response = await fetchWithRetry(listingUrl, { headers: PORTAL_HEADERS });

	if (!response.ok) {
		throw new Error(`Portal da NF-e listing request failed with status ${response.status}`);
	}

	const html = await response.text();
	const listings: Listing[] = [];

	for (const [, href = "", body = ""] of html.matchAll(ANCHOR_REGEX)) {
		const title = normalizeText(decodeXml(body.replaceAll(/<[^>]+>/g, " ")));
		const match = titleRegex.exec(title);

		if (match === null) continue;

		const groups = match.slice(1);
		const [day, month, year] = groups.slice(-3);

		listings.push({
			url: new URL(decodeXml(href).replaceAll(" ", "+"), PORTAL).href,
			title,
			publishedAt: `${year}-${month}-${day}`,
			groups,
		});
	}

	const [latest] = listings.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

	if (latest === undefined) {
		throw new Error(`No entry of ${listingUrl} matches ${titleRegex.source}; the listing changed`);
	}

	return latest;
};

const END_OF_CENTRAL_DIRECTORY = 0x06_05_4b_50;
const CENTRAL_DIRECTORY_ENTRY = 0x02_01_4b_50;
const DEFLATE = 8;

/**
 * Reads the text files of a zip archive (an xlsx workbook is one) through its central directory.
 * @param {Buffer} zip - The archive.
 * @returns {Map<string, string>} The UTF-8 content of every entry, by path.
 */
const unzip = (zip: Buffer): Map<string, string> => {
	let end = zip.length - 22;

	while (end >= 0 && zip.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) end -= 1;

	if (end < 0) throw new Error("The downloaded table is not a zip archive (xlsx)");

	const files = new Map<string, string>();
	let offset = zip.readUInt32LE(end + 16);

	for (let index = 0; index < zip.readUInt16LE(end + 10); index += 1) {
		if (zip.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
			throw new Error("The downloaded table has a broken zip central directory");
		}

		const method = zip.readUInt16LE(offset + 10);
		const compressedSize = zip.readUInt32LE(offset + 20);
		const nameLength = zip.readUInt16LE(offset + 28);
		const local = zip.readUInt32LE(offset + 42);
		const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
		const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
		const data = zip.subarray(start, start + compressedSize);

		files.set(name, (method === DEFLATE ? inflateRawSync(data) : data).toString("utf8"));
		offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
	}

	return files;
};

type Row = Record<string, string>;

const SHARED_STRING_REGEX = /<si>([\s\S]*?)<\/si>/g;
const TEXT_RUN_REGEX = /<t[^>]*>([\s\S]*?)<\/t>/g;
const ROW_REGEX = /<row[^>]*>([\s\S]*?)<\/row>/g;
const CELL_REGEX = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
const CELL_VALUE_REGEX = /<v>([\s\S]*?)<\/v>/;

/**
 * Reads a worksheet into rows keyed by the text of the header row (the first one).
 * @param {string} sheet - The worksheet XML.
 * @param {string[]} sharedStrings - The workbook's shared strings.
 * @returns {Row[]} One record per data row, empty cells left out.
 */
const readSheet = (sheet: string, sharedStrings: string[]): Row[] => {
	const rows = [...sheet.matchAll(ROW_REGEX)].map(([, row = ""]) => {
		const cells: Row = {};

		for (const [, column = "", attributes = "", body = ""] of row.matchAll(CELL_REGEX)) {
			const raw = CELL_VALUE_REGEX.exec(body)?.[1];

			if (raw === undefined) continue;

			const value = attributes.includes('t="s"') ? sharedStrings[Number(raw)] : decodeXml(raw);

			cells[column] = normalizeText(value ?? "");
		}

		return cells;
	});

	const [header = {}, ...body] = rows;

	return body.map((cells) => {
		const row: Row = {};

		for (const [column, value] of Object.entries(cells)) {
			const key = header[column];

			if (key !== undefined && value !== "") row[key] = value;
		}

		return row;
	});
};

/**
 * Reads every worksheet of the workbook.
 * @param {Buffer} xlsx - The workbook.
 * @returns {Row[][]} The rows of each worksheet.
 */
const readWorkbook = (xlsx: Buffer): Row[][] => {
	const files = unzip(xlsx);
	const sharedStrings = [
		...(files.get("xl/sharedStrings.xml") ?? "").matchAll(SHARED_STRING_REGEX),
	].map(([, item = ""]) =>
		decodeXml([...item.matchAll(TEXT_RUN_REGEX)].map(([, text = ""]) => text).join("")),
	);

	return [...files]
		.filter(([name]) => name.startsWith("xl/worksheets/") && name.endsWith(".xml"))
		.map(([, sheet]) => readSheet(sheet, sharedStrings));
};

const MS_PER_DAY = 86_400_000;

/**
 * Whether a row is in force on `today`. `dFimVig` is an Excel serial date (days since
 * 30/12/1899) and is inclusive, the way `scripts/ncm.ts` reads the Siscomex window. A
 * classification the Informe Técnico excludes is not deleted from the table, it gets a `dFimVig`
 * (220001, 220002 and 220003 in v.1.60), so this is what keeps it out.
 * @param {Row} row - A classification row.
 * @param {number} today - The reference date, in milliseconds at UTC midnight.
 * @returns {boolean} True when the row has no end of validity, or one that has not passed.
 */
const isInForce = (row: Row, today: number): boolean => {
	const serial = row[END_OF_VALIDITY_HEADER];

	if (serial === undefined) return true;

	return today <= Date.UTC(1899, 11, 30) + Number(serial) * MS_PER_DAY;
};

const serializeSorted = (data: Record<string, unknown>): string =>
	`{${Object.keys(data)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${JSON.stringify(data[key])}`)
		.join(",")}}`;

type Tables = {
	/** CST description by 3 digit code. */
	csts: Record<string, string>;
	/** `[name, description]` by 6 digit cClassTrib. */
	classifications: Record<string, [string, string]>;
};

/**
 * Reads the CST worksheet, the one without a cClassTrib column. The cClassTrib worksheet repeats
 * the CST description on every row but refines it per classification ("Alíquota reduzida em
 * 60%", "Alíquota zero"), so it is not where the description of a CST comes from.
 * @param {Row[]} rows - The rows of every worksheet.
 * @returns {Record<string, string>} The description of each CST.
 */
const buildCsts = (rows: Row[]): Record<string, string> => {
	const csts: Record<string, string> = {};

	for (const row of rows) {
		const cst = row[CST_HEADER];
		const description = row[CST_DESCRIPTION_HEADER];

		if (cst === undefined || description === undefined || CLASS_TRIB_HEADER in row) continue;

		if (!/^\d{3}$/.test(cst)) throw new Error(`CST "${cst}" is not a 3 digit code`);

		csts[cst] = description;
	}

	return csts;
};

/**
 * Builds both tables out of the workbook.
 * @param {Row[]} rows - The rows of every worksheet.
 * @param {number} today - The reference date, in milliseconds at UTC midnight.
 * @returns {Tables} The CST table and the classifications in force.
 */
const buildTables = (rows: Row[], today: number): Tables => {
	const csts = buildCsts(rows);
	const classifications: Record<string, [string, string]> = {};

	for (const row of rows) {
		const code = row[CLASS_TRIB_HEADER];

		if (code === undefined || !isInForce(row, today)) continue;

		if (!/^\d{6}$/.test(code)) throw new Error(`cClassTrib "${code}" is not a 6 digit code`);

		const cst = row[CST_HEADER];

		if (cst === undefined || !code.startsWith(cst) || !(cst in csts)) {
			throw new Error(`cClassTrib "${code}" does not start with a CST of the CST table`);
		}

		const name = row[CLASS_TRIB_NAME_HEADER];
		const description = row[CLASS_TRIB_DESCRIPTION_HEADER];

		if (name === undefined || description === undefined) {
			throw new Error(`cClassTrib "${code}" has no name or no description`);
		}

		classifications[code] = [name, description];
	}

	return { csts, classifications };
};

const main = async (): Promise<void> => {
	const table = await fetchLatestListing(TABLES_LISTING, TABLE_TITLE_REGEX);
	const informe = await fetchLatestListing(INFORMES_LISTING, INFORME_TITLE_REGEX);
	const response = await fetchWithRetry(table.url, { headers: PORTAL_HEADERS });

	if (!response.ok) {
		throw new Error(`cClassTrib table request failed with status ${response.status}`);
	}

	const now = new Date();
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const workbook = Buffer.from(await response.arrayBuffer());
	const { csts, classifications } = buildTables(readWorkbook(workbook).flat(), today);
	const codes = Object.keys(classifications).sort();

	if (Object.keys(csts).length < MINIMUM_CST_CODES || codes.length < MINIMUM_CLASSIFICATIONS) {
		throw new Error(
			`The table yielded ${Object.keys(csts).length} CST codes and ${codes.length} classifications, below the ${MINIMUM_CST_CODES} and ${MINIMUM_CLASSIFICATIONS} a complete table holds; the workbook layout probably changed`,
		);
	}

	await writeFile(
		resolve(scriptsDir, "..", "./src/_internals/constants/ibs-cbs.ts"),
		`/**
 * CST-IBS/CBS (Código de Situação Tributária do IBS e da CBS) table, indexed by the 3 digit
 * code, with the description the official table gives each one.
 *
 * Table version:
 * "${table.title}",
 * the workbook of the Portal Nacional da NF-e ("Documentos" > "Diversos"), divulged by Informe
 * Técnico 2025.002 v.${informe.groups[0]} (published on ${informe.publishedAt}). The generator always reads the
 * newest workbook listed and records it here, so a refresh that picks a new version up shows in
 * this header.
 *
 * Generated by \`node ./scripts/ibs-cbs.ts\`. Do not edit by hand.
 *
 * @see Official: ${table.url}
 * ${table.title}.
 * @see Official: ${informe.url}
 * Informe Técnico 2025.002 v.${informe.groups[0]}, which defines the columns of both tables.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/NJarYc9nus=
 * "Documentos" > "Diversos" of the Portal Nacional da NF-e, where every table version is listed.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm
 * Lei Complementar nº 214/2025, which institutes the IBS and the CBS.
 */
export const CST_IBS_CBS_TABLE: Record<string, string> = ${serializeSorted(csts)};

/**
 * cClassTrib (Código de Classificação Tributária do IBS e da CBS) codes in force on the
 * generation date, sorted ascending. A row of the workbook whose \`dFimVig\` (end of validity)
 * has passed is left out: that is how the Informe Técnico excludes a classification (220001,
 * 220002 and 220003 in v.1.60). The first 3 digits of a code are its CST-IBS/CBS.
 *
 * Kept apart from the descriptions so that validating a code does not bundle them.
 */
export const CLASS_TRIB_CODES: readonly string[] = ${JSON.stringify(codes)};

/**
 * The \`[name, description]\` pair of every code of \`CLASS_TRIB_CODES\`: the columns "Nome
 * cClassTrib" (the short name the table gives for display) and "Descrição cClassTrib" (the
 * situation the classification refers to). The legal wording columns ("LC Redação",
 * "Regulamento CBS", "Regulamento IBS") are not shipped.
 */
export const CLASS_TRIB_TABLE: Record<string, readonly [string, string]> = ${serializeSorted(classifications)};

/** Shape a CST-IBS/CBS has to be written in: the 3 digits of the field \`CST\` (UB13, N 3). */
export const CST_IBS_CBS_FORMAT_REGEX = /^\\d{3}$/;

/** Shape a cClassTrib has to be written in: the 6 digits of the field \`cClassTrib\` (UB14, N 6). */
export const CLASS_TRIB_FORMAT_REGEX = /^\\d{6}$/;

/** Width of a CST-IBS/CBS, which is also the prefix a cClassTrib shares with its CST. */
export const CST_IBS_CBS_LENGTH = 3;

/** Width of a cClassTrib. */
export const CLASS_TRIB_LENGTH = 6;
`,
	);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
