import { describe, expect, test } from "../test/runtime";
import { unpackTexts } from "./unpack-texts";

describe("unpackTexts", () => {
	test("should read the texts, each sharing the start of the one before it", () => {
		expect(unpackTexts("0Cólera\n6 devida\n0Febre\n5 tifóide")).toEqual([
			"Cólera",
			"Cólera devida",
			"Febre",
			"Febre tifóide",
		]);
	});

	test("should read a text that is a copy of the one before it, or an empty one", () => {
		expect(unpackTexts("0abc\n3\n0")).toEqual(["abc", "abc", ""]);
	});

	test("should read the first text whole, even when it claims to share a start", () => {
		expect(unpackTexts("5abc\n1x")).toEqual(["abc", "ax"]);
	});

	test("should read a start of more than nine characters", () => {
		const start = "0123456789abcdefghijklmnopqrstuvwxyz";

		expect(unpackTexts(`0${start}\nz?\na!`)).toEqual([
			start,
			`${start.slice(0, 35)}?`,
			`${start.slice(0, 10)}!`,
		]);
	});

	test("should read a text that has a line continuation look-alike or a quote", () => {
		expect(unpackTexts('0say "hi"\\\n6 there')).toEqual(['say "hi"\\', 'say "h there']);
	});

	test("should hand back the same array on a second read", () => {
		expect(unpackTexts("0a\n1b")).toBe(unpackTexts("0a\n1b"));
	});
});
