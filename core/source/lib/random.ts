/**
 * Random, derived from the one intrinsic, `random.nextU32`.
 *
 * Everything past that single draw is written here, in source: a range or a shuffle would
 * otherwise have to match, bit for bit, across three unrelated standard libraries, which only a
 * shared implementation can guarantee.
 */

/** One past the highest value `random.nextU32` can answer. */
const U32_SPAN = 4294967296;

/**
 * How many draws `randomBelow` allows itself before it falls back to a biased `% bound`. The
 * subset has no unbounded `while`, so the search has to be a counted `for`. The worst case, a
 * bound just over half of 2^32, rejects just under half of every draw, so 32 attempts leave the
 * fallback below reached with probability under 2^-32.
 */
const MAX_ATTEMPTS = 32;

/**
 * A uniform integer in `[0, bound)`, by rejection sampling rather than `% bound`: the modulo of a
 * fixed-width draw is biased whenever `bound` does not divide 2^32 evenly, and that bias would
 * have to match, digit for digit, across three unrelated standard libraries to stay invisible.
 * Rejecting the biased tail of the draw removes it instead.
 */
export function randomBelow(bound: IntRange<1, 4294967296>): IntRange<0, 4294967295> {
	const limit = U32_SPAN - (U32_SPAN % bound);

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const draw = random.nextU32();

		if (draw < limit) {
			return draw % bound;
		}
	}

	// Every attempt above landed in the biased tail, a probability under 2^-32; `% bound` here is
	// the very bias `randomBelow` exists to avoid everywhere else, taken as a documented fallback.
	return random.nextU32() % bound;
}

/** One random ASCII digit. */
export function randomDigit(): Digits {
	return String(randomBelow(10));
}
