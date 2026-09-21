/**
 * The intrinsic registry: one specification per operation, shared by the checker, the reference
 * interpreter, the comptime evaluator and every backend.
 *
 * An intrinsic exists only when it passes the admission rule (docs/semantics.md, "Admission"):
 * it cannot be expressed efficiently and idiomatically as source library code, it has a precise
 * spec with a reference implementation and vectors, and at least two utilities need it or it is a
 * prerequisite of one that is admitted.
 */

import type { EffectSet } from "../effects.ts";
import { PURE } from "../effects.ts";
import type { SemType } from "../types.ts";
import { typeToString } from "../types.ts";
import type { RecordValue, Value } from "../values.ts";

/** Raised by a signature when the call does not type check, or lacks a required fact. */
export class SignatureError extends Error {
	readonly suggestion: string | undefined;

	constructor(message: string, suggestion?: string) {
		super(message);
		this.name = "SignatureError";
		this.suggestion = suggestion;
	}
}

/** A domain failure raised by `throw` in source, or by a failing intrinsic. */
export class DomainFailure extends Error {
	readonly errorType: string;

	constructor(errorType: string, message: string) {
		super(message);
		this.name = "DomainFailure";
		this.errorType = errorType;
	}
}

/** The capabilities the reference interpreter hands to effectful intrinsics. */
export type EvalContext = {
	/** `undefined` models a transport error or a timeout. */
	readonly http: (request: RecordValue) => RecordValue | undefined;
	readonly now: () => bigint;
	readonly sleep: (milliseconds: bigint) => void;
	readonly nextU32: () => bigint;
};

export type IntrinsicDef = {
	readonly name: string;
	readonly doc: string;
	readonly effects: EffectSet;
	/** Computes the result type, or throws `SignatureError` with a span-free explanation. */
	readonly signature: (args: readonly SemType[]) => SemType;
	readonly evaluate: (args: readonly Value[], ctx: EvalContext) => Value;
	/** False when the result may not be baked at compile time (capabilities). */
	readonly comptime: boolean;
	/**
	 * Parameter types of a lambda argument, given the types of the arguments before it. Combinators
	 * declare this so the checker can type a lambda body against the element type it will receive,
	 * which is why authors never annotate a combinator's lambda.
	 */
	readonly lambdaParams?: (prior: readonly SemType[], index: number) => readonly SemType[];
	/**
	 * The type an argument is expected to have, which lets a record literal be written inline at
	 * the call site the way it is for a declared function.
	 */
	readonly paramHint?: (index: number, prior: readonly SemType[]) => SemType | undefined;
};

const registry = new Map<string, IntrinsicDef>();

export function defineIntrinsic(
	def: Omit<IntrinsicDef, "comptime" | "effects"> & {
		effects?: EffectSet;
		comptime?: boolean;
	},
): IntrinsicDef {
	const effects = def.effects ?? PURE;
	const full: IntrinsicDef = {
		...def,
		effects,
		comptime: def.comptime ?? (effects.http || effects.clock || effects.random ? false : true),
	};
	if (registry.has(full.name)) throw new Error(`duplicate intrinsic ${full.name}`);
	registry.set(full.name, full);
	return full;
}

export function lookupIntrinsic(name: string): IntrinsicDef | undefined {
	return registry.get(name);
}

export function allIntrinsics(): readonly IntrinsicDef[] {
	return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ *
 * Signature helpers
 * ------------------------------------------------------------------ */

export function expectArity(name: string, args: readonly SemType[], arity: number): void {
	if (args.length !== arity) {
		throw new SignatureError(`${name} takes ${arity} argument(s), got ${args.length}`);
	}
}

export function expectKind<K extends SemType["kind"]>(
	name: string,
	args: readonly SemType[],
	index: number,
	kind: K,
): Extract<SemType, { kind: K }> {
	const arg = args[index];
	if (arg === undefined || arg.kind !== kind) {
		throw new SignatureError(
			`${name}: argument ${index} must be ${kind}, got ${arg === undefined ? "nothing" : typeToString(arg)}`,
		);
	}
	return arg as Extract<SemType, { kind: K }>;
}

/** Requires a proven character class on a string argument; this is how facts gate lowerings. */
export function expectStringClass(
	name: string,
	args: readonly SemType[],
	index: number,
	cls: "ascii" | "digits",
): Extract<SemType, { kind: "String" }> {
	const arg = expectKind(name, args, index, "String");
	const ok = cls === "ascii" ? arg.cls !== "none" : arg.cls === "digits";
	if (!ok) {
		throw new SignatureError(
			`${name}: argument ${index} must be proven ${cls}, got ${typeToString(arg)}`,
			`narrow it first, for example with a regex guard (\`if (!re.test(PATTERN, value)) …\`) or \`str.as${cls === "ascii" ? "Ascii" : "Digits"}\``,
		);
	}
	return arg;
}
