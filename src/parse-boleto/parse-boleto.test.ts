import { describe, expect, it } from "../_internals/test/runtime";
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
		// @ts-expect-error
		expect(parseBoleto(null)).toBe("");
		// @ts-expect-error
		expect(parseBoleto(undefined)).toBe("");
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
});
