import { describe, expect, test } from "../_internals/test/runtime";
import { capitalize } from "./capitalize";

describe("capitalize", () => {
	describe("should capitalize", () => {
		test("when the value does not contain preposition", () => {
			expect(capitalize("esponja vegetal")).toBe("Esponja Vegetal");
			expect(capitalize("refrigerante 1L")).toBe("Refrigerante 1l");
			expect(capitalize("JOAQUIM JOSÉ")).toBe("Joaquim José");
		});

		test("when the value does contain preposition", () => {
			expect(capitalize("esponja DE aço 60G")).toBe("Esponja de Aço 60g");
			expect(capitalize("fulano de tal")).toBe("Fulano de Tal");
			expect(capitalize("pão com manteiga")).toBe("Pão com Manteiga");
		});

		test("when the value does contain short words", () => {
			expect(capitalize("a")).toBe("A");
			expect(capitalize("A B C")).toBe("A B C");
		});

		test("when the value does contain empty spaces", () => {
			expect(capitalize("")).toBe("");
			expect(capitalize(" ")).toBe("");
			expect(capitalize("esponja de    aço 60G")).toBe("Esponja de Aço 60g");
			expect(capitalize("  refrigerante 1l")).toBe("Refrigerante 1l");
		});

		test("when the value does contain upper case words", () => {
			expect(capitalize("doc da empresa ab", { upperCaseWords: ["DOC", "AB"] })).toBe(
				"DOC da Empresa AB",
			);
			expect(capitalize("doc inválido", { upperCaseWords: ["DOC"] })).toBe("DOC Inválido");
		});
		test("when the value does contain lower case words", () => {
			expect(capitalize("josé Ama MARIA", { lowerCaseWords: ["ama"] })).toBe("José ama Maria");
			expect(capitalize("josé Não Ama MARIA", { lowerCaseWords: ["não", "ama"] })).toBe(
				"José não ama Maria",
			);
		});

		test("when upper case words are provided in any case", () => {
			expect(capitalize("empresa ltda")).toBe("Empresa Ltda");
			expect(capitalize("empresa ltda", { upperCaseWords: ["ltda"] })).toBe("Empresa LTDA");
			expect(capitalize("meu cpf e rg", { upperCaseWords: ["CPF", "Rg"] })).toBe("Meu CPF e RG");
		});

		test("when the value contains whitespace other than a space", () => {
			expect(capitalize("joao\tsilva")).toBe("Joao Silva");
			expect(capitalize("joao\n\nsilva")).toBe("Joao Silva");
			expect(capitalize("  joao \t\n silva  ")).toBe("Joao Silva");
		});

		test("when the value contains hyphens or slashes", () => {
			expect(capitalize("MOGI-GUAÇU")).toBe("Mogi-Guaçu");
			expect(capitalize("SANTANA/RS")).toBe("Santana/Rs");
			expect(capitalize("SANTANA/RS", { upperCaseWords: ["rs"] })).toBe("Santana/RS");
			expect(capitalize("sÃo josÉ do rio-preto")).toBe("São José do Rio-Preto");
			expect(capitalize("de-facto")).toBe("De-Facto");
			expect(capitalize("rio-de-janeiro")).toBe("Rio-de-Janeiro");
			expect(capitalize("a - b")).toBe("A - B");
		});

		test("when a leading hyphen or slash is not itself counted as a word, so the preposition right after it is still the first word and keeps its capital", () => {
			expect(capitalize("-de paula")).toBe("-De Paula");
			expect(capitalize("/de paula")).toBe("/De Paula");
		});

		test("when consecutive separators produce an empty token, which must not be counted as a word either", () => {
			expect(capitalize("--de paula")).toBe("--De Paula");
		});
	});

	test("should return an empty string when the value is not a string", () => {
		// @ts-expect-error
		expect(capitalize(null)).toBe("");
		// @ts-expect-error
		expect(capitalize(undefined)).toBe("");
		// @ts-expect-error
		expect(capitalize(123)).toBe("");
	});
});
