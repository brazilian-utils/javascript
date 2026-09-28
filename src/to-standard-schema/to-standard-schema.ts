/**
 * The Standard Schema interface, version 1: what form libraries, routers and API frameworks accept
 * as a validator without knowing which library produced it. The types below are the ones the
 * specification publishes (`@standard-schema/spec`, MIT), written as `type` aliases (optional
 * properties without the redundant `| undefined`) and copied here, as the specification intends, so
 * the package keeps its zero runtime dependencies.
 *
 * @see Official: https://standardschema.dev
 * @see Official: https://github.com/standard-schema/standard-schema/blob/main/packages/spec/src/index.ts
 */
export type StandardSchemaV1<Input = unknown, Output = Input> = {
	/** The Standard Schema properties. */
	readonly "~standard": StandardSchemaV1Props<Input, Output>;
};

/** The Standard Schema properties. */
export type StandardSchemaV1Props<Input = unknown, Output = Input> = {
	/** The version number of the standard. */
	readonly version: 1;
	/** The vendor name of the schema library. */
	readonly vendor: string;
	/** Validates unknown input values. */
	readonly validate: (
		value: unknown,
		options?: StandardSchemaV1Options,
	) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
	/** Inferred types associated with the schema. */
	readonly types?: StandardSchemaV1Types<Input, Output>;
};

/** The result of the validate function. */
export type StandardSchemaV1Result<Output> =
	| StandardSchemaV1SuccessResult<Output>
	| StandardSchemaV1FailureResult;

/** The result if validation succeeds. */
export type StandardSchemaV1SuccessResult<Output> = {
	/** The typed output value. */
	readonly value: Output;
	/** A falsy value for `issues` indicates success. */
	readonly issues?: undefined;
};

/** The options of the validate function. */
export type StandardSchemaV1Options = {
	/** Explicit support for additional vendor-specific parameters, if needed. */
	readonly libraryOptions?: Record<string, unknown>;
};

/** The result if validation fails. */
export type StandardSchemaV1FailureResult = {
	/** The issues of failed validation. */
	readonly issues: readonly StandardSchemaV1Issue[];
};

/** An issue of a failed validation. */
export type StandardSchemaV1Issue = {
	/** The error message of the issue. */
	readonly message: string;
	/** The path of the issue, if any. */
	readonly path?: readonly (PropertyKey | StandardSchemaV1PathSegment)[];
};

/** A path segment of an issue. */
export type StandardSchemaV1PathSegment = {
	/** The key representing a path segment. */
	readonly key: PropertyKey;
};

/** The types a schema carries for inference. */
export type StandardSchemaV1Types<Input = unknown, Output = Input> = {
	/** The input type of the schema. */
	readonly input: Input;
	/** The output type of the schema. */
	readonly output: Output;
};

/** Options of `toStandardSchema`. */
export type ToStandardSchemaOptions<Options = undefined> = {
	/** The options handed to the validator on every call, e.g. `{ version: 2 }` for `isValidCnpj`. */
	options?: Options;
	/** The message of the issue reported for an invalid value (default: `"Invalid value"`). */
	message?: string;
};

const VENDOR = "brazilian-utils";

const DEFAULT_MESSAGE = "Invalid value";

/**
 * Wraps one of the `isValid*` utilities (or any function of the same shape) in a Standard Schema,
 * so it plugs into whatever accepts the interface: react-hook-form's `standardSchemaResolver`,
 * TanStack Form, tRPC, Hono and the rest, next to schemas made with Zod, Valibot or ArkType.
 *
 * The schema validates synchronously and does not transform: a valid value is returned as it was
 * given, and an invalid one yields a single issue. It never throws, like the validators it wraps:
 * a first argument that is not a function gives a schema that rejects everything, and a `message`
 * that is not a string falls back to the default.
 *
 * Validators that take a single object (`isValidIe`, `isValidBankAccount`,
 * `isValidRegistroProfissional`) work the same way, the object being the value under validation;
 * wrap the overloaded `isValidIe` in an arrow function so its object form is the one picked:
 * `toStandardSchema((params: IsValidIeParams) => isValidIe(params))`.
 *
 * @param {(value: Value, options?: Options) => boolean} validate - The validator to wrap.
 * @param {ToStandardSchemaOptions<Options>} [config] - Optional configuration.
 * @param {Options} [config.options] - The options handed to the validator on every call.
 * @param {string} [config.message] - The message of the issue reported for an invalid value.
 * @returns {StandardSchemaV1<Value>} A Standard Schema whose input and output are the validator's value.
 *
 * @example
 * ```typescript
 * const cpf = toStandardSchema(isValidCpf, { message: "CPF inválido" });
 *
 * cpf["~standard"].validate("123.456.789-09"); // { value: "123.456.789-09" }
 * cpf["~standard"].validate("123"); // { issues: [{ message: "CPF inválido" }] }
 *
 * const cnpj = toStandardSchema(isValidCnpj, { options: { version: 2 } });
 * ```
 *
 * @see Official: https://standardschema.dev
 */
export const toStandardSchema = <Value, Options = undefined>(
	validate: (value: Value, options?: Options) => boolean,
	config?: ToStandardSchemaOptions<Options>,
): StandardSchemaV1<Value> => {
	const message = typeof config?.message === "string" ? config.message : DEFAULT_MESSAGE;

	// A predicate, so that an accepted `unknown` is returned as the validator's value type.
	const isValue = (value: unknown): value is Value =>
		typeof validate === "function" &&
		Reflect.apply(validate, undefined, [value, config?.options]) === true;

	return {
		"~standard": {
			version: 1,
			vendor: VENDOR,
			validate: (value) => (isValue(value) ? { value } : { issues: [{ message }] }),
		},
	};
};
