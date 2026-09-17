/**
 * Picks one item of a list at random, with every item equally likely.
 *
 * Uses `Math.random()`, so it is not cryptographically secure; it only ever serves the
 * `generate*` utilities, which say so in their own documentation.
 *
 * @param {readonly Item[]} items - The list to pick from.
 * @returns {Item} One item of the list.
 *
 * @example
 * ```typescript
 * pickRandom(["mobile", "landline"]); // "landline"
 * pickRandom([11, 21, 31]); // 21
 * ```
 */
export const pickRandom = <Item>(items: readonly Item[]): Item =>
	items[Math.floor(Math.random() * items.length)];
