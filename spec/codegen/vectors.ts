/**
 * Builds the conformance vectors: the corpus, plus the output the reference interpreter
 * produces for every profile of every utility.
 *
 * The file is stored column wise (one array per profile, indexed by corpus position) because it
 * is meant to be committed and read by six languages, and it records every profile, not only the
 * one a given package adopts, so a package that wants to move between profiles can see exactly
 * which inputs change answer.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCorpus } from "./corpus.ts";
import { type RunOptions, run, setLoader } from "./interpret.ts";
import { loadAll, loadUtility, specRoot } from "./ir.ts";

setLoader(loadUtility);

export type Vectors = {
	corpus: string[];
	utilities: Record<
		string,
		{
			kind: "validator" | "formatter";
			optionSets: RunOptions[];
			/** One entry per corpus input; a formatter entry holds one output per option set. */
			profiles: Record<string, (boolean | string | null)[] | (string | null)[][]>;
		}
	>;
};

const optionSetsFor = (options: string[]): RunOptions[] => {
	let sets: RunOptions[] = [{}];

	for (const option of options) sets = sets.flatMap((set) => [set, { ...set, [option]: true }]);

	return sets;
};

export const build = (size: number): Vectors => {
	const corpus = buildCorpus(size).slice(0, size);
	const utilities: Vectors["utilities"] = {};

	for (const spec of loadAll()) {
		const options = [
			...new Set(Object.values(spec.adopted).flatMap((adoption) => adoption.options ?? [])),
		];
		const optionSets = spec.kind === "formatter" ? optionSetsFor(options) : [{}];
		const profiles: Vectors["utilities"][string]["profiles"] = {};

		for (const profile of Object.keys(spec.profiles)) {
			profiles[profile] =
				spec.kind === "validator"
					? corpus.map((input) => run(spec, profile, input) as boolean)
					: corpus.map((input) =>
							optionSets.map((set) => run(spec, profile, input, set) as string | null),
						);
		}

		utilities[spec.id] = { kind: spec.kind, optionSets, profiles };
	}

	return { corpus, utilities };
};

if (process.argv[1]?.endsWith("vectors.ts")) {
	const size = Number(process.argv[2] ?? 750);
	const vectors = build(size);
	const path = resolve(specRoot, "vectors/conformance.json");

	writeFileSync(path, `${JSON.stringify(vectors)}\n`);

	const checks = Object.values(vectors.utilities).reduce(
		(total, utility) =>
			total +
			Object.keys(utility.profiles).length * vectors.corpus.length * utility.optionSets.length,
		0,
	);

	console.log(`wrote ${path} — ${vectors.corpus.length} inputs, ${checks} expectations`);
}
