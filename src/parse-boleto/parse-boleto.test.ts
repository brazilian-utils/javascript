import * as fc from "fast-check";

import { bench, describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateBoleto } from "../generate-boleto/generate-boleto";
import { getBoletoInfo } from "../get-boleto-info/get-boleto-info";
import { isValidBoleto } from "../is-valid-boleto/is-valid-boleto";
import { parseBoleto } from "./parse-boleto";

describe("parseBoleto", () => {
	it("should remove boleto mask characters", () => {
		expect(parseBoleto("10491.44338 55119.000002 00000.000141 3 25230000093423")).toBe(
			"10491443385511900000200000000141325230000093423",
		);
	});

	it("should remove non numeric characters", () => {
		expect(parseBoleto("10491.44A338 55119.000002? ABC00000.000?141 3 25230000093423")).toBe(
			"10491443385511900000200000000141325230000093423",
		);
	});

	it("should return an empty string when the value is nullish", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parseBoleto(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parseBoleto()).toBe("");
	});

	it("should ignore digits after the boleto length", () => {
		expect(parseBoleto("10491443385511900000200000000141325230000093423123")).toBe(
			"10491443385511900000200000000141325230000093423",
		);
	});

	describe("arrecadação", () => {
		it("should remove the arrecadação mask characters", () => {
			expect(parseBoleto("84610000000-5 24610029110-2 00546033900-4 69589506108-0")).toBe(
				"846100000005246100291102005460339004695895061080",
			);
		});

		it("should keep the 48 digits of an arrecadação linha digitável", () => {
			expect(parseBoleto("846100000005246100291102005460339004695895061080")).toHaveLength(48);
		});

		it("should ignore digits after the arrecadação length", () => {
			expect(parseBoleto("846100000005246100291102005460339004695895061080123")).toBe(
				"846100000005246100291102005460339004695895061080",
			);
		});
	});

	describe("properties", () => {
		test("should only ever return digits, and never more than a bank slip has", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const parsed = parseBoleto(value);

					expect(/^\d*$/.test(parsed)).toBe(true);
					expect(parsed.length).toBeLessThanOrEqual(48);
				}),
			);
		});

		test("should be idempotent over the bank slip digits", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const parsed = parseBoleto(value);

					expect(parseBoleto(parsed)).toBe(parsed);
				}),
			);
		});

		test("should give back the digits of a masked generated bank slip", () => {
			fc.assert(
				fc.property(fc.constantFrom("bancario", "arrecadacao"), (type) => {
					const value = generateBoleto({ type });
					const masked = `${value.slice(0, 5)}. ${value.slice(5, 20)}-${value.slice(20)}`;

					expect(parseBoleto(masked)).toBe(value);
				}),
			);
		});

		test("should never throw and always return the bank slip digits as a string", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), fc.integer(), (text, number) => {
					expect(typeof parseBoleto(text)).toBe("string");
					expect(typeof parseBoleto(number)).toBe("string");
				}),
			);
		});
	});
});

describe("parseBoleto benchmarks", () => {
	const LINE = "23793.38128 60007.827136 95000.063305 9 84350000026035";

	bench("parseBoleto", () => {
		parseBoleto(LINE);
	});

	bench("isValidBoleto", () => {
		isValidBoleto(LINE);
	});

	bench("getBoletoInfo", () => {
		getBoletoInfo(LINE);
	});
});

describe("parseBoleto types", () => {
	test("should take a string or number and return a string", () => {
		expectTypeOf(parseBoleto).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseBoleto).returns.toEqualTypeOf<string>();
	});
});
