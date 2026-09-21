/**
 * Compiles the regular expression literals the source uses into a portable form.
 *
 * A regex is not portable: `\s` matches 6 code points in Go and Ruby, 25 in JavaScript, and a
 * Unicode property in Python and Rust. So the bridge never passes a pattern through to the
 * target's regex engine. It parses the literal here and lowers it into two things every target
 * can reproduce exactly: character classes as explicit code point ranges, and a sequence of
 * "repeat this class between min and max times, capturing or not".
 *
 * The accepted subset is anchored patterns made of character classes with quantifiers. No
 * alternation, no backreferences, no lookaround — the frontend rejects the literal instead of
 * guessing, which is the whole point.
 */
import { type CharClass, type PatternStep } from "./ir.ts";

type Ranges = [number, number][];

/** The code points JavaScript's `\s` matches and `trim()` strips. */
const JS_WHITESPACE: Ranges = [
	[0x09, 0x0d],
	[0x20, 0x20],
	[0xa0, 0xa0],
	[0x16_80, 0x16_80],
	[0x20_00, 0x20_0a],
	[0x20_28, 0x20_29],
	[0x20_2f, 0x20_2f],
	[0x20_5f, 0x20_5f],
	[0x30_00, 0x30_00],
	[0xfe_ff, 0xfe_ff],
];

const DIGITS: Ranges = [[0x30, 0x39]];
const MAX_CODE_POINT = 0x10_ff_ff;

/**
 * Sorts and merges ranges so that two classes built differently compare equal.
 *
 * @param {Ranges} ranges - The ranges to normalise.
 * @returns {Ranges} Sorted, non overlapping ranges.
 */
export const normalise = (ranges: Ranges): Ranges => {
	const sorted = [...ranges].sort((left, right) => left[0] - right[0]);
	const merged: Ranges = [];

	for (const [from, to] of sorted) {
		const last = merged.at(-1);

		if (last !== undefined && from <= last[1] + 1) {
			last[1] = Math.max(last[1], to);
			continue;
		}

		merged.push([from, to]);
	}

	return merged;
};

/**
 * The complement of a set of ranges over the whole code point space.
 *
 * @param {Ranges} ranges - The ranges to invert.
 * @returns {Ranges} Everything the input does not cover.
 */
export const complement = (ranges: Ranges): Ranges => {
	const merged = normalise(ranges);
	const inverted: Ranges = [];
	let cursor = 0;

	for (const [from, to] of merged) {
		if (from > cursor) inverted.push([cursor, from - 1]);

		cursor = to + 1;
	}

	if (cursor <= MAX_CODE_POINT) inverted.push([cursor, MAX_CODE_POINT]);

	return inverted;
};

/**
 * Whether two classes share any code point. The matcher scans greedily and never backtracks,
 * which is only correct when consecutive classes cannot both match the same character.
 *
 * @param {Ranges} left - The first class.
 * @param {Ranges} right - The second class.
 * @returns {boolean} True when they overlap.
 */
export const overlaps = (left: Ranges, right: Ranges): boolean =>
	left.some(([from, to]) =>
		right.some(([otherFrom, otherTo]) => from <= otherTo && otherFrom <= to),
	);

type Parsed = { ranges: Ranges; min: number; max: number; capture: boolean };

/** Reads one escape sequence, starting after the backslash. */
const readEscape = (source: string, index: number): { ranges: Ranges; next: number } => {
	const char = source[index];

	if (char === "d") return { ranges: DIGITS, next: index + 1 };
	if (char === "D") return { ranges: complement(DIGITS), next: index + 1 };
	if (char === "s") return { ranges: JS_WHITESPACE, next: index + 1 };
	if (char === "S") return { ranges: complement(JS_WHITESPACE), next: index + 1 };
	if (char === "n") return { ranges: [[0x0a, 0x0a]], next: index + 1 };
	if (char === "r") return { ranges: [[0x0d, 0x0d]], next: index + 1 };
	if (char === "t") return { ranges: [[0x09, 0x09]], next: index + 1 };

	if (char === "u") {
		const code = Number.parseInt(source.slice(index + 1, index + 5), 16);

		return { ranges: [[code, code]], next: index + 5 };
	}

	const code = source.codePointAt(index) ?? 0;

	return { ranges: [[code, code]], next: index + String.fromCodePoint(code).length };
};

/** Reads a `[...]` character class, starting after the opening bracket. */
const readClass = (source: string, start: number): { ranges: Ranges; next: number } => {
	let index = start;
	let negated = false;
	const ranges: Ranges = [];

	if (source[index] === "^") {
		negated = true;
		index++;
	}

	while (index < source.length && source[index] !== "]") {
		let low: Ranges;

		if (source[index] === "\\") {
			const escape = readEscape(source, index + 1);

			low = escape.ranges;
			index = escape.next;
		} else {
			const code = source.codePointAt(index) ?? 0;

			low = [[code, code]];
			index += String.fromCodePoint(code).length;
		}

		const isRange =
			source[index] === "-" &&
			source[index + 1] !== "]" &&
			index + 1 < source.length &&
			low.length === 1;

		if (isRange) {
			index++;

			const high =
				source[index] === "\\"
					? readEscape(source, index + 1)
					: {
							ranges: [[source.codePointAt(index) ?? 0, source.codePointAt(index) ?? 0]] as Ranges,
							next: index + String.fromCodePoint(source.codePointAt(index) ?? 0).length,
						};

			ranges.push([low[0][0], high.ranges[0][1]]);
			index = high.next;
			continue;
		}

		ranges.push(...low);
	}

	return { ranges: negated ? complement(ranges) : normalise(ranges), next: index + 1 };
};

/** Reads a quantifier, if there is one at `index`. */
const readQuantifier = (
	source: string,
	index: number,
): { min: number; max: number; next: number } => {
	if (source[index] === "*") return { min: 0, max: -1, next: index + 1 };
	if (source[index] === "+") return { min: 1, max: -1, next: index + 1 };
	if (source[index] === "?") return { min: 0, max: 1, next: index + 1 };

	if (source[index] === "{") {
		const close = source.indexOf("}", index);
		const body = source.slice(index + 1, close);
		const [first, second] = body.split(",");
		const min = Number(first);

		if (second === undefined) return { min, max: min, next: close + 1 };

		return { min, max: second === "" ? -1 : Number(second), next: close + 1 };
	}

	return { min: 1, max: 1, next: index };
};

export type CompiledPattern = {
	/** True when the literal was anchored at both ends, which is what `patternTest` needs. */
	anchored: boolean;
	terms: Parsed[];
};

/**
 * Parses a regex literal's source into the term sequence the matcher runs.
 *
 * @param {string} source - The pattern source, without the slashes.
 * @returns {CompiledPattern} The parsed terms.
 * @throws {Error} When the pattern uses a construct outside the portable subset.
 */
export const parsePattern = (source: string): CompiledPattern => {
	let index = 0;
	let anchoredStart = false;
	let anchoredEnd = false;
	const terms: Parsed[] = [];

	if (source[index] === "^") {
		anchoredStart = true;
		index++;
	}

	while (index < source.length) {
		if (source[index] === "$" && index === source.length - 1) {
			anchoredEnd = true;
			index++;
			continue;
		}

		let capture = false;
		let ranges: Ranges;

		if (source[index] === "(") {
			if (source.slice(index, index + 3) === "(?:")
				throw new Error(`non capturing groups are outside the portable subset: /${source}/`);

			capture = true;
			index++;

			const inner =
				source[index] === "["
					? readClass(source, index + 1)
					: source[index] === "\\"
						? readEscape(source, index + 1)
						: {
								ranges: [
									[source.codePointAt(index) ?? 0, source.codePointAt(index) ?? 0],
								] as Ranges,
								next: index + 1,
							};

			ranges = inner.ranges;
			index = inner.next;

			const quantifier = readQuantifier(source, index);

			index = quantifier.next;

			if (source[index] !== ")")
				throw new Error(`a group must hold exactly one class: /${source}/`);

			index++;
			terms.push({ ranges, min: quantifier.min, max: quantifier.max, capture });
			continue;
		}

		if (source[index] === "[") {
			const parsed = readClass(source, index + 1);

			ranges = parsed.ranges;
			index = parsed.next;
		} else if (source[index] === "\\") {
			const parsed = readEscape(source, index + 1);

			ranges = parsed.ranges;
			index = parsed.next;
		} else if ("|.+*?()".includes(source[index])) {
			throw new Error(`\`${source[index]}\` is outside the portable regex subset: /${source}/`);
		} else {
			const code = source.codePointAt(index) ?? 0;

			ranges = [[code, code]];
			index += String.fromCodePoint(code).length;
		}

		const quantifier = readQuantifier(source, index);

		index = quantifier.next;
		terms.push({ ranges, min: quantifier.min, max: quantifier.max, capture });
	}

	// A greedy, backtrack free matcher is only correct when a repeated class cannot also start
	// the next term.
	for (const [position, term] of terms.entries()) {
		const next = terms[position + 1];

		if (term.max !== term.min && next !== undefined && overlaps(term.ranges, next.ranges)) {
			throw new Error(
				`terms ${position} and ${position + 1} of /${source}/ overlap, which needs backtracking`,
			);
		}
	}

	return { anchored: anchoredStart && anchoredEnd, terms };
};

/** Collects character classes into a module wide table, de-duplicated by their ranges. */
export class ClassTable {
	private readonly byKey = new Map<string, CharClass>();

	/**
	 * Interns a class and returns the name the emitters refer to it by.
	 *
	 * @param {Ranges} ranges - The class ranges.
	 * @param {string} hint - A readable name to base the identifier on.
	 * @returns {string} The interned class name.
	 */
	public intern(ranges: Ranges, hint: string): string {
		const merged = normalise(ranges);
		const key = merged.map(([from, to]) => `${from}-${to}`).join(",");
		const existing = this.byKey.get(key);

		if (existing !== undefined) return existing.name;

		const name = `${hint}${this.byKey.size}`;

		this.byKey.set(key, { name, ranges: merged, negated: false });

		return name;
	}

	/**
	 * Every interned class, in insertion order.
	 *
	 * @returns {CharClass[]} The classes.
	 */
	public all(): CharClass[] {
		return [...this.byKey.values()];
	}
}

/**
 * Lowers a parsed pattern into the steps an emitter writes out.
 *
 * @param {CompiledPattern} pattern - The parsed pattern.
 * @param {ClassTable} classes - The module's class table.
 * @returns {PatternStep[]} The steps.
 */
export const toSteps = (pattern: CompiledPattern, classes: ClassTable): PatternStep[] =>
	pattern.terms.map((term) => ({
		charClass: classes.intern(term.ranges, "class"),
		min: term.min,
		max: term.max,
		capture: term.capture,
	}));
