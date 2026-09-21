/**
 * The frontend: ordinary TypeScript in, IR out.
 *
 * It accepts a subset and refuses everything else with a pointed error rather than emitting
 * something that would mean a different thing in Go than it does in Ruby. The subset is
 * documented in `spec/bridge/README.md` and is what the four utilities under `source/` use.
 */
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { parseSync } from "oxc-parser";
import type {
	BinaryOp,
	CharClass,
	DataDecl,
	EnumDecl,
	ErrorDecl,
	Expr,
	FuncDecl,
	Module,
	Param,
	PatternDecl,
	Stmt,
	StructDecl,
	Ty,
} from "./ir.ts";
import { ClassTable, complement, parsePattern, toSteps } from "./regex.ts";

/* eslint-disable */
type Node = Record<string, any>;

const fail = (node: Node, message: string): never => {
	throw new Error(`${message} (at ${String(node["type"])}, offset ${String(node["start"])})`);
};

const STRING_METHODS: Record<string, { std: string; args: number }> = {
	charCodeAt: { std: "codeAt", args: 1 },
	slice: { std: "slice", args: 2 },
	toUpperCase: { std: "upper", args: 0 },
	trim: { std: "trim", args: 0 },
	padStart: { std: "padStart", args: 2 },
	repeat: { std: "repeat", args: 1 },
};

/** Everything the frontend knows while walking one module. */
type Scope = {
	types: Map<string, Ty>;
	functions: Map<string, { params: Param[]; ret: Ty; isAsync: boolean }>;
	structs: Map<string, StructDecl>;
	enums: Map<string, EnumDecl>;
	errors: Map<string, ErrorDecl>;
	/** Module level `const` lists and strings, by name. */
	constants: Map<string, { ty: Ty; expr: Expr }>;
	/** Regex literals, by the name they were bound to. */
	regexes: Map<string, { anchored: boolean; pattern?: string; charClass?: string; keepClass?: string }>;
	classes: ClassTable;
	patterns: PatternDecl[];
	/** Portable standard library members the module imported. */
	stdImports: Set<string>;
	data: Map<string, DataDecl>;
};

/** The portable standard library, by name and return type. */
const STD_FUNCTIONS = new Map<string, Ty>([
	["asString", { k: "string" }],
	["isTruthy", { k: "bool" }],
	["dataAll", { k: "list", of: { k: "list", of: { k: "string" } } }],
	["dataRows", { k: "list", of: { k: "list", of: { k: "string" } } }],
]);

/** Members of the portable std that are types or build time only, so never lowered as calls. */
const STD_NON_CALLS = new Set(["Dataset", "dataset"]);

const int: Ty = { k: "int" };
const str: Ty = { k: "string" };
const bool: Ty = { k: "bool" };

/**
 * Reads a TypeScript type annotation into an IR type.
 *
 * @param {Node} node - The annotation node.
 * @param {Scope} scope - The module scope.
 * @returns {Ty} The IR type.
 */
const readType = (node: Node, scope: Scope): Ty => {
	switch (node["type"]) {
		case "TSStringKeyword":
			return str;
		case "TSNumberKeyword":
			return int;
		case "TSBooleanKeyword":
			return bool;
		case "TSVoidKeyword":
			return { k: "void" };
		case "TSArrayType":
			return { k: "list", of: readType(node["elementType"] as Node, scope) };
		case "TSUnionType": {
			const members = node["types"] as Node[];
			const kinds = new Set(members.map((member) => String(member["type"])));

			if (kinds.has("TSStringKeyword") && kinds.has("TSNumberKeyword") && kinds.size === 2)
				return { k: "scalar" };

			const literals = members.filter((member) => member["type"] === "TSLiteralType");

			if (literals.length === members.length) {
				// A union of string literals is a closed set of strings; `1 | 2` and friends are
				// integers with a documented domain.
				const strings = literals.filter(
					(member) => typeof (member["literal"] as Node)["value"] === "string",
				);

				if (strings.length === literals.length) return str;

				return int;
			}

			return fail(node, "only unions of literal numbers or literal strings are in the subset");
		}
		case "TSTypeReference": {
			const name = String((node["typeName"] as Node)["name"]);

			if (name === "Promise") {
				const args = node["typeArguments"] as Node | null;

				return readType(((args?.["params"] as Node[]) ?? [])[0], scope);
			}

			if (scope.enums.has(name)) return { k: "enum", name };
			if (scope.structs.has(name) || scope.errors.has(name)) return { k: "named", name };

			return fail(node, `unknown type \`${name}\``);
		}
		default:
			return fail(node, `type ${String(node["type"])} is outside the subset`);
	}
};

/** Reads the `@see` lines of a leading doc comment. */
const readSources = (doc: string): { role: string; url: string }[] =>
	[...doc.matchAll(/@see (Official|Based on): (\S+)/g)].map((match) => ({
		role: match[1] === "Official" ? "official" : "based-on",
		url: match[2],
	}));

/** Pulls the block comment that ends right before `start`, if any. */
const docBefore = (source: string, start: number): string => {
	const before = source.slice(0, start);
	const open = before.lastIndexOf("/**");
	const close = before.lastIndexOf("*/");

	if (open === -1 || close < open) return "";
	if (before.slice(close + 2).trim() !== "" && !before.slice(close + 2).trim().startsWith("export"))
		return "";

	return before
		.slice(open + 3, close)
		.split("\n")
		.map((line) => line.replace(/^\s*\*ance?\s?/, "").replace(/^\s*\*\s?/, ""))
		.join("\n")
		.trim();
};

/**
 * Infers the IR type of an expression.
 *
 * @param {Expr} expr - The expression.
 * @param {Map<string, Ty>} locals - The types in scope.
 * @param {Scope} scope - The module scope.
 * @returns {Ty} The inferred type.
 */
const inferType = (expr: Expr, locals: Map<string, Ty>, scope: Scope): Ty => {
	switch (expr.k) {
		case "str":
			return str;
		case "int":
			return int;
		case "bool":
		case "not":
			return bool;
		case "ref":
			return locals.get(expr.name) ?? scope.constants.get(expr.name)?.ty ?? str;
		case "field":
		case "call":
			return expr.ty;
		case "index": {
			const target = inferType(expr.target, locals, scope);

			return target.k === "list" ? target.of : int;
		}
		case "bin":
			if (["==", "!=", "<", "<=", ">", ">=", "&&", "||"].includes(expr.op)) return bool;

			return inferType(expr.left, locals, scope);
		case "cond":
			return inferType(expr.whenTrue, locals, scope);
		case "listOf":
			return { k: "list", of: expr.of };
		case "struct":
			return { k: "named", name: expr.name };
		case "await":
			return inferType(expr.value, locals, scope);
		case "optionField":
			return expr.ty;
		default:
			return str;
	}
};

const BINARY_OPS: Record<string, BinaryOp> = {
	"+": "+",
	"-": "-",
	"*": "*",
	"%": "%",
	"===": "==",
	"!==": "!=",
	"==": "==",
	"!=": "!=",
	"<": "<",
	"<=": "<=",
	">": ">",
	">=": ">=",
	"&&": "&&",
	"||": "||",
};

/** Unwraps `a?.b` written as a ChainExpression. */
const unchain = (node: Node): Node => {
	if (node["type"] === "ChainExpression") return unchain(node["expression"] as Node);
	if (node["type"] === "ParenthesizedExpression") return unchain(node["expression"] as Node);
	if (node["type"] === "TSAsExpression") return unchain(node["expression"] as Node);

	return node;
};

type Ctx = {
	locals: Map<string, Ty>;
	scope: Scope;
	source: string;
	/** Optionals a surrounding `if` has proved present, so a read of them unwraps. */
	narrowed: Set<string>;
};

/**
 * Lowers one expression.
 *
 * @param {Node} node - The AST node.
 * @param {Ctx} ctx - The walking context.
 * @returns {Expr} The IR expression.
 */
const lowerExpr = (node: Node, ctx: Ctx): Expr => {
	const current = unchain(node);

	switch (current["type"]) {
		case "Literal": {
			const value = current["value"];

			if (current["regex"] !== undefined && current["regex"] !== null)
				return fail(current, "a regex literal has to be bound to a module level const");
			if (value === null) return { k: "none" };
			if (typeof value === "string") return { k: "str", value };
			if (typeof value === "boolean") return { k: "bool", value };
			if (typeof value === "number") {
				if (!Number.isInteger(value)) return fail(current, "only integer literals are in the subset");

				return { k: "int", value };
			}

			return fail(current, "unsupported literal");
		}
		case "Identifier": {
			const name = String(current["name"]);

			if (name === "undefined") return { k: "none" };

			const local = ctx.locals.get(name);

			// Inside a branch that proved the optional present, the read is the value, not the
			// optional: the targets that distinguish the two need the unwrap spelled out.
			if (ctx.narrowed.has(name) && local !== undefined && local.k === "opt")
				return {
					k: "call",
					callee: { k: "std", name: "unwrap" },
					args: [{ k: "ref", name }],
					ty: local.of,
				};

			return { k: "ref", name };
		}
		case "UnaryExpression": {
			if (current["operator"] === "!") return { k: "not", operand: lowerExpr(current["argument"] as Node, ctx) };
			if (current["operator"] === "-") {
				const inner = lowerExpr(current["argument"] as Node, ctx);

				if (inner.k === "int") return { k: "int", value: -inner.value };
			}

			return fail(current, `unary \`${String(current["operator"])}\` is outside the subset`);
		}
		case "BinaryExpression":
		case "LogicalExpression": {
			const op = BINARY_OPS[String(current["operator"])];

			if (op === undefined) return fail(current, `operator \`${String(current["operator"])}\` is outside the subset`);

			const left = lowerExpr(current["left"] as Node, ctx);
			const right = lowerExpr(current["right"] as Node, ctx);

			// The operand type travels with the node: `+` is concatenation in one target and
			// addition in another, and only the frontend knows which one this is.
			return { k: "bin", op, left, right, ty: inferType(left, ctx.locals, ctx.scope) };
		}
		case "ConditionalExpression":
			return {
				k: "cond",
				test: lowerExpr(current["test"] as Node, ctx),
				whenTrue: lowerExpr(current["consequent"] as Node, ctx),
				whenFalse: lowerExpr(current["alternate"] as Node, ctx),
			};
		case "TemplateLiteral": {
			const quasis = current["quasis"] as Node[];
			const expressions = current["expressions"] as Node[];
			let built: Expr = { k: "str", value: String((quasis[0]["value"] as Node)["cooked"]) };

			for (const [index, expression] of expressions.entries()) {
				built = { k: "bin", op: "+", left: built, right: lowerExpr(expression, ctx) };
				built = {
					k: "bin",
					op: "+",
					left: built,
					right: { k: "str", value: String((quasis[index + 1]["value"] as Node)["cooked"]) },
				};
			}

			return built;
		}
		case "ArrayExpression": {
			const items = (current["elements"] as Node[]).map((element) => lowerExpr(element, ctx));

			return { k: "listOf", items, of: items.length > 0 ? inferType(items[0], ctx.locals, ctx.scope) : str };
		}
		case "AwaitExpression":
			return { k: "await", value: lowerExpr(current["argument"] as Node, ctx) };
		case "MemberExpression":
			return lowerMember(current, ctx);
		case "CallExpression":
			return lowerCall(current, ctx);
		case "ObjectExpression":
			return lowerObject(current, ctx);
		case "ArrowFunctionExpression":
			return fail(current, "inline functions are only allowed at module level in this version");
		default:
			return fail(current, `expression ${String(current["type"])} is outside the subset`);
	}
};

/**
 * Lowers an object literal into a struct value.
 *
 * The struct is the declared record type whose field names are exactly the literal's, which is
 * unambiguous for every record in the subset and keeps the source free of type assertions.
 *
 * @param {Node} node - The ObjectExpression.
 * @param {Ctx} ctx - The walking context.
 * @returns {Expr} The struct expression.
 */
const lowerObject = (node: Node, ctx: Ctx): Expr => {
	const properties = (node["properties"] as Node[]).map((property) => {
		if (property["type"] !== "Property" || property["computed"] === true)
			return fail(property, "only plain `key: value` properties are in the subset");

		return { name: String((property["key"] as Node)["name"]), value: property["value"] as Node };
	});
	const keys = [...properties.map((property) => property.name)].sort().join(",");
	const match = [...ctx.scope.structs.values()].find(
		(candidate) =>
			[...candidate.fields.map((field) => field.name)].sort().join(",") === keys,
	);

	if (match === undefined) return fail(node, `no declared record type has the fields \`${keys}\``);

	return {
		k: "struct",
		name: match.name,
		fields: properties.map((property) => ({
			name: property.name,
			value: lowerExpr(property.value, ctx),
		})),
	};
};

/** Lowers `a.b`, `a[i]`, `a.length` and `options?.field`. */
const lowerMember = (node: Node, ctx: Ctx): Expr => {
	const object = node["object"] as Node;
	const property = node["property"] as Node;
	const computed = node["computed"] === true;

	if (computed) {
		const target = lowerExpr(object, ctx);
		const targetType = inferType(target, ctx.locals, ctx.scope);

		return {
			k: "index",
			target,
			index: lowerExpr(property, ctx),
			ty: targetType.k === "list" ? targetType.of : undefined,
		};
	}

	const name = String(property["name"]);
	const optional = node["optional"] === true;

	if (optional) {
		const targetName = String(object["name"]);
		const struct = ctx.scope.structs.get(nameOfOptionsParam(targetName, ctx));

		if (struct === undefined) return fail(node, `\`${targetName}\` is not an options parameter`);

		const field = struct.fields.find((candidate) => candidate.name === name);

		if (field === undefined) return fail(node, `\`${struct.name}\` has no field \`${name}\``);

		return {
			k: "optionField",
			target: targetName,
			field: name,
			ty: field.ty,
			fallback: field.ty.k === "bool" ? { k: "bool", value: false } : { k: "int", value: -1 },
		};
	}

	const target = lowerExpr(object, ctx);
	const targetType = inferType(target, ctx.locals, ctx.scope);

	if (name === "length") {
		if (targetType.k === "list")
			return { k: "call", callee: { k: "std", name: "listLen" }, args: [target], ty: int };

		return { k: "call", callee: { k: "std", name: "len" }, args: [target], ty: int };
	}

	if (targetType.k === "named") {
		const struct = ctx.scope.structs.get(targetType.name);
		const field = struct?.fields.find((candidate) => candidate.name === name);

		if (field !== undefined) return { k: "field", target, name, ty: field.ty };
	}

	return fail(node, `\`.${name}\` is outside the subset`);
};

/** The declared type name of an options parameter. */
const nameOfOptionsParam = (name: string, ctx: Ctx): string => {
	const ty = ctx.locals.get(name);

	return ty !== undefined && ty.k === "named" ? ty.name : name;
};

/** Lowers a call: a user function, a mapped string method, or a compiled pattern operation. */
const lowerCall = (node: Node, ctx: Ctx): Expr => {
	const callee = unchain(node["callee"] as Node);
	const args = (node["arguments"] as Node[]) ?? [];

	if (callee["type"] === "Identifier") {
		const name = String(callee["name"]);
		const std = ctx.scope.stdImports.has(name) ? STD_FUNCTIONS.get(name) : undefined;

		if (std !== undefined) {
			return {
				k: "call",
				callee: { k: "std", name },
				args: args.map((argument) => lowerExpr(argument, ctx)),
				ty: std,
			};
		}

		const signature = ctx.scope.functions.get(name);

		if (signature === undefined) return fail(node, `unknown function \`${name}\``);

		return {
			k: "call",
			callee: { k: "user", name },
			args: args.map((argument) => lowerExpr(argument, ctx)),
			ty: signature.ret,
		};
	}

	if (callee["type"] !== "MemberExpression") return fail(node, "unsupported call target");

	const object = callee["object"] as Node;
	const method = String((callee["property"] as Node)["name"]);
	const regexName = object["type"] === "Identifier" ? String(object["name"]) : "";
	const regex = ctx.scope.regexes.get(regexName);

	if (regex !== undefined) {
		if (method !== "test") return fail(node, `\`${regexName}.${method}\` is outside the subset`);

		const subject = lowerExpr(args[0], ctx);

		if (regex.anchored === true && regex.pattern !== undefined) {
			return {
				k: "call",
				callee: { k: "std", name: "patternTest" },
				args: [{ k: "ref", name: regex.pattern }, subject],
				ty: bool,
			};
		}

		if (regex.charClass === undefined) return fail(node, `\`${regexName}\` needs anchors to be used with .test()`);

		return {
			k: "call",
			callee: { k: "std", name: "classHas" },
			args: [{ k: "ref", name: regex.charClass }, subject],
			ty: bool,
		};
	}

	const target = lowerExpr(object, ctx);

	if (method === "replaceAll") {
		const patternName = String((args[0] as Node)["name"]);
		const replacement = args[1] as Node;

		if (replacement["value"] !== "")
			return fail(node, "only `replaceAll(pattern, \"\")` is in the subset");

		const removed = ctx.scope.regexes.get(patternName);

		if (removed?.keepClass === undefined)
			return fail(node, `\`${patternName}\` is not a single character class`);

		return {
			k: "call",
			callee: { k: "std", name: "keepClass" },
			args: [{ k: "ref", name: removed.keepClass }, target],
			ty: str,
		};
	}

	if (method === "push") {
		const targetType = inferType(target, ctx.locals, ctx.scope);

		if (targetType.k !== "list") return fail(node, "`.push()` is only in the subset for lists");

		return {
			k: "call",
			callee: { k: "std", name: "listPush" },
			args: [target, lowerExpr(args[0], ctx)],
			ty: { k: "void" },
		};
	}

	const mapped = STRING_METHODS[method];

	if (mapped === undefined) return fail(node, `\`.${method}()\` is outside the subset`);
	if (args.length !== mapped.args) return fail(node, `\`.${method}()\` takes ${mapped.args} argument(s)`);

	return {
		k: "call",
		callee: { k: "std", name: mapped.std },
		args: [target, ...args.map((argument) => lowerExpr(argument, ctx))],
		ty: mapped.std === "codeAt" ? int : str,
	};
};

/**
 * The optionals an `if` test proves present for its `then` branch.
 *
 * Only `x !== undefined` and `x !== null`, alone or joined by `&&`, count: anything subtler
 * would need real flow analysis, and nothing in the subset needs it.
 *
 * @param {Expr} test - The lowered test.
 * @param {Ctx} ctx - The walking context.
 * @returns {string[]} The names proved present.
 */
const provenPresent = (test: Expr, ctx: Ctx): string[] => {
	if (test.k !== "bin") return [];
	if (test.op === "&&") return [...provenPresent(test.left, ctx), ...provenPresent(test.right, ctx)];
	if (test.op !== "!=") return [];

	const [subject, other] = test.left.k === "none" ? [test.right, test.left] : [test.left, test.right];

	if (other.k !== "none" || subject.k !== "ref") return [];

	return ctx.locals.get(subject.name)?.k === "opt" ? [subject.name] : [];
};

/**
 * Lowers a statement list.
 *
 * @param {Node[]} nodes - The statements.
 * @param {Ctx} ctx - The walking context.
 * @returns {Stmt[]} The IR statements.
 */
const lowerBlock = (nodes: Node[], ctx: Ctx): Stmt[] => nodes.flatMap((node) => lowerStmt(node, ctx));

/** Recognises the boundary guards the handwritten package has, which only dynamic targets need. */
const asGuard = (node: Node, ctx: Ctx): Stmt[] | undefined => {
	const test = node["test"] as Node;
	const consequent = node["consequent"] as Node;
	const body = consequent["type"] === "BlockStatement" ? (consequent["body"] as Node[]) : [consequent];

	if (body.length !== 1 || body[0]["type"] !== "ReturnStatement") return undefined;

	const isTypeofGuard =
		test["type"] === "BinaryExpression" &&
		test["operator"] === "!==" &&
		(test["left"] as Node)["type"] === "UnaryExpression" &&
		((test["left"] as Node)["operator"] as string) === "typeof";

	const isNullishGuard =
		test["type"] === "LogicalExpression" &&
		test["operator"] === "||" &&
		String(((test["left"] as Node)["right"] as Node)["raw"] ?? "") === "null";

	if (!isTypeofGuard && !isNullishGuard) return undefined;

	const argument = (body[0]["argument"] as Node | null) ?? undefined;
	const value = argument === undefined ? undefined : lowerExpr(argument, ctx);
	const subject = isTypeofGuard
		? String(((test["left"] as Node)["argument"] as Node)["name"])
		: String(((test["left"] as Node)["left"] as Node)["name"]);

	return [
		{
			k: "expr",
			value: {
				k: "call",
				callee: { k: "std", name: "boundaryGuard" },
				args: [
					{ k: "ref", name: subject },
					{ k: "str", value: isTypeofGuard ? "string" : "nullish" },
					value ?? { k: "none" },
				],
				ty: { k: "void" },
			},
		},
	];
};

/**
 * Lowers one statement.
 *
 * @param {Node} node - The AST node.
 * @param {Ctx} ctx - The walking context.
 * @returns {Stmt[]} The IR statements, usually one.
 */
const lowerStmt = (node: Node, ctx: Ctx): Stmt[] => {
	switch (node["type"]) {
		case "VariableDeclaration": {
			const declarations = node["declarations"] as Node[];

			return declarations.map((declaration) => {
				const name = String((declaration["id"] as Node)["name"]);
				const value = lowerExpr(declaration["init"] as Node, ctx);
				const annotation = (declaration["id"] as Node)["typeAnnotation"] as Node | null;
				const ty =
					annotation === null
						? inferType(value, ctx.locals, ctx.scope)
						: readType(annotation["typeAnnotation"] as Node, ctx.scope);

				ctx.locals.set(name, ty);

				// `const rows: Municipality[] = []` says what the empty literal holds; nothing else does.
				if (value.k === "listOf" && value.items.length === 0 && ty.k === "list") value.of = ty.of;

				return { k: "let", name, ty, value, mutable: node["kind"] !== "const" } as Stmt;
			});
		}
		case "ExpressionStatement": {
			const expression = node["expression"] as Node;

			if (expression["type"] === "AssignmentExpression") {
				if (expression["operator"] !== "=") return fail(expression, "only `=` assignment is in the subset");

				return [
					{
						k: "assign",
						name: String((expression["left"] as Node)["name"]),
						value: lowerExpr(expression["right"] as Node, ctx),
					},
				];
			}

			return [{ k: "expr", value: lowerExpr(expression, ctx) }];
		}
		case "IfStatement": {
			const guard = asGuard(node, ctx);

			if (guard !== undefined) return guard;

			const consequent = node["consequent"] as Node;
			const alternate = (node["alternate"] as Node | null) ?? undefined;
			const test = lowerExpr(node["test"] as Node, ctx);
			const proved = provenPresent(test, ctx);

			for (const name of proved) ctx.narrowed.add(name);

			const then = lowerBlock(
				consequent["type"] === "BlockStatement" ? (consequent["body"] as Node[]) : [consequent],
				ctx,
			);

			for (const name of proved) ctx.narrowed.delete(name);

			return [
				{
					k: "if",
					test,
					then,
					otherwise:
						alternate === undefined
							? []
							: lowerBlock(
									alternate["type"] === "BlockStatement" ? (alternate["body"] as Node[]) : [alternate],
									ctx,
								),
				},
			];
		}
		case "ReturnStatement": {
			const argument = (node["argument"] as Node | null) ?? undefined;

			return [{ k: "return", value: argument === undefined ? undefined : lowerExpr(argument, ctx) }];
		}
		case "ForStatement": {
			const init = node["init"] as Node;
			const test = node["test"] as Node;
			const declaration = (init["declarations"] as Node[])[0];
			const name = String((declaration["id"] as Node)["name"]);

			ctx.locals.set(name, int);

			return [
				{
					k: "forRange",
					name,
					from: lowerExpr(declaration["init"] as Node, ctx),
					until: lowerExpr(test["right"] as Node, ctx),
					body: lowerBlock((node["body"] as Node)["body"] as Node[], ctx),
				},
			];
		}
		case "ForOfStatement": {
			const left = (node["left"] as Node)["declarations"] as Node[];
			const name = String((left[0]["id"] as Node)["name"]);
			const iterable = lowerExpr(node["right"] as Node, ctx);
			const iterableType = inferType(iterable, ctx.locals, ctx.scope);
			const ty = iterableType.k === "list" ? iterableType.of : str;

			ctx.locals.set(name, ty);

			return [
				{ k: "forOf", name, ty, iterable, body: lowerBlock((node["body"] as Node)["body"] as Node[], ctx) },
			];
		}
		case "ThrowStatement": {
			const argument = node["argument"] as Node;

			if (argument["type"] !== "NewExpression")
				return fail(argument, "only `throw new SomeError(message)` is in the subset");

			return [
				{
					k: "throw",
					error: String((argument["callee"] as Node)["name"]),
					message: lowerExpr((argument["arguments"] as Node[])[0], ctx),
				},
			];
		}
		case "TryStatement": {
			const handler = node["handler"] as Node;

			return [
				{
					k: "try",
					body: lowerBlock((node["block"] as Node)["body"] as Node[], ctx),
					catchName: String(((handler["param"] as Node | null) ?? { name: "error" })["name"]),
					catchBody: lowerBlock((handler["body"] as Node)["body"] as Node[], ctx),
				},
			];
		}
		default:
			return fail(node, `statement ${String(node["type"])} is outside the subset`);
	}
};

/** Registers a module level regex const as a pattern, a class, or both. */
const registerRegex = (name: string, source: string, scope: Scope): void => {
	const parsed = parsePattern(source);

	if (parsed.anchored) {
		const patternName = `PATTERN_${name}`;

		scope.patterns.push({ name: patternName, source, steps: toSteps(parsed, scope.classes) });
		scope.regexes.set(name, { anchored: true, pattern: patternName });

		return;
	}

	if (parsed.terms.length !== 1) throw new Error(`/${source}/ must be anchored or a single class`);

	const className = scope.classes.intern(parsed.terms[0].ranges, "class");
	const keepClass = scope.classes.intern(complement(parsed.terms[0].ranges), "class");

	scope.regexes.set(name, { anchored: false, charClass: className, keepClass });
};

/**
 * Compiles one portable TypeScript module into the IR.
 *
 * @param {string} path - The module path.
 * @returns {Module} The IR module.
 */
export const compileModule = (path: string): Module => {
	const source = readFileSync(path, "utf8");
	const parsed = parseSync(path, source);

	if (parsed.errors.length > 0) throw new Error(`${path}: ${parsed.errors[0].message}`);

	const scope: Scope = {
		types: new Map(),
		functions: new Map(),
		structs: new Map(),
		enums: new Map(),
		errors: new Map(),
		constants: new Map(),
		regexes: new Map(),
		classes: new ClassTable(),
		patterns: [],
		stdImports: new Set<string>(),
		data: new Map(),
	};

	const functions: FuncDecl[] = [];
	const statements = parsed.program.body as unknown as Node[];

	// `import { asString } from "./_std.ts"` brings in the portable standard library, whose
	// members every target implements natively.
	for (const statement of statements) {
		if (statement["type"] !== "ImportDeclaration") continue;

		const from = String((statement["source"] as Node)["value"]);

		if (!from.endsWith("_std.ts")) throw new Error(`${path}: only "./_std.ts" can be imported`);

		for (const specifier of (statement["specifiers"] as Node[]) ?? []) {
			const name = String((specifier["imported"] as Node)["name"]);

			if (!STD_FUNCTIONS.has(name) && !STD_NON_CALLS.has(name))
				throw new Error(`${path}: \`${name}\` is not in the portable std`);

			scope.stdImports.add(name);
		}
	}

	// First pass: types, constants and function signatures, so order does not matter.
	for (const statement of statements) {
		const exported = statement["type"] === "ExportNamedDeclaration";
		const declaration = exported ? (statement["declaration"] as Node) : statement;

		if (declaration["type"] === "TSTypeAliasDeclaration") {
			const name = String((declaration["id"] as Node)["name"]);
			const literal = declaration["typeAnnotation"] as Node;

			if (literal["type"] === "TSUnionType") {
				const values = (literal["types"] as Node[]).map((member) => {
					const value = (member["literal"] as Node | undefined)?.["value"];

					if (typeof value !== "string")
						return fail(member, `\`${name}\` mixes string literals with something else`);

					return value;
				});

				scope.enums.set(name, {
					name,
					doc: docBefore(source, declaration["start"] as number),
					values,
				});
				continue;
			}

			const members = (literal["members"] as Node[]) ?? [];
			const fields = members.map((member) => {
				const annotation = (member["typeAnnotation"] as Node)["typeAnnotation"] as Node;
				const union = annotation["type"] === "TSUnionType" ? (annotation["types"] as Node[]) : [];

				return {
					name: String((member["key"] as Node)["name"]),
					ty: readType(annotation, scope),
					doc: docBefore(source, member["start"] as number),
					// `version?: 1 | 2` keeps its domain so the TypeScript target can print it back.
					domain:
						union.length > 0
							? union.map((entry) => Number((entry["literal"] as Node)["value"]))
							: undefined,
				};
			});

			scope.structs.set(name, {
				name,
				doc: docBefore(source, declaration["start"] as number),
				fields,
				isOptions: members.every((member) => member["optional"] === true),
			});
			continue;
		}

		if (declaration["type"] !== "VariableDeclaration") continue;

		for (const entry of declaration["declarations"] as Node[]) {
			const name = String((entry["id"] as Node)["name"]);
			const init = entry["init"] as Node;

			if (init["type"] === "Literal" && init["regex"] !== undefined && init["regex"] !== null) {
				registerRegex(name, String((init["regex"] as Node)["pattern"]), scope);
				continue;
			}

			if (
				init["type"] === "CallExpression" &&
				String((init["callee"] as Node)["name"]) === "dataset"
			) {
				const datasetName = String(((init["arguments"] as Node[])[0] as Node)["value"]);
				const table = JSON.parse(
					readFileSync(resolve(dirname(path), `${datasetName}.data.json`), "utf8"),
				) as Omit<DataDecl, "name">;

				scope.data.set(name, { name, ...table });
				continue;
			}

			if (init["type"] === "ArrowFunctionExpression") {
				const params: Param[] = (init["params"] as Node[]).map((param) => {
					const declared = readType(
						(param["typeAnnotation"] as Node)["typeAnnotation"] as Node,
						scope,
					);
					const optional = param["optional"] === true;

					// A record parameter is already a reference in every target, so only the value
					// types need wrapping to keep "absent" apart from "empty".
					return {
						name: String(param["name"]),
						ty: optional && declared.k !== "named" ? { k: "opt", of: declared } : declared,
						optional,
					};
				});
				const returnType = init["returnType"] as Node | null;

				scope.functions.set(name, {
					params,
					ret: returnType === null ? { k: "void" } : readType(returnType["typeAnnotation"] as Node, scope),
					isAsync: init["async"] === true,
				});
				continue;
			}

			if (init["type"] === "ArrayExpression") {
				const items = (init["elements"] as Node[]).map((element) => ({
					k: "int" as const,
					value: Number(element["value"]),
				}));

				scope.constants.set(name, { ty: { k: "list", of: int }, expr: { k: "listOf", items, of: int } });
				continue;
			}

			if (init["type"] === "Literal" && typeof init["value"] === "string") {
				scope.constants.set(name, { ty: str, expr: { k: "str", value: String(init["value"]) } });
				continue;
			}

			fail(init, `module level \`${name}\` is outside the subset`);
		}
	}

	// Second pass: function bodies.
	for (const statement of statements) {
		const exported = statement["type"] === "ExportNamedDeclaration";
		const declaration = exported ? (statement["declaration"] as Node) : statement;

		if (declaration["type"] !== "VariableDeclaration") continue;

		for (const entry of declaration["declarations"] as Node[]) {
			const init = entry["init"] as Node;

			if (init["type"] !== "ArrowFunctionExpression") continue;

			const name = String((entry["id"] as Node)["name"]);
			const signature = scope.functions.get(name);

			if (signature === undefined) continue;

			const locals = new Map<string, Ty>();

			for (const param of signature.params) locals.set(param.name, param.ty);

			const ctx: Ctx = { locals, scope, source, narrowed: new Set<string>() };
			const body = init["body"] as Node;
			const statementsOfBody =
				body["type"] === "BlockStatement"
					? (body["body"] as Node[])
					: [{ type: "ReturnStatement", argument: body, start: body["start"] }];
			const doc = docBefore(source, (statement["start"] ?? declaration["start"]) as number);

			functions.push({
				name,
				doc,
				params: signature.params,
				ret: signature.ret,
				body: lowerBlock(statementsOfBody, ctx),
				isAsync: signature.isAsync,
				exported,
				sources: readSources(doc),
			});
		}
	}

	// The module's own doc comment is the first block comment in the file.
	const firstComment = source.indexOf("*/");
	const moduleDoc = firstComment === -1 ? "" : docBefore(source, firstComment + 2);

	return {
		name: basename(path, ".ts"),
		doc: moduleDoc.split("\n")[0] ?? "",
		charClasses: scope.classes.all() as CharClass[],
		patterns: scope.patterns,
		structs: [...scope.structs.values()],
		enums: [...scope.enums.values()],
		errors: [...scope.errors.values()],
		functions,
		data: [...scope.data.values()],
		constants: [...scope.constants.entries()].map(([name, entry]) => ({ name, ...entry })),
	};
};
