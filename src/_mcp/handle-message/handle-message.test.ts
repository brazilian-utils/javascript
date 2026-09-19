import * as fc from "fast-check";

import { anyValue } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type McpTool, SERVER_INSTRUCTIONS } from "../constants";
import {
	handleMessage,
	type HandleMessageResult,
	type JsonRpcResponse,
	type McpContext,
	type McpSession,
} from "./handle-message";

const VALUE_INPUT: McpTool["inputSchema"] = {
	type: "object",
	properties: { value: { type: "string" } },
	required: ["value"],
	additionalProperties: false,
};

const TOOLS: McpTool[] = [
	{
		name: "shout",
		description: "Upper cases a text.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
	{
		name: "lookup",
		description: "Looks a text up on the web.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
		network: true,
	},
	{
		name: "missing",
		description: "Has no function.",
		parameters: ["value"],
		inputSchema: VALUE_INPUT,
	},
];

const CONTEXT: McpContext = {
	serverInfo: { name: "brazilian-utils", version: "9.9.9" },
	tools: TOOLS,
	library: {
		shout: (value: string): string => value.toUpperCase(),
		lookup: (value: string): Promise<never> => Promise.reject(new Error(`offline: ${value}`)),
	},
};

const FRESH: McpSession = { protocolVersion: null };
const LEGACY: McpSession = { protocolVersion: "2025-06-18" };

const MODERN_META = {
	"io.modelcontextprotocol/protocolVersion": "2026-07-28",
	"io.modelcontextprotocol/clientInfo": { name: "ExampleClient", version: "1.0.0" },
	"io.modelcontextprotocol/clientCapabilities": {},
};

const SERVER_META = {
	"io.modelcontextprotocol/serverInfo": { name: "brazilian-utils", version: "9.9.9" },
};

const SUPPORTED = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const LISTED_TOOLS = [
	{
		name: "shout",
		description: "Upper cases a text.",
		inputSchema: VALUE_INPUT,
		annotations: { readOnlyHint: true, openWorldHint: false },
	},
	{
		name: "lookup",
		description: "Looks a text up on the web.",
		inputSchema: VALUE_INPUT,
		annotations: { readOnlyHint: true, openWorldHint: true },
	},
	{
		name: "missing",
		description: "Has no function.",
		inputSchema: VALUE_INPUT,
		annotations: { readOnlyHint: true, openWorldHint: false },
	},
];

const respond = (message: unknown, session = FRESH): Promise<JsonRpcResponse | null> =>
	handleMessage(message, session, CONTEXT).response;

const respondAll = (messages: unknown[], session = FRESH): Promise<(JsonRpcResponse | null)[]> =>
	Promise.all(messages.map((message) => respond(message, session)));

const request = (method: string, params?: unknown, id: unknown = 1): Record<string, unknown> => ({
	jsonrpc: "2.0",
	id,
	method,
	...(params === undefined ? {} : { params }),
});

const initialize = (protocolVersion: unknown): Record<string, unknown> =>
	request("initialize", {
		protocolVersion,
		capabilities: {},
		clientInfo: { name: "ExampleClient", version: "1.0.0" },
	});

const initializeAll = async (
	versions: string[],
): Promise<{ sessions: McpSession[]; responses: (JsonRpcResponse | null)[] }> => {
	const handled = versions.map((version) => handleMessage(initialize(version), FRESH, CONTEXT));

	return {
		sessions: handled.map(({ session }) => session),
		responses: await Promise.all(handled.map(({ response }) => response)),
	};
};

const failure = (code: number, message: string, id?: number | string): JsonRpcResponse => ({
	jsonrpc: "2.0",
	...(id === undefined ? {} : { id }),
	error: { code, message },
});

const MISSING_VERSION =
	'Missing _meta["io.modelcontextprotocol/protocolVersion"]: send it with every request (2026-07-28), or open with initialize (2025-11-25 and earlier)';

const MISSING_CAPABILITIES =
	'Missing _meta["io.modelcontextprotocol/clientCapabilities"]: it must be an object, empty when the client has no optional capability';

const anyMethod = fc.oneof(
	fc.constantFrom("initialize", "ping", "server/discover", "tools/list", "tools/call"),
	anyValue,
);

const anyToolName = fc.oneof(fc.constantFrom("shout", "lookup", "missing"), anyValue);

const anyMeta = fc.oneof(anyValue, fc.constant(MODERN_META));

const anyParamsRecord = fc.record(
	{
		name: anyToolName,
		arguments: anyValue,
		protocolVersion: anyValue,
		cursor: anyValue,
		_meta: anyMeta,
	},
	{ requiredKeys: [] },
);

const anyRequestId = fc.oneof(fc.integer(), fc.string());

const anyId = fc.oneof(fc.integer(), fc.string(), fc.constantFrom(null, 1.5));

const anyEnvelope = fc.record(
	{
		jsonrpc: fc.constantFrom("2.0", "1.0", 2),
		id: anyId,
		method: anyMethod,
		params: fc.oneof(anyValue, anyParamsRecord),
	},
	{ requiredKeys: [] },
);

const anyMessage = fc.oneof(anyValue, anyEnvelope);

describe("handleMessage", () => {
	describe("JSON-RPC envelope", () => {
		test("should answer anything that is not an object with an invalid request error without id", async () => {
			const messages = [null, undefined, 1, "ping", true, [], [request("ping")]];
			const expected = failure(-32_600, "The message must be an object");

			expect(await respondAll(messages)).toStrictEqual(messages.map(() => expected));
		});

		test("should answer a wrong jsonrpc version or a method that is not a string, with the id when it is readable", async () => {
			const message = 'Expected jsonrpc "2.0" and a string method';
			const responses = await respondAll([
				{ jsonrpc: "1.0", id: 7, method: "ping" },
				{ id: "a", method: "ping" },
				{ jsonrpc: "2.0", id: 7, method: 5 },
				{ jsonrpc: "2.0", id: null },
				{},
			]);

			expect(responses).toStrictEqual([
				failure(-32_600, message, 7),
				failure(-32_600, message, "a"),
				failure(-32_600, message, 7),
				failure(-32_600, message),
				failure(-32_600, message),
			]);
		});

		test("should stay silent on a response, whatever its shape", async () => {
			const responses = await respondAll([
				{ jsonrpc: "2.0", id: 1, result: {} },
				{ jsonrpc: "2.0", id: 1, error: { code: 1, message: "x" } },
				{ id: 1, result: null },
			]);

			expect(responses).toStrictEqual([null, null, null]);
		});

		test("should stay silent on every notification, known or not", async () => {
			const responses = await respondAll([
				{ jsonrpc: "2.0", method: "notifications/initialized" },
				{ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } },
				{ jsonrpc: "2.0", method: "tools/list" },
				{ jsonrpc: "2.0", method: "unknown", params: [] },
			]);

			expect(responses).toStrictEqual([null, null, null, null]);
		});

		test("should refuse an id that is neither a string nor an integer, without echoing it", async () => {
			const messages = [null, 1.5, {}, [], true].map((id) => request("ping", undefined, id));
			const expected = failure(-32_600, "The id must be a string or an integer");

			expect(await respondAll(messages)).toStrictEqual(messages.map(() => expected));
		});

		test("should accept a string id, an integer id, zero and the empty string", async () => {
			const messages = ["abc", 0, "", -7].map((id) => request("ping", undefined, id));

			expect(await respondAll(messages)).toStrictEqual([
				{ jsonrpc: "2.0", id: "abc", result: {} },
				{ jsonrpc: "2.0", id: 0, result: {} },
				{ jsonrpc: "2.0", id: "", result: {} },
				{ jsonrpc: "2.0", id: -7, result: {} },
			]);
		});

		test("should refuse params that is not an object", async () => {
			const messages = [[], "a", 1, null].map((params) => request("tools/list", params));
			const expected = failure(-32_602, "params must be an object", 1);

			expect(await respondAll(messages)).toStrictEqual(messages.map(() => expected));
		});

		test("should answer an unknown method with method not found, before looking at the version", async () => {
			const responses = await respondAll([
				request("resources/list", { _meta: MODERN_META }),
				request("toString"),
			]);

			expect(responses).toStrictEqual([
				failure(-32_601, "Method not found: resources/list", 1),
				failure(-32_601, "Method not found: toString", 1),
			]);
		});
	});

	describe("initialize (2025-11-25 and earlier)", () => {
		test("should echo every handshake revision the server speaks and open the session under it", async () => {
			const versions = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
			const { sessions, responses } = await initializeAll(versions);

			expect(sessions).toStrictEqual(versions.map((protocolVersion) => ({ protocolVersion })));
			expect(responses).toStrictEqual(
				versions.map((protocolVersion) => ({
					jsonrpc: "2.0",
					id: 1,
					result: {
						protocolVersion,
						capabilities: { tools: {} },
						serverInfo: { name: "brazilian-utils", version: "9.9.9" },
						instructions: SERVER_INSTRUCTIONS,
					},
				})),
			);
		});

		test("should offer the newest handshake revision for a revision it does not speak, the modern one included", async () => {
			const versions = ["1999-01-01", "2026-07-28", "", "toString"];
			const { sessions, responses } = await initializeAll(versions);

			expect(sessions).toStrictEqual(versions.map(() => ({ protocolVersion: "2025-11-25" })));
			expect(responses.map((response) => response?.result?.["protocolVersion"])).toStrictEqual(
				versions.map(() => "2025-11-25"),
			);
		});

		test("should refuse a protocolVersion that is not a string and leave the session as it was", async () => {
			const messages = [
				request("initialize", {}),
				request("initialize", { protocolVersion: 20_251_125 }),
				request("initialize", { protocolVersion: null }),
				request("initialize"),
			];
			const handled = messages.map((message) => handleMessage(message, LEGACY, CONTEXT));
			const responses = await Promise.all(handled.map(({ response }) => response));
			const expected = failure(-32_602, "params.protocolVersion must be a string", 1);

			expect(handled.every(({ session }) => session === LEGACY)).toBe(true);
			expect(responses).toStrictEqual(messages.map(() => expected));
		});

		test("should not touch the session object it is given", () => {
			const session: McpSession = { protocolVersion: null };
			const next = handleMessage(initialize("2025-06-18"), session, CONTEXT).session;

			expect(session).toStrictEqual({ protocolVersion: null });
			expect(next).not.toBe(session);
		});

		test("should keep the session for every other message", () => {
			const messages = [
				request("ping"),
				request("tools/list"),
				request("tools/call", { name: "shout" }),
				request("server/discover"),
				request("nope"),
				{ jsonrpc: "2.0", method: "notifications/initialized" },
				{ jsonrpc: "2.0", id: 1, result: {} },
				{ jsonrpc: "2.0", id: 1.5, method: "ping" },
				{ jsonrpc: "2.0", id: 1, method: "ping", params: [] },
				null,
			];
			const sessions = messages.map((message) => handleMessage(message, LEGACY, CONTEXT).session);

			expect(sessions.every((session) => session === LEGACY)).toBe(true);
		});
	});

	describe("ping", () => {
		test("should answer with an empty result before and after the handshake", async () => {
			expect(await respond(request("ping"))).toStrictEqual({ jsonrpc: "2.0", id: 1, result: {} });
			expect(await respond(request("ping"), LEGACY)).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: {},
			});
		});
	});

	describe("version negotiation", () => {
		test("should refuse a request that neither carries a version nor follows initialize", async () => {
			const messages = [
				request("server/discover"),
				request("tools/list"),
				request("tools/call"),
				request("tools/list", { _meta: {} }),
				request("tools/list", { _meta: "2026-07-28" }),
				request("tools/list", { _meta: { progressToken: "abc" } }),
			];
			const expected = failure(-32_602, MISSING_VERSION, 1);

			expect(await respondAll(messages)).toStrictEqual(messages.map(() => expected));
		});

		test("should answer a version it does not speak with the versions it does", async () => {
			const versions = ["1900-01-01", "2027-01-01", 20_260_728, null, ["2026-07-28"]];
			const messages = versions.map((version) =>
				request("server/discover", {
					_meta: { ...MODERN_META, "io.modelcontextprotocol/protocolVersion": version },
				}),
			);
			const echoed = ["1900-01-01", "2027-01-01", "20260728", "null", "2026-07-28"];

			expect(await respondAll(messages, LEGACY)).toStrictEqual(
				echoed.map((requested) => ({
					jsonrpc: "2.0",
					id: 1,
					error: {
						code: -32_022,
						message: "Unsupported protocol version",
						data: { supported: SUPPORTED, requested },
					},
				})),
			);
		});

		test("should require the client capabilities of a modern request to be an object", async () => {
			const messages = [undefined, null, "none", []].map((capabilities) =>
				request("tools/list", {
					_meta: {
						"io.modelcontextprotocol/protocolVersion": "2026-07-28",
						"io.modelcontextprotocol/clientCapabilities": capabilities,
					},
				}),
			);
			const expected = failure(-32_602, MISSING_CAPABILITIES, 1);

			expect(await respondAll(messages, LEGACY)).toStrictEqual(messages.map(() => expected));
		});

		test("should serve a handshake revision named in _meta in the shape of that revision, session or not", async () => {
			const meta = { "io.modelcontextprotocol/protocolVersion": "2025-11-25" };

			expect(await respond(request("tools/list", { _meta: meta }))).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: { tools: LISTED_TOOLS },
			});
		});
	});

	describe("server/discover (2026-07-28)", () => {
		test("should advertise the versions, the capabilities, the identity and the cache hints", async () => {
			const message = request("server/discover", { _meta: MODERN_META }, "discover-1");

			expect(await respond(message)).toStrictEqual({
				jsonrpc: "2.0",
				id: "discover-1",
				result: {
					resultType: "complete",
					supportedVersions: SUPPORTED,
					capabilities: { tools: {} },
					instructions: SERVER_INSTRUCTIONS,
					ttlMs: 3_600_000,
					cacheScope: "public",
					_meta: SERVER_META,
				},
			});
		});

		test("should not exist for a handshake session or a handshake revision", async () => {
			const meta = { "io.modelcontextprotocol/protocolVersion": "2025-11-25" };
			const expected = failure(
				-32_601,
				"Method not found: server/discover belongs to 2026-07-28",
				1,
			);

			expect(await respond(request("server/discover"), LEGACY)).toStrictEqual(expected);
			expect(await respond(request("server/discover", { _meta: meta }))).toStrictEqual(expected);
		});
	});

	describe("tools/list", () => {
		test("should list the tools in order, in the shape of the handshake revisions after initialize", async () => {
			const expected = { jsonrpc: "2.0", id: 1, result: { tools: LISTED_TOOLS } };

			expect(await respond(request("tools/list"), LEGACY)).toStrictEqual(expected);
			expect(await respond(request("tools/list", {}), LEGACY)).toStrictEqual(expected);
		});

		test("should add the result type, the cache hints and the identity for a modern request, session or not", async () => {
			const message = request("tools/list", { _meta: MODERN_META });
			const expected = {
				jsonrpc: "2.0",
				id: 1,
				result: {
					resultType: "complete",
					tools: LISTED_TOOLS,
					ttlMs: 3_600_000,
					cacheScope: "public",
					_meta: SERVER_META,
				},
			};

			expect(await respond(message)).toStrictEqual(expected);
			expect(await respond(message, LEGACY)).toStrictEqual(expected);
		});

		test("should refuse any cursor, since the list has a single page", async () => {
			const messages = ["next", "", 0, null].map((cursor) => request("tools/list", { cursor }));
			const expected = failure(-32_602, "Invalid cursor: the tool list has a single page", 1);

			expect(await respondAll(messages, LEGACY)).toStrictEqual(messages.map(() => expected));
		});
	});

	describe("tools/call", () => {
		test("should call the tool and answer in the shape of the era", async () => {
			const params = { name: "shout", arguments: { value: "olá" } };
			const modern = request("tools/call", { ...params, _meta: MODERN_META });

			expect(await respond(request("tools/call", params), LEGACY)).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: { content: [{ type: "text", text: '"OLÁ"' }], isError: false },
			});
			expect(await respond(modern)).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: {
					resultType: "complete",
					content: [{ type: "text", text: '"OLÁ"' }],
					isError: false,
					_meta: SERVER_META,
				},
			});
		});

		test("should report a failing tool and bad arguments inside a successful response", async () => {
			const failing = request("tools/call", { name: "lookup", arguments: { value: "x" } });
			const incomplete = request("tools/call", { name: "shout" });

			expect(await respond(failing, LEGACY)).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: { content: [{ type: "text", text: "Error: offline: x" }], isError: true },
			});
			expect(await respond(incomplete, LEGACY)).toStrictEqual({
				jsonrpc: "2.0",
				id: 1,
				result: { content: [{ type: "text", text: "arguments.value is required" }], isError: true },
			});
		});

		test("should answer a name that is not a string with invalid params", async () => {
			const messages = [undefined, 1, null, ["shout"]].map((name) =>
				request("tools/call", { name }),
			);
			const expected = failure(-32_602, "params.name must be a string", 1);

			expect(await respondAll(messages, LEGACY)).toStrictEqual(messages.map(() => expected));
		});

		test("should answer an unknown tool with invalid params", async () => {
			const names = ["SHOUT", "", "toString", "__proto__"];
			const messages = names.map((name) => request("tools/call", { name }));

			expect(await respondAll(messages, LEGACY)).toStrictEqual(
				names.map((name) => failure(-32_602, `Unknown tool: ${name}`, 1)),
			);
		});

		test("should refuse arguments that is not an object", async () => {
			const messages = [[], "value", 1, null].map((args) =>
				request("tools/call", { name: "shout", arguments: args }),
			);
			const expected = failure(-32_602, "params.arguments must be an object", 1);

			expect(await respondAll(messages, LEGACY)).toStrictEqual(messages.map(() => expected));
		});

		test("should answer a tool the library does not implement with an internal error", async () => {
			const message = request("tools/call", { name: "missing", arguments: { value: "" } });

			expect(await respond(message, LEGACY)).toStrictEqual(
				failure(-32_603, "TypeError: The library has no function named missing", 1),
			);
		});
	});

	describe("properties", () => {
		test("should never throw nor reject, and answer only with JSON-RPC 2.0 responses", async () => {
			await fc.assert(
				fc.asyncProperty(anyMessage, fc.constantFrom(FRESH, LEGACY), async (message, session) => {
					const response = await respond(message, session);

					if (response !== null) {
						expect(response.jsonrpc).toBe("2.0");
						expect(Object.hasOwn(response, "result")).toBe(!Object.hasOwn(response, "error"));
						expect(typeof JSON.stringify(response)).toBe("string");
					}
				}),
			);
		});

		test("should echo the id of every request it answers", async () => {
			await fc.assert(
				fc.asyncProperty(anyRequestId, async (id) => {
					const responses = await respondAll([
						request("ping", undefined, id),
						request("nope", undefined, id),
					]);

					expect(responses.map((response) => response?.id)).toStrictEqual([id, id]);
				}),
			);
		});
	});
});

describe("handleMessage types", () => {
	test("should take a message, a session and a context and return the next session with the response", () => {
		expectTypeOf(handleMessage).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(handleMessage).parameter(1).toEqualTypeOf<McpSession>();
		expectTypeOf(handleMessage).parameter(2).toEqualTypeOf<McpContext>();
		expectTypeOf(handleMessage).returns.toEqualTypeOf<HandleMessageResult>();
		expectTypeOf<HandleMessageResult["response"]>().toEqualTypeOf<
			Promise<JsonRpcResponse | null>
		>();
		expectTypeOf<McpSession["protocolVersion"]>().toEqualTypeOf<string | null>();
	});
});
