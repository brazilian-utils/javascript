import * as fc from "fast-check";

import { LEGAL_NATURE_CATEGORIES } from "../_internals/constants/legal-nature-categories";
import { anyValue } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { getLegalNature, type LegalNature } from "../get-legal-nature/get-legal-nature";
import { LEGACY_LEGAL_NATURE, LEGAL_NATURE } from "../is-valid-legal-nature/constants";
import {
	type GetLegalNaturesByCategoryOptions,
	getLegalNaturesByCategory,
} from "./get-legal-natures-by-category";

const PESSOAS_FISICAS: LegalNature[] = [
	{
		code: "4014",
		description: "Empresa Individual Imobiliária",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
	{
		code: "4022",
		description: "Segurado Especial",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
	{
		code: "4081",
		description: "Contribuinte individual",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
	{
		code: "4090",
		description: "Candidato a Cargo Político Eletivo",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
	{
		code: "4111",
		description: "Leiloeiro",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
	{
		code: "4120",
		description: "Produtor Rural (Pessoa Física)",
		category: { code: "4", description: "Pessoas Físicas" },
		legacy: false,
	},
];

const EXTRATERRITORIAL_CATEGORY = {
	code: "5",
	description: "Organizações Internacionais e Outras Instituições Extraterritoriais",
} as const;

const EXTRATERRITORIAIS: LegalNature[] = [
	{
		code: "5010",
		description: "Organização Internacional",
		category: { ...EXTRATERRITORIAL_CATEGORY },
		legacy: false,
	},
	{
		code: "5029",
		description: "Representação Diplomática Estrangeira",
		category: { ...EXTRATERRITORIAL_CATEGORY },
		legacy: false,
	},
	{
		code: "5037",
		description: "Outras Instituições Extraterritoriais",
		category: { ...EXTRATERRITORIAL_CATEGORY },
		legacy: false,
	},
];

const EXTRATERRITORIAIS_WITH_LEGACY: LegalNature[] = [
	{
		code: "5002",
		description: "Organização Internacional e Outras Instituições Extraterritoriais",
		category: { ...EXTRATERRITORIAL_CATEGORY },
		legacy: true,
		currentCode: "5010",
	},
	...EXTRATERRITORIAIS,
];

const codesOf = (category: string | number, options?: GetLegalNaturesByCategoryOptions): string[] =>
	getLegalNaturesByCategory(category, options).map((legalNature) => legalNature.code);

describe("getLegalNaturesByCategory", () => {
	test("should return the whole category as entries, ascending by code", () => {
		expect(getLegalNaturesByCategory("4")).toEqual(PESSOAS_FISICAS);
	});

	test("should leave the legacy codes of the category out by default", () => {
		expect(getLegalNaturesByCategory("5")).toEqual(EXTRATERRITORIAIS);
	});

	test("should list the legacy codes of the category in place with includeLegacy", () => {
		expect(getLegalNaturesByCategory("5", { includeLegacy: true })).toEqual(
			EXTRATERRITORIAIS_WITH_LEGACY,
		);
	});

	test("should tag a legacy entry with the code it corresponds to today", () => {
		const itaipu = getLegalNaturesByCategory("2", { includeLegacy: true }).find(
			(legalNature) => legalNature.code === "2208",
		);

		expect(itaipu).toEqual({
			code: "2208",
			description: "Entidade Binacional Itaipu",
			category: { code: "2", description: "Entidades Empresariais" },
			legacy: true,
			currentCode: "2275",
		});
	});

	test("should leave the legacy codes out for an explicit includeLegacy false", () => {
		expect(getLegalNaturesByCategory("5", { includeLegacy: false })).toEqual(EXTRATERRITORIAIS);
		expect(getLegalNaturesByCategory("5", {})).toEqual(EXTRATERRITORIAIS);
	});

	test("should accept the category code as a number", () => {
		expect(getLegalNaturesByCategory(4)).toEqual(PESSOAS_FISICAS);
		expect(getLegalNaturesByCategory(5)).toEqual(EXTRATERRITORIAIS);
		expect(getLegalNaturesByCategory(5, { includeLegacy: true })).toEqual(
			EXTRATERRITORIAIS_WITH_LEGACY,
		);
	});

	test("should list the 32 codes of Administração Pública", () => {
		expect(codesOf("1")).toEqual([
			"1015",
			"1023",
			"1031",
			"1040",
			"1058",
			"1066",
			"1074",
			"1082",
			"1104",
			"1112",
			"1120",
			"1139",
			"1147",
			"1155",
			"1163",
			"1171",
			"1180",
			"1198",
			"1210",
			"1228",
			"1236",
			"1244",
			"1252",
			"1260",
			"1279",
			"1287",
			"1295",
			"1309",
			"1317",
			"1325",
			"1333",
			"1341",
		]);
	});

	test("should list the 30 codes in force of Entidades Empresariais", () => {
		expect(codesOf("2")).toEqual([
			"2011",
			"2038",
			"2046",
			"2054",
			"2062",
			"2070",
			"2089",
			"2097",
			"2127",
			"2135",
			"2143",
			"2151",
			"2160",
			"2178",
			"2194",
			"2216",
			"2224",
			"2232",
			"2240",
			"2259",
			"2267",
			"2275",
			"2283",
			"2291",
			"2305",
			"2313",
			"2321",
			"2330",
			"2348",
			"2356",
		]);
	});

	test("should list the 21 codes in force of Entidades sem Fins Lucrativos", () => {
		expect(codesOf("3")).toEqual([
			"3034",
			"3069",
			"3077",
			"3085",
			"3107",
			"3115",
			"3131",
			"3204",
			"3212",
			"3220",
			"3239",
			"3247",
			"3255",
			"3263",
			"3271",
			"3280",
			"3298",
			"3301",
			"3310",
			"3328",
			"3999",
		]);
	});

	test("should return a fresh array of fresh entries on every call", () => {
		const first = getLegalNaturesByCategory("5");
		const second = getLegalNaturesByCategory("5");

		expect(first).not.toBe(second);
		expect(first[0]).not.toBe(second[0]);
		expect(first[0].category).not.toBe(second[0].category);
	});

	test("should return an empty array for a category outside 1 to 5", () => {
		expect(getLegalNaturesByCategory("0")).toEqual([]);
		expect(getLegalNaturesByCategory("6")).toEqual([]);
		expect(getLegalNaturesByCategory("9")).toEqual([]);
		expect(getLegalNaturesByCategory(9)).toEqual([]);
	});

	test("should return an empty array for a prefix that is not a category on its own", () => {
		expect(getLegalNaturesByCategory("20")).toEqual([]);
		expect(getLegalNaturesByCategory("2062")).toEqual([]);
		expect(getLegalNaturesByCategory(20)).toEqual([]);
	});

	test("should return an empty array for an empty or padded category code", () => {
		expect(getLegalNaturesByCategory("")).toEqual([]);
		expect(getLegalNaturesByCategory(" 2")).toEqual([]);
		expect(getLegalNaturesByCategory("02")).toEqual([]);
	});

	test("should return an empty array for a value that is not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(getLegalNaturesByCategory(null)).toEqual([]);
		// @ts-expect-error not a string or number
		expect(getLegalNaturesByCategory()).toEqual([]);
		// @ts-expect-error not a string or number
		expect(getLegalNaturesByCategory(["2"])).toEqual([]);
		expect(getLegalNaturesByCategory(Object.create(null))).toEqual([]);
	});

	test("should list the 25 codes of Entidades sem Fins Lucrativos with includeLegacy", () => {
		expect(codesOf("3", { includeLegacy: true })).toEqual([
			"3034",
			"3042",
			"3050",
			"3069",
			"3077",
			"3085",
			"3093",
			"3107",
			"3115",
			"3123",
			"3131",
			"3204",
			"3212",
			"3220",
			"3239",
			"3247",
			"3255",
			"3263",
			"3271",
			"3280",
			"3298",
			"3301",
			"3310",
			"3328",
			"3999",
		]);
	});

	test("should partition the 92 codes in force across the five categories", () => {
		const codes = Object.keys(LEGAL_NATURE_CATEGORIES).flatMap((category) => codesOf(category));

		expect(codes.length).toBe(92);
		expect(new Set(codes).size).toBe(92);
		expect(codes.every((code) => Object.hasOwn(LEGAL_NATURE, code))).toBe(true);
		expect(codes.some((code) => Object.hasOwn(LEGACY_LEGAL_NATURE, code))).toBe(false);
	});

	test("should partition the whole table across the five categories with includeLegacy", () => {
		const codes = Object.keys(LEGAL_NATURE_CATEGORIES).flatMap((category) =>
			codesOf(category, { includeLegacy: true }),
		);

		expect(codes.length).toBe(100);
		expect(new Set(codes).size).toBe(100);
		expect(codes.every((code) => Object.hasOwn(LEGAL_NATURE, code))).toBe(true);
		expect(codes.filter((code) => Object.hasOwn(LEGACY_LEGAL_NATURE, code)).length).toBe(8);
	});

	describe("properties", () => {
		const categoryCodes = fc.constantFrom(...Object.keys(LEGAL_NATURE_CATEGORIES));

		test("should return the same entry getLegalNature returns for every code it lists", () => {
			fc.assert(
				fc.property(categoryCodes, fc.boolean(), (category, includeLegacy) => {
					for (const legalNature of getLegalNaturesByCategory(category, { includeLegacy })) {
						expect(legalNature).toEqual(getLegalNature(legalNature.code));
						expect(legalNature.code.startsWith(category)).toBe(true);
						expect(legalNature.legacy).toBe(Object.hasOwn(LEGACY_LEGAL_NATURE, legalNature.code));
					}
				}),
			);
		});

		test("should only ever add entries when includeLegacy is on", () => {
			fc.assert(
				fc.property(categoryCodes, (category) => {
					const inForce = codesOf(category);
					const withLegacy = codesOf(category, { includeLegacy: true });

					expect(withLegacy.filter((code) => inForce.includes(code))).toEqual(inForce);
					expect(withLegacy.length - inForce.length).toBe(
						withLegacy.filter((code) => Object.hasOwn(LEGACY_LEGAL_NATURE, code)).length,
					);
				}),
			);
		});

		test("should return the codes of a category in ascending order", () => {
			fc.assert(
				fc.property(categoryCodes, (category) => {
					const codes = codesOf(category);

					expect(codes).toEqual([...codes].sort((a, b) => Number(a) - Number(b)));
				}),
			);
		});

		test("should read a number category exactly like its string form", () => {
			fc.assert(
				fc.property(categoryCodes, fc.boolean(), (category, includeLegacy) => {
					expect(getLegalNaturesByCategory(Number(category), { includeLegacy })).toEqual(
						getLegalNaturesByCategory(category, { includeLegacy }),
					);
				}),
			);
		});

		test("should never throw, whatever it is given", () => {
			expectNeverThrows(getLegalNaturesByCategory, anyValue);
		});
	});
});

describe("getLegalNaturesByCategory includeLegacy truthiness", () => {
	test("should read includeLegacy for truthiness, like pad", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getLegalNaturesByCategory("2", { includeLegacy: 1 }).length).toBe(33);
		// @ts-expect-error: intentionally invalid input
		expect(getLegalNaturesByCategory("2", { includeLegacy: 0 }).length).toBe(30);
	});
});

describe("getLegalNaturesByCategory types", () => {
	test("should take a string or number category and return an array of legal natures", () => {
		expectTypeOf(getLegalNaturesByCategory).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getLegalNaturesByCategory).returns.toEqualTypeOf<LegalNature[]>();
	});

	test("should take the listing options as an optional second parameter", () => {
		expectTypeOf(getLegalNaturesByCategory)
			.parameter(1)
			.toEqualTypeOf<GetLegalNaturesByCategoryOptions | undefined>();
		expectTypeOf<GetLegalNaturesByCategoryOptions["includeLegacy"]>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});
