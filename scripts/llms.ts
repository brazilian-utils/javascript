import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const SITE = "https://brazilian-utils.com.br";
const REPO = "https://github.com/brazilian-utils/javascript";

type UtilSection = {
	name: string;
	slug: string;
	description: string;
};

const SLUG_STRIP_PATTERN = new RegExp(
	"[\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,./:;<=>?@\\[\\]^`{|}~]",
	"g",
);
const VARIATION_SELECTOR_PATTERN = new RegExp("\\uFE0F", "g");
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
	const match = protectedText.match(/[\s\S]*?[.!?](?=\s|$)/);
	const sentence = match ? match[0] : protectedText;

	return sentence.split(ABBREVIATION_PLACEHOLDER).join(".").trim();
}

/**
 * Parses every `## <fn>` section of `utilities.md` into name/slug/description.
 * @param {string} utilitiesMd - The full contents of `utilities.md`.
 * @returns {UtilSection[]} One entry per `## <fn>` section, in document order.
 */
function parseUtilities(utilitiesMd: string): UtilSection[] {
	const sections = utilitiesMd.split(/^## /m).slice(1);

	return sections.map((section) => {
		const newlineIndex = section.indexOf("\n");
		const name = section.slice(0, newlineIndex).trim();
		const body = section.slice(newlineIndex + 1);
		const [firstParagraphRaw = ""] = body.split(/\n\s*\n/);
		const firstParagraph = firstParagraphRaw.trim();

		return {
			name,
			slug: slugify(name),
			description: firstSentence(firstParagraph),
		};
	});
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

function buildLlmsTxt(utils: UtilSection[]): string {
	const groups = groupUtilities(utils);
	const groupSections = groups
		.map((group) => `## ${group.title}\n\n${group.utils.map(utilLink).join("\n")}`)
		.join("\n\n");

	return `# Brazilian Utils

> Brazilian Utils is a zero-dependency JavaScript/TypeScript library of small, focused utilities for the day-to-day problems of building software for Brazilian businesses: validating, formatting, parsing and generating documents (CPF, CNPJ, CEP, Pix, boleto, NF-e, phone numbers, license plates and more).

The package has **zero runtime dependencies**, is fully tree-shakeable and runs on Node.js \`^20.19.0 || >=22.12.0\`, Bun, Deno and modern browsers (including a UMD \`<script>\` build).

Install with \`npm install --save @brazilian-utils/brazilian-utils\` (also available via yarn, pnpm and bun). Import a util from the package root:

\`\`\`javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';
\`\`\`

Every util is also available as its own subpath for lazy-loading/code-splitting, \`@brazilian-utils/brazilian-utils/<kebab-name>\` (kebab-case of the function name, e.g. \`isValidCpf\` maps to \`is-valid-cpf\`) - most useful for \`getCities\`, the one util that embeds a large dataset:

\`\`\`javascript
const { getCities } = await import('@brazilian-utils/brazilian-utils/get-cities');
\`\`\`

## Docs

- [Getting started](${SITE}/getting-started.md): installation, runtime support, usage and bundle size/subpath imports
- [Utilities](${SITE}/utilities.md): full English reference, one section per function, with signatures and examples
- [Bundle size](${SITE}/getting-started.md#bundle-size): tree-shaking behavior and the \`getCities\`/subpath-import exception

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
 * Demotes every markdown heading in `markdown` by `levels` (adds `#`s), so it nests under a
 * higher-level heading.
 * @param {string} markdown - The Markdown whose headings should be demoted.
 * @param {number} levels - How many `#`s to add to each heading.
 * @returns {string} `markdown` with every heading demoted by `levels`.
 */
function demoteHeadings(markdown: string, levels: number): string {
	return markdown.replaceAll(
		/^(#{1,5})(\s)/gm,
		(_match, hashes: string, space: string) => `${"#".repeat(hashes.length + levels)}${space}`,
	);
}

function buildLlmsFullTxt(
	gettingStartedMd: string,
	utilitiesMd: string,
	utils: UtilSection[],
): string {
	const toc = [
		"- [Getting Started](#getting-started)",
		...["Installation", "Runtime support", "Usage", "Bundle size"].map(
			(heading) => `  - [${heading}](#${slugify(heading)})`,
		),
		"- [Utilities](#utilities)",
		...utils.map((util) => `  - [${util.name}](#${util.slug})`),
	].join("\n");

	const gettingStarted = demoteHeadings(stripDocsifySyntax(gettingStartedMd), 1);
	const utilities = demoteHeadings(stripDocsifySyntax(utilitiesMd), 1);

	return `# Brazilian Utils

> Brazilian Utils is a zero-dependency JavaScript/TypeScript library of small, focused utilities for the day-to-day problems of building software for Brazilian businesses. This file concatenates the full English documentation (getting started + utilities reference) in one Markdown document for LLM context loading.

## Table of contents

${toc}

${gettingStarted}

${utilities}
`;
}

function main(): void {
	const gettingStartedMd = readFileSync(join(DOCS_DIR, "getting-started.md"), "utf8");
	const utilitiesMd = readFileSync(join(DOCS_DIR, "utilities.md"), "utf8");
	const utils = parseUtilities(utilitiesMd);

	writeFileSync(join(DOCS_DIR, "llms.txt"), buildLlmsTxt(utils));
	writeFileSync(
		join(DOCS_DIR, "llms-full.txt"),
		buildLlmsFullTxt(gettingStartedMd, utilitiesMd, utils),
	);
}

main();
