/**
 * A JSON string-field reader, written in the source language.
 *
 * It is library code rather than an intrinsic for the usual reason: it is expressible in the
 * subset, so every target runs the same scanner instead of three different JSON libraries with
 * three different edge cases. It reads exactly what the core needs — the string value of a
 * top-level field — and nothing else.
 */

const QUOTE = 34;
const BACKSLASH = 92;
const COLON = 58;
const SPACE = 32;
const TAB = 9;
const NEWLINE = 10;
const RETURN = 13;

/** Whether `needle` occurs in `points` at `start`. */
function matchesAt(points: List<Int>, needle: List<Int>, start: Int): boolean {
	for (let offset = 0; offset < needle.length; offset++) {
		// `needle[offset] ?? -2`: every call site passes a fixed-length literal key (`"cep"`,
		// `"uf"`, …), so specialization proves this loop's index in range for `needle` — but the
		// `??` picks the checked `seq.at` regardless (see the `logical` handling of `??` on a
		// bracket index), the same Core the namespace form always produced here. `points[start +
		// offset]` has no such proof either way (the body is any HTTP response), so it was already
		// the checked form on its own.
		if ((points[start + offset] ?? -1) !== (needle[offset] ?? -2)) {
			return false;
		}
	}

	return true;
}

/** Whether a code point is JSON whitespace. */
function isSpace(point: Int): boolean {
	return point === SPACE || point === TAB || point === NEWLINE || point === RETURN;
}

/** The hexadecimal value of four scalars, for a `\uXXXX` escape. */
function hexValue(points: List<Int>, start: Int): IntRange<0, 65535> {
	let value: IntRange<0, 1114111> = 0;

	for (let offset = 0; offset < 4; offset++) {
		const point = points[start + offset] ?? 48;
		let digit: IntRange<0, 15> = 0;

		if (point >= 48 && point <= 57) {
			digit = point - 48;
		} else if (point >= 97 && point <= 102) {
			digit = point - 87;
		} else if (point >= 65 && point <= 70) {
			digit = point - 55;
		}

		value = value * 16 + digit;
	}

	return Math.min(value, 65535);
}

/**
 * The string value of a top-level JSON field, or absent when the field is missing or is not a
 * string. Escapes are decoded; a surrogate pair is left as its two escaped halves, which no CEP
 * provider emits.
 */
export function jsonStringField(body: string, key: Ascii): string | undefined {
	// Kept as `str.codePoints`: real TypeScript spreads a string into substrings (`string[]`), not
	// the numeric code points every scan below compares against, even though the engine's own
	// checker treats `[...s]` and this call as identical Core.
	const points = str.codePoints(body);
	const needle = str.codePoints(`"${key}"`);

	for (let index = 0; index < points.length; index++) {
		if (!matchesAt(points, needle, index)) {
			continue;
		}

		// Declared over the platform domain: the cursor walks the whole body, and every step is a
		// small constant, which is what lets the checker keep it inside that domain.
		let cursor: Int = index + needle.length;

		for (let skip = 0; skip < 8; skip++) {
			if (isSpace(points[cursor] ?? 0)) {
				cursor += 1;
			}
		}

		if ((points[cursor] ?? 0) !== COLON) {
			continue;
		}

		cursor += 1;

		for (let skip = 0; skip < 8; skip++) {
			if (isSpace(points[cursor] ?? 0)) {
				cursor += 1;
			}
		}

		if ((points[cursor] ?? 0) !== QUOTE) {
			continue;
		}

		cursor += 1;

		let out: IntRange<0, 1114111>[] = [];

		for (let step = 0; step < points.length; step++) {
			const point = points[cursor] ?? -1;

			if (point === -1 || point === QUOTE) {
				return str.fromCodePoints(out);
			}

			if (point === BACKSLASH) {
				const escaped = points[cursor + 1] ?? -1;

				if (escaped === 110) {
					out.push(NEWLINE);
					cursor += 2;
				} else if (escaped === 116) {
					out.push(TAB);
					cursor += 2;
				} else if (escaped === 114) {
					out.push(RETURN);
					cursor += 2;
				} else if (escaped === 117) {
					out.push(hexValue(points, cursor + 2));
					cursor += 6;
				} else if (escaped >= 0) {
					out.push(escaped);
					cursor += 2;
				} else {
					cursor += 1;
				}
			} else {
				out.push(point);
				cursor += 1;
			}
		}

		return str.fromCodePoints(out);
	}

	return undefined;
}
