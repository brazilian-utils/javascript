import * as fc from "fast-check";

import { PROTOTYPE_KEYS, anyText } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import * as brazilianUtils from "../../index";
import { CLI_USAGE } from "../constants";
import { type CliResult, type CliStdin, type RunCliParams, runCli } from "./run-cli";

const USAGE_HINT = 'Run "brazilian-utils --help" for usage.\n';

const terminal: CliStdin = {
	isPiped: false,
	read: () => Promise.reject(new Error("stdin must not be read")),
};

const pipe = (text: string): CliStdin => ({ isPiped: true, read: () => Promise.resolve(text) });

const typed = (text: string): CliStdin => ({ isPiped: false, read: () => Promise.resolve(text) });

const createApi = () => {
	const calls: unknown[][] = [];
	const record = (produce: () => unknown, length = 1) =>
		Object.defineProperty(
			(...args: unknown[]) => {
				calls.push(args);
				return produce();
			},
			"length",
			{ value: length },
		);

	return {
		calls,
		api: {
			formatThing: record(() => "formatted", 2),
			isValidThing: record(() => false),
			getThing: record(() => null),
			getThings: record(() => [{ code: "001" }], 0),
			generateThing: record(() => "generated", 0),
			addBusinessDays: record(() => new Date(2026, 8, 8), 3),
			fetchThing: record(() => Promise.resolve({ cep: "01001000" })),
			rejectThing: record(() => Promise.reject(new RangeError("service down"))),
			throwThing: record(() => {
				throw new TypeError("boom");
			}),
			throwText: record(() => {
				// eslint-disable-next-line typescript/only-throw-error, sonarjs/no-throw-literal -- a hostile export
				throw "plain text";
			}),
			ThingError: class ThingError extends Error {},
			VERSION: "1.0.0",
			settings: { pad: true },
		} as Record<string, unknown>,
	};
};

const stdoutOf = async (result: Promise<CliResult>) => {
	const { stdout } = await result;

	return stdout;
};

const exitCodeOf = async (result: Promise<CliResult>) => {
	const { exitCode } = await result;

	return exitCode;
};

const runApi = (argv: string[], stdin: CliStdin = terminal) =>
	runCli({ argv, api: brazilianUtils, version: "9.8.7", stdin });

const apiStdout = (argv: string[], stdin: CliStdin = terminal) => stdoutOf(runApi(argv, stdin));

const run = (argv: string[], stdin: CliStdin = terminal, api = createApi().api) =>
	runCli({ argv, api, version: "9.8.7", stdin });

describe("runCli", () => {
	describe("built-in commands", () => {
		test("should print the usage on stderr and exit with 2 when no utility is given", async () => {
			expect(await run([])).toEqual({ stdout: "", stderr: CLI_USAGE, exitCode: 2 });
			expect(await run([""])).toEqual({ stdout: "", stderr: CLI_USAGE, exitCode: 2 });
		});

		test("should print the usage for --help and -h", async () => {
			expect(await run(["--help"])).toEqual({ stdout: CLI_USAGE, stderr: "", exitCode: 0 });
			expect(await run(["-h"])).toEqual({ stdout: CLI_USAGE, stderr: "", exitCode: 0 });
		});

		test("should print the usage for --help after a utility, without calling it", async () => {
			const { api, calls } = createApi();

			expect(await run(["formatThing", "1", "--help"], terminal, api)).toEqual({
				stdout: CLI_USAGE,
				stderr: "",
				exitCode: 0,
			});
			expect(calls).toEqual([]);
		});

		test("should describe the command line in the usage", () => {
			expect(CLI_USAGE.startsWith("Usage: brazilian-utils <utility> [value...]")).toBe(true);
			expect(CLI_USAGE.endsWith("Documentation: https://brazilian-utils.com.br\n")).toBe(true);
			for (const term of ["--json", "--no-flag", "--version", "list", "stdin", "YYYY-MM-DD"]) {
				expect(CLI_USAGE.includes(term)).toBe(true);
			}
		});

		test("should print the version for --version and -v", async () => {
			expect(await run(["--version"])).toEqual({ stdout: "9.8.7\n", stderr: "", exitCode: 0 });
			expect(await run(["-v"])).toEqual({ stdout: "9.8.7\n", stderr: "", exitCode: 0 });
		});

		test("should keep --version after a utility as the version option of that utility", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "1", "--version", "2"], terminal, api);

			expect(calls).toEqual([["1", { version: 2 }]]);
		});

		test("should list every callable lower-camel-case export, sorted, one per line", async () => {
			expect(await run(["list"])).toEqual({
				stdout: [
					"addBusinessDays",
					"fetchThing",
					"formatThing",
					"generateThing",
					"getThing",
					"getThings",
					"isValidThing",
					"rejectThing",
					"throwText",
					"throwThing",
					"",
				].join("\n"),
				stderr: "",
				exitCode: 0,
			});
		});
	});

	describe("unknown utilities", () => {
		test("should reject a name that is not exported", async () => {
			expect(await run(["nope"])).toEqual({
				stdout: "",
				stderr: `Unknown utility "nope". Run "brazilian-utils list" to see every utility.\n${USAGE_HINT}`,
				exitCode: 2,
			});
		});

		test("should reject an export that is not a utility", async () => {
			const names = ["ThingError", "VERSION", "settings", "help", "--nope", "-x"];
			const results = await Promise.all(names.map((name) => run([name])));

			expect(results.map(({ exitCode }) => exitCode)).toEqual([2, 2, 2, 2, 2, 2]);
			expect(results.map(({ stdout }) => stdout)).toEqual(["", "", "", "", "", ""]);
			expect(results.map(({ stderr }) => stderr.slice(0, 27))).toEqual([
				'Unknown utility "ThingError',
				'Unknown utility "VERSION". ',
				'Unknown utility "settings".',
				'Unknown utility "help". Run',
				'Unknown utility "--nope". R',
				'Unknown utility "-x". Run "',
			]);
		});

		test("should reject every prototype key", async () => {
			const results = await Promise.all(PROTOTYPE_KEYS.map((name) => run([name])));

			expect(PROTOTYPE_KEYS.includes("constructor")).toBe(true);
			for (const [index, result] of results.entries()) {
				expect(result.exitCode).toBe(2);
				expect(result.stderr.startsWith(`Unknown utility "${PROTOTYPE_KEYS[index]}".`)).toBe(true);
			}
		});

		test("should reject an inherited function", async () => {
			const api = Object.create({ inheritedThing: () => "inherited" }) as Record<string, unknown>;

			expect(await exitCodeOf(run(["inheritedThing"], terminal, api))).toBe(2);
			expect(await stdoutOf(run(["list"], terminal, api))).toBe("\n");
		});
	});

	describe("arguments", () => {
		test("should call the utility with no argument at all when none is given", async () => {
			const { api, calls } = createApi();

			expect(await run(["generateThing"], terminal, api)).toEqual({
				stdout: "generated\n",
				stderr: "",
				exitCode: 0,
			});
			expect(calls).toEqual([[]]);
		});

		test("should pass the positional values in order, as text", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "001", "0002"], terminal, api);

			expect(calls).toEqual([["001", "0002"]]);
		});

		test("should pass the options as the last argument", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "123", "--obfuscate", "--state-code", "SP"], terminal, api);

			expect(calls).toEqual([["123", { obfuscate: true, stateCode: "SP" }]]);
		});

		test("should pass the options as the only argument of a utility that takes params", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "--bank-code", "001", "--agency=1234"], terminal, api);

			expect(calls).toEqual([[{ bankCode: "001", agency: "1234" }]]);
		});

		test("should convert the options that have a kind", async () => {
			const { api, calls } = createApi();

			await run(
				[
					"formatThing",
					"--year=2026",
					"--precision",
					"3",
					"--accept",
					"cpf, cnpj",
					"--pad=false",
					"--no-symbol",
					"--target-date",
					"2026-09-07",
					"--code",
					"0012",
				],
				terminal,
				api,
			);

			expect(calls).toEqual([
				[
					{
						year: 2026,
						precision: 3,
						accept: ["cpf", "cnpj"],
						pad: false,
						symbol: false,
						targetDate: new Date(2026, 8, 7),
						code: "0012",
					},
				],
			]);
		});

		test("should convert the positional values of the utilities that have kinds", async () => {
			const { api, calls } = createApi();

			expect(
				await run(
					["addBusinessDays", "2026-09-04", "1", "SP", "--state-code", "SP"],
					terminal,
					api,
				),
			).toEqual({ stdout: "2026-09-08\n", stderr: "", exitCode: 0 });
			expect(calls).toEqual([[new Date(2026, 8, 4), 1, "SP", { stateCode: "SP" }]]);
		});

		test("should report a text option left without a value", async () => {
			const { api, calls } = createApi();

			expect(await run(["formatThing", "1", "--mask"], terminal, api)).toEqual({
				stdout: "",
				stderr: `Option --mask needs a value.\n${USAGE_HINT}`,
				exitCode: 2,
			});
			expect(calls).toEqual([]);
		});
	});

	describe("--json", () => {
		test("should pass the JSON object as the options", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "--json", '{"bankCode":"001","digit":"9"}'], terminal, api);

			expect(calls).toEqual([[{ bankCode: "001", digit: "9" }]]);
		});

		test("should convert the text of the entries that have a kind and keep typed values", async () => {
			const { api, calls } = createApi();

			await run(
				["formatThing", "1", "--json", '{"targetDate":"2026-09-07","year":2026,"pad":"true"}'],
				terminal,
				api,
			);

			expect(calls).toEqual([["1", { targetDate: new Date(2026, 8, 7), year: 2026, pad: true }]]);
		});

		test("should let the options given next to it win", async () => {
			const { api, calls } = createApi();

			await run(
				["formatThing", "--pad", "--json", '{"pad":false,"mask":"a"}', "--mask=b"],
				terminal,
				api,
			);

			expect(calls).toEqual([[{ pad: true, mask: "b" }]]);
		});

		test("should pass no options for an empty JSON object", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "1", "--json", "{}"], terminal, api);

			expect(calls).toEqual([["1"]]);
		});

		test("should keep a __proto__ entry as plain data", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "--json", '{"__proto__":{"pad":true}}'], terminal, api);

			const [[options]] = calls as [[Record<string, unknown>]];

			expect(Object.getPrototypeOf(options)).toBe(Object.prototype);
			expect(Object.hasOwn(options, "__proto__")).toBe(true);
			expect(options["pad"]).toBeUndefined();
		});

		test("should reject anything that is not a JSON object", async () => {
			const { api, calls } = createApi();
			const values = ["nope", "[1]", "null", "1", '"text"', "true", "", "{"];
			const results = await Promise.all(
				values.map((json) => run(["formatThing", `--json=${json}`], terminal, api)),
			);

			expect(results).toHaveLength(8);
			for (const result of results) {
				expect(result).toEqual({
					stdout: "",
					stderr: `Option --json needs a JSON object.\n${USAGE_HINT}`,
					exitCode: 2,
				});
			}
			expect(calls).toEqual([]);
		});
	});

	describe("stdin", () => {
		test("should read the value left out from a piped stdin, trimmed", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "--obfuscate"], pipe("  12345678909\n"), api);

			expect(calls).toEqual([["12345678909", { obfuscate: true }]]);
		});

		test("should convert the value read from stdin like a written one", async () => {
			const { api, calls } = createApi();

			await run(["addBusinessDays"], pipe("2026-09-04\n"), api);

			expect(calls).toEqual([[new Date(2026, 8, 4)]]);
		});

		test("should pass no value when the piped stdin is blank", async () => {
			const { api, calls } = createApi();

			await run(["formatThing"], pipe(" \n"), api);

			expect(calls).toEqual([[]]);
		});

		test("should not read stdin when it is not piped", async () => {
			const { api, calls } = createApi();

			expect(await exitCodeOf(run(["formatThing"], terminal, api))).toBe(0);
			expect(calls).toEqual([[]]);
		});

		test("should not read a piped stdin when a value is given", async () => {
			const { api, calls } = createApi();
			const stdin = { ...terminal, isPiped: true };

			expect(await exitCodeOf(run(["formatThing", "1"], stdin, api))).toBe(0);
			expect(calls).toEqual([["1"]]);
		});

		test("should not read a piped stdin when --json is given", async () => {
			const { api, calls } = createApi();
			const stdin = { ...terminal, isPiped: true };

			expect(await exitCodeOf(run(["formatThing", "--json", '{"a":"b"}'], stdin, api))).toBe(0);
			expect(calls).toEqual([[{ a: "b" }]]);
		});

		test("should not read a piped stdin for a utility that takes no argument", async () => {
			const { api, calls } = createApi();
			const stdin = { ...terminal, isPiped: true };

			expect(await exitCodeOf(run(["generateThing"], stdin, api))).toBe(0);
			expect(calls).toEqual([[]]);
		});

		test("should read every - from stdin, piped or not", async () => {
			const { api, calls } = createApi();

			await run(["formatThing", "SP", "-"], typed("110042490114\n"), api);
			await run(["formatThing", "-", "--json", "{}"], pipe("1"), api);
			await run(["generateThing", "-"], typed(""), api);

			expect(calls).toEqual([["SP", "110042490114"], ["1"], [""]]);
		});

		test("should report a stdin that cannot be read and not call the utility", async () => {
			const { api, calls } = createApi();

			expect(await run(["formatThing", "-"], terminal, api)).toEqual({
				stdout: "",
				stderr: "Error: stdin must not be read\n",
				exitCode: 1,
			});
			expect(calls).toEqual([]);
		});
	});

	describe("results", () => {
		test("should exit with 1 when a validator returns false", async () => {
			expect(await run(["isValidThing", "1"])).toEqual({
				stdout: "false\n",
				stderr: "",
				exitCode: 1,
			});
		});

		test("should exit with 1 when a lookup returns null", async () => {
			expect(await run(["getThing", "1"])).toEqual({ stdout: "null\n", stderr: "", exitCode: 1 });
		});

		test("should print an object as JSON", async () => {
			expect(await run(["getThings"])).toEqual({
				stdout: '[\n  {\n    "code": "001"\n  }\n]\n',
				stderr: "",
				exitCode: 0,
			});
		});

		test("should await a utility that returns a promise", async () => {
			const { api, calls } = createApi();

			expect(await run(["fetchThing", "01001000"], terminal, api)).toEqual({
				stdout: '{\n  "cep": "01001000"\n}\n',
				stderr: "",
				exitCode: 0,
			});
			expect(calls).toEqual([["01001000"]]);
		});

		test("should report a rejected promise on stderr and exit with 1", async () => {
			expect(await run(["rejectThing", "1"])).toEqual({
				stdout: "",
				stderr: "RangeError: service down\n",
				exitCode: 1,
			});
		});

		test("should report a utility that throws on stderr and exit with 1", async () => {
			expect(await run(["throwThing", "1"])).toEqual({
				stdout: "",
				stderr: "TypeError: boom\n",
				exitCode: 1,
			});
			expect(await run(["throwText", "1"])).toEqual({
				stdout: "",
				stderr: "plain text\n",
				exitCode: 1,
			});
		});
	});

	describe("public API", () => {
		test("should validate", async () => {
			expect(await runApi(["isValidCpf", "12345678909"])).toEqual({
				stdout: "true\n",
				stderr: "",
				exitCode: 0,
			});
			expect(await exitCodeOf(runApi(["isValidCpf", "11111111111"]))).toBe(1);
			expect(await apiStdout(["isValidIe", "SP", "110042490114"])).toBe("true\n");
			expect(await apiStdout(["isValidCnpj", "12ABC34501DE35", "--version", "1"])).toBe("false\n");
			expect(await apiStdout(["isValidCnpj", "12ABC34501DE35", "--version", "2"])).toBe("true\n");
		});

		test("should format, with options", async () => {
			expect(await apiStdout(["formatCnpj", "12345678000195"])).toBe("12.345.678/0001-95\n");
			expect(await apiStdout(["formatCnpj", "12345678000195", "--obfuscate"])).toBe(
				"**.345.678/0001-**\n",
			);
			expect(await apiStdout(["formatCurrency", "1234.5", "--no-symbol"])).toBe("1.234,50\n");
			expect(await apiStdout(["formatCpf", "--obfuscate"], pipe("12345678909\n"))).toBe(
				"***.456.789-**\n",
			);
		});

		test("should look up, printing JSON and exiting with 1 for a miss", async () => {
			expect(await runApi(["getBankByCode", "001"])).toEqual({
				stdout: '{\n  "code": "001",\n  "ispb": "00000000",\n  "name": "Banco do Brasil S.A."\n}\n',
				stderr: "",
				exitCode: 0,
			});
			expect(await runApi(["getBankByCode", "99999"])).toEqual({
				stdout: "null\n",
				stderr: "",
				exitCode: 1,
			});
		});

		test("should generate", async () => {
			const { stdout, exitCode } = await runApi(["generateCpf"]);

			expect(/^\d{11}\n$/.test(stdout)).toBe(true);
			expect(exitCode).toBe(0);
			expect(await apiStdout(["generateCnpj", "2"])).toMatch(/^[\dA-Z]{12}\d{2}\n$/);
			expect(await apiStdout(["generateCnpj", "--version=1"])).toMatch(/^\d{14}\n$/);
		});

		test("should take numbers and dates", async () => {
			expect(await apiStdout(["convertNumberToWords", "-5"])).toBe("menos cinco\n");
			expect(await apiStdout(["addBusinessDays", "2026-09-04", "1"])).toBe("2026-09-08\n");
			expect(await apiStdout(["isBusinessDay", "2026-09-07"])).toBe("false\n");
			expect(await apiStdout(["isHoliday", "--target-date", "2026-09-07"])).toBe("true\n");
			expect(await apiStdout(["isHoliday", "--json", '{"targetDate":"2026-09-08"}'])).toBe(
				"false\n",
			);
			const holidays = await apiStdout(["getHolidays", "2026"]);

			expect(holidays.slice(0, 83)).toBe(
				'[\n  {\n    "name": "Ano novo",\n    "date": "2026-01-01",\n    "type": "national"\n  },',
			);
		});

		test("should report the rejection of a network utility without touching the network", async () => {
			const result = await runApi(["getAddressInfoByCep", "123"]);

			expect(result.exitCode).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr.startsWith("GetAddressInfoByCepValidationError: ")).toBe(true);
		});

		test("should list every utility and no error class", async () => {
			const stdout = await apiStdout(["list"]);
			const names = stdout.split("\n");

			expect(names.includes("isValidCpf")).toBe(true);
			expect(names.includes("getCepInfoByAddress")).toBe(true);
			expect(names.includes("GetAddressInfoByCepError")).toBe(false);
			expect(names.at(-1)).toBe("");
		});
	});

	describe("properties", () => {
		test("should never reject and always return text and a known exit code", async () => {
			await fc.assert(
				fc.asyncProperty(fc.array(anyText), async (argv) => {
					const result = await run(argv, pipe(""));

					expect(typeof result.stdout).toBe("string");
					expect(typeof result.stderr).toBe("string");
					expect([0, 1, 2].includes(result.exitCode)).toBe(true);
				}),
			);
		});

		test("should never reject for any arguments handed to a real utility", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.constantFrom(
						"isValidCpf",
						"formatCnpj",
						"getBankByCode",
						"isHoliday",
						"addBusinessDays",
					),
					fc.array(anyText),
					async (name, argv) => {
						const result = await runCli({
							argv: [name, ...argv],
							api: brazilianUtils,
							version: "9.8.7",
							stdin: pipe(""),
						});

						expect([0, 1, 2].includes(result.exitCode)).toBe(true);
					},
				),
			);
		});
	});
});

describe("runCli types", () => {
	test("should take the params and resolve to the result", () => {
		expectTypeOf(runCli).parameter(0).toEqualTypeOf<RunCliParams>();
		expectTypeOf(runCli).returns.toEqualTypeOf<Promise<CliResult>>();
		expectTypeOf<CliResult["exitCode"]>().toEqualTypeOf<0 | 1 | 2>();
		expectTypeOf<RunCliParams["api"]>().toEqualTypeOf<Readonly<Record<string, unknown>>>();
		expectTypeOf(brazilianUtils).toExtend<RunCliParams["api"]>();
	});
});
