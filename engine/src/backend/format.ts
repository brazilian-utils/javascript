/**
 * Running each target's own formatter over the generated output.
 *
 * The printer already emits the shape the code should have; a formatter only fixes whitespace,
 * which is why a missing formatter never changes what the code means. It does change the bytes,
 * though, and the generated output is committed, so a missing formatter is reported rather than
 * passed over: `verify` refuses to run without all three, which is what keeps a checkout that
 * lacks one from producing a diff against the committed files.
 *
 * Versions are pinned — prettier in the engine's own `package.json`, the others in
 * `toolchain.lock.json` — so a formatter upgrade cannot silently rewrite a golden file.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

type Formatter = {
	readonly name: string;
	readonly command: string;
	readonly args: readonly string[];
	/** How to ask the tool for its version, to tell "not installed" from "failed on this input". */
	readonly probe: readonly string[];
};

/**
 * Prettier from the engine's own dependencies, so the output does not depend on what the project
 * being compiled happens to have installed. `npx` is the fallback for a checkout that has not run
 * `npm install` yet.
 */
const PRETTIER = (): string => {
	const local = resolve(import.meta.dirname, "..", "..", "node_modules", ".bin", "prettier");
	return existsSync(local) ? local : "npx";
};

function prettierArgs(command: string): string[] {
	const own = ["--write", "--use-tabs", "--no-config", "."];
	return command === "npx" ? ["--no-install", "prettier", ...own] : own;
}

function formattersFor(target: string): Formatter[] {
	switch (target) {
		case "typescript": {
			const command = PRETTIER();
			return [
				{
					name: "prettier",
					command,
					args: prettierArgs(command),
					probe: command === "npx" ? ["--no-install", "prettier", "--version"] : ["--version"],
				},
			];
		}
		case "python":
			return [{ name: "ruff format", command: "ruff", args: ["format", "--no-cache", "."], probe: ["--version"] }];
		case "go":
			return [{ name: "gofmt", command: "gofmt", args: ["-w", "."], probe: ["-h"] }];
		case "rust":
			// `cargo fmt` is rustfmt: it runs rustfmt over every file the crate's Cargo.toml lists,
			// which a bare `rustfmt <files>` invocation would have to enumerate by hand.
			return [{ name: "rustfmt", command: "cargo", args: ["fmt"], probe: ["fmt", "--version"] }];
		default:
			return [];
	}
}

/** Whether a formatter is installed at all, as opposed to having failed on the input. */
function isInstalled(formatter: Formatter): boolean {
	const probe = spawnSync(formatter.command, [...formatter.probe], { encoding: "utf8", stdio: "pipe" });
	return probe.error === undefined && probe.status !== null;
}

/** Formats a target's output in place, reporting both what ran and what was not installed. */
export function formatOutput(target: string, outDir: string): { applied: string[]; missing: string[] } {
	const applied: string[] = [];
	const missing: string[] = [];
	for (const formatter of formattersFor(target)) {
		const result = spawnSync(formatter.command, [...formatter.args], {
			cwd: outDir,
			encoding: "utf8",
			stdio: "pipe",
		});
		if (result.status === 0) applied.push(formatter.name);
		else if (!isInstalled(formatter)) missing.push(formatter.name);
		else applied.push(`${formatter.name} (failed)`);
	}
	return { applied, missing };
}

/** The formatters a target needs, whether or not they are installed. Used by `verify`. */
export function formattersOf(target: string): { name: string; installed: boolean }[] {
	return formattersFor(target).map((formatter) => ({ name: formatter.name, installed: isInstalled(formatter) }));
}
