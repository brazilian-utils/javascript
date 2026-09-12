import { describe, expect, it } from "../_internals/test/runtime";
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
});
