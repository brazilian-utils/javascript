/**
 * What `isValidCnpj` is replayed with: the whole CNPJ corpus, under every option set.
 */
import { type Recorder } from "../cases.ts";
import { cnpjCorpus } from "./_cnpj-corpus.ts";

const OPTIONS = [undefined, { version: 1 }, { version: 2 }];

export const recorder: Recorder = {
	module: "is-valid-cnpj",
	inputs: (shipped) => {
		const corpus = cnpjCorpus(shipped["generateCnpj"] as (version?: 1 | 2) => string);
		const found: unknown[][] = [];

		for (const input of corpus)
			for (const options of OPTIONS) found.push(options === undefined ? [input] : [input, options]);

		return found;
	},
};
