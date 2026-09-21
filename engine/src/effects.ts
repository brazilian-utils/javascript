/**
 * Effects and capabilities.
 *
 * `Fail<E>` records the domain errors a function may raise; `Http`, `Clock` and `Random` are
 * capabilities. The compiler infers all four over the call graph, and threads a capability record
 * into exactly the functions that transitively need one.
 */

export type EffectSet = {
	/** Names of the domain error types the operation may raise. */
	readonly fail: readonly string[];
	readonly http: boolean;
	readonly clock: boolean;
	readonly random: boolean;
};

export const PURE: EffectSet = { fail: [], http: false, clock: false, random: false };

export function effects(partial: Partial<EffectSet>): EffectSet {
	return { ...PURE, ...partial };
}

export function unionEffects(...sets: readonly EffectSet[]): EffectSet {
	const fail = new Set<string>();
	let http = false;
	let clock = false;
	let random = false;
	for (const set of sets) {
		for (const name of set.fail) fail.add(name);
		http ||= set.http;
		clock ||= set.clock;
		random ||= set.random;
	}
	return { fail: [...fail].sort(), http, clock, random };
}

export function withFail(set: EffectSet, errorType: string): EffectSet {
	return unionEffects(set, { fail: [errorType], http: false, clock: false, random: false });
}

/** True when the operation needs the capability record threaded into it. */
export function needsEnv(set: EffectSet): boolean {
	return set.http || set.clock || set.random;
}

export function isPure(set: EffectSet): boolean {
	return set.fail.length === 0 && !needsEnv(set);
}

export function effectsToString(set: EffectSet): string {
	const parts: string[] = [];
	if (set.fail.length > 0) parts.push(...set.fail.map((name) => `Fail<${name}>`));
	if (set.http) parts.push("Http");
	if (set.clock) parts.push("Clock");
	if (set.random) parts.push("Random");
	return parts.length === 0 ? "Pure" : parts.join(" + ");
}

/** True when `a` is allowed wherever `b` is expected. */
export function effectsSubsumed(a: EffectSet, b: EffectSet): boolean {
	return (
		a.fail.every((name) => b.fail.includes(name)) &&
		(!a.http || b.http) &&
		(!a.clock || b.clock) &&
		(!a.random || b.random)
	);
}
