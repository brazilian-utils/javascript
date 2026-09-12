import { describe, expect, expectTypeOf, it } from "../_internals/test/runtime";
import {
	type GetMunicipalityByCodeOptions,
	type GetMunicipalityByNameOptions,
	type GetMunicipalityOptions,
	getMunicipality,
} from "./get-municipality";

describe("getMunicipality", () => {
	it("should get municipality code by name", async () => {
		await expect(getMunicipality({ municipalityName: "Sao Paulo", uf: "sp" })).resolves.toBe(
			"3550308",
		);
	});

	it("should get municipality name and UF by code", async () => {
		await expect(getMunicipality({ code: "3550308" })).resolves.toEqual(["São Paulo", "SP"]);
	});

	it("should match the municipality name ignoring accents and casing", async () => {
		await expect(getMunicipality({ municipalityName: "SÃO PAULO", uf: "SP" })).resolves.toBe(
			"3550308",
		);
		await expect(getMunicipality({ municipalityName: "sao PAULO", uf: "SP" })).resolves.toBe(
			"3550308",
		);
	});

	it("should match a municipality whose own name carries accents regardless of query accents", async () => {
		await expect(getMunicipality({ municipalityName: "Ceara-Mirim", uf: "RN" })).resolves.toBe(
			"2402600",
		);
		await expect(getMunicipality({ code: "2402600" })).resolves.toEqual(["Ceará-Mirim", "RN"]);
	});

	it("should trim whitespace from the municipality name before matching", async () => {
		await expect(getMunicipality({ municipalityName: "  São Paulo  ", uf: "SP" })).resolves.toBe(
			"3550308",
		);
	});

	it("should trim and uppercase a uf with surrounding whitespace and lowercase letters", async () => {
		await expect(getMunicipality({ municipalityName: "São Paulo", uf: " sp " })).resolves.toBe(
			"3550308",
		);
	});

	it("should return the same cached tuple instance across repeated calls with the same code", async () => {
		const first = await getMunicipality({ code: "3550308" });
		const second = await getMunicipality({ code: "3550308" });

		expect(first).toBe(second);
	});

	it("should resolve a known Boa Esperança do Norte/MT lookup", async () => {
		await expect(getMunicipality({ code: "5101837" })).resolves.toEqual([
			"Boa Esperança do Norte",
			"MT",
		]);
		await expect(
			getMunicipality({ municipalityName: "Boa Esperanca do Norte", uf: "MT" }),
		).resolves.toBe("5101837");
	});

	describe("code validation", () => {
		it("should return null for an empty code", async () => {
			await expect(getMunicipality({ code: "" })).resolves.toBeNull();
		});

		it("should return null for a path-traversal code", async () => {
			await expect(
				getMunicipality({ code: "../../../v1/localidades/estados" }),
			).resolves.toBeNull();
		});

		it("should return null for a code with query-string injection", async () => {
			await expect(getMunicipality({ code: "3550308?x=1" })).resolves.toBeNull();
		});

		it("should return null for a non-string code", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality({ code: null })).resolves.toBeNull();
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality({ code: 3_550_308 })).resolves.toBeNull();
		});

		it("should return null for a code with the wrong number of digits", async () => {
			await expect(getMunicipality({ code: "123" })).resolves.toBeNull();
			await expect(getMunicipality({ code: "12345678" })).resolves.toBeNull();
		});

		it("should return null for an unknown 7 digit code", async () => {
			await expect(getMunicipality({ code: "0000000" })).resolves.toBeNull();
		});
	});

	describe("options validation (non-object input)", () => {
		it("should return null for null", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality(null)).resolves.toBeNull();
		});

		it("should return null for undefined", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality()).resolves.toBeNull();
		});

		it("should return null for a primitive", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality("3550308")).resolves.toBeNull();
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality(123)).resolves.toBeNull();
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality(true)).resolves.toBeNull();
		});

		it("should return null for an array", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality([])).resolves.toBeNull();
		});
	});

	describe("municipality name lookup validation", () => {
		it("should return null for an empty municipality name", async () => {
			await expect(getMunicipality({ municipalityName: "", uf: "SP" })).resolves.toBeNull();
		});

		it("should return null for a non-string municipality name", async () => {
			// @ts-expect-error: intentionally invalid input
			await expect(getMunicipality({ municipalityName: null, uf: "SP" })).resolves.toBeNull();
		});

		it("should return null for a non-string uf", async () => {
			// @ts-expect-error: intentionally invalid input
			const options: GetMunicipalityByNameOptions = { municipalityName: "São Paulo", uf: null };

			await expect(getMunicipality(options)).resolves.toBeNull();
		});

		it("should return null for a malformed UF (digits)", async () => {
			await expect(
				getMunicipality({ municipalityName: "São Paulo", uf: "123" }),
			).resolves.toBeNull();
		});

		it("should return null for a malformed UF (wrong length)", async () => {
			await expect(
				getMunicipality({ municipalityName: "São Paulo", uf: "XXX" }),
			).resolves.toBeNull();
		});

		it("should return null for an unknown UF", async () => {
			await expect(
				getMunicipality({ municipalityName: "São Paulo", uf: "ZZ" }),
			).resolves.toBeNull();
		});

		it("should return null when the municipality is not found in the given state", async () => {
			await expect(
				getMunicipality({ municipalityName: "Cidade Inexistente", uf: "SP" }),
			).resolves.toBeNull();
		});

		it("should return null when the municipality exists but in a different state", async () => {
			await expect(
				getMunicipality({ municipalityName: "São Paulo", uf: "RJ" }),
			).resolves.toBeNull();
		});
	});
});

describe("getMunicipality types", () => {
	it("should take a code or a name plus uf and resolve to a pair, a name or null", () => {
		expectTypeOf(getMunicipality).parameter(0).toEqualTypeOf<GetMunicipalityOptions>();
		expectTypeOf<GetMunicipalityOptions>().toEqualTypeOf<
			GetMunicipalityByCodeOptions | GetMunicipalityByNameOptions
		>();
		expectTypeOf<GetMunicipalityByCodeOptions>().toEqualTypeOf<{ code: string }>();
		expectTypeOf<GetMunicipalityByNameOptions>().toEqualTypeOf<{
			municipalityName: string;
			uf: string;
		}>();
		expectTypeOf(getMunicipality).returns.resolves.toEqualTypeOf<
			[string, string] | string | null
		>();
	});
});
