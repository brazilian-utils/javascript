/**
 * Checks the specs against the libraries the organisation already publishes.
 *
 * For every sibling checkout it is pointed at, it runs that package's own functions over the
 * corpus and compares the answers with the profile the spec says that package implements. A
 * disagreement means the spec is wrong about a shipped contract, which is the only thing that
 * could make a generated package a breaking change.
 *
 * Usage: node spec/conformance/upstream.ts --python ../python --ruby ../ruby --go ../go
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { loadAll, specRoot } from "../codegen/ir.ts";
import { type Vectors } from "../codegen/vectors.ts";

type ProbeResults = Record<string, (boolean | string | null)[]>;

const vectors = JSON.parse(
	readFileSync(resolve(specRoot, "vectors/conformance.json"), "utf8"),
) as Vectors;

const specs = loadAll();
const corpus = JSON.stringify(vectors.corpus);
const probes = resolve(import.meta.dirname, "probes");

const args = process.argv.slice(2);
const checkouts = new Map<string, string>();

for (let index = 0; index < args.length; index += 2) {
	if (!args[index].startsWith("--")) throw new Error(`unexpected argument: ${args[index]}`);

	checkouts.set(args[index].slice(2), resolve(args[index + 1]));
}

const runProbe = (language: string, checkout: string): ProbeResults => {
	switch (language) {
		case "python": {
			return JSON.parse(
				execFileSync("python3", [join(probes, "python-probe.py"), checkout], {
					input: corpus,
					encoding: "utf8",
					maxBuffer: 64 * 1024 * 1024,
				}),
			) as ProbeResults;
		}
		case "ruby": {
			return JSON.parse(
				execFileSync("ruby", [join(probes, "ruby-probe.rb"), checkout], {
					input: corpus,
					encoding: "utf8",
					maxBuffer: 64 * 1024 * 1024,
				}),
			) as ProbeResults;
		}
		case "go": {
			const work = mkdtempSync(join(tmpdir(), "brutils-go-probe-"));

			writeFileSync(
				join(work, "go.mod"),
				`module brutilsprobe\n\ngo 1.23\n\nrequire github.com/brazilian-utils/go v0.0.0\n\nreplace github.com/brazilian-utils/go => ${checkout}\n`,
			);
			writeFileSync(join(work, "main.go"), readFileSync(join(probes, "go-probe.go"), "utf8"));

			const output = execFileSync("go", ["run", "."], {
				cwd: work,
				input: corpus,
				encoding: "utf8",
				env: { ...process.env, GOFLAGS: "-mod=mod" },
				maxBuffer: 64 * 1024 * 1024,
			});

			rmSync(work, { recursive: true, force: true });

			return JSON.parse(output) as ProbeResults;
		}
		case "rust": {
			const work = mkdtempSync(join(tmpdir(), "brutils-rust-probe-"));

			execFileSync(
				"rustc",
				[
					"--edition",
					"2021",
					"-o",
					join(work, "probe"),
					join(probes, "rust-probe.rs"),
					"--extern",
					`brazilian_utils=${join(checkout, "target/debug/libbrazilian_utils.rlib")}`,
					"-L",
					join(checkout, "target/debug/deps"),
				],
				{ encoding: "utf8" },
			);

			const output = execFileSync(join(work, "probe"), [], {
				input: corpus,
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
			});

			rmSync(work, { recursive: true, force: true });

			return JSON.parse(output) as ProbeResults;
		}
		default: {
			throw new Error(`no probe for ${language}`);
		}
	}
};

let disagreements = 0;

for (const [language, checkout] of checkouts) {
	console.log(`\n${language} — ${checkout}`);

	let results: ProbeResults;

	try {
		results = runProbe(language, checkout);
	} catch (error) {
		console.log(
			`  probe failed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
		);
		continue;
	}

	for (const spec of specs) {
		const adoption = spec.adopted[language];
		const observed = results[spec.id];

		if (adoption === undefined || observed === undefined) continue;

		const utility = vectors.utilities[spec.id];
		const expectedColumn = utility.profiles[adoption.profile];
		const expected =
			spec.kind === "validator"
				? (expectedColumn as boolean[])
				: (expectedColumn as (string | null)[][]).map((outputs) => outputs[0]);

		const known = new Set(
			(adoption.knownDeviations ?? []).flatMap((deviation) => deviation.inputs),
		);
		const mismatches: { input: string; expected: unknown; observed: unknown }[] = [];
		let deviations = 0;

		for (const [index, input] of vectors.corpus.entries()) {
			if (observed[index] === expected[index]) continue;

			if (known.has(input)) {
				deviations++;
				continue;
			}

			mismatches.push({ input, expected: expected[index], observed: observed[index] });
		}

		disagreements += mismatches.length;

		const note = deviations > 0 ? ` (+${deviations} known deviation(s))` : "";
		const verdict =
			mismatches.length === 0
				? `agrees on ${vectors.corpus.length - deviations}/${vectors.corpus.length}${note}`
				: `DIFFERS on ${mismatches.length}/${vectors.corpus.length}${note}`;

		console.log(`  ${spec.id.padEnd(14)} profile ${adoption.profile.padEnd(17)} ${verdict}`);

		for (const mismatch of mismatches.slice(0, 5)) {
			console.log(
				`      input=${JSON.stringify(mismatch.input)} spec=${JSON.stringify(mismatch.expected)} package=${JSON.stringify(mismatch.observed)}`,
			);
		}
	}
}

console.log(`\n${disagreements} disagreement(s) with the published packages`);
