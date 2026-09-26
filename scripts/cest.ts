#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { decodeEntities } from "./decode-entities.ts";
import { fetchSortedRecord } from "./fetch-sorted-record.ts";
import { removeUntilStable } from "./remove-until-stable.ts";

const scriptsDirectory = import.meta.dirname;

const SOURCE_URL = "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18";

/** An annex heading, e.g. `<p class="A6-1Subtitulo">ANEXO XVII</p>`. */
const ANNEX_HEADING_REGEX = /<p class="A6-1Subtitulo"[^>]*>\s*ANEXO ([IVX]+)\s*<\/p>/g;

const ROW_REGEX = /<tr[^>]*>(.*?)<\/tr>/gs;
const CELL_REGEX = /<td[^>]*>(.*?)<\/td>/gs;
const COMMENT_REGEX = /<!--[\s\S]*?-->/g;
const TAG_REGEX = /<[^>]+>/g;

/** Anexo I names the segments; Anexos II to XXVI list the goods of one segment each. */
const SEGMENTS_ANNEX = "I";
const FIRST_GOODS_ANNEX = "II";
const LAST_GOODS_ANNEX = "XXVI";
const GOODS_ANNEXES = 25;

/** A CEST the way the annexes print it, e.g. `01.001.00`. */
const CEST_REGEX = /^(\d{2})\.(\d{3})\.(\d{2})$/;

const SEGMENT_CODE_REGEX = /^\d{2}$/;

/**
 * CONFAZ keeps every superseded wording of a row next to the one in force. It prints them with
 * the green `A9-...verde` paragraph classes, but not consistently (the previous rows of items
 * 2.1, 2.3, 11.0 and 24.0 of Anexo XVII carry the classes of the text in force), so the note row
 * that introduces a wording is read as well: "Redação anterior ..." and "Redação original ..."
 * head a superseded row, "Nova redação ...", "Acrescido ..." and "Revogado ..." head the row in
 * force.
 *
 * Both classes are looked for inside a `class` attribute rather than anywhere in the row, so a
 * description that happens to carry the word ("milho verde") does not drop the row.
 */
const SUPERSEDED_CLASS_REGEX = /class="[^"]*verde[^"]*"/;
const NOTE_CLASS_REGEX = /class="[^"]*Remiss[^"]*"/;
const SUPERSEDED_NOTE_REGEX = /^Redação (?:anterior|original)/;

/** A revoked item keeps its row, with this word in place of the description. */
const REVOKED_MARKER = "REVOGADO";

/**
 * The date an amendment takes effect from, e.g. `efeitos a partir de 01.02.25`. CONFAZ also
 * drops "a partir de" (`efeitos 01.06.21. a 31.08.24`, Anexo IV item 5.0) and writes the first
 * day of a month as an ordinal (`1º.01.27`), so all three spellings are read.
 */
const EFFECTIVE_FROM_REGEX = /efeitos(?: a partir)?(?: de)? (1[º°o]|\d{2})\.(\d{2})\.(\d{2})\b/g;

/** The line under the title that lists every convênio the consolidated text carries. */
const AMENDED_BY_REGEX = /<p class="A2DataPublicacao"[^>]*>(\s*Alterado pel.*?)<\/p>/s;

const TRAILING_PUNCTUATION_REGEX = /[.;\s]+$/;

/**
 * Smallest number of codes a complete set of annexes yields. The consolidated text carries 1040
 * today, so a result far below it means the markup changed and the row patterns above stopped
 * matching, not that codes were revoked.
 */
const MINIMUM_CODES = 1000;

/**
 * Turns a fragment of the page into the text it renders as. Comments and tags are removed
 * repeatedly until nothing changes, since a single pass leaves the outer markup of a nested or
 * overlapping match behind.
 * @param {string} fragment - The markup to read the text out of.
 * @returns {string} The text of `fragment`, entities decoded and whitespace collapsed.
 */
const toText = (fragment: string): string => {
	const withoutComments = removeUntilStable(fragment, COMMENT_REGEX);
	const withoutTags = removeUntilStable(withoutComments, TAG_REGEX);

	return decodeEntities(withoutTags).replaceAll(/\s+/g, " ").trim();
};

/** Widest a line of the generated header may get, its ` * ` prefix left out. */
const COMMENT_WIDTH = 90;

const wrapComment = (text: string): string => {
	const lines: string[] = [];
	let line = "";

	for (const word of text.split(" ")) {
		if (line !== "" && line.length + word.length + 1 > COMMENT_WIDTH) {
			lines.push(line);
			line = "";
		}

		line = line === "" ? word : `${line} ${word}`;
	}

	return [...lines, line].join("\n * ");
};

type Annex = {
	numeral: string;
	html: string;
};

const splitAnnexes = (html: string): Annex[] => {
	const headings = [...html.matchAll(ANNEX_HEADING_REGEX)];

	return headings.map((heading, index) => ({
		numeral: heading[1] ?? "",
		html: html.slice(heading.index, headings[index + 1]?.index ?? html.length),
	}));
};

type Row = {
	cells: string[];
	isSuperseded: boolean;
	isNote: boolean;
};

const readRows = (html: string): Row[] =>
	[...html.matchAll(ROW_REGEX)].map((row) => {
		const markup = row[1] ?? "";

		return {
			cells: [...markup.matchAll(CELL_REGEX)].map((cell) => toText(cell[1] ?? "")),
			isSuperseded: SUPERSEDED_CLASS_REGEX.test(markup),
			isNote: NOTE_CLASS_REGEX.test(markup),
		};
	});

/**
 * Reads Anexo I, whose rows are `ITEM | NOME DO SEGMENTO | CÓDIGO DO SEGMENTO`. The item number
 * and the segment code stopped matching when segments were dropped (item 15 is segment 16), and
 * the first two digits of a CEST are the segment code, so the table is keyed by the last column.
 *
 * Superseded rows are skipped the same way the goods annexes skip them, so a re-worded segment
 * name cannot be overwritten by the previous wording CONFAZ keeps under it.
 * @param {string} html - The markup of Anexo I.
 * @returns {Record<string, string>} The segment names, keyed by the 2 digit segment code.
 */
const parseSegments = (html: string): Record<string, string> => {
	const segments: Record<string, string> = {};
	let isNextSuperseded = false;

	for (const { cells, isSuperseded, isNote } of readRows(html)) {
		const [item, name, code] = cells;

		if (
			cells.length !== 3 ||
			name === undefined ||
			code === undefined ||
			!SEGMENT_CODE_REGEX.test(code)
		) {
			isNextSuperseded = isNote && SUPERSEDED_NOTE_REGEX.test(item ?? "");
			continue;
		}

		const isCurrent = !isSuperseded && !isNextSuperseded;
		isNextSuperseded = false;

		if (!isCurrent) continue;

		if (code in segments) {
			throw new Error(`Segment ${code} of Anexo ${SEGMENTS_ANNEX} is listed twice as in force`);
		}

		segments[code] = name;
	}

	return segments;
};

/**
 * Fails when an amendment note announces a wording that is not in force yet: the row under it
 * would be read as current while the previous wording still applies, so a maintainer has to
 * look at it rather than the table silently running ahead of the law. Every annex read into the
 * generated file goes through it, Anexo I included, since a segment can be re-worded too.
 * @param {string} html - The markup of an annex.
 * @param {Date} today - The generation date.
 */
const assertNoPendingAmendment = (html: string, today: Date): void => {
	for (const [, day, month, year] of toText(html).matchAll(EFFECTIVE_FROM_REGEX)) {
		const effectiveFrom = new Date(
			Date.UTC(2000 + Number(year), Number(month) - 1, Number.parseInt(day, 10)),
		);

		if (effectiveFrom > today) {
			throw new Error(
				`CEST annexes carry an amendment that only takes effect on ${day}.${month}.${year}; review which wording is in force before regenerating`,
			);
		}
	}
};

/**
 * Reads the rows in force of one goods annex, `ITEM | CEST | NCM/SH | DESCRIÇÃO`, into `goods`.
 * The annexes share one record so that a CEST listed in two of them fails the same way a CEST
 * listed twice in one of them does.
 * @param {Annex} annex - One of Anexos II to XXVI.
 * @param {Record<string, string>} segments - The segments of Anexo I.
 * @param {Record<string, string>} goods - The descriptions read so far, keyed by the 7 digits.
 * The rows in force of `annex` are added to it.
 */
const parseGoods = (
	annex: Annex,
	segments: Record<string, string>,
	goods: Record<string, string>,
): void => {
	let annexSegment: string | undefined;
	let isNextSuperseded = false;

	for (const { cells, isSuperseded, isNote } of readRows(annex.html)) {
		const [, cest, , description] = cells;
		const match = CEST_REGEX.exec(cest ?? "");

		if (!match) {
			isNextSuperseded = isNote && SUPERSEDED_NOTE_REGEX.test(cells[0] ?? "");
			continue;
		}

		const isCurrent = !isSuperseded && !isNextSuperseded;
		isNextSuperseded = false;

		if (!isCurrent || description === undefined) continue;
		if (description.toUpperCase().startsWith(REVOKED_MARKER)) continue;

		const [, segment, item, specification] = match;
		const code = `${segment}${item}${specification}`;

		annexSegment ??= segment;

		if (segment !== annexSegment || segments[segment] === undefined) {
			throw new Error(
				`CEST ${cest} of Anexo ${annex.numeral} does not belong to the segment of its annex`,
			);
		}

		if (description === "" || code in goods) {
			throw new Error(
				`CEST ${cest} of Anexo ${annex.numeral} is empty or listed twice as in force`,
			);
		}

		goods[code] = description.replace(TRAILING_PUNCTUATION_REGEX, "");
	}
};

const main = async (): Promise<void> => {
	let segments: Record<string, string> = {};
	let amendedBy = "";

	const table = await fetchSortedRecord(SOURCE_URL, "CEST annexes", async (response) => {
		const today = new Date();
		const html = await response.text();
		const annexes = splitAnnexes(html);
		const numerals = annexes.map(({ numeral }) => numeral);
		const goodsAnnexes = annexes.slice(
			numerals.indexOf(FIRST_GOODS_ANNEX),
			numerals.indexOf(LAST_GOODS_ANNEX) + 1,
		);
		const segmentsAnnex = annexes.find(({ numeral }) => numeral === SEGMENTS_ANNEX)?.html ?? "";

		assertNoPendingAmendment(segmentsAnnex, today);
		segments = parseSegments(segmentsAnnex);
		amendedBy = toText(AMENDED_BY_REGEX.exec(html)?.[1] ?? "");

		if (amendedBy === "" || goodsAnnexes.length !== GOODS_ANNEXES) {
			throw new Error("CEST page lost its amendment line or one of Anexos II to XXVI");
		}

		const data: Record<string, string> = {};

		for (const annex of goodsAnnexes) {
			assertNoPendingAmendment(annex.html, today);
			parseGoods(annex, segments, data);
		}

		const count = Object.keys(data).length;

		if (count < MINIMUM_CODES) {
			throw new Error(
				`CEST annexes yielded ${count} codes, below the ${MINIMUM_CODES} a complete set holds; the markup probably changed`,
			);
		}

		return data;
	});

	const sortedSegments: Record<string, string> = {};

	for (const code of Object.keys(segments).sort()) {
		sortedSegments[code] = segments[code];
	}

	await writeFile(
		resolve(scriptsDirectory, "..", "./src/_internals/constants/cest.ts"),
		`/**
 * CEST (Código Especificador da Substituição Tributária) table, indexed by the 7 digit code.
 *
 * Built from Anexos II to XXVI of Convênio ICMS 142/18, the consolidated text in force, which
 * CONFAZ heads with this line:
 * ${wrapComment(`"${amendedBy}"`)}
 *
 * Only the wording in force of each item is kept: the superseded wordings CONFAZ prints next
 * to it and the items marked "REVOGADO" are left out. The NCM/SH column of the annexes is not
 * carried.
 *
 * Both tables below are built in ascending code order, which is not the order they read in:
 * JavaScript lists the keys of an object that look like array indexes before the rest, so
 * segments 10 to 28 come first and segments 01 to 09 follow, as in \`cbo.ts\` and \`cnae.ts\`.
 *
 * Generated by \`node ./scripts/cest.ts\`. Do not edit by hand.
 *
 * @see Official: ${SOURCE_URL}
 * Convênio ICMS 142/18, the consolidated text and its annexes.
 */
export const CEST_TABLE: Record<string, string> = ${JSON.stringify(table)};

/**
 * Segment names of Anexo I of Convênio ICMS 142/18, indexed by the 2 digit segment code, which
 * is the first two digits of every CEST of the segment.
 *
 * @see Official: ${SOURCE_URL}
 * Anexo I, "Segmentos de mercadorias".
 */
export const CEST_SEGMENTS: Record<string, string> = ${JSON.stringify(sortedSegments)};

/**
 * Shape a CEST has to be written in: the 7 digits, optionally split into segment, item and
 * specification by a single whitespace or mask character, the way the annexes print them
 * ("01.001.00").
 */
export const CEST_FORMAT_REGEX = /^\\d{2}[\\s.\\-/]?\\d{3}[\\s.\\-/]?\\d{2}$/;
`,
	);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
