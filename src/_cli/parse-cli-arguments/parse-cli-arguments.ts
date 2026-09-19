import { CLI_OPTION_KINDS } from "../constants";

/** The command line of a utility, split into its positional values and its options. */
export type ParsedCliArguments = {
	/** The positional values, in the order they were written. */
	positionals: string[];
	/** The options, keyed in camelCase: text for `--key value`, a boolean for a flag. */
	options: Record<string, string | boolean>;
	/** Why the command line cannot be read, or `null` when it can. */
	error: string | null;
};

const OPTION_PREFIX = "--";
const NEGATION_PREFIX = "no-";
const KEBAB_REGEX = /-([a-z])/g;

const toCamelCase = (name: string): string =>
	name.replaceAll(KEBAB_REGEX, (_match, letter: string) => letter.toUpperCase());

const isFlag = (name: string): boolean =>
	name === "help" ||
	(Object.hasOwn(CLI_OPTION_KINDS, name) && CLI_OPTION_KINDS[name] === "boolean");

const toEntry = (body: string): [string, string | boolean] | string => {
	const separator = body.indexOf("=");
	const name = toCamelCase(separator === -1 ? body : body.slice(0, separator));
	const negated = toCamelCase(body.slice(NEGATION_PREFIX.length));

	if (separator !== -1) return [name, body.slice(separator + 1)];
	if (isFlag(name)) return [name, true];
	if (body.startsWith(NEGATION_PREFIX) && isFlag(negated)) return [negated, false];
	return name;
};

/**
 * Splits the arguments that follow the utility name into positional values and options.
 *
 * `--key value` and `--key=value` are text options, `--flag` and `--no-flag` set a boolean option
 * (the keys listed as `"boolean"` in `CLI_OPTION_KINDS`, plus `help`) to `true` or `false`, and
 * `--kebab-case` names are read as `camelCase`. Everything after a bare `--` is positional, and
 * so is anything that does not start with `--`, which covers negative numbers and the `-` that
 * stands for stdin. Nothing is converted here: values stay text.
 *
 * @param {readonly string[]} argv - The arguments after the utility name.
 * @returns {ParsedCliArguments} The positional values and the options, or the reason the command line cannot be read.
 *
 * @example
 * ```typescript
 * parseCliArguments(["12345678000195", "--obfuscate"]);
 * // { positionals: ["12345678000195"], options: { obfuscate: true }, error: null }
 * parseCliArguments(["--year", "2026", "--state-code=SP", "--no-pad"]);
 * // { positionals: [], options: { year: "2026", stateCode: "SP", pad: false }, error: null }
 * parseCliArguments(["--year"]);
 * // { positionals: [], options: {}, error: "Option --year needs a value." }
 * ```
 */
export const parseCliArguments = (argv: readonly string[]): ParsedCliArguments => {
	const positionals: string[] = [];
	const entries: [string, string | boolean][] = [];
	let pending: string | null = null;
	let isLiteral = false;

	for (const token of argv) {
		const isOption = !isLiteral && token.startsWith(OPTION_PREFIX);

		if (pending !== null) {
			if (isOption) break;
			entries.push([pending, token]);
			pending = null;
		} else if (isOption && token === OPTION_PREFIX) {
			isLiteral = true;
		} else if (isOption) {
			const entry = toEntry(token.slice(OPTION_PREFIX.length));

			if (typeof entry === "string") pending = entry;
			else entries.push(entry);
		} else {
			positionals.push(token);
		}
	}

	return {
		positionals,
		options: Object.fromEntries(entries),
		error: pending === null ? null : `Option --${pending} needs a value.`,
	};
};
