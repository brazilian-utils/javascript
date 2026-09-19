import { inflateRawSync } from "node:zlib";

import { decodeXml } from "./decode-xml.ts";

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

const CENTRAL_DIRECTORY_SIGNATURE = 0x02_01_4b_50;

const LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;

const CENTRAL_DIRECTORY_HEADER_SIZE = 46;

const LOCAL_HEADER_SIZE = 30;

const DEFLATE = 8;

/** Largest file the reader inflates, so a corrupt archive cannot exhaust the memory. */
const MAXIMUM_FILE_SIZE = 64 * 1024 * 1024;

/**
 * Largest amount the files read out of one workbook may hold together. A central directory can
 * list thousands of sheets, so bounding each file alone does not bound the whole read.
 */
const MAXIMUM_WORKBOOK_SIZE = 128 * 1024 * 1024;

/**
 * The part that holds the text of the cells. A workbook whose cells are all inline strings does
 * not carry it, which is valid, so it is read only when the archive has it.
 */
const SHARED_STRINGS = "xl/sharedStrings.xml";

/** Rows a worksheet can hold, `1048576`. A reference past it is not a sheet this reader can read. */
const MAXIMUM_ROWS = 1_048_576;

/** Columns a worksheet can hold, `A` to `XFD`. */
const MAXIMUM_COLUMNS = 16_384;

const ALPHABET_LENGTH = 26;

const CODE_BEFORE_A = 64;

/** One file of a zip archive, still compressed. */
type ZipEntry = {
	/** The compression method of the entry, 8 for deflate and 0 for stored. */
	method: number;
	/** The bytes of the entry as the archive carries them. */
	data: Buffer;
};

/** The entries of an archive and how much has been inflated out of it so far. */
type Archive = {
	/** Every entry, keyed by its path, left compressed. */
	files: Map<string, ZipEntry>;
	/** Bytes read out of the archive so far, checked against `MAXIMUM_WORKBOOK_SIZE`. */
	read: number;
};

/** One sheet of a workbook, as `xl/workbook.xml` lists it. */
type SheetEntry = {
	/** The name of the sheet, as its tab shows it. */
	name: string;
	/** The path of the worksheet part inside the archive. */
	path: string;
};

/** A workbook opened far enough to read any of its sheets. */
type Workbook = {
	/** The archive of the workbook. */
	archive: Archive;
	/** The shared strings of the workbook. */
	strings: string[];
	/** The sheets, in the order of their tabs. */
	sheets: SheetEntry[];
};

/**
 * Reads the entries of a zip archive out of its central directory. ZIP64 is not supported, so
 * an archive above 4 GB or with more than 65535 entries is out of reach, which no table the
 * government publishes comes close to.
 * @param {Buffer} archive - The whole archive.
 * @returns {Archive} Every entry, keyed by its path, left compressed.
 */
const unzip = (archive: Buffer): Archive => {
	let end = archive.length - 22;

	while (end >= 0 && archive.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) end--;

	if (end < 0) throw new Error("not a zip archive");

	const files = new Map<string, ZipEntry>();
	let offset = archive.readUInt32LE(end + 16);

	for (let index = archive.readUInt16LE(end + 10); index > 0; index--) {
		if (archive.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
			throw new Error("the zip central directory is broken");
		}

		const method = archive.readUInt16LE(offset + 10);
		const size = archive.readUInt32LE(offset + 20);
		const nameLength = archive.readUInt16LE(offset + 28);
		const skipped = archive.readUInt16LE(offset + 30) + archive.readUInt16LE(offset + 32);
		const local = archive.readUInt32LE(offset + 42);
		const nameStart = offset + CENTRAL_DIRECTORY_HEADER_SIZE;
		const name = archive.toString("utf8", nameStart, nameStart + nameLength);

		if (archive.readUInt32LE(local) !== LOCAL_HEADER_SIGNATURE) {
			throw new Error(`the zip entry ${name} points at no local header`);
		}

		const start =
			local +
			LOCAL_HEADER_SIZE +
			archive.readUInt16LE(local + 26) +
			archive.readUInt16LE(local + 28);

		files.set(name, { method, data: archive.subarray(start, start + size) });
		offset = nameStart + nameLength + skipped;
	}

	return { files, read: 0 };
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

/**
 * Inflates one file of the archive and reads it as UTF-8. Only the files a caller asks for are
 * inflated, which leaves the themes, the styles and the custom XML of a workbook untouched.
 * @param {Archive} archive - The archive.
 * @param {string} path - The path of the file inside the archive.
 * @returns {string} The content of the file.
 */
const readFile = (archive: Archive, path: string): string => {
	const entry = archive.files.get(path);

	if (entry === undefined) throw new Error(`the workbook has no ${path}`);

	const content =
		entry.method === DEFLATE
			? inflateRawSync(entry.data, { maxOutputLength: MAXIMUM_FILE_SIZE })
			: entry.data;

	archive.read += content.length;

	if (archive.read > MAXIMUM_WORKBOOK_SIZE) {
		throw new Error(`the workbook holds more than ${MAXIMUM_WORKBOOK_SIZE} bytes`);
	}

	return content.toString("utf8");
};

/**
 * Joins the text runs of a shared string or of an inline string. A cell whose text is styled in
 * pieces carries one `<t>` per piece. The `<rPh>` elements hold the phonetic reading of the
 * text, not the text, so they are dropped first.
 * @param {string} xml - The content of the `<si>` or `<is>` element.
 * @returns {string} The text of the element.
 */
const joinRuns = (xml: string): string =>
	[...xml.replaceAll(/<rPh\b.*?<\/rPh>/gs, "").matchAll(/<t[^>]*>([^<]*)<\/t>/g)]
		.map((run) => decodeXml(run[1]))
		.join("");

/**
 * Resolves the target of a workbook relationship into a path inside the archive. The OPC spec
 * allows an absolute target (`/xl/worksheets/sheet1.xml`) and one that climbs out of the part
 * folder (`../worksheets/sheet1.xml`) as well as the plain relative form.
 * @param {string} target - The `Target` of the relationship.
 * @returns {string} The path of the part inside the archive.
 */
const resolveTarget = (target: string): string =>
	decodeURIComponent(new URL(target, "file:///xl/").pathname).slice(1);

/**
 * Reads the cells of one row, placed by the column of their reference. A cell past the last
 * column a worksheet can hold fails the run, so a corrupt reference cannot make the row array
 * grow to its index.
 * @param {string} row - The content of the `<row>` element.
 * @param {string[]} strings - The shared strings of the workbook.
 * @returns {string[]} The cells of the row, an absent one as `""`.
 */
const readCells = (row: string, strings: string[]): string[] => {
	const cells: string[] = [];

	for (const cell of row.matchAll(/<c\b([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
		const reference = /\br="([A-Z]+)\d+"/.exec(cell[1])?.[1];

		if (reference === undefined) continue;

		const column = columnIndex(reference);

		if (column >= MAXIMUM_COLUMNS) throw new Error(`the column ${reference} is past the sheet`);

		const type = /\bt="([^"]*)"/.exec(cell[1])?.[1];
		const body = cell[2] ?? "";
		const value = /<v>([^<]*)<\/v>/.exec(body)?.[1] ?? "";

		if (type === "inlineStr") cells[column] = joinRuns(body);
		else if (type === "s") cells[column] = strings[Number(value)] ?? "";
		else cells[column] = decodeXml(value);
	}

	return Array.from(cells, (cell) => cell ?? "");
};

/**
 * Reads the rows of a worksheet, placed by the `r` attribute of the row rather than by the
 * order they are written in, so a skipped row leaves a gap instead of shifting the table.
 * @param {string} sheet - The worksheet XML.
 * @param {string[]} strings - The shared strings of the workbook.
 * @returns {string[][]} The rows of the sheet.
 */
const readRows = (sheet: string, strings: string[]): string[][] => {
	const rows: string[][] = [];

	for (const row of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>(.*?)<\/row>)/gs)) {
		const index = Number(/\br="(\d+)"/.exec(row[1])?.[1] ?? rows.length + 1) - 1;

		if (index >= MAXIMUM_ROWS) throw new Error(`the row ${index + 1} is past the sheet`);

		rows[index] = readCells(row[2] ?? "", strings);
	}

	return Array.from(rows, (row) => row ?? []);
};

/**
 * Opens a workbook: its archive, its shared strings and the list of its sheets, each resolved
 * through `xl/_rels/workbook.xml.rels` to the part that holds it.
 * @param {Buffer} buffer - The `.xlsx` file.
 * @returns {Workbook} The opened workbook.
 */
const openWorkbook = (buffer: Buffer): Workbook => {
	const archive = unzip(buffer);
	const relations = readFile(archive, "xl/_rels/workbook.xml.rels").matchAll(
		/<Relationship [^>]*>/g,
	);
	const targets = new Map<string, string>();

	for (const [tag] of relations) {
		const id = /\bId="([^"]+)"/.exec(tag)?.[1];
		const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];

		if (id !== undefined && target !== undefined) targets.set(id, decodeXml(target));
	}

	const sheets: SheetEntry[] = [];

	for (const [tag] of readFile(archive, "xl/workbook.xml").matchAll(/<sheet [^>]*>/g)) {
		const name = /\bname="([^"]*)"/.exec(tag)?.[1];
		const target = targets.get(/\br:id="([^"]+)"/.exec(tag)?.[1] ?? "");

		if (name !== undefined && target !== undefined) {
			sheets.push({ name: decodeXml(name), path: resolveTarget(target) });
		}
	}

	const shared = archive.files.has(SHARED_STRINGS) ? readFile(archive, SHARED_STRINGS) : "";
	const items = shared.matchAll(/<si\b[^>]*?(?:\/>|>(.*?)<\/si>)/gs);
	const strings = [...items].map((item) => joinRuns(item[1] ?? ""));

	return { archive, strings, sheets };
};

/**
 * Reads one sheet of an opened workbook and checks its rows against the dimension it declares.
 * @param {Workbook} workbook - The opened workbook.
 * @param {SheetEntry} sheet - The sheet to read.
 * @returns {string[][]} The rows of the sheet.
 */
const readSheet = (workbook: Workbook, sheet: SheetEntry): string[][] => {
	const content = readFile(workbook.archive, sheet.path);
	const rows = readRows(content, workbook.strings);
	const dimension = /<dimension ref="[A-Z]+\d+:[A-Z]+(\d+)"/.exec(content)?.[1];

	if (dimension !== undefined && rows.length !== Number(dimension)) {
		throw new Error(
			`the sheet ${sheet.name} holds ${rows.length} rows, not the ${dimension} it declares`,
		);
	}

	return rows;
};

/**
 * Reads one sheet of an `.xlsx` workbook, enough of the format for the plain tables the
 * government publishes: shared strings (rich text runs joined, phonetic readings dropped),
 * inline strings, numbers and empty cells.
 * @param {Buffer} workbook - The `.xlsx` file.
 * @param {string} sheetName - The name of the sheet, as its tab shows it.
 * @returns {string[][]} The rows of the sheet, every cell as text and an absent cell as `""`.
 */
export const readXlsxSheet = (workbook: Buffer, sheetName: string): string[][] => {
	const opened = openWorkbook(workbook);
	const sheet = opened.sheets.find(({ name }) => name === sheetName);

	if (sheet === undefined) throw new Error(`the workbook has no sheet named ${sheetName}`);

	return readSheet(opened, sheet);
};

/**
 * Reads every sheet of an `.xlsx` workbook the way `readXlsxSheet` reads one, for a workbook
 * whose sheet names change from one version to the next.
 * @param {Buffer} workbook - The `.xlsx` file.
 * @returns {Map<string, string[][]>} The rows of each sheet, by sheet name, in the order of the tabs.
 */
export const readXlsxSheets = (workbook: Buffer): Map<string, string[][]> => {
	const opened = openWorkbook(workbook);

	return new Map(opened.sheets.map((sheet) => [sheet.name, readSheet(opened, sheet)]));
};
