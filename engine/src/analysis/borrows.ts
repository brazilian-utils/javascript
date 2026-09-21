/**
 * Borrow inference: a whole-program pre-pass over the Core that decides, for every String- or
 * List-typed function parameter, whether it may be printed as a borrow (`&str`/`&[T]`) instead of
 * an owned value (`String`/`Vec<T>`).
 *
 * This runs once, over the full `CProgram`, before any target-specific lowering or printing
 * starts — `lowerProgram` receives every function in the program at once, unlike a candidate's
 * `emit` (which runs before any function scope exists) or a backend's `printModule` (which sees
 * one module at a time). See `engine/docs/decisions/0010-rust-parameters-borrow-where-sound.md`
 * for why that timing is what makes this analysis possible, where 0009 found it was not. The
 * result is an input the shared lowerer and the Rust printer each consult; neither decides
 * borrowing itself — see the `borrows` field on `LowerOptions` and the `borrowed`/`borrowedArgs`
 * fields on the Target AST (`backend/tast.ts`).
 *
 * The search starts optimistic — every eligible parameter is assumed borrowable — and a parameter
 * is demoted to owned the moment direct evidence shows it needs to be: it is returned, stored into
 * a record field, a list element or a thrown error, assigned to, or forwarded unchanged to a
 * parameter of another function that already needs to be owned. That last rule is a fixpoint over
 * the call graph; `docs/semantics.md` §7 forbids recursion, so the call graph has no cycles and a
 * worklist over its reverse edges always terminates (and would still terminate, just more slowly,
 * if that ever changed — the worklist only ever adds each key once).
 */

import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import type { SemType } from "../types.ts";

/** Qualified function name (`CFunc.name`) -> the names of its parameters that may be borrowed. */
export type BorrowMap = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Only a `String`, an `Enum` (also printed as Rust's owned `String` — `rustType`) or a `List` has
 * an owned/borrowed distinction worth making in Rust.
 */
function isBorrowEligible(type: SemType): boolean {
	return type.kind === "String" || type.kind === "Enum" || type.kind === "List";
}

/** "This identifier currently holds exactly this parameter's value, unchanged" — a pure alias. */
type AliasScope = Map<string, string>;

/** `F.p` is forwarded, bare, into `G.q`: if `G.q` ends up owned, `F.p` must too (see the rule 4). */
type Edge = { readonly fromKey: string; readonly toKey: string };

type WalkCtx = {
	readonly program: CProgram;
	readonly markOwned: (fnName: string, paramName: string) => void;
	readonly edges: Edge[];
};

function resolveAlias(expr: CExpr, scope: AliasScope): string | undefined {
	return expr.kind === "local" ? scope.get(expr.name) : undefined;
}

/** If `expr` is still a bare alias of one of `fn`'s own parameters, that parameter escapes here. */
function markIfAlias(fn: CFunc, expr: CExpr, scope: AliasScope, ctx: WalkCtx): void {
	const alias = resolveAlias(expr, scope);
	if (alias !== undefined) ctx.markOwned(fn.name, alias);
}

function walkBody(fn: CFunc, body: readonly CStmt[], scope: AliasScope, ctx: WalkCtx): void {
	for (const statement of body) walkStmt(fn, statement, scope, ctx);
}

function walkStmt(fn: CFunc, statement: CStmt, scope: AliasScope, ctx: WalkCtx): void {
	switch (statement.kind) {
		case "let": {
			walkExpr(fn, statement.init, scope, ctx);
			// A bare `let x = someParam;` extends the alias to `x`; anything else (a literal, a call,
			// a concatenation) is a fresh, independent value from here on — whatever it needed from
			// the parameter was already resolved (borrowed or cloned) at the point it was built, so
			// the new local carries no further obligation back onto the parameter.
			const alias = resolveAlias(statement.init, scope);
			if (alias !== undefined) scope.set(statement.name, alias);
			else scope.delete(statement.name);
			return;
		}
		case "assign":
			walkExpr(fn, statement.value, scope, ctx);
			// Only a shadowing local can ever be an assignment target — `check.ts` marks every
			// parameter binding `mutable: false`, so `assign` never targets one directly today. This
			// check only fires if a future relaxation of that rule lets a name that still *is* the
			// parameter (unshadowed in this scope) be reassigned, which a borrow could not survive.
			if (scope.get(statement.name) === statement.name) ctx.markOwned(fn.name, statement.name);
			return;
		case "setIndex":
			walkExpr(fn, statement.index, scope, ctx);
			walkExpr(fn, statement.value, scope, ctx);
			markIfAlias(fn, statement.value, scope, ctx);
			return;
		case "push":
			walkExpr(fn, statement.value, scope, ctx);
			markIfAlias(fn, statement.value, scope, ctx);
			return;
		case "if":
			walkExpr(fn, statement.test, scope, ctx);
			walkBody(fn, statement.then, new Map(scope), ctx);
			walkBody(fn, statement.otherwise, new Map(scope), ctx);
			return;
		case "switch":
			walkExpr(fn, statement.subject, scope, ctx);
			for (const entry of statement.cases) walkBody(fn, entry.body, new Map(scope), ctx);
			if (statement.otherwise !== undefined) walkBody(fn, statement.otherwise, new Map(scope), ctx);
			return;
		case "forRange": {
			walkExpr(fn, statement.from, scope, ctx);
			walkExpr(fn, statement.to, scope, ctx);
			const inner = new Map(scope);
			inner.delete(statement.name);
			walkBody(fn, statement.body, inner, ctx);
			return;
		}
		case "forEach": {
			walkExpr(fn, statement.iterable, scope, ctx);
			const inner = new Map(scope);
			inner.delete(statement.name);
			walkBody(fn, statement.body, inner, ctx);
			return;
		}
		case "return":
			if (statement.value !== undefined) {
				walkExpr(fn, statement.value, scope, ctx);
				markIfAlias(fn, statement.value, scope, ctx);
			}
			return;
		case "fail":
			for (const arg of statement.args) {
				walkExpr(fn, arg, scope, ctx);
				markIfAlias(fn, arg, scope, ctx);
			}
			return;
		case "break":
		case "continue":
			return;
		case "expr":
			walkExpr(fn, statement.expr, scope, ctx);
			return;
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

function walkExpr(fn: CFunc, expr: CExpr, scope: AliasScope, ctx: WalkCtx): void {
	switch (expr.kind) {
		case "lit":
		case "none":
		case "local":
			return;
		case "some":
			walkExpr(fn, expr.inner, scope, ctx);
			markIfAlias(fn, expr.inner, scope, ctx);
			return;
		case "record":
			for (const field of expr.fields) {
				walkExpr(fn, field.value, scope, ctx);
				markIfAlias(fn, field.value, scope, ctx);
			}
			return;
		case "list":
			for (const item of expr.items) {
				walkExpr(fn, item, scope, ctx);
				markIfAlias(fn, item, scope, ctx);
			}
			return;
		case "field":
			walkExpr(fn, expr.target, scope, ctx);
			return;
		case "call": {
			const callee = ctx.program.functions.get(expr.fn);
			expr.args.forEach((arg, index) => {
				walkExpr(fn, arg, scope, ctx);
				const alias = resolveAlias(arg, scope);
				if (alias === undefined) return;
				const calleeParam = callee?.params[index];
				if (calleeParam === undefined) {
					// A call this pass cannot resolve to a declared parameter (should not happen for
					// the subset — every "call" targets a function in `program.functions`, and its
					// arity matches) is the one place this pass cannot reduce "does the callee need
					// this owned" to a fact, so it takes the safe side directly instead of guessing.
					ctx.markOwned(fn.name, alias);
					return;
				}
				ctx.edges.push({ fromKey: `${fn.name}::${alias}`, toKey: `${expr.fn}::${calleeParam.name}` });
			});
			return;
		}
		case "op":
			// An intrinsic's own lowering decides its own borrowing, per target, independently of
			// this map (the Rust backend's `borrowed()` — see 0010's "Positions this pass does not
			// need to reach" section); this pass only has to keep looking for nested *calls* inside
			// an operation's operands, not decide anything about the operation itself.
			for (const arg of expr.args) walkExpr(fn, arg, scope, ctx);
			return;
		case "lambda": {
			// A lambda is pure and, in every generated case, captures by reference rather than by
			// move (`docs/decisions/0009-*.md`'s note on `task.race`), so reading an outer parameter
			// inside one is just another read. Only a `return` inside the lambda body can hand a
			// parameter's value somewhere that outlives the call — the list a combinator builds, or
			// the `Option` a race closure produces — and `walkStmt`'s own "return" case already
			// treats that the right way, so the lambda's body needs no special-casing beyond a scope
			// of its own (its parameters shadow, and nothing declared inside it leaks back out).
			const inner = new Map(scope);
			for (const param of expr.params) inner.delete(param.name);
			walkBody(fn, expr.body, inner, ctx);
			return;
		}
		case "cond":
			// Both branches always convert to an owned value at print time regardless of the source's
			// borrow status (`toOwned`'s ternary case, in the Rust backend), so a branch that is a
			// bare parameter alias never needs the parameter itself to be owned — it costs exactly
			// the same clone either way. Still recurse, for a nested call in a branch.
			walkExpr(fn, expr.test, scope, ctx);
			walkExpr(fn, expr.then, scope, ctx);
			walkExpr(fn, expr.otherwise, scope, ctx);
			return;
		case "and":
		case "or":
			walkExpr(fn, expr.left, scope, ctx);
			walkExpr(fn, expr.right, scope, ctx);
			return;
		case "not":
			walkExpr(fn, expr.operand, scope, ctx);
			return;
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

export function computeBorrowableParams(program: CProgram): BorrowMap {
	const owned = new Set<string>();
	const edges: Edge[] = [];
	const ctx: WalkCtx = {
		program,
		markOwned: (fnName, paramName) => owned.add(`${fnName}::${paramName}`),
		edges,
	};

	for (const fn of program.functions.values()) {
		const eligible = fn.params.filter((param) => isBorrowEligible(param.type));
		if (eligible.length === 0) continue;
		const scope: AliasScope = new Map(eligible.map((param) => [param.name, param.name]));
		walkBody(fn, fn.body, scope, ctx);
	}

	// Reverse adjacency + a worklist seeded from the direct findings above: whenever a destination
	// parameter ends up owned, every edge into it demotes its source too, and each key is only ever
	// pushed once, so this is a standard (terminating) least-fixpoint-from-below computation.
	const reverse = new Map<string, string[]>();
	for (const edge of edges) {
		const sources = reverse.get(edge.toKey);
		if (sources === undefined) reverse.set(edge.toKey, [edge.fromKey]);
		else sources.push(edge.fromKey);
	}
	const queue = [...owned];
	while (queue.length > 0) {
		const key = queue.pop()!;
		for (const source of reverse.get(key) ?? []) {
			if (owned.has(source)) continue;
			owned.add(source);
			queue.push(source);
		}
	}

	const result = new Map<string, ReadonlySet<string>>();
	for (const fn of program.functions.values()) {
		const borrowable = new Set<string>();
		for (const param of fn.params) {
			if (isBorrowEligible(param.type) && !owned.has(`${fn.name}::${param.name}`)) borrowable.add(param.name);
		}
		result.set(fn.name, borrowable);
	}
	return result;
}
