import { describe, expect, test } from "../test/runtime";
import { calculateCnhFirstVerifier } from "./calculate-cnh-first-verifier";

describe("calculateCnhFirstVerifier", () => {
	test("should calculate the first verifier without decrement", () => {
		expect(calculateCnhFirstVerifier("000000001")).toEqual({ firstVerifier: 1, decrement: 0 });
	});

	test("should calculate the first verifier with decrement when remainder is 10 or more", () => {
		expect(calculateCnhFirstVerifier("000000093")).toEqual({ firstVerifier: 0, decrement: 2 });
	});
});
