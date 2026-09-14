import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCnae } from "../format-cnae/format-cnae";
import { parseCnae } from "./parse-cnae";

describe("parseCnae", () => {
	it("should remove CNAE mask characters", () => {
		expect(parseCnae("6201-5/01")).toBe("6201501");
	});

	it("should remove non numeric characters", () => {
		expect(parseCnae("62?ABC01-5/01abc")).toBe("6201501");
	});

	it("should ignore digits after the CNAE length", () => {
		expect(parseCnae("6201501999")).toBe("6201501");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseCnae(6_201_501)).toBe("6201501");
	});

	it("should keep a partial code as written, without padding it", () => {
		expect(parseCnae("62")).toBe("62");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCnae(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CNAE subclass", () => {
			expectMatchesPattern(parseCnae, /^\d{0,7}$/, anyText);
		});

		test("should undo formatCnae", () => {
			expectRoundTrip(formatCnae, parseCnae, digitsUpTo(7));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCnae, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCnae, "string", anyValue);
		});
	});
});

describe("parseCnae types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCnae).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCnae).returns.toEqualTypeOf<string>();
	});
});
