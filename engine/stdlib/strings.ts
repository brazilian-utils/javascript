/**
 * Portable string operations.
 *
 * These exist because at least one target cannot lower the operation natively with proven
 * equivalence. `compareScalars` is the clearest case: JavaScript compares strings by UTF-16 code
 * unit, so a non-ASCII value would sort differently there than in Python or Go, and the portable
 * implementation is selected unless the value is proven ASCII.
 */

/** Scalar-order comparison: -1, 0 or 1, identical in every target. */
export function compareScalars(left: string, right: string): IntRange<-1, 1> {
	const leftPoints = str.codePoints(left);
	const rightPoints = str.codePoints(right);
	const shared = int.min(leftPoints.length, rightPoints.length);

	for (let index = 0; index < shared; index++) {
		// The bound comes from a length neither list's type records, so the checked accessor is
		// what keeps the access provably safe.
		const a = seq.at(leftPoints, index) ?? 0;
		const b = seq.at(rightPoints, index) ?? 0;

		if (a < b) {
			return -1;
		}

		if (a > b) {
			return 1;
		}
	}

	if (leftPoints.length < rightPoints.length) {
		return -1;
	}

	if (leftPoints.length > rightPoints.length) {
		return 1;
	}

	return 0;
}

/** ASCII-only upper casing, for values that are not proven ASCII. */
export function asciiUpperAll(value: string): string {
	let points: IntRange<0, 1114111>[] = [];

	for (const point of str.codePoints(value)) {
		if (point >= 97 && point <= 122) {
			points.push(point - 32);
		} else {
			points.push(point);
		}
	}

	return str.fromCodePoints(points);
}

/** ASCII-only lower casing, for values that are not proven ASCII. */
export function asciiLowerAll(value: string): string {
	let points: IntRange<0, 1114111>[] = [];

	for (const point of str.codePoints(value)) {
		if (point >= 65 && point <= 90) {
			points.push(point + 32);
		} else {
			points.push(point);
		}
	}

	return str.fromCodePoints(points);
}
