/**
 * What `formatCnpj` is replayed with: the whole CNPJ corpus, under every option combination.
 */
import { type Recorder } from "../cases.ts";
import { cnpjCorpus } from "./_cnpj-corpus.ts";

const OPTIONS = [
	undefined,
	{ version: 2 },
	{ pad: true },
	{ obfuscate: true },
	{ pad: true, version: 2 },
	{ obfuscate: true, version: 2 },
	{ obfuscate: true, pad: true },
];

export const recorder: Recorder = {
	module: "format-cnpj",
	inputs: (shipped) => {
		const corpus = cnpjCorpus(shipped["generateCnpj"] as (version?: 1 | 2) => string);
		const found: unknown[][] = [];

		for (const input of corpus)
			for (const options of OPTIONS) found.push(options === undefined ? [input] : [input, options]);

		return found;
	},
};
