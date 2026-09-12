import * as fc from "fast-check";

import { type StateCode } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { UF_TO_VOTER_ID_CODE } from "../is-valid-voter-id/constants";
import { isValidVoterId } from "../is-valid-voter-id/is-valid-voter-id";
import { generateVoterId } from "./generate-voter-id";

describe("generateVoterId", () => {
	it("should generate valid voter ids", () => {
		for (let i = 0; i < 50; i++) {
			expect(isValidVoterId(generateVoterId())).toBe(true);
		}
	});

	it("should generate voter id for a specific state", () => {
		expect(generateVoterId("SP").slice(8, 10)).toBe("01");
	});

	it("should fall back to the default UF instead of throwing for an unknown state", () => {
		// @ts-expect-error: intentionally invalid input
		expect(() => generateVoterId("XX")).not.toThrow();
		// @ts-expect-error: intentionally invalid input
		const voterId = generateVoterId("XX");
		expect(voterId.slice(8, 10)).toBe("28");
		expect(isValidVoterId(voterId)).toBe(true);
	});

	describe("properties", () => {
		const states = Object.keys(UF_TO_VOTER_ID_CODE) as (StateCode | "ZZ")[];
		const stateCode = fc.constantFrom(...states);

		test("should carry the federative union code of every state it supports", () => {
			fc.assert(
				fc.property(stateCode, (state) => {
					const voterId = generateVoterId(state);

					expect(voterId).toMatch(/^\d{12}$/);
					expect(voterId.slice(8, 10)).toBe(UF_TO_VOTER_ID_CODE[state]);
					expect(isValidVoterId(voterId)).toBe(true);
				}),
			);
		});
	});
});

describe("generateVoterId types", () => {
	test("should take an optional state code or ZZ and return a string", () => {
		expectTypeOf(generateVoterId).parameter(0).toEqualTypeOf<StateCode | "ZZ" | undefined>();
		expectTypeOf(generateVoterId).returns.toEqualTypeOf<string>();
	});
});
