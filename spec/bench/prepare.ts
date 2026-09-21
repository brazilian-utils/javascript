import { execFileSync } from "node:child_process";
/**
 * Prepares the benchmark inputs.
 *
 * 1. Writes `spec/bench/corpus.json`: the inputs every arm, in every language, validates.
 * 2. Emits the generated `isValidCpf` for each language under the SAME profile
 *    (`masked-strict`), so the source level arms do identical work. The published packages adopt
 *    different profiles, which is right for them and useless for a benchmark.
 *
 * Usage: `node spec/bench/prepare.ts`
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCorpus } from "../codegen/corpus.ts";

const benchDir = import.meta.dirname;
const specDir = resolve(benchDir, "..");
const tempSpec = resolve(benchDir, ".spec-masked-strict");

// A corpus of realistic size: mostly valid CPFs, masked and bare, plus the rejects.
const corpus = buildCorpus(4000)
	.filter((input) => input.length > 0 && input.length < 24)
	.slice(0, 1000);

writeFileSync(resolve(benchDir, "corpus.json"), `${JSON.stringify(corpus)}\n`);

rmSync(tempSpec, { recursive: true, force: true });
mkdirSync(tempSpec, { recursive: true });

for (const entry of ["codegen", "schema", "utilities", "vectors", "utilities.json"]) {
	cpSync(resolve(specDir, entry), resolve(tempSpec, entry), { recursive: true });
}

const cpfPath = resolve(tempSpec, "utilities/is-valid-cpf.json");
const cpf = JSON.parse(readFileSync(cpfPath, "utf8")) as {
	adopted: Record<string, { profile: string }>;
};

for (const target of Object.keys(cpf.adopted)) cpf.adopted[target] = { profile: "masked-strict" };

writeFileSync(cpfPath, JSON.stringify(cpf, null, "\t"));

// Only `is-valid-cpf` is benchmarked, so the other two utilities are dropped from the run.
writeFileSync(resolve(tempSpec, "utilities.json"), JSON.stringify({ utilities: ["is-valid-cpf"] }));

execFileSync("node", [resolve(tempSpec, "codegen/emit.ts")], { stdio: "inherit" });

console.log(`corpus: ${corpus.length} inputs`);
console.log(`generated: ${resolve(tempSpec, "generated")}`);
