#!/usr/bin/env node

/**
 * Writes the Markdown body of the dataset refresh pull request: for every generated dataset file
 * that `npm run build:data` changed, how many entries were added and removed and a sample of
 * them, read from `git diff`. The generated files hold about one entry per line, so a line
 * diff is an entry diff: a changed entry shows up once as removed and once as added.
 *
 * Usage:
 *   node scripts/data-summary.ts [output.md]
 *     Print the summary, or write it to `output.md`.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/** The source each generated file is rebuilt from, as named in the file's own header. */
const DATASETS: Record<string, string> = {
	"src/_internals/constants/banks.ts": "Banks (Banco Central, STR participants)",
	"src/_internals/constants/cbo.ts": "CBO 2002 occupations (Ministério do Trabalho e Emprego)",
	"src/_internals/constants/cest.ts": "CEST codes and segments (CONFAZ, Convênio ICMS 142/18)",
	"src/_internals/constants/cfop.ts": "CFOP codes (CONFAZ, Convênio SINIEF s/nº 1970)",
	"src/_internals/constants/cnae.ts": "CNAE subclasses (IBGE/CONCLA)",
	"src/_internals/constants/ibs-cbs.ts":
		"CST-IBS/CBS and cClassTrib (Portal Nacional da NF-e, Informe Técnico 2025.002)",
	"src/_internals/constants/municipalities.ts": "Municipalities (IBGE)",
	"src/_internals/constants/nbs.ts": "NBS 2.0 descriptions (MDIC)",
	"src/_internals/constants/service-items.ts":
		"LC 116/2003 service list (Sistema Nacional NFS-e, ANEXO B)",
	"src/_internals/constants/states.ts": "States (IBGE)",
	"src/get-municipality-by-cep/constants.ts":
		"Municipality CEP ranges (Correios, via a community mirror)",
	"src/is-valid-legal-nature/constants.ts": "Legal natures (IBGE/CONCLA)",
	"src/is-valid-ncm/constants.ts": "NCM codes (Siscomex)",
};

const SAMPLE_SIZE = 15;

/**
 * Runs a command of the toolchain (resolved from `PATH`, as `scripts/data.ts` does with `node` and
 * `vp`: the script only ever runs in a checkout, by a maintainer or by CI) and returns its output.
 * @param {string} command - The executable.
 * @param {string[]} args - Its arguments.
 * @returns {string} What it printed.
 */
const capture = (command: string, args: string[]): string =>
	execFileSync(command, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/**
 * @param {string} file - A path relative to the repository root.
 * @returns {{ added: string[]; removed: string[] }} The lines the working tree adds to and removes
 * from the committed file, without their `+`/`-` marker.
 */
const changedLines = (file: string): { added: string[]; removed: string[] } => {
	const diff = capture("git", ["diff", "--unified=0", "--no-color", "--", file]);
	const added: string[] = [];
	const removed: string[] = [];

	for (const line of diff.split("\n")) {
		if (line.startsWith("+++") || line.startsWith("---")) continue;
		if (line.startsWith("+")) added.push(line.slice(1).trim());
		if (line.startsWith("-")) removed.push(line.slice(1).trim());
	}

	return { added: added.filter(Boolean), removed: removed.filter(Boolean) };
};

/**
 * @param {string} title - "Added" or "Removed".
 * @param {string[]} lines - The entries.
 * @returns {string[]} A collapsed Markdown block with up to `SAMPLE_SIZE` of them.
 */
const sample = (title: string, lines: string[]): string[] => {
	if (lines.length === 0) return [];

	const rest = lines.length - SAMPLE_SIZE;

	return [
		`<details><summary>${title} (${lines.length})</summary>`,
		"",
		"```text",
		...lines.slice(0, SAMPLE_SIZE),
		...(rest > 0 ? [`... and ${rest} more`] : []),
		"```",
		"",
		"</details>",
		"",
	];
};

const sections: string[] = [];

for (const [file, label] of Object.entries(DATASETS)) {
	const { added, removed } = changedLines(file);

	if (added.length === 0 && removed.length === 0) continue;

	sections.push(
		`### ${label}`,
		"",
		`\`${file}\`: ${added.length} line(s) added, ${removed.length} removed. A changed entry counts once on each side.`,
		"",
		...sample("Added", added),
		...sample("Removed", removed),
	);
}

const body = [
	"Automated refresh of the datasets the package embeds, rebuilt from their official sources by",
	"`npm run build:data`. The check and the test suite passed on the result.",
	"",
	"Review each table against its source for plausibility before merging: a table that lost a",
	"large share of its rows is a broken scraper or a source outage, not news.",
	"",
	"## What changed",
	"",
	...(sections.length > 0 ? sections : ["No dataset file changed."]),
].join("\n");

const [output] = process.argv.slice(2);

if (output === undefined) {
	console.log(body);
} else {
	writeFileSync(output, `${body}\n`);
}
