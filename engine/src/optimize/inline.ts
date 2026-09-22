/**
 * Call-site inlining, target scoped.
 *
 * A small function called in a loop is free once a JIT or an optimizing compiler decides to inline
 * it, and expensive when it is not: CPython pays a full frame per call, V8 usually elides the
 * closure once a call site is hot, and rustc inlines across crate boundaries only when LTO is on.
 * That is a per-target cost decision, the same as every other choice this engine makes, so this
 * pass runs once per target — from `generate` (`backend/generate.ts`), with that target's own
 * budget — rather than once for the whole program the way `optimize.ts`'s passes do.
 *
 * Every call inlined here is provably a straight substitution: the callee's parameters are bound
 * once each (never re-evaluated, whatever the argument expression costs), every one of its locals
 * is renamed to a fresh name unique to this occurrence (so two call sites inlined into the same
 * function never collide), and an early `return` is turned into an assignment to a synthetic
 * `Option` result plus a `break` where it is inside a loop — the same "was this the answer yet"
 * question every target already has a native lowering for (`opt.isNone`, `opt.unwrap`), so nothing
 * new has to be taught to any backend. A callee that fails, reaches `Http`, calls itself
 * (directly or through another inlined callee) or holds a lambda is left as an ordinary call: none
 * of those are unsound to inline in principle, they are just outside what this pass proves safe in
 * the time it has to prove it.
 *
 * Inlining also has a price, and for one target that price is the one the package is judged on.
 * The generated TypeScript is shipped to a browser and the npm package is tree-shakeable, which
 * ADR 0012 records as a requirement rather than a preference; a copy of a callee's body is bytes
 * over the wire, once per copy. So the budget is not only "how big is the callee" but "how much
 * code does this add", which is what `maxGrowthStatements` bounds. The two questions have
 * different answers: a callee spliced into its only remaining call site takes its own definition
 * with it and adds nothing at all, however big it is, while a three-statement helper called nine
 * times adds eight copies of itself. `engine/scripts/size.ts` measures the result the way a
 * consumer's bundler would, and `core/bench` measures what it bought.
 */

import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import type { SemType } from "../types.ts";
import { tOption } from "../types.ts";
import { dependencyClosure } from "../analysis/capabilities.ts";

export type InlineBudget = {
	/** The callee's own statement count (recursive), above which it is left as a call. 0 disables the pass. */
	readonly maxStatements: number;
	/** How many times to re-scan for a newly exposed call (e.g. inlining `f` reveals `f`'s own call to `g`). */
	readonly rounds?: number;
	/**
	 * The most Core nodes any one inline may *add* to the program. Absent means unbounded, which
	 * is what a target compiled ahead of time wants: its cost is frames at run time and nobody
	 * downloads its source. A target whose output is shipped over the wire sets it, and what it
	 * says is "duplicate only what is small".
	 *
	 * Nodes rather than statements, because the unit has to hold for both shapes this pass emits.
	 * A one-expression helper is a single statement whether it reads `a + b` or spans half a
	 * screen, and counting it as one would let the second be copied to nine call sites for the
	 * price of the first.
	 *
	 * An inline that leaves the callee with no call sites at all adds almost nothing however big
	 * the callee is: its definition is dropped from the dependency closure (`backend/lower.ts`'s
	 * `closure`) the moment nothing reaches it, so the code moved rather than multiplied, and only
	 * whatever the splice added on top is counted. `0` therefore means exactly "take the inlines
	 * that pay for themselves, and no others" — not "inline nothing".
	 *
	 * A cap per inline rather than a pool for the whole pass, so the answer does not depend on
	 * which call site the walk happened to reach first.
	 */
	readonly maxDuplicatedNodes?: number;
};

export function inlineCalls(program: CProgram, budget: InlineBudget): CProgram {
	if (budget.maxStatements <= 0) return program;

	const recursive = recursiveFunctions(program);
	let functions = program.functions;
	const rounds = budget.rounds ?? 3;
	// One counter for the whole pass, not one per function or per round: a fresh name only has to
	// be unique within the function it lands in, but scoping the counter that narrowly means two
	// different rounds processing the same function can hand out the same name to two different
	// splices — the second round sees the first round's own hoisted `let`s as ordinary statements,
	// not as already-claimed names. A single counter for every splice this call makes never repeats.
	const uid = { n: 0 };

	for (let round = 0; round < rounds; round++) {
		let changedThisRound = false;
		const next = new Map(functions);
		// Recounted every round, because an inline is itself a call site moving: splicing `f` into
		// its caller copies every call `f` made, and a round that ran before this one may already
		// have emptied a callee the next one would otherwise still think is shared.
		const sites = callSites({ ...program, functions });
		for (const [name, fn] of functions) {
			const body = inlineBody(fn.body, { program, budget, recursive, uid, callerName: name, sites });
			if (body !== fn.body) {
				changedThisRound = true;
				next.set(name, { ...fn, body, calls: collectCalls(body) });
			}
		}
		functions = next;
		if (!changedThisRound) break;
	}

	return { ...program, functions };
}

/**
 * How many times each function is called, counted over the functions that will actually be
 * emitted — the dependency closure of the entry points, the same set `backend/lower.ts` lowers.
 * A call from a function nobody reaches is not a copy anyone downloads, and counting it would
 * keep a callee looking shared when its only real caller is about to absorb it.
 */
function callSites(program: CProgram): Map<string, number> {
	const counts = new Map<string, number>();
	for (const name of dependencyClosure(program, program.entryPoints)) {
		const fn = program.functions.get(name);
		if (fn === undefined) continue;
		countCalls(fn.body, counts);
	}
	return counts;
}

type Ctx = {
	readonly program: CProgram;
	readonly budget: InlineBudget;
	readonly recursive: ReadonlySet<string>;
	readonly uid: { n: number };
	readonly callerName: string;
	/** Call sites per callee at the start of this round, decremented as this round consumes them. */
	readonly sites: Map<string, number>;
};

/* ------------------------------------------------------------------ *
 * Eligibility
 * ------------------------------------------------------------------ */

function statementCount(body: readonly CStmt[]): number {
	let total = 0;
	for (const statement of body) {
		total += 1;
		switch (statement.kind) {
			case "if":
				total += statementCount(statement.then) + statementCount(statement.otherwise);
				break;
			case "switch":
				total += statement.cases.reduce((sum, entry) => sum + statementCount(entry.body), 0);
				total += statement.otherwise === undefined ? 0 : statementCount(statement.otherwise);
				break;
			case "forRange":
			case "forEach":
				total += statementCount(statement.body);
				break;
			default:
				break;
		}
	}
	return total;
}

function containsLambda(body: readonly CStmt[]): boolean {
	const inExpr = (expr: CExpr): boolean => {
		switch (expr.kind) {
			case "lambda":
				return true;
			case "some":
				return inExpr(expr.inner);
			case "record":
				return expr.fields.some((field) => inExpr(field.value));
			case "field":
				return inExpr(expr.target);
			case "list":
				return expr.items.some(inExpr);
			case "call":
			case "op":
				return expr.args.some(inExpr);
			case "cond":
				return inExpr(expr.test) || inExpr(expr.then) || inExpr(expr.otherwise);
			case "and":
			case "or":
				return inExpr(expr.left) || inExpr(expr.right);
			case "not":
				return inExpr(expr.operand);
			default:
				return false;
		}
	};
	const inStmt = (statement: CStmt): boolean => {
		switch (statement.kind) {
			case "let":
				return inExpr(statement.init);
			case "assign":
				return inExpr(statement.value);
			case "setIndex":
				return inExpr(statement.index) || inExpr(statement.value);
			case "push":
				return inExpr(statement.value);
			case "if":
				return inExpr(statement.test) || statement.then.some(inStmt) || statement.otherwise.some(inStmt);
			case "switch":
				return (
					inExpr(statement.subject) ||
					statement.cases.some((entry) => entry.body.some(inStmt)) ||
					(statement.otherwise?.some(inStmt) ?? false)
				);
			case "forRange":
				return inExpr(statement.from) || inExpr(statement.to) || statement.body.some(inStmt);
			case "forEach":
				return inExpr(statement.iterable) || statement.body.some(inStmt);
			case "return":
				return statement.value !== undefined && inExpr(statement.value);
			case "fail":
				return statement.args.some(inExpr);
			case "expr":
				return inExpr(statement.expr);
			default:
				return false;
		}
	};
	return body.some(inStmt);
}

/** Every function that calls itself, directly or through another function it calls. */
function recursiveFunctions(program: CProgram): ReadonlySet<string> {
	const recursive = new Set<string>();
	for (const [name] of program.functions) {
		const seen = new Set<string>();
		const stack = [name];
		while (stack.length > 0) {
			const current = stack.pop()!;
			const fn = program.functions.get(current);
			if (fn === undefined) continue;
			for (const callee of fn.calls) {
				if (callee === name) {
					recursive.add(name);
					stack.length = 0;
					break;
				}
				if (!seen.has(callee)) {
					seen.add(callee);
					stack.push(callee);
				}
			}
		}
	}
	return recursive;
}

function eligible(callee: CFunc, ctx: Ctx): boolean {
	if (callee.effects.fail.length > 0) return false;
	if (callee.effects.http) return false;
	if (callee.ret.kind === "Void") return false;
	if (ctx.recursive.has(callee.name)) return false;
	if (containsLambda(callee.body)) return false;
	return statementCount(callee.body) <= ctx.budget.maxStatements;
}

/**
 * Whether the budget covers a splice of `spliced` nodes in place of a call to `callee`, and if so,
 * spends it.
 *
 * The price is what is actually emitted, not what the callee's source looks like: a body with an
 * early `return` grows by the sentinel protocol `flattenSeq` introduces, and a body that is one
 * expression grows by that expression. Against that, an inline that takes the callee's last call
 * site refunds the whole definition, which falls out of the dependency closure
 * (`backend/lower.ts`'s `closure`) the moment nothing reaches it — so a sole-call-site helper is
 * free exactly when the copy is no bigger than the definition it replaces, and not by assumption.
 *
 * An entry point is never refunded: the closure keeps it whether or not anything calls it.
 */
function affordable(callee: CFunc, spliced: number, ctx: Ctx): boolean {
	const cap = ctx.budget.maxDuplicatedNodes;
	const remaining = ctx.sites.get(callee.name) ?? 0;
	const lastCall = remaining <= 1 && !ctx.program.entryPoints.includes(callee.name);
	const growth = spliced - (lastCall ? nodeCount(callee.body) : 0);
	if (cap !== undefined && growth > cap) return false;
	ctx.sites.set(callee.name, Math.max(0, remaining - 1));
	return true;
}

/** Nodes in a statement list: every statement, and every expression node it holds. */
function nodeCount(body: readonly CStmt[]): number {
	let total = 0;
	for (const statement of body) {
		total += 1;
		switch (statement.kind) {
			case "let":
				total += exprNodes(statement.init);
				break;
			case "assign":
				total += exprNodes(statement.value);
				break;
			case "setIndex":
				total += exprNodes(statement.index) + exprNodes(statement.value);
				break;
			case "push":
				total += exprNodes(statement.value);
				break;
			case "if":
				total += exprNodes(statement.test) + nodeCount(statement.then) + nodeCount(statement.otherwise);
				break;
			case "switch":
				total += exprNodes(statement.subject);
				total += statement.cases.reduce((sum, entry) => sum + nodeCount(entry.body), 0);
				total += statement.otherwise === undefined ? 0 : nodeCount(statement.otherwise);
				break;
			case "forRange":
				total += exprNodes(statement.from) + exprNodes(statement.to) + nodeCount(statement.body);
				break;
			case "forEach":
				total += exprNodes(statement.iterable) + nodeCount(statement.body);
				break;
			case "return":
				total += statement.value === undefined ? 0 : exprNodes(statement.value);
				break;
			case "fail":
				total += statement.args.reduce((sum, arg) => sum + exprNodes(arg), 0);
				break;
			case "expr":
				total += exprNodes(statement.expr);
				break;
			default:
				break;
		}
	}
	return total;
}

function exprNodes(expr: CExpr): number {
	switch (expr.kind) {
		case "lit":
		case "local":
		case "none":
			return 1;
		case "some":
			return 1 + exprNodes(expr.inner);
		case "record":
			return 1 + expr.fields.reduce((sum, field) => sum + exprNodes(field.value), 0);
		case "field":
			return 1 + exprNodes(expr.target);
		case "list":
			return 1 + expr.items.reduce((sum, item) => sum + exprNodes(item), 0);
		case "call":
		case "op":
			return 1 + expr.args.reduce((sum, arg) => sum + exprNodes(arg), 0);
		case "lambda":
			return 1 + nodeCount(expr.body);
		case "cond":
			return 1 + exprNodes(expr.test) + exprNodes(expr.then) + exprNodes(expr.otherwise);
		case "and":
		case "or":
			return 1 + exprNodes(expr.left) + exprNodes(expr.right);
		case "not":
			return 1 + exprNodes(expr.operand);
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

/** Call counts, accumulated into `counts`; `collectCalls` answers the set, this one the tally. */
function countCalls(body: readonly CStmt[], counts: Map<string, number>): void {
	for (const name of collectCallsWithRepeats(body)) counts.set(name, (counts.get(name) ?? 0) + 1);
}

/* ------------------------------------------------------------------ *
 * Renaming: every callee-local gets a fresh name unique to one splice
 * ------------------------------------------------------------------ */

function collectBoundNames(body: readonly CStmt[], names: Set<string>): void {
	for (const statement of body) {
		switch (statement.kind) {
			case "let":
				names.add(statement.name);
				break;
			case "if":
				collectBoundNames(statement.then, names);
				collectBoundNames(statement.otherwise, names);
				break;
			case "switch":
				for (const entry of statement.cases) collectBoundNames(entry.body, names);
				if (statement.otherwise !== undefined) collectBoundNames(statement.otherwise, names);
				break;
			case "forRange":
				names.add(statement.name);
				collectBoundNames(statement.body, names);
				break;
			case "forEach":
				names.add(statement.name);
				collectBoundNames(statement.body, names);
				break;
			default:
				break;
		}
	}
}

function renameExpr(expr: CExpr, map: ReadonlyMap<string, string>): CExpr {
	switch (expr.kind) {
		case "lit":
		case "none":
			return expr;
		case "local": {
			const to = map.get(expr.name);
			return to === undefined ? expr : { ...expr, name: to };
		}
		case "some":
			return { ...expr, inner: renameExpr(expr.inner, map) };
		case "record":
			return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: renameExpr(field.value, map) })) };
		case "field":
			return { ...expr, target: renameExpr(expr.target, map) };
		case "list":
			return { ...expr, items: expr.items.map((item) => renameExpr(item, map)) };
		case "call":
		case "op":
			return { ...expr, args: expr.args.map((arg) => renameExpr(arg, map)) };
		case "lambda":
			// Excluded by `containsLambda` before a callee ever reaches this function.
			return expr;
		case "cond":
			return {
				...expr,
				test: renameExpr(expr.test, map),
				then: renameExpr(expr.then, map),
				otherwise: renameExpr(expr.otherwise, map),
			};
		case "and":
		case "or":
			return { ...expr, left: renameExpr(expr.left, map), right: renameExpr(expr.right, map) };
		case "not":
			return { ...expr, operand: renameExpr(expr.operand, map) };
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function renameStmt(statement: CStmt, map: ReadonlyMap<string, string>): CStmt {
	switch (statement.kind) {
		case "let":
			return { ...statement, name: map.get(statement.name) ?? statement.name, init: renameExpr(statement.init, map) };
		case "assign":
			return { ...statement, name: map.get(statement.name) ?? statement.name, value: renameExpr(statement.value, map) };
		case "setIndex":
			return {
				...statement,
				name: map.get(statement.name) ?? statement.name,
				index: renameExpr(statement.index, map),
				value: renameExpr(statement.value, map),
			};
		case "push":
			return { ...statement, name: map.get(statement.name) ?? statement.name, value: renameExpr(statement.value, map) };
		case "if":
			return {
				...statement,
				test: renameExpr(statement.test, map),
				then: statement.then.map((item) => renameStmt(item, map)),
				otherwise: statement.otherwise.map((item) => renameStmt(item, map)),
			};
		case "switch":
			return {
				...statement,
				subject: renameExpr(statement.subject, map),
				cases: statement.cases.map((entry) => ({ ...entry, body: entry.body.map((item) => renameStmt(item, map)) })),
				otherwise: statement.otherwise?.map((item) => renameStmt(item, map)),
			};
		case "forRange":
			return {
				...statement,
				name: map.get(statement.name) ?? statement.name,
				from: renameExpr(statement.from, map),
				to: renameExpr(statement.to, map),
				body: statement.body.map((item) => renameStmt(item, map)),
			};
		case "forEach":
			return {
				...statement,
				name: map.get(statement.name) ?? statement.name,
				iterable: renameExpr(statement.iterable, map),
				body: statement.body.map((item) => renameStmt(item, map)),
			};
		case "return":
			return statement.value === undefined ? statement : { ...statement, value: renameExpr(statement.value, map) };
		case "fail":
			return { ...statement, args: statement.args.map((arg) => renameExpr(arg, map)) };
		case "break":
		case "continue":
			return statement;
		case "expr":
			return { ...statement, expr: renameExpr(statement.expr, map) };
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

/** Whether `name` is ever the target of an `assign` inside `body` (not crossing a lambda — excluded already). */
function isReassigned(body: readonly CStmt[], name: string): boolean {
	return body.some((statement): boolean => {
		switch (statement.kind) {
			case "assign":
				return statement.name === name;
			case "if":
				return isReassigned(statement.then, name) || isReassigned(statement.otherwise, name);
			case "switch":
				return (
					statement.cases.some((entry) => isReassigned(entry.body, name)) ||
					(statement.otherwise !== undefined && isReassigned(statement.otherwise, name))
				);
			case "forRange":
			case "forEach":
				return isReassigned(statement.body, name);
			default:
				return false;
		}
	});
}

/* ------------------------------------------------------------------ *
 * Turning an early `return` into an assignment to a synthetic Option
 * ------------------------------------------------------------------ */

function stmtsContainReturn(body: readonly CStmt[]): boolean {
	return body.some((statement): boolean => {
		switch (statement.kind) {
			case "return":
				return true;
			case "if":
				return stmtsContainReturn(statement.then) || stmtsContainReturn(statement.otherwise);
			case "switch":
				return (
					statement.cases.some((entry) => stmtsContainReturn(entry.body)) ||
					(statement.otherwise !== undefined && stmtsContainReturn(statement.otherwise))
				);
			case "forRange":
			case "forEach":
				return stmtsContainReturn(statement.body);
			default:
				return false;
		}
	});
}

function isNoneTest(resultVar: string, optionType: SemType, span: CExpr["span"]): CExpr {
	return { kind: "op", op: "opt.isNone", args: [{ kind: "local", name: resultVar, type: optionType, span }], type: { kind: "Bool" }, span };
}

/**
 * Rewrites a callee body (already renamed to this splice's fresh names) so every `return expr`
 * becomes `resultVar = some(expr)`, breaking the nearest loop it is directly inside, and every
 * statement that can no longer be reached once `resultVar` is no longer absent is guarded by
 * `if (opt.isNone(resultVar)) { … }`. This is the same early-return-to-flag rewrite every compiler
 * that desugars `return` out of structured control flow performs; nothing here is Core-specific.
 */
function flattenSeq(body: readonly CStmt[], resultVar: string, retType: SemType, optionType: SemType): CStmt[] {
	if (body.length === 0) return [];
	const [first, ...rest] = body;
	const flatFirst = flattenStmt(first!, resultVar, retType, optionType);
	if (rest.length === 0) return flatFirst;
	const flatRest = flattenSeq(rest, resultVar, retType, optionType);
	if (!stmtContainsReturn(first!)) return [...flatFirst, ...flatRest];
	return [
		...flatFirst,
		{ kind: "if", test: isNoneTest(resultVar, optionType, first!.span), then: flatRest, otherwise: [], span: first!.span },
	];
}

function stmtContainsReturn(statement: CStmt): boolean {
	switch (statement.kind) {
		case "return":
			return true;
		case "if":
			return stmtsContainReturn(statement.then) || stmtsContainReturn(statement.otherwise);
		case "switch":
			return (
				statement.cases.some((entry) => stmtsContainReturn(entry.body)) ||
				(statement.otherwise !== undefined && stmtsContainReturn(statement.otherwise))
			);
		case "forRange":
		case "forEach":
			return stmtsContainReturn(statement.body);
		default:
			return false;
	}
}

function flattenStmt(statement: CStmt, resultVar: string, retType: SemType, optionType: SemType): CStmt[] {
	switch (statement.kind) {
		case "return":
			// `eligible` requires a non-`Void` return type, so every `return` in an inlinable callee
			// carries a value.
			return [
				{
					kind: "assign",
					name: resultVar,
					value: { kind: "some", inner: statement.value!, type: optionType, span: statement.span },
					span: statement.span,
				},
			];
		case "if":
			return [
				{
					...statement,
					then: flattenSeq(statement.then, resultVar, retType, optionType),
					otherwise: flattenSeq(statement.otherwise, resultVar, retType, optionType),
				},
			];
		case "switch":
			return [
				{
					...statement,
					cases: statement.cases.map((entry) => ({
						...entry,
						body: flattenSeq(entry.body, resultVar, retType, optionType),
					})),
					otherwise:
						statement.otherwise === undefined ? undefined : flattenSeq(statement.otherwise, resultVar, retType, optionType),
				},
			];
		case "forRange":
		case "forEach": {
			let body = flattenSeq(statement.body, resultVar, retType, optionType);
			if (stmtsContainReturn(statement.body)) {
				// A `return` inside this loop only breaks the loop it is textually inside (an ordinary
				// `break`, nothing crosses a loop boundary); an outer loop stops in turn because *it*
				// sees this whole `forRange`/`forEach` as "might have set the result" and gets the same
				// guard appended below it, one level up, the next time `flattenSeq` walks its siblings.
				body = [
					...body,
					{
						kind: "if",
						test: { kind: "not", operand: isNoneTest(resultVar, optionType, statement.span), type: { kind: "Bool" }, span: statement.span },
						then: [{ kind: "break", span: statement.span }],
						otherwise: [],
						span: statement.span,
					},
				];
			}
			return [{ ...statement, body }];
		}
		default:
			return [statement];
	}
}

/* ------------------------------------------------------------------ *
 * The walk: find an eligible call, splice its (flattened, renamed) body in
 * ------------------------------------------------------------------ */

function inlineBody(body: readonly CStmt[], ctx: Ctx): readonly CStmt[] {
	const result = body.flatMap((statement) => inlineStmt(statement, ctx));
	return result.length === body.length && result.every((statement, index) => statement === body[index]) ? body : result;
}

function inlineStmt(statement: CStmt, ctx: Ctx): CStmt[] {
	const hoisted: CStmt[] = [];
	const at = (expr: CExpr, conditional: boolean): CExpr => inlineExpr(expr, hoisted, ctx, conditional);
	let rewritten: CStmt;
	switch (statement.kind) {
		case "let":
			rewritten = { ...statement, init: at(statement.init, false) };
			break;
		case "assign":
			rewritten = { ...statement, value: at(statement.value, false) };
			break;
		case "setIndex":
			rewritten = { ...statement, index: at(statement.index, false), value: at(statement.value, false) };
			break;
		case "push":
			rewritten = { ...statement, value: at(statement.value, false) };
			break;
		case "if":
			rewritten = {
				...statement,
				test: at(statement.test, false),
				then: inlineBody(statement.then, ctx),
				otherwise: inlineBody(statement.otherwise, ctx),
			};
			break;
		case "switch":
			rewritten = {
				...statement,
				subject: at(statement.subject, false),
				cases: statement.cases.map((entry) => ({ ...entry, body: inlineBody(entry.body, ctx) })),
				otherwise: statement.otherwise === undefined ? undefined : inlineBody(statement.otherwise, ctx),
			};
			break;
		case "forRange":
			rewritten = { ...statement, from: at(statement.from, false), to: at(statement.to, false), body: inlineBody(statement.body, ctx) };
			break;
		case "forEach":
			rewritten = { ...statement, iterable: at(statement.iterable, false), body: inlineBody(statement.body, ctx) };
			break;
		case "return":
			rewritten = statement.value === undefined ? statement : { ...statement, value: at(statement.value, false) };
			break;
		case "fail":
			rewritten = { ...statement, args: statement.args.map((arg) => at(arg, false)) };
			break;
		case "break":
		case "continue":
			rewritten = statement;
			break;
		case "expr":
			rewritten = { ...statement, expr: at(statement.expr, false) };
			break;
		default: {
			const exhaustive: never = statement;
			rewritten = exhaustive;
		}
	}
	return hoisted.length === 0 ? [rewritten] : [...hoisted, rewritten];
}

/**
 * `conditional` is true inside an expression that is not always evaluated — the right side of
 * `&&`/`||`, or either branch of `cond` — where hoisting a call's setup statements ahead of the
 * whole expression would run it unconditionally. A call found there is a candidate only for a
 * splice that needs no statements; everywhere else (including `cond`'s own `test`, and every
 * argument of an ordinary call/op/record/list, which always run) every splice is.
 */
function inlineExpr(expr: CExpr, hoisted: CStmt[], ctx: Ctx, conditional: boolean): CExpr {
	switch (expr.kind) {
		case "lit":
		case "local":
		case "none":
			return expr;
		case "some":
			return { ...expr, inner: inlineExpr(expr.inner, hoisted, ctx, conditional) };
		case "record":
			return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: inlineExpr(field.value, hoisted, ctx, conditional) })) };
		case "field":
			return { ...expr, target: inlineExpr(expr.target, hoisted, ctx, conditional) };
		case "list":
			return { ...expr, items: expr.items.map((item) => inlineExpr(item, hoisted, ctx, conditional)) };
		case "op":
			return { ...expr, args: expr.args.map((arg) => inlineExpr(arg, hoisted, ctx, conditional)) };
		case "cond":
			return {
				...expr,
				test: inlineExpr(expr.test, hoisted, ctx, conditional),
				then: inlineExpr(expr.then, hoisted, ctx, true),
				otherwise: inlineExpr(expr.otherwise, hoisted, ctx, true),
			};
		case "and":
		case "or":
			return {
				...expr,
				left: inlineExpr(expr.left, hoisted, ctx, conditional),
				right: inlineExpr(expr.right, hoisted, ctx, true),
			};
		case "not":
			return { ...expr, operand: inlineExpr(expr.operand, hoisted, ctx, conditional) };
		case "lambda":
			return expr;
		case "call": {
			const withArgsDone: CExpr = { ...expr, args: expr.args.map((arg) => inlineExpr(arg, hoisted, ctx, conditional)) };
			// A splice that needs no statements at all is safe here too, and this is where it helps
			// most: a one-expression helper called inside a ternary or behind `&&` is exactly the
			// call a reader expected to see substituted.
			const inlined = tryInline(withArgsDone as Extract<CExpr, { kind: "call" }>, hoisted, ctx, !conditional);
			return inlined ?? withArgsDone;
		}
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

/**
 * `mayHoist` is false where the call sits in an expression that is not always evaluated — the
 * right side of `&&`/`||`, either branch of a ternary — and lifting setup statements ahead of the
 * whole expression would run them unconditionally. Only a splice that needs no statements at all
 * is taken there.
 */
function tryInline(
	call: Extract<CExpr, { kind: "call" }>,
	hoisted: CStmt[],
	ctx: Ctx,
	mayHoist: boolean,
): CExpr | undefined {
	const callee = ctx.program.functions.get(call.fn);
	if (callee === undefined || !eligible(callee, ctx)) return undefined;

	const fresh = (base: string): string => {
		ctx.uid.n += 1;
		return `__inl${ctx.uid.n}_${base}`;
	};

	const asExpression = tryInlineExpression(call, callee, fresh);
	if (asExpression !== undefined) {
		if (!mayHoist && asExpression.hoisted.length > 0) return undefined;
		const spliced = nodeCount(asExpression.hoisted) + exprNodes(asExpression.value);
		if (!affordable(callee, spliced, ctx)) return undefined;
		hoisted.push(...asExpression.hoisted);
		return asExpression.value;
	}
	if (!mayHoist) return undefined;

	const renameMap = new Map<string, string>();
	const bound = new Set<string>();
	collectBoundNames(callee.body, bound);
	for (const name of bound) renameMap.set(name, fresh(name));
	for (const param of callee.params) renameMap.set(param.name, fresh(param.name));

	const splice: CStmt[] = [];
	// A parameter the call passes a literal or a local for is substituted rather than bound: the
	// `let` would only be an alias, and `const _inl117_year = year;` above the body is scaffolding
	// no author would leave in. Anything else — a call, an arithmetic expression, anything that
	// may have an effect or cost something — is bound once, in argument order, so the body reading
	// it twice cannot evaluate it twice. A parameter the callee assigns to needs its own storage
	// whatever the argument was.
	const substitution = new Map<string, CExpr>();
	for (let index = 0; index < callee.params.length; index++) {
		const param = callee.params[index]!;
		const arg = call.args[index]!;
		const name = renameMap.get(param.name)!;
		const reassigned = isReassigned(callee.body, param.name);
		if (!reassigned && (arg.kind === "lit" || arg.kind === "local")) {
			substitution.set(name, arg);
			continue;
		}
		splice.push({ kind: "let", name, mutable: reassigned, init: arg, type: param.type, span: call.span });
	}

	const resultVar = fresh("result");
	const renamedBody = callee.body.map((statement) => renameStmt(statement, renameMap));
	const straightLine = trailingReturnOnly(renamedBody);
	if (straightLine !== undefined) {
		// The common shape, and the one worth not paying for: every statement runs, then the last
		// one returns. There is nothing for a sentinel to answer, so the body is spliced as it
		// stands and the returned expression is bound to one `const`.
		splice.push(...straightLine.before);
		splice.push({ kind: "let", name: resultVar, mutable: false, init: straightLine.value, type: callee.ret, span: call.span });
	} else {
		const optionType = tOption(callee.ret);
		splice.push({
			kind: "let",
			name: resultVar,
			mutable: true,
			init: { kind: "none", type: optionType, span: call.span },
			type: optionType,
			span: call.span,
		});
		splice.push(...flattenSeq(renamedBody, resultVar, callee.ret, optionType));
	}

	const substituted = substitution.size === 0 ? splice : splice.map((statement) => substituteStmt(statement, substitution));
	if (!affordable(callee, nodeCount(substituted), ctx)) return undefined;
	hoisted.push(...substituted);

	if (straightLine !== undefined) {
		return { kind: "local", name: resultVar, type: callee.ret, span: call.span };
	}
	const optionType = tOption(callee.ret);
	return { kind: "op", op: "opt.unwrap", args: [{ kind: "local", name: resultVar, type: optionType, span: call.span }], type: call.type, span: call.span };
}

/**
 * A body whose only `return` is its last statement: the statements before it, and the value it
 * returns. Absent when the body returns early anywhere, which is what the sentinel protocol in
 * `flattenSeq` exists for.
 */
function trailingReturnOnly(body: readonly CStmt[]): { before: readonly CStmt[]; value: CExpr } | undefined {
	const last = body[body.length - 1];
	if (last === undefined || last.kind !== "return" || last.value === undefined) return undefined;
	const before = body.slice(0, -1);
	return stmtsContainReturn(before) ? undefined : { before, value: last.value };
}

/**
 * The shape worth having a fast path for: a callee that is one `return <expr>`.
 *
 * Substituting it is what a reader means by inlining — `digitAt(cpf, index)` becomes
 * `cpf.charCodeAt(index) - 48` and nothing else changes. Routing it through the general path
 * instead would bind each parameter to a `let`, open a synthetic `Option`, assign through it and
 * unwrap it, which is four statements and a sentinel where the source had an expression: bigger
 * than the call it replaced, in a target that pays for its output by the byte, and slower to read
 * in every target. So this case is handled directly and costs only whatever arguments have to be
 * bound.
 *
 * An argument is substituted straight into the body when it is a literal or a local — evaluating
 * it twice, or at a different point in the body, is not observable and costs nothing. Anything
 * else is bound to one `let` first, in argument order, because it may have an effect (`env` is
 * threaded as an ordinary value, so `randomDigit(env)` is an argument that reads the world) and
 * because a parameter read twice would otherwise evaluate it twice.
 */
function tryInlineExpression(
	call: Extract<CExpr, { kind: "call" }>,
	callee: CFunc,
	fresh: (base: string) => string,
): { value: CExpr; hoisted: CStmt[] } | undefined {
	if (callee.body.length !== 1) return undefined;
	const only = callee.body[0]!;
	if (only.kind !== "return" || only.value === undefined) return undefined;

	const hoisted: CStmt[] = [];
	const substitution = new Map<string, CExpr>();
	for (let index = 0; index < callee.params.length; index++) {
		const param = callee.params[index]!;
		const arg = call.args[index]!;
		if (arg.kind === "lit" || arg.kind === "local") {
			substitution.set(param.name, arg);
			continue;
		}
		const name = fresh(param.name);
		hoisted.push({ kind: "let", name, mutable: false, init: arg, type: param.type, span: call.span });
		substitution.set(param.name, { kind: "local", name, type: param.type, span: call.span });
	}

	return { value: substituteExpr(only.value, substitution), hoisted };
}

/** `renameStmt`, but mapping a local onto a whole expression rather than onto another name. Only
 *  ever called with names that are never assigned to, so no assignment target can need rewriting. */
function substituteStmt(statement: CStmt, map: ReadonlyMap<string, CExpr>): CStmt {
	switch (statement.kind) {
		case "let":
			return { ...statement, init: substituteExpr(statement.init, map) };
		case "assign":
			return { ...statement, value: substituteExpr(statement.value, map) };
		case "setIndex":
			return { ...statement, index: substituteExpr(statement.index, map), value: substituteExpr(statement.value, map) };
		case "push":
			return { ...statement, value: substituteExpr(statement.value, map) };
		case "if":
			return {
				...statement,
				test: substituteExpr(statement.test, map),
				then: statement.then.map((item) => substituteStmt(item, map)),
				otherwise: statement.otherwise.map((item) => substituteStmt(item, map)),
			};
		case "switch":
			return {
				...statement,
				subject: substituteExpr(statement.subject, map),
				cases: statement.cases.map((entry) => ({ ...entry, body: entry.body.map((item) => substituteStmt(item, map)) })),
				otherwise: statement.otherwise?.map((item) => substituteStmt(item, map)),
			};
		case "forRange":
			return {
				...statement,
				from: substituteExpr(statement.from, map),
				to: substituteExpr(statement.to, map),
				body: statement.body.map((item) => substituteStmt(item, map)),
			};
		case "forEach":
			return {
				...statement,
				iterable: substituteExpr(statement.iterable, map),
				body: statement.body.map((item) => substituteStmt(item, map)),
			};
		case "return":
			return statement.value === undefined ? statement : { ...statement, value: substituteExpr(statement.value, map) };
		case "fail":
			return { ...statement, args: statement.args.map((arg) => substituteExpr(arg, map)) };
		case "break":
		case "continue":
			return statement;
		case "expr":
			return { ...statement, expr: substituteExpr(statement.expr, map) };
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

/** `renameExpr`, but mapping a local onto a whole expression rather than onto another name. */
function substituteExpr(expr: CExpr, map: ReadonlyMap<string, CExpr>): CExpr {
	switch (expr.kind) {
		case "lit":
		case "none":
			return expr;
		case "local":
			return map.get(expr.name) ?? expr;
		case "some":
			return { ...expr, inner: substituteExpr(expr.inner, map) };
		case "record":
			return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: substituteExpr(field.value, map) })) };
		case "field":
			return { ...expr, target: substituteExpr(expr.target, map) };
		case "list":
			return { ...expr, items: expr.items.map((item) => substituteExpr(item, map)) };
		case "call":
		case "op":
			return { ...expr, args: expr.args.map((arg) => substituteExpr(arg, map)) };
		case "lambda":
			// Excluded by `containsLambda` before a callee ever reaches this function.
			return expr;
		case "cond":
			return {
				...expr,
				test: substituteExpr(expr.test, map),
				then: substituteExpr(expr.then, map),
				otherwise: substituteExpr(expr.otherwise, map),
			};
		case "and":
		case "or":
			return { ...expr, left: substituteExpr(expr.left, map), right: substituteExpr(expr.right, map) };
		case "not":
			return { ...expr, operand: substituteExpr(expr.operand, map) };
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

/* ------------------------------------------------------------------ *
 * Recomputing `CFunc.calls` after a body changed
 * ------------------------------------------------------------------ */

function collectCalls(body: readonly CStmt[]): string[] {
	return [...new Set(collectCallsWithRepeats(body))];
}

/** Every call in `body`, one entry per call site rather than one per callee. */
function collectCallsWithRepeats(body: readonly CStmt[]): string[] {
	const found: string[] = [];
	const inExpr = (expr: CExpr): void => {
		switch (expr.kind) {
			case "some":
				inExpr(expr.inner);
				return;
			case "record":
				expr.fields.forEach((field) => inExpr(field.value));
				return;
			case "field":
				inExpr(expr.target);
				return;
			case "list":
				expr.items.forEach(inExpr);
				return;
			case "call":
				found.push(expr.fn);
				expr.args.forEach(inExpr);
				return;
			case "op":
				expr.args.forEach(inExpr);
				return;
			case "cond":
				inExpr(expr.test);
				inExpr(expr.then);
				inExpr(expr.otherwise);
				return;
			case "and":
			case "or":
				inExpr(expr.left);
				inExpr(expr.right);
				return;
			case "not":
				inExpr(expr.operand);
				return;
			case "lambda":
				expr.body.forEach(inStmt);
				return;
			default:
				return;
		}
	};
	const inStmt = (statement: CStmt): void => {
		switch (statement.kind) {
			case "let":
				inExpr(statement.init);
				return;
			case "assign":
				inExpr(statement.value);
				return;
			case "setIndex":
				inExpr(statement.index);
				inExpr(statement.value);
				return;
			case "push":
				inExpr(statement.value);
				return;
			case "if":
				inExpr(statement.test);
				statement.then.forEach(inStmt);
				statement.otherwise.forEach(inStmt);
				return;
			case "switch":
				inExpr(statement.subject);
				statement.cases.forEach((entry) => entry.body.forEach(inStmt));
				statement.otherwise?.forEach(inStmt);
				return;
			case "forRange":
				inExpr(statement.from);
				inExpr(statement.to);
				statement.body.forEach(inStmt);
				return;
			case "forEach":
				inExpr(statement.iterable);
				statement.body.forEach(inStmt);
				return;
			case "return":
				if (statement.value !== undefined) inExpr(statement.value);
				return;
			case "fail":
				statement.args.forEach(inExpr);
				return;
			case "expr":
				inExpr(statement.expr);
				return;
			default:
				return;
		}
	};
	body.forEach(inStmt);
	return found;
}
