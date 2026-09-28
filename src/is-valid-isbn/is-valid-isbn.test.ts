import * as fc from "fast-check";

import { gs1CheckDigit } from "../_internals/gs1-check-digit/gs1-check-digit";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidIsbn } from "./is-valid-isbn";

describe("isValidIsbn", () => {
	test("should reject an ISMN, which starts with 979-0, even with a valid check digit", () => {
		expect(isValidIsbn("9790260000438")).toBe(false);
		expect(isValidIsbn("979-0-2600-0043-8")).toBe(false);
		expect(isValidIsbn("979 0 2600 0043 8")).toBe(false);
	});

	test("should still accept an ISBN with the prefix 979 in another group", () => {
		expect(isValidIsbn("9798886450026")).toBe(true);
	});

	it("should accept the ISBN Users' Manual example, 978-92-95055-12-4", () => {
		expect(isValidIsbn("9789295055124")).toBe(true);
		expect(isValidIsbn("978-92-95055-12-4")).toBe(true);
	});

	it("should accept Brazilian ISBNs of the groups 85 and 65", () => {
		expect(isValidIsbn("978-85-333-0227-3")).toBe(true);
		expect(isValidIsbn("978-65-89999-01-0")).toBe(true);
	});

	it("should accept a 979 ISBN", () => {
		expect(isValidIsbn("979-10-90636-07-1")).toBe(true);
	});

	it("should accept the ISBN label, with or without -13 and a colon", () => {
		expect(isValidIsbn("ISBN 978-85-333-0227-3")).toBe(true);
		expect(isValidIsbn("ISBN-13: 978-85-333-0227-3")).toBe(true);
		expect(isValidIsbn("isbn 9788533302273")).toBe(true);
		expect(isValidIsbn(" ISBN:9788533302273 ")).toBe(true);
	});

	it("should accept a single whitespace or hyphen between any two digits", () => {
		expect(isValidIsbn("978 85 333 0227 3")).toBe(true);
		expect(isValidIsbn("9-7-8-8-5-3-3-3-0-2-2-7-3")).toBe(true);
		expect(isValidIsbn("9 788533302273")).toBe(true);
	});

	it("should reject any other character between the first digits", () => {
		expect(isValidIsbn("9x788533302273")).toBe(false);
		expect(isValidIsbn("97x88533302273")).toBe(false);
	});

	it("should reject a wrong check digit, the Agência Brasileira do ISBN example included", () => {
		expect(isValidIsbn("978-85-333-0227-4")).toBe(false);
		expect(isValidIsbn("ISBN 978-65-89999-01-3")).toBe(false);
	});

	it("should reject the 10 digit ISBN", () => {
		expect(isValidIsbn("85-333-0227-6")).toBe(false);
		expect(isValidIsbn("0306406152")).toBe(false);
		expect(isValidIsbn("030640615X")).toBe(false);
	});

	it("should reject a GS1 prefix other than 978 and 979, although its check digit is valid", () => {
		const body = "977853330227";

		expect(isValidIsbn(`${body}${gs1CheckDigit(body)}`)).toBe(false);
	});

	it("should accept any of the mask characters isValidCpf reads between two digits, alone or in a run", () => {
		expect(isValidIsbn("978--85-333-0227-3")).toBe(true);
		expect(isValidIsbn("978.85.333.0227.3")).toBe(true);
		expect(isValidIsbn("978/8533302273")).toBe(true);
	});

	it("should reject a leading or trailing separator and any other character", () => {
		expect(isValidIsbn("-978-85-333-0227-3")).toBe(false);
		expect(isValidIsbn("978-85-333-0227-3-")).toBe(false);
		expect(isValidIsbn("978_85_333_0227_3")).toBe(false);
	});

	it("should reject the wrong number of digits", () => {
		expect(isValidIsbn("978853330227")).toBe(false);
		expect(isValidIsbn("97885333022730")).toBe(false);
		expect(isValidIsbn("")).toBe(false);
		expect(isValidIsbn("ISBN")).toBe(false);
	});

	it("should reject a value that is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidIsbn(9_788_533_302_273)).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidIsbn(null)).toBe(false);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidIsbn, anyGarbage);
		});

		test("should accept every 978 or 979 body (but 979-0, the ISMN) completed with its check digit, and no other digit", () => {
			fc.assert(
				fc.property(
					fc.constantFrom("978", "979"),
					fc.stringMatching(/^\d{9}$/),
					fc.integer({ min: 1, max: 9 }),
					(prefix, rest, shift) => {
						fc.pre(!`${prefix}${rest}`.startsWith("9790"));

						const body = `${prefix}${rest}`;
						const digit = gs1CheckDigit(body);

						expect(isValidIsbn(`${body}${digit}`)).toBe(true);
						expect(isValidIsbn(`${body}${(digit + shift) % 10}`)).toBe(false);
					},
				),
			);
		});
	});
});

describe("isValidIsbn types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidIsbn).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidIsbn).returns.toEqualTypeOf<boolean>();
	});
});
