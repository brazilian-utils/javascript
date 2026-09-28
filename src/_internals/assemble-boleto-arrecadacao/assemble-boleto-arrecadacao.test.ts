import { isValidBoleto } from "../../is-valid-boleto/is-valid-boleto";
import { describe, expect, test } from "../test/runtime";
import { assembleBoletoArrecadacao } from "./assemble-boleto-arrecadacao";

const ZEROS = "0".repeat(40);

describe("assembleBoletoArrecadacao", () => {
	test("should name the modulus and the kind of value in the value identifier", () => {
		expect(
			assembleBoletoArrecadacao({
				segment: "1",
				useMod11: false,
				hasEffectiveValue: true,
				body: ZEROS,
			}),
		).toBe("816900000000000000000000000000000000000000000000");
		expect(
			assembleBoletoArrecadacao({
				segment: "1",
				useMod11: false,
				hasEffectiveValue: false,
				body: ZEROS,
			}),
		).toBe("817700000000000000000000000000000000000000000000");
		expect(
			assembleBoletoArrecadacao({
				segment: "1",
				useMod11: true,
				hasEffectiveValue: true,
				body: ZEROS,
			}),
		).toBe("818400000001000000000000000000000000000000000000");
		expect(
			assembleBoletoArrecadacao({
				segment: "1",
				useMod11: true,
				hasEffectiveValue: false,
				body: ZEROS,
			}),
		).toBe("819200000006000000000000000000000000000000000000");
	});

	test("should add a check digit to each of the four blocks", () => {
		expect(
			assembleBoletoArrecadacao({
				segment: "4",
				useMod11: true,
				hasEffectiveValue: true,
				body: "1234567890".repeat(4),
			}),
		).toBe("848712345677890123456785901234567894012345678900");
		expect(
			assembleBoletoArrecadacao({
				segment: "7",
				useMod11: false,
				hasEffectiveValue: false,
				body: "9876543210".repeat(4),
			}),
		).toBe("877398765439210987654329109876543215098765432103");
	});

	test("should build lines the validator accepts", () => {
		for (const useMod11 of [true, false]) {
			for (const hasEffectiveValue of [true, false]) {
				const line = assembleBoletoArrecadacao({
					segment: "3",
					useMod11,
					hasEffectiveValue,
					body: "1234567890".repeat(4),
				});

				expect(isValidBoleto(line)).toBe(true);
			}
		}
	});
});
