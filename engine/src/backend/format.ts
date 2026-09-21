/**
 * Running each target's own formatter over the generated output.
 *
 * The printer already emits the shape the code should have; a formatter only fixes whitespace,
 * which is why a missing formatter is a warning and never changes what the code means. Versions
 * are pinned in `toolchain.lock.json` so a formatter upgrade cannot silently rewrite golden files.
 */

import { spawnSync } from "node:child_process";

type Formatter = {
	readonly command: string;
	readonly args: (dir: string) => string[];
};

const FORMATTERS: Record<string, Formatter[]> = {
	typescript: [{ command: "npx", args: () => ["--no-install", "prettier", "--write", "--use-tabs", "."] }],
	python: [{ command: "ruff", args: () => ["format", "--no-cache", "."] }],
	go: [{ command: "gofmt", args: () => ["-w", "."] }],
};

/** Formats a target's output in place. Returns the formatters that actually ran. */
export function formatOutput(target: string, outDir: string): string[] {
	const applied: string[] = [];
	for (const formatter of FORMATTERS[target] ?? []) {
		const result = spawnSync(formatter.command, formatter.args(outDir), {
			cwd: outDir,
			encoding: "utf8",
			stdio: "pipe",
		});
		if (result.status === 0) applied.push(formatter.command);
	}
	return applied;
}
