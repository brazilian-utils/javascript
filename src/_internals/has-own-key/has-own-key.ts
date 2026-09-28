/**
 * Checks that a key is an own key of a table, narrowing it to the table's keys. The lookup is an
 * own-property one, so a prototype-chain key such as `"__proto__"` or `"constructor"` is not a key
 * of any table.
 *
 * @param {object} table - The table to look the key up in.
 * @param {string} key - The key to look up.
 * @returns {boolean} True when `key` is an own key of `table`.
 *
 * @example
 * ```typescript
 * hasOwnKey({ SP: "8" }, "SP"); // true
 * hasOwnKey({ SP: "8" }, "constructor"); // false
 * ```
 */
export const hasOwnKey = <Table extends object>(
	table: Table,
	key: string,
): key is Extract<keyof Table, string> => Object.hasOwn(table, key);
