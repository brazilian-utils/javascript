import * as fc from "fast-check";

import { anyText, anyValue } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCnpj, type ParseCnpjOptions } from "./parse-cnpj";

describe("parseCnpj", () => {
	it("should remove CNPJ mask characters", () => {
		expect(parseCnpj("46.843.485/0001-86")).toBe("46843485000186");
	});

	it("should remove non numeric characters", () => {
		expect(parseCnpj("46.?ABC843.485/0001-86abc")).toBe("46843485000186");
	});

	it("should keep alphanumeric characters for version 2", () => {
		expect(parseCnpj("Q0.SLF.MBD/7VX4-39", { version: 2 })).toBe("Q0SLFMBD7VX439");
	});

	it("should ignore digits after the CNPJ length", () => {
		expect(parseCnpj("46843485000186123")).toBe("46843485000186");
	});

	it("should ignore characters after the CNPJ length for version 2", () => {
		expect(parseCnpj("Q0.SLF.MBD/7VX4-39ABC", { version: 2 })).toBe("Q0SLFMBD7VX439");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCnpj(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the characters of a CNPJ, for both versions", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					expect(parseCnpj(value)).toMatch(/^\d{0,14}$/);
					expect(parseCnpj(value, { version: 2 })).toMatch(/^[0-9A-Z]{0,14}$/);
				}),
			);
		});

		test("should be idempotent for both versions", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					const numeric = parseCnpj(value);
					const alphanumeric = parseCnpj(value, { version: 2 });

					expect(parseCnpj(numeric)).toBe(numeric);
					expect(parseCnpj(alphanumeric, { version: 2 })).toBe(alphanumeric);
				}),
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCnpj, "string", anyValue);
		});
	});
});

describe("parseCnpj types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(parseCnpj).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCnpj).parameter(1).toEqualTypeOf<ParseCnpjOptions | undefined>();
		expectTypeOf(parseCnpj).returns.toEqualTypeOf<string>();
	});

	test("should type the version option as an optional 1 or 2", () => {
		expectTypeOf<ParseCnpjOptions["version"]>().toEqualTypeOf<1 | 2 | undefined>();
	});
});
