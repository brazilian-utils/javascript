import * as fc from "fast-check";

import { LEGAL_NATURE_CATEGORIES } from "../_internals/constants/legal-nature-categories";
import { anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { LEGACY_LEGAL_NATURE, LEGAL_NATURE } from "../is-valid-legal-nature/constants";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { getLegalNature, type LegalNature, type LegalNatureCategory } from "./get-legal-nature";

const SOCIEDADE_EMPRESARIA_LIMITADA: LegalNature = {
	code: "2062",
	description: "Sociedade Empresária Limitada",
	category: { code: "2", description: "Entidades Empresariais" },
	legacy: false,
};

describe("getLegalNature", () => {
	it("should reject a code with letters attached, like isValidLegalNature does", () => {
		expect(getLegalNature("2062a")).toBeNull();
		expect(getLegalNature("a2062")).toBeNull();
		expect(getLegalNature("206-2")).toEqual(SOCIEDADE_EMPRESARIA_LIMITADA);
	});

	it("should return the legal nature entry for a known code as a string", () => {
		expect(getLegalNature("2062")).toEqual(SOCIEDADE_EMPRESARIA_LIMITADA);
	});

	it("should return the legal nature entry for a known code as a number", () => {
		expect(getLegalNature(2062)).toEqual(SOCIEDADE_EMPRESARIA_LIMITADA);
	});

	it("should strip the mask of a number just like the mask of a string", () => {
		expect(getLegalNature(206.2)).toEqual(SOCIEDADE_EMPRESARIA_LIMITADA);
		expect(getLegalNature(206.2)).toEqual(getLegalNature("206.2"));
	});

	it("should return the legal nature entry for a masked code (206-2)", () => {
		expect(getLegalNature("206-2")).toEqual(SOCIEDADE_EMPRESARIA_LIMITADA);
	});

	it("should carry the CONCLA category of the first digit of the code", () => {
		expect(getLegalNature("1015")?.category).toEqual({
			code: "1",
			description: "Administração Pública",
		});
		expect(getLegalNature("3034")?.category).toEqual({
			code: "3",
			description: "Entidades sem Fins Lucrativos",
		});
		expect(getLegalNature("4014")?.category).toEqual({
			code: "4",
			description: "Pessoas Físicas",
		});
		expect(getLegalNature("5010")?.category).toEqual({
			code: "5",
			description: "Organizações Internacionais e Outras Instituições Extraterritoriais",
		});
	});

	it("should carry the category of the first digit for a legacy code too", () => {
		expect(getLegalNature("2208")?.category).toEqual({
			code: "2",
			description: "Entidades Empresariais",
		});
		expect(getLegalNature("5002")?.category).toEqual({
			code: "5",
			description: "Organizações Internacionais e Outras Instituições Extraterritoriais",
		});
	});

	it("should tag a code in force as not legacy, with no currentCode", () => {
		const entry = getLegalNature("2070");

		expect(entry?.legacy).toBe(false);
		expect(entry).not.toHaveProperty("currentCode");
	});

	it("should tag a retired code as legacy, with the code it corresponds to today", () => {
		expect(getLegalNature("2076")).toEqual({
			code: "2076",
			description: "Sociedade Empresária em Nome Coletivo",
			category: { code: "2", description: "Entidades Empresariais" },
			legacy: true,
			currentCode: "2070",
		});
		expect(getLegalNature("2208")).toEqual({
			code: "2208",
			description: "Entidade Binacional Itaipu",
			category: { code: "2", description: "Entidades Empresariais" },
			legacy: true,
			currentCode: "2275",
		});
	});

	it("should map every retired code to the CONCLA correspondence", () => {
		expect(getLegalNature("2076")).toMatchObject({ legacy: true, currentCode: "2070" });
		expect(getLegalNature("2100")).toMatchObject({ legacy: true, currentCode: null });
		expect(getLegalNature("2208")).toMatchObject({ legacy: true, currentCode: "2275" });
		expect(getLegalNature("3042")).toMatchObject({ legacy: true, currentCode: "3069" });
		expect(getLegalNature("3050")).toMatchObject({ legacy: true, currentCode: null });
		expect(getLegalNature("3093")).toMatchObject({ legacy: true, currentCode: "3999" });
		expect(getLegalNature("3123")).toMatchObject({ legacy: true, currentCode: null });
		expect(getLegalNature("5002")).toMatchObject({ legacy: true, currentCode: "5010" });
	});

	it("should point every non null currentCode at a code in force", () => {
		for (const code of Object.keys(LEGACY_LEGAL_NATURE)) {
			const entry = getLegalNature(code);

			if (entry?.legacy !== true || entry.currentCode === null) continue;

			expect(getLegalNature(entry.currentCode)).toMatchObject({ legacy: false });
		}
	});

	it("should return a fresh object on every call", () => {
		const first = getLegalNature("2062");
		const second = getLegalNature("2062");
		expect(first).not.toBe(second);
		expect(first?.category).not.toBe(second?.category);
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

	it("should return null for an object with no string form, instead of throwing", () => {
		expect(getLegalNature(Object.create(null))).toBeNull();
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
					const legacy = Object.hasOwn(LEGACY_LEGAL_NATURE, code);
					const entry = {
						code,
						description: LEGAL_NATURE[code],
						category: LEGAL_NATURE_CATEGORIES[code[0]],
						...(legacy ? { legacy, currentCode: LEGACY_LEGAL_NATURE[code] } : { legacy }),
					};

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

	test("should discriminate the entry on legacy and only then expose currentCode", () => {
		expectTypeOf<LegalNature["legacy"]>().toEqualTypeOf<boolean>();
		expectTypeOf<Extract<LegalNature, { legacy: true }>["currentCode"]>().toEqualTypeOf<
			string | null
		>();
		expectTypeOf<Extract<LegalNature, { legacy: false }>>().not.toHaveProperty("currentCode");
	});

	test("should type the category as a code of the five CONCLA groups and a description", () => {
		expectTypeOf<LegalNature["category"]>().toEqualTypeOf<LegalNatureCategory>();
		expectTypeOf<LegalNatureCategory["code"]>().toEqualTypeOf<"1" | "2" | "3" | "4" | "5">();
		expectTypeOf<LegalNatureCategory["description"]>().toEqualTypeOf<string>();
	});
});
