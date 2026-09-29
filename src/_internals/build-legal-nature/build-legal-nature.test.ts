import { describe, expect, it } from "../test/runtime";
import { buildLegalNature } from "./build-legal-nature";

describe("buildLegalNature", () => {
	it("should tag a code in force as not legacy", () => {
		expect(buildLegalNature("2062", "Sociedade Empresária Limitada")).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
			category: { code: "2", description: "Entidades Empresariais" },
			legacy: false,
		});
	});

	it("should tag a retired code as legacy, with the code it corresponds to today", () => {
		expect(buildLegalNature("2208", "Entidade Binacional Itaipu")).toEqual({
			code: "2208",
			description: "Entidade Binacional Itaipu",
			category: { code: "2", description: "Entidades Empresariais" },
			legacy: true,
			currentCode: "2275",
		});
	});

	it("should give every entry its own category object", () => {
		const first = buildLegalNature("2062", "x");
		first.category.description = "changed";

		expect(buildLegalNature("2062", "x").category.description).toBe("Entidades Empresariais");
	});
});
