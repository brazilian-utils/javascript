/**
 * Laying a value over a mask, which is what every `format*` utility does.
 *
 * The mask is a string: `0` is a slot the value fills, `*` is a slot the value fills and the
 * mask hides, and anything else is a separator, written only while there is still value left
 * to write.
 */

/**
 * Lays a value over a pattern.
 *
 * @param {string} value - The sanitized value.
 * @param {string} pattern - The mask.
 * @param {boolean} pad - Whether to left pad the value with zeros up to the number of slots.
 * @returns {string} The masked value, cut short where the value runs out.
 */
export const layout = (value: string, pattern: string, pad: boolean): string => {
	let slots = 0;

	for (let index = 0; index < pattern.length; index++) {
		if (pattern.charCodeAt(index) === 48 || pattern.charCodeAt(index) === 42) {
			slots += 1;
		}
	}

	let padded = value;

	if (pad) {
		padded = value.padStart(slots, "0");
	}

	let formatted = "";
	let cursor = 0;

	for (let index = 0; index < pattern.length; index++) {
		const slot = pattern.charCodeAt(index);

		if (slot === 48 || slot === 42) {
			if (cursor >= padded.length) {
				return formatted;
			}

			if (slot === 42) {
				formatted += "*";
			} else {
				formatted += padded.slice(cursor, cursor + 1);
			}

			cursor += 1;
		} else if (cursor < padded.length) {
			formatted += pattern.slice(index, index + 1);
		}
	}

	return formatted;
};
