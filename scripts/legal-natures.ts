#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";

const scriptsDir = import.meta.dirname;

const SOURCE_URL =
	"https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf";

const SOURCE_PAGE_URL =
	"https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021";

const OUTPUT_PATH = "./src/is-valid-legal-nature/constants.ts";

const EXPECTED_CODES = 92;

const LEGACY_LEGAL_NATURE: Record<string, string> = {
	"2076": "Sociedade Empresária em Nome Coletivo",
	"2100": "Sociedade Mercantil de Capital e Indústria (extinta pelo NCC/2002)",
	"2208": "Entidade Binacional Itaipu",
	"3042": "Organização Social",
	"3050": "Organização da Sociedade Civil de Interesse Público (Oscip)",
	"3093": "Unidade Executora (Programa Dinheiro Direto na Escola)",
	"3123": "Partido Político",
	"5002": "Organização Internacional e Outras Instituições Extraterritoriais",
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
	value.replaceAll(/\\([0-7]{1,3})|\\(.)/g, (_match, octal?: string, char?: string) => {
		if (octal !== undefined) return String.fromCharCode(Number.parseInt(octal, 8));
		if (char === "n") return "\n";
		if (char === "r") return "\r";
		if (char === "t") return "\t";
		return char ?? "";
	});

const extractBracketText = (body: string): string => {
	let text = "";

	for (const array of body.matchAll(/\[((?:[^[\]\\]|\\.)*)\]\s*TJ/g)) {
		const arrayContent = array[1];

		if (arrayContent === undefined) continue;

		for (const chunk of arrayContent.matchAll(/\(((?:[^()\\]|\\.)*)\)/g)) {
			const chunkText = chunk[1];

			if (chunkText === undefined) continue;

			text += unescapePdfString(chunkText);
		}
	}

	return text;
};

const extractParenthesizedText = (body: string): string => {
	let text = "";

	for (const chunk of body.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) {
		const chunkText = chunk[1];

		if (chunkText === undefined) continue;

		text += unescapePdfString(chunkText);
	}

	return text;
};

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

		for (const y of [...rows.keys()].sort((a, b) => b - a)) {
			const row = rows.get(y) ?? [];
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

const stringifyEntries = (entries: Record<string, string>): string =>
	Object.entries(entries)
		.map(([code, description]) => `\t${JSON.stringify(code)}: ${JSON.stringify(description)},`)
		.join("\n");

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

	const legacy = Object.fromEntries(
		Object.entries(LEGACY_LEGAL_NATURE).filter(([code]) => !(code in current)),
	);

	await writeFile(
		resolve(scriptsDir, "..", OUTPUT_PATH),
		`/**
 * Tabela de Natureza Jurídica 2021 (IBGE/CONCLA), indexed by the four digit code.
 *
 * Generated by \`node ./scripts/legal-natures.ts\`. Do not edit by hand.
 *
 * @see ${SOURCE_PAGE_URL}
 * @see ${SOURCE_URL}
 */
export const LEGAL_NATURE: Record<string, string> = {
${stringifyEntries(current)}

${stringifyEntries(legacy)}
};
`,
	);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
