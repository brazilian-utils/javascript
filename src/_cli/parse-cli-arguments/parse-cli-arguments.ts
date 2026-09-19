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

type Token = { option: [string, string | boolean] } | { pending: string } | { error: string };

const toToken = (body: string): Token => {
	const separator = body.indexOf("=");
	const written = separator === -1 ? body : body.slice(0, separator);
	const name = toCamelCase(written);
	const negated = toCamelCase(written.slice(NEGATION_PREFIX.length));
	const isNegated = written.startsWith(NEGATION_PREFIX) && isFlag(negated);

	if (separator === -1) {
		if (isFlag(name)) return { option: [name, true] };
		if (isNegated) return { option: [negated, false] };
		return { pending: name };
	}

	const value = body.slice(separator + 1);

	if (isNegated) return { error: `Option --${written} does not take a value.` };
	if (!isFlag(name)) return { option: [name, value] };
	if (value === "true" || value === "false") return { option: [name, value === "true"] };
	return { error: `Option --${written} needs true or false.` };
};

/**
 * Splits the arguments that follow the utility name into positional values and options.
 *
 * `--key value` and `--key=value` are text options, `--flag` and `--no-flag` set a boolean option
 * (the keys listed as `"boolean"` in `CLI_OPTION_KINDS`, plus `help`) to `true` or `false`, and
 * `--kebab-case` names are read as `camelCase`. Everything after a bare `--` is positional, and
 * so is anything that does not start with `--`, which covers negative numbers and the `-` that
 * stands for stdin. Apart from the booleans, nothing is converted here: values stay text.
 *
 * A boolean option spelled `--flag=value` takes only `true` or `false`, and `--no-flag` takes no
 * value at all. Anything else is a usage error rather than an option that looks set and holds
 * text, which any non-empty value would make true.
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
 * parseCliArguments(["--pad=yes"]);
 * // { positionals: [], options: {}, error: "Option --pad needs true or false." }
 * ```
 */
export const parseCliArguments = (argv: readonly string[]): ParsedCliArguments => {
	const positionals: string[] = [];
	const entries: [string, string | boolean][] = [];
	let pending: string | null = null;
	let rejected: string | null = null;
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
			const parsed = toToken(token.slice(OPTION_PREFIX.length));

			if ("error" in parsed) {
				rejected = parsed.error;
				break;
			}
			if ("pending" in parsed) pending = parsed.pending;
			else entries.push(parsed.option);
		} else {
			positionals.push(token);
		}
	}

	return {
		positionals,
		options: Object.fromEntries(entries),
		error: rejected ?? (pending === null ? null : `Option --${pending} needs a value.`),
	};
};
