import * as fc from "fast-check";

import { anyText } from "../../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../../_internals/test/runtime";
import { type BinProcess, type RunBinParams, runBin } from "./run-bin";

const createProcess = (args: string[], chunks: unknown[] = []) => {
	const written = { stdout: [] as string[], stderr: [] as string[] };
	const stdin = { encodings: [] as string[], reads: 0 };
	const process: BinProcess = {
		argv: ["/usr/bin/node", "/usr/bin/brazilian-utils", ...args],
		stdin: {
			setEncoding: (encoding) => stdin.encodings.push(encoding),
			[Symbol.asyncIterator]() {
				const iterator = chunks[Symbol.iterator]();

				stdin.reads += 1;
				return { next: () => Promise.resolve(iterator.next()) };
			},
		},
		stdout: { write: (text) => written.stdout.push(text) },
		stderr: { write: (text) => written.stderr.push(text) },
	};

	return { process, written, stdin };
};

const api = {
	echo: (value: unknown) => value,
	isValidThing: (value: unknown) => value === "yes",
	generateThing: () => "generated",
};

const runWith = async (
	args: string[],
	{ chunks = [] as unknown[], isStdinPiped = (): boolean => false } = {},
) => {
	const context = createProcess(args, chunks);

	await runBin({ api, version: "9.8.7", process: context.process, isStdinPiped });

	return context;
};

describe("runBin", () => {
	test("should skip the runtime and the script, write the result to stdout and exit with 0", async () => {
		const { process, written, stdin } = await runWith(["echo", "12345678909"]);

		expect(written).toEqual({ stdout: ["12345678909\n"], stderr: [] });
		expect(process.exitCode).toBe(0);
		expect(stdin).toEqual({ encodings: [], reads: 0 });
	});

	test("should print the version it was given", async () => {
		const { process, written } = await runWith(["--version"]);

		expect(written).toEqual({ stdout: ["9.8.7\n"], stderr: [] });
		expect(process.exitCode).toBe(0);
	});

	test("should exit with 1 for a negative answer", async () => {
		const { process, written } = await runWith(["isValidThing", "no"]);

		expect(written).toEqual({ stdout: ["false\n"], stderr: [] });
		expect(process.exitCode).toBe(1);
	});

	test("should write a usage error to stderr only and exit with 2", async () => {
		const { process, written } = await runWith(["nope"]);

		expect(written).toEqual({
			stdout: [],
			stderr: [
				'Unknown utility "nope". Run "brazilian-utils list" to see every utility.\nRun "brazilian-utils --help" for usage.\n',
			],
		});
		expect(process.exitCode).toBe(2);
	});

	test("should read a piped stdin as UTF-8 text, joining its chunks", async () => {
		const { process, written, stdin } = await runWith(["echo"], {
			chunks: ["São ", "Paulo\n"],
			isStdinPiped: () => true,
		});

		expect(written).toEqual({ stdout: ["São Paulo\n"], stderr: [] });
		expect(process.exitCode).toBe(0);
		expect(stdin).toEqual({ encodings: ["utf8"], reads: 1 });
	});

	test("should turn a chunk that is not text into text", async () => {
		const { written } = await runWith(["echo", "-"], { chunks: [12, 34] });

		expect(written.stdout).toEqual(["1234\n"]);
	});

	test("should read stdin for - even when it is not piped", async () => {
		const { written, stdin } = await runWith(["echo", "-"], { chunks: ["typed\n"] });

		expect(written.stdout).toEqual(["typed\n"]);
		expect(stdin).toEqual({ encodings: ["utf8"], reads: 1 });
	});

	test("should not read a stdin that is not piped", async () => {
		const { written, stdin } = await runWith(["echo"], { chunks: ["ignored"] });

		expect(written.stdout).toEqual(["null\n"]);
		expect(stdin.reads).toBe(0);
	});

	test("should count a stdin probe that throws as not piped", async () => {
		const { process, written, stdin } = await runWith(["echo"], {
			chunks: ["ignored"],
			isStdinPiped: () => {
				throw new Error("EBADF: bad file descriptor, fstat");
			},
		});

		expect(written).toEqual({ stdout: ["null\n"], stderr: [] });
		expect(process.exitCode).toBe(1);
		expect(stdin.reads).toBe(0);
	});

	test("should not touch a piped stdin for a utility that takes no argument", async () => {
		const { written, stdin } = await runWith(["generateThing"], {
			chunks: ["ignored"],
			isStdinPiped: () => true,
		});

		expect(written.stdout).toEqual(["generated\n"]);
		expect(stdin.reads).toBe(0);
	});

	describe("properties", () => {
		test("should never reject and always set a known exit code", async () => {
			await fc.assert(
				fc.asyncProperty(fc.array(anyText), fc.array(anyText), async (args, chunks) => {
					const { process } = await runWith(args, { chunks, isStdinPiped: () => true });

					expect([0, 1, 2].includes(process.exitCode as number)).toBe(true);
				}),
			);
		});
	});
});

describe("runBin types", () => {
	test("should take the params and resolve to nothing", () => {
		expectTypeOf(runBin).parameter(0).toEqualTypeOf<RunBinParams>();
		expectTypeOf(runBin).returns.toEqualTypeOf<Promise<void>>();
		expectTypeOf<RunBinParams["isStdinPiped"]>().toEqualTypeOf<() => boolean>();
	});
});
