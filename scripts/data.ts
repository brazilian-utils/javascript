#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const scriptsDirectory = import.meta.dirname;

const run = (command: string, args: string[]): Promise<number | null> =>
	new Promise((_resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
		});

		child.on("close", (code) => {
			_resolve(code);
		});
		child.on("error", () => {
			_resolve(1);
		});
	});

const generators = [
	"banks.ts",
	"cbo.ts",
	"cest.ts",
	"cfop.ts",
	"cid10.ts",
	"cities.ts",
	"cnae.ts",
	"ibs-cbs.ts",
	"legal-natures.ts",
	"nbs.ts",
	"ncm.ts",
	"service-items.ts",
	"states.ts",
];

const generatedFiles = [
	"./src/_internals/constants/banks.ts",
	"./src/_internals/constants/cbo-descriptions.ts",
	"./src/_internals/constants/cbo.ts",
	"./src/_internals/constants/cest.ts",
	"./src/_internals/constants/cfop-descriptions.ts",
	"./src/_internals/constants/cfop.ts",
	"./src/_internals/constants/cid10-descriptions.ts",
	"./src/_internals/constants/cid10.ts",
	"./src/_internals/constants/cnae-descriptions.ts",
	"./src/_internals/constants/cnae.ts",
	"./src/_internals/constants/ibs-cbs.ts",
	"./src/_internals/constants/municipalities.ts",
	"./src/_internals/constants/nbs-descriptions.ts",
	"./src/_internals/constants/nbs.ts",
	"./src/_internals/constants/service-items.ts",
	"./src/_internals/constants/states.ts",
	"./src/get-municipality-by-cep/constants.ts",
	"./src/is-valid-legal-nature/constants.ts",
	"./src/is-valid-ncm/constants.ts",
];

const results = await Promise.all(
	generators.map((generator) => run("node", [resolve(scriptsDirectory, generator)])),
);

// The CEP ranges are joined against the municipality table cities.ts has just rewritten, so
// they are generated after it rather than alongside it.
results.push(await run("node", [resolve(scriptsDirectory, "municipality-cep-ranges.ts")]));

// Lint and format before checking the generators, so a failing generator never leaves
// unformatted files behind in the working tree. `vp fmt` runs last because `vp lint --fix`
// rewrites code without reformatting it.
const lintResult = await run("vp", ["lint", "--fix", ...generatedFiles]);
const formatResult = await run("vp", ["fmt", "--write", ...generatedFiles]);

if (results.some((result) => result !== 0) || lintResult !== 0 || formatResult !== 0) {
	process.exit(1);
}

process.exit(0);
