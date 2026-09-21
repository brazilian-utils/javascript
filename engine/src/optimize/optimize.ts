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
	const functions = new Map<string, CFunc>();
	for (const [name, fn] of program.functions) {
		let body = fn.body;
		if (settings.raiseLoops) body = raiseLoops(body);
		if (settings.fold) body = body.map(foldStmt);
		if (settings.dce) body = eliminateDeadCode(body);
		functions.set(name, { ...fn, body });
	}
	return { ...program, functions };
}

/* ------------------------------------------------------------------ *
 * Constant folding
 * ------------------------------------------------------------------ */

export function foldExpr(expr: CExpr): CExpr {
	switch (expr.kind) {
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
		case "some":
			return { ...expr, inner: foldExpr(expr.inner) };
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
			!mentionsOutsideFold(next.body[0]!.value, statement.name, next.name)
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
