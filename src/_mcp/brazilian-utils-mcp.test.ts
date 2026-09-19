import { describe, expect, test } from "../_internals/test/runtime";

type Exchange = {
	code: number | null;
	stdout: string;
	stderr: string;
};

/**
 * The bin is a process, so this suite only runs where one can be spawned: Node.js. Bun, Deno and
 * the browsers still run every other suite of the server, which covers all of its logic in-process.
 */
const runtime: { process?: { versions?: { node?: string } } } = globalThis;

const canSpawn =
	typeof runtime.process?.versions?.node === "string" &&
	!("Bun" in globalThis) &&
	!("Deno" in globalThis);

const MODERN_META = {
	"io.modelcontextprotocol/protocolVersion": "2026-07-28",
	"io.modelcontextprotocol/clientCapabilities": {},
};

/**
 * Bundles the bin into a throwaway package laid out like the published one (`package.json` next
 * to `dist/`), spawns it, writes `lines` to its stdin, closes it and waits for the exit.
 * @param {string[]} lines What the client writes, one message per line.
 * @returns {Promise<Exchange>} The exit code and everything the process wrote.
 */
const converse = async (lines: string[]): Promise<Exchange> => {
	const { spawn } = await import("node:child_process");
	const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const path = await import("node:path");
	const { fileURLToPath } = await import("node:url");
	const { build } = await import("esbuild");

	const root = await mkdtemp(path.join(tmpdir(), "brazilian-utils-mcp-"));
	const bin = path.join(root, "dist", "brazilian-utils-mcp.js");

	try {
		await writeFile(path.join(root, "package.json"), '{"type":"module","version":"0.0.0-test"}');
		await build({
			entryPoints: [fileURLToPath(new URL("brazilian-utils-mcp.ts", import.meta.url).href)],
			outfile: bin,
			bundle: true,
			format: "esm",
			platform: "node",
			logLevel: "silent",
		});

		return await new Promise<Exchange>((resolve, reject) => {
			const child = spawn(process.execPath, [bin], { stdio: ["pipe", "pipe", "pipe"] });
			let stdout = "";
			let stderr = "";

			child.stdout.on("data", (chunk: Uint8Array) => {
				stdout += String(chunk);
			});
			child.stderr.on("data", (chunk: Uint8Array) => {
				stderr += String(chunk);
			});
			child.on("error", reject);
			child.on("close", (code) => {
				resolve({ code, stdout, stderr });
			});
			child.stdin.end(lines.map((line) => `${line}\n`).join(""));
		});
	} finally {
		await rm(root, { recursive: true, force: true });
	}
};

const suite = canSpawn ? describe : describe.skip;

suite("brazilian-utils-mcp bin", () => {
	test("should speak both protocol eras over stdio, keep stdout clean and exit when stdin closes", async () => {
		const { code, stdout, stderr } = await converse([
			JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-11-25",
					capabilities: {},
					clientInfo: { name: "e2e", version: "1.0.0" },
				},
			}),
			JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
			JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping" }),
			JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
			JSON.stringify({
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "isValidCpf", arguments: { value: "111.444.777-35" } },
			}),
			JSON.stringify({
				jsonrpc: "2.0",
				id: 5,
				method: "tools/call",
				params: { name: "formatCnpj", arguments: { value: 24_522_200_000_174 } },
			}),
			JSON.stringify({
				jsonrpc: "2.0",
				id: 6,
				method: "server/discover",
				params: { _meta: MODERN_META },
			}),
			JSON.stringify({
				jsonrpc: "2.0",
				id: 7,
				method: "tools/call",
				params: {
					name: "getHolidays",
					arguments: { year: 2024, stateCode: "SP" },
					_meta: MODERN_META,
				},
			}),
			"this is not json",
			JSON.stringify({ jsonrpc: "2.0", id: 8, method: "resources/list" }),
		]);

		const responses: any[] = stdout
			.split("\n")
			.filter((line) => line !== "")
			.map((line) => JSON.parse(line));
		const byId = (id: number): any => responses.find((response) => response.id === id);

		expect(code).toBe(0);
		expect(stderr).toBe(
			"brazilian-utils-mcp 0.0.0-test: serving 136 tools on stdio\nbrazilian-utils-mcp: discarded a line that is not JSON\n",
		);
		expect(stdout.endsWith("\n")).toBe(true);
		expect(responses).toHaveLength(9);

		expect(byId(1).result.protocolVersion).toBe("2025-11-25");
		expect(byId(1).result.capabilities).toStrictEqual({ tools: {} });
		expect(byId(1).result.serverInfo).toStrictEqual({
			name: "brazilian-utils",
			version: "0.0.0-test",
		});
		expect(byId(2)).toStrictEqual({ jsonrpc: "2.0", id: 2, result: {} });
		expect(byId(3).result.tools).toHaveLength(136);
		expect(byId(3).result.tools[0].name).toBe("addBusinessDays");
		expect(byId(4).result).toStrictEqual({
			content: [{ type: "text", text: "true" }],
			isError: false,
		});
		expect(byId(5).result).toStrictEqual({
			content: [{ type: "text", text: "arguments.value must be of type string" }],
			isError: true,
		});
		expect(byId(6).result.resultType).toBe("complete");
		expect(byId(6).result.supportedVersions).toStrictEqual([
			"2026-07-28",
			"2025-11-25",
			"2025-06-18",
			"2025-03-26",
			"2024-11-05",
		]);
		expect(byId(7).result.resultType).toBe("complete");
		expect(JSON.parse(byId(7).result.content[0].text)).toContainEqual({
			name: "Revolução Constitucionalista",
			date: "2024-07-09",
			type: "state",
		});
		expect(byId(8).error).toStrictEqual({
			code: -32_601,
			message: "Method not found: resources/list",
		});
		expect(responses.filter((response) => response.id === undefined)).toStrictEqual([
			{ jsonrpc: "2.0", error: { code: -32_700, message: "Parse error" } },
		]);
	}, 60_000);
});
