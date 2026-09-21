/**
 * Capability threading.
 *
 * The checker already inferred each function's effects bottom-up over the call graph. This pass
 * turns that into a decision every backend can print: which functions receive the capability
 * record. Pure functions never do, which is what keeps generated code free of an ambient
 * environment.
 */

import { needsEnv, unionEffects } from "../effects.ts";
import type { CFunc, CProgram } from "../core/ir.ts";

export function threadCapabilities(program: CProgram): CProgram {
	const functions = new Map(program.functions);

	// Effects are already transitive, but a second closure keeps the pass independent of the order
	// the checker happened to use, which matters once a frontend emits Core directly.
	let changed = true;
	while (changed) {
		changed = false;
		for (const [name, fn] of functions) {
			const merged = unionEffects(fn.effects, ...fn.calls.map((callee) => functions.get(callee)?.effects ?? fn.effects));
			if (
				merged.fail.length !== fn.effects.fail.length ||
				merged.http !== fn.effects.http ||
				merged.clock !== fn.effects.clock ||
				merged.random !== fn.effects.random
			) {
				functions.set(name, { ...fn, effects: merged });
				changed = true;
			}
		}
	}

	for (const [name, fn] of functions) {
		const usesEnv = needsEnv(fn.effects);
		if (usesEnv !== fn.usesEnv) functions.set(name, { ...fn, usesEnv });
	}

	return { ...program, functions };
}

/** Every function reachable from the entry points, in dependency order. */
export function dependencyClosure(program: CProgram, roots: readonly string[]): string[] {
	const seen = new Set<string>();
	const order: string[] = [];
	const visit = (name: string): void => {
		if (seen.has(name)) return;
		seen.add(name);
		const fn: CFunc | undefined = program.functions.get(name);
		if (fn === undefined) return;
		for (const callee of fn.calls) visit(callee);
		order.push(name);
	};
	for (const root of roots) visit(root);
	return order;
}
