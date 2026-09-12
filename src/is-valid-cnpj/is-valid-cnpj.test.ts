import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { describe, expect, test } from "../_internals/test/runtime";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { RESERVED_NUMBERS } from "./constants";
import { isValidCnpj } from "./is-valid-cnpj";

describe("isValidCnpj", () => {
	describe("should return false", () => {
		test("when it is on the RESERVED_NUMBERS", () => {
			for (const cnpj of RESERVED_NUMBERS) {
				expect(isValidCnpj(cnpj)).toBe(false);
			}
		});

		test("when it is an empty string", () => {
			expect(isValidCnpj("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCnpj([])).toBe(false);
		});

		test(`when dont match with CNPJ length (${CNPJ_LENGTH})`, () => {
			expect(isValidCnpj("12312312312")).toBe(false);
		});

		test("when contains only letters or special characters", () => {
			expect(isValidCnpj("ababcabcabcdab")).toBe(false);
		});

		test("when is a CNPJ invalid test numbers with letters", () => {
			expect(isValidCnpj("6ad0.t391.9asd47/0ad001-00")).toBe(false);
		});

		test("when is a CNPJ invalid", () => {
			expect(isValidCnpj("11257245286531")).toBe(false);
		});

		test("when an alphanumeric CNPJ has an invalid check digit", () => {
			expect(isValidCnpj("12.ABC.345/01DE-99")).toBe(false);
			expect(isValidCnpj("Q0SLFMBD7VX400", { version: 2 })).toBe(false);
		});

		test("when it has letters but no version option is given (defaults to numeric-only)", () => {
			expect(isValidCnpj("Q0SLFMBD7VX439")).toBe(false);
		});

		test("when it is a reserved number under version 2, even though its raw checksum happens to be valid", () => {
			expect(isValidCnpj("00000000000000", { version: 2 })).toBe(false);
		});

		test("when an alphanumeric CNPJ is too short", () => {
			expect(isValidCnpj("AB.1C2.D3E/4F5G-3")).toBe(false);
		});

		test("when an alphanumeric CNPJ is too long", () => {
			expect(isValidCnpj("AB.1C2.D3E/4F5G-356")).toBe(false);
		});

		test("when there is garbage before the digits, since the numeric format is anchored at the start", () => {
			expect(isValidCnpj("!13723705000189")).toBe(false);
		});

		test("when there is garbage after the digits, since the numeric format is anchored at the end", () => {
			expect(isValidCnpj("13723705000189!")).toBe(false);
		});

		test("when there is garbage before an otherwise valid alphanumeric CNPJ, since the alphanumeric format is anchored at the start", () => {
			expect(isValidCnpj("!1Z000000000039", { version: 2 })).toBe(false);
		});

		test("when there is garbage after an otherwise valid alphanumeric CNPJ, since the alphanumeric format is anchored at the end", () => {
			expect(isValidCnpj("1Z000000000039!", { version: 2 })).toBe(false);
		});

		test("should return false quickly for a 1MB garbage string", () => {
			const garbage = "a".repeat(1_000_000);
			const start = Date.now();
			expect(isValidCnpj(garbage)).toBe(false);
			expect(Date.now() - start).toBeLessThan(1000);
		});
	});

	describe("should return true", () => {
		test("when is a CNPJ valid without mask", () => {
			expect(isValidCnpj("13723705000189")).toBe(true);
		});

		test("when is a CNPJ valid with mask", () => {
			expect(isValidCnpj("60.391.947/0001-00")).toBe(true);
		});

		test("when is a CNPJ valid with a whitespace mask", () => {
			expect(isValidCnpj("11 222 333 0001 81")).toBe(true);
		});

		test("when it has real leading and trailing whitespace (not just an internal mask)", () => {
			expect(isValidCnpj(" 13723705000189 ")).toBe(true);
		});

		test("when an alphanumeric CNPJ uses a whitespace separator at every group boundary", () => {
			expect(isValidCnpj("1Z 000 000 0000 39", { version: 2 })).toBe(true);
		});

		test("when is a lowercase alphanumeric CNPJ", () => {
			expect(isValidCnpj("q0slfmbd7vx439", { version: 2 })).toBe(true);
		});

		test("when the lowercase letter is exactly the boundary z, which must still be uppercased and counted", () => {
			expect(isValidCnpj("1z000000000039", { version: 2 })).toBe(true);
		});

		for (let i = 0; i < 100; i++) {
			const version = ((i % 2) + 1) as 1 | 2;
			const cnpj = generateCnpj(version);
			expect(isValidCnpj(cnpj, { version })).toBe(true);
		}
	});
});
