#!/usr/bin/env node

import { inflateSync } from "node:zlib";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";
import { runAsEntryPoint, serializeCodes, writeGeneratedFiles } from "./lookup-table.ts";

const SOURCE_URL =
	"https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf";

const SOURCE_PAGE_URL =
	"https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021";

const OUTPUT_PATH = "./src/is-valid-legal-nature/constants.ts";

const EXPECTED_CODES = 92;

const CORRESPONDENCE_PAGE_URL =
	"https://concla.ibge.gov.br/classificacoes/correspondencias/natureza-juridica.html";

const CORRESPONDENCE_2003_2009_URL =
	"https://concla.ibge.gov.br/images/concla/documentacao/correspTNJ2003(1)-2009.xls";

const CORRESPONDENCE_1995_2003_URL =
	"https://concla.ibge.gov.br/images/concla/documentacao/correspTNJ1995-2002-2003.xls";

/**
 * The codes a past revision of the table retired, with the code the CONCLA correspondence
 * spreadsheets map each one to (`null` when the code was retired without a successor). They are
 * kept in the shipped table because they still appear in records filed while they were in force.
 */
const LEGACY_LEGAL_NATURE: Record<string, { description: string; currentCode: string | null }> = {
	"2076": { description: "Sociedade Empresária em Nome Coletivo", currentCode: "2070" },
	"2100": {
		description: "Sociedade Mercantil de Capital e Indústria (extinta pelo NCC/2002)",
		currentCode: null,
	},
	"2208": { description: "Entidade Binacional Itaipu", currentCode: "2275" },
	"3042": { description: "Organização Social", currentCode: "3069" },
	"3050": {
		description: "Organização da Sociedade Civil de Interesse Público (Oscip)",
		currentCode: null,
	},
	"3093": {
		description: "Unidade Executora (Programa Dinheiro Direto na Escola)",
		currentCode: "3999",
	},
	"3123": { description: "Partido Político", currentCode: null },
	"5002": {
		description: "Organização Internacional e Outras Instituições Extraterritoriais",
		currentCode: "5010",
	},
};

const TYPO_FIXES: Record<string, string> = {
	"Frente Plebiscitária ou Referendaria": "Frente Plebiscitária ou Referendária",
};

const inflateStreams = (pdf: Buffer): string[] => {
	const streams: string[] = [];
	let cursor = 0;

	while (cursor < pdf.length) {
		const start = pdf.indexOf("stream", cursor);
		if (start === -1) break;

		let contentStart = start + "stream".length;
		if (pdf[contentStart] === 0x0d) contentStart += 1;
		if (pdf[contentStart] === 0x0a) contentStart += 1;

		const end = pdf.indexOf("endstream", contentStart);
		if (end === -1) break;

		try {
			streams.push(inflateSync(pdf.subarray(contentStart, end)).toString("latin1"));
		} catch (error) {
			if (!(error instanceof Error)) throw error;
		}

		cursor = end + "endstream".length;
	}

	return streams;
};

const unescapePdfString = (value: string): string =>
	value.replaceAll(/\\([0-7]{1,3})|\\(.)/g, (_match, octal?: string, character?: string) => {
		if (octal !== undefined) return String.fromCharCode(Number.parseInt(octal, 8));
		if (character === "n") return "\n";
		if (character === "r") return "\r";
		if (character === "t") return "\t";
		return character ?? "";
	});

/**
 * Concatenates every string a PDF text operator carries, unescaped.
 * @param {string} source - The fragment of the content stream to read.
 * @param {RegExp} pattern - The global pattern whose first group is one escaped string.
 * @returns {string} The strings of every match, unescaped and joined.
 */
const collectStrings = (source: string, pattern: RegExp): string => {
	let text = "";

	for (const [, chunkText] of source.matchAll(pattern)) {
		if (chunkText === undefined) continue;

		text += unescapePdfString(chunkText);
	}

	return text;
};

const extractBracketText = (body: string): string => {
	let text = "";

	for (const [, arrayContent] of body.matchAll(/\[((?:[^[\]\\]|\\.)*)\]\s*TJ/g)) {
		if (arrayContent === undefined) continue;

		text += collectStrings(arrayContent, /\(((?:[^()\\]|\\.)*)\)/g);
	}

	return text;
};

const extractParenthesizedText = (body: string): string =>
	collectStrings(body, /\(((?:[^()\\]|\\.)*)\)\s*Tj/g);

const extractLines = (streams: string[]): string[] => {
	const lines: string[] = [];

	for (const stream of streams) {
		const rows = new Map<number, [number, string][]>();

		for (const block of stream.matchAll(/BT([\s\S]*?)ET/g)) {
			const body = block[1];

			if (body === undefined) continue;

			const matrix = [...body.matchAll(/([-\d.]+)\s+([-\d.]+)\s+Tm/g)].pop();
			if (!matrix) continue;

			const [, rawX, rawY] = matrix;

			if (rawX === undefined || rawY === undefined) continue;

			const text = extractBracketText(body) + extractParenthesizedText(body);

			if (!text) continue;

			const x = Number.parseFloat(rawX);
			const y = Math.round(Number.parseFloat(rawY) * 10) / 10;

			const row = rows.get(y) ?? [];
			row.push([x, text]);
			rows.set(y, row);
		}

		for (const [, row] of [...rows].sort(([a], [b]) => b - a)) {
			lines.push(
				row
					.sort(([a], [b]) => a - b)
					.map(([, text]) => text)
					.join(""),
			);
		}
	}

	return lines;
};

const parseLegalNatures = (lines: string[]): Record<string, string> => {
	const legalNatures: Record<string, string> = {};

	for (const line of lines) {
		const match = /^\s*(\d{3})-(\d)\s*-\s*(.+?)\s*$/.exec(line);
		if (!match) continue;

		const [, codePrefix, codeSuffix, rawDescription] = match;

		if (codePrefix === undefined || codeSuffix === undefined || rawDescription === undefined) {
			continue;
		}

		const code = `${codePrefix}${codeSuffix}`;
		const description = rawDescription.replaceAll(/\s+/g, " ").trim();

		legalNatures[code] = TYPO_FIXES[description] ?? description;
	}

	return legalNatures;
};

const stringifyEntries = (entries: Record<string, string | null>): string =>
	Object.entries(entries)
		.map(([code, value]) => `\t${JSON.stringify(code)}: ${JSON.stringify(value)},`)
		.join("\n");

/**
 * Renders the module the legal natures are shipped in.
 * @param {Record<string, string>} current - The descriptions of the official codes, keyed by code.
 * @returns {Record<string, string>} The content of the generated file, by its path.
 */
export const renderLegalNatures = (current: Record<string, string>): Record<string, string> => {
	const codes = Object.keys(current);

	const legacy = Object.fromEntries(
		Object.entries(LEGACY_LEGAL_NATURE).filter(([code]) => !(code in current)),
	);

	const legacyCodes = Object.keys(legacy);

	const legacyDescriptions = Object.fromEntries(
		Object.entries(legacy).map(([code, { description }]) => [code, description]),
	);

	const legacyCurrentCodes = Object.fromEntries(
		Object.entries(legacy).map(([code, { currentCode }]) => [code, currentCode]),
	);

	for (const [code, currentCode] of Object.entries(legacyCurrentCodes)) {
		if (currentCode !== null && !(currentCode in current)) {
			throw new Error(`Legacy legal nature ${code} maps to the unknown code ${currentCode}`);
		}
	}

	const typoFixedCodes = Object.entries(current)
		.filter(([, description]) => Object.values(TYPO_FIXES).includes(description))
		.map(([code]) => code);

	return {
		[OUTPUT_PATH]: `/**
 * Tabela de Natureza Jurídica 2021 (IBGE/CONCLA), indexed by the four digit code.
 *
 * Generated by \`node ./scripts/legal-natures.ts\`. Do not edit by hand.
 *
 * ${codes.length} of the ${codes.length + legacyCodes.length} entries are the official codes from the CONCLA 2021 table; the other
 * ${legacyCodes.length} (${legacyCodes.join(", ")}) are legacy codes a past revision
 * retired, mapped to the code they correspond to today by \`LEGACY_LEGAL_NATURE\` and still
 * accepted because they keep appearing in records filed while they were in force. Separately, and
 * unrelated to those legacy codes, the descriptions of the following official codes fix an accent
 * typo of the PDF: ${typoFixedCodes.join(", ")}.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally.
 *
 * @see Official: ${SOURCE_PAGE_URL}
 * @see Official: ${SOURCE_URL}
 */
export const LEGAL_NATURE: Record<string, string> = {
${stringifyEntries(current)}

${stringifyEntries(legacyDescriptions)}
};

/**
 * The four digit code of every entry of \`LEGAL_NATURE\`, the official and the legacy ones, back to
 * back in ascending order, which \`findCodeIndex\` reads: \`isValidLegalNature\` checks a code
 * against it without bundling the descriptions.
 */
export const LEGAL_NATURE_CODES = ${serializeCodes(Object.keys({ ...current, ...legacyDescriptions }).sort())};

/**
 * The code each legacy legal nature code corresponds to today, or \`null\` when the revision that
 * retired it published no successor, indexed by the legacy code.
 *
 * Generated by \`node ./scripts/legal-natures.ts\`. Do not edit by hand.
 *
 * The mapping is the one the CONCLA correspondence spreadsheets publish. 2076 is the 2003 spelling
 * of the code the 2003.1 revision renumbered to 2070, under the same denomination; 2208 (Empresa
 * Binacional Itaipu) became 2275 (Empresa Binacional); 3042 (Organização Social) became 3069
 * (Fundação Privada), and the 2014 revision later created 3301 (Organização Social (OS)), where an
 * entity qualified as one is classified today; 3093 became 3999; and 5002 was opened into 5010,
 * 5029 and 5037, with 5010 published as its correspondence. The other three have none: 2100 is
 * marked "categoria extinta", 3050 (Oscip) has an empty correspondence because an Oscip is
 * classified by the form it takes (3999 or 3069), and 3123 (Partido Político), still in the 2009
 * table, was dropped by the 2014 one, which split it into 3255, 3263 and 3271 without publishing a
 * correspondence.
 *
 * The CONCLA pages sit behind a bot filter and answer HTTP 403 to every non-browser client, so
 * they have to be opened in a browser; the spreadsheets next to them are served normally.
 *
 * @see Official: ${CORRESPONDENCE_PAGE_URL}
 * @see Official: ${CORRESPONDENCE_2003_2009_URL}
 * @see Official: ${CORRESPONDENCE_1995_2003_URL}
 */
export const LEGACY_LEGAL_NATURE: Record<string, string | null> = {
${stringifyEntries(legacyCurrentCodes)}
};
`,
	};
};

const main = async (): Promise<void> => {
	const response = await fetchWithRetry(SOURCE_URL);

	if (!response.ok) {
		throw new Error(`CONCLA legal natures request failed with status ${response.status}`);
	}

	const pdf = Buffer.from(await response.arrayBuffer());
	const current = parseLegalNatures(extractLines(inflateStreams(pdf)));
	const codes = Object.keys(current);

	if (codes.length !== EXPECTED_CODES) {
		throw new Error(`Expected ${EXPECTED_CODES} legal natures, got ${codes.length}`);
	}

	await writeGeneratedFiles(renderLegalNatures(current));
};

await runAsEntryPoint(import.meta.filename, main);
