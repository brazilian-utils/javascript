import * as fc from "fast-check";

import { anyValue } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type McpJsonSchema } from "../constants";
import { parseToolArguments, type ParseToolArgumentsResult } from "./parse-tool-arguments";

const VALUE_INPUT: McpJsonSchema = {
	type: "object",
	properties: {
		value: { type: "string" },
		options: {
			type: "object",
			properties: { pad: { type: "boolean" } },
			additionalProperties: false,
		},
	},
	required: ["value"],
	additionalProperties: false,
};

describe("parseToolArguments", () => {
	describe("types", () => {
		const accepted = [
			["string", "abc"],
			["string", ""],
			["number", 1.5],
			["number", 0],
			["integer", -3],
			["boolean", false],
			["array", []],
			["object", {}],
		] as const;

		for (const [type, value] of accepted) {
			test(`should accept a ${type} such as ${JSON.stringify(value)}`, () => {
				expect(parseToolArguments({ type }, value, "arguments.value")).toStrictEqual({
					ok: true,
					value,
				});
			});
		}

		const refused = [
			["string", 1],
			["string", null],
			["number", "1"],
			["number", Number.NaN],
			["number", Number.POSITIVE_INFINITY],
			["integer", 1.5],
			["integer", "1"],
			["boolean", 0],
			["boolean", "true"],
			["array", {}],
			["array", "a"],
			["object", []],
			["object", null],
			["object", "a"],
		] as const;

		for (const [index, [type, value]] of refused.entries()) {
			test(`should refuse a ${type} given as ${JSON.stringify(value)} (case ${index})`, () => {
				expect(parseToolArguments({ type }, value, "arguments.value")).toStrictEqual({
					ok: false,
					message: `arguments.value must be of type ${type}`,
				});
			});
		}
	});

	describe("enum", () => {
		test("should accept a listed string and a listed number", () => {
			expect(parseToolArguments({ type: "string", enum: ["SP", "RJ"] }, "RJ", "a")).toStrictEqual({
				ok: true,
				value: "RJ",
			});
			expect(parseToolArguments({ type: "integer", enum: [1, 2] }, 2, "a")).toStrictEqual({
				ok: true,
				value: 2,
			});
		});

		test("should refuse a value that is not listed and name the listed ones", () => {
			expect(
				parseToolArguments({ type: "string", enum: ["SP", "RJ"] }, "sp", "arguments.stateCode"),
			).toStrictEqual({ ok: false, message: 'arguments.stateCode must be one of "SP", "RJ"' });
			expect(
				parseToolArguments({ type: "integer", enum: [1, 2] }, 3, "arguments.version"),
			).toStrictEqual({ ok: false, message: "arguments.version must be one of 1, 2" });
		});
	});

	describe("objects", () => {
		test("should copy the listed properties, nested ones included", () => {
			const value = { value: "123", options: { pad: true } };
			const parsed = parseToolArguments(VALUE_INPUT, value, "arguments");

			expect(parsed).toStrictEqual({ ok: true, value: { value: "123", options: { pad: true } } });
			expect(parsed.ok && parsed.value).not.toBe(value);
		});

		test("should accept an object without its optional properties", () => {
			expect(parseToolArguments(VALUE_INPUT, { value: "" }, "arguments")).toStrictEqual({
				ok: true,
				value: { value: "" },
			});
		});

		test("should accept an empty object under a schema without properties or required", () => {
			expect(parseToolArguments({ type: "object" }, {}, "arguments")).toStrictEqual({
				ok: true,
				value: {},
			});
		});

		test("should refuse a missing required property", () => {
			expect(parseToolArguments(VALUE_INPUT, {}, "arguments")).toStrictEqual({
				ok: false,
				message: "arguments.value is required",
			});
		});

		test("should refuse a required property that is only inherited", () => {
			const inherited: Record<string, unknown> = Object.create({ value: "123" });

			expect(parseToolArguments(VALUE_INPUT, inherited, "arguments")).toStrictEqual({
				ok: false,
				message: "arguments.value is required",
			});
		});

		test("should refuse a property the schema does not list and name the listed ones", () => {
			expect(parseToolArguments(VALUE_INPUT, { value: "1", cpf: "2" }, "arguments")).toStrictEqual({
				ok: false,
				message: "arguments.cpf is not accepted; known properties: value, options",
			});
			expect(parseToolArguments({ type: "object" }, { a: 1 }, "arguments")).toStrictEqual({
				ok: false,
				message: "arguments.a is not accepted; known properties: ",
			});
		});

		test("should report a nested problem with its full path", () => {
			expect(
				parseToolArguments(VALUE_INPUT, { value: "1", options: { pad: "yes" } }, "arguments"),
			).toStrictEqual({ ok: false, message: "arguments.options.pad must be of type boolean" });
		});

		for (const key of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
			test(`should refuse the prototype key ${key} instead of reading it off the schema`, () => {
				const hostile: unknown = JSON.parse(`{"value":"1","${key}":{"polluted":true}}`);

				expect(parseToolArguments(VALUE_INPUT, hostile, "arguments")).toStrictEqual({
					ok: false,
					message: `arguments.${key} is not accepted; known properties: value, options`,
				});
				expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
			});
		}
	});

	describe("arrays", () => {
		const schema: McpJsonSchema = {
			type: "array",
			items: { type: "string", enum: ["mobile", "landline"] },
		};

		test("should copy the items that satisfy the item schema", () => {
			const value = ["mobile", "landline"];
			const parsed = parseToolArguments(schema, value, "arguments.accept");

			expect(parsed).toStrictEqual({ ok: true, value: ["mobile", "landline"] });
			expect(parsed.ok && parsed.value).not.toBe(value);
			expect(parseToolArguments(schema, [], "arguments.accept")).toStrictEqual({
				ok: true,
				value: [],
			});
		});

		test("should report the index of the first item that breaks the item schema", () => {
			expect(parseToolArguments(schema, ["mobile", 7, 8], "arguments.accept")).toStrictEqual({
				ok: false,
				message: "arguments.accept[1] must be of type string",
			});
			expect(parseToolArguments(schema, ["fax"], "arguments.accept")).toStrictEqual({
				ok: false,
				message: 'arguments.accept[0] must be one of "mobile", "landline"',
			});
		});

		test("should pass the items through when the schema does not describe them", () => {
			const value = [1, "a", null];
			const parsed = parseToolArguments({ type: "array" }, value, "arguments.list");

			expect(parsed).toStrictEqual({ ok: true, value: [1, "a", null] });
			expect(parsed.ok && parsed.value).toBe(value);
		});
	});

	describe("dates", () => {
		const schema: McpJsonSchema = { type: "string", format: "date" };

		test("should turn a calendar date into a Date at local midnight", () => {
			const parsed = parseToolArguments(schema, "2024-02-29", "arguments.date");

			expect(parsed.ok).toBe(true);
			expect(parsed.ok && parsed.value instanceof Date).toBe(true);
			const date = parsed.ok && parsed.value instanceof Date ? parsed.value : new Date(0);
			expect([
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds(),
				date.getMilliseconds(),
			]).toStrictEqual([2024, 1, 29, 0, 0, 0, 0]);
		});

		test("should turn the dates nested in an object into Date values", () => {
			const parsed = parseToolArguments(
				{ type: "object", properties: { options: { type: "object", properties: { on: schema } } } },
				{ options: { on: "1999-12-31" } },
				"arguments",
			);
			const value: any = parsed.ok ? parsed.value : {};

			expect(value.options.on instanceof Date).toBe(true);
			expect(value.options.on.getFullYear()).toBe(1999);
			expect(value.options.on.getMonth()).toBe(11);
			expect(value.options.on.getDate()).toBe(31);
		});

		const notDates = [
			"2023-02-29",
			"2024-13-01",
			"2024-00-10",
			"2024-01-00",
			"2024-04-31",
			"0050-01-01",
			"2024-1-1",
			"01/01/2024",
			"2024-01-01T00:00:00Z",
			" 2024-01-01",
			"2024-01-01\n",
			"x2024-01-01",
			"2024-01-011",
			"",
		];

		for (const value of notDates) {
			test(`should refuse ${JSON.stringify(value)}, which is not a YYYY-MM-DD calendar date`, () => {
				expect(parseToolArguments(schema, value, "arguments.date")).toStrictEqual({
					ok: false,
					message: "arguments.date must be a calendar date written as YYYY-MM-DD",
				});
			});
		}

		test("should check the type before reading the date", () => {
			expect(parseToolArguments(schema, 20_240_101, "arguments.date")).toStrictEqual({
				ok: false,
				message: "arguments.date must be of type string",
			});
		});
	});

	describe("properties", () => {
		test("should never throw and always answer with a verdict", () => {
			fc.assert(
				fc.property(anyValue, (value) => {
					const parsed = parseToolArguments(VALUE_INPUT, value, "arguments");

					expect(typeof parsed.ok).toBe("boolean");
				}),
			);
		});

		test("should accept every string under a string schema and return it untouched", () => {
			fc.assert(
				fc.property(fc.string(), (value) => {
					expect(parseToolArguments({ type: "string" }, value, "a")).toStrictEqual({
						ok: true,
						value,
					});
				}),
			);
		});

		test("should round trip every calendar date", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1900, max: 2099 }),
					fc.integer({ min: 1, max: 12 }),
					fc.integer({ min: 1, max: 28 }),
					(year, month, day) => {
						const text = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
						const parsed = parseToolArguments({ type: "string", format: "date" }, text, "a");
						const date = parsed.ok && parsed.value instanceof Date ? parsed.value : new Date(0);

						expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toStrictEqual([
							year,
							month,
							day,
						]);
					},
				),
			);
		});
	});
});

describe("parseToolArguments types", () => {
	test("should take a schema, a value and a path and return a verdict", () => {
		expectTypeOf(parseToolArguments).parameter(0).toEqualTypeOf<McpJsonSchema>();
		expectTypeOf(parseToolArguments).parameter(2).toEqualTypeOf<string>();
		expectTypeOf(
			parseToolArguments({ type: "string" }, "a" as unknown, "a"),
		).toEqualTypeOf<ParseToolArgumentsResult>();
	});

	test("should keep the object shape of an arguments object", () => {
		expectTypeOf(parseToolArguments({ type: "object" }, {}, "arguments")).toEqualTypeOf<
			ParseToolArgumentsResult<Record<string, unknown>>
		>();
	});
});
