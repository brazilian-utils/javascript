import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCst } from "./is-valid-cst";

describe("isValidCst", () => {
	describe("icms", () => {
		it("should return true for a valid origin + CST combination", () => {
			expect(isValidCst("110", { tax: "icms" })).toBe(true);
			expect(isValidCst("000", { tax: "icms" })).toBe(true);
			expect(isValidCst("890", { tax: "icms" })).toBe(true);
		});

		it("should return true for a number input", () => {
			expect(isValidCst(110, { tax: "icms" })).toBe(true);
		});

		it("should return false when the origin digit is greater than 8", () => {
			expect(isValidCst("910", { tax: "icms" })).toBe(false);
		});

		it("should return false when the CST part is not a known code", () => {
			expect(isValidCst("199", { tax: "icms" })).toBe(false);
		});

		it("should return false for a length different from 3", () => {
			expect(isValidCst("10", { tax: "icms" })).toBe(false);
			expect(isValidCst("1020", { tax: "icms" })).toBe(false);
		});
	});

	describe("ipi", () => {
		it("should return true for known codes", () => {
			expect(isValidCst("00", { tax: "ipi" })).toBe(true);
			expect(isValidCst("49", { tax: "ipi" })).toBe(true);
			expect(isValidCst("99", { tax: "ipi" })).toBe(true);
		});

		it("should return false for an unknown code", () => {
			expect(isValidCst("06", { tax: "ipi" })).toBe(false);
		});
	});

	describe("pis", () => {
		it("should return true for known codes", () => {
			expect(isValidCst("07", { tax: "pis" })).toBe(true);
			expect(isValidCst("98", { tax: "pis" })).toBe(true);
		});

		it("should return false for an unknown code", () => {
			expect(isValidCst("11", { tax: "pis" })).toBe(false);
		});
	});

	describe("cofins", () => {
		it("should return true for known codes (same table as pis)", () => {
			expect(isValidCst("07", { tax: "cofins" })).toBe(true);
		});

		it("should return false for an unknown code", () => {
			expect(isValidCst("11", { tax: "cofins" })).toBe(false);
		});
	});

	it("should return false for an unknown tax", () => {
		// @ts-expect-error not a valid tax
		expect(isValidCst("00", { tax: "iss" })).toBe(false);
	});

	it("should return false for an unknown tax even when the code is a valid pis/cofins code", () => {
		// @ts-expect-error not a valid tax
		expect(isValidCst("07", { tax: "iss" })).toBe(false);
	});

	describe("without options (tax omitted)", () => {
		it("should return true when the code is a valid icms combination", () => {
			expect(isValidCst("110")).toBe(true);
		});

		it("should return true when the code exists only in the ipi table", () => {
			expect(isValidCst("00")).toBe(true);
		});

		it("should return true when the code exists only in the pis/cofins table", () => {
			expect(isValidCst("07")).toBe(true);
		});

		it("should return true when the code exists in both the ipi and pis/cofins tables", () => {
			expect(isValidCst("49")).toBe(true);
		});

		it("should return true when options is undefined", () => {
			expect(isValidCst("110")).toBe(true);
		});

		it("should return true when options.tax is undefined", () => {
			expect(isValidCst("110", {})).toBe(true);
		});

		it("should return false when the code exists in no table", () => {
			expect(isValidCst("999")).toBe(false);
		});
	});

	it("should return false when options is null", () => {
		// @ts-expect-error not an options object
		expect(isValidCst("00", null)).toBe(false);
	});

	it("should return false when options is a non-null, non-object value (e.g. a string)", () => {
		// @ts-expect-error not an options object
		expect(isValidCst("00", "foo")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCst("", { tax: "icms" })).toBe(false);
	});

	it("should return false for null", () => {
		// @ts-expect-error not a string or number
		expect(isValidCst(null, { tax: "icms" })).toBe(false);
	});

	it("should return false for undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCst(undefined, { tax: "icms" })).toBe(false);
	});

	it("should sanitize whitespace and mask characters", () => {
		expect(isValidCst(" 1-10 ", { tax: "icms" })).toBe(true);
	});
});
