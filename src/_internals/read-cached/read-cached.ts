const store = <Key, Value>(cache: Map<Key, Value>, key: Key, build: (key: Key) => Value): Value => {
	const value = build(key);

	cache.set(key, value);

	return value;
};

/**
 * Reads the value a cache holds for a key, building and storing it on the first read of that key.
 * The value must never be `undefined` or `null`, which read as missing.
 *
 * @param {Map<Key, Value>} cache - The cache to read and fill.
 * @param {Key} key - The key to read.
 * @param {(key: Key) => Value} build - Builds the value of a key that is not cached yet.
 * @returns {Value} The cached value, or the one just built.
 *
 * @example
 * ```typescript
 * const cache = new Map<string, number>();
 * readCached(cache, "abc", (key) => key.length); // 3
 * readCached(cache, "abc", () => 0); // 3
 * ```
 */
export const readCached = <Key, Value>(
	cache: Map<Key, Value>,
	key: Key,
	build: (key: Key) => Value,
): Value => cache.get(key) ?? store(cache, key, build);
