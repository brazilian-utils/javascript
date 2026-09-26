import { CEP_RANGES } from "../../get-municipality-by-cep/constants";
import { describe, expect, test } from "../test/runtime";
import { decodeCepRanges } from "./decode-cep-ranges";

describe("decodeCepRanges", () => {
	test("should read the code, the size and the CEPs skipped before each range", () => {
		expect(decodeCepRanges("35503084999998.1000000;3534401299998;12345670.5")).toStrictEqual([
			{ code: "3550308", start: 1_000_001, end: 5_999_999 },
			{ code: "3534401", start: 6_000_000, end: 6_299_998 },
			{ code: "1234567", start: 6_300_004, end: 6_300_004 },
		]);
	});

	test("should decode every range of the shipped table, ascending and apart, with 7-digit codes and 8-digit CEPs", () => {
		const ranges = decodeCepRanges(CEP_RANGES);

		expect(ranges).toHaveLength(CEP_RANGES.split(";").length);

		for (const [index, { code, start, end }] of ranges.entries()) {
			expect(code).toMatch(/^\d{7}$/);
			expect(start).toBeLessThanOrEqual(end);
			expect(start).toBeGreaterThan(index === 0 ? 1_000_000 : ranges[index - 1].end);
			expect(end).toBeLessThanOrEqual(99_999_999);
		}
	});
});
