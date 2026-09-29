import { describe, expect, test } from "../test/runtime";
import { readCached } from "./read-cached";

describe("readCached", () => {
	test("should build the value of a key on its first read", () => {
		const cache = new Map<string, number>();

		expect(readCached(cache, "abc", (key) => key.length)).toBe(3);
		expect(cache.get("abc")).toBe(3);
	});

	test("should build each key once and hand back the stored value after that", () => {
		const cache = new Map<string, { size: number }>();
		const built: string[] = [];
		const build = (key: string) => {
			built.push(key);

			return { size: key.length };
		};

		const first = readCached(cache, "ab", build);

		expect(readCached(cache, "ab", build)).toBe(first);
		expect(readCached(cache, "abcd", build)).toEqual({ size: 4 });
		expect(readCached(cache, "ab", build)).toBe(first);
		expect(built).toEqual(["ab", "abcd"]);
	});

	test("should read a value that is already in the cache without building", () => {
		const cache = new Map([["key", "stored"]]);

		expect(readCached(cache, "key", () => "built")).toBe("stored");
	});

	test("should keep a falsy value that is not undefined or null", () => {
		const cache = new Map<string, number>();
		let builds = 0;
		const build = () => {
			builds++;

			return 0;
		};

		expect(readCached(cache, "zero", build)).toBe(0);
		expect(readCached(cache, "zero", build)).toBe(0);
		expect(builds).toBe(1);
	});
});
