/**
 * The Target AST.
 *
 * Generated code is built as a tree and printed once; nothing in the engine concatenates source
 * text. The tree is shared by the three backends because the constructs they need overlap almost
 * entirely; what differs — statement-only languages, multi-return errors, async colouring — is
 * expressed as nanopasses over this tree, and the per-target printer decides the syntax.
 */

import type { SemType } from "../types.ts";
import type { Value } from "../values.ts";

export type TExpr =
	| { readonly kind: "lit"; readonly value: Value; readonly type: SemType }
	| { readonly kind: "name"; readonly name: string }
	| { readonly kind: "call"; readonly callee: TExpr; readonly args: readonly TExpr[]; readonly await?: boolean }
	| {
			readonly kind: "method";
			readonly target: TExpr;
			readonly name: string;
			readonly args: readonly TExpr[];
			readonly await?: boolean;
	  }
	| { readonly kind: "member"; readonly target: TExpr; readonly name: string }
	| { readonly kind: "index"; readonly target: TExpr; readonly index: TExpr }
	| { readonly kind: "binary"; readonly op: string; readonly left: TExpr; readonly right: TExpr }
	| { readonly kind: "unary"; readonly op: string; readonly operand: TExpr }
	| { readonly kind: "ternary"; readonly test: TExpr; readonly then: TExpr; readonly otherwise: TExpr }
	| { readonly kind: "list"; readonly items: readonly TExpr[]; readonly type: SemType }
	| {
			readonly kind: "record";
			readonly typeName: string;
			readonly fields: readonly { readonly name: string; readonly value: TExpr }[];
	  }
	| {
			readonly kind: "lambda";
			readonly params: readonly { readonly name: string; readonly type: SemType }[];
			readonly body: readonly TStmt[];
			readonly ret: SemType;
	  }
	| { readonly kind: "none"; readonly type: SemType }
	| { readonly kind: "some"; readonly inner: TExpr }
	/** A target-specific fragment produced by that target's capability table. */
	| { readonly kind: "raw"; readonly text: string; readonly precedence?: number }
	/** The target's zero value for a type: what a Go function returns beside a non-nil error. */
	| { readonly kind: "zero"; readonly type: SemType };

export type TStmt =
	| {
			readonly kind: "let";
			readonly name: string;
			readonly type: SemType;
			readonly init: TExpr;
			readonly mutable: boolean;
	  }
	| { readonly kind: "assign"; readonly target: TExpr; readonly value: TExpr }
	| { readonly kind: "if"; readonly test: TExpr; readonly then: readonly TStmt[]; readonly otherwise: readonly TStmt[] }
	| {
			readonly kind: "switch";
			readonly subject: TExpr;
			readonly cases: readonly { readonly values: readonly Value[]; readonly body: readonly TStmt[] }[];
			readonly otherwise?: readonly TStmt[];
	  }
	| {
			readonly kind: "for";
			readonly name: string;
			readonly type: SemType;
			readonly from: TExpr;
			readonly to: TExpr;
			readonly inclusive: boolean;
			readonly step: bigint;
			readonly body: readonly TStmt[];
	  }
	| {
			readonly kind: "forEach";
			readonly name: string;
			readonly type: SemType;
			readonly iterable: TExpr;
			readonly body: readonly TStmt[];
	  }
	| {
			readonly kind: "multiLet";
			readonly names: readonly string[];
			readonly types: readonly SemType[];
			readonly init: TExpr;
	  }
	| { readonly kind: "return"; readonly value?: TExpr; readonly extra?: readonly TExpr[] }
	| { readonly kind: "throw"; readonly errorClass: string; readonly args: readonly TExpr[] }
	| { readonly kind: "break" }
	| { readonly kind: "continue" }
	| { readonly kind: "expr"; readonly expr: TExpr }
	| { readonly kind: "raw"; readonly text: string };

export type TParam = { readonly name: string; readonly type: SemType; readonly doc?: string };

export type TFunc = {
	readonly name: string;
	readonly params: readonly TParam[];
	readonly ret: SemType;
	readonly body: readonly TStmt[];
	readonly exported: boolean;
	readonly doc?: string;
	readonly isAsync: boolean;
	/** Domain errors this function may raise; the Go backend turns these into a second return. */
	readonly fails: readonly string[];
	readonly usesEnv: boolean;
	/** Provenance: the source module and function this was generated from. */
	readonly source: { readonly module: string; readonly name: string; readonly start: number; readonly end: number };
};

export type TRecord = {
	readonly name: string;
	readonly fields: readonly { readonly name: string; readonly type: SemType; readonly doc?: string }[];
	readonly doc?: string;
};

export type TErrorClass = {
	readonly name: string;
	readonly base?: string;
	readonly doc?: string;
};

export type TConst = {
	readonly name: string;
	readonly type: SemType;
	readonly value: TExpr;
};

export type TModule = {
	/** Path of the generated file, relative to the target's output directory. */
	readonly path: string;
	/** The Core module this file was generated from, which the import computation needs. */
	readonly sourcePath: string;
	readonly imports: readonly TImport[];
	readonly records: readonly TRecord[];
	readonly errors: readonly TErrorClass[];
	/** Constant tables hoisted out of the functions that use them. */
	readonly constants: readonly TConst[];
	readonly functions: readonly TFunc[];
	readonly header: string;
	/** Target modules the emitted code needs, collected from the capability table. */
	readonly requires: readonly string[];
};

export type TImport = {
	readonly from: string;
	readonly names: readonly string[];
	/** True when the names are types only, which a type-stripping runtime has to be told. */
	readonly typeOnly?: boolean;
	/** A whole-module import, used by Python and Go. */
	readonly module?: boolean;
};


/** Escapes every non-ASCII scalar, so a generated file is plain ASCII and never carries a BOM. */
export function asciiString(value: string): string {
	let out = '"';
	for (const scalar of value) {
		const point = scalar.codePointAt(0)!;
		if (scalar === '"') out += '\\"';
		else if (scalar === "\\") out += "\\\\";
		else if (point === 0x0a) out += "\\n";
		else if (point === 0x0d) out += "\\r";
		else if (point === 0x09) out += "\\t";
		else if (point < 0x20 || point > 0x7e) {
			out += point > 0xffff ? `\\U${point.toString(16).padStart(8, "0")}` : `\\u${point.toString(16).padStart(4, "0")}`;
		} else out += scalar;
	}
	return `${out}"`;
}

/** Rewrites every expression of a statement list bottom-up. */
export function mapExprs(body: readonly TStmt[], visit: (expr: TExpr) => TExpr): TStmt[] {
	const expr = (node: TExpr): TExpr => {
		const mapped = ((): TExpr => {
			switch (node.kind) {
				case "call":
					return { ...node, callee: expr(node.callee), args: node.args.map(expr) };
				case "method":
					return { ...node, target: expr(node.target), args: node.args.map(expr) };
				case "member":
					return { ...node, target: expr(node.target) };
				case "index":
					return { ...node, target: expr(node.target), index: expr(node.index) };
				case "binary":
					return { ...node, left: expr(node.left), right: expr(node.right) };
				case "unary":
					return { ...node, operand: expr(node.operand) };
				case "ternary":
					return { ...node, test: expr(node.test), then: expr(node.then), otherwise: expr(node.otherwise) };
				case "list":
					return { ...node, items: node.items.map(expr) };
				case "record":
					return { ...node, fields: node.fields.map((field) => ({ ...field, value: expr(field.value) })) };
				case "lambda":
					return { ...node, body: mapExprs(node.body, visit) };
				case "some":
					return { ...node, inner: expr(node.inner) };
				default:
					return node;
			}
		})();
		return visit(mapped);
	};

	return body.map((statement): TStmt => {
		switch (statement.kind) {
			case "let":
				return { ...statement, init: expr(statement.init) };
			case "assign":
				return { ...statement, target: expr(statement.target), value: expr(statement.value) };
			case "if":
				return {
					...statement,
					test: expr(statement.test),
					then: mapExprs(statement.then, visit),
					otherwise: mapExprs(statement.otherwise, visit),
				};
			case "switch":
				return {
					...statement,
					subject: expr(statement.subject),
					cases: statement.cases.map((entry) => ({ ...entry, body: mapExprs(entry.body, visit) })),
					otherwise: statement.otherwise === undefined ? undefined : mapExprs(statement.otherwise, visit),
				};
			case "for":
				return {
					...statement,
					from: expr(statement.from),
					to: expr(statement.to),
					body: mapExprs(statement.body, visit),
				};
			case "forEach":
				return { ...statement, iterable: expr(statement.iterable), body: mapExprs(statement.body, visit) };
			case "multiLet":
				return { ...statement, init: expr(statement.init) };
			case "return":
				return {
					...statement,
					value: statement.value === undefined ? undefined : expr(statement.value),
					extra: statement.extra?.map(expr),
				};
			case "throw":
				return { ...statement, args: statement.args.map(expr) };
			case "expr":
				return { ...statement, expr: expr(statement.expr) };
			default:
				return statement;
		}
	});
}

/** Rewrites every statement list of a statement list top-down. */
export function mapStmts(body: readonly TStmt[], visit: (statements: readonly TStmt[]) => TStmt[]): TStmt[] {
	const inner = body.map((statement): TStmt => {
		switch (statement.kind) {
			case "if":
				return { ...statement, then: mapStmts(statement.then, visit), otherwise: mapStmts(statement.otherwise, visit) };
			case "switch":
				return {
					...statement,
					cases: statement.cases.map((entry) => ({ ...entry, body: mapStmts(entry.body, visit) })),
					otherwise: statement.otherwise === undefined ? undefined : mapStmts(statement.otherwise, visit),
				};
			case "for":
			case "forEach":
				return { ...statement, body: mapStmts(statement.body, visit) };
			default:
				return statement;
		}
	});
	return visit(inner);
}
