import type * as api from "../index";

/** How the command line turns the text of an argument into the value a utility expects. */
export type CliValueKind = "boolean" | "date" | "list" | "number";

/** The kind of a positional argument: `"text"` holds the place of one that stays a string. */
export type CliPositionalKind = CliValueKind | "text";

type Api = typeof api;

type Callable = (...args: never[]) => unknown;

type ObjectOf<Value> = Value extends Date | readonly unknown[]
	? never
	: Value extends object
		? Value
		: never;

type KindOf<Value> = [Value] extends [never]
	? never
	: [Value] extends [boolean]
		? "boolean"
		: [Value] extends [number]
			? "number"
			: [Value] extends [Date]
				? "date"
				: [Value] extends [readonly unknown[]]
					? "list"
					: never;

type ArgumentsOf<Name extends keyof Api> = Name extends unknown
	? Api[Name] extends Callable
		? Required<Parameters<Api[Name]>>
		: never
	: never;

type ObjectArgument = ObjectOf<ArgumentsOf<keyof Api>[number]>;

type KeysOf<Value> = Value extends unknown ? keyof Value : never;

type ValueOf<Value, Key> = Value extends unknown
	? Key extends keyof Value
		? NonNullable<Value[Key]>
		: never
	: never;

type PositionalKindsOf<Arguments extends unknown[]> = Arguments extends [infer Head, ...infer Rest]
	? [Exclude<Head, ObjectOf<Head>>] extends [never]
		? []
		: [
				[KindOf<Exclude<Head, ObjectOf<Head>>>] extends [never]
					? "text"
					: KindOf<Exclude<Head, ObjectOf<Head>>>,
				...PositionalKindsOf<Rest>,
			]
	: [];

type HasKind<Kinds extends unknown[]> = [Exclude<Kinds[number], "text">] extends [never]
	? false
	: true;

type CliOptionKinds = {
	[
		Key in KeysOf<ObjectArgument> as [KindOf<ValueOf<ObjectArgument, Key>>] extends [never]
			? never
			: Key
	]: KindOf<ValueOf<ObjectArgument, Key>>;
};

type CliPositionalKinds = {
	[
		Name in keyof Api as HasKind<PositionalKindsOf<ArgumentsOf<Name>>> extends true ? Name : never
	]: PositionalKindsOf<ArgumentsOf<Name>>;
};

type CliParamsUtilities = {
	[
		Name in keyof Api as Name extends Capitalize<Name & string>
			? never
			: ArgumentsOf<Name> extends [unknown, ...unknown[]]
				? PositionalKindsOf<ArgumentsOf<Name>> extends []
					? Name
					: never
				: never
	]: true;
};

/**
 * Exit codes of the command line: a negative answer (`false`, `null` or a utility that throws) is
 * told apart from a call that could not be made at all.
 */
export const CLI_EXIT_CODES = {
	success: 0,
	failure: 1,
	usage: 2,
} as const;

/**
 * Every option key of the public API whose value is not a string. The type is derived from the
 * signatures exported by `src/index.ts`, so an option added to a utility without its entry here
 * fails `npm run check`.
 */
export const CLI_OPTION_KINDS: Readonly<Record<string, CliValueKind>> = {
	accept: "list",
	amount: "number",
	branch: "number",
	court: "number",
	includeLegacy: "boolean",
	includeOptional: "boolean",
	lowerCaseWords: "list",
	obfuscate: "boolean",
	pad: "boolean",
	precision: "number",
	providers: "list",
	referenceDate: "date",
	symbol: "boolean",
	targetDate: "date",
	upperCaseWords: "list",
	version: "number",
	weekday: "boolean",
	year: "number",
} satisfies CliOptionKinds;

/**
 * Every utility with a positional argument that is not a string, checked against the signatures
 * the same way. `getHolidays` is listed by hand: its `year` overload is hidden from the derived
 * type by the params overload declared after it.
 */
export const CLI_POSITIONAL_KINDS: Readonly<Record<string, readonly CliPositionalKind[]>> = {
	addBusinessDays: ["date", "number"],
	convertCurrencyToWords: ["number"],
	convertNumberToWords: ["number"],
	differenceInBusinessDays: ["date", "date"],
	generateCNPJ: ["number"],
	generateCnpj: ["number"],
	getHolidays: ["number"],
	isBusinessDay: ["date"],
	subBusinessDays: ["date", "number"],
} satisfies CliPositionalKinds & Record<string, CliPositionalKind[]>;

/**
 * Every utility whose first argument is an options or params object, derived from the signatures
 * the same way. Their values are written as options, so stdin is only read for them when a `-`
 * asks for it: a command run with stdin attached to a file or a pipe, as a shell script is, must
 * not turn that text into a first argument. `getHolidays` is here through its params overload,
 * and still takes a year as a written positional value.
 */
export const CLI_PARAMS_UTILITIES: Readonly<Record<string, true>> = {
	generateBoleto: true,
	generatePixPayload: true,
	generateProcessoJuridico: true,
	getCepInfoByAddress: true,
	getHolidays: true,
	getLegalNatures: true,
	getMunicipality: true,
	isHoliday: true,
	isValidBankAccount: true,
	isValidRegistroProfissional: true,
} satisfies CliParamsUtilities;

/** The text printed by `--help`. */
export const CLI_USAGE = `Usage: brazilian-utils <utility> [value...] [--option value] [--flag] [--json '<object>']

Runs any utility exported by @brazilian-utils/brazilian-utils.

  brazilian-utils isValidCpf 12345678909
  brazilian-utils formatCnpj 12345678000195 --obfuscate
  brazilian-utils getBankByCode 001
  brazilian-utils isValidIe SP 110042490114
  brazilian-utils getHolidays --year 2026 --state-code SP
  brazilian-utils isValidBankAccount --json '{"bankCode":"001","agency":"1234","account":"12345678","digit":"9"}'
  echo 01001000 | brazilian-utils getAddressInfoByCep

Arguments:
  value              Positional arguments of the utility, in order. "-" reads the value from
                     stdin, and so does leaving the value out while stdin is a pipe or a file,
                     unless the first argument of the utility is an options object.
  --key value        An entry of the options (or params) object. --key=value and --kebab-case
                     are accepted too.
  --flag, --no-flag  A boolean option set to true or to false.
  --json '<object>'  The options (or params) object as JSON. Options given next to it win.
  --                 Ends the options: everything after it is a positional value.

Dates are written YYYY-MM-DD and mean that local calendar day. Lists are comma separated.

Commands:
  list               Prints the name of every utility.
  --help, -h         Prints this help.
  --version, -v      Prints the version of the package.

Output: strings and numbers as they are, anything else as JSON.
Exit codes: 0 on success, 1 when the answer is negative (false, null or the empty string a
formatter answers with) or the utility throws, 2 when the command line itself is wrong.

Documentation: https://brazilian-utils.com.br
`;
