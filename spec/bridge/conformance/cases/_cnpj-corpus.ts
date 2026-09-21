/**
 * The CNPJ corpus both CNPJ recorders replay.
 *
 * It is not invented: every string literal the package's own CNPJ test files use is pulled out
 * of them, so the cross language check runs the same inputs the JavaScript suite runs. On top
 * of that go freshly generated CNPJs, masked variants of them, one-digit mutations, and the
 * numbers a JavaScript caller can pass where a string is declared.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../../..");

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

const MASKS = [".", "-", "/", " ", " ", "", "!", "a"];

/**
 * Builds the corpus.
 *
 * @param {Function} generateCnpj - The package's own generator.
 * @returns {(string | number)[]} The corpus.
 */
export const cnpjCorpus = (generateCnpj: (version?: 1 | 2) => string): (string | number)[] => {
	const random = mulberry32(0x62_72_31);
	const corpus = new Set<string | number>();
	// `generateCnpj` draws from `Math.random`, and a corpus that changes between runs makes a
	// diverging target look like a flake. Seeding it makes the table the same every time.
	const realRandom = Math.random;

	Math.random = random;

	for (const utility of ["is-valid-cnpj", "format-cnpj"]) {
		for (const name of readdirSync(resolve(root, "src", utility))) {
			if (!name.endsWith(".test.ts")) continue;

			for (const literal of literalsOf(resolve(root, "src", utility, name))) corpus.add(literal);
		}
	}

	for (let index = 0; index < 120; index++) {
		const version = index % 2 === 0 ? 1 : 2;
		const cnpj = generateCnpj(version);

		corpus.add(cnpj);
		corpus.add(cnpj.toLowerCase());

		const separators = [0, 1, 2, 3].map(() => MASKS[Math.floor(random() * MASKS.length)]);

		corpus.add(
			`${cnpj.slice(0, 2)}${separators[0]}${cnpj.slice(2, 5)}${separators[1]}${cnpj.slice(5, 8)}${separators[2]}${cnpj.slice(8, 12)}${separators[3]}${cnpj.slice(12)}`,
		);

		const position = Math.floor(random() * cnpj.length);

		corpus.add(`${cnpj.slice(0, position)}${Math.floor(random() * 10)}${cnpj.slice(position + 1)}`);
	}

	Math.random = realRandom;

	for (const number of [0, 4, 46, 468, 12_345_678, 12_345_678_000_195]) corpus.add(number);

	return [...corpus];
};
