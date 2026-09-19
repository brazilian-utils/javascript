import * as fc from "fast-check";

import { PROTOTYPE_KEYS, anyText } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type ParsedCliArguments, parseCliArguments } from "./parse-cli-arguments";

const plainText = anyText.filter((text) => !text.startsWith("--"));

describe("parseCliArguments", () => {
	test("should return nothing for an empty command line", () => {
		expect(parseCliArguments([])).toEqual({ positionals: [], options: {}, error: null });
	});

	test("should keep the positional values in order", () => {
		expect(parseCliArguments(["SP", "110042490114"])).toEqual({
			positionals: ["SP", "110042490114"],
			options: {},
			error: null,
		});
	});

	test("should read a negative number and the stdin marker as positional values", () => {
		expect(parseCliArguments(["-5", "-"])).toEqual({
			positionals: ["-5", "-"],
			options: {},
			error: null,
		});
	});

	test("should read --key value as a text option", () => {
		expect(parseCliArguments(["--year", "2026", "--mask", "international"])).toEqual({
			positionals: [],
			options: { year: "2026", mask: "international" },
			error: null,
		});
	});

	test("should read --key=value as a text option, keeping every later equals sign", () => {
		expect(parseCliArguments(["--year=2026", "--description=a=b", "--txid="])).toEqual({
			positionals: [],
			options: { year: "2026", description: "a=b", txid: "" },
			error: null,
		});
	});

	test("should take a value that starts with a single dash", () => {
		expect(parseCliArguments(["--amount", "-5"])).toEqual({
			positionals: [],
			options: { amount: "-5" },
			error: null,
		});
	});

	test("should read --kebab-case names as camelCase", () => {
		expect(parseCliArguments(["--state-code", "SP", "--merchant-name=Loja"])).toEqual({
			positionals: [],
			options: { stateCode: "SP", merchantName: "Loja" },
			error: null,
		});
		expect(parseCliArguments(["--stateCode", "SP"]).options).toEqual({ stateCode: "SP" });
	});

	test("should set a boolean option with a bare flag, without taking the next value", () => {
		expect(parseCliArguments(["--obfuscate", "12345678000195", "--pad"])).toEqual({
			positionals: ["12345678000195"],
			options: { obfuscate: true, pad: true },
			error: null,
		});
		expect(parseCliArguments(["--include-optional"]).options).toEqual({ includeOptional: true });
	});

	test("should unset a boolean option with --no-flag", () => {
		expect(parseCliArguments(["--no-symbol", "10", "--no-include-optional"])).toEqual({
			positionals: ["10"],
			options: { symbol: false, includeOptional: false },
			error: null,
		});
	});

	test("should keep the text given to a boolean option with an equals sign", () => {
		expect(parseCliArguments(["--pad=false", "--no-pad=x"]).options).toEqual({
			pad: "false",
			noPad: "x",
		});
	});

	test("should read --no-key as an ordinary text option when key is not a boolean option", () => {
		expect(parseCliArguments(["--no-year", "5", "--no-", "x", "--no", "y"])).toEqual({
			positionals: [],
			options: { noYear: "5", "no-": "x", no: "y" },
			error: null,
		});
	});

	test("should treat --help as a flag", () => {
		expect(parseCliArguments(["--help", "123"])).toEqual({
			positionals: ["123"],
			options: { help: true },
			error: null,
		});
	});

	test("should let the last occurrence of an option win", () => {
		expect(parseCliArguments(["--year", "2025", "--year", "2026"]).options).toEqual({
			year: "2026",
		});
		expect(parseCliArguments(["--pad", "--no-pad"]).options).toEqual({ pad: false });
	});

	test("should read everything after a bare -- as positional values", () => {
		expect(parseCliArguments(["--pad", "--", "--obfuscate", "--", "-x", "--year=1"])).toEqual({
			positionals: ["--obfuscate", "--", "-x", "--year=1"],
			options: { pad: true },
			error: null,
		});
	});

	test("should report a text option left without a value", () => {
		expect(parseCliArguments(["123", "--year"])).toEqual({
			positionals: ["123"],
			options: {},
			error: "Option --year needs a value.",
		});
		expect(parseCliArguments(["--state-code", "--pad", "1"])).toEqual({
			positionals: [],
			options: {},
			error: "Option --stateCode needs a value.",
		});
		expect(parseCliArguments(["--year", "--"]).error).toBe("Option --year needs a value.");
	});

	test("should store prototype keys as plain own options", () => {
		for (const key of PROTOTYPE_KEYS) {
			const { options, error } = parseCliArguments([`--${key}`, "x"]);

			expect(error).toBeNull();
			expect(Object.hasOwn(options, key)).toBe(true);
			expect(Object.getPrototypeOf(options)).toBe(Object.prototype);
		}
		expect(parseCliArguments(["--__proto__=x"]).options["__proto__"]).toBe("x");
		expect(parseCliArguments(["--toString"]).error).toBe("Option --toString needs a value.");
	});

	describe("properties", () => {
		test("should never throw and always return the three keys", () => {
			fc.assert(
				fc.property(fc.array(anyText), (argv) => {
					const parsed = parseCliArguments(argv);

					expect(Object.keys(parsed)).toEqual(["positionals", "options", "error"]);
				}),
			);
		});

		test("should hand back every value that does not start with two dashes as positional", () => {
			fc.assert(
				fc.property(fc.array(plainText), (argv) => {
					expect(parseCliArguments(argv)).toEqual({ positionals: argv, options: {}, error: null });
				}),
			);
		});

		test("should hand back anything after a bare -- as positional", () => {
			fc.assert(
				fc.property(fc.array(anyText), (argv) => {
					expect(parseCliArguments(["--", ...argv]).positionals).toEqual(argv);
				}),
			);
		});
	});
});

describe("parseCliArguments types", () => {
	test("should take the arguments and return the parsed command line", () => {
		expectTypeOf(parseCliArguments).parameter(0).toEqualTypeOf<readonly string[]>();
		expectTypeOf(parseCliArguments).returns.toEqualTypeOf<ParsedCliArguments>();
		expectTypeOf<ParsedCliArguments["options"]>().toEqualTypeOf<Record<string, string | boolean>>();
		expectTypeOf<ParsedCliArguments["error"]>().toEqualTypeOf<string | null>();
	});
});
