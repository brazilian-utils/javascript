/**
 * The TypeScript frontend: `oxc-parser` output in, Semantic HIR out.
 *
 * Everything the subset rejects (docs/semantics.md, "Subset") is rejected here, with a span and,
 * where the compiler can tell, the construct to write instead. Nothing downstream ever sees a
 * TypeScript node: this module is the only one in the engine that imports the parser.
 */

import { parseSync } from "oxc-parser";
import type { Diagnostics, Span } from "../diagnostics.ts";
import type {
	HConst,
	HErrorDecl,
	HExpr,
	HFunc,
	HImport,
	HModule,
	HParam,
	HStmt,
	HTypeDecl,
	HTypeExpr,
} from "../hir/ast.ts";

/** The untyped ESTree-shaped JSON the parser hands back. */
type Node = any;

const HOST_GLOBALS = new Set([
	"Date",
	"Math",
	"JSON",
	"Intl",
	"fetch",
	"console",
	"setTimeout",
	"setInterval",
	"Promise",
	"RegExp",
	"Number",
	"String",
	"Boolean",
	"Object",
	"Array",
	"Map",
	"Set",
	"BigInt",
	"globalThis",
	"process",
	"structuredClone",
]);

const HOST_GLOBAL_HELP: Record<string, string> = {
	Date: "civil dates come from the `date` intrinsics; a host date is the DX's job",
	Math: "write the arithmetic in source, or use an admitted intrinsic",
	JSON: "parse in source; there is no host JSON in the core",
	Intl: "formatting is source library code, so every target formats identically",
	fetch: "call `http.request`; the capability is threaded for you",
	console: "the core has no output side",
	Number: "use `str.parseInt` or `float.fromInt`",
	RegExp: "write a regex literal; patterns are compile-time only",
};

/**
 * `Math` methods with a sound, always-Int lowering: every call site the source needs today is
 * integer arithmetic, and there is no `float.*` counterpart yet (admitting one needs a second
 * caller, docs/semantics.md "Admission rule for intrinsics"), so the checker rejects a Float
 * operand instead of silently truncating it.
 */
const MATH_METHODS = new Set(["min", "max", "abs", "trunc", "floor"]);

export function parseModule(
	file: string,
	path: string,
	source: string,
	diagnostics: Diagnostics,
): HModule {
	const parsed = parseSync(file, source, { lang: "ts" });
	for (const parseError of parsed.errors) {
		diagnostics.error("E_PARSE", parseError.message, {
			file,
			start: parseError.labels?.[0]?.start ?? 0,
			end: parseError.labels?.[0]?.end ?? 0,
		});
	}
	diagnostics.throwIfErrors();
	return new Lowering(file, path, source, diagnostics).module(parsed.program);
}

class Lowering {
	private readonly file: string;
	private readonly path: string;
	private readonly source: string;
	private readonly diagnostics: Diagnostics;

	constructor(file: string, path: string, source: string, diagnostics: Diagnostics) {
		this.file = file;
		this.path = path;
		this.source = source;
		this.diagnostics = diagnostics;
	}

	private span(node: Node): Span {
		return { file: this.file, start: node?.start ?? 0, end: node?.end ?? 0 };
	}

	private reject(code: string, message: string, node: Node, suggestion?: string): void {
		this.diagnostics.error(code, message, this.span(node), suggestion);
	}

	private doc(node: Node): string | undefined {
		// The JSDoc block immediately above the declaration, kept for the generated code's header.
		const before = this.source.slice(0, node.start);
		const match = /\/\*\*((?:[^*]|\*(?!\/))*)\*\/\s*(?:export\s+)?$/.exec(before);
		if (match === null) return undefined;
		return match[1]!
			.split("\n")
			.map((line) => line.replace(/^\s*\*ic?/, "").replace(/^\s*\*\s?/, "").trimEnd())
			.join("\n")
			.trim();
	}

	module(program: Node): HModule {
		const imports: HImport[] = [];
		const types: HTypeDecl[] = [];
		const errors: HErrorDecl[] = [];
		const consts: HConst[] = [];
		const functions: HFunc[] = [];

		for (const statement of program.body) {
			this.topLevel(statement, false, { imports, types, errors, consts, functions });
		}

		return {
			path: this.path,
			file: this.file,
			source: this.source,
			imports,
			types,
			errors,
			consts,
			functions,
		};
	}

	private topLevel(
		node: Node,
		exported: boolean,
		out: {
			imports: HImport[];
			types: HTypeDecl[];
			errors: HErrorDecl[];
			consts: HConst[];
			functions: HFunc[];
		},
	): void {
		switch (node.type) {
			case "ImportDeclaration": {
				if (node.importKind === "type") return;
				out.imports.push({
					from: node.source.value,
					names: (node.specifiers ?? [])
						.filter((specifier: Node) => specifier.type === "ImportSpecifier")
						.map((specifier: Node) => ({
							imported: specifier.imported.name,
							local: specifier.local.name,
						})),
					span: this.span(node),
				});
				return;
			}
			case "ExportNamedDeclaration": {
				if (node.declaration === null || node.declaration === undefined) return;
				this.topLevel(node.declaration, true, out);
				return;
			}
			case "ExportDefaultDeclaration":
				this.reject("E_DEFAULT_EXPORT", "default exports are outside the subset", node, "use a named export");
				return;
			case "TSTypeAliasDeclaration": {
				out.types.push({
					name: node.id.name,
					type: this.typeExpr(node.typeAnnotation),
					exported,
					doc: this.doc(node),
					span: this.span(node),
				});
				return;
			}
			case "TSInterfaceDeclaration":
				this.reject("E_INTERFACE", "interfaces are outside the subset", node, "declare a `type` alias instead");
				return;
			case "TSEnumDeclaration":
				this.reject(
					"E_TS_ENUM",
					"TypeScript enums are outside the subset",
					node,
					'use a string literal union, for example `type Version = "v1" | "v2"`',
				);
				return;
			case "ClassDeclaration": {
				if (node.body.body.length > 0) {
					this.reject(
						"E_CLASS_BODY",
						"only empty error classes are allowed",
						node,
						"move the behavior into a function",
					);
				}
				if (node.superClass === null || node.superClass === undefined) {
					this.reject("E_CLASS_BASE", "a class must extend an error type", node);
					return;
				}
				out.errors.push({
					name: node.id.name,
					base: node.superClass.name,
					exported,
					doc: this.doc(node),
					span: this.span(node),
				});
				return;
			}
			case "VariableDeclaration": {
				if (node.kind !== "const") {
					this.reject("E_TOP_LEVEL_LET", "module level bindings must be `const`", node);
				}
				for (const declarator of node.declarations) {
					if (declarator.id.type !== "Identifier") {
						this.reject("E_DESTRUCTURING", "destructuring is outside the subset", declarator);
						continue;
					}
					const init = declarator.init;
					if (init === null || init === undefined) {
						this.reject("E_UNINITIALIZED", "a constant must be initialized", declarator);
						continue;
					}
					if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
						out.functions.push(this.functionFromArrow(node, declarator, init, exported));
						continue;
					}
					out.consts.push({
						name: declarator.id.name,
						declared:
							declarator.id.typeAnnotation === null || declarator.id.typeAnnotation === undefined
								? undefined
								: this.typeExpr(declarator.id.typeAnnotation.typeAnnotation),
						value: this.expr(init),
						exported,
						span: this.span(declarator),
					});
				}
				return;
			}
			case "FunctionDeclaration": {
				out.functions.push({
					name: node.id.name,
					params: this.params(node.params),
					ret: this.returnType(node),
					body: this.block(node.body),
					exported,
					doc: this.doc(node),
					span: this.span(node),
				});
				return;
			}
			case "TSModuleDeclaration":
				this.reject("E_NAMESPACE", "namespaces are outside the subset", node);
				return;
			default:
				this.reject("E_TOP_LEVEL", `${node.type} is not allowed at module level`, node);
		}
	}

	private functionFromArrow(declaration: Node, declarator: Node, arrow: Node, exported: boolean): HFunc {
		if (arrow.async === true) {
			this.reject(
				"E_ASYNC",
				"`async` is computed by the compiler, not written",
				arrow,
				"call `http.request` directly; the TypeScript backend adds async where it is needed",
			);
		}
		return {
			name: declarator.id.name,
			params: this.params(arrow.params),
			ret: this.returnType(arrow),
			body: arrow.body.type === "BlockStatement" ? this.block(arrow.body) : [
				{ kind: "return", value: this.expr(arrow.body), span: this.span(arrow.body) },
			],
			exported,
			doc: this.doc(declaration),
			span: this.span(declarator),
		};
	}

	private returnType(node: Node): HTypeExpr {
		if (node.returnType === null || node.returnType === undefined) {
			this.reject(
				"E_MISSING_RETURN_TYPE",
				"every function needs an explicit return type",
				node,
				"annotate the return type; the core's signatures are a published contract",
			);
			return { kind: "ref", name: "Void", args: [], span: this.span(node) };
		}
		return this.typeExpr(node.returnType.typeAnnotation);
	}

	private params(params: readonly Node[]): HParam[] {
		const result: HParam[] = [];
		for (const param of params) {
			if (param.type !== "Identifier") {
				this.reject("E_PARAM_PATTERN", "parameter patterns are outside the subset", param);
				continue;
			}
			if (param.typeAnnotation === null || param.typeAnnotation === undefined) {
				this.reject("E_MISSING_PARAM_TYPE", `parameter \`${param.name}\` needs a type`, param);
				continue;
			}
			result.push({
				name: param.name,
				type: this.typeExpr(param.typeAnnotation.typeAnnotation),
				span: this.span(param),
			});
		}
		return result;
	}

	/* ---------------------------------------------------------------- *
	 * Types
	 * ---------------------------------------------------------------- */

	private typeExpr(node: Node): HTypeExpr {
		const span = this.span(node);
		switch (node.type) {
			case "TSNumberKeyword":
				this.reject(
					"E_BARE_NUMBER",
					"`number` does not say what the value means",
					node,
					"use `Int`, `IntRange<lo, hi>`, `Float` or `Decimal<scale>`",
				);
				return { kind: "ref", name: "Int", args: [], span };
			case "TSAnyKeyword":
			case "TSUnknownKeyword":
				this.reject("E_ANY", "`any` and `unknown` are outside the subset", node);
				return { kind: "ref", name: "Int", args: [], span };
			case "TSNullKeyword":
				this.reject("E_NULL", "`null` is outside the subset", node, "use `T | undefined`");
				return { kind: "undefined", span };
			case "TSStringKeyword":
				return { kind: "ref", name: "String", args: [], span };
			case "TSBooleanKeyword":
				return { kind: "ref", name: "Bool", args: [], span };
			case "TSVoidKeyword":
				return { kind: "ref", name: "Void", args: [], span };
			case "TSUndefinedKeyword":
				return { kind: "undefined", span };
			case "TSTypeReference": {
				const name = node.typeName.type === "Identifier" ? node.typeName.name : "<qualified>";
				return {
					kind: "ref",
					name,
					args: (node.typeArguments?.params ?? []).map((arg: Node) => this.typeExpr(arg)),
					span,
				};
			}
			case "TSArrayType":
				return { kind: "array", elem: this.typeExpr(node.elementType), span };
			case "TSTypeOperator":
				// `readonly T[]`: every value is immutable in the semantics, so the operator is noise.
				return this.typeExpr(node.typeAnnotation);
			case "TSUnionType":
				return { kind: "union", options: node.types.map((item: Node) => this.typeExpr(item)), span };
			case "TSLiteralType": {
				const literal = node.literal;
				if (literal.type === "Literal" && typeof literal.value === "string") {
					return { kind: "literal", value: literal.value, span };
				}
				if (literal.type === "Literal" && typeof literal.value === "number") {
					return { kind: "literal", value: String(literal.value), span };
				}
				if (
					literal.type === "UnaryExpression" &&
					literal.operator === "-" &&
					literal.argument.type === "Literal"
				) {
					return { kind: "literal", value: `-${literal.argument.value}`, span };
				}
				this.reject("E_LITERAL_TYPE", "only string and integer literal types are supported", node);
				return { kind: "literal", value: "", span };
			}
			case "TSTypeLiteral":
				return {
					kind: "object",
					fields: node.members.map((member: Node) => {
						if (member.type !== "TSPropertySignature") {
							this.reject("E_TYPE_MEMBER", "only properties are allowed in a record type", member);
						}
						return {
							name: member.key.name ?? member.key.value,
							type:
								member.typeAnnotation === null || member.typeAnnotation === undefined
									? { kind: "ref" as const, name: "Int", args: [], span: this.span(member) }
									: this.typeExpr(member.typeAnnotation.typeAnnotation),
							optional: member.optional === true,
							doc: this.doc(member),
							span: this.span(member),
						};
					}),
					span,
				};
			case "TSFunctionType":
				return {
					kind: "func",
					params: this.params(node.params).map((param) => param.type),
					ret: this.typeExpr(node.returnType.typeAnnotation),
					span,
				};
			case "TSParenthesizedType":
				return this.typeExpr(node.typeAnnotation);
			default:
				this.reject("E_TYPE", `${node.type} is not a supported type`, node);
				return { kind: "ref", name: "Int", args: [], span };
		}
	}

	/* ---------------------------------------------------------------- *
	 * Statements
	 * ---------------------------------------------------------------- */

	private block(node: Node): HStmt[] {
		return (node.body ?? []).flatMap((statement: Node) => this.stmt(statement));
	}

	private stmt(node: Node): HStmt[] {
		const span = this.span(node);
		switch (node.type) {
			case "VariableDeclaration": {
				if (node.kind === "var") {
					this.reject("E_VAR", "`var` is outside the subset", node, "use `const` or `let`");
				}
				const result: HStmt[] = [];
				for (const declarator of node.declarations) {
					if (declarator.id.type !== "Identifier") {
						this.reject("E_DESTRUCTURING", "destructuring is outside the subset", declarator);
						continue;
					}
					if (declarator.init === null || declarator.init === undefined) {
						this.reject("E_UNINITIALIZED", "a binding must be initialized", declarator);
						continue;
					}
					result.push({
						kind: "let",
						name: declarator.id.name,
						mutable: node.kind === "let",
						declared:
							declarator.id.typeAnnotation === null || declarator.id.typeAnnotation === undefined
								? undefined
								: this.typeExpr(declarator.id.typeAnnotation.typeAnnotation),
						init: this.expr(declarator.init),
						span: this.span(declarator),
					});
				}
				return result;
			}
			case "ExpressionStatement": {
				const expression = node.expression;
				if (expression.type === "AssignmentExpression") {
					const operator = expression.operator;
					if (!["=", "+=", "-=", "*="].includes(operator)) {
						this.reject("E_ASSIGN_OP", `\`${operator}\` is outside the subset`, expression);
						return [];
					}
					return [
						{
							kind: "assign",
							target: this.expr(expression.left),
							op: operator as "=" | "+=" | "-=" | "*=",
							value: this.expr(expression.right),
							span,
						},
					];
				}
				if (expression.type === "UpdateExpression") {
					return [
						{
							kind: "assign",
							target: this.expr(expression.argument),
							op: expression.operator === "++" ? "+=" : "-=",
							value: { kind: "int", value: 1n, span },
							span,
						},
					];
				}
				return [{ kind: "expr", expr: this.expr(expression), span }];
			}
			case "IfStatement":
				return [
					{
						kind: "if",
						test: this.expr(node.test),
						then: this.bodyOf(node.consequent),
						otherwise:
							node.alternate === null || node.alternate === undefined
								? undefined
								: this.bodyOf(node.alternate),
						span,
					},
				];
			case "SwitchStatement":
				return [
					{
						kind: "switch",
						subject: this.expr(node.discriminant),
						cases: node.cases.map((caseNode: Node) => ({
							test:
								caseNode.test === null || caseNode.test === undefined
									? undefined
									: this.expr(caseNode.test),
							body: caseNode.consequent.flatMap((item: Node) => this.stmt(item)),
							span: this.span(caseNode),
						})),
						span,
					},
				];
			case "ForStatement":
				return this.countedFor(node);
			case "ForOfStatement": {
				if (node.left.type !== "VariableDeclaration" || node.left.declarations.length !== 1) {
					this.reject("E_FOR_OF", "`for…of` binds exactly one name", node);
					return [];
				}
				return [
					{
						kind: "forOf",
						name: node.left.declarations[0].id.name,
						iterable: this.expr(node.right),
						body: this.bodyOf(node.body),
						span,
					},
				];
			}
			case "ForInStatement":
				this.reject("E_FOR_IN", "`for…in` is outside the subset", node, "iterate a list with `for…of`");
				return [];
			case "WhileStatement":
			case "DoWhileStatement":
				this.reject(
					"E_WHILE",
					"unbounded loops are outside the subset",
					node,
					"use a counted `for` or `for…of`, so every loop has a proven trip count",
				);
				return [];
			case "ReturnStatement":
				return [
					{
						kind: "return",
						value:
							node.argument === null || node.argument === undefined
								? undefined
								: this.expr(node.argument),
						span,
					},
				];
			case "ThrowStatement": {
				if (node.argument.type !== "NewExpression" || node.argument.callee.type !== "Identifier") {
					this.reject(
						"E_THROW",
						"only `throw new SomeError(...)` is allowed",
						node,
						"declare the error class in source and throw it directly",
					);
					return [];
				}
				return [
					{
						kind: "throw",
						errorClass: node.argument.callee.name,
						args: node.argument.arguments.map((arg: Node) => this.expr(arg)),
						span,
					},
				];
			}
			case "TryStatement":
				this.reject(
					"E_TRY",
					"`try`/`catch` is outside the subset",
					node,
					"return an Option or let the domain error propagate; bugs are proven impossible instead of caught",
				);
				return [];
			case "BreakStatement":
				return [{ kind: "break", span }];
			case "ContinueStatement":
				return [{ kind: "continue", span }];
			case "BlockStatement":
				return [{ kind: "block", body: this.block(node), span }];
			case "EmptyStatement":
				return [];
			default:
				this.reject("E_STATEMENT", `${node.type} is outside the subset`, node);
				return [];
		}
	}

	private bodyOf(node: Node): HStmt[] {
		return node.type === "BlockStatement" ? this.block(node) : this.stmt(node);
	}

	/** Accepts only the recognizable counted shape `for (let i = a; i < b; i++)`. */
	private countedFor(node: Node): HStmt[] {
		const span = this.span(node);
		const init = node.init;
		const test = node.test;
		const update = node.update;
		const shape =
			init?.type === "VariableDeclaration" &&
			init.declarations.length === 1 &&
			init.declarations[0].id.type === "Identifier" &&
			test?.type === "BinaryExpression" &&
			["<", "<=", ">", ">="].includes(test.operator) &&
			test.left.type === "Identifier" &&
			test.left.name === init.declarations[0].id.name &&
			update?.type === "UpdateExpression" &&
			update.argument.type === "Identifier" &&
			update.argument.name === init.declarations[0].id.name;

		if (!shape) {
			this.reject(
				"E_FOR_SHAPE",
				"only counted `for (let i = a; i < b; i++)` loops are allowed",
				node,
				"rewrite as a counted loop or as `for…of`, so the trip count is proven",
			);
			return [];
		}

		const descending = test.operator === ">" || test.operator === ">=";
		if (descending !== (update.operator === "--")) {
			this.reject("E_FOR_DIRECTION", "the loop counter moves away from its bound", node);
		}

		return [
			{
				kind: "forCounted",
				name: init.declarations[0].id.name,
				from: this.expr(init.declarations[0].init),
				to: this.expr(test.right),
				inclusive: test.operator === "<=" || test.operator === ">=",
				step: update.operator === "++" ? 1n : -1n,
				body: this.bodyOf(node.body),
				span,
			},
		];
	}

	/* ---------------------------------------------------------------- *
	 * Expressions
	 * ---------------------------------------------------------------- */

	/**
	 * Recognizes the handful of ordinary-JavaScript call shapes that have no vocabulary of their
	 * own in this subset — `Math.min`/`max`/`abs`/`trunc`/`floor`, `Math.random`, and `String(n)`
	 * — before the generic `Identifier` lowering below would reject their host global outright,
	 * with a less specific message than each of these deserves. Returns `undefined` for any other
	 * call, which falls through to that generic lowering unchanged.
	 */
	private specialCall(node: Node, span: Span): HExpr | undefined {
		const callee = node.callee;
		if (
			callee.type === "MemberExpression" &&
			callee.computed === false &&
			callee.object.type === "Identifier" &&
			callee.object.name === "Math"
		) {
			const method = callee.property.name as string;
			if (method === "random") {
				this.reject(
					"E_MATH_RANDOM",
					"`Math.random()` is a float in [0, 1); the Random capability offers only " +
						"`random.nextU32()`, an unbiased 32-bit draw",
					node,
					"call `random.nextU32()` and derive what you need from it in source, the way " +
						"`lib/random.ts` does — a scaled float would have to round identically in every " +
						"target to stay unbiased, so there is no built-in shortcut",
				);
				return { kind: "float", value: 0, span };
			}
			if (MATH_METHODS.has(method)) {
				return {
					kind: "call",
					callee: {
						kind: "member",
						target: { kind: "name", name: "Math", span: this.span(callee.object) },
						name: method,
						span: this.span(callee),
					},
					args: node.arguments.map((arg: Node) => this.expr(arg)),
					span,
				};
			}
			return undefined;
		}
		if (callee.type === "Identifier" && callee.name === "String" && node.arguments.length === 1) {
			return {
				kind: "call",
				callee: { kind: "name", name: "String", span: this.span(callee) },
				args: [this.expr(node.arguments[0])],
				span,
			};
		}
		// `value[index]?.charCodeAt(0)` is `str.codeAtOpt(value, index)`: the one ordinary spelling
		// of the checked *numeric* accessor. `value.charCodeAt(i)` alone always answers `NaN` past
		// the end, not `undefined`, so it has no `??` form (see the `logical` handling of `xs[i] ??
		// fallback`); but `value[index]` alone already answers `undefined` there, and chaining
		// `?.charCodeAt(0)` onto it reads the one scalar's code point only when it is present — the
		// same case split `str.codeAtOpt` makes, spelled in ordinary TypeScript instead of assumed.
		// The literal `0` and the plain (non-optional) bracket index are both required: anything
		// else is not this idiom and falls through to the generic `?.` rejection below, whose
		// message points back here.
		if (
			callee.type === "MemberExpression" &&
			callee.optional === true &&
			callee.computed === false &&
			callee.property.name === "charCodeAt" &&
			callee.object.type === "MemberExpression" &&
			callee.object.computed === true &&
			callee.object.optional !== true &&
			node.arguments.length === 1 &&
			node.arguments[0].type === "Literal" &&
			node.arguments[0].value === 0
		) {
			return {
				kind: "call",
				callee: {
					kind: "member",
					target: { kind: "name", name: "str", span: this.span(callee.object) },
					name: "codeAtOpt",
					span: this.span(callee),
				},
				args: [this.expr(callee.object.object), this.expr(callee.object.property)],
				span,
			};
		}
		return undefined;
	}

	private expr(node: Node): HExpr {
		const span = this.span(node);
		switch (node.type) {
			case "Literal": {
				if (node.regex !== null && node.regex !== undefined) {
					return { kind: "regex", source: node.regex.pattern, flags: node.regex.flags, span };
				}
				if (node.value === null) {
					this.reject("E_NULL", "`null` is outside the subset", node, "use `undefined`");
					return { kind: "undefined", span };
				}
				if (typeof node.value === "boolean") return { kind: "bool", value: node.value, span };
				if (typeof node.value === "string") return { kind: "string", value: node.value, span };
				if (typeof node.value === "number") {
					return Number.isInteger(node.value) && !node.raw.includes(".") && !node.raw.includes("e")
						? { kind: "int", value: BigInt(node.raw.replaceAll("_", "")), span }
						: { kind: "float", value: node.value, span };
				}
				if (typeof node.value === "bigint") return { kind: "int", value: node.value, span };
				this.reject("E_LITERAL", "unsupported literal", node);
				return { kind: "undefined", span };
			}
			case "Identifier": {
				if (node.name === "undefined") return { kind: "undefined", span };
				if (HOST_GLOBALS.has(node.name)) {
					this.reject(
						"E_HOST_GLOBAL",
						`the host global \`${node.name}\` is outside the subset`,
						node,
						HOST_GLOBAL_HELP[node.name],
					);
				}
				return { kind: "name", name: node.name, span };
			}
			case "ThisExpression":
				this.reject("E_THIS", "`this` is outside the subset", node);
				return { kind: "undefined", span };
			case "MemberExpression": {
				if (node.optional === true) {
					this.reject(
						"E_OPTIONAL_CHAIN",
						"`?.` is allowed only on an Option, which the checker narrows explicitly",
						node,
						node.property?.name === "charCodeAt"
							? "the checked numeric accessor has exactly one ordinary spelling: " +
								"`value[index]?.charCodeAt(0)`, a plain (non-optional) bracket index and a " +
								"literal `0` — anything else, including a variable in place of the `0`, is not " +
								"this idiom and has no honest translation, since `value.charCodeAt(i)` alone " +
								"answers `NaN` past the end, not `undefined`"
							: "check for `undefined` first",
					);
				}
				if (node.computed === true) {
					return { kind: "index", target: this.expr(node.object), index: this.expr(node.property), span };
				}
				return { kind: "member", target: this.expr(node.object), name: node.property.name, span };
			}
			case "CallExpression": {
				if (node.optional === true) {
					this.reject("E_OPTIONAL_CALL", "`?.()` is outside the subset", node);
				}
				const special = this.specialCall(node, span);
				if (special !== undefined) return special;
				return {
					kind: "call",
					callee: this.expr(node.callee),
					args: node.arguments.map((arg: Node) => {
						if (arg.type === "SpreadElement") {
							this.reject("E_SPREAD", "spread arguments are outside the subset", arg);
							return this.expr(arg.argument);
						}
						return this.expr(arg);
					}),
					span,
				};
			}
			case "NewExpression": {
				if (node.callee.name === "Date") {
					this.reject(
						"E_HOST_DATE",
						"`new Date(...)` is JavaScript's own host object: months are zero-indexed, an " +
							"out-of-range component silently rolls over into the next one, and the value is " +
							"bound to a timezone, none of which a civil date does",
						node,
						"call `date.fromYmd(year, month, day)` (month is 1-12, and it answers `undefined` " +
							"instead of rolling over) and handle the `undefined` case explicitly",
					);
					return { kind: "undefined", span };
				}
				return {
					kind: "new",
					className: node.callee.name,
					args: node.arguments.map((arg: Node) => this.expr(arg)),
					span,
				};
			}
			case "BinaryExpression": {
				const operator = node.operator;
				if (operator === "==" || operator === "!=") {
					this.reject(
						"E_LOOSE_EQUALITY",
						"`==` is outside the subset",
						node,
						"use `===`, which the Core lowers to structural equality",
					);
					return { kind: "bool", value: false, span };
				}
				if (!["+", "-", "*", "/", "%", "<", "<=", ">", ">=", "===", "!=="].includes(operator)) {
					this.reject("E_OPERATOR", `\`${operator}\` is outside the subset`, node);
					return { kind: "bool", value: false, span };
				}
				return {
					kind: "binary",
					op: operator,
					left: this.expr(node.left),
					right: this.expr(node.right),
					span,
				};
			}
			case "LogicalExpression":
				return {
					kind: "logical",
					op: node.operator,
					left: this.expr(node.left),
					right: this.expr(node.right),
					span,
				};
			case "UnaryExpression": {
				if (node.operator !== "!" && node.operator !== "-") {
					this.reject("E_UNARY", `unary \`${node.operator}\` is outside the subset`, node);
					return { kind: "bool", value: false, span };
				}
				return { kind: "unary", op: node.operator, operand: this.expr(node.argument), span };
			}
			case "ConditionalExpression":
				return {
					kind: "ternary",
					test: this.expr(node.test),
					then: this.expr(node.consequent),
					otherwise: this.expr(node.alternate),
					span,
				};
			case "TemplateLiteral": {
				const parts: HExpr[] = node.expressions.map((item: Node) => this.expr(item));
				const merged: ({ kind: "text"; value: string } | { kind: "expr"; expr: HExpr })[] = [];
				node.quasis.forEach((quasi: Node, index: number) => {
					if (quasi.value.cooked !== "") merged.push({ kind: "text", value: quasi.value.cooked });
					const expression = parts[index];
					if (expression !== undefined) merged.push({ kind: "expr", expr: expression });
				});
				return { kind: "template", parts: merged, span };
			}
			case "ObjectExpression":
				return {
					kind: "object",
					fields: node.properties.map((property: Node) => {
						if (property.type !== "Property" || property.computed === true) {
							this.reject("E_OBJECT_PROPERTY", "only plain properties are allowed", property);
							return { name: "<error>", value: { kind: "undefined" as const, span }, span };
						}
						return {
							name: property.key.name ?? property.key.value,
							value: this.expr(property.value),
							span: this.span(property),
						};
					}),
					span,
				};
			case "ArrayExpression": {
				const elements: Node[] = node.elements;
				if (elements.length === 1 && elements[0]?.type === "SpreadElement") {
					// `[...s]`: JavaScript's array-spread of a string decomposes it into its scalars,
					// which is exactly `str.codePoints`.
					return {
						kind: "call",
						callee: { kind: "member", target: { kind: "name", name: "str", span }, name: "codePoints", span },
						args: [this.expr(elements[0].argument)],
						span,
					};
				}
				if (elements.some((item: Node) => item?.type === "SpreadElement")) {
					this.reject(
						"E_ARRAY_SPREAD",
						"array spread is outside the subset except for `[...s]` on a single string",
						node,
						"combine lists with `seq.concat`, and write anything else as an explicit loop or a combinator",
					);
				}
				return {
					kind: "array",
					items: elements.map((item: Node) =>
						item?.type === "SpreadElement" ? this.expr(item.argument) : this.expr(item),
					),
					span,
				};
			}
			case "ArrowFunctionExpression": {
				if (node.async === true) this.reject("E_ASYNC", "`async` is computed, not written", node);
				return {
					kind: "lambda",
					params: node.params.map((param: Node) => ({
						name: param.name,
						type:
							param.typeAnnotation === null || param.typeAnnotation === undefined
								? undefined
								: this.typeExpr(param.typeAnnotation.typeAnnotation),
						span: this.span(param),
					})),
					body:
						node.body.type === "BlockStatement"
							? this.block(node.body)
							: [{ kind: "return", value: this.expr(node.body), span: this.span(node.body) }],
					span,
				};
			}
			case "TSAsExpression":
			case "TSSatisfiesExpression":
				// `as const` on data literals is the only cast the subset keeps, and it is a no-op here.
				return this.expr(node.expression);
			case "TSNonNullExpression":
				this.reject(
					"E_NON_NULL",
					"`!` does not prove anything to the checker",
					node,
					"narrow the Option with an explicit `=== undefined` check",
				);
				return this.expr(node.expression);
			case "ParenthesizedExpression":
				return this.expr(node.expression);
			case "ChainExpression":
				// The parser wraps any expression containing a `?.` in this node, however deep —
				// `value[index]?.charCodeAt(0)` arrives as `ChainExpression(CallExpression(…))`, not
				// as the `CallExpression` directly. Unwrapping it here is what lets the `?.` shape
				// recognized in `specialCall` (and the generic `E_OPTIONAL_CHAIN` rejection for
				// every other one) ever see the node they match against.
				return this.expr(node.expression);
			case "AwaitExpression":
				this.reject("E_AWAIT", "`await` is computed by the compiler, not written", node);
				return this.expr(node.argument);
			case "FunctionExpression":
				this.reject("E_FUNCTION_EXPRESSION", "use an arrow function", node);
				return { kind: "undefined", span };
			default:
				this.reject("E_EXPRESSION", `${node.type} is outside the subset`, node);
				return { kind: "undefined", span };
		}
	}
}
