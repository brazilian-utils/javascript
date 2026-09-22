/**
 * Core to Target AST.
 *
 * This is the one place that knows how a semantic operation becomes target structure; what each
 * operation looks like is decided by the target's capability table (lowering selection), and how
 * it is printed is decided by the target's printer. The passes a target needs — hoisting
 * expressions into statements, turning combinators into loops, turning `Fail` into a second
 * return value, colouring async — are parameterized here rather than duplicated per backend.
 */

import { dependencyClosure } from "../analysis/capabilities.ts";
import type { BorrowMap } from "../analysis/borrows.ts";
import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import type { NormalizedRegex } from "../regex.ts";
import type { SemType } from "../types.ts";
import { tBool, tString } from "../types.ts";
import { BUILTIN_RECORDS } from "../intrinsics/index.ts";
import { LoweringTable } from "./select.ts";
import type { EmitContext } from "./select.ts";
import { mapExprs } from "./tast.ts";
import type { TExpr, TFunc, TModule, TParam, TRecord, TStmt } from "./tast.ts";

export type TargetSpec = {
	readonly name: string;
	readonly table: LoweringTable;
	/** Identifier style for functions, parameters, locals and record fields. */
	readonly naming: {
		readonly func: (localName: string, exported: boolean) => string;
		readonly value: (name: string) => string;
		readonly field: (name: string, exported: boolean) => string;
		readonly type: (name: string) => string;
		readonly module: (path: string) => string;
	};
	/** Operations this target prefers to print as a statement-level loop rather than a call. */
	readonly loopCombinators: ReadonlySet<string>;
	/** True when a fallible function returns `(value, error)` instead of raising. */
	readonly errorsAsValues: boolean;
	/** True when functions that reach Http become async and their calls are awaited. */
	readonly asyncColouring: boolean;
	/** True when the target has no conditional expression, so `cond` is hoisted into statements. */
	readonly statementTernary: boolean;
	/** Extra modules the generated file must import for a given capability. */
	readonly envType: SemType;
};

export type LowerOptions = {
	/** Emit the plain combinator-to-loop form instead of target idioms. */
	readonly noIdioms?: boolean;
	/**
	 * Which String/List parameters may be printed as borrows rather than owned values (the Rust
	 * backend's own pre-pass — see `analysis/borrows.ts`). The lowerer only consults this map, on
	 * `TParam.borrowed` and on a "call" node's `borrowedArgs`; it never decides borrowing itself.
	 * Absent for every target that has no such distinction, which is every target but Rust.
	 */
	readonly borrows?: BorrowMap;
};

export type LoweredProgram = {
	readonly modules: readonly TModule[];
	readonly table: LoweringTable;
	readonly functionNames: ReadonlyMap<string, string>;
	/** Core functions each generated module calls through a portable lowering, so imports are complete. */
	readonly moduleNeeds: ReadonlyMap<string, ReadonlySet<string>>;
	/** Engine-defined record types each module uses, which live in the target's support file. */
	readonly moduleBuiltins: ReadonlyMap<string, ReadonlySet<string>>;
};

const ENV_PARAM = "env";

const BUILTIN_RECORD_NAMES: readonly string[] = BUILTIN_RECORDS.map((record) => record.name);

export function lowerProgram(
	program: CProgram,
	spec: TargetSpec,
	options: LowerOptions = {},
): LoweredProgram {
	return new Lowerer(program, spec, options).run();
}

class Lowerer {
	private readonly program: CProgram;
	private readonly spec: TargetSpec;
	private readonly options: LowerOptions;
	private readonly names = new Map<string, string>();
	private readonly imports = new Map<string, Set<string>>();
	private readonly needed = new Set<string>();
	private readonly moduleNeeds = new Map<string, Set<string>>();
	private readonly moduleBuiltins = new Map<string, Set<string>>();
	private pending: TStmt[] = [];
	private constants: { name: string; type: SemType; value: TExpr }[] = [];
	private readonly constantNames = new Map<string, string>();
	private temporaries = 0;
	private currentModule = "";
	private currentFails: readonly string[] = [];
	private currentReturn: SemType = tBool;
	/**
	 * The (Core-named, not yet target-renamed) parameters of the function currently being lowered
	 * that `options.borrows` found borrowable. Read by `expr`'s "local" case so a reference to one
	 * of them carries `borrowed: true` from the moment it is built — including from inside a
	 * candidate's own `emit`, which runs here, before the function it belongs to has a printed
	 * form at all. That timing is exactly what `docs/decisions/0010-*.md` relies on: this field is
	 * set once, before a function's body is lowered, not discovered from print-time scope.
	 */
	private currentBorrowedParams: ReadonlySet<string> = new Set();
	/**
	 * Functions some *other* generated module calls. A source module's own `export` decides a
	 * function's visibility (`CFunc.moduleExported`), but a specialization (ADR 0004) is not the
	 * declaration it came from and carries that flag as false — which is right until the
	 * specialization survives as its own function and is called across a module boundary, where
	 * the importing file would name something the defining file never made visible. Whatever one
	 * generated module imports, the module that defines it exports.
	 */
	private crossModuleCallees: ReadonlySet<string> = new Set();

	constructor(program: CProgram, spec: TargetSpec, options: LowerOptions) {
		this.program = program;
		this.spec = spec;
		this.options = options;
	}

	run(): LoweredProgram {
		this.crossModuleCallees = this.findCrossModuleCallees();
		// Two passes: the first discovers which source library functions the selected portable
		// lowerings need, the second lowers with those functions in the closure and named.
		this.lowerAll(this.closure(this.program.entryPoints));
		const roots = [...this.program.entryPoints, ...this.needed].filter((name) =>
			this.program.functions.has(name),
		);
		this.moduleNeeds.clear();
		this.moduleBuiltins.clear();
		return {
			modules: this.lowerAll(this.closure(roots)),
			table: this.spec.table,
			functionNames: this.names,
			moduleNeeds: this.moduleNeeds,
			moduleBuiltins: this.moduleBuiltins,
		};
	}

	private findCrossModuleCallees(): ReadonlySet<string> {
		const found = new Set<string>();
		for (const caller of this.program.functions.values()) {
			for (const callee of caller.calls) {
				const target = this.program.functions.get(callee);
				if (target !== undefined && target.module !== caller.module) found.add(callee);
			}
		}
		return found;
	}

	private closure(roots: readonly string[]): CFunc[] {
		return dependencyClosure(this.program, roots)
			.map((name) => this.program.functions.get(name))
			.filter((fn): fn is CFunc => fn !== undefined);
	}

	private lowerAll(functions: readonly CFunc[]): TModule[] {
		this.assignNames(functions);

		const byModule = new Map<string, CFunc[]>();
		for (const fn of functions) {
			const list = byModule.get(fn.module);
			if (list === undefined) byModule.set(fn.module, [fn]);
			else list.push(fn);
		}

		const modules: TModule[] = [];
		for (const [modulePath, moduleFunctions] of byModule) {
			this.currentModule = modulePath;
			this.imports.set(modulePath, new Set());
			const records = this.recordsOf(moduleFunctions);
			this.constants = [];
			this.constantNames.clear();
			const lowered = moduleFunctions
				.map((fn) => this.lowerFunction(fn))
				.map((fn) => ({ ...fn, body: this.hoistConstantTables(fn.body) }));
			modules.push({
				path: this.spec.naming.module(modulePath),
				sourcePath: modulePath,
				imports: [],
				records,
				errors: [],
				constants: this.constants,
				functions: lowered,
				header: "",
				requires: [...(this.imports.get(modulePath) ?? [])].sort(),
			});
		}
		return modules;
	}

	private assignNames(functions: readonly CFunc[]): void {
		this.names.clear();
		const used = new Map<string, number>();
		for (const fn of functions) {
			const base = this.spec.naming.func(fn.localName.replaceAll("$", "_"), fn.exported);
			const count = used.get(base) ?? 0;
			used.set(base, count + 1);
			this.names.set(fn.name, count === 0 ? base : `${base}_${count}`);
		}
	}

	/** Record types the engine itself defines; each target declares them once in its support file. */
	private builtinRecordsUsed = new Set<string>();

	private recordsOf(functions: readonly CFunc[]): TRecord[] {
		const used = new Set<string>();
		const collectType = (type: SemType): void => {
			switch (type.kind) {
				case "Record":
					used.add(type.name);
					break;
				case "List":
					collectType(type.elem);
					break;
				case "Option":
					collectType(type.inner);
					break;
				default:
					break;
			}
		};
		for (const fn of functions) {
			for (const param of fn.params) collectType(param.type);
			collectType(fn.ret);
		}
		const records: TRecord[] = [];
		for (const name of used) {
			const definition = this.program.records.get(name);
			if (definition === undefined) continue;
			if (BUILTIN_RECORD_NAMES.includes(name)) {
				this.builtinRecordsUsed.add(name);
				const perModule = this.moduleBuiltins.get(this.currentModule) ?? new Set<string>();
				perModule.add(name);
				this.moduleBuiltins.set(this.currentModule, perModule);
				continue;
			}
			records.push({
				name: this.spec.naming.type(name),
				doc: definition.doc,
				fields: definition.fields.map((field) => ({
					name: this.spec.naming.field(field.name, true),
					type: field.optional && field.type.kind !== "Option" ? { kind: "Option", inner: field.type } : field.type,
					doc: field.doc,
				})),
			});
		}
		return records;
	}

	/* ---------------------------------------------------------------- *
	 * Functions
	 * ---------------------------------------------------------------- */

	private lowerFunction(fn: CFunc): TFunc {
		this.temporaries = 0;
		this.currentFails = fn.effects.fail;
		this.currentReturn = fn.ret;
		const borrowedHere = this.options.borrows?.get(fn.name) ?? new Set<string>();
		const previousBorrowed = this.currentBorrowedParams;
		this.currentBorrowedParams = borrowedHere;
		const params: TParam[] = fn.params.map((param) => ({
			name: this.spec.naming.value(param.name),
			type: param.type,
			doc: param.doc,
			borrowed: borrowedHere.has(param.name),
		}));
		if (fn.usesEnv) params.push({ name: ENV_PARAM, type: this.spec.envType });
		try {
			return {
				name: this.names.get(fn.name) ?? fn.localName,
				params,
				ret: fn.ret,
				body: this.block(fn.body),
				exported: fn.exported,
				moduleExported: fn.moduleExported || this.crossModuleCallees.has(fn.name),
				doc: fn.doc,
				isAsync: this.spec.asyncColouring && fn.effects.http,
				fails: fn.effects.fail,
				usesEnv: fn.usesEnv,
				source: { module: fn.module, name: fn.localName, start: fn.span.start, end: fn.span.end },
			};
		} finally {
			this.currentBorrowedParams = previousBorrowed;
		}
	}

	private block(body: readonly CStmt[]): TStmt[] {
		const outer = this.pending;
		const result: TStmt[] = [];
		for (const statement of body) {
			this.pending = [];
			const lowered = this.statement(statement);
			result.push(...this.pending, ...lowered);
		}
		this.pending = outer;
		return result;
	}

	private statement(statement: CStmt): TStmt[] {
		switch (statement.kind) {
			case "let": {
				const loop = this.combinatorLoop(statement.init, statement.name, statement.type);
				if (loop !== undefined) return loop;
				return [
					{
						kind: "let",
						name: this.spec.naming.value(statement.name),
						type: statement.type,
						init: this.expr(statement.init),
						mutable: statement.mutable,
					},
				];
			}
			case "assign":
				return [
					{
						kind: "assign",
						target: { kind: "name", name: this.spec.naming.value(statement.name) },
						value: this.expr(statement.value),
					},
				];
			case "setIndex":
				return [
					{
						kind: "assign",
						target: {
							kind: "index",
							target: { kind: "name", name: this.spec.naming.value(statement.name) },
							index: this.expr(statement.index),
						},
						value: this.expr(statement.value),
					},
				];
			case "push":
				return [this.pushStatement(statement)];
			case "if": {
				const test = this.expr(statement.test);
				return [
					{
						kind: "if",
						test,
						then: this.block(statement.then),
						otherwise: this.block(statement.otherwise),
					},
				];
			}
			case "switch":
				return [
					{
						kind: "switch",
						subject: this.expr(statement.subject),
						cases: statement.cases.map((entry) => ({
							values: entry.values,
							body: this.block(entry.body),
						})),
						otherwise: statement.otherwise === undefined ? undefined : this.block(statement.otherwise),
					},
				];
			case "forRange":
				return [
					{
						kind: "for",
						name: this.spec.naming.value(statement.name),
						type: statement.type,
						from: this.expr(statement.from),
						to: this.expr(statement.to),
						inclusive: statement.inclusive,
						step: statement.step,
						body: this.block(statement.body),
					},
				];
			case "forEach":
				return [
					{
						kind: "forEach",
						name: this.spec.naming.value(statement.name),
						type: statement.type,
						iterable: this.expr(statement.iterable),
						body: this.block(statement.body),
					},
				];
			case "return": {
				if (statement.value === undefined) return [{ kind: "return" }];
				const value = this.expr(statement.value);
				return [
					this.spec.errorsAsValues && this.currentFails.length > 0
						? { kind: "return", value, extra: [{ kind: "raw", text: "nil" }] }
						: { kind: "return", value },
				];
			}
			case "fail":
				return [
					{
						kind: "throw",
						errorClass: this.spec.naming.type(statement.errorClass),
						args: statement.args.map((arg) => this.expr(arg)),
					},
				];
			case "break":
				return [{ kind: "break" }];
			case "continue":
				return [{ kind: "continue" }];
			case "expr":
				return [{ kind: "expr", expr: this.expr(statement.expr) }];
			default: {
				const exhaustive: never = statement;
				return exhaustive;
			}
		}
	}

	private pushStatement(statement: Extract<CStmt, { kind: "push" }>): TStmt {
		const list: TExpr = { kind: "name", name: this.spec.naming.value(statement.name) };
		const value = this.expr(statement.value);
		const selection = this.spec.table.select("seq.push", []);
		return { kind: "expr", expr: selection.candidate.emit([list, value], [], this.context()) };
	}

	/**
	 * Turns `const total = seq.fold(xs, 0, f)` into a loop when the target prefers one. This is
	 * the `combinator-to-loop` nanopass, and `--no-idioms` forces it on for every combinator so
	 * conformance can compare the idiomatic and the plain form.
	 */
	private combinatorLoop(init: CExpr, name: string, type: SemType): TStmt[] | undefined {
		if (init.kind !== "op") return undefined;
		const wanted = this.options.noIdioms === true || this.spec.loopCombinators.has(init.op);
		if (!wanted) return undefined;
		const target = this.spec.naming.value(name);

		if (init.op === "seq.fold") {
			const [list, initial, fn] = init.args;
			if (fn === undefined || fn.kind !== "lambda" || list === undefined || initial === undefined) {
				return undefined;
			}
			const element = this.spec.naming.value(fn.params[1]!.name);
			const accumulator = fn.params[0]!.name;
			const body = this.inlineLambdaBody(fn, [
				{ from: accumulator, to: target },
			]);
			return [
				{ kind: "let", name: target, type, init: this.expr(initial), mutable: true },
				{
					kind: "forEach",
					name: element,
					type: fn.params[1]!.type,
					iterable: this.expr(list),
					body: body.map((statement) =>
						statement.kind === "return"
							? ({ kind: "assign", target: { kind: "name", name: target }, value: statement.value! } as TStmt)
							: statement,
					),
				},
			];
		}

		if (init.op === "seq.map" || init.op === "seq.filter") {
			const [list, fn] = init.args;
			if (fn === undefined || fn.kind !== "lambda" || list === undefined) return undefined;
			const element = this.spec.naming.value(fn.params[0]!.name);
			const body = this.inlineLambdaBody(fn, []);
			const produced = body.find((statement) => statement.kind === "return");
			if (produced === undefined || produced.kind !== "return" || produced.value === undefined) return undefined;
			const inner: TStmt[] =
				init.op === "seq.map"
					? [{ kind: "expr", expr: this.appendCall({ kind: "name", name: target }, produced.value) }]
					: [
							{
								kind: "if",
								test: produced.value,
								then: [
									{
										kind: "expr",
										expr: this.appendCall(
											{ kind: "name", name: target },
											{ kind: "name", name: element },
										),
									},
								],
								otherwise: [],
							},
						];
			return [
				{ kind: "let", name: target, type, init: { kind: "list", items: [], type }, mutable: true },
				{
					kind: "forEach",
					name: element,
					type: fn.params[0]!.type,
					iterable: this.expr(list),
					body: inner,
				},
			];
		}

		return undefined;
	}

	private appendCall(list: TExpr, value: TExpr): TExpr {
		const selection = this.spec.table.select("seq.push", []);
		return selection.candidate.emit([list, value], [], this.context());
	}

	/** Lowers a lambda body, renaming captured parameters to the caller's names. */
	private inlineLambdaBody(
		lambda: Extract<CExpr, { kind: "lambda" }>,
		renames: readonly { from: string; to: string }[],
	): TStmt[] {
		const body = this.block(lambda.body);
		if (renames.length === 0) return body;
		const map = new Map(renames.map((rename) => [this.spec.naming.value(rename.from), rename.to]));
		const rename = (expr: TExpr): TExpr =>
			expr.kind === "name" && map.has(expr.name) ? { ...expr, name: map.get(expr.name)! } : expr;
		return mapNames(body, rename);
	}

	/* ---------------------------------------------------------------- *
	 * Expressions
	 * ---------------------------------------------------------------- */

	/**
	 * Lifts a constant table out of the function that uses it.
	 *
	 * A weight table written inline would be rebuilt on every call in every target; as a module
	 * level constant it is literal data, which is allocated once and stays tree-shakeable.
	 */
	private hoistConstantTables(body: readonly TStmt[]): TStmt[] {
		return mapExprs(body, (expr) => {
			if (expr.kind !== "lit" || !Array.isArray(expr.value) || expr.value.length < 2) return expr;
			const key = JSON.stringify(expr.value, (_key, item: unknown) =>
				typeof item === "bigint" ? item.toString() : item,
			);
			const existing = this.constantNames.get(key);
			if (existing !== undefined) return { kind: "name", name: existing };
			// The module is part of the name because Go puts every generated file in one package,
			// so two modules that each hoisted a bare `table1` would redeclare it. Naming by module
			// rather than by a running count also keeps an unrelated new utility from renumbering
			// the tables of every file that already had one.
			const scope = this.currentModule.replaceAll("/", "-");
			const name = this.spec.naming.value(`${scope}-table-${this.constants.length + 1}`);
			this.constantNames.set(key, name);
			this.constants.push({ name, type: expr.type, value: expr });
			return { kind: "name", name };
		});
	}

	private context(): EmitContext {
		return {
			require: (module) => this.imports.get(this.currentModule)?.add(module),
			nameOf: (qualified) => this.names.get(qualified) ?? qualified,
			needSource: (qualified) => this.needed.add(qualified),
			env: () => ({ kind: "name", name: ENV_PARAM }),
		};
	}

	private temp(): string {
		this.temporaries += 1;
		return this.spec.naming.value(`tmp${this.temporaries}`);
	}

	expr(expr: CExpr): TExpr {
		switch (expr.kind) {
			case "lit":
				return { kind: "lit", value: expr.value, type: expr.type };
			case "local":
				return {
					kind: "name",
					name: this.spec.naming.value(expr.name),
					borrowed: this.currentBorrowedParams.has(expr.name),
				};
			case "none":
				return { kind: "none", type: expr.type };
			case "some":
				return { kind: "some", inner: this.expr(expr.inner) };
			case "record":
				// A record built inline still needs its declaration in scope, which for an
				// engine-defined record means importing it from the target's support file.
				if (BUILTIN_RECORD_NAMES.includes(expr.typeName)) {
					const perModule = this.moduleBuiltins.get(this.currentModule) ?? new Set<string>();
					perModule.add(expr.typeName);
					this.moduleBuiltins.set(this.currentModule, perModule);
				}
				return {
					kind: "record",
					typeName: this.spec.naming.type(expr.typeName),
					fields: expr.fields.map((field) => ({
						name: this.spec.naming.field(field.name, true),
						value: this.expr(field.value),
					})),
				};
			case "field":
				return {
					kind: "member",
					target: this.expr(expr.target),
					name: this.spec.naming.field(expr.name, true),
				};
			case "list":
				return { kind: "list", items: expr.items.map((item) => this.expr(item)), type: expr.type };
			case "call": {
				const callee = this.program.functions.get(expr.fn);
				const args = expr.args.map((arg) => this.expr(arg));
				const borrowedThere = this.options.borrows?.get(expr.fn);
				const borrowedArgs =
					borrowedThere === undefined
						? undefined
						: callee?.params.map((param) => borrowedThere.has(param.name));
				if (callee?.usesEnv === true) args.push({ kind: "name", name: ENV_PARAM });
				const call: TExpr = {
					kind: "call",
					callee: { kind: "name", name: this.names.get(expr.fn) ?? expr.fn },
					args,
					borrowedArgs,
					await: this.spec.asyncColouring && callee?.effects.http === true,
				};
				if (this.spec.errorsAsValues && (callee?.effects.fail.length ?? 0) > 0) {
					return this.hoistFallible(call, callee!.ret);
				}
				return call;
			}
			case "op":
				return this.operation(expr);
			case "lambda": {
				// A lambda has its own result: the enclosing function's error contract does not
				// apply inside it, which matters for a target that returns errors as values.
				const outerFails = this.currentFails;
				const outerReturn = this.currentReturn;
				this.currentFails = [];
				this.currentReturn = expr.type.kind === "Lambda" ? expr.type.ret : tBool;
				const body = this.block(expr.body);
				this.currentFails = outerFails;
				this.currentReturn = outerReturn;
				return {
					kind: "lambda",
					params: expr.params.map((param) => ({
						name: this.spec.naming.value(param.name),
						type: param.type,
					})),
					body,
					ret: expr.type.kind === "Lambda" ? expr.type.ret : tBool,
				};
			}
			case "cond": {
				if (!this.spec.statementTernary) {
					return {
						kind: "ternary",
						test: this.expr(expr.test),
						then: this.expr(expr.then),
						otherwise: this.expr(expr.otherwise),
					};
				}
				// Go has no conditional expression, so the value is computed by statements.
				const name = this.temp();
				const test = this.expr(expr.test);
				this.pending.push({
					kind: "let",
					name,
					type: expr.type,
					init: { kind: "zero", type: expr.type },
					mutable: true,
				});
				this.pending.push({
					kind: "if",
					test,
					then: [{ kind: "assign", target: { kind: "name", name }, value: this.expr(expr.then) }],
					otherwise: [{ kind: "assign", target: { kind: "name", name }, value: this.expr(expr.otherwise) }],
				});
				return { kind: "name", name };
			}
			case "and":
				return { kind: "binary", op: "&&", left: this.expr(expr.left), right: this.expr(expr.right) };
			case "or":
				return { kind: "binary", op: "||", left: this.expr(expr.left), right: this.expr(expr.right) };
			case "not":
				return { kind: "unary", op: "!", operand: this.expr(expr.operand) };
			default: {
				const exhaustive: never = expr;
				return exhaustive;
			}
		}
	}

	/**
	 * A chain of `+` on strings is nested `str.concat` ops, two at a time (`(a + b) + c` is
	 * `str.concat(str.concat(a, b), c)`) — sound, but a target whose `str.concat` allocates a fresh
	 * buffer per call (Rust: `engine/docs/progress.md` §8) then pays for one reallocation-and-copy
	 * per piece instead of one buffer sized once. Flattening the chain into its leaves before
	 * lowering, and handing them to `str.concatAll` when a target declares one, is how that target
	 * gets to make that one-buffer decision; a target with no such candidate (every one but Rust,
	 * today) falls straight through to the ordinary pairwise path below, unchanged.
	 */
	private operation(expr: Extract<CExpr, { kind: "op" }>): TExpr {
		if (expr.op === "str.concat" && this.spec.table.has("str.concatAll")) {
			const pieces = flattenConcat(expr);
			if (pieces.length > 2) {
				return this.emitOp("str.concatAll", pieces.map((piece) => this.expr(piece)), pieces.map((piece) => piece.type), undefined);
			}
		}
		const op = expr.op === "re.test" ? "re.test" : expr.op;
		return this.emitOp(op, expr.args.map((arg) => this.expr(arg)), expr.args.map((arg) => arg.type), expr.regex);
	}

	private emitOp(op: string, args: readonly TExpr[], types: readonly SemType[], regex: NormalizedRegex | undefined): TExpr {
		const selection = this.spec.table.select(op, types);
		const candidate = selection.candidate;
		if (candidate.sourceFn !== undefined) {
			this.needed.add(candidate.sourceFn);
			const set = this.moduleNeeds.get(this.currentModule);
			if (set === undefined) this.moduleNeeds.set(this.currentModule, new Set([candidate.sourceFn]));
			else set.add(candidate.sourceFn);
		}
		const context = this.context();
		if (regex !== undefined) return candidate.emit(args, types, { ...context, regex });
		return candidate.emit(args, types, context);
	}

	/** `v, err := f(…)` plus the early return every Go caller writes by hand. */
	private hoistFallible(call: TExpr, type: SemType): TExpr {
		const value = this.temp();
		const error = `${value}Err`;
		this.pending.push({
			kind: "multiLet",
			names: [value, error],
			types: [type, tString("ascii")],
			init: call,
		});
		this.pending.push({
			kind: "if",
			test: { kind: "binary", op: "!=", left: { kind: "name", name: error }, right: { kind: "raw", text: "nil" } },
			then: [
				{
					kind: "return",
					value: { kind: "zero", type: this.currentReturn },
					extra: [{ kind: "name", name: error }],
				},
			],
			otherwise: [],
		});
		return { kind: "name", name: value };
	}
}

/** Renames free identifiers in a statement list. */
function mapNames(body: readonly TStmt[], rename: (expr: TExpr) => TExpr): TStmt[] {
	return mapExprs(body, rename);
}

/** The leaves of a `str.concat` chain, left to right — see `operation`'s comment on why. */
function flattenConcat(expr: CExpr): CExpr[] {
	if (expr.kind === "op" && expr.op === "str.concat") {
		return [...flattenConcat(expr.args[0]!), ...flattenConcat(expr.args[1]!)];
	}
	return [expr];
}

export type { TExpr, TStmt, TFunc, TModule };
