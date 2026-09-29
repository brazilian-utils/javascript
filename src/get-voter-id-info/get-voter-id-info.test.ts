import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import {
	anyGarbage,
	anyText,
	anyValue,
	stateCodes,
	voterIds,
} from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidVoterId } from "../is-valid-voter-id/is-valid-voter-id";
import { type VoterIdInfo, getVoterIdInfo } from "./get-voter-id-info";

const UF_CODES: Record<StateCode, string> = {
	SP: "01",
	MG: "02",
	RJ: "03",
	RS: "04",
	BA: "05",
	PR: "06",
	CE: "07",
	PE: "08",
	SC: "09",
	GO: "10",
	MA: "11",
	PB: "12",
	PA: "13",
	ES: "14",
	PI: "15",
	RN: "16",
	AL: "17",
	MT: "18",
	MS: "19",
	DF: "20",
	SE: "21",
	AM: "22",
	RO: "23",
	AC: "24",
	AP: "25",
	RR: "26",
	TO: "27",
};

describe("getVoterIdInfo", () => {
	describe("should return the fields of the voter id", () => {
		test("for a 12 digit value", () => {
			expect(getVoterIdInfo("102385010671")).toEqual({
				sequentialNumber: "10238501",
				federativeUnion: "06",
				stateCode: "PR",
				checkDigits: "71",
			});
		});

		test("for a masked value", () => {
			expect(getVoterIdInfo("1023 8501 06 71")).toEqual({
				sequentialNumber: "10238501",
				federativeUnion: "06",
				stateCode: "PR",
				checkDigits: "71",
			});
		});

		test("for a value with whitespace, dots, hyphens and slashes around and between the groups", () => {
			const expected = getVoterIdInfo("123456780191");

			expect(getVoterIdInfo(" 1234 5678 01 91\n")).toEqual(expected);
			expect(getVoterIdInfo("1234.5678-01/91")).toEqual(expected);
		});

		test("for a São Paulo voter id, whose check digits follow the remainder zero rule", () => {
			expect(getVoterIdInfo("123456780191")).toEqual({
				sequentialNumber: "12345678",
				federativeUnion: "01",
				stateCode: "SP",
				checkDigits: "91",
			});
		});

		test("for a voter id issued without its leading zeros, padded to 8 sequential digits", () => {
			const expected = {
				sequentialNumber: "00012345",
				federativeUnion: "01",
				stateCode: "SP",
				checkDigits: "59",
			};

			expect(getVoterIdInfo("000123450159")).toEqual(expected);
			expect(getVoterIdInfo("123450159")).toEqual(expected);
			expect(getVoterIdInfo("12345 01 59")).toEqual(expected);
		});

		test("for a short voter id of another state", () => {
			expect(getVoterIdInfo("12340639")).toEqual({
				sequentialNumber: "00001234",
				federativeUnion: "06",
				stateCode: "PR",
				checkDigits: "39",
			});
		});

		test("for a sequential number of zeros", () => {
			expect(getVoterIdInfo("000000000116")).toEqual({
				sequentialNumber: "00000000",
				federativeUnion: "01",
				stateCode: "SP",
				checkDigits: "16",
			});
		});

		test("with a null state for the code 28, the voters abroad", () => {
			expect(getVoterIdInfo("000000002801")).toEqual({
				sequentialNumber: "00000000",
				federativeUnion: "28",
				stateCode: null,
				checkDigits: "01",
			});
			expect(getVoterIdInfo("122844")).toEqual({
				sequentialNumber: "00000012",
				federativeUnion: "28",
				stateCode: null,
				checkDigits: "44",
			});
		});

		test("as a new object on every call", () => {
			const first = getVoterIdInfo("102385010671");
			const second = getVoterIdInfo("102385010671");

			expect(first).not.toBe(second);

			// @ts-expect-error: the test corrupts its own copy
			first.state = "SP";

			expect(getVoterIdInfo("102385010671")?.stateCode).toBe("PR");
		});
	});

	describe("should return null", () => {
		test("when the check digits do not match", () => {
			expect(getVoterIdInfo("123456780124")).toBeNull();
		});

		test("when the federative union code is 00 or above 28", () => {
			expect(getVoterIdInfo("123456780013")).toBeNull();
			expect(getVoterIdInfo("123456782913")).toBeNull();
		});

		test("when it has 13 digits, more than the 12 the TSE allows", () => {
			expect(getVoterIdInfo("1234567880191")).toBeNull();
		});

		test("when it has fewer than 5 digits", () => {
			expect(getVoterIdInfo("0191")).toBeNull();
		});

		test("when it carries a character outside the mask", () => {
			expect(getVoterIdInfo("ab102385010671")).toBeNull();
			expect(getVoterIdInfo("1023_8501_06_71")).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getVoterIdInfo("")).toBeNull();
		});

		test("when it is null or undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getVoterIdInfo(null)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getVoterIdInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getVoterIdInfo(102_385_010)).toBeNull();
		});

		test("when it is an object or a key of the prototype chain", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getVoterIdInfo({})).toBeNull();
			expect(getVoterIdInfo("__proto__")).toBeNull();
		});
	});

	describe("properties", () => {
		test("should split a valid voter id into fields that spell it back, with or without the leading zeros", () => {
			fc.assert(
				fc.property(fc.gen(), fc.boolean(), (g, trimmed) => {
					const voterId = g(voterIds);
					const info = getVoterIdInfo(trimmed ? voterId.replace(/^0+/, "") || "0" : voterId);

					expect(info).not.toBeNull();
					expect(`${info?.sequentialNumber}${info?.federativeUnion}${info?.checkDigits}`).toBe(
						voterId,
					);
				}),
			);
		});

		test("should name the state a voter id was generated for", () => {
			fc.assert(
				fc.property(stateCodes, fc.gen(), (state, g) => {
					const info = getVoterIdInfo(g(() => voterIds(state)));

					expect(info?.stateCode).toBe(state);
					expect(info?.federativeUnion).toBe(UF_CODES[state]);
				}),
			);
		});

		test("should give no state to a voter id generated abroad", () => {
			fc.assert(
				fc.property(fc.gen(), (g) => {
					const info = getVoterIdInfo(g(() => voterIds("ZZ")));

					expect(info?.stateCode).toBeNull();
					expect(info?.federativeUnion).toBe("28");
				}),
			);
		});

		test("should return a value exactly when the voter id is valid", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					expect(getVoterIdInfo(value) !== null).toBe(isValidVoterId(value));
				}),
			);
		});

		test("should never throw", () => {
			expectNeverThrows(getVoterIdInfo, anyValue);
			expectNeverThrows(getVoterIdInfo, anyGarbage);
		});
	});
});

describe("getVoterIdInfo types", () => {
	test("should take a string and return a VoterIdInfo or null", () => {
		expectTypeOf(getVoterIdInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getVoterIdInfo).returns.toEqualTypeOf<VoterIdInfo | null>();
		expectTypeOf<VoterIdInfo>().toEqualTypeOf<{
			sequentialNumber: string;
			federativeUnion: string;
			stateCode: StateCode | null;
			checkDigits: string;
		}>();
	});
});
