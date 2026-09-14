import * as fc from "fast-check";

import { DATA } from "../_internals/constants/states";
import { expectNeverThrowsWithOptions } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { capitalize, type CapitalizeOptions } from "./capitalize";
import { STATE_CODES } from "./constants";

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
			expect(capitalize("empresa ltda", { upperCaseWords: ["ltda"] })).toBe("Empresa LTDA");
			expect(capitalize("meu cpf e rg", { upperCaseWords: ["CPF", "Rg"] })).toBe("Meu CPF e RG");
		});

		test("when the value is a Brazilian personal name", () => {
			expect(capitalize("jose da silva")).toBe("Jose da Silva");
			expect(capitalize("JOSÉ DA SILVA")).toBe("José da Silva");
			expect(capitalize("de")).toBe("De");
		});

		test("when the value carries a company designation, upper cased by default", () => {
			expect(capitalize("empresa ltda")).toBe("Empresa LTDA");
			expect(capitalize("banco do brasil s.a.")).toBe("Banco do Brasil S.A.");
			expect(capitalize("casa de carnes s/a")).toBe("Casa de Carnes S/A");
			expect(capitalize("consultoria s/s")).toBe("Consultoria S/S");
			expect(capitalize("padaria e confeitaria me")).toBe("Padaria e Confeitaria ME");
			expect(capitalize("meu cpf e rg")).toBe("Meu CPF e RG");
			expect(capitalize("cep 01310-100")).toBe("CEP 01310-100");
		});

		test("when a word looks like a designation but is not one, or is a designation left out of the default list", () => {
			expect(capitalize("jose de sa")).toBe("Jose de Sa");
			expect(capitalize("eu vi maria")).toBe("Eu Vi Maria");
			expect(capitalize("diga-me")).toBe("Diga-ME");
		});

		test("when the value is a Brazilian address", () => {
			expect(capitalize("mogi-guaçu")).toBe("Mogi-Guaçu");
			expect(capitalize("santana/rs")).toBe("Santana/RS");
			expect(capitalize("porto alegre/rs")).toBe("Porto Alegre/RS");
			expect(capitalize("são paulo/sp")).toBe("São Paulo/SP");
		});

		test("when a word is bound by an apostrophe or by punctuation", () => {
			expect(capitalize("santa bárbara d'oeste")).toBe("Santa Bárbara d'Oeste");
			expect(capitalize("SANTA BÁRBARA D'OESTE")).toBe("Santa Bárbara d'Oeste");
			expect(capitalize("joão d’ávila")).toBe("João d’Ávila");
			expect(capitalize("o'neill")).toBe("O'Neill");
			expect(capitalize("(empresa) ltda")).toBe("(Empresa) LTDA");
			expect(capitalize('"joão" silva')).toBe('"João" Silva');
			expect(capitalize("bairro:centro")).toBe("Bairro:Centro");
			expect(capitalize("rua b,número 10")).toBe("Rua B,Número 10");
			expect(capitalize("casa;lote [3]")).toBe("Casa;Lote [3]");
		});

		test("when the name carries a foreign particle", () => {
			expect(capitalize("luiz von schmidt")).toBe("Luiz von Schmidt");
			expect(capitalize("maria van der berg")).toBe("Maria van der Berg");
			expect(capitalize("são joão del rei")).toBe("São João del Rei");
			expect(capitalize("carlo di giovanni")).toBe("Carlo di Giovanni");
			expect(capitalize("von schmidt")).toBe("Von Schmidt");
		});

		test("when a word after a slash is not a state code, and when a state code has no slash before it", () => {
			expect(capitalize("santana/br")).toBe("Santana/Br");
			expect(capitalize("santana/xingu")).toBe("Santana/Xingu");
			expect(capitalize("santana rs")).toBe("Santana Rs");
		});

		test("when the value carries a roman numeral", () => {
			expect(capitalize("joão paulo ii")).toBe("João Paulo II");
			expect(capitalize("rua xv de novembro")).toBe("Rua XV de Novembro");
			expect(capitalize("avenida papa joão xxiii")).toBe("Avenida Papa João XXIII");
		});

		test("when a word list given in the options replaces the default one", () => {
			expect(capitalize("empresa ltda", { upperCaseWords: [] })).toBe("Empresa Ltda");
			expect(capitalize("jose da silva", { lowerCaseWords: [] })).toBe("Jose Da Silva");
			expect(capitalize("banco do brasil s.a.", { upperCaseWords: ["s.a."] })).toBe(
				"Banco do Brasil S.A.",
			);
			expect(capitalize("santana/rs", { upperCaseWords: [] })).toBe("Santana/RS");
		});

		test("when the value contains whitespace other than a space", () => {
			expect(capitalize("joao\tsilva")).toBe("Joao Silva");
			expect(capitalize("joao\n\nsilva")).toBe("Joao Silva");
			expect(capitalize("  joao \t\n silva  ")).toBe("Joao Silva");
		});

		test("when the value contains hyphens or slashes", () => {
			expect(capitalize("MOGI-GUAÇU")).toBe("Mogi-Guaçu");
			expect(capitalize("SANTANA/RS")).toBe("Santana/RS");
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
		// @ts-expect-error: intentionally invalid input
		expect(capitalize(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(capitalize()).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(capitalize(123)).toBe("");
	});

	describe("should fall back to the defaults when a word list is malformed", () => {
		test("when the word list is not an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { lowerCaseWords: null })).toBe("Jose da Silva");
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { upperCaseWords: null })).toBe("Jose da Silva");
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { lowerCaseWords: "ab" })).toBe("Jose da Silva");
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { upperCaseWords: 1 })).toBe("Jose da Silva");
		});

		test("when the word list holds a value that is not a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { lowerCaseWords: [null] })).toBe("Jose Da Silva");
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { upperCaseWords: [1] })).toBe("Jose da Silva");
			// @ts-expect-error: intentionally invalid input
			expect(capitalize("jose da silva", { lowerCaseWords: [1, "da"] })).toBe("Jose da Silva");
		});
	});

	test("should keep its state code list in sync with the one published by the IBGE", () => {
		expect(STATE_CODES).toStrictEqual(DATA.map((state) => state.code));
	});

	describe("properties", () => {
		const nulls = fc.constant(null);
		const wordListMembers = fc.oneof(fc.string(), fc.integer(), nulls);
		const wordLists = fc.oneof(nulls, fc.string(), fc.integer(), fc.array(wordListMembers));
		const optionRecord = fc.record(
			{ lowerCaseWords: wordLists, upperCaseWords: wordLists },
			{ requiredKeys: [] },
		);
		const hostileOptions = fc.oneof(fc.anything(), optionRecord);

		test("should never throw, regardless of the input", () => {
			expectNeverThrowsWithOptions(capitalize, fc.anything(), hostileOptions);
		});

		test("should be idempotent on its own output", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const once = capitalize(value);

					expect(capitalize(once)).toBe(once);
				}),
			);
		});

		test("should never produce leading, trailing or doubled whitespace", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(capitalize(value)).not.toMatch(/^\s|\s$|\s{2}/);
				}),
			);
		});
	});
});

describe("capitalize types", () => {
	test("should take a string and options and return a string", () => {
		expectTypeOf(capitalize).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(capitalize).parameter(1).toEqualTypeOf<CapitalizeOptions | undefined>();
		expectTypeOf<CapitalizeOptions["lowerCaseWords"]>().toEqualTypeOf<string[] | undefined>();
		expectTypeOf<CapitalizeOptions["upperCaseWords"]>().toEqualTypeOf<string[] | undefined>();
		expectTypeOf(capitalize).returns.toEqualTypeOf<string>();
	});
});
