/**
 * The random program generator.
 *
 * Generates a single well-typed function in the engine's subset (`docs/semantics.md` section 7),
 * biased toward the shapes that broke the checker before: loops with `break`/`continue` in every
 * position, accumulators carried across iterations, nested loops, a `switch` inside a loop,
 * indices derived from a loop counter, arithmetic that walks toward a range's bounds, string
 * building, and early `return` from inside a loop.
 *
 * Every mutable integer local is declared `Int` (the full platform-safe domain), never a tight
 * `IntRange`. That is not a simplification that avoids the interesting bugs — the checker still
 * infers and proves a *tight* range for the local on every assignment (that tight range is what a
 * function's declared return type would need to subtype, and it is what `values.ts`'s
 * `withinType` checks the interpreter's real answer against); a wide declared ceiling only means
 * an accumulator never gets rejected for growing wider than its author's intent, which is not
 * the analysis this generator is trying to exercise. This is what makes free-form generation
 * tractable without re-implementing the checker's interval arithmetic to predict the exact range
 * an annotation would need up front.
 *
 * A `seq.get(list, index)` (or `list[index]`) is generated only where the generator itself can
 * see the index is safe — a counted loop's own counter, ranging over a *fixed*-length list's
 * `.length` — which mirrors the loop shape the `break`/`continue` fixpoint bug actually lived in.
 */

import { Rng } from "./rng.ts";
import type { BinOp, Expr, FuzzFunc, Param, Stmt } from "./ast.ts";

type IntInfo = { readonly kind: "int"; readonly lo: bigint; readonly hi: bigint };
type ListInfo = {
	readonly kind: "list";
	readonly elemLo: bigint;
	readonly elemHi: bigint;
	readonly min: number;
	readonly max: number;
};
type BoolInfo = { readonly kind: "bool" };
type EnumInfo = { readonly kind: "enum" };
type VarInfo = IntInfo | ListInfo | BoolInfo | EnumInfo;

type AccKind = "int" | "bool" | "string";

class Ctx {
	readonly rng: Rng;
	readonly scope = new Map<string, VarInfo>();
	readonly mutable = new Set<string>();
	/** index variable name -> list variable names it is proven in range for. */
	readonly safeIndex = new Map<string, Set<string>>();
	enumMembers: readonly string[] | undefined;
	accName = "acc";
	accKind: AccKind = "int";
	private counter = 0;

	constructor(rng: Rng) {
		this.rng = rng;
	}

	fresh(prefix: string): string {
		this.counter += 1;
		return `${prefix}${this.counter}`;
	}

	intVars(exclude: readonly string[] = []): string[] {
		return [...this.scope.entries()]
			.filter(([name, info]) => info.kind === "int" && !exclude.includes(name))
			.map(([name]) => name);
	}

	boolVars(exclude: readonly string[] = []): string[] {
		return [...this.scope.entries()]
			.filter(([name, info]) => info.kind === "bool" && !exclude.includes(name))
			.map(([name]) => name);
	}

	fixedListVars(): string[] {
		return [...this.scope.entries()]
			.filter(([, info]) => info.kind === "list" && info.min === info.max)
			.map(([name]) => name);
	}

	listVars(): string[] {
		return [...this.scope.entries()].filter(([, info]) => info.kind === "list").map(([name]) => name);
	}
}

/** A leaf integer: a small literal, or an in-scope integer variable (not the accumulator). */
function genIntLeaf(ctx: Ctx): Expr {
	const candidates = ctx.intVars([ctx.accName]);
	const options: (readonly [number, () => Expr])[] = [
		[3, () => ({ k: "int", value: BigInt(ctx.rng.int(-20, 20)) })],
	];
	if (candidates.length > 0) {
		options.push([4, () => ({ k: "var", name: ctx.rng.pick(candidates) })]);
	}
	const fixedLists = ctx.fixedListVars();
	// An element access through a counter proven safe for that list — the pattern the historical
	// `break`/`continue` bug lived in, so it is weighted heavily.
	const safePairs: (readonly [string, string])[] = [];
	for (const [indexVar, lists] of ctx.safeIndex) {
		for (const list of lists) if (fixedLists.includes(list)) safePairs.push([indexVar, list]);
	}
	if (safePairs.length > 0) {
		options.push([
			5,
			() => {
				const [indexVar, list] = ctx.rng.pick(safePairs);
				return { k: "index", target: { k: "var", name: list }, index: { k: "var", name: indexVar } };
			},
		]);
	}
	return ctx.rng.weighted(options)();
}

function genIntExpr(ctx: Ctx, depth: number): Expr {
	if (depth <= 0 || ctx.rng.bool(0.45)) return genIntLeaf(ctx);
	const op = ctx.rng.pick<BinOp>(["+", "-", "*", "/", "%"]);
	if (op === "/" || op === "%") {
		// The divisor must be provably non-zero; a positive literal is always provable, and using
		// one on both sides of the idiom-mode boundary is exactly what exercises the Python
		// truncated-vs-floored divergence documented in docs/semantics.md section 2.1.
		const divisor: Expr = { k: "int", value: BigInt(ctx.rng.int(1, 11)) };
		return { k: "bin", op, l: genIntExpr(ctx, depth - 1), r: divisor };
	}
	return { k: "bin", op, l: genIntExpr(ctx, depth - 1), r: genIntExpr(ctx, depth - 1) };
}

function genBoolExpr(ctx: Ctx, depth: number): Expr {
	const boolVars = ctx.boolVars();
	if (depth <= 0 || ctx.rng.bool(0.3)) {
		const options: (readonly [number, () => Expr])[] = [
			[2, () => ({ k: "bool", value: ctx.rng.bool() })],
			[
				5,
				() => ({
					k: "bin",
					op: ctx.rng.pick<BinOp>(["<", "<=", ">", ">=", "===", "!=="]),
					l: genIntExpr(ctx, 1),
					r: genIntExpr(ctx, 1),
				}),
			],
		];
		if (boolVars.length > 0) options.push([2, () => ({ k: "var", name: ctx.rng.pick(boolVars) })]);
		return ctx.rng.weighted(options)();
	}
	if (ctx.rng.bool(0.2)) return { k: "not", e: genBoolExpr(ctx, depth - 1) };
	return {
		k: "logical",
		op: ctx.rng.pick(["&&", "||"]),
		l: genBoolExpr(ctx, depth - 1),
		r: genBoolExpr(ctx, depth - 1),
	};
}

/** An ASCII printable code point (32..126), for the string-building accumulator. */
function genCodePointExpr(ctx: Ctx): Expr {
	const raw = genIntLeaf(ctx);
	// Fold whatever came out into the printable range with a portable, always-safe idiom, rather
	// than trying to prove the leaf itself lands there — a `% 95 + 32` is provably in range from
	// `rangeMod`'s own formula, no matter what the dividend's range is.
	const shifted: Expr = { k: "bin", op: "+", l: raw, r: { k: "int", value: 10_000n } };
	const folded: Expr = { k: "bin", op: "%", l: shifted, r: { k: "int", value: 95n } };
	return { k: "bin", op: "+", l: folded, r: { k: "int", value: 32n } };
}

function accUpdateStmt(ctx: Ctx): Stmt {
	if (ctx.accKind === "bool") {
		return { k: "assign", name: ctx.accName, op: "=", value: genBoolExpr(ctx, 2) };
	}
	if (ctx.accKind === "string") {
		return { k: "push", name: ctx.accName, value: genCodePointExpr(ctx) };
	}
	const op = ctx.rng.pick<"+=" | "-=" | "*=">(["+=", "-=", "*="]);
	// `*=` compounds fast; keep its right-hand side a small literal so the true accumulated value
	// (which must still fit the generator's own sense of "small", see the module doc) does not
	// explode across a loop with dozens of iterations.
	const value = op === "*=" ? { k: "int" as const, value: BigInt(ctx.rng.int(-3, 3)) } : genIntExpr(ctx, 2);
	return { k: "assign", name: ctx.accName, op, value };
}

/** Statements available inside a loop body, weighted toward the bug-relevant shapes. */
function genLoopStmt(ctx: Ctx, loopDepth: number): Stmt {
	const options: (readonly [number, () => Stmt])[] = [
		[5, () => accUpdateStmt(ctx)],
		[3, () => ({ k: "if", test: genBoolExpr(ctx, 2), then: [{ k: "break" }] })],
		[3, () => ({ k: "if", test: genBoolExpr(ctx, 2), then: [{ k: "continue" }] })],
		[
			3,
			() => ({
				k: "if",
				test: genBoolExpr(ctx, 1),
				then: [accUpdateStmt(ctx), { k: "break" }],
				else_: [accUpdateStmt(ctx)],
			}),
		],
	];
	if (ctx.accKind !== "string") {
		options.push([
			1,
			() => ({
				k: "if",
				test: genBoolExpr(ctx, 1),
				then: [{ k: "return", value: { k: "var", name: ctx.accName } }],
			}),
		]);
	}
	if (ctx.enumMembers !== undefined && ctx.scope.has("kind")) {
		options.push([4, () => genSwitch(ctx)]);
	}
	if (loopDepth > 0 && ctx.listVars().length > 0) {
		options.push([3, () => genLoop(ctx, loopDepth - 1)]);
	}
	return ctx.rng.weighted(options)();
}

function genSwitch(ctx: Ctx): Stmt {
	const members = ctx.enumMembers!;
	// A random non-empty, non-total subset gets an explicit case; `default` always covers the
	// rest, so the switch is exhaustive (E_NON_EXHAUSTIVE) no matter how many members are named.
	const shuffled = [...members].sort(() => ctx.rng.float() - 0.5);
	const explicitCount = ctx.rng.int(1, Math.max(1, members.length - 1));
	const cases: { readonly test?: string; readonly body: readonly Stmt[] }[] = shuffled
		.slice(0, explicitCount)
		.map((member) => ({ test: `"${member}"`, body: [accUpdateStmt(ctx), { k: "break" as const }] }));
	cases.push({ body: [accUpdateStmt(ctx), { k: "break" as const }] });
	return { k: "switch", subject: { k: "var", name: "kind" }, cases };
}

/** A loop over a list: counted over a fixed-length list's `.length` (unlocking a safe index), or `for…of`. */
function genLoop(ctx: Ctx, loopDepth: number): Stmt {
	const fixed = ctx.fixedListVars();
	const useCounted = fixed.length > 0 && ctx.rng.bool(0.6);
	if (useCounted) {
		const list = ctx.rng.pick(fixed);
		const info = ctx.scope.get(list) as ListInfo;
		const name = ctx.fresh("i");
		ctx.scope.set(name, { kind: "int", lo: 0n, hi: BigInt(info.max - 1) });
		const forSameLength = new Set(fixed.filter((other) => (ctx.scope.get(other) as ListInfo).max === info.max));
		ctx.safeIndex.set(name, forSameLength);
		const bodyLength = ctx.rng.int(1, 3);
		const body = Array.from({ length: bodyLength }, () => genLoopStmt(ctx, loopDepth));
		ctx.safeIndex.delete(name);
		ctx.scope.delete(name);
		return { k: "forCounted", name, fromN: 0n, to: { k: "length", target: { k: "var", name: list } }, body };
	}
	const list = ctx.rng.pick(ctx.listVars());
	const info = ctx.scope.get(list) as ListInfo;
	const name = ctx.fresh("e");
	ctx.scope.set(name, { kind: "int", lo: info.elemLo, hi: info.elemHi });
	const bodyLength = ctx.rng.int(1, 3);
	const body = Array.from({ length: bodyLength }, () => genLoopStmt(ctx, loopDepth));
	ctx.scope.delete(name);
	return { k: "forOf", name, iterable: { k: "var", name: list }, body };
}

export type GenerateOptions = {
	/** Nesting depth of loops inside loops (the generator never goes deeper than this). */
	readonly maxLoopDepth?: number;
	/**
	 * A unique suffix for the function's and its enum type's names, so several generated programs
	 * can share one module (one compile, instead of one per program) without colliding.
	 */
	readonly id?: string;
};

export function generateProgram(seed: number, options: GenerateOptions = {}): FuzzFunc {
	const rng = new Rng(seed);
	const ctx = new Ctx(rng);
	const maxLoopDepth = options.maxLoopDepth ?? 2;
	const id = options.id ?? "0";
	const enumName = `Kind_${id}`;

	const useEnum = rng.bool(0.45);
	let enumDecl: FuzzFunc["enumDecl"];
	if (useEnum) {
		const memberCount = rng.int(2, 4);
		const members = Array.from({ length: memberCount }, (_, i) => String.fromCharCode(65 + i));
		enumDecl = { name: enumName, members };
		ctx.enumMembers = members;
	}

	const params: Param[] = [];
	const paramCount = rng.int(1, 3) + (useEnum ? 1 : 0);
	let enumPlaced = !useEnum;
	let usedWide = false;
	for (let i = 0; i < paramCount; i++) {
		if (!enumPlaced && (i === paramCount - 1 || rng.bool(0.4))) {
			params.push({ name: "kind", typeAnn: enumName });
			ctx.scope.set("kind", { kind: "enum" });
			enumPlaced = true;
			continue;
		}
		const name = ctx.fresh("p");
		const kind = rng.weighted<"fixedList" | "varList" | "scalar" | "bool">([
			[4, "fixedList"],
			[2, "varList"],
			[3, "scalar"],
			[1, "bool"],
		]);
		if (kind === "bool") {
			params.push({ name, typeAnn: "boolean" });
			ctx.scope.set(name, { kind: "bool" });
		} else if (kind === "scalar") {
			const lo = BigInt(rng.int(-1000, 0));
			const hi = lo + BigInt(rng.int(1, 2000));
			params.push({ name, typeAnn: `IntRange<${lo}, ${hi}>` });
			ctx.scope.set(name, { kind: "int", lo, hi });
		} else {
			const elemLo = BigInt(rng.int(-5, 0));
			const elemHi = elemLo + BigInt(rng.int(3, 15));
			// Occasionally push a list past the exact-fixpoint threshold (64 trip counts, see
			// docs/semantics.md section 2.2) so the widen/clamp path gets exercised too, not just
			// the small exact case the historical bug happened to trip on. Capped at one per
			// function: the checker re-checks a loop body once per fixpoint iteration of every loop
			// it is nested inside, so two independently "wide" loops nested inside one another would
			// multiply the 64-iteration fixpoint against itself and make a single generated program
			// expensive to typecheck for no extra coverage.
			const wide = !usedWide && rng.bool(0.06);
			if (wide) usedWide = true;
			if (kind === "fixedList") {
				const len = wide ? rng.int(65, 90) : rng.int(1, 7);
				params.push({ name, typeAnn: `List<IntRange<${elemLo}, ${elemHi}>, ${len}, ${len}>` });
				ctx.scope.set(name, { kind: "list", elemLo, elemHi, min: len, max: len });
			} else {
				const min = rng.int(0, 2);
				const max = min + (wide ? rng.int(63, 90) : rng.int(1, 6));
				params.push({ name, typeAnn: `List<IntRange<${elemLo}, ${elemHi}>, ${min}, ${max}>` });
				ctx.scope.set(name, { kind: "list", elemLo, elemHi, min, max });
			}
		}
	}

	// At least one list-shaped parameter is guaranteed: a function with no list to iterate is
	// well-typed but useless for the loop/break/continue bugs this generator hunts.
	if (ctx.listVars().length === 0) {
		const name = ctx.fresh("p");
		const elemLo = BigInt(rng.int(-5, 0));
		const elemHi = elemLo + BigInt(rng.int(3, 15));
		const len = rng.int(1, 7);
		params.push({ name, typeAnn: `List<IntRange<${elemLo}, ${elemHi}>, ${len}, ${len}>` });
		ctx.scope.set(name, { kind: "list", elemLo, elemHi, min: len, max: len });
	}

	const accKind: AccKind = rng.weighted<AccKind>([
		[5, "int"],
		[2, "bool"],
		[3, "string"],
	]);
	// String building needs a list of code points to draw from; fall back to `int` otherwise.
	ctx.accKind = accKind === "string" && ctx.listVars().length === 0 ? "int" : accKind;

	const body: Stmt[] = [];
	if (ctx.accKind === "bool") {
		body.push({
			k: "let",
			name: "acc",
			typeAnn: "boolean",
			init: { k: "bool", value: rng.bool() },
			mutable: true,
		});
	} else if (ctx.accKind === "string") {
		body.push({
			k: "let",
			name: "acc",
			typeAnn: "List<IntRange<32, 126>, 0, 4096>",
			init: { k: "emptyArray" },
			mutable: true,
		});
	} else {
		body.push({
			k: "let",
			name: "acc",
			typeAnn: "Int",
			init: { k: "int", value: BigInt(rng.int(-10, 10)) },
			mutable: true,
		});
	}
	// Registered only for `bool`: `genIntLeaf` explicitly excludes the accumulator by name (an
	// `int` accumulator only ever appears on the left of its own `+=`/`-=`/`*=`, never inside its
	// own right-hand side), and a `string` accumulator is a list, never a plain variable reference.
	if (ctx.accKind === "bool") ctx.scope.set("acc", { kind: "bool" });

	const loopCount = rng.int(1, 3);
	for (let i = 0; i < loopCount; i++) {
		if (ctx.listVars().length === 0) break;
		// `genLoop`'s own body is generated at the depth passed in (not `- 1`: the budget is spent
		// when a *nested* loop is chosen, inside `genLoopStmt`), so passing `maxLoopDepth` here would
		// let a top-level loop plus two levels of nesting through — three loops deep, not two — and
		// three loops each ranging over a "wide" (up to 90-element) list compounds into roughly
		// 90^3 body executions, which is where the generator itself, not anything it is testing,
		// becomes the bottleneck.
		body.push(genLoop(ctx, maxLoopDepth - 1));
	}

	if (ctx.accKind === "string") {
		body.push({ k: "return", value: { k: "call", fn: "str.fromCodePoints", args: [{ k: "var", name: "acc" }] } });
	} else {
		body.push({ k: "return", value: { k: "var", name: "acc" } });
	}

	const retTypeAnn = ctx.accKind === "bool" ? "boolean" : ctx.accKind === "string" ? "Ascii" : "Int";

	return { enumDecl, params, retTypeAnn, body, fnName: `fuzz_${id}` };
}
