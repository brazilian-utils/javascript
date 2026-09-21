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
	// Kept as `str.codePoints`: real TypeScript spreads a string into substrings (`string[]`), so
	// `[...whole]` would not type-check against the numeric code points this loop pushes below,
	// even though the engine's own checker treats the two spellings as identical Core.
	const scalars = str.codePoints(whole);

	for (let index = 0; index < scalars.length; index++) {
		if (index > 0 && (scalars.length - index) % GROUP_SIZE === 0) {
			out.push(46);
		}

		out.push(scalars[index] ?? 48);
	}

	return str.fromCodePoints(out);
}

/** How many scalars of the value a pattern consumes. */
export function patternSlots(pattern: Ascii): IntRange<0, 2147483647> {
	let slots: IntRange<0, 2147483647> = 0;

	for (let index = 0; index < pattern.length; index++) {
		// Kept as `str.charAtOpt`: `pattern` is always a fixed-length literal at its call sites
		// (`PATTERN`, `OBFUSCATED_PATTERN`), so specialization proves this loop's index in range,
		// and `pattern[index]` would silently pick the *unchecked* accessor — a different Core,
		// not the same one respelled.
		const symbol = str.charAtOpt(pattern, index) ?? "";

		if (symbol === SLOT || symbol === HIDDEN) {
			slots += 1;
		}
	}

	return slots;
}

/** Formats a value against a pattern, optionally left padding it with zeros first. */
export function formatWithPattern(value: Ascii, pattern: Ascii, pad: boolean): Ascii {
	const padded = pad ? value.padStart(patternSlots(pattern), SLOT) : value;

	let out: Ascii = "";
	let taken: Int = 0;

	// `pattern[index]` here for the same reason as `patternSlots` above: always a fixed-length
	// literal at the call site, so the checked accessor stays the namespace form.
	for (let index = 0; index < pattern.length; index++) {
		const symbol = str.charAtOpt(pattern, index) ?? "";

		if (symbol === SLOT || symbol === HIDDEN) {
			if (taken >= padded.length) {
				return out;
			}

			out = out + (symbol === HIDDEN ? HIDDEN : padded[taken] ?? "");
			taken += 1;
		} else if (taken < padded.length) {
			out = out + symbol;
		}
	}

	return out;
}
