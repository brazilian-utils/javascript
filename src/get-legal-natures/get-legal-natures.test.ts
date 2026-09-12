import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getLegalNature } from "../get-legal-nature/get-legal-nature";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { getLegalNatures } from "./get-legal-natures";

const knownCode = (): fc.Arbitrary<string> => fc.constantFrom(...Object.keys(getLegalNatures()));

describe("getLegalNatures", () => {
	it("should return legal nature entries", () => {
		expect(getLegalNatures()["2062"]).toBe("Sociedade Empresária Limitada");
	});

	it("should use the descriptions of the 2021 CONCLA table", () => {
		expect(getLegalNatures()["1015"]).toBe("Órgão Público do Poder Executivo Federal");
		expect(getLegalNatures()["5010"]).toBe("Organização Internacional");
		expect(getLegalNatures()["3999"]).toBe("Associação Privada");
	});

	it("should return a copy, so mutating the result does not change the table", () => {
		const legalNatures = getLegalNatures();
		legalNatures["2062"] = "changed";

		expect(getLegalNatures()["2062"]).toBe("Sociedade Empresária Limitada");
	});

	describe("properties", () => {
		const anyKey = fc.string();

		test("should expose only codes its own validator and lookup accept", () => {
			fc.assert(
				fc.property(knownCode(), (code) => {
					const entry = { code, description: getLegalNatures()[code] };

					expect(code).toMatch(/^\d{4}$/);
					expect(isValidLegalNature(code)).toBe(true);
					expect(getLegalNature(code)).toEqual(entry);
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

describe("getLegalNatures types", () => {
	test("should take no parameters and return a record of strings", () => {
		expectTypeOf(getLegalNatures).parameters.toEqualTypeOf<[]>();
		expectTypeOf(getLegalNatures).returns.toEqualTypeOf<Record<string, string>>();
	});
});
