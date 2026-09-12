import { describe, expect, test } from "../_internals/test/runtime";
import { parseCertidao } from "./parse-certidao";

describe("parseCertidao", () => {
	describe("should return null", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(parseCertidao(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(parseCertidao(undefined)).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(parseCertidao("")).toBeNull();
		});

		test("when the check digits do not match", () => {
			expect(parseCertidao("10453901552013100012021000012322")).toBeNull();
		});

		test("when the matrícula is otherwise invalid", () => {
			expect(parseCertidao("not-a-matricula")).toBeNull();
		});

		test("when the book code is 0, outside the nine books of the Provimento", () => {
			expect(parseCertidao("10453901552013000012021000012387")).toBeNull();
		});
	});

	describe("should return the parsed matrícula", () => {
		test("for 104539.01.55.2013.1.00012.021.0000123-21, the worked example of ghiorzi.org/DVnew.htm", () => {
			expect(parseCertidao("104539 01 55 2013 1 00012 021 0000123 21")).toEqual({
				registryCns: "104539",
				acervo: "01",
				service: "55",
				year: 2013,
				type: "birth",
				typeCode: 1,
				book: "00012",
				page: "021",
				term: "0000123",
				checkDigits: "21",
			});
		});

		test("for 094300 01 55 2010 1 00020 112 0000120-87 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(parseCertidao("094300 01 55 2010 1 00020 112 0000120-87")).toEqual({
				registryCns: "094300",
				acervo: "01",
				service: "55",
				year: 2010,
				type: "birth",
				typeCode: 1,
				book: "00020",
				page: "112",
				term: "0000120",
				checkDigits: "87",
			});
		});

		test("for a marriage act, book code 2", () => {
			expect(parseCertidao("10453901552013200012021000012376")?.type).toBe("marriage");
		});

		test("for a religious marriage with civil effect, book code 3", () => {
			expect(parseCertidao("10453901552013300012021000012310")?.type).toBe("religious-marriage");
		});

		test("for a death act, book code 4", () => {
			expect(parseCertidao("10453901552013400012021000012365")?.type).toBe("death");
		});

		test("for a stillbirth act, book code 5", () => {
			expect(parseCertidao("10453901552013500012021000012301")?.type).toBe("stillbirth");
		});

		test("for a proclamas act, book code 6", () => {
			expect(parseCertidao("10453901552013600012021000012354")?.type).toBe("banns");
		});

		test("for the other acts of Livro E, book code 7", () => {
			expect(parseCertidao("10453901552013700012021000012315")?.type).toBe("other");
		});

		test("for an emancipation act, book code 8", () => {
			expect(parseCertidao("10453901552013800012021000012343")?.type).toBe("emancipation");
		});

		test("for an interdiction act, book code 9", () => {
			expect(parseCertidao("10453901552013900012021000012398")?.type).toBe("interdiction");
		});

		test("for a matrícula whose first modulus 11 remainder is 10 (826683 01 55 2015 2 09245 842 9990114 18)", () => {
			expect(parseCertidao("82668301552015209245842999011418")).toEqual({
				registryCns: "826683",
				acervo: "01",
				service: "55",
				year: 2015,
				type: "marriage",
				typeCode: 2,
				book: "09245",
				page: "842",
				term: "9990114",
				checkDigits: "18",
			});
		});
	});
});
