/**
 * The front matter block the docs pages open with (`title`, `description` and `keywords`, read by
 * the docsify shell), parsed once for every script that generates files from the pages, so they
 * all read a page the same way.
 */

const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n+/;
const QUOTED_FIELD_PATTERN = /^(\w+): "(.*)"$/gm;

/** The parsed front matter of a page. */
export type FrontMatter = {
	/** The quoted string fields of the block, unescaped; `keywords` is not one of them. */
	fields: Record<string, string>;
	/** The page without its front matter block. */
	body: string;
};

/**
 * Splits a page into its front matter fields and its body.
 * @param {string} markdown - The page, with or without a front matter block.
 * @returns {FrontMatter} The quoted fields (empty when there is no block) and the body.
 */
export function parseFrontMatter(markdown: string): FrontMatter {
	const match = FRONT_MATTER_PATTERN.exec(markdown);

	if (!match) return { fields: {}, body: markdown };

	const fields: Record<string, string> = {};

	for (const [, name, value] of (match[1] ?? "").matchAll(QUOTED_FIELD_PATTERN)) {
		fields[name ?? ""] = (value ?? "").replaceAll(String.raw`\"`, '"');
	}

	return { fields, body: markdown.slice(match[0].length) };
}
