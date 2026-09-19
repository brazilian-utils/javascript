import * as fc from "fast-check";

import { anyText, anyValue } from "../../_internals/test/arbitraries";
import { expectNeverThrows } from "../../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type CliValueKind } from "../constants";
import { coerceCliValue } from "./coerce-cli-value";

const KINDS: (CliValueKind | "text" | undefined)[] = [
	"boolean",
	"date",
	"list",
	"number",
	"text",
	undefined,
];

describe("coerceCliValue", () => {
	test("should keep text with no kind as it is, leading zeros included", () => {
		expect(coerceCliValue("001")).toBe("001");
		expect(coerceCliValue("001", "text")).toBe("001");
		expect(coerceCliValue("")).toBe("");
		expect(coerceCliValue("true")).toBe("true");
	});

	test("should turn the text of a number into that number", () => {
		expect(coerceCliValue("2", "number")).toBe(2);
		expect(coerceCliValue("-5", "number")).toBe(-5);
		expect(coerceCliValue("1234.56", "number")).toBe(1234.56);
		expect(coerceCliValue(" 7 ", "number")).toBe(7);
	});

	test("should turn text that is not a number into NaN, a blank text included", () => {
		expect(Number.isNaN(coerceCliValue("abc", "number"))).toBe(true);
		expect(Number.isNaN(coerceCliValue("", "number"))).toBe(true);
		expect(Number.isNaN(coerceCliValue("   ", "number"))).toBe(true);
	});

	test("should read a YYYY-MM-DD date as that local calendar day", () => {
		const date = coerceCliValue("2024-12-25", "date") as Date;

		expect(date instanceof Date).toBe(true);
		expect(date.getFullYear()).toBe(2024);
		expect(date.getMonth()).toBe(11);
		expect(date.getDate()).toBe(25);
		expect(date.getHours()).toBe(0);
	});

	test("should read a year below 100 as written, not as 19xx", () => {
		const date = coerceCliValue("0050-03-04", "date") as Date;

		expect(date.getFullYear()).toBe(50);
		expect(date.getMonth()).toBe(2);
		expect(date.getDate()).toBe(4);
		expect(date.getHours()).toBe(0);
		expect(date.getMinutes()).toBe(0);
		expect(date.getSeconds()).toBe(0);
		expect(date.getMilliseconds()).toBe(0);
	});

	test("should read the last day of a month and a leap day", () => {
		const leap = coerceCliValue("2024-02-29", "date") as Date;
		const last = coerceCliValue("2024-12-31", "date") as Date;

		expect([leap.getFullYear(), leap.getMonth(), leap.getDate()]).toEqual([2024, 1, 29]);
		expect([last.getFullYear(), last.getMonth(), last.getDate()]).toEqual([2024, 11, 31]);
	});

	test("should turn anything that is not a real YYYY-MM-DD day into an invalid date", () => {
		for (const text of [
			"2024-02-30",
			"2024-13-01",
			"2024-00-10",
			"2024-01-00",
			"2024-12-32",
			"2023-02-29",
			"25/12/2024",
			"2024-12-25T10:00:00",
			" 2024-12-25",
			"2024-12-25 ",
			"today",
			"",
		]) {
			const date = coerceCliValue(text, "date") as Date;

			expect(date instanceof Date).toBe(true);
			expect(Number.isNaN(date.getTime())).toBe(true);
		}
	});

	test("should split a list on commas and trim every item", () => {
		expect(coerceCliValue("cpf", "list")).toEqual(["cpf"]);
		expect(coerceCliValue("cpf,cnpj", "list")).toEqual(["cpf", "cnpj"]);
		expect(coerceCliValue(" de , da ,do", "list")).toEqual(["de", "da", "do"]);
	});

	test("should read true and false as booleans and keep any other text", () => {
		expect(coerceCliValue("true", "boolean")).toBe(true);
		expect(coerceCliValue("false", "boolean")).toBe(false);
		expect(coerceCliValue("yes", "boolean")).toBe("yes");
		expect(coerceCliValue("", "boolean")).toBe("");
	});

	test("should hand back a value that is not text untouched, whatever the kind", () => {
		const list = ["cpf"];
		const date = new Date(2024, 0, 1);

		expect(coerceCliValue(true, "boolean")).toBe(true);
		expect(coerceCliValue(false, "number")).toBe(false);
		expect(coerceCliValue(3, "number")).toBe(3);
		expect(coerceCliValue(3, "date")).toBe(3);
		expect(coerceCliValue(list, "list")).toBe(list);
		expect(coerceCliValue(date, "date")).toBe(date);
		expect(coerceCliValue(null, "list")).toBeNull();
		expect((coerceCliValue as unknown as () => unknown)()).toBeUndefined();
	});

	describe("properties", () => {
		test("should never throw, whatever the value and the kind", () => {
			for (const kind of KINDS) {
				expectNeverThrows((value: unknown) => coerceCliValue(value, kind), anyValue);
			}
		});

		test("should keep any text with no kind unchanged", () => {
			fc.assert(
				fc.property(anyText, (text) => {
					expect(coerceCliValue(text)).toBe(text);
				}),
			);
		});

		test("should read back any integer written as text", () => {
			fc.assert(
				fc.property(fc.integer(), (value) => {
					expect(coerceCliValue(String(value), "number")).toBe(value);
				}),
			);
		});
	});
});

describe("coerceCliValue types", () => {
	test("should take any value and a kind, and return an unknown value", () => {
		expectTypeOf(coerceCliValue).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(coerceCliValue).parameter(1).toEqualTypeOf<CliValueKind | "text" | undefined>();
		expectTypeOf(coerceCliValue).returns.toEqualTypeOf<unknown>();
	});
});
