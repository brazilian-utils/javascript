/**
 * Core-to-Core passes: constant folding, dead code elimination and loop raising.
 *
 * Every pass here is semantics preserving, and `tests/translation.spec.ts` proves it the way the
 * architecture requires: the reference interpreter runs the Core before and after each pass on
 * generated inputs, and the results must be identical.
 */

import { tryEvalConst } from "../comptime/eval.ts";
import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import { lookupIntrinsic } from "../intrinsics/index.ts";
import { tLambda } from "../types.ts";

export type OptimizeOptions = {
	readonly fold?: boolean;
	readonly dce?: boolean;
	readonly raiseLoops?: boolean;
};

export function optimize(program: CProgram, options: OptimizeOptions = {}): CProgram {
	const settings = { fold: true, dce: true, raiseLoops: true, ...options };
	let current = program;
	// Twice, because the two halves feed each other: folding a read leaves a binding unread, and
	// dropping a parameter leaves whatever the call site passed for it unread in *its* caller. A
	// second round settles that; a third has never had anything to find.
	for (let round = 0; round < 2; round++) {
		const functions = new Map<string, CFunc>();
		for (const [name, fn] of current.functions) {
			let body = fn.body;
			if (settings.raiseLoops) body = raiseLoops(body);
			if (settings.fold) body = body.map(foldStmt);
			if (settings.dce) body = removeUnreadBindings(eliminateDeadCode(body));
			functions.set(name, { ...fn, body });
		}
		const perFunction = { ...current, functions };
		const next = settings.dce ? removeUnreadParameters(perFunction) : perFunction;
		if (round > 0 && next === perFunction) return next;
		current = next;
	}
	return current;
}

/* ------------------------------------------------------------------ *
 * Parameters nothing reads
 * ------------------------------------------------------------------ */

/**
 * Drops a parameter no call needs and the body never reads, rewriting every call site with it.
 *
 * The same folding that empties a binding empties a parameter: a helper specialized to a call site
 * that passes `10` (ADR 0004) has a parameter of type `Int[10..10]`, every read of it becomes that
 * constant, and what is left is an argument passed to nobody — which Go and Rust both refuse to
 * compile, and which no author would have written either.
 *
 * Two conditions, both necessary. An entry point keeps every parameter whatever its body does,
 * because its signature is the published API rather than an implementation detail. And a call site
 * whose argument could be noticed — a call, a draw, anything `isObservationFree` will not vouch
 * for — keeps the parameter for every call site, since dropping it would drop that evaluation.
 */
function removeUnreadParameters(program: CProgram): CProgram {
	const entryPoints = new Set(program.entryPoints);
	const droppable = new Map<string, Set<number>>();
	for (const [name, fn] of program.functions) {
		if (entryPoints.has(name) || fn.params.length === 0) continue;
		const read = new Set<string>();
		countReads(fn.body, read);
		const unread = fn.params.flatMap((param, index) => (read.has(param.name) ? [] : [index]));
		if (unread.length > 0) droppable.set(name, new Set(unread));
	}
	if (droppable.size === 0) return program;

	// One veto from any call site removes the index for every call site: the definition has one
	// signature, so a parameter is either dropped everywhere or kept everywhere.
	for (const fn of program.functions.values()) {
		forEachCall(fn.body, (call) => {
			const indices = droppable.get(call.fn);
			if (indices === undefined) return;
			for (const index of [...indices]) {
				const arg = call.args[index];
				if (arg === undefined || !isObservationFree(arg)) indices.delete(index);
			}
		});
	}
	for (const [name, indices] of [...droppable]) if (indices.size === 0) droppable.delete(name);
	if (droppable.size === 0) return program;

	const keep =
		(indices: ReadonlySet<number>) =>
		<T,>(_item: T, index: number): boolean =>
			!indices.has(index);
	const rewriteCall = (expr: CExpr): CExpr => {
		if (expr.kind !== "call") return expr;
		const indices = droppable.get(expr.fn);
		return indices === undefined ? expr : { ...expr, args: expr.args.filter(keep(indices)) };
	};

	const functions = new Map<string, CFunc>();
	for (const [name, fn] of program.functions) {
		const indices = droppable.get(name);
		const params = indices === undefined ? fn.params : fn.params.filter(keep(indices));
		functions.set(name, {
			...fn,
			params,
			body: fn.body.map((statement) => mapStmtExprs(statement, rewriteCall)),
			calls: fn.calls,
		});
	}
	return { ...program, functions };
}

/** Applies `visit` to every call this body holds, children first. */
function forEachCall(body: readonly CStmt[], visit: (call: Extract<CExpr, { kind: "call" }>) => void): void {
	for (const statement of body) {
		mapStmtExprs(statement, (expr) => {
			if (expr.kind === "call") visit(expr);
			return expr;
		});
	}
}

/** Rewrites every expression of a statement bottom-up, recursing into nested statement lists. */
function mapStmtExprs(statement: CStmt, visit: (expr: CExpr) => CExpr): CStmt {
	const at = (expr: CExpr): CExpr => mapExprDeep(expr, visit);
	const inner = (body: readonly CStmt[]): CStmt[] => body.map((item) => mapStmtExprs(item, visit));
	switch (statement.kind) {
		case "let":
			return { ...statement, init: at(statement.init) };
		case "assign":
			return { ...statement, value: at(statement.value) };
		case "setIndex":
			return { ...statement, index: at(statement.index), value: at(statement.value) };
		case "push":
			return { ...statement, value: at(statement.value) };
		case "if":
			return { ...statement, test: at(statement.test), then: inner(statement.then), otherwise: inner(statement.otherwise) };
		case "switch":
			return {
				...statement,
				subject: at(statement.subject),
				cases: statement.cases.map((entry) => ({ ...entry, body: inner(entry.body) })),
				otherwise: statement.otherwise === undefined ? undefined : inner(statement.otherwise),
			};
		case "forRange":
			return { ...statement, from: at(statement.from), to: at(statement.to), body: inner(statement.body) };
		case "forEach":
			return { ...statement, iterable: at(statement.iterable), body: inner(statement.body) };
		case "return":
			return statement.value === undefined ? statement : { ...statement, value: at(statement.value) };
		case "fail":
			return { ...statement, args: statement.args.map(at) };
		case "expr":
			return { ...statement, expr: at(statement.expr) };
		default:
			return statement;
	}
}

function mapExprDeep(expr: CExpr, visit: (expr: CExpr) => CExpr): CExpr {
	const at = (inner: CExpr): CExpr => mapExprDeep(inner, visit);
	switch (expr.kind) {
		case "lit":
		case "local":
		case "none":
			return visit(expr);
		case "some":
			return visit({ ...expr, inner: at(expr.inner) });
		case "record":
			return visit({ ...expr, fields: expr.fields.map((field) => ({ ...field, value: at(field.value) })) });
		case "field":
			return visit({ ...expr, target: at(expr.target) });
		case "list":
			return visit({ ...expr, items: expr.items.map(at) });
		case "call":
		case "op":
			return visit({ ...expr, args: expr.args.map(at) });
		case "lambda":
			return visit({ ...expr, body: expr.body.map((item) => mapStmtExprs(item, visit)) });
		case "cond":
			return visit({ ...expr, test: at(expr.test), then: at(expr.then), otherwise: at(expr.otherwise) });
		case "and":
		case "or":
			return visit({ ...expr, left: at(expr.left), right: at(expr.right) });
		case "not":
			return visit({ ...expr, operand: at(expr.operand) });
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

/* ------------------------------------------------------------------ *
 * Constant folding
 * ------------------------------------------------------------------ */

export function foldExpr(expr: CExpr): CExpr {
	switch (expr.kind) {
		case "local": {
			// A read the checker proved to be one integer *is* that integer. Nothing here decides
			// that; the range on the node is the checker's own conclusion at this read, and this pass
			// only stops printing a name for something already known. It matters after
			// specialization (ADR 0004), which is what gives a helper called with a constant a
			// parameter of type `Int[n..n]`: `randomBelow`'s `4294967296 % bound` is a modulo per
			// draw while `bound` is a name, and the constant 4294967290 once it is not.
			const type = expr.type;
			if (type.kind !== "Int" || type.lo !== type.hi) return expr;
			return { kind: "lit", value: type.lo, type, span: expr.span };
		}
		case "op": {
			const args = expr.args.map(foldExpr);
			const definition = lookupIntrinsic(expr.op);
			const foldable =
				definition !== undefined &&
				definition.comptime &&
				expr.op !== "opt.unwrap" &&
				args.every((arg) => arg.kind === "lit" || arg.kind === "none");
			if (foldable) {
				const value = tryEvalConst({ ...expr, args });
				if (value !== undefined && (typeof value !== "object" || Array.isArray(value))) {
					return { kind: "lit", value, type: expr.type, span: expr.span };
				}
			}
			return { ...expr, args };
		}
		case "not": {
			const operand = foldExpr(expr.operand);
			if (operand.kind === "lit" && typeof operand.value === "boolean") {
				return { kind: "lit", value: !operand.value, type: expr.type, span: expr.span };
			}
			return { ...expr, operand };
		}
		case "and": {
			const left = foldExpr(expr.left);
			const right = foldExpr(expr.right);
			if (left.kind === "lit" && left.value === false) return left;
			if (left.kind === "lit" && left.value === true) return right;
			return { ...expr, left, right };
		}
		case "or": {
			const left = foldExpr(expr.left);
			const right = foldExpr(expr.right);
			if (left.kind === "lit" && left.value === true) return left;
			if (left.kind === "lit" && left.value === false) return right;
			return { ...expr, left, right };
		}
		case "cond": {
			const test = foldExpr(expr.test);
			const then = foldExpr(expr.then);
			const otherwise = foldExpr(expr.otherwise);
			if (test.kind === "lit") return test.value === true ? then : otherwise;
			return { ...expr, test, then, otherwise };
		}
		case "call":
			return { ...expr, args: expr.args.map(foldExpr) };
		case "record":
			return { ...expr, fields: expr.fields.map((field) => ({ ...field, value: foldExpr(field.value) })) };
		case "list":
			return { ...expr, items: expr.items.map(foldExpr) };
		case "field":
			return { ...expr, target: foldExpr(expr.target) };
		case "some": {
			const inner = foldExpr(expr.inner);
			// `some(unwrap(x))` is `x`: the checker inserts the unwrap where it proved the value
			// present, and re-wrapping it is a round trip every target would otherwise print.
			if (inner.kind === "op" && inner.op === "opt.unwrap") return inner.args[0]!;
			return { ...expr, inner };
		}
		case "lambda":
			return { ...expr, body: expr.body.map(foldStmt) };
		default:
			return expr;
	}
}

function foldStmt(statement: CStmt): CStmt {
	switch (statement.kind) {
		case "let":
			return { ...statement, init: foldExpr(statement.init) };
		case "assign":
			return { ...statement, value: foldExpr(statement.value) };
		case "setIndex":
			return { ...statement, index: foldExpr(statement.index), value: foldExpr(statement.value) };
		case "push":
			return { ...statement, value: foldExpr(statement.value) };
		case "if":
			return {
				...statement,
				test: foldExpr(statement.test),
				then: statement.then.map(foldStmt),
				otherwise: statement.otherwise.map(foldStmt),
			};
		case "switch":
			return {
				...statement,
				subject: foldExpr(statement.subject),
				cases: statement.cases.map((entry) => ({ ...entry, body: entry.body.map(foldStmt) })),
				otherwise: statement.otherwise?.map(foldStmt),
			};
		case "forRange":
			return {
				...statement,
				from: foldExpr(statement.from),
				to: foldExpr(statement.to),
				body: statement.body.map(foldStmt),
			};
		case "forEach":
			return {
				...statement,
				iterable: foldExpr(statement.iterable),
				body: statement.body.map(foldStmt),
			};
		case "return":
			return statement.value === undefined ? statement : { ...statement, value: foldExpr(statement.value) };
		case "fail":
			return { ...statement, args: statement.args.map(foldExpr) };
		case "expr":
			return { ...statement, expr: foldExpr(statement.expr) };
		default:
			return statement;
	}
}

/* ------------------------------------------------------------------ *
 * Dead code
 * ------------------------------------------------------------------ */

function eliminateDeadCode(body: readonly CStmt[]): CStmt[] {
	const result: CStmt[] = [];
	for (const statement of body) {
		const rewritten = ((): CStmt => {
			switch (statement.kind) {
				case "if": {
					if (statement.test.kind === "lit" && typeof statement.test.value === "boolean") {
						const taken = statement.test.value ? statement.then : statement.otherwise;
						return { kind: "if", test: statement.test, then: eliminateDeadCode(taken), otherwise: [], span: statement.span };
					}
					return {
						...statement,
						then: eliminateDeadCode(statement.then),
						otherwise: eliminateDeadCode(statement.otherwise),
					};
				}
				case "switch":
					return {
						...statement,
						cases: statement.cases.map((entry) => ({ ...entry, body: eliminateDeadCode(entry.body) })),
						otherwise: statement.otherwise === undefined ? undefined : eliminateDeadCode(statement.otherwise),
					};
				case "forRange":
				case "forEach":
					return { ...statement, body: eliminateDeadCode(statement.body) };
				default:
					return statement;
			}
		})();
		result.push(rewritten);
		if (rewritten.kind === "return" || rewritten.kind === "fail" || rewritten.kind === "break") break;
	}
	return result;
}

/* ------------------------------------------------------------------ *
 * Bindings nothing reads
 * ------------------------------------------------------------------ */

/**
 * Drops a `let` whose name is read nowhere and whose initializer cannot be observed.
 *
 * Folding is what creates these: once every read of a local is replaced by the constant the
 * checker proved it to be, the binding itself has no readers left. `easterDayOfMarch`, specialized
 * to the years `easterSunday` accepts, proves two of the Meeus algorithm's intermediates constant
 * that way, and the declarations they leave behind are not cosmetic — Go and Rust both refuse to
 * compile a program with an unused local.
 *
 * "Cannot be observed" is deliberately conservative: an initializer holding a call, a lambda or
 * any intrinsic the registry does not mark comptime is left alone, so a draw from the environment
 * or anything that fails is never removed for having an unused result. Repeated to a fixpoint,
 * because dropping one binding can leave the one above it unread.
 */
function removeUnreadBindings(body: readonly CStmt[]): CStmt[] {
	let current = [...body];
	for (let round = 0; round < 8; round++) {
		const read = new Set<string>();
		countReads(current, read);
		const next = dropUnread(current, read);
		if (next.length === current.length && next.every((statement, index) => statement === current[index])) break;
		current = next;
	}
	return current;
}

function dropUnread(body: readonly CStmt[], read: ReadonlySet<string>): CStmt[] {
	const result: CStmt[] = [];
	for (const statement of body) {
		switch (statement.kind) {
			case "let":
				if (!read.has(statement.name) && isObservationFree(statement.init)) continue;
				result.push(statement);
				break;
			case "if":
				result.push({ ...statement, then: dropUnread(statement.then, read), otherwise: dropUnread(statement.otherwise, read) });
				break;
			case "switch":
				result.push({
					...statement,
					cases: statement.cases.map((entry) => ({ ...entry, body: dropUnread(entry.body, read) })),
					otherwise: statement.otherwise === undefined ? undefined : dropUnread(statement.otherwise, read),
				});
				break;
			case "forRange":
			case "forEach":
				result.push({ ...statement, body: dropUnread(statement.body, read) });
				break;
			default:
				result.push(statement);
				break;
		}
	}
	return result;
}

/** Every local name `body` reads. A `let`'s own name is not a read of itself; its initializer is. */
function countReads(body: readonly CStmt[], read: Set<string>): void {
	const inExpr = (expr: CExpr): void => {
		switch (expr.kind) {
			case "local":
				read.add(expr.name);
				return;
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
				countReads(expr.body, read);
				return;
			default:
				return;
		}
	};
	for (const statement of body) {
		switch (statement.kind) {
			case "let":
				inExpr(statement.init);
				break;
			case "assign":
				// The target is written, not read, but a name assigned to still has to keep its
				// binding: dropping the `let` would leave the assignment without a declaration.
				read.add(statement.name);
				inExpr(statement.value);
				break;
			case "setIndex":
				read.add(statement.name);
				inExpr(statement.index);
				inExpr(statement.value);
				break;
			case "push":
				read.add(statement.name);
				inExpr(statement.value);
				break;
			case "if":
				inExpr(statement.test);
				countReads(statement.then, read);
				countReads(statement.otherwise, read);
				break;
			case "switch":
				inExpr(statement.subject);
				statement.cases.forEach((entry) => countReads(entry.body, read));
				if (statement.otherwise !== undefined) countReads(statement.otherwise, read);
				break;
			case "forRange":
				inExpr(statement.from);
				inExpr(statement.to);
				countReads(statement.body, read);
				break;
			case "forEach":
				inExpr(statement.iterable);
				countReads(statement.body, read);
				break;
			case "return":
				if (statement.value !== undefined) inExpr(statement.value);
				break;
			case "fail":
				statement.args.forEach(inExpr);
				break;
			case "expr":
				inExpr(statement.expr);
				break;
			default:
				break;
		}
	}
}

/** Whether evaluating this expression can be noticed: a call, a lambda or a non-comptime intrinsic. */
function isObservationFree(expr: CExpr): boolean {
	switch (expr.kind) {
		case "lit":
		case "local":
		case "none":
			return true;
		case "some":
			return isObservationFree(expr.inner);
		case "record":
			return expr.fields.every((field) => isObservationFree(field.value));
		case "field":
			return isObservationFree(expr.target);
		case "list":
			return expr.items.every(isObservationFree);
		case "op":
			return (lookupIntrinsic(expr.op)?.comptime ?? false) && expr.args.every(isObservationFree);
		case "cond":
			return isObservationFree(expr.test) && isObservationFree(expr.then) && isObservationFree(expr.otherwise);
		case "and":
		case "or":
			return isObservationFree(expr.left) && isObservationFree(expr.right);
		case "not":
			return isObservationFree(expr.operand);
		case "call":
		case "lambda":
			return false;
		default:
			return false;
	}
}

/* ------------------------------------------------------------------ *
 * Loop raising
 * ------------------------------------------------------------------ */

/**
 * Raises the one shape that is unambiguous: an accumulator updated once per element becomes a
 * fold. Authors may write either style; the Core never picks a target idiom, and each backend
 * decides later whether to print a fold as a loop, a comprehension or a builtin.
 */
function raiseLoops(body: readonly CStmt[]): CStmt[] {
	const result: CStmt[] = [];
	for (let index = 0; index < body.length; index++) {
		const statement = body[index]!;
		const next = body[index + 1];
		if (
			statement.kind === "let" &&
			statement.mutable &&
			next !== undefined &&
			next.kind === "forEach" &&
			next.body.length === 1 &&
			next.body[0]!.kind === "assign" &&
			next.body[0]!.name === statement.name &&
			!mentionsOutsideFold(next.body[0]!.value, statement.name, next.name) &&
			// A fold is a `const`: sound only when nothing after this loop ever reassigns the same
			// local again. Two (or more) loops over the same accumulator, one raisable and one not,
			// are an ordinary shape — an author writes one pass that sums and a later pass that
			// adjusts — and raising only the first one while leaving the rest as plain `acc = …`
			// would hand every backend a `const` its own later statement reassigns.
			!isReassignedLater(body.slice(index + 2), statement.name)
		) {
			const update = next.body[0]!;
			const folded: CStmt = {
				kind: "let",
				name: statement.name,
				mutable: false,
				type: statement.type,
				init: {
					kind: "op",
					op: "seq.fold",
					args: [
						next.iterable,
						statement.init,
						{
							kind: "lambda",
							params: [
								{ name: statement.name, type: statement.type },
								{ name: next.name, type: next.type },
							],
							body: [{ kind: "return", value: update.value, span: update.span }],
							type: tLambda([statement.type, next.type], statement.type),
							span: update.span,
						},
					],
					type: statement.type,
					span: statement.span,
				},
				span: statement.span,
			};
			result.push(folded);
			index++;
			continue;
		}
		switch (statement.kind) {
			case "if":
				result.push({ ...statement, then: raiseLoops(statement.then), otherwise: raiseLoops(statement.otherwise) });
				break;
			case "forRange":
			case "forEach":
				result.push({ ...statement, body: raiseLoops(statement.body) });
				break;
			case "switch":
				result.push({
					...statement,
					cases: statement.cases.map((entry) => ({ ...entry, body: raiseLoops(entry.body) })),
					otherwise: statement.otherwise === undefined ? undefined : raiseLoops(statement.otherwise),
				});
				break;
			default:
				result.push(statement);
		}
	}
	return result;
}

/** The update may only mention the accumulator and the element, or the fold would change meaning. */
function mentionsOutsideFold(expr: CExpr, accumulator: string, element: string): boolean {
	let bad = false;
	const visit = (node: CExpr): void => {
		switch (node.kind) {
			case "local":
				if (node.name !== accumulator && node.name !== element) bad = true;
				return;
			case "op":
			case "call":
				node.args.forEach(visit);
				return;
			case "record":
				node.fields.forEach((field) => visit(field.value));
				return;
			case "list":
				node.items.forEach(visit);
				return;
			case "field":
				visit(node.target);
				return;
			case "some":
				visit(node.inner);
				return;
			case "cond":
				visit(node.test);
				visit(node.then);
				visit(node.otherwise);
				return;
			case "and":
			case "or":
				visit(node.left);
				visit(node.right);
				return;
			case "not":
				visit(node.operand);
				return;
			case "lambda":
				bad = true;
				return;
			default:
				return;
		}
	};
	visit(expr);
	return bad;
}

/**
 * Whether `name` is ever assigned again in `body`, including inside a nested `if`, loop or
 * `switch`. A lambda's own body is never checked: the subset rejects a closure that captures a
 * mutable local (`docs/semantics.md` section 7), so a lambda can never be the reassignment this
 * is looking for.
 */
function isReassignedLater(body: readonly CStmt[], name: string): boolean {
	return body.some((statement): boolean => {
		switch (statement.kind) {
			case "assign":
			case "setIndex":
				return statement.name === name;
			case "if":
				return isReassignedLater(statement.then, name) || isReassignedLater(statement.otherwise, name);
			case "forRange":
			case "forEach":
				return isReassignedLater(statement.body, name);
			case "switch":
				return (
					statement.cases.some((entry) => isReassignedLater(entry.body, name)) ||
					(statement.otherwise !== undefined && isReassignedLater(statement.otherwise, name))
				);
			default:
				return false;
		}
	});
}
