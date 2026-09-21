/**
 * Builds the conformance vectors from the package this repository ships.
 *
 * The corpus is not invented: every string literal the relevant test files use is pulled out of
 * them, so the cross language check runs the same inputs the JavaScript suite runs, plus
 * generated and fuzzed values on top. The expectations come from calling the handwritten
 * implementation, which makes the vectors a recording of the real contract.
 *
 * Usage: `node spec/bridge/conformance/vectors.ts`
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const bridge = resolve(import.meta.dirname, "..");
const root = resolve(bridge, "../..");

type Options = Record<string, unknown>;
export type Case = { fn: string; input: string | number; options: Options; expected: string };
export type Vectors = { cases: Case[] };

/** Pulls every string literal out of a test file, which is where the interesting inputs live. */
const literalsOf = (path: string): string[] => {
	const source = readFileSync(path, "utf8");
	const found = new Set<string>();

	for (const match of source.matchAll(/"((?:[^"\\\n]|\\.){0,40})"/g)) {
		try {
			found.add(JSON.parse(`"${match[1]}"`) as string);
		} catch {
			// A literal that is not valid JSON on its own is not an input worth replaying.
		}
	}

	return [...found];
};

/** A deterministic pseudo random generator, so the corpus only changes when this file does. */
const mulberry32 = (seed: number): (() => number) => {
	let state = seed;

	return () => {
		state = Math.imul(state + 0x6d_2b_79_f5, 1);
		let t = Math.imul(state ^ (state >>> 15), 1 | state);

		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);

		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

const MASKS = [".", "-", "/", " ", " ", "", "!", "a"];

/**
 * Builds the corpus: the test literals, generated CNPJs, masked variants and junk.
 *
 * @param {Function} generateCnpj - The package's own generator.
 * @returns {(string | number)[]} The corpus.
 */
const buildCorpus = (generateCnpj: (version?: 1 | 2) => string): (string | number)[] => {
	const random = mulberry32(0x62_72_31);
	const corpus = new Set<string | number>();

	for (const name of readdirSync(resolve(root, "src/is-valid-cnpj"))) {
		if (name.endsWith(".test.ts"))
			for (const literal of literalsOf(resolve(root, "src/is-valid-cnpj", name))) corpus.add(literal);
	}

	for (const name of readdirSync(resolve(root, "src/format-cnpj"))) {
		if (name.endsWith(".test.ts"))
			for (const literal of literalsOf(resolve(root, "src/format-cnpj", name))) corpus.add(literal);
	}

	for (let index = 0; index < 120; index++) {
		const version = index % 2 === 0 ? 1 : 2;
		const cnpj = generateCnpj(version as 1 | 2);

		corpus.add(cnpj);
		corpus.add(cnpj.toLowerCase());

		const separators = [0, 1, 2, 3].map(() => MASKS[Math.floor(random() * MASKS.length)]);

		corpus.add(
			`${cnpj.slice(0, 2)}${separators[0]}${cnpj.slice(2, 5)}${separators[1]}${cnpj.slice(5, 8)}${separators[2]}${cnpj.slice(8, 12)}${separators[3]}${cnpj.slice(12)}`,
		);

		const position = Math.floor(random() * cnpj.length);

		corpus.add(`${cnpj.slice(0, position)}${Math.floor(random() * 10)}${cnpj.slice(position + 1)}`);
	}

	for (const number of [0, 4, 46, 468, 12_345_678, 12_345_678_000_195]) corpus.add(number);

	return [...corpus];
};

const outDir = mkdtempSync(join(tmpdir(), "brutils-bridge-"));
const bundlePath = join(outDir, "shipped.mjs");

await build({
	entryPoints: [resolve(root, "src/index.ts")],
	bundle: true,
	format: "esm",
	platform: "neutral",
	outfile: bundlePath,
	logLevel: "error",
});

const shipped = (await import(bundlePath)) as {
	isValidCnpj: (value: unknown, options?: Options) => boolean;
	formatCnpj: (value: unknown, options?: Options) => string;
	generateCnpj: (version?: 1 | 2) => string;
};

const corpus = buildCorpus(shipped.generateCnpj);
const validatorOptions: Options[] = [{}, { version: 1 }, { version: 2 }];
const formatterOptions: Options[] = [
	{},
	{ version: 2 },
	{ pad: true },
	{ obfuscate: true },
	{ version: 2, pad: true },
	{ version: 2, obfuscate: true },
	{ pad: true, obfuscate: true },
];

const cases: Case[] = [];

for (const input of corpus) {
	for (const options of validatorOptions) {
		cases.push({
			fn: "isValidCnpj",
			input,
			options,
			expected: String(shipped.isValidCnpj(input, options)),
		});
	}

	for (const options of formatterOptions) {
		cases.push({ fn: "formatCnpj", input, options, expected: shipped.formatCnpj(input, options) });
	}
}

rmSync(outDir, { recursive: true, force: true });
writeFileSync(resolve(bridge, "conformance/vectors.json"), `${JSON.stringify({ cases })}\n`);

console.log(`${corpus.length} inputs, ${cases.length} expectations recorded from the shipped package`);
