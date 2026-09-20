/**
 * Deterministic corpus of raw inputs used to build the conformance vectors.
 *
 * The corpus is pseudo random but seeded, so every target and every language sees exactly the
 * same inputs and the vectors only change when this file does.
 */
import { computeCheckDigit } from "./interpret.ts";

/**
 * Mulberry32: a tiny, portable PRNG, so the corpus does not depend on the host's Math.random.
 *
 * @param {number} seed - The seed the sequence starts from.
 * @returns {Function} A generator of numbers in [0, 1).
 */
const mulberry32 = (seed: number): (() => number) => {
	let state = seed;

	return () => {
		// oxlint-disable-next-line unicorn/prefer-math-trunc -- `| 0` wraps to a signed 32 bit integer, which is what the algorithm specifies, and Math.trunc does not wrap
		state = (state + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);

		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);

		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

const CURATED = [
	"",
	" ",
	"0",
	"00000000000",
	"11111111111",
	"99999999999",
	"12345678909",
	"123.456.789-09",
	"123 456 789 09",
	" 12345678909 ",
	"123.456.789.09",
	"123/456/789/09",
	"123-456-789-09",
	"123..456..789--09",
	".12345678909",
	"12345678909.",
	"1234567890",
	"123456789090",
	"abc12345678909",
	"12345678909abc",
	"1a2345678909",
	"12345678900",
	" 12345678909 ",
	" 123.456.789-09 ",
	"﻿12345678909",
	"123 456 789 09",
	"123\t456\n789\r09",
	"🇧🇷12345678909",
	"12345678909🇧🇷",
	"１２３４５６７８９０９",
	"١٢٣٤٥٦٧٨٩٠٩",
	"12056874107",
	"120.56874.10-7",
	"120/56874/10-7",
	"120(56874)10,7",
	"120*56874*10-7",
	"12056874108",
	"1205687410",
	"120.56874.10-7 ",
	"120#56874#10#7",
];

const DIGITS = "0123456789";
const MASKS = [".", "-", "/", " ", "(", ")", ",", "*", " ", "#", "a", ""];

const validCpf = (random: () => number): string => {
	let base = "";

	for (let index = 0; index < 9; index++) base += DIGITS[Math.floor(random() * 10)];

	const first = computeCheckDigit(base, "cpf");
	const second = computeCheckDigit(`${base}${first}`, "cpf");

	return `${base}${first}${second}`;
};

const validPis = (random: () => number): string => {
	let base = "";

	for (let index = 0; index < 10; index++) base += DIGITS[Math.floor(random() * 10)];

	return `${base}${computeCheckDigit(base, "pis")}`;
};

const sprinkle = (value: string, random: () => number): string => {
	let out = "";

	for (const char of value) {
		out += char;
		if (random() < 0.18) out += MASKS[Math.floor(random() * MASKS.length)];
	}

	return out;
};

/**
 * Builds the corpus: the curated edge cases first, then the seeded random ones.
 *
 * @param {number} [size] - How many inputs to produce before de-duplication.
 * @returns {string[]} The corpus, in a stable order.
 */
export const buildCorpus = (size = 2000): string[] => {
	const random = mulberry32(0x62_72_75_74);
	const corpus = [...CURATED];

	while (corpus.length < size) {
		const roll = random();

		if (roll < 0.3) corpus.push(validCpf(random));
		else if (roll < 0.45) corpus.push(sprinkle(validCpf(random), random));
		else if (roll < 0.6) corpus.push(validPis(random));
		else if (roll < 0.72) corpus.push(sprinkle(validPis(random), random));
		else if (roll < 0.86) {
			let junk = "";
			const length = Math.floor(random() * 16);

			for (let index = 0; index < length; index++) {
				junk +=
					random() < 0.7
						? DIGITS[Math.floor(random() * 10)]
						: MASKS[Math.floor(random() * MASKS.length)];
			}

			corpus.push(junk);
		} else {
			const valid = validCpf(random);
			const position = Math.floor(random() * valid.length);

			corpus.push(
				`${valid.slice(0, position)}${DIGITS[Math.floor(random() * 10)]}${valid.slice(position + 1)}`,
			);
		}
	}

	return [...new Set(corpus)];
};
