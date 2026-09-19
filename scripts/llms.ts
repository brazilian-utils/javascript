import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseFrontMatter } from "./front-matter.ts";

const ROOT = join(import.meta.dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const SITE = "https://brazilian-utils.com.br";
const REPO = "https://github.com/brazilian-utils/javascript";

type UtilSection = {
	name: string;
	slug: string;
	description: string;
};

const SLUG_STRIP_PATTERN = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g;
const VARIATION_SELECTOR_PATTERN = /\uFE0F/g;
const EMOJI_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

/**
 * Removes every match of `pattern` repeatedly until nothing changes, so nested or overlapping
 * matches cannot survive a single pass.
 * @param {string} value - The string to strip matches from.
 * @param {RegExp} pattern - The pattern to remove, repeatedly.
 * @returns {string} `value` with every match of `pattern` removed.
 */
function removeUntilStable(value: string, pattern: RegExp): string {
	let current = value;
	let previous = "";
	while (current !== previous) {
		previous = current;
		current = current.replace(pattern, "");
	}
	return current;
}

/**
 * Reproduces docsify's heading-to-anchor slug algorithm (see
 * `src/core/render/slugify.js` in the docsify source) so links into
 * `utilities.md`/`getting-started.md` resolve to the same anchors docsify
 * renders at runtime.
 * @param {string} heading - The Markdown heading text to slugify.
 * @returns {string} The docsify-compatible anchor slug for `heading`.
 */
function slugify(heading: string): string {
	return removeUntilStable(heading.trim().normalize("NFC"), /<[^>]+>/g)
		.replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(VARIATION_SELECTOR_PATTERN, "")
		.replace(EMOJI_PATTERN, "")
		.replaceAll(/[A-Z]+/g, (match) => match.toLowerCase())
		.replace(SLUG_STRIP_PATTERN, "")
		.replaceAll(/\s/g, "-")
		.replace(/^(\d)/, "_$1");
}

const ABBREVIATION_PLACEHOLDER = String.fromCharCode(1);

/**
 * Extracts the first sentence of a paragraph, treating `e.g.`/`i.e.` as
 * abbreviations rather than sentence boundaries.
 * @param {string} paragraph - The paragraph to extract the first sentence from.
 * @returns {string} The first sentence of `paragraph`.
 */
function firstSentence(paragraph: string): string {
	const withoutLinks = paragraph.replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1");
	const protectedText = withoutLinks.replaceAll(
		/\b(e\.g|i\.e)\./gi,
		(_match, abbr: string) => `${abbr}${ABBREVIATION_PLACEHOLDER}`,
	);
	const match = /[\s\S]*?[.!?](?=\s|$)/.exec(protectedText);
	const sentence = match ? match[0] : protectedText;

	return sentence.split(ABBREVIATION_PLACEHOLDER).join(".").trim();
}

const DEPRECATION_MARKER = "**Deprecated:**";

/**
 * Extracts the `**Deprecated:** ...` sentence of a paragraph, without its markdown bold. The
 * description of an entry is its first sentence, and a deprecation notice never is the first
 * sentence, so without this it would be dropped from the generated index.
 * @param {string} paragraph - The paragraph to read the deprecation notice of.
 * @returns {string} The deprecation sentence, or an empty string when the paragraph carries none.
 */
function deprecationSentence(paragraph: string): string {
	const markerIndex = paragraph.indexOf(DEPRECATION_MARKER);

	if (markerIndex === -1) return "";

	return firstSentence(paragraph.slice(markerIndex).replaceAll("**", ""));
}

const UTIL_HEADING_PATTERN = /^#{2,3} ([a-z][A-Za-z0-9]*)\n/;

/**
 * Parses every function section of `utilities.md` into name/slug/description. A function section
 * starts with a `## <fn>` or `### <fn>` heading whose text is a bare identifier; the `##` family
 * headings that group most of them ("CPF", "Pix", ...) are skipped.
 * @param {string} utilitiesMd - The full contents of `utilities.md`.
 * @returns {UtilSection[]} One entry per function section, in document order.
 */
function parseUtilities(utilitiesMd: string): UtilSection[] {
	const sections = utilitiesMd
		.split(/^(?=#{2,3} )/m)
		.filter((section) => UTIL_HEADING_PATTERN.test(section));

	return sections.map((section) => {
		const newlineIndex = section.indexOf("\n");
		const name = section.slice(0, newlineIndex).replace(/^#+ /, "").trim();
		const body = section.slice(newlineIndex + 1);
		const [firstParagraphRaw = ""] = body.split(/\n\s*\n/);
		const firstParagraph = firstParagraphRaw.trim();
		const description = firstSentence(firstParagraph);
		const deprecation = description.includes(DEPRECATION_MARKER)
			? ""
			: deprecationSentence(firstParagraph);

		return {
			name,
			slug: slugify(name),
			description: deprecation === "" ? description : `${description} ${deprecation}`,
		};
	});
}

const FENCE_MARKER = "```";
const SUB_HEADING_PATTERN = /^#{2,3} (.+)$/;
const BACKTICKED_PATTERN = /`([^`]+)`/g;

/**
 * Collects the `##` and `###` headings of a page, in document order and outside code fences, so a
 * generated table of contents cannot drift from the page it indexes.
 * @param {string} markdown - The Markdown page to read the headings of.
 * @returns {string[]} The heading texts, in document order.
 */
function subHeadings(markdown: string): string[] {
	let insideFence = false;

	return markdown.split("\n").flatMap((line) => {
		if (line.startsWith(FENCE_MARKER)) {
			insideFence = !insideFence;
			return [];
		}

		if (insideFence) return [];

		const heading = SUB_HEADING_PATTERN.exec(line)?.[1];

		return heading === undefined ? [] : [heading.trim()];
	});
}

/**
 * Reads the util names listed in the "Bundle size" table of `getting-started.md`, so the summary
 * of the dataset-backed utils cannot drift from the table it summarizes.
 * @param {string} gettingStartedMd - The full contents of `getting-started.md`.
 * @returns {string[]} The util names of the table, in document order.
 */
function parseDatasetUtils(gettingStartedMd: string): string[] {
	const section = /\n## Bundle size\n([\s\S]*?)(?=\n## |$)/.exec(gettingStartedMd)?.[1] ?? "";

	return section
		.split("\n")
		.filter((row) => row.startsWith("| `"))
		.flatMap((row) =>
			[...(row.split("|")[1] ?? "").matchAll(BACKTICKED_PATTERN)].map(([, name]) => name),
		);
}

/**
 * Joins names into an English list, e.g. "`a`, `b` and `c`".
 * @param {string[]} names - The names to join, in order.
 * @returns {string} The names, backticked and comma-separated, with "and" before the last one.
 */
function joinNames(names: string[]): string {
	const quoted = names.map((name) => `\`${name}\``);
	const last = quoted.at(-1) ?? "";

	return quoted.length < 2 ? last : `${quoted.slice(0, -1).join(", ")} and ${last}`;
}

const PREFIX_GROUPS: { title: string; test: (name: string) => boolean }[] = [
	{ title: "Validators (isValid*)", test: (name) => name.startsWith("isValid") },
	{ title: "Formatters (format*)", test: (name) => name.startsWith("format") },
	{ title: "Parsers (parse*)", test: (name) => name.startsWith("parse") },
	{ title: "Generators (generate*)", test: (name) => name.startsWith("generate") },
	{ title: "Getters (get*)", test: (name) => name.startsWith("get") },
];

function groupUtilities(utils: UtilSection[]): { title: string; utils: UtilSection[] }[] {
	const groups: { title: string; utils: UtilSection[] }[] = PREFIX_GROUPS.map((group) => ({
		title: group.title,
		utils: [],
	}));
	const other: UtilSection[] = [];

	for (const util of utils) {
		const groupIndex = PREFIX_GROUPS.findIndex((group) => group.test(util.name));
		const matchedGroup = groupIndex === -1 ? undefined : groups[groupIndex];

		if (matchedGroup === undefined) {
			other.push(util);
		} else {
			matchedGroup.utils.push(util);
		}
	}

	if (other.length > 0) {
		groups.push({ title: "Other utilities", utils: other });
	}

	return groups.filter((group) => group.utils.length > 0);
}

function utilLink(util: UtilSection): string {
	return `- [${util.name}](${SITE}/utilities.md#${util.slug}): ${util.description}`;
}

function buildLlmsTxt(utils: UtilSection[], datasetUtils: string[]): string {
	const groups = groupUtilities(utils);
	const groupSections = groups
		.map((group) => `## ${group.title}\n\n${group.utils.map(utilLink).join("\n")}`)
		.join("\n\n");

	return `# Brazilian Utils

> Brazilian Utils is a zero-dependency JavaScript/TypeScript library of small, focused utilities for the day-to-day problems of building software for Brazil: validating, formatting, parsing and generating CPF, CNPJ, CEP, Pix, boleto, NF-e, phone numbers, license plates and more.

The package has **zero runtime dependencies**, is fully tree-shakeable and runs on Node.js \`^20.19.0 || >=22.12.0\`, Bun, Deno and modern browsers (including a UMD \`<script>\` build).

Install with \`npm install --save @brazilian-utils/brazilian-utils\` (also available via yarn, pnpm and bun). Import a util from the package root:

\`\`\`javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';
\`\`\`

Every util is also available as its own subpath for lazy-loading/code-splitting, \`@brazilian-utils/brazilian-utils/<kebab-name>\` (kebab-case of the function name, e.g. \`isValidCpf\` maps to \`is-valid-cpf\`) - most useful for the utils that embed an official dataset (${joinNames(datasetUtils)}):

\`\`\`javascript
const { getCities } = await import('@brazilian-utils/brazilian-utils/get-cities');
\`\`\`

## Docs

- [Getting started](${SITE}/getting-started.md): installation, runtime support, usage and bundle size/subpath imports
- [Utilities](${SITE}/utilities.md): full English reference, one section per function, with signatures and examples
- [Bundle size](${SITE}/getting-started.md#bundle-size): tree-shaking behavior and the dataset-backed utils that are worth a subpath import
- [Examples](${SITE}/examples.md): a CPF field that formats as you type and validates, in React, Vue, Angular and plain JavaScript

${groupSections}

## Optional

- [Getting started (pt-BR)](${SITE}/pt-br/getting-started.md): Portuguese translation of the getting started guide
- [Utilities (pt-BR)](${SITE}/pt-br/utilities.md): Portuguese translation of the utilities reference
- [README on GitHub](${REPO}#readme): project overview and contributor list
- [CHANGELOG](${REPO}/blob/main/CHANGELOG.md): release history
- [npm package](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils): published versions and download stats
`;
}

/**
 * Strips docsify-only markdown syntax (`?id=` anchors, HTML comments) so the content reads as
 * plain Markdown.
 * @param {string} markdown - The docsify-flavored Markdown to strip.
 * @returns {string} `markdown` with docsify-only syntax removed.
 */
function stripDocsifySyntax(markdown: string): string {
	return removeUntilStable(markdown, /<!--[\s\S]*?-->/g)
		.replaceAll(
			/\]\(([^)]+)\?id=([^)]+)\)/g,
			(_match, path: string, id: string) => `](${path}#${id})`,
		)
		.trimEnd();
}

/**
 * Demotes every markdown heading in `markdown` by one level (adds one `#`), so it nests under a
 * higher-level heading.
 * @param {string} markdown - The Markdown whose headings should be demoted.
 * @returns {string} `markdown` with every heading demoted by one level.
 */
function demoteHeadings(markdown: string): string {
	return markdown.replaceAll(/^(#{1,5}\s)/gm, "#$1");
}

function buildLlmsFullTxt(
	gettingStartedMd: string,
	utilitiesMd: string,
	utils: UtilSection[],
): string {
	const toc = [
		"- [Getting Started](#getting-started)",
		...subHeadings(gettingStartedMd).map((heading) => `  - [${heading}](#${slugify(heading)})`),
		"- [Utilities](#utilities)",
		...utils.map((util) => `  - [${util.name}](#${util.slug})`),
	].join("\n");

	const gettingStarted = demoteHeadings(stripDocsifySyntax(gettingStartedMd));
	const utilities = demoteHeadings(stripDocsifySyntax(utilitiesMd));

	return `# Brazilian Utils

> Brazilian Utils is a zero-dependency JavaScript/TypeScript library of small, focused utilities for the day-to-day problems of building software for Brazil. This file concatenates the full English documentation (getting started + utilities reference) in one Markdown document for LLM context loading.

## Table of contents

${toc}

${gettingStarted}

${utilities}
`;
}

/**
 * Replaces the front matter block of a page (its `title` and `description`, which the docsify
 * shell reads) with a level-one heading of its title, the heading the page shows on the site, so
 * the generated files keep reading as they did when the heading was in the Markdown.
 * @param {string} markdown - A docs page, with or without a front matter block.
 * @returns {string} The page body, headed by its front matter title when it has one.
 */
function frontMatterToHeading(markdown: string): string {
	const { fields, body } = parseFrontMatter(markdown);
	const title = fields["title"];

	return title === undefined ? body : `# ${title}\n\n${body}`;
}

function main(): void {
	const gettingStartedMd = frontMatterToHeading(
		readFileSync(join(DOCS_DIR, "getting-started.md"), "utf8"),
	);
	const utilitiesMd = frontMatterToHeading(readFileSync(join(DOCS_DIR, "utilities.md"), "utf8"));
	const utils = parseUtilities(utilitiesMd);

	writeFileSync(
		join(DOCS_DIR, "llms.txt"),
		buildLlmsTxt(utils, parseDatasetUtils(gettingStartedMd)),
	);
	writeFileSync(
		join(DOCS_DIR, "llms-full.txt"),
		buildLlmsFullTxt(gettingStartedMd, utilitiesMd, utils),
	);
}

main();
