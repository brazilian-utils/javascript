import { describe, expect, it } from "../test/runtime";
import { normalizeMunicipalityName } from "./normalize-municipality-name";

describe("normalizeMunicipalityName", () => {
	it("should drop the accents of a name", () => {
		expect(normalizeMunicipalityName("São Paulo")).toBe("SAO PAULO");
		expect(normalizeMunicipalityName("Ceará-Mirim")).toBe("CEARA-MIRIM");
	});

	it("should fold the casing to upper case", () => {
		expect(normalizeMunicipalityName("sao paulo")).toBe("SAO PAULO");
	});

	it("should fold the casing in the direction that expands ß to SS", () => {
		expect(normalizeMunicipalityName("Paßos")).toBe(normalizeMunicipalityName("Passos"));
	});

	it("should collapse every run of internal whitespace into a single space", () => {
		expect(normalizeMunicipalityName("São  Paulo")).toBe("SAO PAULO");
		expect(normalizeMunicipalityName("São\t\nPaulo")).toBe("SAO PAULO");
	});

	it("should keep a name written without the space a separate name", () => {
		expect(normalizeMunicipalityName("SaoPaulo")).toBe("SAOPAULO");
	});

	it("should trim the surrounding whitespace", () => {
		expect(normalizeMunicipalityName("  São Paulo  ")).toBe("SAO PAULO");
	});

	it("should return an empty string for an empty string", () => {
		expect(normalizeMunicipalityName("")).toBe("");
	});

	it("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(normalizeMunicipalityName(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(normalizeMunicipalityName(3_550_308)).toBe("");
	});
});
