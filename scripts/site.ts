import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Keeps brazilian-utils.com.br crawlable as a set of real URLs. docsify runs in history mode there
 * (`routerMode: 'history'` in `docs/index.html`), so `/getting-started` has to answer with the
 * docsify shell: GitHub Pages serves `getting-started.html` for it, and this script writes that
 * file, and one per page of each `_sidebar.md`, from `docs/index.html`, with the page's own
 * title, description, canonical URL, language and hreflang pair in place of the home page's, so
 * a crawler that does not run JavaScript still reads the right metadata for each URL (the hook
 * in the shell keeps them right as the reader navigates). It also writes `404.html` and the
 * `sitemap.xml` that lists every page with its English/Portuguese counterpart. The Check
 * workflow fails when any of them is stale.
 */

const ROOT = join(import.meta.dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const SITE = "https://brazilian-utils.com.br";
const SITE_NAME = "Brazilian Utils";

/** The folder of each language, keyed by its hreflang, `""` being the English root. */
const LANGUAGES: { hreflang: string; folder: string; locale: string }[] = [
	{ hreflang: "en", folder: "", locale: "en_US" },
	{ hreflang: "pt-BR", folder: "pt-br", locale: "pt_BR" },
];

/**
 * The page `/pt-br/` shows (the `alias` in `docs/index.html`): the Portuguese site has no README,
 * so its home is the getting-started page, and `/pt-br/` canonicalizes there.
 */
const PT_BR_HOME_PAGE = "/pt-br/getting-started";

const SIDEBAR_LINK_PATTERN = /\]\(([^)]+)\.md\)/g;
const FRONT_MATTER_FIELD_PATTERN = /^(title|description): "(.*)"$/gm;

type Page = {
	/** The site path, `/getting-started`. */
	path: string;
	/** The path a crawler should index for it, the path itself except for the aliased `/pt-br/`. */
	canonicalPath: string;
	/** The language folder, `""` for the root. */
	folder: string;
	title: string;
	description: string;
	/** The Markdown file docsify loads for the path. */
	markdown: string;
};

/**
 * Reads the pages a `_sidebar.md` links to, as site paths (`/getting-started`).
 * @param {string} folder - The language folder the sidebar sits in, `""` for the root.
 * @returns {string[]} The page paths, in sidebar order.
 */
function sidebarPaths(folder: string): string[] {
	const sidebar = readFileSync(join(DOCS_DIR, folder, "_sidebar.md"), "utf8");

	return [...sidebar.matchAll(SIDEBAR_LINK_PATTERN)].map(([, target]) => `/${target ?? ""}`);
}

/**
 * Reads the quoted `title` and `description` of a page's front matter.
 * @param {string} markdown - The Markdown file, relative to `docs/`.
 * @returns {{ title: string; description: string }} The two fields, empty when absent.
 */
function frontMatter(markdown: string): { title: string; description: string } {
	const head = readFileSync(join(DOCS_DIR, markdown), "utf8").split("\n---\n")[0] ?? "";
	const fields: Record<string, string> = {};

	for (const [, field, value] of head.matchAll(FRONT_MATTER_FIELD_PATTERN)) {
		fields[field ?? ""] = (value ?? "").replaceAll(String.raw`\"`, '"');
	}

	return { title: fields["title"] ?? "", description: fields["description"] ?? "" };
}

/**
 * The pages of the site: each sidebar entry of each language, plus `/pt-br/`.
 * @returns {Page[]} The pages, English first.
 */
function pages(): Page[] {
	const sidebarPages = LANGUAGES.flatMap(({ folder }) =>
		sidebarPaths(folder).map((path): Page => {
			const markdown = `${path.slice(1)}.md`;
			const { title, description } = frontMatter(markdown);
			return { path, canonicalPath: path, folder, markdown, title, description };
		}),
	);
	const ptBrHome = sidebarPages.find((page) => page.path === PT_BR_HOME_PAGE);

	if (ptBrHome === undefined) throw new Error(`${PT_BR_HOME_PAGE} is not in pt-br/_sidebar.md`);

	return [...sidebarPages, { ...ptBrHome, path: "/pt-br/" }];
}

/**
 * The file GitHub Pages serves for a path: `index.html` for a folder, `<page>.html` otherwise.
 * @param {string} path - A site path.
 * @returns {string} The file path, relative to `docs/`.
 */
function shellFile(path: string): string {
	return path.endsWith("/") ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`;
}

/**
 * The same page in another language: `/pt-br/utilities` for `/utilities` and back; the English
 * home (`/`, the README) pairs with the Portuguese entry page.
 * @param {string} canonicalPath - A canonical site path.
 * @param {string} folder - The target language folder, `""` for the root.
 * @returns {string} The canonical path of the page in that language.
 */
function translate(canonicalPath: string, folder: string): string {
	if (canonicalPath === "/") return folder === "" ? "/" : PT_BR_HOME_PAGE;

	const bare = canonicalPath.replace(/^\/pt-br\//, "/");

	return folder === "" ? bare : `/${folder}${bare}`;
}

/**
 * Replaces the home page's value of a tag in the shell with the page's own, failing when the tag
 * is not in `index.html` any more, so an edit there cannot silently leave the copies stale.
 * @param {string} shell - The shell being rewritten.
 * @param {RegExp} tag - The tag to rewrite, its value as the first capture group.
 * @param {string} value - The page's value.
 * @returns {string} The rewritten shell.
 */
function replaceTag(shell: string, tag: RegExp, value: string): string {
	const match = tag.exec(shell);

	if (match?.[1] === undefined) throw new Error(`docs/index.html has no ${tag.source}`);

	const escaped = value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

	return shell.replace(match[0], match[0].replace(match[1], escaped));
}

/**
 * The shell with the page's metadata in place of the home page's.
 * @param {string} shell - `docs/index.html`.
 * @param {Page} page - The page the copy serves.
 * @returns {string} The copy.
 */
function pageShell(shell: string, page: Page): string {
	const language = LANGUAGES.find(({ folder }) => folder === page.folder);
	const canonical = `${SITE}${page.canonicalPath}`;
	const title = `${page.title} · ${SITE_NAME}`;
	let copy = shell;

	copy = replaceTag(copy, /<html lang="([^"]*)">/, language?.hreflang ?? "en");
	copy = replaceTag(copy, /<title>([^<]*)<\/title>/, title);
	copy = replaceTag(copy, /<meta name="description" content="([^"]*)" \/>/, page.description);
	copy = replaceTag(copy, /<link rel="canonical" href="([^"]*)" \/>/, canonical);
	for (const { hreflang, folder } of LANGUAGES) {
		const href = `${SITE}${translate(page.canonicalPath, folder)}`;
		copy = replaceTag(
			copy,
			new RegExp(`<link rel="alternate" hreflang="${hreflang}" href="([^"]*)" />`),
			href,
		);
	}
	copy = replaceTag(
		copy,
		/<link rel="alternate" hreflang="x-default" href="([^"]*)" \/>/,
		`${SITE}${translate(page.canonicalPath, "")}`,
	);
	copy = replaceTag(
		copy,
		/<link rel="alternate" type="text\/markdown" href="([^"]*)"/,
		`${SITE}/${page.markdown}`,
	);
	copy = replaceTag(copy, /<meta property="og:title" content="([^"]*)" \/>/, title);
	copy = replaceTag(
		copy,
		/<meta property="og:description" content="([^"]*)" \/>/,
		page.description,
	);
	copy = replaceTag(copy, /<meta property="og:url" content="([^"]*)" \/>/, canonical);
	copy = replaceTag(
		copy,
		/<meta property="og:locale" content="([^"]*)" \/>/,
		language?.locale ?? "en_US",
	);
	copy = replaceTag(
		copy,
		/<meta property="og:locale:alternate" content="([^"]*)" \/>/,
		language?.hreflang === "pt-BR" ? "en_US" : "pt_BR",
	);

	return copy;
}

/**
 * The shell for unknown URLs: the home page's metadata, titled as not found and kept out of the
 * index, since GitHub Pages serves it with a 404 status but a crawler may still read the tags.
 * @param {string} shell - `docs/index.html`.
 * @returns {string} The copy.
 */
function notFoundShell(shell: string): string {
	const copy = replaceTag(shell, /<title>([^<]*)<\/title>/, `Not found · ${SITE_NAME}`);

	return copy.replace("<title>", '<meta name="robots" content="noindex" />\n  <title>');
}

function buildSitemap(sitePages: Page[]): string {
	const entries = sitePages.map((page) => {
		const alternates = LANGUAGES.map(
			({ hreflang, folder }) =>
				`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${SITE}${translate(page.canonicalPath, folder)}" />`,
		);

		return [
			"  <url>",
			`    <loc>${SITE}${page.canonicalPath}</loc>`,
			...alternates,
			"  </url>",
		].join("\n");
	});

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

function main(): void {
	const shell = readFileSync(join(DOCS_DIR, "index.html"), "utf8");
	const sitePages = pages();

	for (const page of sitePages) {
		const file = join(DOCS_DIR, shellFile(page.path));
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, pageShell(shell, page));
	}

	writeFileSync(join(DOCS_DIR, "404.html"), notFoundShell(shell));

	// The home page is `index.html` itself; `/pt-br/` canonicalizes to its entry page, so the sitemap
	// lists the canonical paths once.
	const home: Page = {
		path: "/",
		canonicalPath: "/",
		folder: "",
		title: SITE_NAME,
		description: "",
		markdown: "README.md",
	};
	const canonicalPages = sitePages.filter((page) => page.path === page.canonicalPath);
	writeFileSync(join(DOCS_DIR, "sitemap.xml"), buildSitemap([home, ...canonicalPages]));
}

main();
