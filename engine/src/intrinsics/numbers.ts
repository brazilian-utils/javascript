/**
 * `int`, `float` and the structural equality every type shares.
 *
 * Integers are mathematical: there is no wraparound anywhere, and every result carries the range
 * proven from its operands, which is what lets a backend pick a representation it can prove safe.
 * `/` and `%` are truncated (the sign of the dividend), the behavior of JavaScript, Go, Java and
 * C#; the Python backend emits the equivalent because Python's `%` is floored.
 */

import type { SemType } from "../types.ts";
import {
	rangeAdd,
	rangeDiv,
	rangeMod,
	rangeMul,
	rangeSub,
	tBool,
	tFloat,
	tInt,
	typeToString,
} from "../types.ts";
import { asBigInt, asNumber, valuesEqual } from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind } from "./registry.ts";

function intPair(name: string, args: readonly SemType[]) {
	expectArity(name, args, 2);
	return [expectKind(name, args, 0, "Int"), expectKind(name, args, 1, "Int")] as const;
}

function floatPair(name: string, args: readonly SemType[]) {
	expectArity(name, args, 2);
	expectKind(name, args, 0, "Float");
	expectKind(name, args, 1, "Float");
}

const arithmetic: Record<string, (a: bigint, b: bigint) => bigint> = {
	add: (a, b) => a + b,
	sub: (a, b) => a - b,
	mul: (a, b) => a * b,
};

for (const [op, apply] of Object.entries(arithmetic)) {
	defineIntrinsic({
		name: `int.${op}`,
		doc: `Exact integer ${op}.`,
		signature: (args) => {
			const [left, right] = intPair(`int.${op}`, args);
			const range =
				op === "add"
					? rangeAdd(left, right)
					: op === "sub"
						? rangeSub(left, right)
						: rangeMul(left, right);
			return tInt(range.lo, range.hi);
		},
		evaluate: ([left, right]) => apply(asBigInt(left!), asBigInt(right!)),
	});
}

function requireNonZero(name: string, divisor: Extract<SemType, { kind: "Int" }>): void {
	if (divisor.lo <= 0n && divisor.hi >= 0n) {
		throw new SignatureError(
			`${name}: the divisor may be zero (${typeToString(divisor)})`,
			"guard the divisor, or derive it from a range that excludes zero",
		);
	}
}

defineIntrinsic({
	name: "int.div",
	doc: "Truncated integer division. The divisor must be proven non-zero.",
	signature: (args) => {
		const [left, right] = intPair("int.div", args);
		requireNonZero("int.div", right);
		const range = rangeDiv(left, right);
		return tInt(range.lo, range.hi);
	},
	evaluate: ([left, right]) => asBigInt(left!) / asBigInt(right!),
});

defineIntrinsic({
	name: "int.mod",
	doc: "Remainder with the sign of the dividend. The divisor must be proven non-zero.",
	signature: (args) => {
		const [left, right] = intPair("int.mod", args);
		requireNonZero("int.mod", right);
		const range = rangeMod(left, right);
		return tInt(range.lo, range.hi);
	},
	evaluate: ([left, right]) => asBigInt(left!) % asBigInt(right!),
});

defineIntrinsic({
	name: "int.neg",
	doc: "Integer negation. Exact, like every integer operation: there is no wraparound.",
	signature: (args) => {
		expectArity("int.neg", args, 1);
		const value = expectKind("int.neg", args, 0, "Int");
		return tInt(-value.hi, -value.lo);
	},
	evaluate: ([value]) => -asBigInt(value!),
});

defineIntrinsic({
	name: "int.abs",
	doc: "Absolute value, whose range the checker proves from the operand's.",
	signature: (args) => {
		expectArity("int.abs", args, 1);
		const value = expectKind("int.abs", args, 0, "Int");
		const candidates = [value.lo < 0n ? -value.lo : value.lo, value.hi < 0n ? -value.hi : value.hi];
		const hi = candidates[0]! > candidates[1]! ? candidates[0]! : candidates[1]!;
		const lo = value.lo <= 0n && value.hi >= 0n ? 0n : candidates[0]! < candidates[1]! ? candidates[0]! : candidates[1]!;
		return tInt(lo, hi);
	},
	evaluate: ([value]) => {
		const number = asBigInt(value!);
		return number < 0n ? -number : number;
	},
});

for (const op of ["min", "max"] as const) {
	defineIntrinsic({
		name: `int.${op}`,
		doc: `The ${op} of two integers.`,
		signature: (args) => {
			const [left, right] = intPair(`int.${op}`, args);
			return op === "min"
				? tInt(left.lo < right.lo ? left.lo : right.lo, left.hi < right.hi ? left.hi : right.hi)
				: tInt(left.lo > right.lo ? left.lo : right.lo, left.hi > right.hi ? left.hi : right.hi);
		},
		evaluate: ([left, right]) => {
			const a = asBigInt(left!);
			const b = asBigInt(right!);
			return op === "min" ? (a < b ? a : b) : a > b ? a : b;
		},
	});
}

const comparisons: Record<string, (ordering: number) => boolean> = {
	lt: (ordering) => ordering < 0,
	le: (ordering) => ordering <= 0,
	gt: (ordering) => ordering > 0,
	ge: (ordering) => ordering >= 0,
};

for (const [op, holds] of Object.entries(comparisons)) {
	defineIntrinsic({
		name: `int.${op}`,
		doc: `Integer comparison (${op}).`,
		signature: (args) => {
			intPair(`int.${op}`, args);
			return tBool;
		},
		evaluate: ([left, right]) => {
			const a = asBigInt(left!);
			const b = asBigInt(right!);
			return holds(a < b ? -1 : a > b ? 1 : 0);
		},
	});

	defineIntrinsic({
		name: `float.${op}`,
		doc: `Float comparison (${op}).`,
		signature: (args) => {
			floatPair(`float.${op}`, args);
			return tBool;
		},
		evaluate: ([left, right]) => {
			const a = asNumber(left!);
			const b = asNumber(right!);
			return holds(a < b ? -1 : a > b ? 1 : 0);
		},
	});
}

const floatArithmetic: Record<string, (a: number, b: number) => number> = {
	add: (a, b) => a + b,
	sub: (a, b) => a - b,
	mul: (a, b) => a * b,
	div: (a, b) => a / b,
};

for (const [op, apply] of Object.entries(floatArithmetic)) {
	defineIntrinsic({
		name: `float.${op}`,
		doc: `IEEE-754 binary64 ${op}, correctly rounded in every target.`,
		signature: (args) => {
			floatPair(`float.${op}`, args);
			return tFloat;
		},
		evaluate: ([left, right]) => apply(asNumber(left!), asNumber(right!)),
	});
}

defineIntrinsic({
	name: "float.neg",
	doc: "Float negation, which preserves the sign of zero.",
	signature: (args) => {
		expectArity("float.neg", args, 1);
		expectKind("float.neg", args, 0, "Float");
		return tFloat;
	},
	evaluate: ([value]) => -asNumber(value!),
});

defineIntrinsic({
	name: "float.fromInt",
	doc: "Exact conversion of an integer whose range fits binary64 without rounding.",
	signature: (args) => {
		expectArity("float.fromInt", args, 1);
		const value = expectKind("float.fromInt", args, 0, "Int");
		const limit = 2n ** 53n;
		if (value.lo < -limit || value.hi > limit) {
			throw new SignatureError(
				`float.fromInt: ${typeToString(value)} does not convert exactly to binary64`,
				"narrow the integer's range, or keep the value as a Decimal",
			);
		}
		return tFloat;
	},
	evaluate: ([value]) => Number(asBigInt(value!)),
});

defineIntrinsic({
	name: "core.eq",
	doc: "Structural equality. Both sides must have the same shape.",
	signature: (args) => {
		expectArity("core.eq", args, 2);
		const left = args[0]!;
		const right = args[1]!;
		if (left.kind !== right.kind && left.kind !== "Never" && right.kind !== "Never") {
			throw new SignatureError(
				`cannot compare ${typeToString(left)} with ${typeToString(right)}`,
				"compare values of the same type; there is no implicit conversion",
			);
		}
		if (left.kind === "Float") {
			throw new SignatureError(
				"floats are not compared with ===",
				"compare with an explicit tolerance, or use Decimal",
			);
		}
		return tBool;
	},
	evaluate: ([left, right]) => valuesEqual(left!, right!),
});
