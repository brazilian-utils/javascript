import { ERROR_CODES } from "../constants";
import {
	handleMessage,
	type JsonRpcResponse,
	type McpContext,
	type McpSession,
} from "../handle-message/handle-message";

/** The part of a readable stream the transport uses, which `process.stdin` satisfies. */
export type StdioInput = {
	/** Subscribes to the chunks of the stream and to its end, which passes no chunk. */
	on: (event: "data" | "end", listener: (chunk?: Uint8Array) => unknown) => unknown;
};

/** The part of a writable stream the transport uses, which `process.stdout` and `process.stderr` satisfy. */
export type StdioOutput = {
	/** Writes one piece of text. */
	write: (text: string) => unknown;
};

/** What `serveStdio` needs: the three streams and what the server serves. */
export type ServeStdioParams = {
	/** Where the client writes its messages, one JSON value per line. */
	input: StdioInput;
	/** Where the responses go, one JSON value per line and nothing else. */
	output: StdioOutput;
	/** Where the diagnostics go. */
	log: StdioOutput;
	/** The server identity, the tools and the library. */
	context: McpContext;
};

const read = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

const getCancelledId = (message: unknown): unknown =>
	read(message, "method") === "notifications/cancelled"
		? read(read(message, "params"), "requestId")
		: undefined;

/**
 * Serves the Model Context Protocol over the stdio transport: newline delimited JSON-RPC messages
 * read from `input`, responses written to `output` one per line, diagnostics written to `log` and
 * never to `output`. A line that is not JSON is answered with a `-32700` parse error, a blank line
 * is skipped, a last line without its newline is read when the input ends, and a chunk boundary
 * may fall anywhere, inside a multi-byte character included.
 * Requests run concurrently, so a slow CEP lookup does not hold the next request back, and the
 * response to a request the client cancelled with `notifications/cancelled` is dropped. The
 * process is left to exit by itself once the input ended and the pending responses are written.
 *
 * @param {ServeStdioParams} params - The streams and the server context.
 * @returns {void} Nothing; the listener registered on `input` does the work.
 *
 * @example
 * ```typescript
 * serveStdio({ input: process.stdin, output: process.stdout, log: process.stderr, context });
 * ```
 *
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio
 * @see Official: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation
 */
export const serveStdio = ({ input, output, log, context }: ServeStdioParams): void => {
	const decoder = new TextDecoder();
	const inFlight = new Set<{ id: unknown }>();
	let session: McpSession = { protocolVersion: null };
	let buffer = "";

	const send = (response: JsonRpcResponse): void => {
		output.write(`${JSON.stringify(response)}\n`);
	};

	const receive = async (line: string): Promise<void> => {
		let message: unknown;
		try {
			message = JSON.parse(line);
		} catch {
			log.write(`brazilian-utils-mcp: discarded a line that is not JSON\n`);
			send({ jsonrpc: "2.0", error: { code: ERROR_CODES.parseError, message: "Parse error" } });
			return;
		}

		const cancelledId = getCancelledId(message);
		for (const entry of inFlight) {
			if (cancelledId !== undefined && entry.id === cancelledId) inFlight.delete(entry);
		}

		const handled = handleMessage(message, session, context);
		({ session } = handled);

		const entry = { id: read(message, "id") };
		inFlight.add(entry);
		const response = await handled.response;
		if (inFlight.delete(entry) && response !== null) send(response);
	};

	const receiveAll = async (lines: string[]): Promise<void> => {
		const outcomes = await Promise.allSettled(
			lines.filter((line) => line.trim() !== "").map((line) => receive(line)),
		);

		for (const outcome of outcomes) {
			if (outcome.status === "rejected") {
				log.write(`brazilian-utils-mcp: could not answer a message: ${String(outcome.reason)}\n`);
			}
		}
	};

	input.on("data", async (chunk) => {
		const text = `${buffer}${decoder.decode(chunk, { stream: true })}`;
		const complete = text.lastIndexOf("\n") + 1;
		buffer = text.slice(complete);
		await receiveAll(text.slice(0, complete).split("\n"));
	});

	input.on("end", async () => {
		const lines = [buffer];
		buffer = "";
		await receiveAll(lines);
	});

	log.write(
		`brazilian-utils-mcp ${context.serverInfo.version}: serving ${context.tools.length} tools on stdio\n`,
	);
};
