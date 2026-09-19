import { runCli } from "../run-cli/run-cli";

/** A stream the command line writes text to. */
type BinOutput = {
	/** Writes the text. */
	write: (text: string) => unknown;
};

/** The standard input stream, read as UTF-8 text. */
type BinInput = AsyncIterable<unknown> & {
	/** Makes the stream yield decoded text instead of bytes. */
	setEncoding: (encoding: "utf8") => unknown;
};

/** The part of the Node.js `process` the command line uses. */
export type BinProcess = {
	/** The runtime, the script and then the command line arguments. */
	argv: readonly string[];
	/** The standard input. */
	stdin: BinInput;
	/** The standard output. */
	stdout: BinOutput;
	/** The standard error. */
	stderr: BinOutput;
	/** The exit code of the process, set instead of exiting so that pending output is flushed. */
	exitCode?: number | string | null;
};

/** Params of `runBin`. */
export type RunBinParams = {
	/** The exports the command line dispatches to: the public API of the package. */
	api: Readonly<Record<string, unknown>>;
	/** The version printed by `--version`. */
	version: string;
	/** The process to read the arguments and stdin from and to write the result to. */
	process: BinProcess;
	/** Tells whether stdin is a pipe or a file. May throw (a closed stdin): that counts as no. */
	isStdinPiped: () => boolean;
};

// Stryker disable BlockStatement: with an empty catch block a probe that throws answers `undefined`, which `runCli` reads as not piped exactly like `false`.
const isPiped = (isStdinPiped: () => boolean): boolean => {
	try {
		return isStdinPiped();
	} catch {
		return false;
	}
};
// Stryker restore BlockStatement

const readAll = async (stdin: BinInput): Promise<string> => {
	let text = "";

	stdin.setEncoding("utf8");
	for await (const chunk of stdin) text += String(chunk);

	return text;
};

/**
 * Connects `runCli` to a process: reads its arguments and stdin, writes the result to its stdout
 * and stderr and sets its exit code.
 *
 * The exit code is set on the process instead of calling `process.exit()`, so that a long result
 * (`getMunicipalities`) is flushed before the process ends. Stdin is only touched when `runCli`
 * asks for it.
 *
 * @param {RunBinParams} params - The API, the version, the process and the stdin probe.
 * @returns {Promise<void>} Settles once the result has been written.
 *
 * @example
 * ```typescript
 * import process from "node:process";
 *
 * import * as api from "@brazilian-utils/brazilian-utils";
 *
 * await runBin({ api, version: "2.4.0", process, isStdinPiped: () => false });
 * ```
 */
export const runBin = async ({
	api,
	version,
	process,
	isStdinPiped,
}: RunBinParams): Promise<void> => {
	const result = await runCli({
		argv: process.argv.slice(2),
		api,
		version,
		stdin: { isPiped: isPiped(isStdinPiped), read: () => readAll(process.stdin) },
	});

	if (result.stdout !== "") process.stdout.write(result.stdout);
	if (result.stderr !== "") process.stderr.write(result.stderr);
	process.exitCode = result.exitCode;
};
