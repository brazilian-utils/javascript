import * as fc from "fast-check";

import { anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { LEGAL_NATURE } from "../is-valid-legal-nature/constants";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { getLegalNature, type LegalNature } from "./get-legal-nature";

describe("getLegalNature", () => {
	it("should reject a code with letters attached, like isValidLegalNature does", () => {
		expect(getLegalNature("2062a")).toBeNull();
		expect(getLegalNature("a2062")).toBeNull();
		expect(getLegalNature("206-2")).toEqual({
			code: "2062",
			description: getLegalNature("2062")?.description,
		});
	});

	it("should return the legal nature entry for a known code as a string", () => {
		expect(getLegalNature("2062")).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return the legal nature entry for a known code as a number", () => {
		expect(getLegalNature(2062)).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return the legal nature entry for a masked code (206-2)", () => {
		expect(getLegalNature("206-2")).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return a fresh object on every call", () => {
		const first = getLegalNature("2062");
		const second = getLegalNature("2062");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown 4 digit code", () => {
		expect(getLegalNature("0000")).toBeNull();
	});

	it("should return null for a code with a length different from 4", () => {
		expect(getLegalNature("206")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getLegalNature("")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error not a string or number
		expect(getLegalNature(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error not a string or number
		expect(getLegalNature()).toBeNull();
	});

	describe("properties", () => {
		const knownCode = fc.constantFrom(...Object.keys(LEGAL_NATURE));

		test("should look every code of the table up, masked, plain or numeric", () => {
			fc.assert(
				fc.property(knownCode, (code) => {
					const entry = { code, description: LEGAL_NATURE[code] };

					expect(getLegalNature(code)).toEqual(entry);
					expect(getLegalNature(`${code.slice(0, 3)}-${code.slice(3)}`)).toEqual(entry);
					expect(getLegalNature(Number(code))).toEqual(entry);
				}),
			);
		});

		test("should agree with isValidLegalNature on every digits only value", () => {
			fc.assert(
				fc.property(digitsUpTo(6), (value) => {
					expect(getLegalNature(value) !== null).toBe(isValidLegalNature(value));
				}),
			);
		});

		test("should never throw and always return null or an entry of the table", () => {
			fc.assert(
				fc.property(anyValue, (value) => {
					const result = getLegalNature(value as string);

					expect(result === null || LEGAL_NATURE[result.code] === result.description).toBe(true);
				}),
			);
		});
	});
});

describe("getLegalNature types", () => {
	test("should take a string or number value and return a legal nature entry or null", () => {
		expectTypeOf(getLegalNature).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getLegalNature).returns.toEqualTypeOf<LegalNature | null>();
	});

	test("should type the legal nature entry fields as strings", () => {
		expectTypeOf<LegalNature["code"]>().toEqualTypeOf<string>();
		expectTypeOf<LegalNature["description"]>().toEqualTypeOf<string>();
	});
});
