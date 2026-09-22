/**
 * Constant folding over a lowered target AST.
 *
 * `optimize/optimize.ts` already folds the Core, and runs again after inlining so that a callee
 * spliced into a call site sees its arguments as the constants they are. That is not the end of
 * it: a lowering is itself code generation, and several of them expand an argument into a shape
 * that only collapses once the argument is known. The TypeScript `date.fromYmd` expands a month
 * into a days-in-month test, so `fromYmd(year, 3, day)` lowers to `3 === 2 ? 29 : 3 === 4 || … ?
 * 30 : 31` — five comparisons and two branches that a reader can see are `31`, and that the Core
 * folder never had a chance at because they did not exist when it ran.
 *
 * So the same fold runs once more here, on what each backend actually produced, before the
 * printer sees it. It is deliberately narrower than the Core's: it folds comparisons between two
 * literals, the boolean connectives, `!`, and a conditional or an `if` whose test is settled —
 * nothing arithmetic, nothing target-specific, and nothing whose meaning differs between the four
 * languages. Every operator spelling it recognizes (`===`/`==`, `<`, `and`, `&&`, …) means the
 * same thing in every target that spells it that way, which is what makes one pass serve all of
 * them.
 */

import type { TExpr, TStmt } from "./tast.ts";
import { mapExprs, mapStmts } from "./tast.ts";

/** Equality and ordering, in every spelling the four printers use. Value comparison in all of them. */
const COMPARISONS = new Set(["===", "==", "!==", "!=", "<", "<=", ">", ">="]);
/** Conjunction and disjunction: `&&`/`||` in TypeScript, Go and Rust, `and`/`or` in Python. */
const AND = new Set(["&&", "and"]);
const OR = new Set(["||", "or"]);
const NOT = new Set(["!", "not "]);

type Primitive = boolean | number | bigint | string;

/** The literal's value when it is one this pass is willing to reason about, else undefined. */
function primitive(expr: TExpr): Primitive | undefined {
	if (expr.kind !== "lit") return undefined;
	const value = expr.value;
	const kind = typeof value;
	if (kind === "boolean" || kind === "number" || kind === "bigint" || kind === "string") {
		return value as Primitive;
	}
	return undefined;
}

function truth(expr: TExpr): boolean | undefined {
	const value = primitive(expr);
	return typeof value === "boolean" ? value : undefined;
}

/**
 * Compares two literals the way all four targets do, or answers undefined when they would not
 * agree. A number and a string are never compared: JavaScript would coerce, Python would raise
 * and Go and Rust would not compile, so a lowering that produced one is a bug to leave visible
 * rather than a constant to fold. A number and a bigint are the same integer written two ways —
 * the TypeScript target alone splits an `Int` between them by range (`needsBigInt`) — so those
 * are compared as integers.
 */
function compare(op: string, left: Primitive, right: Primitive): boolean | undefined {
	const numeric = (value: Primitive): bigint | undefined => {
		if (typeof value === "bigint") return value;
		if (typeof value === "number") return Number.isInteger(value) ? BigInt(value) : undefined;
		return undefined;
	};
	const leftNumber = numeric(left);
	const rightNumber = numeric(right);
	const comparable =
		leftNumber !== undefined && rightNumber !== undefined
			? ([leftNumber, rightNumber] as const)
			: typeof left === typeof right && (typeof left === "string" || typeof left === "boolean")
				? ([left, right] as [Primitive, Primitive])
				: undefined;
	if (comparable === undefined) return undefined;
	const [a, b] = comparable;
	switch (op) {
		case "===":
		case "==":
			return a === b;
		case "!==":
		case "!=":
			return a !== b;
		case "<":
			return a < b;
		case "<=":
			return a <= b;
		case ">":
			return a > b;
		case ">=":
			return a >= b;
		default:
			return undefined;
	}
}

const TRUE: TExpr = { kind: "lit", value: true, type: { kind: "Bool" } };
const FALSE: TExpr = { kind: "lit", value: false, type: { kind: "Bool" } };

/** Set by every fold that actually replaced something, so `foldTarget` knows when to stop. */
type Progress = { changed: boolean };

function foldExpr(expr: TExpr, progress: Progress): TExpr {
	switch (expr.kind) {
		case "binary": {
			if (COMPARISONS.has(expr.op)) {
				const left = primitive(expr.left);
				const right = primitive(expr.right);
				if (left !== undefined && right !== undefined) {
					const settled = compare(expr.op, left, right);
					if (settled !== undefined) {
						progress.changed = true;
						return settled ? TRUE : FALSE;
					}
				}
				return expr;
			}
			if (AND.has(expr.op)) {
				const left = truth(expr.left);
				if (left === false) {
					progress.changed = true;
					return FALSE;
				}
				if (left === true) {
					progress.changed = true;
					return expr.right;
				}
				// `x && false` is not `false`: `x` may be the call that does the work. Only a test
				// whose *left* is settled lets the other side go.
				return expr;
			}
			if (OR.has(expr.op)) {
				const left = truth(expr.left);
				if (left === true) {
					progress.changed = true;
					return TRUE;
				}
				if (left === false) {
					progress.changed = true;
					return expr.right;
				}
				return expr;
			}
			return expr;
		}
		case "unary": {
			if (!NOT.has(expr.op)) return expr;
			const operand = truth(expr.operand);
			if (operand === undefined) return expr;
			progress.changed = true;
			return operand ? FALSE : TRUE;
		}
		case "ternary": {
			const test = truth(expr.test);
			if (test === undefined) return expr;
			progress.changed = true;
			return test ? expr.then : expr.otherwise;
		}
		default:
			return expr;
	}
}

/**
 * Drops the branch an `if` can no longer take. The surviving branch is spliced into the
 * surrounding list rather than left nested, which is what the printer would otherwise emit as a
 * block around statements that always run.
 */
function foldStmts(statements: readonly TStmt[], progress: Progress): TStmt[] {
	return statements.flatMap((statement): TStmt[] => {
		if (statement.kind !== "if") return [statement];
		const test = truth(statement.test);
		if (test === undefined) return [statement];
		progress.changed = true;
		return [...(test ? statement.then : statement.otherwise)];
	});
}

/**
 * Folds until nothing more moves. One pass is not enough: collapsing a ternary can settle the
 * test of the `if` that held it, and that `if` disappearing can expose another. The loop is
 * bounded because every round that changes anything strictly removes a node.
 */
export function foldTarget(body: readonly TStmt[]): TStmt[] {
	let current = [...body];
	for (let round = 0; round < 8; round++) {
		const progress: Progress = { changed: false };
		current = foldStmts(
			mapStmts(
				mapExprs(current, (expr) => foldExpr(expr, progress)),
				(statements) => foldStmts(statements, progress),
			),
			progress,
		);
		if (!progress.changed) break;
	}
	return current;
}
