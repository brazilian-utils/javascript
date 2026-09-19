#!/usr/bin/env node

/**
 * Validates the public API of the local build (`dist/brazilian-utils.d.ts`, so run
 * `npm run build` first) and compares it with the last release published on npm.
 *
 * Usage:
 *   node scripts/api.ts
 *
 * 1. Runs API Extractor with the settings of `api-extractor.json`: a type the public API refers to
 *    without exporting (`ae-forgotten-export`), a public declaration without a doc comment
 *    (`ae-undocumented`) and a compiler error in the bundled declarations fail. It runs as a local
 *    build, so it never compares against a committed report: the report is written to a temporary
 *    directory outside the repository and deleted at the end.
 * 2. Downloads `@brazilian-utils/brazilian-utils@latest` with `npm pack` into the same temporary
 *    directory and checks, with the repository's `tsc`, that this build can replace it without
 *    breaking a consumer (see `renderBreakingCheck` for the rules). A breaking change fails, unless
 *    `package.json` is already on a higher major version than the published one.
 * 3. Prints the declarations added, removed and changed since that release (from the two API
 *    Extractor reports) to stdout and, in GitHub Actions, to the job summary. Informational only.
 *
 * Exit code 1 means a check failed; exit code 2 means the check itself could not run (no build,
 * registry unreachable, unreadable tarball). A package that was never published skips steps 2-3.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import {
	Extractor,
	ExtractorConfig,
	ExtractorLogLevel,
	ExtractorMessageCategory,
} from "@microsoft/api-extractor";

const rootDir = resolve(import.meta.dirname, "..");

/** The outcome of a child process: its exit status and output. */
type RunResult = {
	ok: boolean;
	stdout: string;
	stderr: string;
};

const run = (command: string, args: string[], cwd = rootDir): Promise<RunResult> =>
	new Promise((_resolve) => {
		execFile(command, args, { cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
			_resolve({ ok: error === null, stdout, stderr: stderr || (error?.message ?? "") });
		});
	});

const packageName = "@brazilian-utils/brazilian-utils";
const entryName = "brazilian-utils";
const reportFileName = `${entryName}.api.md`;

/** Exit code of a check that ran and failed. */
const FAILURE_EXIT_CODE = 1;

/** Exit code of a check that could not run (no build, registry unreachable, bad tarball). */
const ERROR_EXIT_CODE = 2;

/** One exported declaration of an API Extractor report, overloads merged into one entry. */
type Declaration = {
	name: string;
	kind: "value" | "type" | "class";
	text: string;
	generic: boolean;
};

/** How consumers receive a named type: as something they pass in, get back, or both. */
type Role = "input" | "output";

/** The subpath entry points of a package, and every declaration file of it joined. */
type Subpaths = {
	entries: Map<string, string>;
	sources: string;
};

/** One assertion of the generated type-check file, so a compiler error maps back to a reason. */
type Assertion = {
	code: string;
	reason: string;
};

class CheckError extends Error {}

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

const readVersion = async (packageJsonPath: string): Promise<string> => {
	const parsed = await readJson(packageJsonPath);

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("version" in parsed) ||
		typeof parsed.version !== "string"
	) {
		throw new CheckError(`${packageJsonPath} has no version`);
	}

	return parsed.version;
};

const major = (version: string): number => Number.parseInt(version.split(".")[0] ?? "", 10);

/**
 * Runs API Extractor over one `.d.ts` entry point and returns the path of the report it wrote.
 * @param {object} options - What to extract and where.
 * @param {string} options.configPath - The `api-extractor.json` whose settings are used.
 * @param {string} options.reportDir - The directory the report is written to.
 * @param {string} [options.packageDir] - The root of a package other than this repository (the
 * published tarball): its entry point is used, its compiler errors and messages are ignored.
 * @returns {Promise<{ succeeded: boolean; reportPath: string }>} Whether the run had no error, and
 * the report path.
 */
const extract = async ({
	configPath,
	reportDir,
	packageDir,
}: {
	configPath: string;
	reportDir: string;
	packageDir?: string;
}): Promise<{ succeeded: boolean; reportPath: string }> => {
	await mkdir(reportDir, { recursive: true });

	const configObject = ExtractorConfig.loadFile(configPath);
	configObject.apiReport = {
		enabled: true,
		reportFolder: reportDir,
		reportTempFolder: join(reportDir, "temp"),
		reportFileName,
	};

	if (packageDir !== undefined) {
		configObject.projectFolder = packageDir;
		configObject.mainEntryPointFilePath = join(packageDir, "dist", `${entryName}.d.ts`);
		configObject.compiler = {
			overrideTsconfig: {
				compilerOptions: {
					lib: ["ESNext", "DOM"],
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "bundler",
					strict: true,
					skipLibCheck: true,
				},
			},
		};
		configObject.messages = {
			compilerMessageReporting: { default: { logLevel: ExtractorLogLevel.None } },
			extractorMessageReporting: {
				default: { logLevel: ExtractorLogLevel.None, addToApiReportFile: false },
			},
			tsdocMessageReporting: { default: { logLevel: ExtractorLogLevel.None } },
		};
	}

	const config = ExtractorConfig.prepare({
		configObject,
		configObjectFullPath: packageDir === undefined ? configPath : join(packageDir, "api.json"),
		packageJsonFullPath: join(packageDir ?? rootDir, "package.json"),
	});
	const result = Extractor.invoke(config, {
		localBuild: true,
		messageCallback: (message) => {
			message.handled = true;

			const reported =
				message.category !== ExtractorMessageCategory.Console &&
				(message.logLevel === ExtractorLogLevel.Error ||
					message.logLevel === ExtractorLogLevel.Warning);

			if (packageDir === undefined && reported) {
				console.error(`${message.logLevel}: ${message.formatMessageWithLocation(rootDir)}`);
			}
		},
	});

	return { succeeded: result.succeeded, reportPath: join(reportDir, reportFileName) };
};

const DECLARATION_PATTERN =
	/^export (?:declare )?(?:abstract )?(const|let|var|function|class|enum|type|interface|namespace) ([\w$]+)(<)?/m;

const kindOf = (keyword: string): Declaration["kind"] => {
	if (keyword === "class") return "class";
	return keyword === "type" || keyword === "interface" ? "type" : "value";
};

/**
 * Reads the declarations of an API Extractor report: the fenced block is one declaration per
 * paragraph, each preceded by its `// @public` line; overloads are consecutive paragraphs.
 * @param {string} report - The report file contents.
 * @returns {Map<string, Declaration>} The declarations by exported name.
 */
const parseReport = (report: string): Map<string, Declaration> => {
	const body = /```ts\n([\s\S]*)\n```/.exec(report)?.[1] ?? "";
	const declarations = new Map<string, Declaration>();

	for (const paragraph of body.split(/\n{2,}/)) {
		const match = DECLARATION_PATTERN.exec(paragraph);

		if (match === null) continue;

		const [, keyword = "", name = "", generic] = match;
		const text = paragraph.trim();
		const existing = declarations.get(name);

		if (existing === undefined) {
			declarations.set(name, { name, kind: kindOf(keyword), text, generic: generic === "<" });
		} else {
			existing.text = `${existing.text}\n\n${text}`;
		}
	}

	if (declarations.size === 0) {
		throw new CheckError(
			"The API Extractor report has no declarations; its format may have changed",
		);
	}

	return declarations;
};

const identifiers = (text: string): Set<string> => new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []);

/**
 * Splits the text of a function declaration into its parameter list and its return type.
 * @param {string} signature - One signature, from the first `(` to the end.
 * @returns {{ params: string; returns: string } | null} The two parts, or null when the text is not
 * a call signature.
 */
const splitSignature = (signature: string): { params: string; returns: string } | null => {
	const start = signature.indexOf("(");

	if (start === -1) return null;

	let depth = 0;
	for (let index = start; index < signature.length; index++) {
		const char = signature[index];

		if (char === "(") depth += 1;
		if (char === ")") depth -= 1;
		if (depth === 0) {
			return {
				params: signature.slice(start + 1, index),
				returns: signature.slice(index + 1).replace(/^\s*(?:=>|:)/, ""),
			};
		}
	}

	return null;
};

/**
 * Marks the types one signature of a value export refers to: in a parameter (of a function or a
 * constructor) as input, in a return type or a non-function type as output. An alias of another
 * export (`typeof formatCep`) marks nothing, the export it names does.
 * @param {string} signature - One paragraph of the report, a single signature.
 * @param {Function} mark - Marks the exported types the given text refers to with a role.
 */
const markSignature = (signature: string, mark: (text: string, role: Role) => void): void => {
	const code = signature.replaceAll(/^\/\/.*\n/gm, "");
	const typeText = code.replace(DECLARATION_PATTERN, "").replace(/^\s*:/, "");
	const constructors = code.match(/constructor\([^)]*\)/g);

	if (/^\s*typeof /.test(typeText)) return;
	if (constructors !== null) {
		for (const constructorText of constructors) mark(constructorText, "input");
		return;
	}

	const parts = splitSignature(typeText);

	if (parts === null) {
		mark(typeText, "output");
		return;
	}

	mark(parts.params, "input");
	mark(parts.returns, "output");
};

/**
 * Finds which exported types consumers pass in (they appear in a parameter of an exported
 * function or constructor) and which they get back (a return type, a thrown class, or a type
 * reached from a non-function export), following the types each type refers to. A type nothing
 * refers to that only renames another one (`type GetHolidaysOptions = GetHolidaysParams`) takes the
 * roles of the type it renames.
 * @param {Map<string, Declaration>} declarations - The published declarations.
 * @returns {Map<string, Set<Role>>} The roles of every type that has one.
 */
const typeRoles = (declarations: Map<string, Declaration>): Map<string, Set<Role>> => {
	const typeNames = new Set(
		[...declarations.values()].filter((d) => d.kind !== "value").map((d) => d.name),
	);
	const roles = new Map<string, Set<Role>>();
	const pending: [string, Role][] = [];
	const mark = (text: string, role: Role): void => {
		for (const name of identifiers(text)) {
			if (typeNames.has(name)) pending.push([name, role]);
		}
	};

	for (const declaration of declarations.values()) {
		if (declaration.kind === "type") continue;
		if (declaration.kind === "class") pending.push([declaration.name, "output"]);

		for (const signature of declaration.text.split(/\n\n/)) markSignature(signature, mark);
	}

	while (pending.length > 0) {
		const [name, role] = pending.pop() ?? ["", "input"];
		const known = roles.get(name) ?? new Set<Role>();

		if (known.has(role)) continue;

		known.add(role);
		roles.set(name, known);
		mark(declarations.get(name)?.text.replace(DECLARATION_PATTERN, "") ?? "", role);
	}

	for (const declaration of declarations.values()) {
		const target = /^export type [\w$]+ = ([\w$]+);$/m.exec(declaration.text)?.[1];
		const targetRoles = target === undefined ? undefined : roles.get(target);

		if (!roles.has(declaration.name) && targetRoles !== undefined) {
			roles.set(declaration.name, targetRoles);
		}
	}

	return roles;
};

/**
 * Lists the subpath entry points of a package (`dist/<util>.d.ts`, imported as
 * `@brazilian-utils/brazilian-utils/<util>`): every declaration file but the root and the shared
 * chunks the others import.
 * @param {string} distDir - The `dist` directory.
 * @returns {Promise<Subpaths>} The contents of each entry by subpath, and every declaration file
 * joined (to find what a re-exported name is).
 */
const readSubpaths = async (distDir: string): Promise<Subpaths> => {
	const allFiles = await readdir(distDir);
	const files = allFiles.filter((file) => file.endsWith(".d.ts")).sort();
	const texts = await Promise.all(files.map((file) => readFile(join(distDir, file), "utf8")));
	const entries = new Map(
		files.map((file, index) => [file.slice(0, -".d.ts".length), texts[index] ?? ""]),
	);

	entries.delete(entryName);
	for (const text of texts) {
		for (const [, chunk = ""] of text.matchAll(/from "\.\/([^"]+)\.js"/g)) entries.delete(chunk);
	}

	return { entries, sources: texts.join("\n") };
};

const EXPORT_PATTERN =
	/^export (?:declare )?(?:abstract )?(const|let|var|function|class|enum|type|interface|namespace) ([\w$]+)/gm;

/**
 * Reads the names a subpath declaration file exports, split into values and types. A name
 * re-exported from a shared chunk without the `type` modifier is looked up in `sources`.
 * @param {string} subpath - The subpath, for the error message.
 * @param {string} text - The declaration file contents.
 * @param {string} sources - Every declaration file of the package, joined.
 * @returns {{ values: string[]; types: string[] }} The exported names.
 */
const subpathExports = (
	subpath: string,
	text: string,
	sources: string,
): { values: string[]; types: string[] } => {
	const values = new Set<string>();
	const types = new Set<string>();
	const isTypeDeclaration = (name: string): boolean => {
		const escaped = name.replaceAll("$", String.raw`\$`);
		return new RegExp(
			String.raw`^(?:export )?(?:declare )?(?:type|interface) ${escaped}\b`,
			"m",
		).test(sources);
	};

	for (const [, keyword = "", name = ""] of text.matchAll(EXPORT_PATTERN)) {
		(kindOf(keyword) === "type" ? types : values).add(name);
	}
	for (const [, typeOnly, list = ""] of text.matchAll(/^export (type )?\{([^}]*)\}/gm)) {
		for (const item of list.split(",")) {
			const parts = item.trim().split(/\s+/);
			const name = parts.at(-1) ?? "";
			const isType = typeOnly !== undefined || parts[0] === "type" || isTypeDeclaration(name);

			if (name !== "") (isType ? types : values).add(name);
		}
	}

	if (values.size === 0 && types.size === 0) {
		throw new CheckError(
			`Found no export in the published ${subpath}.d.ts; its format may have changed`,
		);
	}

	return { values: [...values].sort(), types: [...types].sort() };
};

const identifier = (value: string): string => value.replaceAll(/[^\w$]/g, "_");

const moduleSpecifier = (fromDir: string, file: string): string => {
	const path = relative(fromDir, file).replaceAll("\\", "/");
	return path.startsWith(".") ? path : `./${path}`;
};

/**
 * Lists what a published subpath entry point no longer ships in this build: its files, then the
 * names it exported.
 * @param {object} options - The subpath to compare.
 * @param {string} options.subpath - The subpath.
 * @param {string} options.text - Its published declaration file.
 * @param {string | undefined} options.current - Its declaration file in this build, if any.
 * @param {Subpaths} options.baseSubpaths - The published subpath entry points.
 * @param {Subpaths} options.headSubpaths - The subpath entry points of this build.
 * @param {string[]} options.removed - Receives one line per missing file or name.
 * @returns {string[]} The published value exports this build still has, to type-check.
 */
const compareSubpath = ({
	subpath,
	text,
	current,
	baseSubpaths,
	headSubpaths,
	removed,
}: {
	subpath: string;
	text: string;
	current: string | undefined;
	baseSubpaths: Subpaths;
	headSubpaths: Subpaths;
	removed: string[];
}): string[] => {
	for (const extension of [".js", ".cjs", ".d.ts", ".d.cts"]) {
		if (!existsSync(join(rootDir, "dist", `${subpath}${extension}`))) {
			removed.push(`subpath "${subpath}": dist/${subpath}${extension} is no longer built`);
		}
	}
	if (current === undefined) return [];

	const published = subpathExports(subpath, text, baseSubpaths.sources);
	const exported = subpathExports(subpath, current, headSubpaths.sources);
	const currentNames = new Set([...exported.values, ...exported.types]);

	for (const name of [...published.values, ...published.types]) {
		if (!currentNames.has(name))
			removed.push(`subpath "${subpath}": \`${name}\` is no longer exported`);
	}

	return published.values.filter((name) => currentNames.has(name));
};

/**
 * Builds the assertions a consumer of the published version relies on, as TypeScript that only
 * compiles when this build can replace it:
 * - every value export still exists and is assignable to the published one, so a parameter can
 *   only be widened or become optional, a new parameter must be optional, and a return type can
 *   only keep or narrow its values;
 * - a function's return type does not narrow either (union of all overloads): a consumer that
 *   stored the result in an inferred variable (`let bank = getBankByCode(code)`) and later assigns
 *   the old type to it (`bank = null`) would stop compiling;
 * - every type export still exists under the same name; one only passed in may widen (the published
 *   type is assignable to the new one), any other must be equivalent (assignable both ways), so a
 *   type consumers receive or build keeps its shape (new properties must be optional);
 * - every subpath entry point still exists and exports the same names, its values with the same
 *   guarantees (its types are the root ones, checked above).
 * @param {object} options - What to compare.
 * @param {string} options.checkDir - The directory the generated file is written to.
 * @param {string} options.baseDir - The published package root.
 * @param {Map<string, Declaration>} options.base - The published declarations.
 * @param {Map<string, Declaration>} options.head - The declarations of this build.
 * @param {Subpaths} options.baseSubpaths - The published subpath entry points.
 * @param {Subpaths} options.headSubpaths - The subpath entry points of this build.
 * @returns {{ source: string; assertions: Assertion[]; removed: string[]; skipped: string[] }} The
 * generated file, the assertion behind each line, what this build no longer ships, and the generic
 * types whose shape is only shown in the diff (they cannot be named without type arguments).
 */
const renderBreakingCheck = ({
	checkDir,
	baseDir,
	base,
	head,
	baseSubpaths,
	headSubpaths,
}: {
	checkDir: string;
	baseDir: string;
	base: Map<string, Declaration>;
	head: Map<string, Declaration>;
	baseSubpaths: Subpaths;
	headSubpaths: Subpaths;
}): { source: string; assertions: Assertion[]; removed: string[]; skipped: string[] } => {
	const header = [
		"type Assignable<Target, Source extends Target> = [Target, Source];",
		"type Returns<F> = F extends {",
		"\t(...args: never[]): infer R1;",
		"\t(...args: never[]): infer R2;",
		"\t(...args: never[]): infer R3;",
		"\t(...args: never[]): infer R4;",
		"}",
		"\t? R1 | R2 | R3 | R4",
		"\t: F extends (...args: never[]) => infer R",
		"\t\t? R",
		"\t\t: never;",
	];
	const assertions: Assertion[] = [];
	const removed: string[] = [];
	const skipped: string[] = [];
	const imports: string[] = [];
	const roles = typeRoles(base);

	const addModule = (label: string, alias: string, subpath: string, names: string[]): void => {
		const oldAlias = `Old${alias}`;
		const newAlias = `New${alias}`;

		const file = `${subpath}.js`;
		const oldSpecifier = moduleSpecifier(checkDir, join(baseDir, "dist", file));
		const newSpecifier = moduleSpecifier(checkDir, join(rootDir, "dist", file));

		imports.push(
			`import type * as ${oldAlias} from "${oldSpecifier}";`,
			`import * as ${newAlias} from "${newSpecifier}";`,
		);
		for (const name of names) {
			const id = `${alias}_${identifier(name)}`;
			assertions.push(
				{
					code: `const _value_${id}: typeof ${oldAlias}.${name} = ${newAlias}.${name};`,
					reason: `${label}: \`${name}\` is not assignable to the published one (a parameter became required or narrower, a required parameter was added, or the return type widened)`,
				},
				{
					code: `type _returns_${id} = Assignable<Returns<typeof ${newAlias}.${name}>, Returns<typeof ${oldAlias}.${name}>>;`,
					reason: `${label}: \`${name}\` can no longer return everything the published one did (the return type narrowed, or a returned object gained a required property), so a variable inferred from its result no longer holds the published type`,
				},
			);
		}
	};

	for (const declaration of base.values()) {
		if (!head.has(declaration.name)) {
			removed.push(`root: \`${declaration.name}\` is no longer exported`);
		}
	}

	addModule(
		"root",
		"",
		entryName,
		[...base.values()].filter((d) => d.kind !== "type" && head.has(d.name)).map((d) => d.name),
	);

	for (const type of base.values()) {
		const name = type.name;
		const typeRole = roles.get(name);

		if (type.kind === "value" || !head.has(name)) continue;
		if (type.generic) {
			skipped.push(name);
			continue;
		}

		assertions.push({
			code: `type _widens_${identifier(name)} = Assignable<New.${name}, Old.${name}>;`,
			reason: `root: type \`${name}\` rejects values the published type accepts (a union member was removed, a property became required or narrower, or a required property was added)`,
		});
		if (typeRole === undefined || typeRole.has("output")) {
			assertions.push({
				code: `type _narrows_${identifier(name)} = Assignable<Old.${name}, New.${name}>;`,
				reason: `root: type \`${name}\` (${typeRole === undefined ? "used by no function" : "returned or thrown"}, so it keeps its shape) accepts values the published type rejects (a union member was added, or a property was removed or widened)`,
			});
		}
	}

	for (const [subpath, text] of baseSubpaths.entries) {
		const current = headSubpaths.entries.get(subpath);
		const kept = compareSubpath({ subpath, text, current, baseSubpaths, headSubpaths, removed });

		if (current === undefined) continue;

		addModule(`subpath "${subpath}"`, `_${identifier(subpath)}`, subpath, kept);
	}

	const source = [...header, ...imports, ...assertions.map((a) => a.code), ""].join("\n");
	return { source, assertions, removed, skipped };
};

/**
 * Type-checks the generated file with the repository's `tsc` and maps each error to its reason.
 * @param {string} checkDir - The directory holding the generated file.
 * @param {string} source - The generated file contents.
 * @param {Assertion[]} assertions - The assertion behind each line, in file order.
 * @param {Map<string, string>} labels - Short names for the absolute paths in compiler messages.
 * @returns {Promise<string[]>} One message per failed assertion, empty when none failed.
 */
const typeCheck = async (
	checkDir: string,
	source: string,
	assertions: Assertion[],
	labels: Map<string, string>,
): Promise<string[]> => {
	const file = join(checkDir, "check.ts");
	await writeFile(file, source);
	await writeFile(
		join(checkDir, "tsconfig.json"),
		JSON.stringify({
			compilerOptions: {
				lib: ["ESNext", "DOM"],
				target: "ESNext",
				module: "ESNext",
				moduleResolution: "bundler",
				strict: true,
				noEmit: true,
				skipLibCheck: true,
				types: [],
			},
			files: ["check.ts"],
		}),
	);

	const tsc = join(rootDir, "node_modules", "typescript", "bin", "tsc");
	const { stdout: output } = await run(process.execPath, [
		tsc,
		"-p",
		checkDir,
		"--pretty",
		"false",
	]);

	const lines = source.split("\n");
	const byLine = new Map(assertions.map((a) => [lines.indexOf(a.code) + 1, a]));
	const failures = new Map<number, string[]>();
	let current: string[] | undefined;

	for (const line of output.split("\n")) {
		const match = /^(.+?)\((\d+),\d+\): error (TS\d+: .*)$/.exec(line);

		if (match === null) {
			if (current !== undefined && line.trim() !== "") current.push(line.trim());
			continue;
		}

		const [, errorFile = "", lineNumber = "0", message = ""] = match;

		if (resolve(checkDir, errorFile) !== file || !byLine.has(Number(lineNumber))) {
			throw new CheckError(`Unexpected compiler error in the generated check:\n${line}`);
		}

		current = failures.get(Number(lineNumber)) ?? [];
		current.push(message);
		failures.set(Number(lineNumber), current);
	}

	return [...failures]
		.sort(([a], [b]) => a - b)
		.map(([lineNumber, messages]) => {
			const assertion = byLine.get(lineNumber);
			const details = messages.map((message) => {
				let short = message;
				for (const [path, label] of labels) short = short.replaceAll(path, label);
				return `    ${short}`;
			});
			return `- ${assertion?.reason ?? ""}\n${details.join("\n")}`;
		});
};

/**
 * A line diff (longest common subsequence) of two declarations, for the reviewer summary.
 * @param {string} before - The published text.
 * @param {string} after - The current text.
 * @returns {string} The lines prefixed with `-`, `+` or a space.
 */
const lineDiff = (before: string, after: string): string => {
	const a = before.split("\n");
	const b = after.split("\n");
	const lengths = Array.from({ length: a.length + 1 }, () =>
		Array.from<number>({ length: b.length + 1 }).fill(0),
	);

	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			const row = lengths[i] ?? [];
			row[j] =
				a[i] === b[j]
					? (lengths[i + 1]?.[j + 1] ?? 0) + 1
					: Math.max(lengths[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
		}
	}

	const lines: string[] = [];
	let i = 0;
	let j = 0;
	const removesNext = (): boolean =>
		j >= b.length || (lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0);

	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) {
			lines.push(`  ${a[i]}`);
			i += 1;
			j += 1;
		} else if (i < a.length && removesNext()) {
			lines.push(`- ${a[i]}`);
			i += 1;
		} else {
			lines.push(`+ ${b[j]}`);
			j += 1;
		}
	}

	return lines.join("\n");
};

const fence = (language: string, blocks: string[]): string[] => [
	`\`\`\`${language}`,
	blocks.join("\n\n"),
	"```",
	"",
];

/**
 * Renders the declarations added, removed and changed between two reports as Markdown.
 * @param {string} version - The published version compared against.
 * @param {Map<string, Declaration>} base - The published declarations.
 * @param {Map<string, Declaration>} head - The current declarations.
 * @returns {string} The Markdown summary.
 */
const renderDiff = (
	version: string,
	base: Map<string, Declaration>,
	head: Map<string, Declaration>,
): string => {
	const added = [...head.values()].filter((d) => !base.has(d.name));
	const removed = [...base.values()].filter((d) => !head.has(d.name));
	const changed = [...head.values()].filter((d) => {
		const before = base.get(d.name);
		return before !== undefined && before.text !== d.text;
	});
	const lines = [`## Public API changes since ${version}`, ""];

	if (added.length + removed.length + changed.length === 0) {
		lines.push(`No declaration of the public API changed since ${version}.`, "");
		return lines.join("\n");
	}

	lines.push(
		`${added.length} added, ${removed.length} removed, ${changed.length} changed (from the API Extractor reports of \`${packageName}@${version}\` and of this build).`,
		"",
	);
	if (added.length > 0) {
		lines.push(
			`### Added (${added.length})`,
			"",
			...fence(
				"ts",
				added.map((d) => d.text),
			),
		);
	}
	if (removed.length > 0) {
		lines.push(
			`### Removed (${removed.length})`,
			"",
			...fence(
				"ts",
				removed.map((d) => d.text),
			),
		);
	}
	if (changed.length > 0) {
		lines.push(
			`### Changed (${changed.length})`,
			"",
			...fence(
				"diff",
				changed.map((d) => lineDiff(base.get(d.name)?.text ?? "", d.text)),
			),
		);
	}

	return lines.join("\n");
};

/**
 * Asks the registry for the version behind the `latest` tag.
 * @returns {Promise<string | null>} The version, or null when the package was never published.
 */
/**
 * Keeps the lines of an npm failure that say what went wrong, without the stack and log path.
 * @param {string} stderr - The npm error output.
 * @returns {string} The error code and message lines.
 */
const npmError = (stderr: string): string => {
	const lines = stderr
		.split("\n")
		.filter((line) => /^npm error (?:code |\d{3} |FetchError|request to|network)/.test(line));

	return lines.length > 0 ? lines.join("\n") : stderr.trim();
};

const latestVersion = async (): Promise<string | null> => {
	const result = await run("npm", ["view", `${packageName}@latest`, "version", "--json"]);

	if (!result.ok) {
		if (/\bE404\b/.test(`${result.stdout}${result.stderr}`)) return null;

		throw new CheckError(
			`Could not fetch ${packageName}@latest from the npm registry, which the breaking-change check compares against. Check the network connection and retry.\n${npmError(result.stderr)}`,
		);
	}

	const parsed: unknown = JSON.parse(result.stdout);

	if (typeof parsed !== "string") {
		throw new CheckError(`Unexpected \`npm view\` output: ${result.stdout}`);
	}

	return parsed;
};

const packedFilename = (stdout: string): string => {
	const parsed: unknown = JSON.parse(stdout);
	const first: unknown = Array.isArray(parsed) ? parsed.at(0) : undefined;

	if (typeof first === "object" && first !== null && "filename" in first) {
		return String(first.filename);
	}

	throw new CheckError(`Unexpected \`npm pack\` output: ${stdout}`);
};

/**
 * Downloads and extracts one published version of the package.
 * @param {string} version - The version to download.
 * @param {string} dir - The directory to extract it into.
 * @returns {Promise<string>} The root of the extracted package.
 */
const downloadPackage = async (version: string, dir: string): Promise<string> => {
	await mkdir(dir, { recursive: true });

	const packed = await run(
		"npm",
		["pack", `${packageName}@${version}`, "--json", "--pack-destination", dir],
		dir,
	);

	if (!packed.ok) {
		throw new CheckError(
			`Could not download ${packageName}@${version}. Check the network connection and retry.\n${npmError(packed.stderr)}`,
		);
	}

	const extracted = await run("tar", ["-xzf", join(dir, packedFilename(packed.stdout)), "-C", dir]);
	const packageDir = join(dir, "package");

	if (!extracted.ok || !existsSync(join(packageDir, "dist", `${entryName}.d.ts`))) {
		throw new CheckError(
			`Could not extract dist/${entryName}.d.ts from ${packageName}@${version}.\n${extracted.stderr.trim()}`,
		);
	}

	return packageDir;
};

const writeSummary = async (markdown: string): Promise<void> => {
	console.log(`\n${markdown}`);

	const summaryPath = process.env["GITHUB_STEP_SUMMARY"];

	if (summaryPath !== undefined && summaryPath !== "") {
		await appendFile(summaryPath, `${markdown}\n`);
	}
};

const main = async (workDir: string): Promise<number> => {
	if (!existsSync(join(rootDir, "dist", `${entryName}.d.ts`))) {
		throw new CheckError(`Missing dist/${entryName}.d.ts. Run \`npm run build\` first.`);
	}

	const configPath = join(rootDir, "api-extractor.json");
	const head = await extract({ configPath, reportDir: join(workDir, "head") });

	if (!head.succeeded) {
		console.error(
			"\nAPI Extractor reported errors in the public API (see above): export every type the API refers to, document every public declaration, fix any compiler error.",
		);
		return FAILURE_EXIT_CODE;
	}

	console.log("API Extractor: every public declaration is documented and exported.");

	const version = await latestVersion();

	if (version === null) {
		console.log(
			`${packageName} was never published: nothing to compare the public API against, skipping the breaking-change check.`,
		);
		return 0;
	}

	const localVersion = await readVersion(join(rootDir, "package.json"));
	console.log(
		version === localVersion
			? `Comparing against ${packageName}@${version}, the version package.json is on: the release is the contract, so every change since it is checked.`
			: `Comparing against ${packageName}@${version} (package.json is at ${localVersion}).`,
	);

	const baseDir = await downloadPackage(version, join(workDir, "base"));
	const baseRun = await extract({
		configPath,
		reportDir: join(workDir, "base-report"),
		packageDir: baseDir,
	});

	if (!baseRun.succeeded) {
		throw new CheckError(`API Extractor could not read ${packageName}@${version}`);
	}

	const base = parseReport(await readFile(baseRun.reportPath, "utf8"));
	const current = parseReport(await readFile(head.reportPath, "utf8"));
	const checkDir = join(workDir, "check");
	await mkdir(checkDir, { recursive: true });

	const { source, assertions, removed, skipped } = renderBreakingCheck({
		checkDir,
		baseDir,
		base,
		head: current,
		baseSubpaths: await readSubpaths(join(baseDir, "dist")),
		headSubpaths: await readSubpaths(join(rootDir, "dist")),
	});
	const labels = new Map([
		[join(baseDir, "dist"), `${packageName}@${version}/dist`],
		[join(rootDir, "dist"), "dist"],
	]);
	const failures = [
		...removed.map((reason) => `- ${reason}`),
		...(await typeCheck(checkDir, source, assertions, labels)),
	];
	if (skipped.length > 0) {
		console.log(`Generic types compared in the diff only: ${skipped.join(", ")}.`);
	}

	const allowed = major(localVersion) > major(version);
	const diff = renderDiff(version, base, current);

	if (failures.length === 0) {
		await writeSummary(diff);
		console.log(
			`\nNo breaking change against ${version}: ${assertions.length} type assertions hold.`,
		);
		return 0;
	}

	const acceptance = allowed
		? `, accepted because package.json is on a new major version (${localVersion})`
		: "";
	const verdict = `${failures.length} breaking change(s) against ${version}${acceptance}:`;

	await writeSummary(`${diff}\n### Breaking changes\n\n${verdict}\n\n${failures.join("\n")}\n`);

	return allowed ? 0 : FAILURE_EXIT_CODE;
};

const workDir = await mkdtemp(join(tmpdir(), "brazilian-utils-api-"));

try {
	process.exitCode = await main(workDir);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = ERROR_EXIT_CODE;
} finally {
	await rm(workDir, { recursive: true, force: true });
}
