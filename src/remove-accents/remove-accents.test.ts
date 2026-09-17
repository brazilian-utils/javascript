import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { removeAccents } from "./remove-accents";

describe("removeAccents", () => {
	it("should remove combining marks outside the Latin block", () => {
		expect(removeAccents("a\u1AB0")).toBe("a");
		expect(removeAccents("\u0915\u093C")).toBe("\u0915");
	});

	it("should remove an acute accent", () => {
		expect(removeAccents("Piauí")).toBe("Piaui");
	});

	it("should remove a circumflex accent", () => {
		expect(removeAccents("Você")).toBe("Voce");
	});

	it("should remove a tilde", () => {
		expect(removeAccents("São Paulo")).toBe("Sao Paulo");
	});

	it("should remove a grave accent", () => {
		expect(removeAccents("à")).toBe("a");
	});

	it("should remove a cedilla", () => {
		expect(removeAccents("Açaí")).toBe("Acai");
	});

	it("should remove multiple accents in the same word", () => {
		expect(removeAccents("Ceará")).toBe("Ceara");
	});

	it("should keep an already unaccented string unchanged", () => {
		expect(removeAccents("Brasil")).toBe("Brasil");
	});

	it("should keep casing, digits, spaces and punctuation untouched", () => {
		expect(removeAccents("São Paulo, SP - 2024!")).toBe("Sao Paulo, SP - 2024!");
	});

	it("should return an empty string when given an empty string", () => {
		expect(removeAccents("")).toBe("");
	});

	it("should return an empty string when given null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(removeAccents(null)).toBe("");
	});

	it("should return an empty string when given undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(removeAccents()).toBe("");
	});

	it("should return an empty string when given a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(removeAccents(123)).toBe("");
	});

	describe("properties", () => {
		const accentedWordArbitrary = fc.constantFrom(
			"São Paulo",
			"Piauí",
			"Ceará",
			"Açaí",
			"Você",
			"à",
			"Bahia",
			"coração",
			"não",
			"então",
			"único",
			"Maranhão",
			"Goiânia",
			"café com pão",
		);
		const accentedTextArbitrary = fc.array(accentedWordArbitrary).map((words) => words.join(" "));

		test("should never throw, regardless of the input", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(() => removeAccents(value as never)).not.toThrow();
				}),
			);
		});

		test("should be idempotent", () => {
			fc.assert(
				fc.property(accentedTextArbitrary, (value) => {
					const once = removeAccents(value);

					expect(removeAccents(once)).toBe(once);
				}),
			);
		});

		test("should never return a string longer than the input", () => {
			fc.assert(
				fc.property(accentedTextArbitrary, (value) => {
					expect(removeAccents(value).length).toBeLessThanOrEqual(value.length);
				}),
			);
		});
	});
});

describe("removeAccents types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(removeAccents).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(removeAccents).returns.toEqualTypeOf<string>();
	});
});
