/**
 * The generator's own tiny AST for a fuzzed function body, and its printer to source text.
 *
 * This is deliberately not the engine's HIR: the generator has to build and mutate (for
 * shrinking) well-typed programs *before* they exist as text, and doing that against a
 * purpose-built, minimal tree is far simpler than driving `oxc-parser`'s TypeScript grammar in
 * reverse. The printer's only job is to emit source the engine's own frontend parses back into
 * the same HIR shapes documented in `docs/semantics.md` section 7.
 */

export type BinOp = "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "===" | "!==";

export type Expr =
	| { readonly k: "int"; value: bigint }
	| { readonly k: "bool"; value: boolean }
	| { readonly k: "var"; name: string }
	| { readonly k: "bin"; op: BinOp; l: Expr; r: Expr }
	| { readonly k: "logical"; op: "&&" | "||"; l: Expr; r: Expr }
	| { readonly k: "not"; e: Expr }
	| { readonly k: "ternary"; test: Expr; then: Expr; else_: Expr }
	/** `target[index]`, which the frontend lowers to `seq.get`/`str.charAt`. */
	| { readonly k: "index"; target: Expr; index: Expr }
	/** `target.length`, the only member access the generator needs. */
	| { readonly k: "length"; target: Expr }
	/** An intrinsic module call, `fn(...args)` (`str.codePoints`, `seq.at`, `str.fromCodePoints`, …). */
	| { readonly k: "call"; fn: string; args: readonly Expr[] }
	/** An array literal; the generator only ever needs the empty one, `[]`. */
	| { readonly k: "emptyArray" };

export type Stmt =
	| { readonly k: "let"; name: string; typeAnn: string; init: Expr; mutable: boolean }
	| { readonly k: "assign"; name: string; op: "=" | "+=" | "-=" | "*="; value: Expr }
	| { readonly k: "push"; name: string; value: Expr }
	| { readonly k: "if"; test: Expr; then: readonly Stmt[]; else_?: readonly Stmt[] }
	| { readonly k: "forCounted"; name: string; fromN: bigint; to: Expr; body: readonly Stmt[] }
	| { readonly k: "forOf"; name: string; iterable: Expr; body: readonly Stmt[] }
	| {
			readonly k: "switch";
			subject: Expr;
			cases: readonly { readonly test?: string; readonly body: readonly Stmt[] }[];
	  }
	| { readonly k: "return"; value?: Expr }
	| { readonly k: "break" }
	| { readonly k: "continue" };

export type Param = { readonly name: string; readonly typeAnn: string };

export type FuzzFunc = {
	readonly enumDecl?: { readonly name: string; readonly members: readonly string[] };
	readonly params: readonly Param[];
	readonly retTypeAnn: string;
	readonly body: readonly Stmt[];
	readonly fnName: string;
};

function printExpr(expr: Expr): string {
	switch (expr.k) {
		case "int":
			return expr.value < 0n ? `(${expr.value})` : `${expr.value}`;
		case "bool":
			return `${expr.value}`;
		case "var":
			return expr.name;
		case "bin":
			return `(${printExpr(expr.l)} ${expr.op} ${printExpr(expr.r)})`;
		case "logical":
			return `(${printExpr(expr.l)} ${expr.op} ${printExpr(expr.r)})`;
		case "not":
			return `!(${printExpr(expr.e)})`;
		case "ternary":
			return `(${printExpr(expr.test)} ? ${printExpr(expr.then)} : ${printExpr(expr.else_)})`;
		case "index":
			return `${printExpr(expr.target)}[${printExpr(expr.index)}]`;
		case "length":
			return `${printExpr(expr.target)}.length`;
		case "call":
			return `${expr.fn}(${expr.args.map(printExpr).join(", ")})`;
		case "emptyArray":
			return "[]";
	}
}

function printBlock(body: readonly Stmt[], indent: string): string {
	if (body.length === 0) return `${indent}\n`;
	return body.map((stmt) => printStmt(stmt, indent)).join("");
}

function printStmt(stmt: Stmt, indent: string): string {
	switch (stmt.k) {
		case "let":
			return `${indent}${stmt.mutable ? "let" : "const"} ${stmt.name}: ${stmt.typeAnn} = ${printExpr(stmt.init)};\n`;
		case "assign":
			return `${indent}${stmt.name} ${stmt.op} ${printExpr(stmt.value)};\n`;
		case "push":
			return `${indent}${stmt.name}.push(${printExpr(stmt.value)});\n`;
		case "if": {
			const then = `${indent}if (${printExpr(stmt.test)}) {\n${printBlock(stmt.then, `${indent}\t`)}${indent}}`;
			if (stmt.else_ === undefined) return `${then}\n`;
			return `${then} else {\n${printBlock(stmt.else_, `${indent}\t`)}${indent}}\n`;
		}
		case "forCounted":
			return (
				`${indent}for (let ${stmt.name} = ${stmt.fromN}; ${stmt.name} < ${printExpr(stmt.to)}; ${stmt.name}++) {\n` +
				`${printBlock(stmt.body, `${indent}\t`)}${indent}}\n`
			);
		case "forOf":
			return (
				`${indent}for (const ${stmt.name} of ${printExpr(stmt.iterable)}) {\n` +
				`${printBlock(stmt.body, `${indent}\t`)}${indent}}\n`
			);
		case "switch": {
			const cases = stmt.cases
				.map((c) => {
					const label = c.test === undefined ? `${indent}\tdefault:\n` : `${indent}\tcase ${c.test}:\n`;
					return `${label}${printBlock(c.body, `${indent}\t\t`)}`;
				})
				.join("");
			return `${indent}switch (${printExpr(stmt.subject)}) {\n${cases}${indent}}\n`;
		}
		case "return":
			return `${indent}return${stmt.value === undefined ? "" : ` ${printExpr(stmt.value)}`};\n`;
		case "break":
			return `${indent}break;\n`;
		case "continue":
			return `${indent}continue;\n`;
	}
}

/** Renders a whole module: the optional enum, and the one exported entry point. */
export function printProgram(fn: FuzzFunc): string {
	const lines: string[] = [];
	if (fn.enumDecl !== undefined) {
		lines.push(`export type ${fn.enumDecl.name} = ${fn.enumDecl.members.map((m) => `"${m}"`).join(" | ")};\n\n`);
	}
	const params = fn.params.map((p) => `${p.name}: ${p.typeAnn}`).join(", ");
	lines.push(`export function ${fn.fnName}(${params}): ${fn.retTypeAnn} {\n`);
	lines.push(printBlock(fn.body, "\t"));
	lines.push(`}\n`);
	return lines.join("");
}
