import { type McpJsonSchema, type McpJsonSchemaType } from "../constants";

/** Outcome of `parseToolArguments`: the value ready for the library, or why it was refused. */
export type ParseToolArgumentsResult<Value = unknown> =
	| {
			/** The value satisfies the schema. */
			ok: true;
			/** A copy of the value with every `format: "date"` string turned into a local `Date`. */
			value: Value;
	  }
	| {
			/** The value breaks the schema. */
			ok: false;
			/** What is wrong and where, written for the model that has to fix the call. */
			message: string;
	  };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const TYPE_CHECKS: Record<McpJsonSchemaType, (value: unknown) => boolean> = {
	array: (value) => Array.isArray(value),
	boolean: (value) => typeof value === "boolean",
	integer: (value) => Number.isInteger(value),
	number: (value) => Number.isFinite(value),
	object: isPlainObject,
	string: (value) => typeof value === "string",
};

const parseDate = (value: string, path: string): ParseToolArgumentsResult => {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year, month - 1, day);

	if (!DATE_PATTERN.test(value) || date.getFullYear() !== year || date.getDate() !== day) {
		return { ok: false, message: `${path} must be a calendar date written as YYYY-MM-DD` };
	}

	return { ok: true, value: date };
};

type ParseValue = (schema: McpJsonSchema, value: unknown, path: string) => ParseToolArgumentsResult;

const parseObject = (
	schema: McpJsonSchema,
	value: Record<string, unknown>,
	path: string,
	parseValue: ParseValue,
): ParseToolArgumentsResult => {
	const properties = schema.properties ?? {};
	const missing = (schema.required ?? []).find((key) => !Object.hasOwn(value, key));
	if (missing !== undefined) return { ok: false, message: `${path}.${missing} is required` };

	const entries: [string, unknown][] = [];
	for (const [key, item] of Object.entries(value)) {
		if (!Object.hasOwn(properties, key)) {
			const known = Object.keys(properties).join(", ");
			return { ok: false, message: `${path}.${key} is not accepted; known properties: ${known}` };
		}

		const parsed = parseValue(properties[key], item, `${path}.${key}`);
		if (!parsed.ok) return parsed;
		entries.push([key, parsed.value]);
	}

	return { ok: true, value: Object.fromEntries(entries) };
};

const parseArray = (
	schema: McpJsonSchema,
	value: unknown[],
	path: string,
	parseValue: ParseValue,
): ParseToolArgumentsResult => {
	const items: unknown[] = [];
	for (const [index, item] of value.entries()) {
		const parsed = parseValue(schema, item, `${path}[${index}]`);
		if (!parsed.ok) return parsed;
		items.push(parsed.value);
	}

	return { ok: true, value: items };
};

/**
 * Checks a `tools/call` value against the JSON Schema subset the tool table is written in
 * (`type`, `enum`, `properties`, `required`, `items` and `format: "date"`) and prepares it for the
 * library. Objects are closed: a property the schema does not list is refused, which is what
 * `additionalProperties: false` tells the client, and the copy is built from own properties only,
 * so a `__proto__` key in the JSON never reaches a prototype. A `format: "date"` string becomes a
 * `Date` at local midnight, the calendar convention the date utilities read.
 *
 * @param {McpJsonSchema} schema - The schema the value has to satisfy.
 * @param {unknown} value - The value received from the client.
 * @param {string} path - Where the value sits, used as the prefix of the error message.
 * @returns {ParseToolArgumentsResult} The prepared value, or the first problem found.
 *
 * @example
 * ```typescript
 * parseToolArguments({ type: "string" }, "abc", "arguments.value"); // { ok: true, value: "abc" }
 * parseToolArguments({ type: "string" }, 1, "arguments.value");
 * // { ok: false, message: "arguments.value must be of type string" }
 * ```
 *
 * @see Official: https://json-schema.org/draft/2020-12/json-schema-validation
 */
export function parseToolArguments(
	schema: McpJsonSchema,
	value: Record<string, unknown>,
	path: string,
): ParseToolArgumentsResult<Record<string, unknown>>;
export function parseToolArguments(
	schema: McpJsonSchema,
	value: unknown,
	path: string,
): ParseToolArgumentsResult;
export function parseToolArguments(
	schema: McpJsonSchema,
	value: unknown,
	path: string,
): ParseToolArgumentsResult {
	if (!TYPE_CHECKS[schema.type](value)) {
		return { ok: false, message: `${path} must be of type ${schema.type}` };
	}

	if (schema.enum !== undefined && !schema.enum.some((item) => item === value)) {
		const allowed = schema.enum.map((item) => JSON.stringify(item)).join(", ");
		return { ok: false, message: `${path} must be one of ${allowed}` };
	}

	if (schema.format === "date") return parseDate(String(value), path);
	if (isPlainObject(value)) return parseObject(schema, value, path, parseToolArguments);
	if (Array.isArray(value) && schema.items !== undefined) {
		return parseArray(schema.items, value, path, parseToolArguments);
	}

	return { ok: true, value };
}
