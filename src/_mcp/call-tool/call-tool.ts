import { type McpTool } from "../constants";
import { parseToolArguments } from "../parse-tool-arguments/parse-tool-arguments";
import { toJsonValue } from "../to-json-value/to-json-value";

/** The functions a tool may call, keyed by name: the namespace of the library entry point. */
export type McpLibrary = Readonly<Record<string, unknown>>;

/** The `content` and `isError` members of a `tools/call` result. */
export type CallToolResult = {
	/** A single text block: the JSON of the library result, or the error message. */
	content: [{ type: "text"; text: string }];
	/** Whether the call failed in a way the model can act on. */
	isError: boolean;
};

/** What `callTool` needs: the tool, the arguments the client sent and the library to call. */
export type CallToolParams = {
	/** The tool being called. */
	tool: McpTool;
	/** The `arguments` object of the `tools/call` request. */
	args: Record<string, unknown>;
	/** The library the tool name is looked up in. */
	library: McpLibrary;
};

const toResult = (text: string, isError: boolean): CallToolResult => ({
	content: [{ type: "text", text }],
	isError,
});

/**
 * Runs one tool: checks the arguments against the tool's input schema, calls the library function
 * of the same name and writes its result as JSON. Arguments that break the schema and an error
 * the function throws or rejects with (the CEP lookups do) are tool execution errors, answered
 * with `isError: true` and a message the model can act on. A value the library refuses by
 * returning `false`, `""` or `null` is an ordinary result.
 *
 * @param {CallToolParams} params - The tool, its arguments and the library.
 * @returns {Promise<CallToolResult>} The tool result. Rejects only when the library has no
 * function named after the tool, which is a server fault and not a tool error.
 *
 * @example
 * ```typescript
 * await callTool({ tool, args: { value: "111.444.777-35" }, library });
 * // { content: [{ type: "text", text: "true" }], isError: false }
 * ```
 *
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling
 */
export const callTool = async ({
	tool,
	args,
	library,
}: CallToolParams): Promise<CallToolResult> => {
	const target: unknown = Object.hasOwn(library, tool.name) ? library[tool.name] : undefined;
	if (typeof target !== "function") {
		throw new TypeError(`The library has no function named ${tool.name}`);
	}

	const parsed = parseToolArguments(tool.inputSchema, args, "arguments");
	if (!parsed.ok) return toResult(parsed.message, true);

	const { value } = parsed;
	const positional =
		tool.parameters === "object" ? [value] : tool.parameters.map((name) => value[name]);

	try {
		const result: unknown = await Reflect.apply(target, undefined, positional);
		return toResult(JSON.stringify(toJsonValue(result)), false);
	} catch (error) {
		return toResult(String(error), true);
	}
};
