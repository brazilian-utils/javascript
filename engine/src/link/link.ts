/**
 * Linking: pruning and identical code folding.
 *
 * Specializing a helper per call site is what lets a refinement cross a function boundary, but
 * several specializations often compile to exactly the same code — only the *types* differed, and
 * types are proofs, not runtime structure. Folding them back together keeps generated code the
 * size a human would have written, and is sound for exactly that reason: each specialization was
 * proven safe on its own argument types, and the surviving function's parameter types are the
 * join of theirs, which is what a backend reads to pick a representation.
 */

import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import { dependencyClosure } from "../analysis/capabilities.ts";
import { join, typeToString } from "../types.ts";
import type { SemType } from "../types.ts";

export function link(program: CProgram): CProgram {
	let current = prune(program);
	for (let pass = 0; pass < 8; pass++) {
		const folded = foldIdentical(current);
		if (folded === current) break;
		current = prune(folded);
	}
	return current;
}

/**
 * Drops everything the entry points cannot reach.
 *
 * The engine's own standard library is kept regardless: a portable lowering may call one of its
 * functions, and which lowering a target selects is not known here (and must not be: nothing
 * before the backends may branch on a target). The generator only ever emits the functions its
 * own closure reaches, so an unused standard library function never reaches a file.
 */
export function prune(program: CProgram): CProgram {
	const standardLibrary = [...program.functions.keys()].filter((name) => name.startsWith("std/"));
	const reachable = new Set(dependencyClosure(program, [...program.entryPoints, ...standardLibrary]));
	if (reachable.size === program.functions.size) return program;
	const functions = new Map<string, CFunc>();
	for (const [name, fn] of program.functions) {
		if (reachable.has(name)) functions.set(name, fn);
	}
	return { ...program, functions };
}

function foldIdentical(program: CProgram): CProgram {
	const byKey = new Map<string, string>();
	const rename = new Map<string, string>();
	// Callees first, so a fold propagates up into the callers' keys on this same pass.
	for (const name of dependencyClosure(program, program.entryPoints)) {
		const fn = program.functions.get(name);
		if (fn === undefined || program.entryPoints.includes(name)) continue;
		const key = structuralKey(fn, rename);
		const existing = byKey.get(key);
		if (existing === undefined) {
			byKey.set(key, name);
			continue;
		}
		rename.set(name, existing);
	}
	if (rename.size === 0) return program;

	const functions = new Map<string, CFunc>();
	for (const [name, fn] of program.functions) {
		if (rename.has(name)) continue;
		const merged = mergeParams(fn, program, rename, name);
		functions.set(name, { ...merged, body: rewriteCalls(merged.body, rename), calls: merged.calls.map((callee) => rename.get(callee) ?? callee) });
	}
	return { ...program, functions };
}

/** The surviving function must accept every call site of the ones folded into it. */
function mergeParams(
	fn: CFunc,
	program: CProgram,
	rename: ReadonlyMap<string, string>,
	survivor: string,
): CFunc {
	const merged = [...fn.params];
	for (const [from, to] of rename) {
		if (to !== survivor) continue;
		const other = program.functions.get(from);
		if (other === undefined) continue;
		other.params.forEach((param, index) => {
			const existing = merged[index];
			if (existing !== undefined) merged[index] = { ...existing, type: join(existing.type, param.type) };
		});
	}
	return { ...fn, params: merged };
}

function rewriteCalls(body: readonly CStmt[], rename: ReadonlyMap<string, string>): CStmt[] {
	const expr = (node: CExpr): CExpr => {
		switch (node.kind) {
			case "call":
				return { ...node, fn: rename.get(node.fn) ?? node.fn, args: node.args.map(expr) };
			case "op":
				return { ...node, args: node.args.map(expr) };
			case "record":
				return { ...node, fields: node.fields.map((field) => ({ ...field, value: expr(field.value) })) };
			case "list":
				return { ...node, items: node.items.map(expr) };
			case "field":
				return { ...node, target: expr(node.target) };
			case "some":
				return { ...node, inner: expr(node.inner) };
			case "cond":
				return { ...node, test: expr(node.test), then: expr(node.then), otherwise: expr(node.otherwise) };
			case "and":
			case "or":
				return { ...node, left: expr(node.left), right: expr(node.right) };
			case "not":
				return { ...node, operand: expr(node.operand) };
			case "lambda":
				return { ...node, body: rewriteCalls(node.body, rename) };
			default:
				return node;
		}
	};
	return body.map((statement): CStmt => {
		switch (statement.kind) {
			case "let":
				return { ...statement, init: expr(statement.init) };
			case "assign":
				return { ...statement, value: expr(statement.value) };
			case "setIndex":
				return { ...statement, index: expr(statement.index), value: expr(statement.value) };
			case "push":
				return { ...statement, value: expr(statement.value) };
			case "if":
				return {
					...statement,
					test: expr(statement.test),
					then: rewriteCalls(statement.then, rename),
					otherwise: rewriteCalls(statement.otherwise, rename),
				};
			case "switch":
				return {
					...statement,
					subject: expr(statement.subject),
					cases: statement.cases.map((entry) => ({ ...entry, body: rewriteCalls(entry.body, rename) })),
					otherwise: statement.otherwise === undefined ? undefined : rewriteCalls(statement.otherwise, rename),
				};
			case "forRange":
				return {
					...statement,
					from: expr(statement.from),
					to: expr(statement.to),
					body: rewriteCalls(statement.body, rename),
				};
			case "forEach":
				return { ...statement, iterable: expr(statement.iterable), body: rewriteCalls(statement.body, rename) };
			case "return":
				return statement.value === undefined ? statement : { ...statement, value: expr(statement.value) };
			case "fail":
				return { ...statement, args: statement.args.map(expr) };
			case "expr":
				return { ...statement, expr: expr(statement.expr) };
			default:
				return statement;
		}
	});
}

/**
 * A key that ignores everything a backend does not print: the refinements in types, and the
 * specialization suffix in a callee's name once it has been folded.
 */
function structuralKey(fn: CFunc, rename: ReadonlyMap<string, string>): string {
	const parts: string[] = [
		fn.params.map((param) => `${param.name}:${shapeOf(param.type)}`).join(","),
		shapeOf(fn.ret),
		fn.effects.fail.join("|"),
		String(fn.usesEnv),
	];
	const expr = (node: CExpr): string => {
		switch (node.kind) {
			case "lit":
				return `lit(${String(node.value)})`;
			case "local":
				return `loc(${node.name})`;
			case "none":
				return "none";
			case "some":
				return `some(${expr(node.inner)})`;
			case "record":
				return `rec(${node.typeName},${node.fields.map((field) => `${field.name}=${expr(field.value)}`).join(",")})`;
			case "field":
				return `fld(${expr(node.target)},${node.name})`;
			case "list":
				return `lst(${node.items.map(expr).join(",")})`;
			case "call":
				return `call(${rename.get(node.fn) ?? node.fn},${node.args.map(expr).join(",")})`;
			case "op":
				return `op(${node.op}${node.regex === undefined ? "" : `/${node.regex.source}/`},${node.args.map(expr).join(",")})`;
			case "lambda":
				return `lam(${node.params.map((param) => param.name).join(",")},${node.body.map(statement).join(";")})`;
			case "cond":
				return `cond(${expr(node.test)},${expr(node.then)},${expr(node.otherwise)})`;
			case "and":
				return `and(${expr(node.left)},${expr(node.right)})`;
			case "or":
				return `or(${expr(node.left)},${expr(node.right)})`;
			case "not":
				return `not(${expr(node.operand)})`;
			default: {
				const exhaustive: never = node;
				return exhaustive;
			}
		}
	};
	const statement = (node: CStmt): string => {
		switch (node.kind) {
			case "let":
				return `let ${node.name}=${expr(node.init)}`;
			case "assign":
				return `${node.name}=${expr(node.value)}`;
			case "setIndex":
				return `${node.name}[${expr(node.index)}]=${expr(node.value)}`;
			case "push":
				return `push ${node.name},${expr(node.value)}`;
			case "if":
				return `if(${expr(node.test)}){${node.then.map(statement).join(";")}}else{${node.otherwise.map(statement).join(";")}}`;
			case "switch":
				return `switch(${expr(node.subject)}){${node.cases.map((entry) => `${entry.values.join("|")}:${entry.body.map(statement).join(";")}`).join("|")}}${node.otherwise === undefined ? "" : `default:${node.otherwise.map(statement).join(";")}`}`;
			case "forRange":
				return `for(${node.name},${expr(node.from)},${expr(node.to)},${node.inclusive},${node.step}){${node.body.map(statement).join(";")}}`;
			case "forEach":
				return `each(${node.name},${expr(node.iterable)}){${node.body.map(statement).join(";")}}`;
			case "return":
				return `ret(${node.value === undefined ? "" : expr(node.value)})`;
			case "fail":
				return `fail(${node.errorClass},${node.args.map(expr).join(",")})`;
			case "break":
				return "break";
			case "continue":
				return "continue";
			case "expr":
				return `do(${expr(node.expr)})`;
			default: {
				const exhaustive: never = node;
				return exhaustive;
			}
		}
	};
	parts.push(fn.body.map(statement).join(";"));
	return parts.join("#");
}

/** The part of a type a backend can see: the shape, never the proof. */
function shapeOf(type: SemType): string {
	switch (type.kind) {
		case "Int":
			return "Int";
		case "String":
			return "String";
		case "List":
			return `List<${shapeOf(type.elem)}>`;
		case "Option":
			return `Option<${shapeOf(type.inner)}>`;
		default:
			return typeToString(type);
	}
}
