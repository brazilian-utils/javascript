import * as fc from "fast-check";

import { SERVICE_ITEM_DESCRIPTIONS } from "../_internals/constants/service-items";
import { anyGarbage, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidServiceItem } from "../is-valid-service-item/is-valid-service-item";
import { getServiceItem, type ServiceItem } from "./get-service-item";

const SYSTEMS = { code: "1.01", description: "Análise e desenvolvimento de sistemas." };

describe("getServiceItem", () => {
	it("should return the subitem for the form the law prints", () => {
		expect(getServiceItem("1.01")).toEqual(SYSTEMS);
		expect(getServiceItem("1.02")).toEqual({ code: "1.02", description: "Programação." });
	});

	it("should return the subitem for a zero padded item", () => {
		expect(getServiceItem("01.01")).toEqual(SYSTEMS);
	});

	it("should return the subitem for the bare digits, the first four of a cTribNac", () => {
		expect(getServiceItem("0101")).toEqual(SYSTEMS);
		expect(getServiceItem("101")).toEqual(SYSTEMS);
		expect(getServiceItem(101)).toEqual(SYSTEMS);
	});

	it("should return a two digit item without a leading zero in the code", () => {
		expect(getServiceItem("40.01")).toEqual({
			code: "40.01",
			description: "Obras de arte sob encomenda.",
		});
		expect(getServiceItem(4001)).toEqual({
			code: "40.01",
			description: "Obras de arte sob encomenda.",
		});
		expect(getServiceItem("10.04")?.code).toBe("10.04");
	});

	it("should return the subitem 11.05, added by the Lei Complementar 183/2021", () => {
		expect(getServiceItem("11.05")?.code).toBe("11.05");
	});

	it("should ignore surrounding whitespace", () => {
		expect(getServiceItem(" 1.01\n")).toEqual(SYSTEMS);
	});

	it("should return the subitem 17.14 as the official sheet prints it, without a final period", () => {
		expect(getServiceItem("17.14")).toEqual({ code: "17.14", description: "Advocacia" });
	});

	it("should return a fresh object that does not leak the internal table", () => {
		expect(getServiceItem("1.01")).not.toBe(getServiceItem("1.01"));
	});

	it("should return null for the vetoed subitems", () => {
		expect(getServiceItem("3.01")).toBeNull();
		expect(getServiceItem("7.14")).toBeNull();
		expect(getServiceItem("7.15")).toBeNull();
		expect(getServiceItem("13.01")).toBeNull();
		expect(getServiceItem("17.07")).toBeNull();
	});

	it("should return null for item 99 of the national list, which is not part of the law", () => {
		expect(getServiceItem("99.01")).toBeNull();
	});

	it("should return null for an item heading and for a 6 digit national code", () => {
		expect(getServiceItem("1")).toBeNull();
		expect(getServiceItem("01")).toBeNull();
		expect(getServiceItem("010101")).toBeNull();
		expect(getServiceItem("1.01.01")).toBeNull();
	});

	it("should return null for a subitem the list does not carry", () => {
		expect(getServiceItem("1.10")).toBeNull();
		expect(getServiceItem("41.01")).toBeNull();
		expect(getServiceItem("0.01")).toBeNull();
	});

	it("should return null for a string that is not written in a documented form", () => {
		expect(getServiceItem("1.1")).toBeNull();
		expect(getServiceItem("1..01")).toBeNull();
		expect(getServiceItem("1-01")).toBeNull();
		expect(getServiceItem("1,01")).toBeNull();
		expect(getServiceItem("x1.01")).toBeNull();
		expect(getServiceItem("1.01x")).toBeNull();
		expect(getServiceItem("001.01")).toBeNull();
	});

	it("should return null for an empty string and for whitespace only", () => {
		expect(getServiceItem("")).toBeNull();
		expect(getServiceItem("   ")).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getServiceItem(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getServiceItem()).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getServiceItem(1.01)).toBeNull();
		expect(getServiceItem(-101)).toBeNull();
		expect(getServiceItem(2 ** 53)).toBeNull();
	});

	it("should return null for the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) expect(getServiceItem(key)).toBeNull();
	});

	describe("properties", () => {
		const keyArbitrary = fc.constantFrom(...Object.keys(SERVICE_ITEM_DESCRIPTIONS));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getServiceItem, anyGarbage);
		});

		test("should resolve every subitem of the table in every documented form and agree with isValidServiceItem", () => {
			fc.assert(
				fc.property(keyArbitrary, (key) => {
					const description = SERVICE_ITEM_DESCRIPTIONS[key];
					const padded = `${key.slice(0, 2)}.${key.slice(2)}`;
					const found = getServiceItem(key);

					expect(found?.description).toBe(description);
					expect(found?.code).toMatch(/^[1-9]\d?\.\d{2}$/);
					expect(getServiceItem(padded)).toEqual(found);
					expect(getServiceItem(Number(key))).toEqual(found);
					expect(getServiceItem(found?.code ?? "")).toEqual(found);
					expect(isValidServiceItem(key)).toBe(true);
				}),
			);
		});

		test("should only carry items 01 to 40 and non-empty descriptions", () => {
			fc.assert(
				fc.property(keyArbitrary, (key) => {
					expect(key).toMatch(/^(?:0[1-9]|[1-3]\d|40)\d{2}$/);
					expect(SERVICE_ITEM_DESCRIPTIONS[key].trim()).not.toBe("");
				}),
			);
		});
	});
});

describe("getServiceItem types", () => {
	test("should take a string or number and return a ServiceItem or null", () => {
		expectTypeOf(getServiceItem).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getServiceItem).returns.toEqualTypeOf<ServiceItem | null>();
		expectTypeOf<ServiceItem>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
