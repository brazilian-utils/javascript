/**
 * `dec`: exact decimal arithmetic.
 *
 * Every operation that can lose information (division, rescale, conversion from a float) names
 * its scale and its rounding mode at the call site. There is no hidden global context, which is
 * what Python's 28-digit default context and Java's throwing `BigDecimal.divide` would otherwise
 * impose on the generated code.
 */

import type { SemType } from "../types.ts";
import { tBool, tDecimal, tInt, typeToString } from "../types.ts";
import { asBigInt, asDecimal, asNumber, asString, decimal } from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind } from "./registry.ts";

export const ROUNDING_MODES = [
	"half-even",
	"half-up",
	"half-down",
	"down",
	"up",
	"ceil",
	"floor",
] as const;

export type RoundingMode = (typeof ROUNDING_MODES)[number];

/** Rounds `numerator / denominator` (denominator > 0) to an integer under `mode`. */
export function roundQuotient(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
	const negative = numerator < 0n;
	const absolute = negative ? -numerator : numerator;
	const quotient = absolute / denominator;
	const remainder = absolute % denominator;
	if (remainder === 0n) return negative ? -quotient : quotient;

	const twice = remainder * 2n;
	let rounded: bigint;
	switch (mode) {
		case "down":
			rounded = quotient;
			break;
		case "up":
			rounded = quotient + 1n;
			break;
		case "ceil":
			rounded = negative ? quotient : quotient + 1n;
			break;
		case "floor":
			rounded = negative ? quotient + 1n : quotient;
			break;
		case "half-up":
			rounded = twice >= denominator ? quotient + 1n : quotient;
			break;
		case "half-down":
			rounded = twice > denominator ? quotient + 1n : quotient;
			break;
		case "half-even":
			rounded =
				twice > denominator || (twice === denominator && quotient % 2n === 1n)
					? quotient + 1n
					: quotient;
			break;
		default: {
			const exhaustive: never = mode;
			return exhaustive;
		}
	}
	return negative ? -rounded : rounded;
}

/** The exact value of a binary64 as a rational, so conversions never go through a decimal string. */
export function floatToRational(value: number): { numerator: bigint; denominator: bigint } {
	if (!Number.isFinite(value)) throw new Error("float is not finite");
	const view = new DataView(new ArrayBuffer(8));
	view.setFloat64(0, value);
	const bits = view.getBigUint64(0);
	const sign = bits >> 63n === 1n ? -1n : 1n;
	const exponent = Number((bits >> 52n) & 0x7ffn);
	const mantissa = bits & 0xf_ffff_ffff_ffffn;
	const significand = exponent === 0 ? mantissa : mantissa | (1n << 52n);
	const power = (exponent === 0 ? 1 : exponent) - 1075;
	if (power >= 0) {
		return { numerator: sign * significand * 2n ** BigInt(power), denominator: 1n };
	}
	return { numerator: sign * significand, denominator: 2n ** BigInt(-power) };
}

function constantScale(name: string, args: readonly SemType[], index: number): number {
	const arg = expectKind(name, args, index, "Int");
	if (arg.lo !== arg.hi) {
		throw new SignatureError(
			`${name}: the scale must be a compile-time constant, got ${typeToString(arg)}`,
			"pass a literal, for example 2",
		);
	}
	return Number(arg.lo);
}

function roundingMode(name: string, args: readonly SemType[], index: number): void {
	const arg = args[index];
	if (arg === undefined || arg.kind !== "Enum") {
		throw new SignatureError(`${name}: argument ${index} must be a rounding mode`);
	}
	for (const member of arg.members) {
		if (!(ROUNDING_MODES as readonly string[]).includes(member)) {
			throw new SignatureError(
				`${name}: ${JSON.stringify(member)} is not a rounding mode`,
				`use one of ${ROUNDING_MODES.join(", ")}`,
			);
		}
	}
}

defineIntrinsic({
	name: "dec.fromScaled",
	doc: "A decimal from its unscaled integer and a constant scale: fromScaled(1234, 2) is 12.34.",
	signature: (args) => {
		expectArity("dec.fromScaled", args, 2);
		expectKind("dec.fromScaled", args, 0, "Int");
		return tDecimal(constantScale("dec.fromScaled", args, 1));
	},
	evaluate: ([unscaled, scale]) => decimal(asBigInt(unscaled!), Number(asBigInt(scale!))),
});

defineIntrinsic({
	name: "dec.fromInt",
	doc: "An exact decimal from an integer, at a constant scale.",
	signature: (args) => {
		expectArity("dec.fromInt", args, 2);
		expectKind("dec.fromInt", args, 0, "Int");
		return tDecimal(constantScale("dec.fromInt", args, 1));
	},
	evaluate: ([value, scale]) => {
		const places = Number(asBigInt(scale!));
		return decimal(asBigInt(value!) * 10n ** BigInt(places), places);
	},
});

defineIntrinsic({
	name: "dec.fromFloat",
	doc: "Rounds the exact binary64 value to a constant scale under an explicit rounding mode.",
	signature: (args) => {
		expectArity("dec.fromFloat", args, 3);
		expectKind("dec.fromFloat", args, 0, "Float");
		const scale = constantScale("dec.fromFloat", args, 1);
		roundingMode("dec.fromFloat", args, 2);
		return tDecimal(scale);
	},
	evaluate: ([value, scale, mode]) => {
		const places = Number(asBigInt(scale!));
		const { numerator, denominator } = floatToRational(asNumber(value!));
		const scaled = roundQuotient(
			numerator * 10n ** BigInt(places),
			denominator,
			asString(mode!) as RoundingMode,
		);
		return decimal(scaled, places);
	},
});

function sameScale(name: string, args: readonly SemType[]) {
	const left = expectKind(name, args, 0, "Decimal");
	const right = expectKind(name, args, 1, "Decimal");
	if (left.scale !== right.scale) {
		throw new SignatureError(
			`${name}: both operands must have the same scale (${left.scale} vs ${right.scale})`,
			"rescale one side explicitly with dec.rescale",
		);
	}
	return left;
}

for (const op of ["add", "sub"] as const) {
	defineIntrinsic({
		name: `dec.${op}`,
		doc: `Exact decimal ${op}; both operands share a scale.`,
		signature: (args) => {
			expectArity(`dec.${op}`, args, 2);
			return tDecimal(sameScale(`dec.${op}`, args).scale);
		},
		evaluate: ([left, right]) => {
			const a = asDecimal(left!);
			const b = asDecimal(right!);
			return decimal(op === "add" ? a.unscaled + b.unscaled : a.unscaled - b.unscaled, a.scale);
		},
	});
}

defineIntrinsic({
	name: "dec.mul",
	doc: "Exact decimal multiplication; the result's scale is the sum of the operands' scales.",
	signature: (args) => {
		expectArity("dec.mul", args, 2);
		const left = expectKind("dec.mul", args, 0, "Decimal");
		const right = expectKind("dec.mul", args, 1, "Decimal");
		return tDecimal(left.scale + right.scale);
	},
	evaluate: ([left, right]) => {
		const a = asDecimal(left!);
		const b = asDecimal(right!);
		return decimal(a.unscaled * b.unscaled, a.scale + b.scale);
	},
});

defineIntrinsic({
	name: "dec.divRound",
	doc: "Division to an explicit scale under an explicit rounding mode.",
	signature: (args) => {
		expectArity("dec.divRound", args, 4);
		expectKind("dec.divRound", args, 0, "Decimal");
		expectKind("dec.divRound", args, 1, "Decimal");
		const scale = constantScale("dec.divRound", args, 2);
		roundingMode("dec.divRound", args, 3);
		return tDecimal(scale);
	},
	evaluate: ([left, right, scale, mode]) => {
		const a = asDecimal(left!);
		const b = asDecimal(right!);
		if (b.unscaled === 0n) throw new Error("dec.divRound: division by zero");
		const places = Number(asBigInt(scale!));
		const numerator = a.unscaled * 10n ** BigInt(places + b.scale);
		const denominator = b.unscaled * 10n ** BigInt(a.scale);
		const negativeDenominator = denominator < 0n;
		const rounded = roundQuotient(
			negativeDenominator ? -numerator : numerator,
			negativeDenominator ? -denominator : denominator,
			asString(mode!) as RoundingMode,
		);
		return decimal(rounded, places);
	},
});

defineIntrinsic({
	name: "dec.rescale",
	doc: "Changes the scale under an explicit rounding mode.",
	signature: (args) => {
		expectArity("dec.rescale", args, 3);
		expectKind("dec.rescale", args, 0, "Decimal");
		const scale = constantScale("dec.rescale", args, 1);
		roundingMode("dec.rescale", args, 2);
		return tDecimal(scale);
	},
	evaluate: ([value, scale, mode]) => {
		const item = asDecimal(value!);
		const places = Number(asBigInt(scale!));
		if (places >= item.scale) {
			return decimal(item.unscaled * 10n ** BigInt(places - item.scale), places);
		}
		return decimal(
			roundQuotient(item.unscaled, 10n ** BigInt(item.scale - places), asString(mode!) as RoundingMode),
			places,
		);
	},
});

defineIntrinsic({
	name: "dec.compare",
	doc: "Exact comparison: -1, 0 or 1.",
	signature: (args) => {
		expectArity("dec.compare", args, 2);
		sameScale("dec.compare", args);
		return tInt(-1n, 1n);
	},
	evaluate: ([left, right]) => {
		const a = asDecimal(left!).unscaled;
		const b = asDecimal(right!).unscaled;
		return a < b ? -1n : a > b ? 1n : 0n;
	},
});

defineIntrinsic({
	name: "dec.isNegative",
	doc: "Whether the value is strictly below zero.",
	signature: (args) => {
		expectArity("dec.isNegative", args, 1);
		expectKind("dec.isNegative", args, 0, "Decimal");
		return tBool;
	},
	evaluate: ([value]) => asDecimal(value!).unscaled < 0n,
});

defineIntrinsic({
	name: "dec.abs",
	doc: "Absolute value, keeping the scale.",
	signature: (args) => {
		expectArity("dec.abs", args, 1);
		const value = expectKind("dec.abs", args, 0, "Decimal");
		return tDecimal(value.scale);
	},
	evaluate: ([value]) => {
		const item = asDecimal(value!);
		return decimal(item.unscaled < 0n ? -item.unscaled : item.unscaled, item.scale);
	},
});

defineIntrinsic({
	name: "dec.unscaled",
	doc: "The unscaled integer: dec.unscaled(12.34 at scale 2) is 1234.",
	signature: (args) => {
		expectArity("dec.unscaled", args, 1);
		expectKind("dec.unscaled", args, 0, "Decimal");
		// A Decimal's magnitude is not tracked in its type, so the unscaled integer takes the
		// platform-safe domain; a backend that needs more picks a wide representation.
		return tInt(-(2n ** 53n - 1n), 2n ** 53n - 1n);
	},
	evaluate: ([value]) => asDecimal(value!).unscaled,
});
