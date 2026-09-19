import { callTool, type McpLibrary } from "../call-tool/call-tool";
import {
	CACHE_TTL_MS,
	ERROR_CODES,
	LEGACY_PROTOCOL_VERSIONS,
	type McpTool,
	META_CLIENT_CAPABILITIES,
	META_PROTOCOL_VERSION,
	META_SERVER_INFO,
	MODERN_PROTOCOL_VERSION,
	SERVER_INSTRUCTIONS,
	SUPPORTED_PROTOCOL_VERSIONS,
} from "../constants";

/** The `Implementation` object the server identifies itself with. */
type McpServerInfo = {
	/** The programmatic name of the server. */
	name: string;
	/** The version of the package the server ships in. */
	version: string;
};

/** What the server serves, injected so the handler stays a pure function. */
export type McpContext = {
	/** The identity reported by `initialize`, `server/discover` and every modern result. */
	serverInfo: McpServerInfo;
	/** The tools `tools/list` answers with, in order. */
	tools: readonly McpTool[];
	/** The library the tools call into. */
	library: McpLibrary;
};

/** The state of one stdio connection. A modern, per request `_meta` exchange never reads it. */
export type McpSession = {
	/** The legacy revision agreed by `initialize`, or `null` before the handshake. */
	protocolVersion: string | null;
};

/** A JSON-RPC 2.0 response. `id` is absent when the request id could not be read. */
export type JsonRpcResponse = {
	/** The JSON-RPC version, always `"2.0"`. */
	jsonrpc: "2.0";
	/** The id of the request being answered. */
	id?: string | number;
	/** The result of a successful request. */
	result?: Record<string, unknown>;
	/** The error of a failed request. */
	error?: {
		/** The JSON-RPC or MCP error code. */
		code: number;
		/** A short description of the error. */
		message: string;
		/** Additional information about the error. */
		data?: unknown;
	};
};

/** What `handleMessage` answers with. */
export type HandleMessageResult = {
	/** The session after the message, a new object when `initialize` changed it. */
	session: McpSession;
	/** The response to write, or `null` when the message gets none (a notification, a response). */
	response: Promise<JsonRpcResponse | null>;
};

type RequestId = string | number;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isRequestId = (value: unknown): value is RequestId =>
	typeof value === "string" || Number.isInteger(value);

const toError = (
	id: RequestId | undefined,
	code: number,
	message: string,
	data?: unknown,
): JsonRpcResponse => ({
	jsonrpc: "2.0",
	...(id === undefined ? {} : { id }),
	error: { code, message, ...(data === undefined ? {} : { data }) },
});

const toResult = (id: RequestId, result: Record<string, unknown>): JsonRpcResponse => ({
	jsonrpc: "2.0",
	id,
	result,
});

const resolveEra = (
	id: RequestId,
	params: Record<string, unknown>,
	session: McpSession,
): boolean | JsonRpcResponse => {
	const meta = isRecord(params["_meta"]) ? params["_meta"] : {};

	if (!Object.hasOwn(meta, META_PROTOCOL_VERSION)) {
		if (session.protocolVersion !== null) return false;

		return toError(
			id,
			ERROR_CODES.invalidParams,
			`Missing _meta["${META_PROTOCOL_VERSION}"]: send it with every request (${MODERN_PROTOCOL_VERSION}), or open with initialize (${LEGACY_PROTOCOL_VERSIONS[0]} and earlier)`,
		);
	}

	const requested = meta[META_PROTOCOL_VERSION];
	const version = SUPPORTED_PROTOCOL_VERSIONS.find((supported) => supported === requested);
	if (version === undefined) {
		return toError(id, ERROR_CODES.unsupportedProtocolVersion, "Unsupported protocol version", {
			supported: SUPPORTED_PROTOCOL_VERSIONS,
			requested: String(requested),
		});
	}

	if (version !== MODERN_PROTOCOL_VERSION) return false;
	if (isRecord(meta[META_CLIENT_CAPABILITIES])) return true;

	return toError(
		id,
		ERROR_CODES.invalidParams,
		`Missing _meta["${META_CLIENT_CAPABILITIES}"]: it must be an object, empty when the client has no optional capability`,
	);
};

const complete = (
	result: Record<string, unknown>,
	modern: boolean,
	context: McpContext,
): Record<string, unknown> =>
	modern
		? { resultType: "complete", ...result, _meta: { [META_SERVER_INFO]: context.serverInfo } }
		: result;

const cacheable = (
	result: Record<string, unknown>,
	modern: boolean,
	context: McpContext,
): Record<string, unknown> =>
	complete(
		modern ? { ...result, ttlMs: CACHE_TTL_MS, cacheScope: "public" } : result,
		modern,
		context,
	);

const initialize = (
	id: RequestId,
	params: Record<string, unknown>,
	context: McpContext,
): { session: McpSession; response: JsonRpcResponse } | { response: JsonRpcResponse } => {
	const requested = params["protocolVersion"];
	if (typeof requested !== "string") {
		return {
			response: toError(id, ERROR_CODES.invalidParams, "params.protocolVersion must be a string"),
		};
	}

	const protocolVersion = LEGACY_PROTOCOL_VERSIONS.includes(requested)
		? requested
		: LEGACY_PROTOCOL_VERSIONS[0];

	return {
		session: { protocolVersion },
		response: toResult(id, {
			protocolVersion,
			capabilities: { tools: {} },
			serverInfo: context.serverInfo,
			instructions: SERVER_INSTRUCTIONS,
		}),
	};
};

const listTools = (
	id: RequestId,
	params: Record<string, unknown>,
	modern: boolean,
	context: McpContext,
): JsonRpcResponse => {
	if (params["cursor"] !== undefined) {
		return toError(
			id,
			ERROR_CODES.invalidParams,
			"Invalid cursor: the tool list has a single page",
		);
	}

	const tools = context.tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		annotations: { readOnlyHint: true, openWorldHint: tool.network === true },
	}));

	return toResult(id, cacheable({ tools }, modern, context));
};

const callRequestedTool = async (
	id: RequestId,
	params: Record<string, unknown>,
	modern: boolean,
	context: McpContext,
): Promise<JsonRpcResponse> => {
	const { name, arguments: args = {} } = params;
	if (typeof name !== "string") {
		return toError(id, ERROR_CODES.invalidParams, "params.name must be a string");
	}

	const tool = context.tools.find((candidate) => candidate.name === name);
	if (tool === undefined) return toError(id, ERROR_CODES.invalidParams, `Unknown tool: ${name}`);
	if (!isRecord(args)) {
		return toError(id, ERROR_CODES.invalidParams, "params.arguments must be an object");
	}

	try {
		const result = await callTool({ tool, args, library: context.library });
		return toResult(id, complete(result, modern, context));
	} catch (error) {
		return toError(id, ERROR_CODES.internalError, String(error));
	}
};

/**
 * Handles one decoded JSON-RPC 2.0 message of the Model Context Protocol and never throws.
 *
 * The server is dual-era, as the 2026-07-28 revision calls it. A request that carries
 * `_meta["io.modelcontextprotocol/protocolVersion"]` is served statelessly under that revision:
 * `server/discover`, `tools/list` and `tools/call`, with `resultType`, the cache hints and the
 * server identity in the result, `-32022` for a revision the server does not speak and `-32602`
 * when the client capabilities are missing. An `initialize` request opens a session under the
 * handshake revisions (2025-11-25 down to 2024-11-05): the requested revision is echoed when the
 * server speaks it and the newest handshake revision is offered otherwise, after which `ping`,
 * `tools/list` and `tools/call` are served in the shape of those revisions. A request that does
 * neither gets `-32602` with both ways forward in the message.
 *
 * Notifications (`notifications/initialized`, `notifications/cancelled`, anything without an
 * `id`) and stray responses get no answer. A message that is not a request object gets `-32600`,
 * an unknown method `-32601`, `params` that is not an object, an unknown tool and a cursor get
 * `-32602`. A tool that fails answers with `isError: true` inside a successful response.
 *
 * @param {unknown} message - The decoded JSON value of one line of the transport.
 * @param {McpSession} session - The session of the connection the message arrived on.
 * @param {McpContext} context - The server identity, the tools and the library.
 * @returns {HandleMessageResult} The next session and the response, `null` when there is none.
 *
 * @example
 * ```typescript
 * const { response } = handleMessage(
 *   { jsonrpc: "2.0", id: 1, method: "ping" },
 *   { protocolVersion: null },
 *   context,
 * );
 * await response; // { jsonrpc: "2.0", id: 1, result: {} }
 * ```
 *
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/basic
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/server/discover
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
 * @see Official: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
 * @see Official: https://www.jsonrpc.org/specification
 */
export const handleMessage = (
	message: unknown,
	session: McpSession,
	context: McpContext,
): HandleMessageResult => {
	const answer = (response: JsonRpcResponse | null): HandleMessageResult => ({
		session,
		response: Promise.resolve(response),
	});

	if (!isRecord(message)) {
		return answer(toError(undefined, ERROR_CODES.invalidRequest, "The message must be an object"));
	}

	const { id, method, params = {} } = message;
	const requestId = isRequestId(id) ? id : undefined;

	if (message["jsonrpc"] !== "2.0" || typeof method !== "string") {
		if (Object.hasOwn(message, "result") || Object.hasOwn(message, "error")) return answer(null);

		return answer(
			toError(requestId, ERROR_CODES.invalidRequest, 'Expected jsonrpc "2.0" and a string method'),
		);
	}

	if (!Object.hasOwn(message, "id")) return answer(null);
	if (requestId === undefined) {
		return answer(
			toError(undefined, ERROR_CODES.invalidRequest, "The id must be a string or an integer"),
		);
	}

	if (!isRecord(params)) {
		return answer(toError(requestId, ERROR_CODES.invalidParams, "params must be an object"));
	}

	if (method === "initialize") {
		const initialized = initialize(requestId, params, context);
		return { session, ...initialized, response: Promise.resolve(initialized.response) };
	}

	if (method === "ping") return answer(toResult(requestId, {}));
	if (method !== "server/discover" && method !== "tools/list" && method !== "tools/call") {
		return answer(toError(requestId, ERROR_CODES.methodNotFound, `Method not found: ${method}`));
	}

	const modern = resolveEra(requestId, params, session);
	if (typeof modern !== "boolean") return answer(modern);

	if (method === "tools/call") {
		return { session, response: callRequestedTool(requestId, params, modern, context) };
	}

	if (method === "tools/list") return answer(listTools(requestId, params, modern, context));
	if (!modern) {
		return answer(
			toError(
				requestId,
				ERROR_CODES.methodNotFound,
				`Method not found: ${method} belongs to ${MODERN_PROTOCOL_VERSION}`,
			),
		);
	}

	return answer(
		toResult(
			requestId,
			cacheable(
				{
					supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
					capabilities: { tools: {} },
					instructions: SERVER_INSTRUCTIONS,
				},
				true,
				context,
			),
		),
	);
};
