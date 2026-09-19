import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type McpTool } from "../constants";
import { type McpContext } from "../handle-message/handle-message";
import {
	serveStdio,
	type ServeStdioParams,
	type StdioInput,
	type StdioOutput,
} from "./serve-stdio";

type Listener = (chunk?: Uint8Array) => unknown;

type Harness = {
	output: string[];
	log: string[];
	write: (text: string) => Promise<void>;
	writeBytes: (bytes: Uint8Array) => Promise<void>;
	end: () => Promise<void>;
	release: (value: string) => void;
};

const TOOLS: McpTool[] = ["shout", "slow"].map((name) => ({
	name,
	description: `The ${name} tool of the tests.`,
	parameters: ["value"],
	inputSchema: { type: "object", properties: { value: { type: "string" } } },
}));

const INITIALIZE =
	'{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}';

const callLine = (id: number | string, name: string, value: string): string =>
	JSON.stringify({
		jsonrpc: "2.0",
		id,
		method: "tools/call",
		params: { name, arguments: { value } },
	});

const resultLine = (id: number | string, text: string): string =>
	`${JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: false } })}\n`;

const flush = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

const writeAll = async (
	write: (text: string) => Promise<void>,
	[first, ...rest]: string[],
): Promise<void> => {
	if (first === undefined) return;

	await write(first);
	await writeAll(write, rest);
};

const anyChunks = fc.array(fc.string(), { maxLength: 5 });

const start = (failingOutput = false): Harness => {
	const listeners: Record<string, Listener> = {};
	const output: string[] = [];
	const log: string[] = [];
	const releases: ((value: string) => void)[] = [];
	const released = new Promise<string>((resolve) => {
		releases.push(resolve);
	});

	const context: McpContext = {
		serverInfo: { name: "brazilian-utils", version: "9.9.9" },
		tools: TOOLS,
		library: {
			shout: (value: string): string => value.toUpperCase(),
			slow: (): Promise<string> => released,
		},
	};

	serveStdio({
		input: {
			on: (event, listener) => {
				listeners[event] = listener;
			},
		},
		output: {
			write: (text) => {
				if (failingOutput) throw new Error("EPIPE");
				output.push(text);
			},
		},
		log: { write: (text) => log.push(text) },
		context,
	});

	const writeBytes = async (bytes: Uint8Array): Promise<void> => {
		await Promise.race([listeners["data"](bytes), flush()]);
		await flush();
	};

	return {
		output,
		log,
		writeBytes,
		write: (text) => writeBytes(new TextEncoder().encode(text)),
		end: async () => {
			await Promise.race([listeners["end"](), flush()]);
			await flush();
		},
		release: (value) => {
			for (const release of releases) release(value);
		},
	};
};

describe("serveStdio", () => {
	test("should announce itself on the log and write nothing to the output", () => {
		const { output, log } = start();

		expect(log).toStrictEqual(["brazilian-utils-mcp 9.9.9: serving 2 tools on stdio\n"]);
		expect(output).toStrictEqual([]);
	});

	test("should answer each line with one line of JSON", async () => {
		const { output, write } = start();

		await write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
		await write(
			'{"jsonrpc":"2.0","id":"b","method":"ping"}\n{"jsonrpc":"2.0","id":3,"method":"nope"}\n',
		);

		expect(output).toStrictEqual([
			'{"jsonrpc":"2.0","id":1,"result":{}}\n',
			'{"jsonrpc":"2.0","id":"b","result":{}}\n',
			'{"jsonrpc":"2.0","id":3,"error":{"code":-32601,"message":"Method not found: nope"}}\n',
		]);
	});

	test("should keep the session the handshake opens for the lines that follow", async () => {
		const { output, write } = start();

		await write(`${callLine(1, "shout", "a")}\n`);
		await write(`${INITIALIZE}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n`);
		await write(`${callLine(2, "shout", "olá")}\n`);

		expect(output).toHaveLength(3);
		expect(JSON.parse(output[0]).error.code).toBe(-32_602);
		expect(JSON.parse(output[1]).result.protocolVersion).toBe("2025-06-18");
		expect(output[2]).toBe(resultLine(2, '"OLÁ"'));
	});

	test("should open the session before a request of the same chunk is handled", async () => {
		const { output, write } = start();

		await write(`${INITIALIZE}\n${callLine(2, "shout", "a")}\n`);

		expect(output).toHaveLength(2);
		expect(output[1]).toBe(resultLine(2, '"A"'));
	});

	test("should wait for the newline, wherever the chunks break", async () => {
		const { output, write } = start();

		await write('{"jsonrpc":"2.0",');
		await write('"id":1,"meth');

		expect(output).toStrictEqual([]);

		await write('od":"ping"}\n{"jsonrpc"');

		expect(output).toStrictEqual(['{"jsonrpc":"2.0","id":1,"result":{}}\n']);

		await write(':"2.0","id":2,"method":"ping"}\r\n');

		expect(output).toStrictEqual([
			'{"jsonrpc":"2.0","id":1,"result":{}}\n',
			'{"jsonrpc":"2.0","id":2,"result":{}}\n',
		]);
	});

	test("should decode a multi-byte character split between two chunks", async () => {
		const { output, write, writeBytes } = start();
		const bytes = new TextEncoder().encode(`${callLine(1, "shout", "ação")}\n`);
		const middle = bytes.indexOf(0xc3) + 1;

		await write(`${INITIALIZE}\n`);
		await writeBytes(bytes.slice(0, middle));
		await writeBytes(bytes.slice(middle));

		expect(output[1]).toBe(resultLine(1, '"AÇÃO"'));
	});

	test("should skip blank lines", async () => {
		const { output, log, write } = start();

		await write('\n\n  \n\r\n{"jsonrpc":"2.0","id":1,"method":"ping"}\n\n');

		expect(output).toStrictEqual(['{"jsonrpc":"2.0","id":1,"result":{}}\n']);
		expect(log).toHaveLength(1);
	});

	test("should read a last line that has no newline when the input ends, and only once", async () => {
		const { output, write, end } = start();

		await write('{"jsonrpc":"2.0","id":1,"method":"ping"}');

		expect(output).toStrictEqual([]);

		await end();
		await end();

		expect(output).toStrictEqual(['{"jsonrpc":"2.0","id":1,"result":{}}\n']);
	});

	test("should write nothing when the input ends on a complete line", async () => {
		const { output, log, write, end } = start();

		await write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
		await end();

		expect(output).toHaveLength(1);
		expect(log).toHaveLength(1);
	});

	test("should answer a line that is not JSON with a parse error, log it and go on", async () => {
		const { output, log, write } = start();

		await write('{"jsonrpc":\nnot json\n{"jsonrpc":"2.0","id":1,"method":"ping"}\n');

		expect(output).toStrictEqual([
			'{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"}}\n',
			'{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"}}\n',
			'{"jsonrpc":"2.0","id":1,"result":{}}\n',
		]);
		expect(log.slice(1)).toStrictEqual([
			"brazilian-utils-mcp: discarded a line that is not JSON\n",
			"brazilian-utils-mcp: discarded a line that is not JSON\n",
		]);
	});

	test("should answer JSON that is not a request object without crashing", async () => {
		const { output, write } = start();

		await write('null\n42\n"ping"\n[]\n{"jsonrpc":"2.0","id":1,"method":"ping"}\n');

		expect(output).toHaveLength(5);
		expect(output[0]).toBe(
			'{"jsonrpc":"2.0","error":{"code":-32600,"message":"The message must be an object"}}\n',
		);
		expect(output[4]).toBe('{"jsonrpc":"2.0","id":1,"result":{}}\n');
	});

	test("should never write a notification answer, nor a newline inside a message", async () => {
		const { output, write } = start();

		await write(`${INITIALIZE}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n`);
		await write(`${callLine(1, "shout", "two\nlines")}\n`);

		expect(output).toHaveLength(2);
		expect(output[1]).toBe(resultLine(1, String.raw`"TWO\nLINES"`));
		expect(output[1].indexOf("\n")).toBe(output[1].length - 1);
	});

	test("should answer a fast request while a slow one is pending", async () => {
		const { output, write, release } = start();

		await write(`${INITIALIZE}\n${callLine(1, "slow", "a")}\n${callLine(2, "shout", "b")}\n`);

		expect(output.slice(1)).toStrictEqual([resultLine(2, '"B"')]);

		release("done");
		await flush();

		expect(output.slice(1)).toStrictEqual([resultLine(2, '"B"'), resultLine(1, '"done"')]);
	});

	test("should drop the response to a request the client cancelled", async () => {
		const { output, write, release } = start();

		await write(`${INITIALIZE}\n${callLine(1, "slow", "a")}\n${callLine("1", "slow", "b")}\n`);
		await write(
			'{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":1,"reason":"timeout"}}\n',
		);
		release("done");
		await flush();

		expect(output.slice(1)).toStrictEqual([resultLine("1", '"done"')]);
	});

	test("should ignore a cancellation that names no request in flight", async () => {
		const { output, write, release } = start();

		await write(`${INITIALIZE}\n${callLine(1, "slow", "a")}\n`);
		await write('{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":9}}\n');
		await write('{"jsonrpc":"2.0","method":"notifications/cancelled"}\n');
		await write('{"jsonrpc":"2.0","method":"notifications/other","params":{"requestId":1}}\n');
		await write('{"jsonrpc":"2.0","id":5,"method":"ping","params":{"requestId":1}}\n');
		release("done");
		await flush();

		expect(output.slice(1)).toStrictEqual([
			'{"jsonrpc":"2.0","id":5,"result":{}}\n',
			resultLine(1, '"done"'),
		]);
	});

	test("should log a response that cannot be written and keep serving", async () => {
		const { output, log, write } = start(true);

		await write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0","method":"x"}\n');

		expect(output).toStrictEqual([]);
		expect(log.slice(1)).toStrictEqual([
			"brazilian-utils-mcp: could not answer a message: Error: EPIPE\n",
		]);
	});

	describe("properties", () => {
		test("should never throw, and write only complete lines of JSON, whatever the input", async () => {
			await fc.assert(
				fc.asyncProperty(anyChunks, async (chunks) => {
					const { output, write, end } = start();

					await writeAll(write, chunks);
					await end();

					for (const line of output) {
						expect(line.endsWith("\n")).toBe(true);
						expect(line.indexOf("\n")).toBe(line.length - 1);
						expect(JSON.parse(line).jsonrpc).toBe("2.0");
					}
				}),
			);
		});

		test("should answer the same whatever way the bytes are split into chunks", async () => {
			const text = `${INITIALIZE}\n${callLine(1, "shout", "ação")}\n{"jsonrpc":"2.0","id":2,"method":"ping"}\n`;
			const bytes = new TextEncoder().encode(text);

			await fc.assert(
				fc.asyncProperty(fc.integer({ min: 1, max: bytes.length - 1 }), async (cut) => {
					const { output, writeBytes } = start();

					await writeBytes(bytes.slice(0, cut));
					await writeBytes(bytes.slice(cut));

					expect(output.slice(1).toSorted()).toStrictEqual([
						resultLine(1, '"AÇÃO"'),
						'{"jsonrpc":"2.0","id":2,"result":{}}\n',
					]);
				}),
			);
		});
	});
});

describe("serveStdio types", () => {
	test("should take the streams and the context and return nothing", () => {
		expectTypeOf(serveStdio).parameter(0).toEqualTypeOf<ServeStdioParams>();
		expectTypeOf(serveStdio).returns.toEqualTypeOf<void>();
		expectTypeOf<ServeStdioParams["input"]>().toEqualTypeOf<StdioInput>();
		expectTypeOf<ServeStdioParams["output"]>().toEqualTypeOf<StdioOutput>();
		expectTypeOf<ServeStdioParams["log"]>().toEqualTypeOf<StdioOutput>();
	});

	test("should accept the process streams of Node.js", () => {
		expectTypeOf<Pick<NodeJS.ReadStream, "on">>().toExtend<StdioInput>();
		expectTypeOf<Pick<NodeJS.WriteStream, "write">>().toExtend<StdioOutput>();
	});
});
