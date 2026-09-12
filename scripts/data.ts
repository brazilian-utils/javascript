#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const scriptsDir = import.meta.dirname;

const run = (command: string, args: string[]): Promise<number | null> =>
	new Promise((resolveExit) => {
		const child = spawn(command, args, {
			stdio: "inherit",
		});

		child.on("close", (code) => {
			resolveExit(code);
		});
		child.on("error", () => {
			resolveExit(1);
		});
	});

const generators = [
	"banks.ts",
	"cbo.ts",
	"cfop.ts",
	"cities.ts",
	"cnae.ts",
	"legal-natures.ts",
	"ncm.ts",
	"states.ts",
];

const generatedFiles = [
	"./src/_internals/constants/banks.ts",
	"./src/_internals/constants/cbo.ts",
	"./src/_internals/constants/cfop.ts",
	"./src/_internals/constants/cities.ts",
	"./src/_internals/constants/cnae.ts",
	"./src/_internals/constants/states.ts",
	"./src/is-valid-legal-nature/constants.ts",
	"./src/is-valid-ncm/constants.ts",
];

const results = await Promise.all(
	generators.map((generator) => run("node", [resolve(scriptsDir, generator)])),
);

if (results.some((result) => result !== 0)) {
	process.exit(1);
}

const formatResult = await run("vp", ["fmt", "--write", ...generatedFiles]);

if (formatResult !== 0) {
	process.exit(1);
}

const lintResult = await run("vp", ["lint", "--fix", ...generatedFiles]);

if (lintResult !== 0) {
	process.exit(1);
}

process.exit(0);
