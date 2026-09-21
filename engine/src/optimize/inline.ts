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
 */

import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import type { SemType } from "../types.ts";
import { tOption } from "../types.ts";

export type InlineBudget = {
	/** The callee's own statement count (recursive), above which it is left as a call. 0 disables the pass. */
	readonly maxStatements: number;
	/** How many times to re-scan for a newly exposed call (e.g. inlining `f` reveals `f`'s own call to `g`). */
	readonly rounds?: number;
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
		for (const [name, fn] of functions) {
			const body = inlineBody(fn.body, { program, budget, recursive, uid, callerName: name });
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

type Ctx = {
	readonly program: CProgram;
	readonly budget: InlineBudget;
	readonly recursive: ReadonlySet<string>;
	readonly uid: { n: number };
	readonly callerName: string;
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
 * whole expression would run it unconditionally. A call found there is left as a call; everywhere
 * else (including `cond`'s own `test`, and every argument of an ordinary call/op/record/list,
 * which always run) it is a candidate.
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
			if (conditional) return withArgsDone;
			const inlined = tryInline(withArgsDone as Extract<CExpr, { kind: "call" }>, hoisted, ctx);
			return inlined ?? withArgsDone;
		}
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function tryInline(call: Extract<CExpr, { kind: "call" }>, hoisted: CStmt[], ctx: Ctx): CExpr | undefined {
	const callee = ctx.program.functions.get(call.fn);
	if (callee === undefined || !eligible(callee, ctx)) return undefined;

	const renameMap = new Map<string, string>();
	const fresh = (base: string): string => {
		ctx.uid.n += 1;
		return `__inl${ctx.uid.n}_${base}`;
	};
	const bound = new Set<string>();
	collectBoundNames(callee.body, bound);
	for (const name of bound) renameMap.set(name, fresh(name));
	for (const param of callee.params) renameMap.set(param.name, fresh(param.name));

	for (let index = 0; index < callee.params.length; index++) {
		const param = callee.params[index]!;
		const arg = call.args[index]!;
		hoisted.push({
			kind: "let",
			name: renameMap.get(param.name)!,
			mutable: isReassigned(callee.body, param.name),
			init: arg,
			type: param.type,
			span: call.span,
		});
	}

	const resultVar = fresh("result");
	const optionType = tOption(callee.ret);
	hoisted.push({
		kind: "let",
		name: resultVar,
		mutable: true,
		init: { kind: "none", type: optionType, span: call.span },
		type: optionType,
		span: call.span,
	});
	const renamedBody = callee.body.map((statement) => renameStmt(statement, renameMap));
	hoisted.push(...flattenSeq(renamedBody, resultVar, callee.ret, optionType));

	return { kind: "op", op: "opt.unwrap", args: [{ kind: "local", name: resultVar, type: optionType, span: call.span }], type: call.type, span: call.span };
}

/* ------------------------------------------------------------------ *
 * Recomputing `CFunc.calls` after a body changed
 * ------------------------------------------------------------------ */

function collectCalls(body: readonly CStmt[]): string[] {
	const found = new Set<string>();
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
				found.add(expr.fn);
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
	return [...found];
}
