import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

const CENTRAL_DIRECTORY_HEADER_SIZE = 46;

const LOCAL_HEADER_SIZE = 30;

const DEFLATE = 8;

const ALPHABET_LENGTH = 26;

const CODE_BEFORE_A = 64;

const XML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
};

const decodeXml = (text: string): string =>
	text.replaceAll(/&(?:amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] ?? entity);

/**
 * Reads the files of a zip archive out of its central directory, inflating the deflated ones.
 * @param {Buffer} archive - The whole archive.
 * @returns {Map<string, string>} The UTF-8 content of every file, keyed by its path.
 */
const unzip = (archive: Buffer): Map<string, string> => {
	let end = archive.length - 22;

	while (end >= 0 && archive.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) end--;

	if (end < 0) throw new Error("not a zip archive");

	const files = new Map<string, string>();
	let offset = archive.readUInt32LE(end + 16);

	for (let index = archive.readUInt16LE(end + 10); index > 0; index--) {
		const method = archive.readUInt16LE(offset + 10);
		const size = archive.readUInt32LE(offset + 20);
		const nameLength = archive.readUInt16LE(offset + 28);
		const skipped = archive.readUInt16LE(offset + 30) + archive.readUInt16LE(offset + 32);
		const local = archive.readUInt32LE(offset + 42);
		const nameStart = offset + CENTRAL_DIRECTORY_HEADER_SIZE;
		const name = archive.toString("utf8", nameStart, nameStart + nameLength);
		const start =
			local +
			LOCAL_HEADER_SIZE +
			archive.readUInt16LE(local + 26) +
			archive.readUInt16LE(local + 28);
		const data = archive.subarray(start, start + size);

		files.set(name, (method === DEFLATE ? inflateRawSync(data) : data).toString("utf8"));
		offset = nameStart + nameLength + skipped;
	}

	return files;
};

/**
 * Turns the letters of a cell reference into a zero based column index: `A` is 0, `AA` is 26.
 * @param {string} letters - The column letters of the reference.
 * @returns {number} The zero based index of the column.
 */
const columnIndex = (letters: string): number => {
	let index = 0;

	for (let position = 0; position < letters.length; position++) {
		index = index * ALPHABET_LENGTH + letters.charCodeAt(position) - CODE_BEFORE_A;
	}

	return index - 1;
};

const readFile = (files: Map<string, string>, path: string): string => {
	const content = files.get(path);

	if (content === undefined) throw new Error(`the workbook has no ${path}`);

	return content;
};

/**
 * Reads one sheet of an `.xlsx` workbook, enough of the format for the plain tables the
 * government publishes: shared strings (rich text runs joined), numbers and empty cells.
 * @param {Buffer} workbook - The `.xlsx` file.
 * @param {string} sheetName - The name of the sheet, as its tab shows it.
 * @returns {string[][]} The rows of the sheet, every cell as text and an absent cell as `""`.
 */
export const readXlsxSheet = (workbook: Buffer, sheetName: string): string[][] => {
	const files = unzip(workbook);
	const sheets = readFile(files, "xl/workbook.xml").matchAll(/<sheet [^>]*>/g);
	const sheet = [...sheets].find((tag) => decodeXml(tag[0]).includes(`name="${sheetName}"`));
	const relationId = /r:id="([^"]+)"/.exec(sheet?.[0] ?? "")?.[1];
	const relations = readFile(files, "xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*>/g);
	const relation = [...relations].find((tag) => tag[0].includes(`Id="${relationId}"`));
	const target = /Target="([^"]+)"/.exec(relation?.[0] ?? "")?.[1];

	if (target === undefined) throw new Error(`the workbook has no sheet named ${sheetName}`);

	const strings = [...readFile(files, "xl/sharedStrings.xml").matchAll(/<si>(.*?)<\/si>/gs)].map(
		(item) =>
			[...item[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((run) => decodeXml(run[1])).join(""),
	);

	return [...readFile(files, `xl/${target}`).matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map((row) => {
		const cells: string[] = [];

		for (const cell of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
			const column = columnIndex(cell[1]);
			const value = /<v>([^<]*)<\/v>/.exec(cell[3] ?? "")?.[1] ?? "";

			cells[column] = cell[2].includes('t="s"') ? strings[Number(value)] : value;
		}

		return Array.from(cells, (cell) => cell ?? "");
	});
};
