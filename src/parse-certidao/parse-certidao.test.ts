import { CERTIDAO_LENGTH } from "../_internals/constants/certidao";
import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCertidao } from "../format-certidao/format-certidao";
import { parseCertidao } from "./parse-certidao";

describe("parseCertidao", () => {
	it("should remove the matrícula mask characters", () => {
		expect(parseCertidao("104539 01 55 2013 1 00012 021 0000123 21")).toBe(
			"10453901552013100012021000012321",
		);
	});

	it("should remove non numeric characters", () => {
		expect(parseCertidao("104539.01.55.2013.1.00012.021.0000123-21abc")).toBe(
			"10453901552013100012021000012321",
		);
	});

	it(`should ignore digits after the matrícula length (${CERTIDAO_LENGTH})`, () => {
		expect(parseCertidao("10453901552013100012021000012321999")).toBe(
			"10453901552013100012021000012321",
		);
	});

	it("should keep a partial matrícula as written", () => {
		expect(parseCertidao("104539 01")).toBe("10453901");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCertidao(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a matrícula", () => {
			expectMatchesPattern(parseCertidao, /^\d{0,32}$/, anyText);
		});

		test("should undo formatCertidao", () => {
			expectRoundTrip(formatCertidao, parseCertidao, digitsUpTo(CERTIDAO_LENGTH));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCertidao, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCertidao, "string", anyValue);
		});
	});
});

describe("parseCertidao types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCertidao).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCertidao).returns.toEqualTypeOf<string>();
	});
});
