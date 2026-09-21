/**
 * The regex subset: parsed at compile time, normalized into explicit code point classes, and
 * never a run-time value.
 *
 * Rejected by construction: lookaround, backreferences, the implicit Unicode classes (`\d`, `\w`,
 * `\s`, `\b`, which match different sets in JavaScript, Python and Go), inline flags, and any
 * pattern that is not anchored to the whole string. What survives normalization means exactly the
 * same thing in every target dialect, which is what makes the native lowering safe.
 */

import type { Span } from "./diagnostics.ts";
import { MAX_COLLECTION_LENGTH } from "./types.ts";

export type CharRange = { readonly lo: number; readonly hi: number };

export type RegexNode =
	/** A set of code points, always stored as sorted, non-overlapping ranges. */
	| { readonly kind: "class"; readonly ranges: readonly CharRange[]; readonly negated: boolean }
	| { readonly kind: "seq"; readonly items: readonly RegexNode[] }
	| { readonly kind: "alt"; readonly options: readonly RegexNode[] }
	| {
			readonly kind: "repeat";
			readonly item: RegexNode;
			readonly min: number;
			/** `null` means unbounded. */
			readonly max: number | null;
	  };

export type NormalizedRegex = {
	/** The original source text, kept for diagnostics and for `LOWERING.md`. */
	readonly source: string;
	readonly node: RegexNode;
	/** True when every code point the pattern can match is below 0x80. */
	readonly asciiOnly: boolean;
	/** True when the pattern only ever matches strings of ASCII digits. */
	readonly digitsOnly: boolean;
	/** Proven length range of any string the pattern matches. */
	readonly minLength: number;
	readonly maxLength: number;
};

export class RegexError extends Error {
	readonly span: Span | undefined;

	constructor(message: string, span?: Span) {
		super(message);
		this.name = "RegexError";
		this.span = span;
	}
}

const MAX_CODE_POINT = 0x10ffff;

function normalizeRanges(ranges: readonly CharRange[]): CharRange[] {
	const sorted = [...ranges].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
	const merged: CharRange[] = [];
	for (const range of sorted) {
		const last = merged[merged.length - 1];
		if (last !== undefined && range.lo <= last.hi + 1) {
			merged[merged.length - 1] = { lo: last.lo, hi: Math.max(last.hi, range.hi) };
		} else {
			merged.push({ ...range });
		}
	}
	return merged;
}

/**
 * Expands a negated class into positive ranges, so every class is positive after parsing.
 * Exported for the Rust target's chain-scanner classifier (`engine/src/targets/rust/index.ts`),
 * which needs the same complement to decide whether two classes can ever overlap; see that file's
 * "Regex" section for why.
 */
export function complement(ranges: readonly CharRange[]): CharRange[] {
	const result: CharRange[] = [];
	let cursor = 0;
	for (const range of normalizeRanges(ranges)) {
		if (range.lo > cursor) result.push({ lo: cursor, hi: range.lo - 1 });
		cursor = Math.max(cursor, range.hi + 1);
	}
	if (cursor <= MAX_CODE_POINT) result.push({ lo: cursor, hi: MAX_CODE_POINT });
	return result;
}

class Parser {
	private readonly text: string;
	private index = 0;
	private readonly span: Span | undefined;

	constructor(text: string, span?: Span) {
		this.text = text;
		this.span = span;
	}

	private fail(message: string): never {
		throw new RegexError(`${message} (at offset ${this.index} of /${this.text}/)`, this.span);
	}

	private peek(): string | undefined {
		return this.text[this.index];
	}

	private eat(char: string): boolean {
		if (this.text[this.index] === char) {
			this.index++;
			return true;
		}
		return false;
	}

	parse(): RegexNode {
		if (!this.eat("^")) {
			this.fail("a pattern must be anchored with ^ at the start");
		}
		const node = this.parseAlt();
		if (!this.eat("$")) {
			this.fail("a pattern must be anchored with $ at the end");
		}
		if (this.index !== this.text.length) this.fail("trailing characters after $");
		return node;
	}

	private parseAlt(): RegexNode {
		const options: RegexNode[] = [this.parseSeq()];
		while (this.eat("|")) options.push(this.parseSeq());
		return options.length === 1 ? options[0]! : { kind: "alt", options };
	}

	private parseSeq(): RegexNode {
		const items: RegexNode[] = [];
		for (;;) {
			const next = this.peek();
			if (next === undefined || next === "|" || next === ")" || next === "$") break;
			items.push(this.parseRepeat());
		}
		return items.length === 1 ? items[0]! : { kind: "seq", items };
	}

	private parseRepeat(): RegexNode {
		const atom = this.parseAtom();
		const next = this.peek();
		if (next === "*") {
			this.index++;
			this.rejectLazy();
			return { kind: "repeat", item: atom, min: 0, max: null };
		}
		if (next === "+") {
			this.index++;
			this.rejectLazy();
			return { kind: "repeat", item: atom, min: 1, max: null };
		}
		if (next === "?") {
			this.index++;
			this.rejectLazy();
			return { kind: "repeat", item: atom, min: 0, max: 1 };
		}
		if (next === "{") {
			const closing = this.text.indexOf("}", this.index);
			if (closing < 0) this.fail("unterminated {n,m}");
			const body = this.text.slice(this.index + 1, closing);
			this.index = closing + 1;
			this.rejectLazy();
			const parts = body.split(",");
			const min = Number.parseInt(parts[0] ?? "", 10);
			if (!Number.isInteger(min)) this.fail("{n,m} needs an integer lower bound");
			const max =
				parts.length === 1
					? min
					: parts[1] === ""
						? null
						: Number.parseInt(parts[1] ?? "", 10);
			if (max !== null && !Number.isInteger(max)) this.fail("{n,m} needs an integer upper bound");
			return { kind: "repeat", item: atom, min, max };
		}
		return atom;
	}

	private rejectLazy(): void {
		if (this.peek() === "?") {
			this.fail("lazy quantifiers are outside the subset: engines differ on their interaction with anchoring");
		}
	}

	private parseAtom(): RegexNode {
		if (this.eat("(")) {
			if (this.text.startsWith("?", this.index)) {
				if (!this.text.startsWith("?:", this.index)) {
					this.fail("only non-capturing groups (?:…) are supported; lookaround is outside the subset");
				}
				this.index += 2;
			}
			const node = this.parseAlt();
			if (!this.eat(")")) this.fail("unterminated group");
			return node;
		}
		if (this.eat("[")) return this.parseClass();
		if (this.eat(".")) {
			this.fail("`.` is outside the subset: it means different sets with and without the s flag; write an explicit class");
		}
		const char = this.peek();
		if (char === undefined) this.fail("unexpected end of pattern");
		if (char === "\\") {
			this.index++;
			const point = this.parseEscape();
			return { kind: "class", ranges: [{ lo: point, hi: point }], negated: false };
		}
		this.index++;
		const point = char.codePointAt(0)!;
		if (point > 0xffff) this.index++;
		return { kind: "class", ranges: [{ lo: point, hi: point }], negated: false };
	}

	private parseEscape(): number {
		const char = this.text[this.index];
		if (char === undefined) this.fail("dangling escape");
		this.index++;
		switch (char) {
			case "d":
			case "D":
			case "w":
			case "W":
			case "s":
			case "S":
			case "b":
			case "B":
				this.fail(
					`\\${char} is outside the subset: it matches a different set in JavaScript, Python and Go. Write the explicit class instead`,
				);
				break;
			case "n":
				return 0x0a;
			case "r":
				return 0x0d;
			case "t":
				return 0x09;
			case "u": {
				if (this.text[this.index] === "{") {
					const closing = this.text.indexOf("}", this.index);
					if (closing < 0) this.fail("unterminated \\u{...}");
					const point = Number.parseInt(this.text.slice(this.index + 1, closing), 16);
					this.index = closing + 1;
					return point;
				}
				const point = Number.parseInt(this.text.slice(this.index, this.index + 4), 16);
				this.index += 4;
				return point;
			}
			default:
				return char.codePointAt(0)!;
		}
		return 0;
	}

	private parseClass(): RegexNode {
		const negated = this.eat("^");
		const ranges: CharRange[] = [];
		for (;;) {
			const char = this.peek();
			if (char === undefined) this.fail("unterminated character class");
			if (char === "]") {
				this.index++;
				break;
			}
			let lo: number;
			if (char === "\\") {
				this.index++;
				lo = this.parseEscape();
			} else {
				this.index++;
				lo = char.codePointAt(0)!;
				if (lo > 0xffff) this.index++;
			}
			if (this.peek() === "-" && this.text[this.index + 1] !== "]") {
				this.index++;
				const next = this.peek();
				if (next === undefined) this.fail("unterminated range");
				let hi: number;
				if (next === "\\") {
					this.index++;
					hi = this.parseEscape();
				} else {
					this.index++;
					hi = next.codePointAt(0)!;
					if (hi > 0xffff) this.index++;
				}
				ranges.push({ lo, hi });
			} else {
				ranges.push({ lo, hi: lo });
			}
		}
		const positive = negated ? complement(ranges) : normalizeRanges(ranges);
		return { kind: "class", ranges: positive, negated: false };
	}
}

function lengthBounds(node: RegexNode): { min: number; max: number } {
	switch (node.kind) {
		case "class":
			return { min: 1, max: 1 };
		case "seq": {
			let min = 0;
			let max = 0;
			for (const item of node.items) {
				const bounds = lengthBounds(item);
				min += bounds.min;
				max = Math.min(max + bounds.max, MAX_COLLECTION_LENGTH);
			}
			return { min, max };
		}
		case "alt": {
			const bounds = node.options.map(lengthBounds);
			return {
				min: Math.min(...bounds.map((bound) => bound.min)),
				max: Math.max(...bounds.map((bound) => bound.max)),
			};
		}
		case "repeat": {
			const inner = lengthBounds(node.item);
			return {
				min: inner.min * node.min,
				max:
					node.max === null
						? MAX_COLLECTION_LENGTH
						: Math.min(inner.max * node.max, MAX_COLLECTION_LENGTH),
			};
		}
		default: {
			const exhaustive: never = node;
			return exhaustive;
		}
	}
}

function everyClass(node: RegexNode, predicate: (ranges: readonly CharRange[]) => boolean): boolean {
	switch (node.kind) {
		case "class":
			return predicate(node.ranges);
		case "seq":
			return node.items.every((item) => everyClass(item, predicate));
		case "alt":
			return node.options.every((option) => everyClass(option, predicate));
		case "repeat":
			return node.min === 0 && node.max === 0 ? true : everyClass(node.item, predicate);
		default: {
			const exhaustive: never = node;
			return exhaustive;
		}
	}
}

export function normalizeRegex(source: string, span?: Span): NormalizedRegex {
	const node = new Parser(source, span).parse();
	const bounds = lengthBounds(node);
	return {
		source,
		node,
		asciiOnly: everyClass(node, (ranges) => ranges.every((range) => range.hi < 0x80)),
		digitsOnly: everyClass(node, (ranges) =>
			ranges.every((range) => range.lo >= 0x30 && range.hi <= 0x39),
		),
		minLength: bounds.min,
		maxLength: bounds.max,
	};
}

/** Reference matcher: a full match over the scalars of the input. */
export function regexMatches(regex: NormalizedRegex, input: readonly number[]): boolean {
	return matchNode(regex.node, input, 0, (next) => next === input.length);
}

function matchNode(
	node: RegexNode,
	input: readonly number[],
	position: number,
	cont: (next: number) => boolean,
): boolean {
	switch (node.kind) {
		case "class": {
			const point = input[position];
			if (point === undefined) return false;
			const inSet = node.ranges.some((range) => point >= range.lo && point <= range.hi);
			return inSet ? cont(position + 1) : false;
		}
		case "seq": {
			const step = (index: number, at: number): boolean => {
				if (index === node.items.length) return cont(at);
				return matchNode(node.items[index]!, input, at, (next) => step(index + 1, next));
			};
			return step(0, position);
		}
		case "alt":
			return node.options.some((option) => matchNode(option, input, position, cont));
		case "repeat": {
			const limit = node.max ?? Number.MAX_SAFE_INTEGER;
			const step = (count: number, at: number): boolean => {
				// Greedy: try one more repetition first, then fall back to continuing.
				if (count < limit) {
					const consumed = matchNode(node.item, input, at, (next) =>
						next === at ? false : step(count + 1, next),
					);
					if (consumed) return true;
				}
				return count >= node.min ? cont(at) : false;
			};
			return step(0, position);
		}
		default: {
			const exhaustive: never = node;
			return exhaustive;
		}
	}
}

/**
 * Prints the normalized pattern in a dialect every target reads the same way: explicit classes,
 * no shorthand, and anchoring supplied by the caller (`\A…\z` in Go, `fullmatch` in Python,
 * `^…$` in JavaScript, whose `^`/`$` are string anchors without the `m` flag).
 */
/** The dialects the subset prints into. They read the normalized pattern identically. */
export type RegexDialect = "javascript" | "python" | "go";

export function printRegex(node: RegexNode, dialect: RegexDialect = "javascript"): string {
	switch (node.kind) {
		case "class": {
			if (node.ranges.length === 1 && node.ranges[0]!.lo === node.ranges[0]!.hi) {
				return escapeLiteral(node.ranges[0]!.lo, dialect);
			}
			const body = node.ranges
				.map((range) =>
					range.lo === range.hi
						? escapeInClass(range.lo, dialect)
						: `${escapeInClass(range.lo, dialect)}-${escapeInClass(range.hi, dialect)}`,
				)
				.join("");
			return `[${body}]`;
		}
		case "seq":
			return node.items.map((item) => printRegex(item, dialect)).join("");
		case "alt":
			return `(?:${node.options.map((option) => printRegex(option, dialect)).join("|")})`;
		case "repeat": {
			const inner = needsGroup(node.item)
				? `(?:${printRegex(node.item, dialect)})`
				: printRegex(node.item, dialect);
			if (node.min === 0 && node.max === null) return `${inner}*`;
			if (node.min === 1 && node.max === null) return `${inner}+`;
			if (node.min === 0 && node.max === 1) return `${inner}?`;
			if (node.max === null) return `${inner}{${node.min},}`;
			if (node.min === node.max) return `${inner}{${node.min}}`;
			return `${inner}{${node.min},${node.max}}`;
		}
		default: {
			const exhaustive: never = node;
			return exhaustive;
		}
	}
}

function needsGroup(node: RegexNode): boolean {
	return node.kind === "seq" || node.kind === "alt";
}

const SPECIAL = new Set([..."\\^$.|?*+()[]{}"].map((char) => char.codePointAt(0)!));

function escapeLiteral(point: number, dialect: RegexDialect): string {
	if (SPECIAL.has(point)) return `\\${String.fromCodePoint(point)}`;
	return printable(point, dialect);
}

function escapeInClass(point: number, dialect: RegexDialect): string {
	if (point === 0x5d || point === 0x5c || point === 0x2d || point === 0x5e) {
		return `\\${String.fromCodePoint(point)}`;
	}
	return printable(point, dialect);
}

/**
 * A scalar outside printable ASCII is escaped in the dialect's own syntax: RE2 spells a code
 * point `\x{…}` and rejects `\uXXXX`, while JavaScript and Python read `\uXXXX`.
 */
function printable(point: number, dialect: RegexDialect): string {
	if (point >= 0x20 && point <= 0x7e) return String.fromCodePoint(point);
	if (dialect === "go") return `\\x{${point.toString(16)}}`;
	if (point < 0x20 || point === 0x7f) return `\\x${point.toString(16).padStart(2, "0")}`;
	if (point > 0xffff) {
		return dialect === "python"
			? `\\U${point.toString(16).padStart(8, "0")}`
			: `\\u{${point.toString(16)}}`;
	}
	return `\\u${point.toString(16).padStart(4, "0")}`;
}
