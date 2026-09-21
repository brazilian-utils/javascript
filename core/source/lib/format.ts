/**
 * Formatting shared by every `format*` utility: thousands grouping, and pattern formatting.
 *
 * A pattern is read one scalar at a time: `0` copies one input scalar, `*` hides one, and
 * anything else is a separator, emitted only while the value still has scalars left.
 *
 * Both the pattern and the value are ASCII, so positions are O(1) everywhere and the result is
 * built by concatenation rather than through a scalar list.
 */

const SLOT = "0";
const HIDDEN = "*";

/** How many digits a thousands group holds, in the pt-BR convention. */
const GROUP_SIZE = 3;

/** Groups the whole part with `.` every three digits, the pt-BR convention. */
export function groupThousands(whole: Digits): Ascii {
	let out: IntRange<0, 127>[] = [];
	const scalars = str.codePoints(whole);

	for (let index = 0; index < scalars.length; index++) {
		if (index > 0 && (scalars.length - index) % GROUP_SIZE === 0) {
			out.push(46);
		}

		out.push(seq.at(scalars, index) ?? 48);
	}

	return str.fromCodePoints(out);
}

/** How many scalars of the value a pattern consumes. */
export function patternSlots(pattern: Ascii): IntRange<0, 2147483647> {
	let slots: IntRange<0, 2147483647> = 0;

	for (let index = 0; index < pattern.length; index++) {
		const symbol = str.charAtOpt(pattern, index) ?? "";

		if (symbol === SLOT || symbol === HIDDEN) {
			slots += 1;
		}
	}

	return slots;
}

/** Formats a value against a pattern, optionally left padding it with zeros first. */
export function formatWithPattern(value: Ascii, pattern: Ascii, pad: boolean): Ascii {
	const padded = pad ? str.padStart(value, patternSlots(pattern), SLOT) : value;

	let out: Ascii = "";
	let taken: Int = 0;

	for (let index = 0; index < pattern.length; index++) {
		const symbol = str.charAtOpt(pattern, index) ?? "";

		if (symbol === SLOT || symbol === HIDDEN) {
			if (taken >= padded.length) {
				return out;
			}

			out = out + (symbol === HIDDEN ? HIDDEN : str.charAtOpt(padded, taken) ?? "");
			taken += 1;
		} else if (taken < padded.length) {
			out = out + symbol;
		}
	}

	return out;
}
