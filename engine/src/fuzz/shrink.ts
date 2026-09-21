/**
 * Shrinking: turns a failing generated program into the smallest one that still fails the same
 * way, so a report never hands back the raw output of a random search.
 *
 * Two independent axes, both delta-debugging (try a smaller candidate; keep it only if the
 * failure still reproduces; repeat to a fixpoint):
 *
 * - `shrinkInputs` narrows the failing argument tuple toward the edge of each parameter's own
 *   type (zero, an empty or shorter list, `false`) without touching the program at all.
 * - `shrinkProgram` narrows the program itself: dropping a statement, an `if`'s `else`, or a
 *   `switch` case, recompiling after every trial so a candidate that no longer type-checks is
 *   never accepted.
 */

import type { SemType } from "../types.ts";
import type { Value } from "../values.ts";
import type { FuzzFunc, Stmt } from "./ast.ts";

export type Fails = (
	fn: FuzzFunc,
) => { readonly ok: true; readonly input?: readonly Value[] } | { readonly ok: false };

/** Every statement-list-valued position reachable one step into `stmt`, paired with a rebuilder. */
function* statementVariants(stmt: Stmt): Generator<Stmt> {
	switch (stmt.k) {
		case "if":
			if (stmt.else_ !== undefined) yield { ...stmt, else_: undefined };
			for (const body of blockVariants(stmt.then)) yield { ...stmt, then: body };
			if (stmt.else_ !== undefined) {
				for (const body of blockVariants(stmt.else_)) yield { ...stmt, else_: body };
			}
			return;
		case "forCounted":
			for (const body of blockVariants(stmt.body)) yield { ...stmt, body };
			return;
		case "forOf":
			for (const body of blockVariants(stmt.body)) yield { ...stmt, body };
			return;
		case "switch": {
			for (let i = 0; i < stmt.cases.length; i++) {
				if (stmt.cases[i]!.test === undefined) continue;
				yield { ...stmt, cases: [...stmt.cases.slice(0, i), ...stmt.cases.slice(i + 1)] };
			}
			for (let i = 0; i < stmt.cases.length; i++) {
				for (const body of blockVariants(stmt.cases[i]!.body)) {
					const cases = [...stmt.cases];
					cases[i] = { ...cases[i]!, body };
					yield { ...stmt, cases };
				}
			}
			return;
		}
		default:
			return;
	}
}

/** Every smaller variant of a statement list: one statement dropped, or one nested shrink applied. */
function* blockVariants(stmts: readonly Stmt[]): Generator<Stmt[]> {
	for (let i = 0; i < stmts.length; i++) {
		yield [...stmts.slice(0, i), ...stmts.slice(i + 1)];
	}
	for (let i = 0; i < stmts.length; i++) {
		for (const replacement of statementVariants(stmts[i]!)) {
			yield [...stmts.slice(0, i), replacement, ...stmts.slice(i + 1)];
		}
	}
}

/**
 * Repeatedly replaces the program with the first smaller variant that still fails, until a full
 * pass over the current program finds none. `budget` bounds how many candidates are tried in
 * total, so a pathological program cannot make a report hang.
 */
export function shrinkProgram(
	fn: FuzzFunc,
	fails: Fails,
	budget = 400,
): { fn: FuzzFunc; input?: readonly Value[] } {
	let current = fn;
	let bestInput: readonly Value[] | undefined;
	let spent = 0;
	let improved = true;
	while (improved && spent < budget) {
		improved = false;
		for (const body of blockVariants(current.body)) {
			if (spent >= budget) break;
			spent += 1;
			const candidate: FuzzFunc = { ...current, body };
			const result = fails(candidate);
			if (!result.ok) continue;
			current = candidate;
			if (result.input !== undefined) bestInput = result.input;
			improved = true;
			break;
		}
	}
	return { fn: current, input: bestInput };
}

/** Every literal integer reachable inside an expression, for shrinking a value toward zero. */
function shrinkIntTarget(lo: bigint, hi: bigint, value: bigint): bigint | undefined {
	if (value === 0n) return undefined;
	const towardZero = value > 0n ? value - 1n : value + 1n;
	// Halving converges in O(log n) instead of O(n) for a wide range; either way the candidate
	// must stay inside the type's own proven bounds.
	const halved = value / 2n;
	const candidate = halved !== value ? halved : towardZero;
	return candidate < lo ? lo : candidate > hi ? hi : candidate;
}

/**
 * Narrows a failing input tuple toward the smallest values, in place, at each parameter's own
 * type — no recompilation involved, since the program and its declared types never change.
 */
export function shrinkInputs(
	input: readonly Value[],
	paramTypes: readonly SemType[],
	fails: (candidate: readonly Value[]) => boolean,
	budget = 300,
): readonly Value[] {
	let current = [...input];
	let spent = 0;
	let improved = true;
	while (improved && spent < budget) {
		improved = false;
		for (let i = 0; i < current.length; i++) {
			if (spent >= budget) break;
			for (const candidateValue of shrinkOneValue(current[i]!, paramTypes[i]!)) {
				if (spent >= budget) break;
				spent += 1;
				const trial = [...current];
				trial[i] = candidateValue;
				if (fails(trial)) {
					current = trial;
					improved = true;
					break;
				}
			}
			if (improved) break;
		}
	}
	return current;
}

function* shrinkOneValue(value: Value, type: SemType): Generator<Value> {
	if (type.kind === "Int" && typeof value === "bigint") {
		const next = shrinkIntTarget(type.lo, type.hi, value);
		if (next !== undefined) yield next;
		return;
	}
	if (type.kind === "Bool" && typeof value === "boolean") {
		if (value) yield false;
		return;
	}
	if (type.kind === "List" && Array.isArray(value)) {
		if (value.length > type.min) {
			yield value.slice(0, value.length - 1);
			yield value.slice(1);
		}
		for (let i = 0; i < value.length; i++) {
			for (const smaller of shrinkOneValue(value[i]!, type.elem)) {
				yield [...value.slice(0, i), smaller, ...value.slice(i + 1)];
			}
		}
		return;
	}
	if (type.kind === "String" && typeof value === "string") {
		const points = [...value];
		if (points.length > type.min) yield points.slice(0, -1).join("");
	}
}
