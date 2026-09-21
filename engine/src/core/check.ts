/**
 * The semantic checker: typed HIR in, annotated Core out.
 *
 * Typing and lowering are one pass on purpose (docs/decisions/0003-checker-lowers.md): every
 * typing decision — which intrinsic an operator resolves to, whether an index is provably in
 * range, whether a string is proven ASCII — is exactly the decision the lowering has to make.
 *
 * Refinements are types here, not a side table, so flow-sensitive narrowing (`if (!re.test(P, s))
 * return …`) and interval analysis over loops both fall out of ordinary type checking.
 */

import type { Diagnostics, Span } from "../diagnostics.ts";
import { NO_SPAN } from "../diagnostics.ts";
import type { EffectSet } from "../effects.ts";
import { PURE, unionEffects, withFail } from "../effects.ts";
import type { HExpr, HFunc, HModule, HStmt, HTypeExpr } from "../hir/ast.ts";
import { BUILTIN_ERRORS, BUILTIN_RECORDS, SignatureError, lookupIntrinsic } from "../intrinsics/index.ts";
import { normalizeRegex, RegexError } from "../regex.ts";
import type { NormalizedRegex } from "../regex.ts";
import type { SemType } from "../types.ts";
import {
	MAX_COLLECTION_LENGTH,
	SAFE_INT_HI,
	SAFE_INT_LO,
	isSubtype,
	join,
	tBool,
	tCivilDate,
	tDecimal,
	tDuration,
	tEnum,
	tFloat,
	tInstant,
	tInt,
	tIntDefault,
	tLambda,
	tList,
	tNever,
	tOption,
	tRecord,
	tString,
	tVoid,
	typeToString,
} from "../types.ts";
import type { Value } from "../values.ts";
import { evalConst, tryEvalConst } from "../comptime/eval.ts";
import { STDLIB_SURFACE } from "../stdlib.ts";
import type { CConst, CErrorDef, CExpr, CFunc, CProgram, CRecordDef, CStmt } from "./ir.ts";

const INTRINSIC_MODULES = new Set([
	"str",
	"seq",
	"re",
	"int",
	"float",
	"dec",
	"date",
	"opt",
	"http",
	"clock",
	"random",
	"task",
]);

/** String methods the subset maps to intrinsics, and the ones it refuses with a suggestion. */
const STRING_METHODS: Record<string, string> = {
	charCodeAt: "str.codeAt",
	charAt: "str.charAt",
	slice: "str.slice",
	indexOf: "str.indexOf",
	includes: "str.contains",
	startsWith: "str.startsWith",
	endsWith: "str.endsWith",
	repeat: "str.repeat",
	padStart: "str.padStart",
	trim: "str.trim",
	split: "str.split",
};

const LIST_METHODS: Record<string, string> = {
	map: "seq.map",
	filter: "seq.filter",
	includes: "seq.contains",
	indexOf: "seq.indexOf",
	slice: "seq.slice",
	concat: "seq.concat",
	join: "str.join",
	reverse: "seq.reverse",
	some: "seq.any",
	every: "seq.all",
	find: "seq.find",
};

const METHOD_HELP: Record<string, string> = {
	toUpperCase: "use `str.asciiUpper` on a proven-ASCII value; full Unicode case mapping differs across targets",
	toLowerCase: "use `str.asciiLower` on a proven-ASCII value",
	replace: "write the replacement in source; host replace semantics differ",
	replaceAll: "write the replacement in source; host replace semantics differ",
	normalize: "Unicode normalization depends on the host's UCD version and is outside the subset",
	localeCompare: "use `str.compare`, which is scalar order everywhere",
	toFixed: "use `dec.fromFloat` and format in source, so rounding is explicit",
	sort: "use `seq.sortStable` or `seq.sortStableBy`; host sorts differ on stability and on string order",
	toString: "convert explicitly, for example with `str.fromInt`",
};

export type CheckMetrics = {
	/** Loops whose accumulator ranges had to be widened instead of proven exactly. */
	widenedLoops: number;
	/** Assignments whose range was clamped back into the platform-safe domain after widening. */
	clampedRanges: string[];
	/** Integer types that leave the platform-safe domain, which forces a wide representation. */
	wideIntegers: string[];
};

type Binding = {
	readonly name: string;
	/** The type the binding was declared with; assignments are checked against this. */
	declared: SemType;
	/** The flow-sensitive type at this point. */
	type: SemType;
	readonly mutable: boolean;
	/** True when flow analysis has proven an Option present, so uses unwrap it. */
	unwrapped: boolean;
	/** True when a loop widened this binding's range instead of proving it exactly. */
	widened?: boolean;
};

type Narrowing = Map<string, SemType>;

type FuncSig = {
	readonly qualified: string;
	readonly params: readonly { name: string; type: SemType }[];
	readonly ret: SemType;
	readonly hir: HFunc;
	readonly module: string;
};

export function checkProgram(
	modules: readonly HModule[],
	diagnostics: Diagnostics,
): { program: CProgram; metrics: CheckMetrics } {
	return new Checker(modules, diagnostics).run();
}

class Checker {
	private readonly modules: readonly HModule[];
	private readonly diagnostics: Diagnostics;
	private readonly records = new Map<string, CRecordDef>();
	private readonly enums = new Map<string, readonly string[]>();
	private readonly aliases = new Map<string, SemType>();
	private readonly aliasSources = new Map<string, { type: HTypeExpr; module: string }>();
	private readonly errors = new Map<string, CErrorDef>();
	private readonly functions = new Map<string, FuncSig>();
	private readonly consts = new Map<string, CConst>();
	private readonly checked = new Map<string, CFunc>();
	private readonly specializations = new Map<string, string>();
	private readonly specializationCounts = new Map<string, number>();
	private readonly moduleScopes = new Map<string, Map<string, string>>();
	private readonly metrics: CheckMetrics = { widenedLoops: 0, clampedRanges: [], wideIntegers: [] };
	private readonly entryPoints: string[] = [];

	constructor(modules: readonly HModule[], diagnostics: Diagnostics) {
		this.modules = modules;
		this.diagnostics = diagnostics;
	}

	run(): { program: CProgram; metrics: CheckMetrics } {
		this.collectDeclarations();
		this.resolveTypes();
		this.resolveSignatures();
		this.resolveConsts();
		const order = this.topologicalOrder();
		// Exported functions are the published contract, so they are checked with their declared
		// signature. Internal helpers are checked per call site instead (see `instantiate`), which
		// is what lets a helper like `digitAt` serve an 11 digit CPF and a 14 digit CNPJ without
		// either losing the length proof its caller already has.
		for (const qualified of order) {
			const signature = this.functions.get(qualified);
			if (signature === undefined || !isCheckedEagerly(signature)) continue;
			this.checked.set(qualified, this.checkFunction(signature, signature.params, qualified));
		}
		this.diagnostics.throwIfErrors();
		return {
			program: {
				records: this.records,
				errors: this.errors,
				functions: this.checked,
				consts: this.consts,
				entryPoints: this.entryPoints,
			},
			metrics: this.metrics,
		};
	}

	/* ---------------------------------------------------------------- *
	 * Declarations
	 * ---------------------------------------------------------------- */

	private collectDeclarations(): void {
		for (const record of BUILTIN_RECORDS) {
			this.records.set(record.name, {
				name: record.name,
				fields: record.fields,
				doc: record.doc,
				exported: true,
			});
		}
		for (const name of BUILTIN_ERRORS) {
			this.errors.set(name, { name, doc: "Raised by the engine's own intrinsics.", exported: true });
		}

		for (const module of this.modules) {
			const scope = new Map<string, string>();
			this.moduleScopes.set(module.path, scope);
			for (const item of module.imports) {
				const target = resolveImportPath(module.path, item.from);
				for (const name of item.names) {
					scope.set(name.local, `${target}::${name.imported}`);
				}
			}
			for (const fn of module.functions) scope.set(fn.name, `${module.path}::${fn.name}`);
			for (const constant of module.consts) scope.set(constant.name, `${module.path}::${constant.name}`);
		}

		for (const module of this.modules) {
			for (const decl of module.types) {
				if (this.aliasSources.has(decl.name)) {
					this.diagnostics.error(
						"E_DUPLICATE_TYPE",
						`the type \`${decl.name}\` is declared twice; type names are project-global`,
						decl.span,
					);
					continue;
				}
				this.aliasSources.set(decl.name, { type: decl.type, module: module.path });
			}
			for (const decl of module.errors) {
				this.errors.set(decl.name, {
					name: decl.name,
					base: decl.base === "DomainError" ? undefined : decl.base,
					doc: decl.doc,
					exported: decl.exported,
				});
			}
		}
	}

	private resolveTypes(): void {
		for (const [name, source] of this.aliasSources) {
			const resolved = this.resolveTypeExpr(source.type, name);
			this.aliases.set(name, resolved);
			if (source.type.kind === "object") {
				this.records.set(name, {
					name,
					fields: source.type.fields.map((field) => ({
						name: field.name,
						type: this.resolveTypeExpr(field.type, `${name}.${field.name}`),
						optional: field.optional,
						doc: field.doc,
					})),
					doc: undefined,
					exported: true,
				});
			}
		}
	}

	private resolveTypeExpr(type: HTypeExpr, context?: string): SemType {
		switch (type.kind) {
			case "ref":
				return this.resolveRef(type, context);
			case "array":
				return tList(this.resolveTypeExpr(type.elem, context));
			case "undefined":
				return tOption(tNever);
			case "literal":
				return tEnum(context ?? "enum", [type.value]);
			case "object": {
				if (context === undefined) {
					this.diagnostics.error(
						"E_INLINE_RECORD",
						"record types must be declared with a name",
						type.span,
						"declare `type Name = { … }` and refer to it; the core's records are nominal",
					);
					return tNever;
				}
				return tRecord(context);
			}
			case "func":
				return tLambda(
					type.params.map((param) => this.resolveTypeExpr(param, context)),
					this.resolveTypeExpr(type.ret, context),
				);
			case "union": {
				const options = type.options;
				const hasUndefined = options.some((option) => option.kind === "undefined");
				const rest = options.filter((option) => option.kind !== "undefined");
				if (rest.every((option) => option.kind === "literal")) {
					const members = rest.map((option) => (option as { value: string }).value);
					const enumType = tEnum(context ?? "enum", members.sort());
					return hasUndefined ? tOption(enumType) : enumType;
				}
				if (rest.length === 1) {
					const inner = this.resolveTypeExpr(rest[0]!, context);
					return hasUndefined ? tOption(inner) : inner;
				}
				this.diagnostics.error(
					"E_UNION",
					"only string-literal unions and `T | undefined` are admitted so far",
					type.span,
					"a discriminated union of records needs the union admission rule; see docs/semantics.md",
				);
				return tNever;
			}
			default: {
				const exhaustive: never = type;
				return exhaustive;
			}
		}
	}

	private resolveRef(
		type: Extract<HTypeExpr, { kind: "ref" }>,
		context?: string,
	): SemType {
		const literalArg = (index: number): number | undefined => {
			const arg = type.args[index];
			if (arg === undefined || arg.kind !== "literal") return undefined;
			const parsed = Number(arg.value);
			return Number.isFinite(parsed) ? parsed : undefined;
		};

		switch (type.name) {
			case "Bool":
			case "boolean":
				return tBool;
			case "Int":
				return tIntDefault();
			case "IntRange": {
				const lo = literalArg(0);
				const hi = literalArg(1);
				if (lo === undefined || hi === undefined) {
					this.diagnostics.error("E_INT_RANGE", "IntRange needs two integer literals", type.span);
					return tIntDefault();
				}
				return tInt(BigInt(lo), BigInt(hi));
			}
			case "Float":
				return tFloat;
			case "Decimal": {
				const scale = literalArg(0);
				if (scale === undefined) {
					this.diagnostics.error(
						"E_DECIMAL_SCALE",
						"Decimal needs a scale, for example `Decimal<2>`",
						type.span,
					);
					return tDecimal(2);
				}
				return tDecimal(scale);
			}
			case "String":
			case "string":
				return tString("none");
			case "Ascii":
				return tString("ascii");
			case "Digits":
				return tString("digits");
			case "AsciiOf": {
				const length = literalArg(0);
				if (length === undefined) {
					this.diagnostics.error("E_LENGTH", "AsciiOf needs a length literal", type.span);
					return tString("ascii");
				}
				return tString("ascii", length, length);
			}
			case "DigitsOf": {
				const length = literalArg(0);
				if (length === undefined) {
					this.diagnostics.error("E_LENGTH", "DigitsOf needs a length literal", type.span);
					return tString("digits");
				}
				return tString("digits", length, length);
			}
			case "CivilDate":
				return tCivilDate;
			case "Instant":
				return tInstant;
			case "Duration":
				return tDuration;
			case "Void":
			case "void":
				return tVoid;
			case "List": {
				const elem = type.args[0];
				if (elem === undefined) {
					this.diagnostics.error("E_LIST", "List needs an element type", type.span);
					return tList(tNever);
				}
				const min = literalArg(1) ?? 0;
				const max = literalArg(2) ?? MAX_COLLECTION_LENGTH;
				return tList(this.resolveTypeExpr(elem, context), min, max);
			}
			default: {
				// A builtin record (HttpRequest and friends) has no alias source, but it is a
				// nominal record type all the same.
				if (this.records.has(type.name) && this.aliasSources.get(type.name) === undefined) {
					return tRecord(type.name);
				}
				if (this.records.has(type.name) && this.aliasSources.get(type.name)?.type.kind === "object") {
					return tRecord(type.name);
				}
				const alias = this.aliases.get(type.name);
				if (alias !== undefined) return alias;
				const source = this.aliasSources.get(type.name);
				if (source !== undefined) {
					if (source.type.kind === "object") return tRecord(type.name);
					const resolved = this.resolveTypeExpr(source.type, type.name);
					this.aliases.set(type.name, resolved);
					return resolved;
				}
				this.diagnostics.error("E_UNKNOWN_TYPE", `unknown type \`${type.name}\``, type.span);
				return tNever;
			}
		}
	}

	private resolveSignatures(): void {
		for (const module of this.modules) {
			for (const fn of module.functions) {
				const qualified = `${module.path}::${fn.name}`;
				this.functions.set(qualified, {
					qualified,
					params: fn.params.map((param) => ({
						name: param.name,
						type: this.resolveTypeExpr(param.type, `${fn.name}.${param.name}`),
					})),
					ret: this.resolveTypeExpr(fn.ret, fn.name),
					hir: fn,
					module: module.path,
				});
				if (fn.exported && !module.path.includes("/")) this.entryPoints.push(qualified);
			}
		}
	}

	private resolveConsts(): void {
		for (const module of this.modules) {
			for (const constant of module.consts) {
				const qualified = `${module.path}::${constant.name}`;
				if (constant.value.kind === "regex") {
					try {
						const regex = normalizeRegex(constant.value.source, constant.span);
						if (constant.value.flags !== "") {
							this.diagnostics.error(
								"E_REGEX_FLAGS",
								"regex flags are outside the subset: they mean different things in each dialect",
								constant.span,
							);
						}
						this.consts.set(qualified, {
							name: qualified,
							type: tString("none"),
							value: constant.value.source,
							module: module.path,
							regex,
						});
					} catch (error) {
						this.diagnostics.error(
							"E_REGEX",
							error instanceof RegexError ? error.message : String(error),
							constant.span,
						);
					}
					continue;
				}
				const checker = new FunctionChecker(this, module.path, tVoid, new Map());
				const expected =
					constant.declared === undefined ? undefined : this.resolveTypeExpr(constant.declared, constant.name);
				const expr = checker.expr(constant.value, expected);
				const value = tryEvalConst(expr);
				if (value === undefined) {
					this.diagnostics.error(
						"E_NOT_CONSTANT",
						`\`${constant.name}\` is not computable at compile time`,
						constant.span,
						"module level constants may only use literals, records, lists and pure intrinsics",
					);
					continue;
				}
				this.consts.set(qualified, {
					name: qualified,
					type: expected ?? expr.type,
					value,
					module: module.path,
				});
			}
		}
	}

	/* ---------------------------------------------------------------- *
	 * Call graph
	 * ---------------------------------------------------------------- */

	private topologicalOrder(): string[] {
		const edges = new Map<string, Set<string>>();
		for (const [qualified, signature] of this.functions) {
			edges.set(qualified, new Set(this.callsOf(signature)));
		}
		const order: string[] = [];
		const state = new Map<string, "visiting" | "done">();
		const visit = (name: string, stack: string[]): void => {
			const status = state.get(name);
			if (status === "done") return;
			if (status === "visiting") {
				const signature = this.functions.get(name);
				this.diagnostics.error(
					"E_RECURSION",
					`recursion is outside the subset in this phase: ${[...stack, name].join(" -> ")}`,
					signature?.hir.span ?? NO_SPAN,
					"rewrite with a counted loop and an explicit stack",
				);
				return;
			}
			state.set(name, "visiting");
			for (const callee of edges.get(name) ?? []) visit(callee, [...stack, name]);
			state.set(name, "done");
			order.push(name);
		};
		for (const name of this.functions.keys()) visit(name, []);
		return order;
	}

	private callsOf(signature: FuncSig): string[] {
		const scope = this.moduleScopes.get(signature.module) ?? new Map();
		const found = new Set<string>();
		const visitExpr = (expr: HExpr): void => {
			switch (expr.kind) {
				case "name": {
					const target = scope.get(expr.name);
					if (target !== undefined && this.functions.has(target)) found.add(target);
					return;
				}
				case "member":
					visitExpr(expr.target);
					return;
				case "index":
					visitExpr(expr.target);
					visitExpr(expr.index);
					return;
				case "call":
					visitExpr(expr.callee);
					expr.args.forEach(visitExpr);
					return;
				case "new":
					expr.args.forEach(visitExpr);
					return;
				case "binary":
				case "logical":
					visitExpr(expr.left);
					visitExpr(expr.right);
					return;
				case "unary":
					visitExpr(expr.operand);
					return;
				case "ternary":
					visitExpr(expr.test);
					visitExpr(expr.then);
					visitExpr(expr.otherwise);
					return;
				case "template":
					for (const part of expr.parts) if (part.kind === "expr") visitExpr(part.expr);
					return;
				case "object":
					for (const field of expr.fields) visitExpr(field.value);
					return;
				case "array":
					expr.items.forEach(visitExpr);
					return;
				case "lambda":
					expr.body.forEach(visitStmt);
					return;
				default:
					return;
			}
		};
		const visitStmt = (statement: HStmt): void => {
			switch (statement.kind) {
				case "let":
					visitExpr(statement.init);
					return;
				case "assign":
					visitExpr(statement.target);
					visitExpr(statement.value);
					return;
				case "if":
					visitExpr(statement.test);
					statement.then.forEach(visitStmt);
					statement.otherwise?.forEach(visitStmt);
					return;
				case "switch":
					visitExpr(statement.subject);
					for (const entry of statement.cases) entry.body.forEach(visitStmt);
					return;
				case "forCounted":
					visitExpr(statement.from);
					visitExpr(statement.to);
					statement.body.forEach(visitStmt);
					return;
				case "forOf":
					visitExpr(statement.iterable);
					statement.body.forEach(visitStmt);
					return;
				case "return":
					if (statement.value !== undefined) visitExpr(statement.value);
					return;
				case "throw":
					statement.args.forEach(visitExpr);
					return;
				case "expr":
					visitExpr(statement.expr);
					return;
				case "block":
					statement.body.forEach(visitStmt);
					return;
				default:
					return;
			}
		};
		signature.hir.body.forEach(visitStmt);
		return [...found];
	}

	/**
	 * Checks a function against the argument types a call site really has.
	 *
	 * Exported functions always use their declared signature. An internal helper is specialized:
	 * the refinements its caller proved (a length, a character class, a range) flow into the
	 * helper's body, so the proof composes across function boundaries instead of stopping at them.
	 * Specializations that coincide are shared, and `MAX_SPECIALIZATIONS` caps the fan-out.
	 */
	instantiate(
		qualified: string,
		argTypes: readonly SemType[],
	): { name: string; ret: SemType; effects: EffectSet; params: readonly { name: string; type: SemType }[] } | undefined {
		const signature = this.functions.get(qualified);
		if (signature === undefined) return undefined;
		if (isCheckedEagerly(signature)) {
			const checked = this.checked.get(qualified);
			return {
				name: qualified,
				ret: signature.ret,
				effects: checked?.effects ?? PURE,
				params: signature.params,
			};
		}
		const params = signature.params.map((param, index) => {
			const actual = argTypes[index];
			return {
				name: param.name,
				type: actual !== undefined && isSubtype(actual, param.type) ? actual : param.type,
			};
		});
		const key = `${qualified}(${params.map((param) => typeToString(param.type)).join(", ")})`;
		const existing = this.specializations.get(key);
		if (existing !== undefined) {
			const checked = this.checked.get(existing)!;
			return { name: existing, ret: checked.ret, effects: checked.effects, params };
		}
		const count = this.specializationCounts.get(qualified) ?? 0;
		if (count >= MAX_SPECIALIZATIONS) {
			const fallback = this.checked.get(qualified);
			if (fallback !== undefined) {
				return {
					name: qualified,
					ret: fallback.ret,
					effects: fallback.effects,
					params: signature.params,
				};
			}
		}
		const name = count === 0 ? qualified : `${qualified}$${count}`;
		this.specializationCounts.set(qualified, count + 1);
		this.specializations.set(key, name);
		// Reserve the slot before checking, so a call made while this body is being checked sees
		// the name rather than starting a second, identical specialization.
		const checkedFunction = this.checkFunction(signature, params, name);
		this.checked.set(name, checkedFunction);
		return { name, ret: checkedFunction.ret, effects: checkedFunction.effects, params };
	}

	private checkFunction(
		signature: FuncSig,
		paramTypes: readonly { name: string; type: SemType }[],
		name: string,
	): CFunc {
		const scope = new Map<string, Binding>();
		for (const param of paramTypes) {
			scope.set(param.name, {
				name: param.name,
				declared: param.type,
				type: param.type,
				mutable: false,
				unwrapped: false,
			});
		}
		const checker = new FunctionChecker(this, signature.module, signature.ret, scope);
		const body = checker.block(signature.hir.body);
		// A specialization may prove a narrower result than the declaration promises, and its
		// callers should see that proof; a public signature stays exactly as declared.
		const inferred = returnTypeOf(body);
		const ret =
			!isCheckedEagerly(signature) && inferred.kind !== "Never" && isSubtype(inferred, signature.ret)
				? inferred
				: signature.ret;
		if (signature.ret.kind !== "Void" && !checker.alwaysReturns(body)) {
			this.diagnostics.error(
				"E_MISSING_RETURN",
				`\`${signature.hir.name}\` does not return on every path`,
				signature.hir.span,
			);
		}
		return {
			name,
			module: signature.module,
			localName: name === signature.qualified ? signature.hir.name : name.split("::")[1]!,
			params: paramTypes.map((param, index) => ({
				name: param.name,
				type: param.type,
				doc: signature.hir.params[index]?.name,
			})),
			ret,
			effects: checker.effects,
			body,
			// "Exported" means part of the published core API: a utility, not a library helper.
			exported: isEntryPoint(signature) && name === signature.qualified,
			doc: signature.hir.doc,
			span: signature.hir.span,
			// The call graph of the Core, not of the source: after specialization a call site
			// names the specialization it was checked against.
			calls: collectCalls(body),
			usesEnv: false,
		};
	}

	/* ---------------------------------------------------------------- *
	 * Shared lookups used by FunctionChecker
	 * ---------------------------------------------------------------- */

	get diags(): Diagnostics {
		return this.diagnostics;
	}

	get recordTable(): Map<string, CRecordDef> {
		return this.records;
	}

	get errorTable(): Map<string, CErrorDef> {
		return this.errors;
	}

	get constTable(): Map<string, CConst> {
		return this.consts;
	}

	get metricTable(): CheckMetrics {
		return this.metrics;
	}

	scopeOf(module: string): Map<string, string> {
		return this.moduleScopes.get(module) ?? new Map();
	}

	signatureOf(qualified: string): FuncSig | undefined {
		return this.functions.get(qualified);
	}

	effectsOf(qualified: string): EffectSet {
		return this.checked.get(qualified)?.effects ?? PURE;
	}

	/** The checked body of a function, for the analyses that have to look through a call. */
	bodyOf(qualified: string): readonly CStmt[] | undefined {
		return this.checked.get(qualified)?.body;
	}

	resolveType(type: HTypeExpr, context?: string): SemType {
		return this.resolveTypeExpr(type, context);
	}

	typeOfAlias(name: string): SemType | undefined {
		return this.aliases.get(name);
	}
}

/**
 * A utility is an exported function of a module at the source root; everything under a
 * subdirectory (`lib/…`) is library code. Utilities are the published core API, so they keep
 * their declared signature; library code is specialized per call site.
 */
function isEntryPoint(signature: FuncSig): boolean {
	return signature.hir.exported && !signature.module.includes("/");
}

/**
 * Functions checked against their declared signature rather than per call site: the project's
 * utilities, and the engine's own standard library, whose functions a portable lowering may call
 * without any source in the project ever naming them.
 */
function isCheckedEagerly(signature: FuncSig): boolean {
	return isEntryPoint(signature) || STDLIB_SURFACE.includes(signature.qualified);
}

/** Whether a statement can reach a `break` that belongs to the switch rather than to a loop. */
function escapesCase(statement: HStmt): boolean {
	switch (statement.kind) {
		case "break":
			return true;
		case "if":
			return statement.then.some(escapesCase) || (statement.otherwise ?? []).some(escapesCase);
		case "block":
			return statement.body.some(escapesCase);
		case "switch":
			// A nested switch owns its own breaks.
			return false;
		case "forCounted":
		case "forOf":
			// A loop inside the case owns its own breaks.
			return false;
		default:
			return false;
	}
}

/** Every operation a Core body performs, including inside nested lambdas. */
function operationsOf(body: readonly CStmt[]): Extract<CExpr, { kind: "op" }>[] {
	const found: Extract<CExpr, { kind: "op" }>[] = [];
	const expr = (node: CExpr): void => {
		switch (node.kind) {
			case "op":
				found.push(node);
				node.args.forEach(expr);
				return;
			case "call":
				node.args.forEach(expr);
				return;
			case "record":
				node.fields.forEach((field) => expr(field.value));
				return;
			case "list":
				node.items.forEach(expr);
				return;
			case "field":
				expr(node.target);
				return;
			case "some":
				expr(node.inner);
				return;
			case "cond":
				expr(node.test);
				expr(node.then);
				expr(node.otherwise);
				return;
			case "and":
			case "or":
				expr(node.left);
				expr(node.right);
				return;
			case "not":
				expr(node.operand);
				return;
			case "lambda":
				found.push(...operationsOf(node.body));
				return;
			default:
				return;
		}
	};
	const statement = (node: CStmt): void => {
		switch (node.kind) {
			case "let":
				expr(node.init);
				return;
			case "assign":
			case "push":
				expr(node.value);
				return;
			case "setIndex":
				expr(node.index);
				expr(node.value);
				return;
			case "if":
				expr(node.test);
				node.then.forEach(statement);
				node.otherwise.forEach(statement);
				return;
			case "switch":
				expr(node.subject);
				node.cases.forEach((entry) => entry.body.forEach(statement));
				node.otherwise?.forEach(statement);
				return;
			case "forRange":
				expr(node.from);
				expr(node.to);
				node.body.forEach(statement);
				return;
			case "forEach":
				expr(node.iterable);
				node.body.forEach(statement);
				return;
			case "return":
				if (node.value !== undefined) expr(node.value);
				return;
			case "fail":
				node.args.forEach(expr);
				return;
			case "expr":
				expr(node.expr);
				return;
			default:
				return;
		}
	};
	body.forEach(statement);
	return found;
}

/** Every function a Core body calls, fully qualified and de-duplicated. */
const callsOf = (body: readonly CStmt[]): string[] => collectCalls(body);

function collectCalls(body: readonly CStmt[]): string[] {
	const found = new Set<string>();
	const expr = (node: CExpr): void => {
		switch (node.kind) {
			case "call":
				found.add(node.fn);
				node.args.forEach(expr);
				return;
			case "op":
				node.args.forEach(expr);
				return;
			case "record":
				node.fields.forEach((field) => expr(field.value));
				return;
			case "list":
				node.items.forEach(expr);
				return;
			case "field":
				expr(node.target);
				return;
			case "some":
				expr(node.inner);
				return;
			case "cond":
				expr(node.test);
				expr(node.then);
				expr(node.otherwise);
				return;
			case "and":
			case "or":
				expr(node.left);
				expr(node.right);
				return;
			case "not":
				expr(node.operand);
				return;
			case "lambda":
				node.body.forEach(statement);
				return;
			default:
				return;
		}
	};
	const statement = (node: CStmt): void => {
		switch (node.kind) {
			case "let":
				expr(node.init);
				return;
			case "assign":
				expr(node.value);
				return;
			case "setIndex":
				expr(node.index);
				expr(node.value);
				return;
			case "push":
				expr(node.value);
				return;
			case "if":
				expr(node.test);
				node.then.forEach(statement);
				node.otherwise.forEach(statement);
				return;
			case "switch":
				expr(node.subject);
				node.cases.forEach((entry) => entry.body.forEach(statement));
				node.otherwise?.forEach(statement);
				return;
			case "forRange":
				expr(node.from);
				expr(node.to);
				node.body.forEach(statement);
				return;
			case "forEach":
				expr(node.iterable);
				node.body.forEach(statement);
				return;
			case "return":
				if (node.value !== undefined) expr(node.value);
				return;
			case "fail":
				node.args.forEach(expr);
				return;
			case "expr":
				expr(node.expr);
				return;
			default:
				return;
		}
	};
	body.forEach(statement);
	return [...found];
}

/**
 * The character class a pattern denotes, when it is exactly one class.
 *
 * `re.retain` is defined only for that shape: a class is linear, allocation-bounded and means the
 * same thing in every engine, and it is also what tells the checker how to refine the result.
 */
function singleClassOf(regex: NormalizedRegex): "ascii" | "digits" | undefined {
	const node = regex.node;
	if (node.kind !== "class") return undefined;
	const digits = node.ranges.every((range) => range.lo >= 0x30 && range.hi <= 0x39);
	if (digits) return "digits";
	return node.ranges.every((range) => range.hi < 0x80) ? "ascii" : undefined;
}

function resolveImportPath(from: string, specifier: string): string {
	if (!specifier.startsWith(".")) return specifier;
	const base = from.split("/").slice(0, -1);
	const parts = specifier.replace(/\.ts$/, "").split("/");
	for (const part of parts) {
		if (part === ".") continue;
		if (part === "..") base.pop();
		else base.push(part);
	}
	return base.join("/");
}

/* ==================================================================== *
 * Function level checking
 * ==================================================================== */

/** How many times a loop body is re-checked before ranges are widened instead of proven. */
const MAX_LOOP_ITERATIONS = 64;

/** How many differently refined versions of one internal helper the checker will produce. */
const MAX_SPECIALIZATIONS = 16;

/**
 * The largest single step a widened loop counter may take and still be clamped back into the
 * platform-safe domain. A loop runs at most MAX_COLLECTION_LENGTH (2^31 - 1) times, so a step of
 * at most 2^22 keeps the value inside 2^53.
 */
const MAX_WIDENED_STEP = 2n ** 22n;

type ScopeSnapshot = Map<string, { type: SemType; unwrapped: boolean }>;

class FunctionChecker {
	private readonly checker: Checker;
	private readonly module: string;
	private readonly returnType: SemType;
	private readonly scope: Map<string, Binding>;
	private quiet = false;
	/**
	 * The states `break` and `continue` leave the innermost loop's body with.
	 *
	 * Neither leaves the function, so an assignment made just before one is live: a `continue`'s
	 * state seeds the next iteration, and a `break`'s state seeds the code after the loop. Both
	 * are collected here because the statement that produced them is not on the path that falls
	 * out of the body, which is the only path the straight-line walk sees.
	 */
	private breakStates: ScopeSnapshot[] | undefined;
	private continueStates: ScopeSnapshot[] | undefined;
	effects: EffectSet = PURE;

	constructor(
		checker: Checker,
		module: string,
		returnType: SemType,
		scope: Map<string, Binding>,
	) {
		this.checker = checker;
		this.module = module;
		this.returnType = returnType;
		this.scope = scope;
	}

	private report(code: string, message: string, span: Span, suggestion?: string): void {
		if (!this.quiet) this.checker.diags.error(code, message, span, suggestion);
	}

	private addEffects(set: EffectSet): void {
		this.effects = unionEffects(this.effects, set);
	}

	/* ---------------------------------------------------------------- *
	 * Scope plumbing
	 * ---------------------------------------------------------------- */

	private snapshot(): ScopeSnapshot {
		const snapshot: ScopeSnapshot = new Map();
		for (const [name, binding] of this.scope) {
			snapshot.set(name, { type: binding.type, unwrapped: binding.unwrapped });
		}
		return snapshot;
	}

	private restore(snapshot: ScopeSnapshot): void {
		for (const [name, state] of snapshot) {
			const binding = this.scope.get(name);
			if (binding !== undefined) {
				binding.type = state.type;
				binding.unwrapped = state.unwrapped;
			}
		}
		for (const name of [...this.scope.keys()]) {
			if (!snapshot.has(name)) this.scope.delete(name);
		}
	}

	private mergeInto(left: ScopeSnapshot, right: ScopeSnapshot): void {
		for (const [name, binding] of this.scope) {
			const a = left.get(name);
			const b = right.get(name);
			if (a === undefined || b === undefined) continue;
			binding.type = join(a.type, b.type);
			binding.unwrapped = a.unwrapped && b.unwrapped;
		}
	}

	/** Sets every binding to the join of the states it has across `states`. */
	private applyJoin(states: readonly ScopeSnapshot[]): void {
		for (const [name, binding] of this.scope) {
			let merged: SemType | undefined;
			let unwrapped = true;
			for (const state of states) {
				const entry = state.get(name);
				if (entry === undefined) continue;
				merged = merged === undefined ? entry.type : join(merged, entry.type);
				unwrapped &&= entry.unwrapped;
			}
			if (merged === undefined) continue;
			binding.type = merged;
			binding.unwrapped = unwrapped;
		}
	}

	private applyNarrowing(narrowing: Narrowing): void {
		for (const [name, type] of narrowing) {
			const binding = this.scope.get(name);
			if (binding === undefined) continue;
			binding.type = type;
			binding.unwrapped = binding.declared.kind === "Option" && type.kind !== "Option";
		}
	}

	/* ---------------------------------------------------------------- *
	 * Statements
	 * ---------------------------------------------------------------- */

	block(body: readonly HStmt[]): CStmt[] {
		const result: CStmt[] = [];
		for (const statement of body) result.push(...this.stmt(statement));
		return result;
	}

	/** True when the body returns (or fails) on every path; used for return checking. */
	alwaysReturns(body: readonly CStmt[]): boolean {
		for (const statement of body) {
			if (statement.kind === "return" || statement.kind === "fail") return true;
			if (
				statement.kind === "if" &&
				statement.otherwise.length > 0 &&
				this.alwaysReturns(statement.then) &&
				this.alwaysReturns(statement.otherwise)
			) {
				return true;
			}
			if (statement.kind === "switch") {
				const complete =
					statement.otherwise !== undefined &&
					statement.cases.every((entry) => this.alwaysReturns(entry.body)) &&
					this.alwaysReturns(statement.otherwise);
				if (complete) return true;
			}
		}
		return false;
	}

	stmt(statement: HStmt): CStmt[] {
		switch (statement.kind) {
			case "let": {
				const declared =
					statement.declared === undefined
						? undefined
						: this.checker.resolveType(statement.declared, statement.name);
				const init = this.expr(statement.init, declared);
				if (declared !== undefined && !isSubtype(init.type, declared)) {
					this.report(
						"E_TYPE",
						`cannot assign ${typeToString(init.type)} to ${typeToString(declared)}`,
						statement.span,
					);
				}
				const type = declared ?? init.type;
				this.scope.set(statement.name, {
					name: statement.name,
					declared: type,
					type: init.type,
					mutable: statement.mutable,
					unwrapped: false,
				});
				this.noteWideInteger(type, statement.span);
				return [
					{ kind: "let", name: statement.name, mutable: statement.mutable, init, type, span: statement.span },
				];
			}
			case "assign":
				return this.assignment(statement);
			case "if": {
				const test = this.expr(statement.test, tBool);
				this.requireBool(test, statement.span);
				const { whenTrue, whenFalse } = deriveNarrowing(test);
				const entry = this.snapshot();
				this.applyNarrowing(whenTrue);
				const then = this.block(statement.then);
				const afterThen = this.snapshot();
				this.restore(entry);
				this.applyNarrowing(whenFalse);
				const otherwise = statement.otherwise === undefined ? [] : this.block(statement.otherwise);
				const afterElse = this.snapshot();

				const thenExits = this.alwaysReturns(then) || exitsScope(then);
				const elseExits = this.alwaysReturns(otherwise) || exitsScope(otherwise);
				if (thenExits && !elseExits) {
					// `if (!ok) return …` leaves the negated fact in force for the rest of the block.
					this.restore(afterElse);
				} else if (elseExits && !thenExits) {
					this.restore(afterThen);
				} else {
					this.restore(entry);
					this.mergeInto(afterThen, afterElse);
				}
				return [{ kind: "if", test, then, otherwise, span: statement.span }];
			}
			case "switch":
				return this.switchStatement(statement);
			case "forCounted":
				return this.countedLoop(statement);
			case "forOf":
				return this.forEachLoop(statement);
			case "return": {
				if (statement.value === undefined) {
					return [{ kind: "return", span: statement.span }];
				}
				const checked = this.expr(statement.value, this.returnType);
				const value =
					this.returnType.kind === "Option" && checked.type.kind !== "Option" && checked.type.kind !== "Never"
						? ({ kind: "some", inner: checked, type: tOption(checked.type), span: checked.span } as CExpr)
						: checked;
				// A lambda passed to a combinator has no declared return type: the combinator's own
				// signature checks the result, so there is nothing to compare against here.
				if (
					this.returnType.kind !== "Never" &&
					!isSubtype(value.type, this.returnType) &&
					!fitsPlatformDomain(value.type, this.returnType)
				) {
					this.report(
						"E_RETURN_TYPE",
						`returning ${typeToString(value.type)} where ${typeToString(this.returnType)} is declared`,
						statement.span,
					);
				}
				return [{ kind: "return", value, span: statement.span }];
			}
			case "throw": {
				if (!this.checker.errorTable.has(statement.errorClass)) {
					this.report(
						"E_UNKNOWN_ERROR",
						`unknown error type \`${statement.errorClass}\``,
						statement.span,
						"declare it in source: `export class MyError extends DomainError {}`",
					);
				}
				this.effects = withFail(this.effects, statement.errorClass);
				const args = statement.args.map((arg) => this.expr(arg, tString("none")));
				return [{ kind: "fail", errorClass: statement.errorClass, args, span: statement.span }];
			}
			case "break":
				this.breakStates?.push(this.snapshot());
				return [{ kind: "break", span: statement.span }];
			case "continue":
				this.continueStates?.push(this.snapshot());
				return [{ kind: "continue", span: statement.span }];
			case "block":
				return this.block(statement.body);
			case "expr":
				return this.expressionStatement(statement.expr, statement.span);
			default: {
				const exhaustive: never = statement;
				return exhaustive;
			}
		}
	}

	private expressionStatement(expr: HExpr, span: Span): CStmt[] {
		// `xs.push(v)` is the one mutation the subset allows, and only on a local list.
		if (expr.kind === "call" && expr.callee.kind === "member" && expr.callee.name === "push") {
			const target = expr.callee.target;
			if (target.kind !== "name") {
				this.report("E_PUSH_TARGET", "push is allowed only on a local list", span);
				return [];
			}
			const binding = this.scope.get(target.name);
			if (binding === undefined || binding.type.kind !== "List") {
				this.report("E_PUSH_TARGET", `\`${target.name}\` is not a local list`, span);
				return [];
			}
			if (!binding.mutable) {
				this.report(
					"E_PUSH_CONST",
					`\`${target.name}\` is not mutable`,
					span,
					"declare the list with `let` while it is being built",
				);
			}
			const value = this.expr(expr.args[0]!, binding.type.elem);
			if (!isSubtype(value.type, binding.type.elem)) {
				this.report(
					"E_TYPE",
					`cannot push ${typeToString(value.type)} into ${typeToString(binding.type)}`,
					span,
				);
			}
			const listType = binding.type;
			binding.type = tList(
				listType.elem,
				Math.min(listType.min + 1, MAX_COLLECTION_LENGTH),
				Math.min(listType.max + 1, MAX_COLLECTION_LENGTH),
			);
			binding.declared = tList(listType.elem, 0, MAX_COLLECTION_LENGTH);
			return [{ kind: "push", name: target.name, value, span }];
		}
		const checked = this.expr(expr);
		return [{ kind: "expr", expr: checked, span }];
	}

	private assignment(statement: Extract<HStmt, { kind: "assign" }>): CStmt[] {
		const target = statement.target;
		if (target.kind === "index") {
			if (target.target.kind !== "name") {
				this.report("E_ASSIGN_TARGET", "only a local list element may be assigned", statement.span);
				return [];
			}
			const binding = this.scope.get(target.target.name);
			if (binding === undefined || binding.type.kind !== "List" || !binding.mutable) {
				this.report(
					"E_ASSIGN_TARGET",
					`\`${target.target.name}\` is not a mutable local list`,
					statement.span,
				);
				return [];
			}
			const index = this.expr(target.index, tIntDefault());
			if (index.type.kind === "Int" && (index.type.lo < 0n || index.type.hi >= BigInt(binding.type.min))) {
				this.report(
					"E_INDEX",
					`the index may be out of range (${typeToString(index.type)} into ${typeToString(binding.type)})`,
					statement.span,
					"guard the index against the list length",
				);
			}
			const value = this.expr(target.index === undefined ? statement.value : statement.value, binding.type.elem);
			return [{ kind: "setIndex", name: target.target.name, index, value, span: statement.span }];
		}
		if (target.kind !== "name") {
			this.report(
				"E_ASSIGN_TARGET",
				"only locals are mutable",
				statement.span,
				"records are immutable; build a new one instead",
			);
			return [];
		}
		const binding = this.scope.get(target.name);
		if (binding === undefined) {
			this.report("E_UNKNOWN_NAME", `unknown name \`${target.name}\``, statement.span);
			return [];
		}
		if (!binding.mutable) {
			this.report("E_IMMUTABLE", `\`${target.name}\` is not mutable`, statement.span, "declare it with `let`");
		}
		const current: CExpr = {
			kind: "local",
			name: binding.name,
			type: binding.type,
			span: statement.span,
		};
		const raw = this.expr(statement.value, binding.declared);
		let value = raw;
		if (statement.op !== "=") {
			const op = statement.op === "+=" ? "+" : statement.op === "-=" ? "-" : "*";
			value = this.binaryOp(op, current, raw, statement.span);
		}
		let assigned = value.type;
		if (!isSubtype(assigned, widenAssignment(binding.declared))) {
			// A loop-carried counter whose exact range the analysis could not compute is widened to
			// the platform-safe domain. Clamping back into it is sound only while one step is small:
			// every loop's trip count is bounded by MAX_COLLECTION_LENGTH, so a bounded step cannot
			// leave the domain. A step that is not bounded is still an error.
			const step = stepSize(binding.declared, assigned);
			const platformDomain =
				binding.declared.kind === "Int" && binding.declared.hi >= SAFE_INT_HI - MAX_WIDENED_STEP;
			if ((binding.widened === true || platformDomain) && step !== undefined && step <= MAX_WIDENED_STEP) {
				this.checker.metricTable.clampedRanges.push(
					`${statement.span.file}:${statement.span.start} ${typeToString(assigned)} clamped to ${typeToString(binding.declared)}`,
				);
				assigned = binding.declared;
			} else {
				this.report(
					"E_UNPROVEN_RANGE",
					`cannot prove ${typeToString(value.type)} stays within ${typeToString(binding.declared)}`,
					statement.span,
					"annotate the binding with a wider `IntRange<lo, hi>`, or narrow the operands",
				);
			}
		}
		binding.type = assigned;
		binding.unwrapped = false;
		return [{ kind: "assign", name: target.name, value, span: statement.span }];
	}

	private switchStatement(statement: Extract<HStmt, { kind: "switch" }>): CStmt[] {
		const subject = this.expr(statement.subject);
		if (subject.type.kind !== "Enum") {
			this.report(
				"E_SWITCH_SUBJECT",
				`switch works over a string-literal union, not ${typeToString(subject.type)}`,
				statement.span,
				"use `if`/`else` for other types",
			);
		}
		const entry = this.snapshot();
		const cases: { values: Value[]; body: CStmt[] }[] = [];
		let otherwise: CStmt[] | undefined;
		const covered = new Set<string>();
		const exits: ScopeSnapshot[] = [];
		for (const caseNode of statement.cases) {
			this.restore(entry);
			const caseBody = this.caseBody(caseNode.body);
			if (caseNode.test === undefined) {
				otherwise = this.block(caseBody);
				exits.push(this.snapshot());
				continue;
			}
			const test = this.expr(caseNode.test, subject.type);
			const value = tryEvalConst(test);
			if (value === undefined || typeof value !== "string") {
				this.report("E_SWITCH_CASE", "case labels must be string literals", caseNode.span);
				continue;
			}
			covered.add(value);
			if (subject.kind === "local") {
				const binding = this.scope.get(subject.name);
				if (binding !== undefined && binding.type.kind === "Enum") {
					binding.type = tEnum(binding.type.name, [value]);
				}
			}
			cases.push({ values: [value], body: this.block(caseBody) });
			exits.push(this.snapshot());
		}
		this.restore(entry);
		if (subject.type.kind === "Enum" && otherwise === undefined) {
			const missing = subject.type.members.filter((member) => !covered.has(member));
			if (missing.length > 0) {
				this.report(
					"E_NON_EXHAUSTIVE",
					`switch does not cover ${missing.map((member) => JSON.stringify(member)).join(", ")}`,
					statement.span,
					"add the missing cases, or a default",
				);
			}
		}
		return [{ kind: "switch", subject, cases, otherwise, span: statement.span }];
	}

	/**
	 * The statements of a switch case, without the `break` that ends it.
	 *
	 * In TypeScript that `break` leaves the *switch*; the Core's switch never falls through, so it
	 * carries no meaning and is dropped. It cannot be kept: a target that prints the switch as a
	 * chain of conditionals — Python does — would read it as leaving the enclosing loop. A `break`
	 * anywhere else in a case would mean the same thing and cannot be expressed, so it is refused
	 * rather than mistranslated.
	 */
	private caseBody(body: readonly HStmt[]): readonly HStmt[] {
		const trimmed = body.length > 0 && body[body.length - 1]!.kind === "break" ? body.slice(0, -1) : body;
		for (const statement of trimmed) {
			if (escapesCase(statement)) {
				this.report(
					"E_SWITCH_BREAK",
					"a `break` inside a switch case cannot leave the switch early",
					statement.span,
					"restructure the case so it ends at its last statement, or use `if`/`else`",
				);
			}
		}
		return trimmed;
	}

	/* ---------------------------------------------------------------- *
	 * Loops: the interval fixpoint lives here
	 * ---------------------------------------------------------------- */

	private countedLoop(statement: Extract<HStmt, { kind: "forCounted" }>): CStmt[] {
		const from = this.expr(statement.from, tIntDefault());
		const to = this.expr(statement.to, tIntDefault());
		if (from.type.kind !== "Int" || to.type.kind !== "Int") {
			this.report("E_FOR_BOUNDS", "counted loops range over integers", statement.span);
			return [];
		}
		const adjust = statement.inclusive ? 0n : 1n;
		const counterType =
			statement.step > 0n
				? tInt(from.type.lo, to.type.hi - adjust < from.type.lo ? from.type.lo : to.type.hi - adjust)
				: tInt(to.type.lo + adjust > from.type.hi ? from.type.hi : to.type.lo + adjust, from.type.hi);
		const trips =
			statement.step > 0n
				? to.type.hi - adjust - from.type.lo + 1n
				: from.type.hi - (to.type.lo + adjust) + 1n;

		const body = this.loopFixpoint(trips, () => {
			this.scope.set(statement.name, {
				name: statement.name,
				declared: counterType,
				type: counterType,
				mutable: false,
				unwrapped: false,
			});
			return this.block(statement.body);
		});
		return [
			{
				kind: "forRange",
				name: statement.name,
				type: counterType,
				from,
				to,
				inclusive: statement.inclusive,
				step: statement.step,
				body,
				span: statement.span,
			},
		];
	}

	private forEachLoop(statement: Extract<HStmt, { kind: "forOf" }>): CStmt[] {
		const iterable = this.expr(statement.iterable);
		let elem: SemType;
		let trips: bigint;
		if (iterable.type.kind === "List") {
			elem = iterable.type.elem;
			trips = BigInt(iterable.type.max);
		} else if (iterable.type.kind === "String") {
			this.report(
				"E_ITERATE_STRING",
				"iterate the scalars explicitly",
				statement.span,
				"use `str.codePoints(value)`, which every target iterates the same way",
			);
			elem = tInt(0n, 0x10ffffn);
			trips = BigInt(iterable.type.max);
		} else {
			this.report("E_ITERABLE", `${typeToString(iterable.type)} is not iterable`, statement.span);
			return [];
		}

		const body = this.loopFixpoint(trips, () => {
			this.scope.set(statement.name, {
				name: statement.name,
				declared: elem,
				type: elem,
				mutable: false,
				unwrapped: false,
			});
			return this.block(statement.body);
		});
		return [
			{
				kind: "forEach",
				name: statement.name,
				type: elem,
				iterable,
				body,
				span: statement.span,
			},
		];
	}

	/**
	 * Re-checks a loop body until the mutable locals' types stop growing.
	 *
	 * With a proven trip count of at most `MAX_LOOP_ITERATIONS`, the fixpoint is exact: the range
	 * of an accumulator is the one it really has on the last iteration. Above that, ranges widen
	 * to the platform-safe domain and the loop is counted in the metrics, because a widened range
	 * usually means the source should carry a tighter annotation.
	 */
	private loopFixpoint(trips: bigint, check: () => CStmt[]): CStmt[] {
		const entry = this.snapshot();
		const bounded = trips <= BigInt(MAX_LOOP_ITERATIONS) && trips >= 0n;
		// The loop head sees the state after at most `trips - 1` completed bodies, so that many
		// merges are an exact fixpoint rather than an over-approximation.
		const iterations = bounded ? Math.max(0, Number(trips) - 1) : MAX_LOOP_ITERATIONS;
		const outerBreaks = this.breakStates;
		const outerContinues = this.continueStates;
		let converged = false;
		this.quiet = true;
		for (let iteration = 0; iteration < iterations; iteration++) {
			const before = this.snapshot();
			const body = this.runBody(check);
			this.restore(entry);
			// The next iteration starts from any of: the head it started at, the end of a body that
			// fell through, or a `continue`. A `break` is folded in as well, so that a range the
			// analysis reports is never narrower than one the loop can really hold.
			this.applyJoin([before, body.fellThrough, ...body.continued, ...body.broke]);
			if (sameSnapshot(before, this.snapshot())) {
				converged = true;
				break;
			}
		}
		if (!converged && trips > BigInt(MAX_LOOP_ITERATIONS)) {
			this.checker.metricTable.widenedLoops++;
			this.widenMutableIntegers();
		}
		this.quiet = false;

		const head = this.snapshot();
		const final = this.runBody(check);
		this.breakStates = outerBreaks;
		this.continueStates = outerContinues;
		this.restore(entry);
		// After the loop the state is any of: never entered it (the head, which covers the entry),
		// fell out of the last body, or left through a `break`.
		this.applyJoin([head, final.fellThrough, ...final.broke]);
		return final.statements;
	}

	/** Runs a loop body once, keeping the states its `break`s and `continue`s left with. */
	private runBody(check: () => CStmt[]): {
		statements: CStmt[];
		fellThrough: ScopeSnapshot;
		broke: ScopeSnapshot[];
		continued: ScopeSnapshot[];
	} {
		this.breakStates = [];
		this.continueStates = [];
		const statements = check();
		return {
			statements,
			fellThrough: this.snapshot(),
			broke: this.breakStates,
			continued: this.continueStates,
		};
	}

	private widenMutableIntegers(): void {
		for (const binding of this.scope.values()) {
			if (binding.mutable && binding.type.kind === "Int") {
				binding.type = tInt(
					binding.type.lo < 0n ? SAFE_INT_LO : 0n,
					binding.declared.kind === "Int" && binding.declared.hi < SAFE_INT_HI ? binding.declared.hi : SAFE_INT_HI,
				);
				binding.declared = binding.type;
				binding.widened = true;
			}
			if (binding.mutable && binding.type.kind === "List") {
				binding.type = tList(binding.type.elem, 0, MAX_COLLECTION_LENGTH);
				binding.declared = binding.type;
			}
			if (binding.mutable && binding.type.kind === "String") {
				binding.type = tString(binding.type.cls, 0, MAX_COLLECTION_LENGTH);
				binding.declared = binding.type;
			}
		}
	}

	private noteWideInteger(type: SemType, span: Span): void {
		if (type.kind === "Int" && (type.lo < SAFE_INT_LO || type.hi > SAFE_INT_HI) && !this.quiet) {
			this.checker.metricTable.wideIntegers.push(`${span.file}: ${typeToString(type)}`);
		}
	}

	private requireBool(expr: CExpr, span: Span): void {
		if (expr.type.kind !== "Bool") {
			this.report(
				"E_TRUTHINESS",
				`only Bool is a condition, got ${typeToString(expr.type)}`,
				span,
				"compare explicitly; there is no truthiness in the subset",
			);
		}
	}

	/* ---------------------------------------------------------------- *
	 * Expressions
	 * ---------------------------------------------------------------- */

	expr(node: HExpr, expected?: SemType): CExpr {
		switch (node.kind) {
			case "int":
				return { kind: "lit", value: node.value, type: tInt(node.value, node.value), span: node.span };
			case "float":
				return { kind: "lit", value: node.value, type: tFloat, span: node.span };
			case "bool":
				return { kind: "lit", value: node.value, type: tBool, span: node.span };
			case "string": {
				const target = expected?.kind === "Option" ? expected.inner : expected;
				if (target?.kind === "Enum") {
					if (!target.members.includes(node.value)) {
						this.report(
							"E_ENUM_MEMBER",
							`${JSON.stringify(node.value)} is not one of ${target.members.map((member) => JSON.stringify(member)).join(" | ")}`,
							node.span,
						);
					}
					return {
						kind: "lit",
						value: node.value,
						type: tEnum(target.name, [node.value]),
						span: node.span,
					};
				}
				return { kind: "lit", value: node.value, type: literalStringType(node.value), span: node.span };
			}
			case "undefined":
				return { kind: "none", type: tOption(expected?.kind === "Option" ? expected.inner : tNever), span: node.span };
			case "regex":
				this.report(
					"E_REGEX_VALUE",
					"a regex is not a run-time value",
					node.span,
					"bind it to a module level constant and pass it to `re.test`",
				);
				return { kind: "lit", value: node.source, type: tString("none"), span: node.span };
			case "name":
				return this.name(node.name, node.span);
			case "member":
				return this.member(node);
			case "index":
				return this.index(node);
			case "call":
				return this.call(node);
			case "binary": {
				if (node.op === "===" || node.op === "!==") return this.equality(node);
				const left = this.expr(node.left);
				const right = this.expr(node.right, left.type.kind === "Float" ? tFloat : undefined);
				return this.binaryOp(node.op, left, right, node.span);
			}
			case "logical":
				return this.logical(node);
			case "unary": {
				if (node.op === "!") {
					const operand = this.expr(node.operand, tBool);
					this.requireBool(operand, node.span);
					return { kind: "not", operand, type: tBool, span: node.span };
				}
				const operand = this.expr(node.operand, expected);
				return this.op(operand.type.kind === "Float" ? "float.neg" : "int.neg", [operand], node.span);
			}
			case "ternary": {
				const test = this.expr(node.test, tBool);
				this.requireBool(test, node.span);
				const { whenTrue, whenFalse } = deriveNarrowing(test);
				const entry = this.snapshot();
				this.applyNarrowing(whenTrue);
				const then = this.expr(node.then, expected);
				this.restore(entry);
				this.applyNarrowing(whenFalse);
				const otherwise = this.expr(node.otherwise, expected);
				this.restore(entry);
				return {
					kind: "cond",
					test,
					then,
					otherwise,
					type: join(then.type, otherwise.type),
					span: node.span,
				};
			}
			case "template": {
				let result: CExpr | undefined;
				for (const part of node.parts) {
					const piece =
						part.kind === "text"
							? ({ kind: "lit", value: part.value, type: literalStringType(part.value), span: node.span } as CExpr)
							: this.expr(part.expr, tString("none"));
					if (part.kind === "expr" && piece.type.kind !== "String" && piece.type.kind !== "Enum") {
						this.report(
							"E_INTERPOLATION",
							`only strings interpolate, got ${typeToString(piece.type)}`,
							node.span,
							"convert explicitly, for example with `str.fromInt`",
						);
					}
					result = result === undefined ? piece : this.op("str.concat", [result, piece], node.span);
				}
				return result ?? { kind: "lit", value: "", type: tString("ascii", 0, 0), span: node.span };
			}
			case "object":
				return this.recordLiteral(node, expected);
			case "array": {
				const elemHint = expected?.kind === "List" ? expected.elem : undefined;
				const items = node.items.map((item) => this.expr(item, elemHint));
				const elem =
					elemHint ?? items.map((item) => item.type).reduce((left, right) => join(left, right), tNever);
				return {
					kind: "list",
					items,
					type: tList(elem, items.length, items.length),
					span: node.span,
				};
			}
			case "lambda":
				return this.lambda(node, expected);
			case "new":
				this.report(
					"E_NEW",
					"`new` is only allowed in `throw new SomeError(...)`",
					node.span,
					"records are built with object literals",
				);
				return { kind: "lit", value: 0n, type: tNever, span: node.span };
			default: {
				const exhaustive: never = node;
				return exhaustive;
			}
		}
	}

	private name(name: string, span: Span): CExpr {
		const binding = this.scope.get(name);
		if (binding !== undefined) {
			const local: CExpr = { kind: "local", name, type: binding.declared, span };
			if (binding.unwrapped) {
				return { kind: "op", op: "opt.unwrap", args: [local], type: binding.type, span };
			}
			return { kind: "local", name, type: binding.type, span };
		}
		const qualified = this.checker.scopeOf(this.module).get(name);
		const constant = qualified === undefined ? undefined : this.checker.constTable.get(qualified);
		if (constant !== undefined) {
			// Constants are comptime values, so they are baked into the Core where they are used.
			return { kind: "lit", value: constant.value, type: constant.type, span };
		}
		this.report("E_UNKNOWN_NAME", `unknown name \`${name}\``, span);
		return { kind: "lit", value: 0n, type: tNever, span };
	}

	private member(node: Extract<HExpr, { kind: "member" }>): CExpr {
		if (node.target.kind === "name" && INTRINSIC_MODULES.has(node.target.name) && this.scope.get(node.target.name) === undefined) {
			this.report(
				"E_INTRINSIC_REF",
				`\`${node.target.name}.${node.name}\` may only be called`,
				node.span,
			);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		const target = this.expr(node.target);
		if (node.name === "length") {
			if (target.type.kind === "String") return this.op("str.len", [target], node.span);
			if (target.type.kind === "List") return this.op("seq.len", [target], node.span);
		}
		if (target.type.kind === "Record") {
			const record = this.checker.recordTable.get(target.type.name);
			const field = record?.fields.find((item) => item.name === node.name);
			if (field === undefined) {
				this.report(
					"E_UNKNOWN_FIELD",
					`\`${target.type.name}\` has no field \`${node.name}\``,
					node.span,
				);
				return { kind: "lit", value: 0n, type: tNever, span: node.span };
			}
			return {
				kind: "field",
				target,
				name: node.name,
				type: field.optional && field.type.kind !== "Option" ? tOption(field.type) : field.type,
				span: node.span,
			};
		}
		if (target.type.kind === "Option") {
			this.report(
				"E_OPTION_ACCESS",
				`\`${typeToString(target.type)}\` may be absent`,
				node.span,
				"narrow it first with `x === undefined`, or supply a default with `??`",
			);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		this.report("E_MEMBER", `${typeToString(target.type)} has no member \`${node.name}\``, node.span, METHOD_HELP[node.name]);
		return { kind: "lit", value: 0n, type: tNever, span: node.span };
	}

	private index(node: Extract<HExpr, { kind: "index" }>): CExpr {
		const target = this.expr(node.target);
		const index = this.expr(node.index, tIntDefault());
		if (target.type.kind === "String") {
			return this.op("str.charAt", [target, index], node.span);
		}
		return this.op("seq.get", [target, index], node.span);
	}

	private recordLiteral(node: Extract<HExpr, { kind: "object" }>, expected?: SemType): CExpr {
		const target = expected?.kind === "Option" ? expected.inner : expected;
		if (target?.kind !== "Record") {
			this.report(
				"E_RECORD_TARGET",
				"a record literal needs a declared record type here",
				node.span,
				"annotate the binding, the parameter or the return type",
			);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		const definition = this.checker.recordTable.get(target.name);
		if (definition === undefined) {
			this.report("E_UNKNOWN_TYPE", `unknown record \`${target.name}\``, node.span);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		const fields: { name: string; value: CExpr }[] = [];
		for (const field of definition.fields) {
			const provided = node.fields.find((item) => item.name === field.name);
			const fieldType = field.optional && field.type.kind !== "Option" ? tOption(field.type) : field.type;
			if (provided === undefined) {
				if (!field.optional) {
					this.report("E_MISSING_FIELD", `missing field \`${field.name}\``, node.span);
					continue;
				}
				fields.push({
					name: field.name,
					value: { kind: "none", type: fieldType, span: node.span },
				});
				continue;
			}
			const value = this.expr(provided.value, fieldType);
			const coerced =
				fieldType.kind === "Option" && value.type.kind !== "Option"
					? ({ kind: "some", inner: value, type: tOption(value.type), span: value.span } as CExpr)
					: value;
			if (!isSubtype(coerced.type, fieldType)) {
				this.report(
					"E_TYPE",
					`field \`${field.name}\`: cannot assign ${typeToString(coerced.type)} to ${typeToString(fieldType)}`,
					provided.span,
				);
			}
			fields.push({ name: field.name, value: coerced });
		}
		for (const provided of node.fields) {
			if (!definition.fields.some((field) => field.name === provided.name)) {
				this.report(
					"E_UNKNOWN_FIELD",
					`\`${target.name}\` has no field \`${provided.name}\``,
					provided.span,
				);
			}
		}
		return { kind: "record", typeName: target.name, fields, type: target, span: node.span };
	}

	private lambda(node: Extract<HExpr, { kind: "lambda" }>, expected?: SemType): CExpr {
		const params = node.params.map((param, index) => {
			const declared =
				param.type === undefined ? undefined : this.checker.resolveType(param.type, param.name);
			const hint = expected?.kind === "Lambda" ? expected.params[index] : undefined;
			const type = declared ?? hint;
			if (type === undefined) {
				this.report("E_LAMBDA_PARAM", `cannot infer the type of \`${param.name}\``, param.span);
			}
			return { name: param.name, type: type ?? tNever };
		});

		const inner = new Map<string, Binding>();
		for (const [name, binding] of this.scope) {
			// Closures capture values, never mutable slots: a captured local is immutable inside.
			inner.set(name, { ...binding, mutable: false });
		}
		for (const param of params) {
			inner.set(param.name, {
				name: param.name,
				declared: param.type,
				type: param.type,
				mutable: false,
				unwrapped: false,
			});
		}
		const expectedReturn = expected?.kind === "Lambda" ? expected.ret : tNever;
		const sub = new FunctionChecker(this.checker, this.module, expectedReturn, inner);
		sub.quiet = this.quiet;
		const body = sub.block(node.body);
		this.addEffects(sub.effects);
		const returnType = returnTypeOf(body);
		return {
			kind: "lambda",
			params,
			body,
			type: tLambda(
				params.map((param) => param.type),
				returnType,
			),
			span: node.span,
		};
	}

	private logical(node: Extract<HExpr, { kind: "logical" }>): CExpr {
		if (node.op === "??") {
			const left = this.expr(node.left);
			if (left.type.kind !== "Option") {
				this.report(
					"E_COALESCE",
					`\`??\` applies to an Option, got ${typeToString(left.type)}`,
					node.span,
				);
				return left;
			}
			const right = this.expr(node.right, left.type.inner);
			return this.op("opt.orElse", [left, right], node.span);
		}
		const left = this.expr(node.left, tBool);
		this.requireBool(left, node.span);
		const { whenTrue, whenFalse } = deriveNarrowing(left);
		const entry = this.snapshot();
		this.applyNarrowing(node.op === "&&" ? whenTrue : whenFalse);
		const right = this.expr(node.right, tBool);
		this.requireBool(right, node.span);
		this.restore(entry);
		return node.op === "&&"
			? { kind: "and", left, right, type: tBool, span: node.span }
			: { kind: "or", left, right, type: tBool, span: node.span };
	}

	private equality(node: Extract<HExpr, { kind: "binary" }>): CExpr {
		const negated = node.op === "!==";
		const leftIsUndefined = node.left.kind === "undefined";
		const rightIsUndefined = node.right.kind === "undefined";
		if (leftIsUndefined || rightIsUndefined) {
			const value = this.expr(leftIsUndefined ? node.right : node.left);
			if (value.type.kind !== "Option") {
				this.report(
					"E_UNDEFINED_COMPARE",
					`${typeToString(value.type)} is never undefined`,
					node.span,
					"only an Option is compared with undefined",
				);
			}
			const test = this.op("opt.isNone", [value], node.span);
			return negated ? { kind: "not", operand: test, type: tBool, span: node.span } : test;
		}
		const left = this.expr(node.left);
		const right = this.expr(node.right, left.type);
		const test = this.op("core.eq", [left, right], node.span);
		return negated ? { kind: "not", operand: test, type: tBool, span: node.span } : test;
	}

	binaryOp(op: string, left: CExpr, right: CExpr, span: Span, negate = false): CExpr {
		const kind = left.type.kind;
		const table: Record<string, string> = {
			"+": "add",
			"-": "sub",
			"*": "mul",
			"/": "div",
			"%": "mod",
			"<": "lt",
			"<=": "le",
			">": "gt",
			">=": "ge",
		};
		const name = table[op];
		if (name === undefined) {
			this.report("E_OPERATOR", `unsupported operator \`${op}\``, span);
			return left;
		}
		if (kind === "String") {
			if (op === "+") return this.op("str.concat", [left, right], span);
			this.report(
				"E_STRING_OPERATOR",
				`\`${op}\` on strings is outside the subset`,
				span,
				"use `str.compare`, whose order is the same in every target",
			);
			return left;
		}
		if (kind === "Decimal") {
			this.report(
				"E_DECIMAL_OPERATOR",
				`\`${op}\` on Decimal is outside the subset`,
				span,
				"use `dec.add`, `dec.sub`, `dec.mul` or `dec.divRound`, which name their scale and rounding",
			);
			return left;
		}
		if (kind === "CivilDate") {
			this.report(
				"E_DATE_OPERATOR",
				`\`${op}\` on CivilDate is outside the subset`,
				span,
				"use `date.compare`, `date.addDays` or `date.diffDays`",
			);
			return left;
		}
		if (kind === "Float" && op === "%") {
			this.report("E_FLOAT_MOD", "`%` on floats is outside the subset", span);
			return left;
		}
		const prefix = kind === "Float" ? "float" : "int";
		const result = this.op(`${prefix}.${name}`, [left, right], span);
		return negate ? { kind: "not", operand: result, type: tBool, span } : result;
	}

	private call(node: Extract<HExpr, { kind: "call" }>): CExpr {
		const callee = node.callee;

		// Intrinsic module call: `str.codeAt(value, index)`.
		if (
			callee.kind === "member" &&
			callee.target.kind === "name" &&
			INTRINSIC_MODULES.has(callee.target.name) &&
			this.scope.get(callee.target.name) === undefined
		) {
			return this.intrinsicCall(`${callee.target.name}.${callee.name}`, node.args, node.span);
		}

		// Method sugar on a value: `value.slice(0, 9)`, `list.map(f)`.
		if (callee.kind === "member") {
			return this.methodCall(callee, node.args, node.span);
		}

		if (callee.kind !== "name") {
			this.report("E_CALLEE", "only named functions and intrinsics may be called", node.span);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}

		const qualified = this.checker.scopeOf(this.module).get(callee.name);
		const signature = qualified === undefined ? undefined : this.checker.signatureOf(qualified);
		if (signature === undefined || qualified === undefined) {
			this.report("E_UNKNOWN_FUNCTION", `unknown function \`${callee.name}\``, node.span);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		if (node.args.length !== signature.params.length) {
			this.report(
				"E_ARITY",
				`\`${callee.name}\` takes ${signature.params.length} argument(s), got ${node.args.length}`,
				node.span,
			);
		}
		const args = signature.params.map((param, index) => {
			const argument = node.args[index];
			if (argument === undefined) return { kind: "lit", value: 0n, type: tNever, span: node.span } as CExpr;
			const checked = this.expr(argument, param.type);
			const coerced =
				param.type.kind === "Option" && checked.type.kind !== "Option" && checked.type.kind !== "Never"
					? ({ kind: "some", inner: checked, type: tOption(checked.type), span: checked.span } as CExpr)
					: checked;
			if (!isSubtype(coerced.type, param.type) && !fitsPlatformDomain(coerced.type, param.type)) {
				this.report(
					"E_ARGUMENT",
					`\`${callee.name}\`: argument \`${param.name}\` expects ${typeToString(param.type)}, got ${typeToString(coerced.type)}`,
					argument.span,
				);
			}
			return coerced;
		});
		const instance = this.checker.instantiate(qualified, args.map((arg) => arg.type));
		if (instance === undefined) {
			this.report("E_UNKNOWN_FUNCTION", `unknown function \`${callee.name}\``, node.span);
			return { kind: "lit", value: 0n, type: tNever, span: node.span };
		}
		this.addEffects(instance.effects);
		return { kind: "call", fn: instance.name, args, type: instance.ret, span: node.span };
	}

	private methodCall(
		callee: Extract<HExpr, { kind: "member" }>,
		args: readonly HExpr[],
		span: Span,
	): CExpr {
		const target = this.expr(callee.target);
		const method = callee.name;
		if (target.type.kind === "String") {
			const intrinsic = STRING_METHODS[method];
			if (intrinsic === undefined) {
				this.report("E_METHOD", `\`${method}\` is outside the subset`, span, METHOD_HELP[method]);
				return { kind: "lit", value: 0n, type: tNever, span };
			}
			return this.intrinsicCallWith(
				intrinsic,
				[target, ...args.map((arg) => (expected?: SemType) => this.expr(arg, expected))],
				span,
			);
		}
		if (target.type.kind === "List") {
			if (method === "reduce") {
				// `xs.reduce(f, init)` is `seq.fold(xs, init, f)`: the Core names the initial value first.
				const initial = this.expr(args[1]!);
				const fn = this.expr(args[0]!, tLambda([initial.type, target.type.elem], initial.type));
				return this.op("seq.fold", [target, initial, fn], span);
			}
			const intrinsic = LIST_METHODS[method];
			if (intrinsic === undefined) {
				this.report("E_METHOD", `\`${method}\` is outside the subset`, span, METHOD_HELP[method]);
				return { kind: "lit", value: 0n, type: tNever, span };
			}
			return this.intrinsicCallWith(
				intrinsic,
				[target, ...args.map((arg) => (expected?: SemType) => this.expr(arg, expected))],
				span,
			);
		}
		this.report("E_METHOD", `${typeToString(target.type)} has no method \`${method}\``, span, METHOD_HELP[method]);
		return { kind: "lit", value: 0n, type: tNever, span };
	}

	private intrinsicCall(name: string, args: readonly HExpr[], span: Span): CExpr {
		if (name === "re.retain") {
			const pattern = args[0];
			const regex = pattern === undefined ? undefined : this.regexOf(pattern);
			const singleClass = regex === undefined ? undefined : singleClassOf(regex);
			if (regex === undefined || singleClass === undefined) {
				this.report(
					"E_RETAIN_PATTERN",
					"`re.retain` needs a constant bound to a regex that is exactly one character class",
					span,
					"declare `const DIGIT = /^[0-9]$/;` and pass it",
				);
				return { kind: "lit", value: "", type: tNever, span };
			}
			const subject = this.expr(args[1]!);
			const result = this.op("re.retain", [subject], span);
			const subjectLength = subject.type.kind === "String" ? subject.type.max : MAX_COLLECTION_LENGTH;
			return {
				...result,
				regex,
				type: tString(singleClass, 0, subjectLength),
			} as CExpr;
		}
		if (name === "re.test") {
			const pattern = args[0];
			const regex = pattern === undefined ? undefined : this.regexOf(pattern);
			if (regex === undefined) {
				this.report(
					"E_REGEX_ARGUMENT",
					"`re.test` needs a regex literal or a constant bound to one",
					span,
					"declare `const PATTERN = /…/;` at module level",
				);
				return { kind: "lit", value: false, type: tBool, span };
			}
			const subject = this.expr(args[1]!);
			const result = this.op("re.test", [subject], span);
			return { ...result, regex } as CExpr;
		}
		return this.intrinsicCallWith(
			name,
			args.map((arg) => (expected?: SemType) => this.expr(arg, expected)),
			span,
		);
	}

	/**
	 * Checks an intrinsic call left to right, so a combinator can hand the element type to the
	 * lambda that follows it.
	 */
	private intrinsicCallWith(
		name: string,
		args: readonly (CExpr | ((expected?: SemType) => CExpr))[],
		span: Span,
	): CExpr {
		const definition = lookupIntrinsic(name);
		if (definition === undefined) {
			this.report("E_UNKNOWN_INTRINSIC", `unknown intrinsic \`${name}\``, span);
			return { kind: "lit", value: 0n, type: tNever, span };
		}
		const checked: CExpr[] = [];
		for (const [index, argument] of args.entries()) {
			if (typeof argument !== "function") {
				checked.push(argument);
				continue;
			}
			const prior = checked.map((item) => item.type);
			const lambdaHint =
				definition.lambdaParams === undefined
					? undefined
					: safely(() => definition.lambdaParams!(prior, index));
			const hint =
				lambdaHint === undefined
					? definition.paramHint?.(index, prior)
					: tLambda(lambdaHint, tNever);
			checked.push(argument(hint));
		}
		if (name === "task.race") {
			this.checkRaceTasks(checked, span);
		}
		this.addEffects(definition.effects);
		return this.op(name, checked, span);
	}

	/** Builds an op node, turning a signature failure into a span-aware diagnostic. */
	op(name: string, args: readonly CExpr[], span: Span): CExpr {
		const definition = lookupIntrinsic(name);
		if (definition === undefined) {
			this.report("E_UNKNOWN_INTRINSIC", `unknown intrinsic \`${name}\``, span);
			return { kind: "lit", value: 0n, type: tNever, span };
		}
		try {
			const type = definition.signature(args.map((arg) => arg.type));
			this.addEffects(definition.effects);
			this.noteWideInteger(type, span);
			return { kind: "op", op: name, args, type, span };
		} catch (error) {
			if (error instanceof SignatureError) {
				this.report("E_SIGNATURE", error.message, span, error.suggestion);
				return { kind: "lit", value: 0n, type: tNever, span };
			}
			throw error;
		}
	}

	/**
	 * A race discards the losers, so only idempotent work belongs inside one: a task may read
	 * (an Http GET) and may wait, but it may not consume randomness or send anything.
	 */
	private checkRaceTasks(args: readonly CExpr[], span: Span): void {
		const list = args[0];
		if (list === undefined || list.kind !== "list") return;
		for (const task of list.items) {
			if (task.kind !== "lambda") continue;
			// A task usually delegates to a function, so the walk follows calls: the rule is about
			// what the task *does*, not about where it is written.
			for (const op of this.reachableOperations(task.body)) {
				if (op.op === "random.nextU32") {
					this.report(
						"E_RACE_EFFECT",
						"a task inside `task.race` may not use Random: a losing task's draw would be discarded",
						op.span,
						"draw before the race and pass the value in",
					);
				}
				if (op.op !== "http.request") continue;
				const request = op.args[0];
				const method =
					request?.kind === "record"
						? request.fields.find((field) => field.name === "method")?.value
						: undefined;
				if (method?.kind === "lit" && method.value !== "GET") {
					this.report(
						"E_RACE_EFFECT",
						`a task inside \`task.race\` may only perform an idempotent request, not ${String(method.value)}`,
						op.span,
						"race the reads, and perform the write once the winner is known",
					);
				}
			}
		}
	}

	/** Every operation a body performs, following calls into the functions it reaches. */
	private reachableOperations(body: readonly CStmt[]): Extract<CExpr, { kind: "op" }>[] {
		const seen = new Set<string>();
		const collect = (statements: readonly CStmt[]): Extract<CExpr, { kind: "op" }>[] => {
			const operations = operationsOf(statements);
			for (const callee of callsOf(statements)) {
				if (seen.has(callee)) continue;
				seen.add(callee);
				const calleeBody = this.checker.bodyOf(callee);
				if (calleeBody !== undefined) operations.push(...collect(calleeBody));
			}
			return operations;
		};
		return collect(body);
	}

	private regexOf(node: HExpr): NormalizedRegex | undefined {
		if (node.kind === "regex") {
			try {
				return normalizeRegex(node.source, node.span);
			} catch (error) {
				this.report("E_REGEX", error instanceof RegexError ? error.message : String(error), node.span);
				return undefined;
			}
		}
		if (node.kind === "name") {
			const qualified = this.checker.scopeOf(this.module).get(node.name);
			const constant = qualified === undefined ? undefined : this.checker.constTable.get(qualified);
			return constant?.regex;
		}
		return undefined;
	}
}

/* ==================================================================== *
 * Helpers
 * ==================================================================== */

function safely<T>(compute: () => T): T | undefined {
	try {
		return compute();
	} catch {
		return undefined;
	}
}

function literalStringType(value: string): SemType {
	const points = [...value].map((scalar) => scalar.codePointAt(0)!);
	const cls =
		points.length > 0 && points.every((point) => point >= 0x30 && point <= 0x39)
			? "digits"
			: points.every((point) => point < 0x80)
				? "ascii"
				: "none";
	return tString(cls, points.length, points.length);
}

function returnTypeOf(body: readonly CStmt[]): SemType {
	let result: SemType = tNever;
	const visit = (statements: readonly CStmt[]): void => {
		for (const statement of statements) {
			switch (statement.kind) {
				case "return":
					result = join(result, statement.value?.type ?? tVoid);
					break;
				case "if":
					visit(statement.then);
					visit(statement.otherwise);
					break;
				case "switch":
					for (const entry of statement.cases) visit(entry.body);
					if (statement.otherwise !== undefined) visit(statement.otherwise);
					break;
				case "forRange":
				case "forEach":
					visit(statement.body);
					break;
				default:
					break;
			}
		}
	};
	visit(body);
	return result;
}

function exitsScope(body: readonly CStmt[]): boolean {
	return body.some(
		(statement) =>
			statement.kind === "return" ||
			statement.kind === "fail" ||
			statement.kind === "break" ||
			statement.kind === "continue",
	);
}

/**
 * Whether a value fits a declared integer type once the platform domain is taken into account.
 *
 * A value that walks a collection can exceed the platform domain only by a bounded step, because
 * every loop's trip count is bounded by MAX_COLLECTION_LENGTH; the same reasoning that lets a
 * widened loop counter be clamped lets such a value be passed and returned.
 */
export function fitsPlatformDomain(actual: SemType, declared: SemType): boolean {
	if (actual.kind !== "Int" || declared.kind !== "Int") return false;
	if (declared.hi < SAFE_INT_HI - MAX_WIDENED_STEP) return false;
	const step = stepSize(declared, actual);
	return step !== undefined && step <= MAX_WIDENED_STEP;
}

/** How far one assignment moves a binding's range, when both are integers. */
function stepSize(declared: SemType, assigned: SemType): bigint | undefined {
	if (declared.kind !== "Int" || assigned.kind !== "Int") return undefined;
	const low = declared.lo - assigned.lo;
	const high = assigned.hi - declared.hi;
	const step = (low > high ? low : high);
	return step < 0n ? 0n : step;
}

function widenAssignment(declared: SemType): SemType {
	// An accumulator keeps its declared shape; only its refinements move, and the loop fixpoint
	// is what proves where they land.
	return declared;
}

function sameSnapshot(left: ScopeSnapshot, right: ScopeSnapshot): boolean {
	if (left.size !== right.size) return false;
	for (const [name, state] of left) {
		const other = right.get(name);
		if (other === undefined) return false;
		if (typeToString(state.type) !== typeToString(other.type)) return false;
		if (state.unwrapped !== other.unwrapped) return false;
	}
	return true;
}

/* ---------------------------------------------------------------- *
 * Flow-sensitive narrowing
 * ---------------------------------------------------------------- */

function mergeNarrowings(left: Narrowing, right: Narrowing): Narrowing {
	const merged: Narrowing = new Map(left);
	for (const [name, type] of right) {
		const existing = merged.get(name);
		merged.set(name, existing === undefined ? type : intersectTypes(existing, type));
	}
	return merged;
}

/** Keeps only the facts both sides establish, widened to cover either. */
function hullNarrowings(left: Narrowing, right: Narrowing): Narrowing {
	const merged: Narrowing = new Map();
	for (const [name, type] of left) {
		const other = right.get(name);
		if (other !== undefined) merged.set(name, join(type, other));
	}
	return merged;
}

function intersectTypes(left: SemType, right: SemType): SemType {
	if (left.kind === "String" && right.kind === "String") {
		return tString(
			left.cls === "digits" || right.cls === "digits" ? "digits" : left.cls === "ascii" || right.cls === "ascii" ? "ascii" : "none",
			Math.max(left.min, right.min),
			Math.min(left.max, right.max),
			left.pattern ?? right.pattern,
		);
	}
	if (left.kind === "Int" && right.kind === "Int") {
		return tInt(left.lo > right.lo ? left.lo : right.lo, left.hi < right.hi ? left.hi : right.hi);
	}
	if (left.kind === "List" && right.kind === "List") {
		return tList(left.elem, Math.max(left.min, right.min), Math.min(left.max, right.max));
	}
	return right;
}

/** The facts a condition establishes on each side of a branch. */
export function deriveNarrowing(test: CExpr): { whenTrue: Narrowing; whenFalse: Narrowing } {
	const empty = { whenTrue: new Map(), whenFalse: new Map() } as {
		whenTrue: Narrowing;
		whenFalse: Narrowing;
	};
	switch (test.kind) {
		case "not": {
			const inner = deriveNarrowing(test.operand);
			return { whenTrue: inner.whenFalse, whenFalse: inner.whenTrue };
		}
		case "and": {
			const left = deriveNarrowing(test.left);
			const right = deriveNarrowing(test.right);
			return { whenTrue: mergeNarrowings(left.whenTrue, right.whenTrue), whenFalse: new Map() };
		}
		case "or": {
			const left = deriveNarrowing(test.left);
			const right = deriveNarrowing(test.right);
			// When either side may be the one that held, the fact is the hull of the two: an
			// interval domain can say "one of these two ranges" only as the range that covers both.
			return {
				whenTrue: hullNarrowings(left.whenTrue, right.whenTrue),
				whenFalse: mergeNarrowings(left.whenFalse, right.whenFalse),
			};
		}
		case "op":
			return narrowFromOp(test) ?? empty;
		default:
			return empty;
	}
}

/**
 * The local an expression names, looking through the unwrap the checker inserts once an Option
 * has been proven present. Narrowing a value does not stop being possible because it came out of
 * an Option.
 */
function localOf(expr: CExpr): Extract<CExpr, { kind: "local" }> | undefined {
	if (expr.kind === "local") return expr;
	if (expr.kind === "op" && expr.op === "opt.unwrap") return localOf(expr.args[0]!);
	return undefined;
}

function narrowFromOp(test: Extract<CExpr, { kind: "op" }>): { whenTrue: Narrowing; whenFalse: Narrowing } | undefined {
	const whenTrue: Narrowing = new Map();
	const whenFalse: Narrowing = new Map();

	if (test.op === "re.test" && test.regex !== undefined) {
		const subject = localOf(test.args[0]!);
		if (subject === undefined) return undefined;
		const regex = test.regex;
		whenTrue.set(
			subject.name,
			tString(
				regex.digitsOnly ? "digits" : regex.asciiOnly ? "ascii" : "none",
				regex.minLength,
				regex.maxLength,
				regex.source,
			),
		);
		return { whenTrue, whenFalse };
	}

	if (test.op === "opt.isNone") {
		const subject = test.args[0]!;
		if (subject.kind === "local" && subject.type.kind === "Option") {
			whenFalse.set(subject.name, subject.type.inner);
		}
		return { whenTrue, whenFalse };
	}

	if (test.op === "core.eq") {
		const [left, right] = test.args;
		if (left === undefined || right === undefined) return undefined;
		// `value === "v2"` narrows an enum to the matched member.
		if (left.kind === "local" && left.type.kind === "Enum" && right.kind === "lit") {
			whenTrue.set(left.name, tEnum(left.type.name, [String(right.value)]));
			if (left.type.members.length === 2) {
				whenFalse.set(
					left.name,
					tEnum(
						left.type.name,
						left.type.members.filter((member) => member !== String(right.value)),
					),
				);
			}
			return { whenTrue, whenFalse };
		}
		return narrowLength(left, right, "eq", whenTrue, whenFalse);
	}

	if (["int.lt", "int.le", "int.gt", "int.ge"].includes(test.op)) {
		const [left, right] = test.args;
		if (left === undefined || right === undefined) return undefined;
		return narrowLength(left, right, test.op.slice(4) as "lt" | "le" | "gt" | "ge", whenTrue, whenFalse);
	}

	return undefined;
}

/** Narrows either an integer local or the length of the string/list a `length` call names. */
function narrowLength(
	left: CExpr,
	right: CExpr,
	comparison: "eq" | "lt" | "le" | "gt" | "ge",
	whenTrue: Narrowing,
	whenFalse: Narrowing,
): { whenTrue: Narrowing; whenFalse: Narrowing } | undefined {
	if (right.type.kind !== "Int" || right.type.lo !== right.type.hi) return { whenTrue, whenFalse };
	const bound = right.type.lo;

	/**
	 * `x !== k` only narrows when `k` sits at an end of the current range: the remainder is then
	 * still an interval, which is what an interval domain can represent.
	 */
	const excludeEndpoint = (lo: bigint, hi: bigint): { lo: bigint; hi: bigint } => ({
		lo: lo === bound ? bound + 1n : lo,
		hi: hi === bound ? bound - 1n : hi,
	});

	const trueRange = (): { lo: bigint; hi: bigint } => {
		switch (comparison) {
			case "eq":
				return { lo: bound, hi: bound };
			case "lt":
				return { lo: -(10n ** 30n), hi: bound - 1n };
			case "le":
				return { lo: -(10n ** 30n), hi: bound };
			case "gt":
				return { lo: bound + 1n, hi: 10n ** 30n };
			case "ge":
				return { lo: bound, hi: 10n ** 30n };
			default: {
				const exhaustive: never = comparison;
				return exhaustive;
			}
		}
	};
	const falseRange = (): { lo: bigint; hi: bigint } => {
		switch (comparison) {
			case "eq":
				return { lo: -(10n ** 30n), hi: 10n ** 30n };
			case "lt":
				return { lo: bound, hi: 10n ** 30n };
			case "le":
				return { lo: bound + 1n, hi: 10n ** 30n };
			case "gt":
				return { lo: -(10n ** 30n), hi: bound };
			case "ge":
				return { lo: -(10n ** 30n), hi: bound - 1n };
			default: {
				const exhaustive: never = comparison;
				return exhaustive;
			}
		}
	};

	const leftLocal = localOf(left);
	if (leftLocal !== undefined && left.type.kind === "Int") {
		const current = left.type;
		const positive = trueRange();
		const negative = comparison === "eq" ? excludeEndpoint(current.lo, current.hi) : falseRange();
		whenTrue.set(
			leftLocal.name,
			tInt(
				current.lo > positive.lo ? current.lo : positive.lo,
				current.hi < positive.hi ? current.hi : positive.hi,
			),
		);
		whenFalse.set(
			leftLocal.name,
			tInt(
				current.lo > negative.lo ? current.lo : negative.lo,
				current.hi < negative.hi ? current.hi : negative.hi,
			),
		);
		return { whenTrue, whenFalse };
	}

	if (left.kind === "op" && (left.op === "str.len" || left.op === "seq.len")) {
		const subject = localOf(left.args[0]!);
		if (subject === undefined) return { whenTrue, whenFalse };
		const positive = trueRange();
		const subjectLengths = left.args[0]!.type;
		const lengths =
			subjectLengths.kind === "String" || subjectLengths.kind === "List"
				? { lo: BigInt(subjectLengths.min), hi: BigInt(subjectLengths.max) }
				: { lo: 0n, hi: 0n };
		const negative = comparison === "eq" ? excludeEndpoint(lengths.lo, lengths.hi) : falseRange();
		const clampLow = (value: bigint): number => Number(value < 0n ? 0n : value);
		const clampHigh = (value: bigint): number =>
			Number(value > BigInt(MAX_COLLECTION_LENGTH) ? BigInt(MAX_COLLECTION_LENGTH) : value);
		const subjectType = left.args[0]!.type;
		if (subjectType.kind === "String") {
			const current = subjectType;
			whenTrue.set(
				subject.name,
				tString(
					current.cls,
					Math.max(current.min, clampLow(positive.lo)),
					Math.min(current.max, clampHigh(positive.hi)),
					current.pattern,
				),
			);
			whenFalse.set(
				subject.name,
				tString(
					current.cls,
					Math.max(current.min, clampLow(negative.lo)),
					Math.min(current.max, clampHigh(negative.hi)),
					current.pattern,
				),
			);
		} else if (subjectType.kind === "List") {
			const current = subjectType;
			whenTrue.set(
				subject.name,
				tList(current.elem, Math.max(current.min, clampLow(positive.lo)), Math.min(current.max, clampHigh(positive.hi))),
			);
			whenFalse.set(
				subject.name,
				tList(current.elem, Math.max(current.min, clampLow(negative.lo)), Math.min(current.max, clampHigh(negative.hi))),
			);
		}
		return { whenTrue, whenFalse };
	}

	return { whenTrue, whenFalse };
}
