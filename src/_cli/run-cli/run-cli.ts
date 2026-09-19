import { coerceCliValue } from "../coerce-cli-value/coerce-cli-value";
import {
	CLI_EXIT_CODES,
	CLI_OPTION_KINDS,
	CLI_PARAMS_UTILITIES,
	CLI_POSITIONAL_KINDS,
	CLI_USAGE,
} from "../constants";
import { parseCliArguments } from "../parse-cli-arguments/parse-cli-arguments";
import { toCliOutput } from "../to-cli-output/to-cli-output";

/** The standard input of the command line, read only when a value has to come from it. */
export type CliStdin = {
	/** Whether stdin is a pipe or a file, so that a value left out may be read from it. */
	isPiped: boolean;
	/** Reads stdin to its end. */
	read: () => Promise<string>;
};

/** Params of `runCli`. */
export type RunCliParams = {
	/** The command line arguments, without the runtime and the script (`process.argv.slice(2)`). */
	argv: readonly string[];
	/** The exports the command line dispatches to: the public API of the package. */
	api: Readonly<Record<string, unknown>>;
	/** The version printed by `--version`. */
	version: string;
	/** The standard input. */
	stdin: CliStdin;
};

/** What a run of the command line writes and how it exits. */
export type CliResult = {
	/** The text for stdout, empty when there is none. */
	stdout: string;
	/** The text for stderr, empty when there is none. */
	stderr: string;
	/** `0` on success, `1` for `false`, `null` or a utility that throws, `2` for a usage error. */
	exitCode: 0 | 1 | 2;
};

type Utility = (...args: unknown[]) => unknown;

const UTILITY_NAME_REGEX = /^[a-z]/;
const STDIN_MARKER = "-";

const isUtility = (value: unknown): value is Utility => typeof value === "function";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	Object.prototype.toString.call(value) === "[object Object]";

const getUtility = (api: Readonly<Record<string, unknown>>, name: string): Utility | null => {
	const value = Object.hasOwn(api, name) && UTILITY_NAME_REGEX.test(name) ? api[name] : null;

	return isUtility(value) ? value : null;
};

const succeed = (stdout: string): CliResult => ({
	stdout,
	stderr: "",
	exitCode: CLI_EXIT_CODES.success,
});

const fail = (message: string): CliResult => ({
	stdout: "",
	stderr: `${message}\n`,
	exitCode: CLI_EXIT_CODES.failure,
});

const rejectUsage = (message: string): CliResult => ({
	stdout: "",
	stderr: `${message}\nRun "brazilian-utils --help" for usage.\n`,
	exitCode: CLI_EXIT_CODES.usage,
});

const parseJsonObject = (text: string | boolean): Record<string, unknown> | null => {
	try {
		const value: unknown = JSON.parse(String(text));

		return isPlainObject(value) ? value : null;
	} catch {
		return null;
	}
};

const describeError = (error: unknown): string =>
	error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const call = async (utility: Utility, read: () => Promise<unknown[]>): Promise<CliResult> => {
	try {
		const args = await read();
		const { text, exitCode } = toCliOutput(await utility(...args));

		return { stdout: `${text}\n`, stderr: "", exitCode };
	} catch (error) {
		return fail(describeError(error));
	}
};

const readValues = async (
	positionals: readonly string[],
	isImplicit: boolean,
	stdin: CliStdin,
): Promise<string[]> => {
	if (!positionals.includes(STDIN_MARKER) && !isImplicit) return [...positionals];

	const text = await stdin.read();
	const input = text.trim();

	if (positionals.length > 0) {
		return positionals.map((value) => (value === STDIN_MARKER ? input : value));
	}

	return input === "" ? [] : [input];
};

const coerceOptions = (options: Record<string, unknown>): Record<string, unknown>[] => {
	const entries = Object.entries(options).map(([key, value]): [string, unknown] => [
		key,
		coerceCliValue(value, Object.hasOwn(CLI_OPTION_KINDS, key) ? CLI_OPTION_KINDS[key] : undefined),
	]);

	return entries.length === 0 ? [] : [Object.fromEntries(entries)];
};

const dispatch = (
	command: string,
	utility: Utility,
	argv: readonly string[],
	stdin: CliStdin,
): Promise<CliResult> => {
	const { positionals, options, error } = parseCliArguments(argv);
	if (error !== null) return Promise.resolve(rejectUsage(error));
	if (options["help"] === true) return Promise.resolve(succeed(CLI_USAGE));

	const { json, ...flags } = options;
	const base = json === undefined ? {} : parseJsonObject(json);
	if (base === null) return Promise.resolve(rejectUsage("Option --json needs a JSON object."));

	const isImplicit =
		positionals.length === 0 &&
		json === undefined &&
		stdin.isPiped &&
		utility.length > 0 &&
		!Object.hasOwn(CLI_PARAMS_UTILITIES, command);
	const kinds = Object.hasOwn(CLI_POSITIONAL_KINDS, command)
		? CLI_POSITIONAL_KINDS[command]
		: undefined;

	return call(utility, async () => {
		const values = await readValues(positionals, isImplicit, stdin);

		return [
			...values.map((value, index) => coerceCliValue(value, kinds?.[index])),
			...coerceOptions({ ...base, ...flags }),
		];
	});
};

const resolveCommand = (
	command: string,
	api: Readonly<Record<string, unknown>>,
	version: string,
): CliResult | Utility => {
	if (command === "") return { stdout: "", stderr: CLI_USAGE, exitCode: CLI_EXIT_CODES.usage };
	if (command === "--help" || command === "-h") return succeed(CLI_USAGE);
	if (command === "--version" || command === "-v") return succeed(`${version}\n`);

	if (command === "list") {
		const names = Object.keys(api).filter((name) => getUtility(api, name) !== null);

		return succeed(`${names.toSorted().join("\n")}\n`);
	}

	return (
		getUtility(api, command) ??
		rejectUsage(`Unknown utility "${command}". Run "brazilian-utils list" to see every utility.`)
	);
};

/**
 * Runs the command line as a pure function: arguments and stdin in, output and exit code out.
 *
 * The command line is a generic dispatcher over the public API. The first argument names an
 * exported utility (an own, callable, lower-camel-case export, so error classes and prototype
 * keys such as `constructor` are not commands); the positional values after it become the
 * utility's arguments, in order, and the `--key value` options, merged over the `--json` object,
 * become its last argument. Values stay text unless `CLI_POSITIONAL_KINDS` or `CLI_OPTION_KINDS`
 * give them a kind. A value written as `-` is read from stdin, and so is a value left out when
 * stdin is piped, the utility takes a value as its first argument (so not one of
 * `CLI_PARAMS_UTILITIES`) and no `--json` was given. A promise returned by the utility
 * (`getAddressInfoByCep`, `getCepInfoByAddress`) is awaited.
 *
 * It never throws: a utility that throws or rejects becomes exit code `1` with the error on
 * stderr, and a command line that cannot be read becomes exit code `2`.
 *
 * @param {RunCliParams} params - The arguments, the API to dispatch to, the version and stdin.
 * @returns {Promise<CliResult>} The text for stdout and stderr, and the exit code.
 *
 * @example
 * ```typescript
 * import * as api from "@brazilian-utils/brazilian-utils";
 *
 * const stdin = { isPiped: false, read: async () => "" };
 *
 * await runCli({ argv: ["formatCpf", "12345678909"], api, version: "2.4.0", stdin });
 * // { stdout: "123.456.789-09\n", stderr: "", exitCode: 0 }
 * await runCli({ argv: ["isValidCpf", "11111111111"], api, version: "2.4.0", stdin });
 * // { stdout: "false\n", stderr: "", exitCode: 1 }
 * await runCli({ argv: ["nope"], api, version: "2.4.0", stdin });
 * // { stdout: "", stderr: 'Unknown utility "nope". ...', exitCode: 2 }
 * ```
 */
export const runCli = ({ argv, api, version, stdin }: RunCliParams): Promise<CliResult> => {
	const [command = "", ...rest] = argv;
	const resolved = resolveCommand(command, api, version);

	return isUtility(resolved) ? dispatch(command, resolved, rest, stdin) : Promise.resolve(resolved);
};
