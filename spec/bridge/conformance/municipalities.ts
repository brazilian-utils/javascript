/**
 * Records the municipality dump the generated code has to reproduce, from the package this
 * repository ships.
 *
 * A dump rather than a sample: every municipality of every key is written out, so a single
 * name out of place in one of the seven targets fails the check.
 *
 * Usage: `node spec/bridge/conformance/municipalities.ts`
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const bridge = resolve(import.meta.dirname, "..");
const root = resolve(bridge, "../..");

/**
 * The keys to dump. `*` stands for "no state code at all", which is the only way to ask for the
 * combined list; every other value, an unknown state and an inherited `Object` property name
 * included, has its own answer.
 */
export const KEYS = [
	"*",
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
	"ZZ",
	"sp",
	"",
	"toString",
	"constructor",
	"hasOwnProperty",
];

const outDir = mkdtempSync(join(tmpdir(), "brutils-dump-"));
const bundlePath = join(outDir, "shipped.mjs");

await build({
	entryPoints: [resolve(root, "src/index.ts")],
	bundle: true,
	format: "esm",
	platform: "neutral",
	outfile: bundlePath,
	logLevel: "error",
});

const shipped = (await import(bundlePath)) as {
	getMunicipalities: (stateCode?: string) => { code: string; name: string; stateCode: string }[];
};

rmSync(outDir, { recursive: true, force: true });

const lines: string[] = [];

for (const key of KEYS) {
	const found = key === "*" ? shipped.getMunicipalities() : shipped.getMunicipalities(key);

	lines.push(`${key}\t${found.length}`);

	for (const municipality of found)
		lines.push(`${municipality.code}|${municipality.name}|${municipality.stateCode}`);
}

writeFileSync(resolve(bridge, "conformance/municipalities.expected.txt"), `${lines.join("\n")}\n`);
writeFileSync(resolve(bridge, "conformance/municipalities.keys.txt"), `${KEYS.join("\n")}\n`);

console.log(`${KEYS.length} keys, ${lines.length - KEYS.length} rows recorded from the shipped package`);
