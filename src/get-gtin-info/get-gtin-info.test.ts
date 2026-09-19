import * as fc from "fast-check";

import { anyGarbage, digits, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { type GtinInfo, type GtinLength, type GtinType, getGtinInfo } from "./get-gtin-info";

const withCheckDigit = (body: string): string => {
	let sum = 0;

	for (let index = 0; index < body.length; index++) {
		sum += Number(body.at(-1 - index)) * (index % 2 === 0 ? 3 : 1);
	}

	return `${body}${(10 - (sum % 10)) % 10}`;
};

describe("getGtinInfo", () => {
	describe("should return null", () => {
		test("when the value is not a string", () => {
			expect(getGtinInfo(7_890_000_000_017 as unknown as string)).toBeNull();
			expect(getGtinInfo(null as unknown as string)).toBeNull();
			expect(getGtinInfo(undefined as unknown as string)).toBeNull();
			expect(getGtinInfo({} as unknown as string)).toBeNull();
			expect(getGtinInfo(["7890000000017"] as unknown as string)).toBeNull();
		});

		test("when the value is empty or blank", () => {
			expect(getGtinInfo("")).toBeNull();
			expect(getGtinInfo("   ")).toBeNull();
		});

		test("when the value is the literal the NF-e uses for a product without a GTIN", () => {
			expect(getGtinInfo("SEM GTIN")).toBeNull();
		});

		test("when the value is a prototype key", () => {
			expect(getGtinInfo("__proto__")).toBeNull();
			expect(getGtinInfo("constructor")).toBeNull();
		});

		test("when the value carries anything but digits", () => {
			expect(getGtinInfo("789000000001a")).toBeNull();
			expect(getGtinInfo("7 890000 000017")).toBeNull();
			expect(getGtinInfo("789-0000-000017")).toBeNull();
			expect(getGtinInfo("+7890000000017")).toBeNull();
			expect(getGtinInfo("7890000000017\n1")).toBeNull();
		});

		test("when a character next to the digits in the ASCII table would add up to the check digit", () => {
			expect(getGtinInfo("78900000000:0")).toBeNull();
		});

		test("when the length is not 8, 12, 13 or 14", () => {
			expect(getGtinInfo("7")).toBeNull();
			expect(getGtinInfo("7891231")).toBeNull();
			expect(getGtinInfo("789123457")).toBeNull();
			expect(getGtinInfo("78900000017")).toBeNull();
			expect(getGtinInfo("178900000000143")).toBeNull();
			expect(getGtinInfo("376104250021234569")).toBeNull();
		});

		test("when the check digit is wrong", () => {
			expect(getGtinInfo("7890000000018")).toBeNull();
			expect(getGtinInfo("7890000000010")).toBeNull();
			expect(getGtinInfo("78912343")).toBeNull();
			expect(getGtinInfo("061414112344")).toBeNull();
			expect(getGtinInfo("17890000000013")).toBeNull();
		});

		test("when the check digit is the Luhn one instead of the GS1 one", () => {
			expect(getGtinInfo("9521234500011")).toBeNull();
		});

		test("when two digits are swapped", () => {
			expect(getGtinInfo("7890000000071")).toBeNull();
		});
	});

	describe("should return the parsed GTIN", () => {
		test("for a GTIN-13 of GS1 Brasil with the 789 prefix", () => {
			expect(getGtinInfo("7890000000017")).toEqual({
				type: "GTIN-13",
				length: 13,
				prefix: "789",
				isBrazilian: true,
				isRestrictedCirculation: false,
				checkDigit: 7,
			});
		});

		test("for a GTIN-13 of GS1 Brasil with the 790 prefix", () => {
			expect(getGtinInfo("7901234567891")).toEqual({
				type: "GTIN-13",
				length: 13,
				prefix: "790",
				isBrazilian: true,
				isRestrictedCirculation: false,
				checkDigit: 1,
			});
		});

		test("for the GTIN-13 example of the GS1 check digit page", () => {
			expect(getGtinInfo("6291041500213")).toEqual({
				type: "GTIN-13",
				length: 13,
				prefix: "629",
				isBrazilian: false,
				isRestrictedCirculation: false,
				checkDigit: 3,
			});
		});

		test("for the 13 digit example of the GS1 General Specifications, a GLN under the same check digit rule (demonstration prefix 952)", () => {
			expect(getGtinInfo("9521234500018")).toEqual({
				type: "GTIN-13",
				length: 13,
				prefix: "952",
				isBrazilian: false,
				isRestrictedCirculation: false,
				checkDigit: 8,
			});
		});

		test("for a GTIN-8, reading the GS1-8 Prefix", () => {
			expect(getGtinInfo("78912342")).toEqual({
				type: "GTIN-8",
				length: 8,
				prefix: "789",
				isBrazilian: true,
				isRestrictedCirculation: false,
				checkDigit: 2,
			});
		});

		test("for a GTIN-12, whose GS1 Prefix carries the implied leading zero", () => {
			expect(getGtinInfo("061414112345")).toEqual({
				type: "GTIN-12",
				length: 12,
				prefix: "006",
				isBrazilian: false,
				isRestrictedCirculation: false,
				checkDigit: 5,
			});
		});

		test("for a GTIN-14, reading the prefix after the indicator digit", () => {
			expect(getGtinInfo("17890000000014")).toEqual({
				type: "GTIN-14",
				length: 14,
				prefix: "789",
				isBrazilian: true,
				isRestrictedCirculation: false,
				checkDigit: 4,
			});
		});

		test("for the 14 digit example of the GS1 General Specifications, a GRAI read here as a GTIN-14", () => {
			expect(getGtinInfo("09524141234564")).toEqual({
				type: "GTIN-14",
				length: 14,
				prefix: "952",
				isBrazilian: false,
				isRestrictedCirculation: false,
				checkDigit: 4,
			});
		});

		test("for a GTIN-8 written in the 14 digit form, reading the GS1-8 Prefix", () => {
			expect(getGtinInfo("00000078912342")).toEqual({
				type: "GTIN-14",
				length: 14,
				prefix: "789",
				isBrazilian: true,
				isRestrictedCirculation: false,
				checkDigit: 2,
			});
		});

		test("with surrounding whitespace", () => {
			expect(getGtinInfo("  7890000000017\n")?.prefix).toBe("789");
		});

		test("with a check digit of zero", () => {
			expect(getGtinInfo("12345670")?.checkDigit).toBe(0);
		});

		test("telling the neighbours of the Brazilian prefixes apart", () => {
			expect(getGtinInfo("7880000000018")?.isBrazilian).toBe(false);
			expect(getGtinInfo("7910000000012")?.isBrazilian).toBe(false);
			expect(getGtinInfo("17890000000014")?.isBrazilian).toBe(true);
			expect(getGtinInfo("0789000000004")?.isBrazilian).toBe(false);
		});
	});

	describe("should flag the Restricted Circulation Number ranges", () => {
		test("for the GS1 Prefixes 02, 04 and 20 to 29", () => {
			expect(getGtinInfo("0200000000011")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("0400000000015")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("2000000000015")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("2000000000015")?.prefix).toBe("200");
			expect(getGtinInfo("12000000000012")?.isRestrictedCirculation).toBe(true);
		});

		test("for the U.P.C. Prefixes 2 and 4 of a GTIN-12", () => {
			expect(getGtinInfo("200000000004")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("400000000008")?.isRestrictedCirculation).toBe(true);
		});

		test("for the GS1-8 Prefixes 000 to 099 and 200 to 299", () => {
			expect(getGtinInfo("01234565")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("20000004")?.isRestrictedCirculation).toBe(true);
		});

		test("for the GS1 Prefix 0000000, which reads as a GS1-8 Prefix that starts with zero", () => {
			expect(getGtinInfo("0000000123457")?.isRestrictedCirculation).toBe(true);
			expect(getGtinInfo("0000000123457")?.prefix).toBe("001");
		});

		test("but not for the ranges that only look alike", () => {
			expect(getGtinInfo("030000000014")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("050000000012")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("11200000000000")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("9020000000009")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("40000008")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("30000001")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("12345670")?.isRestrictedCirculation).toBe(false);
		});

		test("and not for the ISSN and ISBN ranges", () => {
			expect(getGtinInfo("9771234567003")?.isRestrictedCirculation).toBe(false);
			expect(getGtinInfo("9780000000019")?.prefix).toBe("978");
		});
	});

	describe("properties", () => {
		const lengths = fc.constantFrom(8, 12, 13, 14);
		const gtins = lengths.chain((length) => digits(length - 1).map((body) => withCheckDigit(body)));

		test("should give back the length and the check digit of every well-formed GTIN", () => {
			fc.assert(
				fc.property(gtins, (gtin) => {
					const parsed = getGtinInfo(gtin);

					expect(parsed?.length).toBe(gtin.length);
					expect(parsed?.type).toBe(`GTIN-${gtin.length}`);
					expect(parsed?.checkDigit).toBe(Number(gtin.at(-1)));
					expect(parsed?.prefix).toMatch(/^\d{3}$/);
				}),
			);
		});

		test("should turn down every other check digit", () => {
			fc.assert(
				fc.property(gtins, fc.integer({ min: 1, max: 9 }), (gtin, shift) => {
					const wrong = (Number(gtin.at(-1)) + shift) % 10;

					expect(getGtinInfo(`${gtin.slice(0, -1)}${wrong}`)).toBeNull();
				}),
			);
		});

		test("should call Brazilian exactly the 13 digit values that start with 789 or 790", () => {
			fc.assert(
				fc.property(
					digits(12).map((body) => withCheckDigit(body)),
					(gtin) => {
						const expected = gtin.startsWith("789") || gtin.startsWith("790");

						fc.pre(!gtin.startsWith("00000"));

						expect(getGtinInfo(gtin)?.isBrazilian).toBe(expected);
					},
				),
			);
		});

		test("should never throw", () => {
			expectNeverThrows(getGtinInfo, fc.oneof(fc.anything(), anyGarbage));
			expectNeverThrows(getGtinInfo, fc.constantFrom(...PROTOTYPE_KEYS));
		});
	});
});

describe("getGtinInfo types", () => {
	test("should take a string and return a GtinInfo or null", () => {
		expectTypeOf(getGtinInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getGtinInfo).returns.toEqualTypeOf<GtinInfo | null>();
		expectTypeOf<GtinInfo>().toEqualTypeOf<{
			type: GtinType;
			length: GtinLength;
			prefix: string;
			isBrazilian: boolean;
			isRestrictedCirculation: boolean;
			checkDigit: number;
		}>();
		expectTypeOf<GtinLength>().toEqualTypeOf<8 | 12 | 13 | 14>();
		expectTypeOf<GtinType>().toEqualTypeOf<"GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14">();
	});
});
