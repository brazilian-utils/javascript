import { anyGarbage, digits } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNcm } from "./format-ncm";

describe("formatNcm", () => {
	it("should format an NCM code given as digits", () => {
		expect(formatNcm("84713012")).toBe("8471.30.12");
	});

	it("should format an NCM code given as a number", () => {
		expect(formatNcm(84_713_012)).toBe("8471.30.12");
	});

	it("should format an NCM code that already has the mask", () => {
		expect(formatNcm("8471.30.12")).toBe("8471.30.12");
	});

	it("should format a partial value progressively", () => {
		expect(formatNcm("8")).toBe("8");
		expect(formatNcm("84")).toBe("84");
		expect(formatNcm("847")).toBe("847");
		expect(formatNcm("8471")).toBe("8471");
		expect(formatNcm("84713")).toBe("8471.3");
		expect(formatNcm("847130")).toBe("8471.30");
		expect(formatNcm("8471301")).toBe("8471.30.1");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatNcm("00000000")).toBe("0000.00.00");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatNcm("")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatNcm(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatNcm()).toBe("");
	});

	describe("properties", () => {
		const eightDigitArbitrary = digits(8);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatNcm, anyGarbage);
		});

		test("should format every 8 digit value in the NNNN.NN.NN pattern", () => {
			expectMatchesPattern(formatNcm, /^\d{4}\.\d{2}\.\d{2}$/, eightDigitArbitrary);
		});

		test("should be idempotent on a full 8 digit code", () => {
			expectIdempotent(formatNcm, eightDigitArbitrary);
		});
	});
});

describe("formatNcm types", () => {
	test("should take a string or number and return a string", () => {
		expectTypeOf(formatNcm).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatNcm).returns.toEqualTypeOf<string>();
	});
});
