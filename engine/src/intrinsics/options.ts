/**
 * `opt`: explicit absence.
 *
 * `opt.unwrap` is never written by an author: the checker emits it where flow analysis has proven
 * the value present, which is why there is no unchecked access anywhere in generated code.
 */

import { tBool, tOption, typeToString } from "../types.ts";
import { NONE, isNone, unwrap } from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind } from "./registry.ts";

defineIntrinsic({
	name: "opt.isNone",
	doc: "Whether the option is absent. This is what `x === undefined` means in the Core.",
	signature: (args) => {
		expectArity("opt.isNone", args, 1);
		expectKind("opt.isNone", args, 0, "Option");
		return tBool;
	},
	evaluate: ([value]) => isNone(value!),
});

defineIntrinsic({
	name: "opt.unwrap",
	doc: "The value inside an option the checker has proven present.",
	signature: (args) => {
		expectArity("opt.unwrap", args, 1);
		const option = args[0]!;
		if (option.kind !== "Option") {
			throw new SignatureError(`opt.unwrap: expects an Option, got ${typeToString(option)}`);
		}
		return option.inner;
	},
	evaluate: ([value]) => unwrap(value!),
});

defineIntrinsic({
	name: "opt.some",
	doc: "Wraps a present value.",
	signature: (args) => {
		expectArity("opt.some", args, 1);
		return tOption(args[0]!);
	},
	evaluate: ([value]) => ({ __kind: "some", value: value! }),
});

defineIntrinsic({
	name: "opt.orElse",
	doc: "The value, or a default when absent. This is what `??` means in the Core.",
	signature: (args) => {
		expectArity("opt.orElse", args, 2);
		const option = expectKind("opt.orElse", args, 0, "Option");
		return option.inner;
	},
	evaluate: ([value, fallback]) => (isNone(value!) ? fallback! : unwrap(value!)),
});

export const OPTION_NONE = NONE;
