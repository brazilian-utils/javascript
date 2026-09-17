import { LEGACY_LEGAL_NATURE, LEGAL_NATURE } from "../../is-valid-legal-nature/constants";
import { describe, expect, test } from "../test/runtime";
import { isLegacyLegalNature } from "./is-legacy-legal-nature";

describe("isLegacyLegalNature", () => {
	test("should return true for every retired code", () => {
		for (const code of Object.keys(LEGACY_LEGAL_NATURE)) {
			expect(isLegacyLegalNature(code)).toBe(true);
		}
	});

	test("should return false for a code in force", () => {
		expect(isLegacyLegalNature("2062")).toBe(false);
		expect(isLegacyLegalNature("1015")).toBe(false);
	});

	test("should return false for an unknown code and for an inherited property name", () => {
		expect(isLegacyLegalNature("0000")).toBe(false);
		expect(isLegacyLegalNature("toString")).toBe(false);
	});

	test("should retire a strict subset of the table", () => {
		const legacy = Object.keys(LEGAL_NATURE).filter((code) => isLegacyLegalNature(code));

		expect(legacy).toStrictEqual(Object.keys(LEGACY_LEGAL_NATURE));
	});
});
