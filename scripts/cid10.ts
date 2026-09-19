#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

import { fetchSortedRecord } from "./fetch-sorted-record.ts";

const scriptsDir = import.meta.dirname;

/** The official CSVs are published in ISO-8859-1, not UTF-8. */
const CID10_CSV_DECODER = new TextDecoder("iso-8859-1");

/**
 * DATASUS only serves the archive over plain HTTP (port 443 is closed), so the download is
 * checked against the SHA-256 of the CID-10 V2008 archive, whose files are dated October 2007.
 * A different digest fails the run: a new official revision has to be reviewed by a maintainer,
 * who then updates this value.
 */
const CID10_ZIP_SHA256 = "84f23809275575f751255048064bbb244b0de33fd5987ab98df0f98e5f5d2c95";

const CID10_CODE_REGEX = /^[A-Z]\d{2}\d?$/;

const CATEGORY_LENGTH = 3;

const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06_05_4b_50;
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02_01_4b_50;
const ZIP_END_OF_CENTRAL_DIRECTORY_LENGTH = 22;
const ZIP_CENTRAL_FILE_HEADER_LENGTH = 46;
const ZIP_LOCAL_FILE_HEADER_LENGTH = 30;
const ZIP_METHOD_STORED = 0;
const ZIP_METHOD_DEFLATED = 8;

type Cid10Table = {
	/** The file name inside `CID10CSV.zip`. */
	file: string;
	/** The header of the column that holds the code. */
	codeColumn: string;
};

const CID10_TABLES: Cid10Table[] = [
	{ file: "CID-10-CATEGORIAS.CSV", codeColumn: "CAT" },
	{ file: "CID-10-SUBCATEGORIAS.CSV", codeColumn: "SUBCAT" },
];

const CID10_DESCRIPTION_COLUMN = "DESCRICAO";

/**
 * Finds the end of central directory record of a zip archive, which sits at the very end of
 * the file, before an optional archive comment.
 * @param {Buffer} zip - The whole archive.
 * @returns {number} The offset of the record.
 */
const findEndOfCentralDirectory = (zip: Buffer): number => {
	for (let offset = zip.length - ZIP_END_OF_CENTRAL_DIRECTORY_LENGTH; offset >= 0; offset--) {
		if (zip.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset;
	}

	throw new Error("CID-10 zip has no end of central directory record");
};

/**
 * Reads the entries of a zip archive through its central directory, with no dependency: the
 * DATASUS archive only uses the stored and deflated methods, which `node:zlib` covers.
 * @param {Buffer} zip - The whole archive.
 * @returns {Record<string, Buffer>} The uncompressed content of every entry, by file name.
 */
const unzip = (zip: Buffer): Record<string, Buffer> => {
	const end = findEndOfCentralDirectory(zip);
	const entries = zip.readUInt16LE(end + 10);
	const files: Record<string, Buffer> = {};
	let offset = zip.readUInt32LE(end + 16);

	for (let entry = 0; entry < entries; entry++) {
		if (zip.readUInt32LE(offset) !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
			throw new Error("CID-10 zip has a malformed central directory");
		}

		const method = zip.readUInt16LE(offset + 10);
		const compressedSize = zip.readUInt32LE(offset + 20);
		const nameLength = zip.readUInt16LE(offset + 28);
		const extraLength = zip.readUInt16LE(offset + 30);
		const commentLength = zip.readUInt16LE(offset + 32);
		const localOffset = zip.readUInt32LE(offset + 42);
		const nameStart = offset + ZIP_CENTRAL_FILE_HEADER_LENGTH;
		const name = zip.toString("latin1", nameStart, nameStart + nameLength);
		const dataStart =
			localOffset +
			ZIP_LOCAL_FILE_HEADER_LENGTH +
			zip.readUInt16LE(localOffset + 26) +
			zip.readUInt16LE(localOffset + 28);
		const data = zip.subarray(dataStart, dataStart + compressedSize);

		if (method === ZIP_METHOD_DEFLATED) {
			files[name] = inflateRawSync(data);
		} else if (method === ZIP_METHOD_STORED) {
			files[name] = data;
		} else {
			throw new Error(`CID-10 zip entry "${name}" uses the unsupported method ${method}`);
		}

		offset = nameStart + nameLength + extraLength + commentLength;
	}

	return files;
};

/**
 * Reads the code and `DESCRICAO` columns of one of the official CID-10 CSVs into `data`. The
 * files are plain `;` separated tables with no quoting: a `"` in a description is literal.
 * @param {string} csv - The decoded CSV.
 * @param {Cid10Table} table - Which file this is and where its code is.
 * @param {Record<string, string>} data - The record the rows are added to.
 * @returns {number} How many rows were read.
 */
const parseCsv = (csv: string, table: Cid10Table, data: Record<string, string>): number => {
	const [header = "", ...rows] = csv.split(/\r?\n/);
	const columns = header.trim().split(";");
	const codeIndex = columns.indexOf(table.codeColumn);
	const descriptionIndex = columns.indexOf(CID10_DESCRIPTION_COLUMN);

	if (codeIndex === -1 || descriptionIndex === -1) {
		throw new Error(
			`${table.file} header has no "${table.codeColumn}" or "${CID10_DESCRIPTION_COLUMN}" column`,
		);
	}

	let count = 0;

	for (const row of rows) {
		const fields = row.split(";");
		const code = (fields[codeIndex] ?? "").trim();
		const description = (fields[descriptionIndex] ?? "").trim();

		if (!CID10_CODE_REGEX.test(code) || description === "") continue;

		data[code] = description;
		count++;
	}

	return count;
};

/**
 * Builds the compact validity table: every category, with the fourth characters of its
 * subcategories. A category with no subcategory maps to an empty string.
 * @param {string[]} codes - Every category and subcategory code, sorted.
 * @returns {Record<string, string>} The fourth characters of each category's subcategories.
 */
const groupSubcategories = (codes: string[]): Record<string, string> => {
	const subcategories: Record<string, string> = {};

	for (const code of codes) {
		const category = code.slice(0, CATEGORY_LENGTH);

		subcategories[category] = (subcategories[category] ?? "") + code.slice(CATEGORY_LENGTH);
	}

	return subcategories;
};

const main = async (): Promise<void> => {
	const sorted = await fetchSortedRecord(
		// oxlint-disable-next-line sonarjs/no-clear-text-protocols -- DATASUS does not serve this host over HTTPS; the archive is checked against CID10_ZIP_SHA256 instead
		"http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip",
		"CID-10 zip",
		async (response) => {
			const zip = Buffer.from(await response.arrayBuffer());
			const digest = createHash("sha256").update(zip).digest("hex");

			if (digest !== CID10_ZIP_SHA256) {
				throw new Error(
					`CID-10 zip has the SHA-256 ${digest}, not the reviewed ${CID10_ZIP_SHA256}`,
				);
			}

			const files = unzip(zip);
			const data: Record<string, string> = {};

			for (const table of CID10_TABLES) {
				const file = files[table.file];

				if (file === undefined) throw new Error(`CID-10 zip has no ${table.file}`);

				if (parseCsv(CID10_CSV_DECODER.decode(file), table, data) === 0) {
					throw new Error(`${table.file} holds no code`);
				}
			}

			return data;
		},
	);

	const subcategories = groupSubcategories(Object.keys(sorted));

	await writeFile(
		resolve(scriptsDir, "..", "./src/_internals/constants/cid10-descriptions.ts"),
		`/**
 * CID-10 (Classificação Estatística Internacional de Doenças e Problemas Relacionados à Saúde,
 * 10th revision) descriptions in Brazilian Portuguese, indexed by the code without the dot: the
 * 3 character categories (\`A00\`) and the 4 character subcategories (\`A000\`, printed \`A00.0\`).
 *
 * Built from \`CID-10-CATEGORIAS.CSV\` and \`CID-10-SUBCATEGORIAS.CSV\`, the two \`;\` separated
 * ISO-8859-1 tables DATASUS publishes inside \`CID10CSV.zip\` (CID-10 V2008). The descriptions are
 * the \`DESCRICAO\` column, as published. A category with no subcategory is listed by both files
 * with the same description and shows up once here.
 *
 * This table is about 1 MB, so it has a module of its own: \`CID10_SUBCATEGORIES\`, which holds
 * the same codes without the descriptions, lives in \`cid10.ts\` and never loads this one.
 *
 * Generated by \`node ./scripts/cid10.ts\`. Do not edit by hand.
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
 * The CID-10 tables in CSV, as published by DATASUS (Ministério da Saúde).
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS page that links the archive and documents its files, columns and encoding.
 */
export const CID10_DESCRIPTIONS: Record<string, string> = ${JSON.stringify(sorted)};
`,
	);

	await writeFile(
		resolve(scriptsDir, "..", "./src/_internals/constants/cid10.ts"),
		`/**
 * Every CID-10 category, with the fourth characters of its subcategories: \`A00: "019"\` stands
 * for \`A00.0\`, \`A00.1\` and \`A00.9\`, and an empty string for a category that is not
 * subdivided. It holds the same codes as \`CID10_DESCRIPTIONS\` without the descriptions, so that
 * checking a code does not cost the whole table.
 *
 * Generated by \`node ./scripts/cid10.ts\`. Do not edit by hand.
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
 * The CID-10 tables in CSV, as published by DATASUS (Ministério da Saúde).
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS page that links the archive and documents its files, columns and encoding.
 */
export const CID10_SUBCATEGORIES: Record<string, string> = ${JSON.stringify(subcategories)};

/**
 * Shape a CID-10 code has to be written in: a letter and two digits for a category, plus the
 * fourth character of a subcategory, with or without the dot before it.
 */
export const CID10_FORMAT_REGEX = /^[A-Za-z]\\d{2}(?:\\.?\\d)?$/;

/** Characters of a complete subcategory code, without the dot. */
export const CID10_LENGTH = 4;
`,
	);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
