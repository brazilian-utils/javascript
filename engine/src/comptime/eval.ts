/**
 * Comptime evaluation.
 *
 * Runs whenever every input of a computation is known at compile time: constant tables, baked
 * datasets, normalized regexes, folded arithmetic. It is deterministic and side-effect free by
 * construction — no capability is reachable from here — and its output is data embedded in the
 * Core.
 */

import { lookupIntrinsic } from "../intrinsics/index.ts";
import type { CExpr } from "../core/ir.ts";
import { NONE, record, some, valuesEqual } from "../values.ts";
import type { Value } from "../values.ts";
import { regexMatches } from "../regex.ts";
import { codePointsOf } from "../values.ts";

export class NotConstant extends Error {}

const FORBIDDEN_CONTEXT = {
	http: () => {
		throw new NotConstant("Http is not reachable at compile time");
	},
	now: () => {
		throw new NotConstant("Clock is not reachable at compile time");
	},
	sleep: () => {
		throw new NotConstant("Clock is not reachable at compile time");
	},
	nextU32: () => {
		throw new NotConstant("Random is not reachable at compile time");
	},
};

/** Evaluates an expression whose value is fully known, or throws `NotConstant`. */
export function evalConst(expr: CExpr): Value {
	switch (expr.kind) {
		case "lit":
			return expr.value;
		case "none":
			return NONE;
		case "some":
			return some(evalConst(expr.inner));
		case "list":
			return expr.items.map((item) => evalConst(item));
		case "record": {
			const fields: Record<string, Value> = {};
			for (const field of expr.fields) fields[field.name] = evalConst(field.value);
			return record(expr.typeName, fields);
		}
		case "field": {
			const target = evalConst(expr.target);
			if (typeof target === "object" && target !== null && "__kind" in target && target.__kind === "record") {
				return target.fields[expr.name]!;
			}
			throw new NotConstant("field access on a non-record");
		}
		case "op": {
			if (expr.op === "re.retain") {
				const subject = String(evalConst(expr.args[0]!));
				return codePointsOf(subject)
					.filter((point) => regexMatches(expr.regex!, [point]))
					.map((point) => String.fromCodePoint(point))
					.join("");
			}
			if (expr.op === "re.test") {
				const subject = evalConst(expr.args[0]!);
				return regexMatches(expr.regex!, codePointsOf(String(subject)));
			}
			const intrinsic = lookupIntrinsic(expr.op);
			if (intrinsic === undefined || !intrinsic.comptime) {
				throw new NotConstant(`${expr.op} is not available at compile time`);
			}
			return intrinsic.evaluate(
				expr.args.map((arg) => evalConst(arg)),
				FORBIDDEN_CONTEXT,
			);
		}
		case "not":
			return !(evalConst(expr.operand) === true);
		case "and": {
			const left = evalConst(expr.left);
			return left === true ? evalConst(expr.right) : false;
		}
		case "or": {
			const left = evalConst(expr.left);
			return left === true ? true : evalConst(expr.right);
		}
		case "cond":
			return evalConst(expr.test) === true ? evalConst(expr.then) : evalConst(expr.otherwise);
		default:
			throw new NotConstant(`${expr.kind} is not a constant expression`);
	}
}

/** Whether two constant expressions denote the same value; used by the optimizer. */
export function sameConstant(left: CExpr, right: CExpr): boolean {
	try {
		return valuesEqual(evalConst(left), evalConst(right));
	} catch {
		return false;
	}
}

export function tryEvalConst(expr: CExpr): Value | undefined {
	try {
		return evalConst(expr);
	} catch (error) {
		if (error instanceof NotConstant) return undefined;
		throw error;
	}
}
