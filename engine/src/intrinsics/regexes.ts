/**
 * `re`: regex matching over a comptime pattern.
 *
 * The pattern is never a run-time value. The frontend requires a literal (or a constant bound to
 * one), normalizes it at compile time, and attaches the normalized form to the Core node as a
 * payload, which is why this intrinsic takes only the subject.
 */

import { MAX_COLLECTION_LENGTH, tBool, tString } from "../types.ts";
import { defineIntrinsic, expectArity, expectKind } from "./registry.ts";

defineIntrinsic({
	name: "re.retain",
	doc: "Keeps only the scalars matching a comptime character class, dropping everything else. The class also refines the result.",
	signature: (args) => {
		expectArity("re.retain", args, 1);
		const text = expectKind("re.retain", args, 0, "String");
		// The result's class comes from the pattern, which the frontend attaches as a payload; the
		// checker narrows it there, because only it knows which class the literal denoted.
		return tString("none", 0, Math.min(text.max, MAX_COLLECTION_LENGTH));
	},
	evaluate: () => {
		throw new Error("re.retain is evaluated with its pattern payload by the interpreter");
	},
});

defineIntrinsic({
	name: "re.test",
	doc: "Whether the whole string matches the pattern. Always a full match; there are no partial matches in the subset.",
	signature: (args) => {
		expectArity("re.test", args, 1);
		expectKind("re.test", args, 0, "String");
		return tBool;
	},
	evaluate: () => {
		throw new Error("re.test is evaluated with its pattern payload by the interpreter");
	},
});
