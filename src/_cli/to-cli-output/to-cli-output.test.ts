import * as fc from "fast-check";

import { anyText } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type CliOutput, toCliOutput } from "./to-cli-output";

describe("toCliOutput", () => {
	test("should print a string as it is", () => {
		expect(toCliOutput("123.456.789-09")).toEqual({ text: "123.456.789-09", exitCode: 0 });
		expect(toCliOutput('say "oi"')).toEqual({ text: 'say "oi"', exitCode: 0 });
	});

	test("should exit with 1 for the empty string a formatter answers with", () => {
		expect(toCliOutput("")).toEqual({ text: "", exitCode: 1 });
	});

	test("should print a number as it is", () => {
		expect(toCliOutput(1234.56)).toEqual({ text: "1234.56", exitCode: 0 });
		expect(toCliOutput(0)).toEqual({ text: "0", exitCode: 0 });
		expect(toCliOutput(-3)).toEqual({ text: "-3", exitCode: 0 });
	});

	test("should print true and exit with 0", () => {
		expect(toCliOutput(true)).toEqual({ text: "true", exitCode: 0 });
	});

	test("should print false and exit with 1", () => {
		expect(toCliOutput(false)).toEqual({ text: "false", exitCode: 1 });
	});

	test("should print null for null and undefined and exit with 1", () => {
		expect(toCliOutput(null)).toEqual({ text: "null", exitCode: 1 });
		expect((toCliOutput as unknown as () => unknown)()).toEqual({ text: "null", exitCode: 1 });
	});

	test("should print an object as indented JSON", () => {
		expect(toCliOutput({ code: "001", ispb: "00000000" })).toEqual({
			text: '{\n  "code": "001",\n  "ispb": "00000000"\n}',
			exitCode: 0,
		});
		expect(toCliOutput({})).toEqual({ text: "{}", exitCode: 0 });
	});

	test("should print an array as indented JSON", () => {
		expect(toCliOutput(["Acrelândia", "Assis Brasil"])).toEqual({
			text: '[\n  "Acrelândia",\n  "Assis Brasil"\n]',
			exitCode: 0,
		});
		expect(toCliOutput([])).toEqual({ text: "[]", exitCode: 0 });
		expect(toCliOutput([11, 12])).toEqual({ text: "[\n  11,\n  12\n]", exitCode: 0 });
	});

	test("should print a date as its local calendar day", () => {
		expect(toCliOutput(new Date(2024, 11, 25))).toEqual({ text: "2024-12-25", exitCode: 0 });
		expect(toCliOutput(new Date(2024, 0, 2, 23, 59, 59))).toEqual({
			text: "2024-01-02",
			exitCode: 0,
		});
		expect(toCliOutput(new Date(2024, 0, 2, 0, 0, 0))).toEqual({
			text: "2024-01-02",
			exitCode: 0,
		});
	});

	test("should pad the year of a date to four digits", () => {
		const date = new Date(2024, 4, 9);
		date.setFullYear(987);

		expect(toCliOutput(date).text).toBe("0987-05-09");
	});

	test("should print the dates inside a result as local calendar days too", () => {
		const holidays = [
			{ name: "Ano novo", date: new Date(2026, 0, 1), type: "national" },
			{ name: "Natal", date: new Date(2026, 11, 25, 12), type: "national" },
		];

		expect(toCliOutput(holidays).text).toBe(
			[
				"[",
				"  {",
				'    "name": "Ano novo",',
				'    "date": "2026-01-01",',
				'    "type": "national"',
				"  },",
				"  {",
				'    "name": "Natal",',
				'    "date": "2026-12-25",',
				'    "type": "national"',
				"  }",
				"]",
			].join("\n"),
		);
		expect(toCliOutput({ range: { from: new Date(2026, 5, 4) } }).text).toBe(
			'{\n  "range": {\n    "from": "2026-06-04"\n  }\n}',
		);
	});

	test("should keep null, booleans and numbers inside a result", () => {
		expect(toCliOutput({ a: null, b: false, c: 0, d: [null] }).text).toBe(
			'{\n  "a": null,\n  "b": false,\n  "c": 0,\n  "d": [\n    null\n  ]\n}',
		);
	});

	test("should print the values JSON cannot hold as their text instead of throwing", () => {
		expect(toCliOutput(10n)).toEqual({ text: "10", exitCode: 0 });
		expect(toCliOutput(Symbol("pix"))).toEqual({ text: "Symbol(pix)", exitCode: 0 });
		expect(toCliOutput({ total: 10n, key: Symbol("pix") }).text).toBe(
			'{\n  "total": "10",\n  "key": "Symbol(pix)"\n}',
		);
		expect(toCliOutput({ run: String }).text).toBe(
			JSON.stringify({ run: String(String) }, null, 2),
		);
	});

	describe("properties", () => {
		test("should print any string unchanged", () => {
			fc.assert(
				fc.property(anyText, (text) => {
					expect(toCliOutput(text)).toEqual({ text, exitCode: text === "" ? 1 : 0 });
				}),
			);
		});

		test("should print any JSON value as text that parses back to it", () => {
			fc.assert(
				fc.property(fc.jsonValue(), (value) => {
					const { text } = toCliOutput(value);

					expect(text).toBe(typeof value === "string" ? value : JSON.stringify(value, null, 2));
				}),
			);
		});

		test("should exit with 1 only for false, null, undefined and the empty string", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const { text, exitCode } = toCliOutput(value);
					const isNegative =
						value === false || value === null || value === undefined || value === "";

					expect(typeof text).toBe("string");
					expect(exitCode).toBe(isNegative ? 1 : 0);
				}),
			);
		});
	});
});

describe("toCliOutput types", () => {
	test("should take any value and return the text and the exit code", () => {
		expectTypeOf(toCliOutput).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(toCliOutput).returns.toEqualTypeOf<CliOutput>();
		expectTypeOf<CliOutput["exitCode"]>().toEqualTypeOf<0 | 1>();
	});
});
