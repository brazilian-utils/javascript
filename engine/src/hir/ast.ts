/**
 * Semantic HIR: the frontend contract.
 *
 * The HIR is faithful to the source — sugar is still present, names are resolved, every node has
 * a span — but it no longer mentions TypeScript or `oxc`. Any future frontend (a DSL, or Rust)
 * produces this and nothing downstream changes. `tests/boundary.spec.ts` enforces that no module
 * after this one imports the parser.
 */

import type { Span } from "../diagnostics.ts";

export type HTypeExpr =
	| { readonly kind: "ref"; readonly name: string; readonly args: readonly HTypeExpr[]; readonly span: Span }
	| { readonly kind: "array"; readonly elem: HTypeExpr; readonly span: Span }
	| { readonly kind: "union"; readonly options: readonly HTypeExpr[]; readonly span: Span }
	| { readonly kind: "literal"; readonly value: string; readonly span: Span }
	| { readonly kind: "object"; readonly fields: readonly HField[]; readonly span: Span }
	| {
			readonly kind: "func";
			readonly params: readonly HTypeExpr[];
			readonly ret: HTypeExpr;
			readonly span: Span;
	  }
	| { readonly kind: "undefined"; readonly span: Span };

export type HField = {
	readonly name: string;
	readonly type: HTypeExpr;
	readonly optional: boolean;
	readonly doc?: string;
	readonly span: Span;
};

export type HTypeDecl = {
	readonly name: string;
	readonly type: HTypeExpr;
	readonly exported: boolean;
	readonly doc?: string;
	readonly span: Span;
};

export type HErrorDecl = {
	readonly name: string;
	readonly base: string;
	readonly exported: boolean;
	readonly doc?: string;
	readonly span: Span;
};

export type HConst = {
	readonly name: string;
	readonly declared?: HTypeExpr;
	readonly value: HExpr;
	readonly exported: boolean;
	readonly span: Span;
};

export type HParam = {
	readonly name: string;
	readonly type: HTypeExpr;
	readonly span: Span;
};

export type HFunc = {
	readonly name: string;
	readonly params: readonly HParam[];
	readonly ret: HTypeExpr;
	readonly body: readonly HStmt[];
	readonly exported: boolean;
	readonly doc?: string;
	readonly span: Span;
};

export type HModule = {
	/** Module path relative to the project's source root, without extension. */
	readonly path: string;
	readonly file: string;
	readonly source: string;
	readonly imports: readonly HImport[];
	readonly types: readonly HTypeDecl[];
	readonly errors: readonly HErrorDecl[];
	readonly consts: readonly HConst[];
	readonly functions: readonly HFunc[];
};

export type HImport = {
	readonly from: string;
	readonly names: readonly { readonly imported: string; readonly local: string }[];
	readonly span: Span;
};

export type HBinaryOp =
	| "+"
	| "-"
	| "*"
	| "/"
	| "%"
	| "<"
	| "<="
	| ">"
	| ">="
	| "==="
	| "!==";

export type HExpr =
	| { readonly kind: "int"; readonly value: bigint; readonly span: Span }
	| { readonly kind: "float"; readonly value: number; readonly span: Span }
	| { readonly kind: "string"; readonly value: string; readonly span: Span }
	| { readonly kind: "bool"; readonly value: boolean; readonly span: Span }
	| { readonly kind: "undefined"; readonly span: Span }
	| { readonly kind: "regex"; readonly source: string; readonly flags: string; readonly span: Span }
	| { readonly kind: "name"; readonly name: string; readonly span: Span }
	| { readonly kind: "member"; readonly target: HExpr; readonly name: string; readonly span: Span }
	| { readonly kind: "index"; readonly target: HExpr; readonly index: HExpr; readonly span: Span }
	| { readonly kind: "call"; readonly callee: HExpr; readonly args: readonly HExpr[]; readonly span: Span }
	| { readonly kind: "new"; readonly className: string; readonly args: readonly HExpr[]; readonly span: Span }
	| {
			readonly kind: "binary";
			readonly op: HBinaryOp;
			readonly left: HExpr;
			readonly right: HExpr;
			readonly span: Span;
	  }
	| {
			readonly kind: "logical";
			readonly op: "&&" | "||" | "??";
			readonly left: HExpr;
			readonly right: HExpr;
			readonly span: Span;
	  }
	| { readonly kind: "unary"; readonly op: "!" | "-"; readonly operand: HExpr; readonly span: Span }
	| {
			readonly kind: "ternary";
			readonly test: HExpr;
			readonly then: HExpr;
			readonly otherwise: HExpr;
			readonly span: Span;
	  }
	| {
			readonly kind: "template";
			readonly parts: readonly (
				| { readonly kind: "text"; readonly value: string }
				| { readonly kind: "expr"; readonly expr: HExpr }
			)[];
			readonly span: Span;
	  }
	| {
			readonly kind: "object";
			readonly fields: readonly { readonly name: string; readonly value: HExpr; readonly span: Span }[];
			readonly span: Span;
	  }
	| { readonly kind: "array"; readonly items: readonly HExpr[]; readonly span: Span }
	| {
			readonly kind: "lambda";
			readonly params: readonly { readonly name: string; readonly type?: HTypeExpr; readonly span: Span }[];
			readonly body: readonly HStmt[];
			readonly span: Span;
	  };

export type HStmt =
	| {
			readonly kind: "let";
			readonly name: string;
			readonly mutable: boolean;
			readonly declared?: HTypeExpr;
			readonly init: HExpr;
			readonly span: Span;
	  }
	| {
			readonly kind: "assign";
			readonly target: HExpr;
			readonly op: "=" | "+=" | "-=" | "*=";
			readonly value: HExpr;
			readonly span: Span;
	  }
	| {
			readonly kind: "if";
			readonly test: HExpr;
			readonly then: readonly HStmt[];
			readonly otherwise?: readonly HStmt[];
			readonly span: Span;
	  }
	| {
			readonly kind: "switch";
			readonly subject: HExpr;
			readonly cases: readonly {
				readonly test?: HExpr;
				readonly body: readonly HStmt[];
				readonly span: Span;
			}[];
			readonly span: Span;
	  }
	| {
			readonly kind: "forCounted";
			readonly name: string;
			readonly from: HExpr;
			readonly to: HExpr;
			readonly inclusive: boolean;
			readonly step: bigint;
			readonly body: readonly HStmt[];
			readonly span: Span;
	  }
	| {
			readonly kind: "forOf";
			readonly name: string;
			readonly iterable: HExpr;
			readonly body: readonly HStmt[];
			readonly span: Span;
	  }
	| { readonly kind: "return"; readonly value?: HExpr; readonly span: Span }
	| {
			readonly kind: "throw";
			readonly errorClass: string;
			readonly args: readonly HExpr[];
			readonly span: Span;
	  }
	| { readonly kind: "break"; readonly span: Span }
	| { readonly kind: "continue"; readonly span: Span }
	| { readonly kind: "expr"; readonly expr: HExpr; readonly span: Span }
	| { readonly kind: "block"; readonly body: readonly HStmt[]; readonly span: Span };

/** A readable dump of the HIR, used by the stage snapshot tests. */
export function dumpHir(module: HModule): string {
	const lines: string[] = [`module ${module.path}`];
	for (const item of module.imports) {
		lines.push(`  import ${item.names.map((name) => name.imported).join(", ")} from ${item.from}`);
	}
	for (const decl of module.types) lines.push(`  type ${decl.name} = ${typeExprToString(decl.type)}`);
	for (const decl of module.errors) lines.push(`  error ${decl.name} extends ${decl.base}`);
	for (const decl of module.consts) lines.push(`  const ${decl.name} = ${exprToString(decl.value)}`);
	for (const decl of module.functions) {
		lines.push(
			`  fn ${decl.name}(${decl.params.map((param) => `${param.name}: ${typeExprToString(param.type)}`).join(", ")}): ${typeExprToString(decl.ret)}`,
		);
		for (const statement of decl.body) lines.push(...stmtToString(statement, 2));
	}
	return lines.join("\n");
}

export function typeExprToString(type: HTypeExpr): string {
	switch (type.kind) {
		case "ref":
			return type.args.length === 0
				? type.name
				: `${type.name}<${type.args.map(typeExprToString).join(", ")}>`;
		case "array":
			return `${typeExprToString(type.elem)}[]`;
		case "union":
			return type.options.map(typeExprToString).join(" | ");
		case "literal":
			return JSON.stringify(type.value);
		case "object":
			return `{ ${type.fields.map((field) => `${field.name}${field.optional ? "?" : ""}: ${typeExprToString(field.type)}`).join("; ")} }`;
		case "func":
			return `(${type.params.map(typeExprToString).join(", ")}) => ${typeExprToString(type.ret)}`;
		case "undefined":
			return "undefined";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}

function exprToString(expr: HExpr): string {
	switch (expr.kind) {
		case "int":
			return expr.value.toString();
		case "float":
			return expr.value.toString();
		case "string":
			return JSON.stringify(expr.value);
		case "bool":
			return String(expr.value);
		case "undefined":
			return "undefined";
		case "regex":
			return `/${expr.source}/${expr.flags}`;
		case "name":
			return expr.name;
		case "member":
			return `${exprToString(expr.target)}.${expr.name}`;
		case "index":
			return `${exprToString(expr.target)}[${exprToString(expr.index)}]`;
		case "call":
			return `${exprToString(expr.callee)}(${expr.args.map(exprToString).join(", ")})`;
		case "new":
			return `new ${expr.className}(${expr.args.map(exprToString).join(", ")})`;
		case "binary":
			return `(${exprToString(expr.left)} ${expr.op} ${exprToString(expr.right)})`;
		case "logical":
			return `(${exprToString(expr.left)} ${expr.op} ${exprToString(expr.right)})`;
		case "unary":
			return `${expr.op}${exprToString(expr.operand)}`;
		case "ternary":
			return `(${exprToString(expr.test)} ? ${exprToString(expr.then)} : ${exprToString(expr.otherwise)})`;
		case "template":
			return `\`${expr.parts.map((part) => (part.kind === "text" ? part.value : `\${${exprToString(part.expr)}}`)).join("")}\``;
		case "object":
			return `{ ${expr.fields.map((field) => `${field.name}: ${exprToString(field.value)}`).join(", ")} }`;
		case "array":
			return `[${expr.items.map(exprToString).join(", ")}]`;
		case "lambda":
			return `(${expr.params.map((param) => param.name).join(", ")}) => …`;
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function stmtToString(statement: HStmt, depth: number): string[] {
	const pad = "  ".repeat(depth);
	switch (statement.kind) {
		case "let":
			return [`${pad}${statement.mutable ? "let" : "const"} ${statement.name} = ${exprToString(statement.init)}`];
		case "assign":
			return [`${pad}${exprToString(statement.target)} ${statement.op} ${exprToString(statement.value)}`];
		case "if":
			return [
				`${pad}if ${exprToString(statement.test)}`,
				...statement.then.flatMap((item) => stmtToString(item, depth + 1)),
				...(statement.otherwise === undefined
					? []
					: [`${pad}else`, ...statement.otherwise.flatMap((item) => stmtToString(item, depth + 1))]),
			];
		case "switch":
			return [
				`${pad}switch ${exprToString(statement.subject)}`,
				...statement.cases.flatMap((item) => [
					`${pad}  case ${item.test === undefined ? "default" : exprToString(item.test)}`,
					...item.body.flatMap((inner) => stmtToString(inner, depth + 2)),
				]),
			];
		case "forCounted":
			return [
				`${pad}for ${statement.name} from ${exprToString(statement.from)} to ${exprToString(statement.to)}`,
				...statement.body.flatMap((item) => stmtToString(item, depth + 1)),
			];
		case "forOf":
			return [
				`${pad}for ${statement.name} of ${exprToString(statement.iterable)}`,
				...statement.body.flatMap((item) => stmtToString(item, depth + 1)),
			];
		case "return":
			return [`${pad}return${statement.value === undefined ? "" : ` ${exprToString(statement.value)}`}`];
		case "throw":
			return [`${pad}throw ${statement.errorClass}(${statement.args.map(exprToString).join(", ")})`];
		case "break":
			return [`${pad}break`];
		case "continue":
			return [`${pad}continue`];
		case "expr":
			return [`${pad}${exprToString(statement.expr)}`];
		case "block":
			return [`${pad}{`, ...statement.body.flatMap((item) => stmtToString(item, depth + 1)), `${pad}}`];
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}
