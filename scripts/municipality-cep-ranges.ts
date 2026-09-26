#!/usr/bin/env node

import { register } from "node:module";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";
import { runAsEntryPoint, writeGeneratedFiles } from "./lookup-table.ts";

// Every `src/` module imports its siblings without a file extension, the convention the
// bundler resolves; a plain `node` process (this script) cannot resolve those on its own. This
// hook retries a failed relative resolution with `.ts` appended, so `municipalities.ts` (in
// particular its own `import { type StateCode } from "./states"`) can be imported below exactly
// as every other consumer imports it, with no copy of its data and no change to its style.
const EXTENSIONLESS_IMPORT_LOADER = `
export async function resolve(specifier, context, nextResolve) {
	try {
		return await nextResolve(specifier, context);
	} catch (error) {
		if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
			return nextResolve(\`\${specifier}.ts\`, context);
		}

		throw error;
	}
}
`;

register(
	`data:text/javascript,${encodeURIComponent(EXTENSIONLESS_IMPORT_LOADER)}`,
	import.meta.url,
);

const { DATA, OTHER_NAMES } = await import("../src/_internals/constants/municipalities.ts");

type StateCode = keyof typeof DATA;

// The same helper getMunicipalityByCep matches names with, loaded through the hook above like
// the dataset, so the table is built with exactly the normalization it is read with.
const { normalizeMunicipalityName } =
	await import("../src/_internals/normalize-municipality-name/normalize-municipality-name.ts");

// Pinned to a specific commit of the gist, so a re-run always reads the exact CSV this table
// was cross-checked against; bumping it is a deliberate, reviewed change.
const SOURCE_URL =
	"https://gist.githubusercontent.com/hugosenari/ec1a7d88f5bdd01844424dbc9aff9590/raw/9aeb90ef777131ffaf1a6f5381d1f163c9c79b09/ceps.csv";

const EXPECTED_HEADER = "UF,CIDADE,CEP DE,CEP ATÉ";
const EXPECTED_MUNICIPALITY_ROWS = 5764;

type Row = {
	uf: string;
	cidade: string;
	cepDe: string;
	cepAte: string;
};

const parseCsv = (text: string): Row[] => {
	const lines = text.split(/\r?\n/).filter((line) => line.length > 0);

	if (lines[0] !== EXPECTED_HEADER) {
		throw new Error(`Unexpected ceps.csv header: ${lines[0]}`);
	}

	return lines.slice(1).map((line) => {
		const [uf, cidade, cepDe, cepAte] = line.split(",");

		return { uf: uf ?? "", cidade: cidade ?? "", cepDe: cepDe ?? "", cepAte: cepAte ?? "" };
	});
};

const isStateCode = (value: string): value is StateCode => Object.hasOwn(DATA, value);

/**
 * Builds, for one state, a map from every normalized name that identifies one of its
 * municipalities (its IBGE name and every `OTHER_NAMES` variant) to that municipality's code.
 *
 * @param {StateCode} stateCode - The state whose municipalities to index.
 * @returns {Map<string, string>} A map from normalized name to 7-digit IBGE code.
 */
const buildNameIndex = (stateCode: StateCode): Map<string, string> => {
	const index = new Map<string, string>();

	for (const [name, code] of DATA[stateCode]) {
		index.set(normalizeMunicipalityName(name), code);

		for (const otherName of OTHER_NAMES[code] ?? []) {
			index.set(normalizeMunicipalityName(otherName), code);
		}
	}

	return index;
};

type CepRange = {
	code: string;
	start: number;
	end: number;
};

/**
 * Merges the ranges of one municipality that overlap or touch into as few ranges as possible,
 * keeping genuinely separate blocks (such as the two the gist lists for Brasília) apart. The
 * source CSV lists a few municipalities twice under overlapping ranges, once per historical
 * name sharing the same modern range; merging removes that duplication rather than shipping it.
 *
 * @param {CepRange[]} ranges - The ranges of one municipality, in any order.
 * @returns {CepRange[]} The same ranges, merged and sorted by `start`.
 */
const mergeRanges = (ranges: CepRange[]): CepRange[] => {
	const sorted = [...ranges].sort((a, b) => a.start - b.start);
	const merged: CepRange[] = [];

	for (const range of sorted) {
		const last = merged.at(-1);

		if (last !== undefined && range.start <= last.end + 1) {
			last.end = Math.max(last.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}

	return merged;
};

/**
 * Packs the ranges the way \`decodeCepRanges\` reads them: per range, the 7-digit IBGE code, the
 * size of the range (its last CEP minus its first) and, when it does not start right after the
 * previous range (or after CEP 0, for the first), a \`.\` and the number of CEPs skipped.
 * @param {readonly CepRange[]} ranges - The ranges, in ascending order and not overlapping.
 * @returns {string[]} One entry per range, in the same order.
 */
const packRanges = (ranges: readonly CepRange[]): string[] => {
	let previousEnd = 0;

	return ranges.map(({ code, start, end }) => {
		const skipped = start - previousEnd - 1;

		previousEnd = end;

		const gap = skipped === 0 ? "" : `.${skipped}`;

		return `${code}${end - start}${gap}`;
	});
};

/**
 * Renders the module the CEP ranges are shipped in.
 * @param {readonly CepRange[]} ranges - The ranges, in ascending order and not overlapping.
 * @returns {Record<string, string>} The content of the generated file, by its path.
 */
export const renderMunicipalityCepRanges = (
	ranges: readonly CepRange[],
): Record<string, string> => ({
	"./src/get-municipality-by-cep/constants.ts": `/**
 * CEP ranges of each municipality ("Faixa de CEP" per município), in ascending order, packed into
 * one string that \`decodeCepRanges\` reads on the first lookup: one \`;\` separated entry per
 * range (and per source line, joined by line continuations), the 7-digit IBGE code followed by
 * the size of the range (its last CEP minus its first) and, when the range does not start right
 * after the previous one, a \`.\` and the number of CEPs skipped. Only the range and the IBGE
 * code are stored here; the municipality name and state come from
 * \`src/_internals/constants/municipalities.ts\` through \`getMunicipalityByCode\`, so a name is
 * never duplicated between the two tables. Generated by \`scripts/municipality-cep-ranges.ts\`.
 *
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 * @see Based on: https://gist.github.com/hugosenari/ec1a7d88f5bdd01844424dbc9aff9590
 * Copy of the answers of the Correios search, one row per municipality.
 */
export const CEP_RANGES =
	"${packRanges(ranges).join(";\\\n")}";
`,
});

const main = async (): Promise<void> => {
	const response = await fetchWithRetry(SOURCE_URL);

	if (!response.ok) {
		throw new Error(`ceps.csv request failed with status ${response.status}`);
	}

	const rows = parseCsv(await response.text());
	const municipalityRows = rows.filter((row) => row.cidade !== "");

	if (municipalityRows.length !== EXPECTED_MUNICIPALITY_ROWS) {
		throw new Error(
			`Expected ${EXPECTED_MUNICIPALITY_ROWS} municipality rows in ceps.csv, found ${municipalityRows.length}`,
		);
	}

	const nameIndexByState = new Map<string, Map<string, string>>();
	const byCode = new Map<string, CepRange[]>();
	const unresolved: string[] = [];

	for (const row of municipalityRows) {
		if (!isStateCode(row.uf)) {
			unresolved.push(`${row.uf},${row.cidade}`);
			continue;
		}

		if (!nameIndexByState.has(row.uf)) {
			nameIndexByState.set(row.uf, buildNameIndex(row.uf));
		}

		const code = nameIndexByState.get(row.uf)?.get(normalizeMunicipalityName(row.cidade));

		if (code === undefined) {
			unresolved.push(`${row.uf},${row.cidade}`);
			continue;
		}

		const ranges = byCode.get(code) ?? [];

		ranges.push({ code, start: Number(row.cepDe), end: Number(row.cepAte) });
		byCode.set(code, ranges);
	}

	if (unresolved.length > 0) {
		throw new Error(
			`ceps.csv rows that match no municipality (add an OTHER_NAMES entry in scripts/cities.ts): ${unresolved.join(" | ")}`,
		);
	}

	const allRanges = [...byCode.values()].flatMap((ranges) => mergeRanges(ranges));

	allRanges.sort((a, b) => a.start - b.start);

	for (const [index, range] of allRanges.entries()) {
		const previous = allRanges[index - 1];

		if (previous !== undefined && range.start <= previous.end) {
			throw new Error(
				`Overlapping CEP ranges: ${previous.code} (${previous.start}-${previous.end}) and ${range.code} (${range.start}-${range.end})`,
			);
		}
	}

	await writeGeneratedFiles(renderMunicipalityCepRanges(allRanges));
};

await runAsEntryPoint(import.meta.filename, main);
