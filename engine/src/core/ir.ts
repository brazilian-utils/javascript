/**
 * Core IR: what the program means.
 *
 * Structured and typed, with no SSA, no CFG and nothing machine-like. Structured control flow is
 * preserved on purpose: it is the information a source-level backend needs to print readable
 * native code. Every node carries its semantic type; every function carries its effect set.
 */

import type { Span } from "../diagnostics.ts";
import type { EffectSet } from "../effects.ts";
import type { NormalizedRegex } from "../regex.ts";
import type { SemType } from "../types.ts";
import { typeToString } from "../types.ts";
import type { Value } from "../values.ts";

export type CRecordDef = {
	readonly name: string;
	readonly fields: readonly {
		readonly name: string;
		readonly type: SemType;
		readonly optional: boolean;
		readonly doc?: string;
	}[];
	readonly doc?: string;
	readonly exported: boolean;
};

export type CErrorDef = {
	readonly name: string;
	/** The nearest declared ancestor, or `undefined` for a root domain error. */
	readonly base?: string;
	readonly doc?: string;
	readonly exported: boolean;
};

export type CExpr =
	| { readonly kind: "lit"; readonly value: Value; readonly type: SemType; readonly span: Span }
	| { readonly kind: "local"; readonly name: string; readonly type: SemType; readonly span: Span }
	| { readonly kind: "none"; readonly type: SemType; readonly span: Span }
	| { readonly kind: "some"; readonly inner: CExpr; readonly type: SemType; readonly span: Span }
	| {
			readonly kind: "record";
			readonly typeName: string;
			readonly fields: readonly { readonly name: string; readonly value: CExpr }[];
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "field";
			readonly target: CExpr;
			readonly name: string;
			readonly type: SemType;
			readonly span: Span;
	  }
	| { readonly kind: "list"; readonly items: readonly CExpr[]; readonly type: SemType; readonly span: Span }
	| {
			readonly kind: "call";
			readonly fn: string;
			readonly args: readonly CExpr[];
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "op";
			readonly op: string;
			readonly args: readonly CExpr[];
			/** A comptime payload, currently only the normalized regex of `re.test`. */
			readonly regex?: NormalizedRegex;
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "lambda";
			readonly params: readonly { readonly name: string; readonly type: SemType }[];
			readonly body: readonly CStmt[];
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "cond";
			readonly test: CExpr;
			readonly then: CExpr;
			readonly otherwise: CExpr;
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "and";
			readonly left: CExpr;
			readonly right: CExpr;
			readonly type: SemType;
			readonly span: Span;
	  }
	| {
			readonly kind: "or";
			readonly left: CExpr;
			readonly right: CExpr;
			readonly type: SemType;
			readonly span: Span;
	  }
	| { readonly kind: "not"; readonly operand: CExpr; readonly type: SemType; readonly span: Span };

export type CStmt =
	| {
			readonly kind: "let";
			readonly name: string;
			readonly mutable: boolean;
			readonly init: CExpr;
			readonly type: SemType;
			readonly span: Span;
	  }
	| { readonly kind: "assign"; readonly name: string; readonly value: CExpr; readonly span: Span }
	| {
			readonly kind: "setIndex";
			readonly name: string;
			readonly index: CExpr;
			readonly value: CExpr;
			readonly span: Span;
	  }
	| { readonly kind: "push"; readonly name: string; readonly value: CExpr; readonly span: Span }
	| {
			readonly kind: "if";
			readonly test: CExpr;
			readonly then: readonly CStmt[];
			readonly otherwise: readonly CStmt[];
			readonly span: Span;
	  }
	| {
			readonly kind: "switch";
			readonly subject: CExpr;
			readonly cases: readonly { readonly values: readonly Value[]; readonly body: readonly CStmt[] }[];
			readonly otherwise?: readonly CStmt[];
			readonly span: Span;
	  }
	| {
			readonly kind: "forRange";
			readonly name: string;
			readonly type: SemType;
			readonly from: CExpr;
			readonly to: CExpr;
			readonly inclusive: boolean;
			readonly step: bigint;
			readonly body: readonly CStmt[];
			readonly span: Span;
	  }
	| {
			readonly kind: "forEach";
			readonly name: string;
			readonly type: SemType;
			readonly iterable: CExpr;
			readonly body: readonly CStmt[];
			readonly span: Span;
	  }
	| { readonly kind: "return"; readonly value?: CExpr; readonly span: Span }
	| {
			readonly kind: "fail";
			readonly errorClass: string;
			readonly args: readonly CExpr[];
			readonly span: Span;
	  }
	| { readonly kind: "break"; readonly span: Span }
	| { readonly kind: "continue"; readonly span: Span }
	| { readonly kind: "expr"; readonly expr: CExpr; readonly span: Span };

export type CParam = { readonly name: string; readonly type: SemType; readonly doc?: string };

export type CFunc = {
	/** Fully qualified: `<module>::<name>`. */
	readonly name: string;
	readonly module: string;
	readonly localName: string;
	readonly params: readonly CParam[];
	readonly ret: SemType;
	readonly effects: EffectSet;
	readonly body: readonly CStmt[];
	/**
	 * True for a utility: an exported function of a source-root module, the published core API.
	 * Drives what a backend treats as a driver entry point and lists in `API.json`; unrelated to
	 * whether the function's own source module exported it (see `moduleExported`) — a library
	 * helper can be reachable across modules without ever being a utility.
	 */
	readonly exported: boolean;
	/**
	 * True when the source module that declares this function marked it `export`, whatever module
	 * that is — root or `lib/`. This is the literal per-file fact a backend's printer turns into
	 * `export`/`pub`/no leading underscore, so a generated module's public surface matches its
	 * source module's, name for name. False for a specialization (checked against a call site's
	 * argument types, so no single generated name is "the" export) even when its declaration was.
	 */
	readonly moduleExported: boolean;
	readonly doc?: string;
	readonly span: Span;
	/** Functions this one calls, fully qualified. */
	readonly calls: readonly string[];
	/** True once capability threading has decided this function receives the environment. */
	readonly usesEnv: boolean;
};

export type CConst = {
	readonly name: string;
	readonly type: SemType;
	readonly value: Value;
	readonly module: string;
	/** Present when the constant is a regex literal, which is comptime-only data. */
	readonly regex?: NormalizedRegex;
};

export type CProgram = {
	readonly records: ReadonlyMap<string, CRecordDef>;
	readonly errors: ReadonlyMap<string, CErrorDef>;
	readonly functions: ReadonlyMap<string, CFunc>;
	readonly consts: ReadonlyMap<string, CConst>;
	/** Exported utilities, in declaration order: the roots of every dependency closure. */
	readonly entryPoints: readonly string[];
};

export function mapStatements(
	body: readonly CStmt[],
	visit: (statement: CStmt) => CStmt[],
): CStmt[] {
	return body.flatMap((statement) => visit(statement));
}

/** A readable, reviewable dump of the annotated Core. This is what `--dump core` prints. */
export function dumpProgram(program: CProgram): string {
	const lines: string[] = [];
	for (const record of program.records.values()) {
		lines.push(
			`record ${record.name} { ${record.fields.map((field) => `${field.name}${field.optional ? "?" : ""}: ${typeToString(field.type)}`).join(", ")} }`,
		);
	}
	for (const error of program.errors.values()) {
		lines.push(`error ${error.name}${error.base === undefined ? "" : ` extends ${error.base}`}`);
	}
	for (const constant of program.consts.values()) {
		lines.push(`const ${constant.name}: ${typeToString(constant.type)}`);
	}
	for (const fn of program.functions.values()) {
		lines.push("");
		lines.push(
			`fn ${fn.name}(${fn.params.map((param) => `${param.name}: ${typeToString(param.type)}`).join(", ")}): ${typeToString(fn.ret)} ! ${effectLabel(fn)}`,
		);
		for (const statement of fn.body) lines.push(...dumpStmt(statement, 1));
	}
	return lines.join("\n");
}

function effectLabel(fn: CFunc): string {
	const parts: string[] = [];
	for (const name of fn.effects.fail) parts.push(`Fail<${name}>`);
	if (fn.effects.http) parts.push("Http");
	if (fn.effects.clock) parts.push("Clock");
	if (fn.effects.random) parts.push("Random");
	if (fn.usesEnv) parts.push("env");
	return parts.length === 0 ? "Pure" : parts.join("+");
}

function dumpStmt(statement: CStmt, depth: number): string[] {
	const pad = "  ".repeat(depth);
	switch (statement.kind) {
		case "let":
			return [`${pad}${statement.mutable ? "let" : "const"} ${statement.name}: ${typeToString(statement.type)} = ${dumpExpr(statement.init)}`];
		case "assign":
			return [`${pad}${statement.name} = ${dumpExpr(statement.value)}`];
		case "setIndex":
			return [`${pad}${statement.name}[${dumpExpr(statement.index)}] = ${dumpExpr(statement.value)}`];
		case "push":
			return [`${pad}push ${statement.name} <- ${dumpExpr(statement.value)}`];
		case "if":
			return [
				`${pad}if ${dumpExpr(statement.test)} {`,
				...statement.then.flatMap((item) => dumpStmt(item, depth + 1)),
				...(statement.otherwise.length === 0
					? []
					: [`${pad}} else {`, ...statement.otherwise.flatMap((item) => dumpStmt(item, depth + 1))]),
				`${pad}}`,
			];
		case "switch":
			return [
				`${pad}switch ${dumpExpr(statement.subject)} {`,
				...statement.cases.flatMap((entry) => [
					`${pad}  case ${entry.values.map((value) => JSON.stringify(value)).join(", ")}:`,
					...entry.body.flatMap((item) => dumpStmt(item, depth + 2)),
				]),
				...(statement.otherwise === undefined
					? []
					: [`${pad}  default:`, ...statement.otherwise.flatMap((item) => dumpStmt(item, depth + 2))]),
				`${pad}}`,
			];
		case "forRange":
			return [
				`${pad}for ${statement.name}: ${typeToString(statement.type)} = ${dumpExpr(statement.from)} ${statement.step > 0n ? "to" : "downto"} ${dumpExpr(statement.to)} {`,
				...statement.body.flatMap((item) => dumpStmt(item, depth + 1)),
				`${pad}}`,
			];
		case "forEach":
			return [
				`${pad}forEach ${statement.name}: ${typeToString(statement.type)} in ${dumpExpr(statement.iterable)} {`,
				...statement.body.flatMap((item) => dumpStmt(item, depth + 1)),
				`${pad}}`,
			];
		case "return":
			return [`${pad}return${statement.value === undefined ? "" : ` ${dumpExpr(statement.value)}`}`];
		case "fail":
			return [`${pad}fail ${statement.errorClass}(${statement.args.map(dumpExpr).join(", ")})`];
		case "break":
			return [`${pad}break`];
		case "continue":
			return [`${pad}continue`];
		case "expr":
			return [`${pad}${dumpExpr(statement.expr)}`];
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

export function dumpExpr(expr: CExpr): string {
	switch (expr.kind) {
		case "lit":
			return `${literal(expr.value)}: ${typeToString(expr.type)}`;
		case "local":
			return `${expr.name}: ${typeToString(expr.type)}`;
		case "none":
			return "none";
		case "some":
			return `some(${dumpExpr(expr.inner)})`;
		case "record":
			return `${expr.typeName} { ${expr.fields.map((field) => `${field.name}: ${dumpExpr(field.value)}`).join(", ")} }`;
		case "field":
			return `${dumpExpr(expr.target)}.${expr.name}`;
		case "list":
			return `[${expr.items.map(dumpExpr).join(", ")}]`;
		case "call":
			return `${expr.fn}(${expr.args.map(dumpExpr).join(", ")})`;
		case "op":
			return `${expr.op}${expr.regex === undefined ? "" : `/${expr.regex.source}/`}(${expr.args.map(dumpExpr).join(", ")}): ${typeToString(expr.type)}`;
		case "lambda":
			return `(${expr.params.map((param) => `${param.name}: ${typeToString(param.type)}`).join(", ")}) => …`;
		case "cond":
			return `(${dumpExpr(expr.test)} ? ${dumpExpr(expr.then)} : ${dumpExpr(expr.otherwise)})`;
		case "and":
			return `(${dumpExpr(expr.left)} && ${dumpExpr(expr.right)})`;
		case "or":
			return `(${dumpExpr(expr.left)} || ${dumpExpr(expr.right)})`;
		case "not":
			return `!${dumpExpr(expr.operand)}`;
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function literal(value: Value): string {
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
	return String(value);
}
