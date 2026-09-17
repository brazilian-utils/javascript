import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getLegalNature } from "../get-legal-nature/get-legal-nature";
import { LEGACY_LEGAL_NATURE, LEGAL_NATURE } from "../is-valid-legal-nature/constants";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { type GetLegalNaturesParams, getLegalNatures } from "./get-legal-natures";

const knownCode = (): fc.Arbitrary<string> =>
	fc.constantFrom(...Object.keys(getLegalNatures({ includeLegacy: true })));

describe("getLegalNatures", () => {
	it("should return legal nature entries", () => {
		expect(getLegalNatures()["2062"]).toBe("Sociedade Empresária Limitada");
	});

	it("should use the descriptions of the 2021 CONCLA table", () => {
		expect(getLegalNatures()["1015"]).toBe("Órgão Público do Poder Executivo Federal");
		expect(getLegalNatures()["5010"]).toBe("Organização Internacional");
		expect(getLegalNatures()["3999"]).toBe("Associação Privada");
	});

	it("should list only the 92 codes in force by default", () => {
		const legalNatures = getLegalNatures();

		expect(Object.keys(legalNatures).length).toBe(92);
		expect(legalNatures["2208"]).toBeUndefined();
		expect(legalNatures["5002"]).toBeUndefined();
	});

	it("should add the 8 retired codes with includeLegacy", () => {
		const legalNatures = getLegalNatures({ includeLegacy: true });

		expect(Object.keys(legalNatures).length).toBe(100);
		expect(legalNatures["2208"]).toBe("Entidade Binacional Itaipu");
		expect(legalNatures["5002"]).toBe(
			"Organização Internacional e Outras Instituições Extraterritoriais",
		);
	});

	it("should leave the retired codes out for an explicit includeLegacy false", () => {
		expect(Object.keys(getLegalNatures({ includeLegacy: false })).length).toBe(92);
		expect(Object.keys(getLegalNatures({})).length).toBe(92);
	});

	it("should return a copy, so mutating the result does not change the table", () => {
		const legalNatures = getLegalNatures();
		legalNatures["2062"] = "changed";

		expect(getLegalNatures()["2062"]).toBe("Sociedade Empresária Limitada");
	});

	it("should return a copy of the legacy listing too", () => {
		const legalNatures = getLegalNatures({ includeLegacy: true });
		legalNatures["2208"] = "changed";

		expect(getLegalNatures({ includeLegacy: true })["2208"]).toBe("Entidade Binacional Itaipu");
	});

	describe("properties", () => {
		const anyKey = fc.string();

		test("should expose only codes its own validator and lookup accept", () => {
			fc.assert(
				fc.property(knownCode(), (code) => {
					const entry = { code, description: getLegalNatures({ includeLegacy: true })[code] };

					expect(code).toMatch(/^\d{4}$/);
					expect(isValidLegalNature(code)).toBe(true);
					expect(getLegalNature(code)).toMatchObject(entry);
				}),
			);
		});

		test("should list a code by default exactly when it is not a legacy one", () => {
			fc.assert(
				fc.property(knownCode(), (code) => {
					expect(Object.hasOwn(getLegalNatures(), code)).toBe(
						!Object.hasOwn(LEGACY_LEGAL_NATURE, code),
					);
					expect(Object.hasOwn(getLegalNatures({ includeLegacy: true }), code)).toBe(true);
				}),
			);
		});

		const includeLegacyValues = fc.option(fc.boolean(), { nil: undefined });

		test("should always describe a code of the table, whatever includeLegacy is", () => {
			fc.assert(
				fc.property(includeLegacyValues, (includeLegacy) => {
					const legalNatures = getLegalNatures({ includeLegacy });
					const entries = Object.entries(legalNatures);

					expect(entries.length).toBe(includeLegacy === true ? 100 : 92);
					expect(entries.every(([code, description]) => LEGAL_NATURE[code] === description)).toBe(
						true,
					);
				}),
			);
		});

		test("should return a fresh object that a caller cannot mutate", () => {
			fc.assert(
				fc.property(anyKey, fc.string(), (code, description) => {
					const natures = getLegalNatures();
					const before = natures[code];

					natures[code] = description;

					expect(getLegalNatures()[code]).toBe(before);
				}),
			);
		});
	});
});

describe("getLegalNatures includeLegacy truthiness", () => {
	test("should read includeLegacy for truthiness, like pad", () => {
		// @ts-expect-error: intentionally invalid input
		expect(Object.keys(getLegalNatures({ includeLegacy: 1 })).length).toBe(100);
		// @ts-expect-error: intentionally invalid input
		expect(Object.keys(getLegalNatures({ includeLegacy: 0 })).length).toBe(92);
	});
});

describe("getLegalNatures types", () => {
	test("should take optional listing options and return a record of strings", () => {
		expectTypeOf(getLegalNatures).parameter(0).toEqualTypeOf<GetLegalNaturesParams | undefined>();
		expectTypeOf(getLegalNatures).returns.toEqualTypeOf<Record<string, string>>();
	});

	test("should type includeLegacy as an optional boolean", () => {
		expectTypeOf<GetLegalNaturesParams["includeLegacy"]>().toEqualTypeOf<boolean | undefined>();
	});
});
