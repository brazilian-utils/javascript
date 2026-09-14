import * as fc from "fast-check";

import { ARRECADACAO_LINE_LENGTH } from "../_internals/constants/arrecadacao";
import { BOLETO_LENGTH } from "../_internals/constants/boleto";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatBoleto } from "../format-boleto/format-boleto";
import { getBoletoInfo } from "../get-boleto-info/get-boleto-info";
import { isValidBoleto } from "../is-valid-boleto/is-valid-boleto";
import { parseBoleto } from "../parse-boleto/parse-boleto";
import { type GenerateBoletoOptions, generateBoleto } from "./generate-boleto";

const drawArrecadacaoSegment = (): number =>
	getBoletoInfo(generateBoleto({ type: "arrecadacao" }))?.segment ?? 0;

const drawArrecadacaoIdentifier = (algorithmDraw: number, valueDraw: number): string => {
	const draws = [0, algorithmDraw, valueDraw];
	const originalRandom = Math.random;
	let call = 0;

	try {
		Math.random = (): number => {
			const draw = draws[call] ?? 0;
			call++;

			return draw;
		};

		return generateBoleto({ type: "arrecadacao" })[2];
	} finally {
		Math.random = originalRandom;
	}
};

describe("generateBoleto", () => {
	test("should generate a valid boleto", () => {
		const boleto = generateBoleto();
		expect(boleto).toHaveLength(BOLETO_LENGTH);
		expect(/^\d+$/.test(boleto)).toBe(true);
		expect(isValidBoleto(boleto)).toBe(true);
	});

	test("should generate different boletos on multiple calls, retrying with extra draws on the astronomically unlikely case all three collide", () => {
		const boleto1 = generateBoleto();
		const boleto2 = generateBoleto();
		const boleto3 = generateBoleto();

		const allSame = boleto1 === boleto2 && boleto2 === boleto3;
		if (allSame) {
			const set = new Set([boleto1, generateBoleto(), generateBoleto()]);
			expect(set.size).toBeGreaterThan(1);
		}
	});

	test("should generate valid boletos that pass validation once formatted", () => {
		for (let i = 0; i < 10; i++) {
			const boleto = generateBoleto();
			const formatted = `${boleto.slice(0, 9)} ${boleto.slice(9, 20)} ${boleto.slice(20, 31)} ${boleto.slice(31, 32)} ${boleto.slice(32)}`;
			expect(isValidBoleto(formatted)).toBe(true);
		}
	});

	test("should generate multiple valid boletos", () => {
		const boletos = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const boleto = generateBoleto();
			expect(isValidBoleto(boleto)).toBe(true);
			expect(boletos.has(boleto)).toBe(false);
			boletos.add(boleto);
		}
		expect(boletos.size).toBe(100);
	});

	describe("arrecadação", () => {
		test("should generate a valid arrecadação bank slip", () => {
			const boleto = generateBoleto({ type: "arrecadacao" });

			expect(boleto).toHaveLength(ARRECADACAO_LINE_LENGTH);
			expect(/^8\d+$/.test(boleto)).toBe(true);
			expect(isValidBoleto(boleto)).toBe(true);
		});

		test("should generate multiple valid arrecadação bank slips", () => {
			for (let i = 0; i < 100; i++) {
				const boleto = generateBoleto({ type: "arrecadacao" });

				expect(isValidBoleto(boleto)).toBe(true);
				expect(getBoletoInfo(boleto)?.type).toBe("arrecadacao");
			}
		});

		test("should generate a bank slip that survives format and parse", () => {
			for (let i = 0; i < 10; i++) {
				const boleto = generateBoleto({ type: "arrecadacao" });

				expect(parseBoleto(formatBoleto(boleto))).toBe(boleto);
				expect(isValidBoleto(formatBoleto(boleto))).toBe(true);
			}
		});

		test("should keep generating bancário bank slips by default", () => {
			expect(generateBoleto({})).toHaveLength(BOLETO_LENGTH);
			expect(generateBoleto({ type: "bancario" })).toHaveLength(BOLETO_LENGTH);
		});

		test("should vary the segment across many draws, retrying with extra draws on the astronomically unlikely case they all collide", () => {
			let segments = new Set(Array.from({ length: 200 }, drawArrecadacaoSegment));

			if (segments.size === 1) {
				segments = new Set(Array.from({ length: 200 }, drawArrecadacaoSegment));
			}

			expect(segments.size).toBeGreaterThan(1);
		});

		test("should pick the value identifier (position 3) from all four values, the algorithm draw choosing modulo 11 ('8', '9') below 0.5 and modulo 10 ('6', '7') at or above it, and the value draw choosing an effective amount ('8', '6') below 0.5 and a reference quantity ('9', '7') at or above it", () => {
			expect(drawArrecadacaoIdentifier(0.3, 0.3)).toBe("8");
			expect(drawArrecadacaoIdentifier(0.3, 0.5)).toBe("9");
			expect(drawArrecadacaoIdentifier(0.5, 0.3)).toBe("6");
			expect(drawArrecadacaoIdentifier(0.5, 0.5)).toBe("7");
		});

		test("should generate both an effective amount and a reference quantity across many draws", () => {
			const flags = new Set(
				Array.from(
					{ length: 200 },
					() => getBoletoInfo(generateBoleto({ type: "arrecadacao" }))?.hasEffectiveValue,
				),
			);

			expect(flags.has(true)).toBe(true);
			expect(flags.has(false)).toBe(true);
		});
	});

	describe("properties", () => {
		const types = ["bancario", "arrecadacao"] as const;

		test("should always generate a bank slip its own validator accepts", () => {
			fc.assert(
				fc.property(fc.constantFrom(...types), (type) => {
					const value = generateBoleto({ type });
					const length = type === "arrecadacao" ? ARRECADACAO_LINE_LENGTH : BOLETO_LENGTH;

					expect(value.length).toBe(length);
					expect(isValidBoleto(value)).toBe(true);
				}),
			);
		});

		test("should always generate a bank slip that survives formatting and parsing", () => {
			fc.assert(
				fc.property(fc.constantFrom(...types), (type) => {
					const value = generateBoleto({ type });
					const formatted = formatBoleto(value);

					expect(parseBoleto(formatted)).toBe(value);
					expect(isValidBoleto(formatted)).toBe(true);
				}),
			);
		});

		test("should always generate a bank slip getBoletoInfo can read", () => {
			fc.assert(
				fc.property(fc.constantFrom(...types), (type) => {
					const value = generateBoleto({ type });
					const info = getBoletoInfo(value);

					expect(info).not.toBeNull();
					expect(info?.bankCode).toBe(type === "arrecadacao" ? "" : value.slice(0, 3));
				}),
			);
		});
	});
});

describe("generateBoleto types", () => {
	test("should take optional options and return a string", () => {
		expectTypeOf(generateBoleto).parameter(0).toEqualTypeOf<GenerateBoletoOptions | undefined>();
		expectTypeOf(generateBoleto).returns.toEqualTypeOf<string>();
	});

	test("should restrict type to the supported boleto kinds", () => {
		expectTypeOf<GenerateBoletoOptions["type"]>().toEqualTypeOf<
			"bancario" | "arrecadacao" | undefined
		>();
	});
});
