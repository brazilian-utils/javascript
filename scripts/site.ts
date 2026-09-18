import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Keeps brazilian-utils.com.br crawlable as a set of real URLs. docsify runs in history mode there
 * (`routerMode: 'history'` in `docs/index.html`), so `/getting-started` has to answer with the
 * docsify shell: GitHub Pages serves `getting-started.html` for it, and this script writes that
 * file, and one per page of each `_sidebar.md`, as a copy of `docs/index.html`, plus the
 * `sitemap.xml` that lists every page with its English/Portuguese counterpart. The Check
 * workflow fails when the copies or the sitemap are stale.
 */

const ROOT = join(import.meta.dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const SITE = "https://brazilian-utils.com.br";

/** The folder of each language, keyed by its hreflang, `""` being the English root. */
const LANGUAGES: { hreflang: string; folder: string }[] = [
	{ hreflang: "en", folder: "" },
	{ hreflang: "pt-BR", folder: "pt-br" },
];

const SIDEBAR_LINK_PATTERN = /\]\(([^)]+)\.md\)/g;

/**
 * Reads the pages a `_sidebar.md` links to, as site paths (`/getting-started`).
 * @param {string} folder - The language folder the sidebar sits in, `""` for the root.
 * @returns {string[]} The page paths, in sidebar order.
 */
function sidebarPages(folder: string): string[] {
	const sidebar = readFileSync(join(DOCS_DIR, folder, "_sidebar.md"), "utf8");

	return [...sidebar.matchAll(SIDEBAR_LINK_PATTERN)].map(([, target]) => `/${target ?? ""}`);
}

/**
 * The paths a language serves: its home (`/` or `/pt-br/`) and its sidebar pages.
 * @param {string} folder - The language folder, `""` for the root.
 * @returns {string[]} The paths, home first.
 */
function languagePaths(folder: string): string[] {
	return [folder === "" ? "/" : `/${folder}/`, ...sidebarPages(folder)];
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
 * The same page in another language: `/pt-br/utilities` for `/utilities` and back.
 * @param {string} path - A site path.
 * @param {string} folder - The target language folder, `""` for the root.
 * @returns {string} The path of the page in that language.
 */
function translate(path: string, folder: string): string {
	const bare = path.replace(/^\/pt-br(\/|$)/, "/");

	return folder === "" ? bare : `/${folder}${bare}`;
}

function buildSitemap(paths: string[]): string {
	const entries = paths.map((path) => {
		const alternates = LANGUAGES.map(
			({ hreflang, folder }) =>
				`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${SITE}${translate(path, folder)}" />`,
		);

		return [`  <url>`, `    <loc>${SITE}${path}</loc>`, ...alternates, `  </url>`].join("\n");
	});

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

function main(): void {
	const shell = readFileSync(join(DOCS_DIR, "index.html"), "utf8");
	const paths = LANGUAGES.flatMap(({ folder }) => languagePaths(folder));

	// `/` is `index.html` itself; `/404` gives unknown URLs the shell instead of the host's page.
	for (const path of [...paths.filter((candidate) => candidate !== "/"), "/404"]) {
		const file = join(DOCS_DIR, shellFile(path));
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, shell);
	}

	writeFileSync(join(DOCS_DIR, "sitemap.xml"), buildSitemap(paths));
}

main();
