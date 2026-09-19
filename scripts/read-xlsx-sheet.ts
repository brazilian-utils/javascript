import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

const CENTRAL_DIRECTORY_SIGNATURE = 0x02_01_4b_50;

const CENTRAL_DIRECTORY_HEADER_SIZE = 46;

const LOCAL_HEADER_SIZE = 30;

const DEFLATE = 8;

/** Largest file the reader inflates, so a corrupt archive cannot exhaust the memory. */
const MAXIMUM_FILE_SIZE = 64 * 1024 * 1024;

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

const XML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
};

const MAXIMUM_CODE_POINT = 0x10_ff_ff;

/**
 * Decodes the five entities of XML and the numeric character references a writer other than
 * Excel emits, `&#10;` and `&#xE9;` alike. Anything else is left as it is.
 * @param {string} text - The text as the XML carries it.
 * @returns {string} The decoded text.
 */
const decodeXml = (text: string): string =>
	text.replaceAll(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, (entity) => {
		if (!entity.startsWith("&#")) return XML_ENTITIES[entity] ?? entity;

		const reference = entity.slice(2, -1);
		const code = reference.startsWith("x")
			? Number.parseInt(reference.slice(1), 16)
			: Number(reference);

		return code <= MAXIMUM_CODE_POINT ? String.fromCodePoint(code) : entity;
	});

/** One file of a zip archive, still compressed. */
type ZipEntry = {
	/** The compression method of the entry, 8 for deflate and 0 for stored. */
	method: number;
	/** The bytes of the entry as the archive carries them. */
	data: Buffer;
};

/**
 * Reads the entries of a zip archive out of its central directory. ZIP64 is not supported, so
 * an archive above 4 GB or with more than 65535 entries is out of reach, which no table the
 * government publishes comes close to.
 * @param {Buffer} archive - The whole archive.
 * @returns {Map<string, ZipEntry>} Every entry, keyed by its path, left compressed.
 */
const unzip = (archive: Buffer): Map<string, ZipEntry> => {
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
		const start =
			local +
			LOCAL_HEADER_SIZE +
			archive.readUInt16LE(local + 26) +
			archive.readUInt16LE(local + 28);

		files.set(name, { method, data: archive.subarray(start, start + size) });
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

/**
 * Inflates one file of the archive and reads it as UTF-8. Only the files a caller asks for are
 * inflated, which leaves the themes, the styles and the custom XML of a workbook untouched.
 * @param {Map<string, ZipEntry>} files - The entries of the archive.
 * @param {string} path - The path of the file inside the archive.
 * @returns {string} The content of the file.
 */
const readFile = (files: Map<string, ZipEntry>, path: string): string => {
	const entry = files.get(path);

	if (entry === undefined) throw new Error(`the workbook has no ${path}`);

	return (
		entry.method === DEFLATE
			? inflateRawSync(entry.data, { maxOutputLength: MAXIMUM_FILE_SIZE })
			: entry.data
	).toString("utf8");
};

/**
 * Joins the text runs of a shared string or of an inline string. A cell whose text is styled in
 * pieces carries one `<t>` per piece.
 * @param {string} xml - The content of the `<si>` or `<is>` element.
 * @returns {string} The text of the element.
 */
const joinRuns = (xml: string): string =>
	[...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((run) => decodeXml(run[1])).join("");

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
 * Reads one sheet of an `.xlsx` workbook, enough of the format for the plain tables the
 * government publishes: shared strings (rich text runs joined), inline strings, numbers and
 * empty cells.
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

	const shared = files.has(SHARED_STRINGS) ? readFile(files, SHARED_STRINGS) : "";
	const items = shared.matchAll(/<si\b[^>]*?(?:\/>|>(.*?)<\/si>)/gs);
	const strings = [...items].map((item) => joinRuns(item[1] ?? ""));

	const content = readFile(files, resolveTarget(target));
	const rows = readRows(content, strings);
	const dimension = /<dimension ref="[A-Z]+\d+:[A-Z]+(\d+)"/.exec(content)?.[1];

	if (dimension !== undefined && rows.length !== Number(dimension)) {
		throw new Error(
			`the sheet ${sheetName} holds ${rows.length} rows, not the ${dimension} it declares`,
		);
	}

	return rows;
};
