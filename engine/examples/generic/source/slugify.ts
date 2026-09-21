/**
 * A second example: turning a title into an ASCII slug, with no host locale involved.
 */

const HYPHEN = 45;
const LOWER_A = 97;
const LOWER_Z = 122;
const ZERO = 48;
const NINE = 57;

/** A lower cased, hyphen separated slug, keeping only ASCII letters and digits. */
export function slugify(title: string): Ascii {
	let out: IntRange<0, 127>[] = [];
	let pendingHyphen = false;

	for (const point of str.codePoints(str.asciiLower(title))) {
		// The guard is written inline rather than behind a predicate because the checker reads a
		// guard, not a called function: this is what proves every scalar pushed is ASCII.
		if ((point >= LOWER_A && point <= LOWER_Z) || (point >= ZERO && point <= NINE)) {
			if (pendingHyphen && out.length > 0) {
				out.push(HYPHEN);
			}

			pendingHyphen = false;
			out.push(point);
		} else {
			pendingHyphen = true;
		}
	}

	return str.fromCodePoints(out);
}
