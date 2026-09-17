import { describe, expect, test } from "../test/runtime";
import { padLookupCode } from "./pad-lookup-code";

describe("padLookupCode", () => {
	test("should left pad a number with zeros up to the given width", () => {
		expect(padLookupCode(10_205, 6)).toBe("010205");
		expect(padLookupCode(0, 3)).toBe("000");
		expect(padLookupCode(5, 3)).toBe("005");
	});

	test("should left pad a string of bare digits exactly like the number it spells", () => {
		expect(padLookupCode("10205", 6)).toBe("010205");
		expect(padLookupCode("0", 3)).toBe("000");
	});

	test("should return a value already as wide as the table unchanged", () => {
		expect(padLookupCode("212405", 6)).toBe("212405");
		expect(padLookupCode(212_405, 6)).toBe("212405");
	});

	test("should never shorten a value wider than the table", () => {
		expect(padLookupCode("2124055", 6)).toBe("2124055");
	});

	test("should trim surrounding whitespace before padding", () => {
		expect(padLookupCode("  10205  ", 6)).toBe("010205");
		expect(padLookupCode(" 212405 ", 6)).toBe("212405");
	});

	test("should hand a masked value back untouched, even when it is narrower than the table", () => {
		expect(padLookupCode("6201-5/01", 7)).toBe("6201-5/01");
		expect(padLookupCode("12-3", 6)).toBe("12-3");
		expect(padLookupCode("2124 05", 6)).toBe("2124 05");
	});

	test("should hand a value that is not digits back untouched", () => {
		expect(padLookupCode("abc", 6)).toBe("abc");
		expect(padLookupCode("2124abc05", 6)).toBe("2124abc05");
		expect(padLookupCode("+212405", 6)).toBe("+212405");
	});

	test("should never turn an empty value into a code of zeros", () => {
		expect(padLookupCode("", 6)).toBe("");
		expect(padLookupCode("   ", 6)).toBe("");
	});
});
