import { describe, expect, it } from "../_internals/test/runtime";
import { parseCpf } from "./parse-cpf";

describe("parseCpf", () => {
	it("should remove CPF mask characters", () => {
		expect(parseCpf("943.895.751-04")).toBe("94389575104");
	});

	it("should remove non numeric characters", () => {
		expect(parseCpf("943.?ABC895.751-04abc")).toBe("94389575104");
	});

	it("should ignore digits after the CPF length", () => {
		expect(parseCpf("94389575104123")).toBe("94389575104");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCpf(null)).toBe("");
	});
});
