import { CID10_SUBCATEGORIES } from "../constants/cid10";

let cache: Record<string, string> | undefined;

/**
 * Unpacks `CID10_SUBCATEGORIES` (`scripts/cid10.ts` packs it) into every CID-10 category, in
 * ascending order, with the fourth characters of its subcategories: `A00: "019"` stands for
 * `A00.0`, `A00.1` and `A00.9`, and an empty string for a category that is not subdivided. Each
 * category is 3 characters of the packed text: how far its number is from the previous
 * category's (a letter counts for 100 numbers) less one, in base 36 (`z` and two more
 * characters when it is 35 or more), then a 10 bit mask of its subcategory digits in two base
 * 36 characters. The table is unpacked on its first read and the same object is handed back
 * after that, so a caller must not change it.
 *
 * @returns {Record<string, string>} The fourth characters of each category's subcategories,
 * keyed by category.
 *
 * @example
 * ```typescript
 * readCid10Subcategories().A00; // "019"
 * readCid10Subcategories().A09; // ""
 * ```
 */
export const readCid10Subcategories = (): Record<string, string> => {
	if (cache !== undefined) return cache;

	const categories: Record<string, string> = {};
	let value = -1;

	for (const [, distance, mask] of CID10_SUBCATEGORIES.matchAll(/(z..|.)(..)/g)) {
		value += 1 + Number.parseInt(distance.length === 3 ? distance.slice(1) : distance, 36);

		const bits = Number.parseInt(mask, 36);
		const letter = String.fromCodePoint(65 + Math.floor(value / 100));

		categories[`${letter}${String(value % 100).padStart(2, "0")}`] = Array.from(
			{ length: 10 },
			(_, digit) => digit,
		)
			.filter((digit) => (bits >> digit) & 1)
			.join("");
	}

	cache = categories;

	return categories;
};
