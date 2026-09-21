/**
 * Lowering selection.
 *
 * Each target declares, per intrinsic, the ways it could implement that operation, what it needs
 * to be allowed to (facts on the argument types, a language baseline, a dependency) and what it
 * costs. Selection is deterministic and explainable, and the compiler writes the explanation to
 * `LOWERING.md` so a reviewer sees why a native lowering was or was not taken.
 */

import type { NormalizedRegex } from "../regex.ts";
import type { SemType } from "../types.ts";
import { typeToString } from "../types.ts";
import type { TExpr } from "./tast.ts";

export type CostClass = {
	readonly alloc: "none" | "one" | "many";
	readonly time: "constant" | "linear" | "nlogn" | "quadratic";
};

export type Impl = "native" | "library" | "portable";

export type EmitContext = {
	/** Records a module the emitted code needs (an import line in the generated file). */
	readonly require: (module: string) => void;
	/** Target identifier of a generated core function, used by portable lowerings. */
	readonly nameOf: (qualified: string) => string;
	/** Marks a source library function as needed, so it lands in the dependency closure. */
	readonly needSource: (qualified: string) => void;
	/** The expression holding the capability record inside the current function. */
	readonly env: () => TExpr;
	/** The normalized pattern, for the `re.test` lowerings. */
	readonly regex?: NormalizedRegex;
};

export type Candidate = {
	readonly op: string;
	readonly impl: Impl;
	/** The preconditions the argument types must satisfy for this lowering to be admissible. */
	readonly requires?: (args: readonly SemType[]) => boolean;
	/** Why the precondition exists, printed in `LOWERING.md`. */
	readonly because?: string;
	readonly deps?: readonly string[];
	readonly cost: CostClass;
	readonly emit: (args: readonly TExpr[], types: readonly SemType[], ctx: EmitContext) => TExpr;
	/** For a portable lowering: the source library function that implements the operation. */
	readonly sourceFn?: string;
};

const ALLOC_RANK: Record<CostClass["alloc"], number> = { none: 0, one: 1, many: 2 };
const TIME_RANK: Record<CostClass["time"], number> = {
	constant: 0,
	linear: 1,
	nlogn: 2,
	quadratic: 3,
};
const IMPL_RANK: Record<Impl, number> = { native: 0, library: 1, portable: 2 };

export type Selection = {
	readonly candidate: Candidate;
	readonly reason: string;
	readonly rejected: readonly { readonly impl: Impl; readonly because: string }[];
};

export class LoweringTable {
	private readonly byOp = new Map<string, Candidate[]>();
	readonly selections: { op: string; args: string; impl: Impl; reason: string }[] = [];

	constructor(candidates: readonly Candidate[]) {
		for (const candidate of candidates) {
			const existing = this.byOp.get(candidate.op);
			if (existing === undefined) this.byOp.set(candidate.op, [candidate]);
			else existing.push(candidate);
		}
	}

	has(op: string): boolean {
		return this.byOp.has(op);
	}

	/**
	 * Applies the rules lexicographically: admissible candidates first, then the lower declared
	 * cost class, then native before library before portable, then declaration order.
	 */
	select(op: string, args: readonly SemType[]): Selection {
		const candidates = this.byOp.get(op) ?? [];
		const rejected: { impl: Impl; because: string }[] = [];
		const admissible = candidates.filter((candidate, index) => {
			const ok = candidate.requires === undefined || candidate.requires(args);
			if (!ok) {
				rejected.push({
					impl: candidate.impl,
					because: candidate.because ?? `candidate ${index} precondition not met`,
				});
			}
			return ok;
		});
		if (admissible.length === 0) {
			throw new Error(
				`no admissible lowering for ${op}(${args.map(typeToString).join(", ")})${
					rejected.length === 0 ? "" : `; rejected: ${rejected.map((item) => item.because).join("; ")}`
				}`,
			);
		}
		const ordered = [...admissible].sort((left, right) => {
			const alloc = ALLOC_RANK[left.cost.alloc] - ALLOC_RANK[right.cost.alloc];
			if (alloc !== 0) return alloc;
			const time = TIME_RANK[left.cost.time] - TIME_RANK[right.cost.time];
			if (time !== 0) return time;
			return IMPL_RANK[left.impl] - IMPL_RANK[right.impl];
		});
		const chosen = ordered[0]!;
		const reason =
			rejected.length === 0
				? `only candidate, cost ${chosen.cost.alloc}/${chosen.cost.time}`
				: `${chosen.impl}, cost ${chosen.cost.alloc}/${chosen.cost.time}; rejected ${rejected.map((item) => item.because).join(", ")}`;
		this.selections.push({ op, args: args.map(typeToString).join(", "), impl: chosen.impl, reason });
		return { candidate: chosen, reason, rejected };
	}

	/** The reviewable record of every non-trivial selection. */
	renderLoweringDoc(target: string): string {
		const seen = new Map<string, { op: string; args: string; impl: Impl; reason: string }>();
		for (const selection of this.selections) {
			seen.set(`${selection.op}(${selection.args})`, selection);
		}
		const rows = [...seen.values()].sort((left, right) =>
			`${left.op}(${left.args})`.localeCompare(`${right.op}(${right.args})`),
		);
		const lines = [
			`# Lowering selections — ${target}`,
			"",
			"Generated by the engine. Each row is one operation, the argument types it was called",
			"with, the implementation that was selected, and the rule that decided it.",
			"",
			"| operation | argument types | implementation | why |",
			"| --- | --- | --- | --- |",
		];
		for (const selection of rows) {
			lines.push(
				`| \`${selection.op}\` | \`${cell(selection.args)}\` | ${selection.impl} | ${cell(selection.reason)} |`,
			);
		}
		lines.push("");
		const counts = { native: 0, library: 0, portable: 0 };
		for (const selection of seen.values()) counts[selection.impl]++;
		lines.push(
			`Mix: ${counts.native} native, ${counts.library} library, ${counts.portable} portable.`,
			"",
		);
		return lines.join("\n");
	}
}

/** A table cell: an enum type contains `|`, which would otherwise end the column. */
function cell(text: string): string {
	return text.replaceAll("|", "\\|");
}

/* ------------------------------------------------------------------ *
 * Fact helpers used by the capability tables
 * ------------------------------------------------------------------ */

export function argIsAscii(index: number) {
	return (args: readonly SemType[]): boolean => {
		const arg = args[index];
		return arg !== undefined && arg.kind === "String" && arg.cls !== "none";
	};
}

export function argIsDigits(index: number) {
	return (args: readonly SemType[]): boolean => {
		const arg = args[index];
		return arg !== undefined && arg.kind === "String" && arg.cls === "digits";
	};
}

export function argFitsSafeInt(index: number) {
	return (args: readonly SemType[]): boolean => {
		const arg = args[index];
		return arg !== undefined && arg.kind === "Int" && arg.lo >= -(2n ** 53n - 1n) && arg.hi <= 2n ** 53n - 1n;
	};
}

export function always(): boolean {
	return true;
}
