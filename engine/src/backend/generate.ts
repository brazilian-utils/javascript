/**
 * Generation: Target AST to files on disk.
 *
 * Everything here is target-independent. A backend contributes a spec (naming, passes), a printer
 * and its support module; this module decides the file layout, the imports between generated
 * modules, the provenance header, and the three review artifacts every target produces:
 * `LOWERING.md`, `API.json` and `SOURCEMAP.json`.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { CExpr, CProgram, CStmt } from "../core/ir.ts";
import type { SemType } from "../types.ts";
import { typeToString } from "../types.ts";
import { lowerProgram } from "./lower.ts";
import type { LowerOptions, TargetSpec } from "./lower.ts";
import type { TImport, TModule } from "./tast.ts";

export const ENGINE_VERSION = "0.1.0";

export type Backend = {
	readonly spec: TargetSpec;
	readonly fileExtension: string;
	/** Renders a module. Imports have already been computed. */
	readonly printModule: (module: TModule) => string;
	/** How module `from` refers to module `to` in an import. */
	readonly importPath: (from: string, to: string) => string;
	/** The generated capability and concurrency support, when the program needs it. */
	readonly support?: (program: CProgram, needs: SupportNeeds) => { path: string; text: string } | undefined;
	/** The generated declarations of the project's domain errors. */
	readonly errorsModule?: (program: CProgram) => { path: string; text: string } | undefined;
	/** A type rendered in `API.json`, so DX authors see the real signature. */
	readonly renderType: (type: SemType) => string;
	/** What a module imports from the target's support file, when it needs one. */
	readonly supportImport?: (
		needs: SupportNeeds,
		usesEnv: boolean,
		builtins: readonly string[],
	) => readonly { from: string; names: readonly string[]; typeOnly?: boolean }[];
	/** Line comment marker, used for the provenance header. */
	readonly comment?: string;
	/**
	 * A program that reads `{"fn": …, "args": […]}` lines and answers `{"ok": …}` lines, so the
	 * differential harness can drive every target through one protocol.
	 */
	readonly driver?: (program: CProgram, entryPoints: readonly DriverEntry[]) => { path: string; text: string }[];
};

/** One entry point, as the generated driver sees it. */
export type DriverEntry = {
	readonly coreName: string;
	readonly targetName: string;
	readonly modulePath: string;
	readonly params: readonly SemType[];
	readonly ret: SemType;
	readonly usesEnv: boolean;
	readonly fails: readonly string[];
};

export type SupportNeeds = {
	readonly env: boolean;
	readonly race: boolean;
};

export type GenerateResult = {
	readonly files: readonly { readonly path: string; readonly text: string }[];
	readonly lowering: string;
	/** Every selection the lowering table made, for the metrics. */
	readonly selections: readonly { op: string; args: string; impl: string; reason: string }[];
	readonly api: unknown;
	readonly sourceMap: unknown;
};

export function generate(
	program: CProgram,
	backend: Backend,
	options: LowerOptions = {},
): GenerateResult {
	const lowered = lowerProgram(program, backend.spec, options);
	const moduleOf = new Map<string, string>();
	for (const fn of program.functions.values()) moduleOf.set(fn.name, fn.module);

	const files: { path: string; text: string }[] = [];
	const sourceMap: Record<string, { module: string; start: number; end: number }> = {};
	const api: {
		functions: { name: string; module: string; params: { name: string; type: string }[]; returns: string; effects: string[] }[];
		records: { name: string; fields: { name: string; type: string }[] }[];
		errors: string[];
	} = { functions: [], records: [], errors: [] };

	const needs: SupportNeeds = {
		env: [...program.functions.values()].some((fn) => fn.usesEnv),
		race: [...program.functions.values()].some((fn) => usesOp(fn.body, "task.race")),
	};

	for (const module of lowered.modules) {
		const sourcePath = module.sourcePath;
		const imports = computeImports(
			module,
			sourcePath,
			program,
			lowered.functionNames,
			moduleOf,
			backend,
			needs,
			lowered.moduleNeeds.get(sourcePath) ?? new Set(),
			[...(lowered.moduleBuiltins.get(sourcePath) ?? new Set<string>())].sort(),
		);
		const printed = backend.printModule({
			...module,
			imports,
			header: header(sourcePath, program, backend.comment ?? "//"),
		});
		files.push({ path: module.path, text: printed });

		for (const fn of module.functions) {
			sourceMap[`${module.path}#${fn.name}`] = {
				module: fn.source.module,
				start: fn.source.start,
				end: fn.source.end,
			};
			if (!fn.exported) continue;
			api.functions.push({
				name: fn.name,
				module: module.path,
				params: fn.params.map((param) => ({ name: param.name, type: backend.renderType(param.type) })),
				returns: backend.renderType(fn.ret),
				effects: fn.fails.map((name) => `Fail<${name}>`).concat(fn.usesEnv ? ["env"] : []),
			});
		}
		for (const record of module.records) {
			if (api.records.some((item) => item.name === record.name)) continue;
			api.records.push({
				name: record.name,
				fields: record.fields.map((field) => ({ name: field.name, type: backend.renderType(field.type) })),
			});
		}
	}

	const entries: DriverEntry[] = [];
	for (const module of lowered.modules) {
		for (const fn of module.functions) {
			if (!fn.exported) continue;
			entries.push({
				coreName: `${module.sourcePath}::${fn.source.name}`,
				targetName: fn.name,
				modulePath: module.path,
				params: fn.params.filter((param) => param.name !== "env").map((param) => param.type),
				ret: fn.ret,
				usesEnv: fn.usesEnv,
				fails: fn.fails,
			});
		}
	}
	for (const file of backend.driver?.(program, entries) ?? []) files.push(file);

	const errors = backend.errorsModule?.(program);
	if (errors !== undefined) files.push(errors);
	const support = backend.support?.(program, needs);
	if (support !== undefined) files.push(support);
	api.errors = [...program.errors.keys()].sort();

	return {
		files,
		lowering: lowered.table.renderLoweringDoc(backend.spec.name),
		selections: lowered.table.selections,
		api,
		sourceMap,
	};
}

/** Whether a Core body mentions an operation, used to decide what support code is needed. */
function usesOp(body: readonly CStmt[], op: string): boolean {
	let found = false;
	const expr = (node: CExpr): void => {
		if (found) return;
		switch (node.kind) {
			case "op":
				if (node.op === op) found = true;
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

function header(modulePath: string, program: CProgram, comment: string): string {
	const hash = createHash("sha256")
		.update(
			[...program.functions.values()]
				.filter((fn) => fn.module === modulePath)
				.map((fn) => fn.name)
				.sort()
				.join(","),
		)
		.digest("hex")
		.slice(0, 12);
	return [
		`${comment} Code generated by the logic engine. DO NOT EDIT.`,
		`${comment} engine: ${ENGINE_VERSION}`,
		`${comment} source: ${modulePath}`,
		`${comment} content: ${hash}`,
	].join("\n");
}

function computeImports(
	module: TModule,
	sourcePath: string,
	program: CProgram,
	names: ReadonlyMap<string, string>,
	moduleOf: ReadonlyMap<string, string>,
	backend: Backend,
	needs: SupportNeeds,
	portable: ReadonlySet<string>,
	builtins: readonly string[],
): TImport[] {
	const byModule = new Map<string, Set<string>>();
	const record = (callee: string): void => {
		const target = moduleOf.get(callee);
		if (target === undefined || target === sourcePath) return;
		const name = names.get(callee);
		if (name === undefined) return;
		const set = byModule.get(target);
		if (set === undefined) byModule.set(target, new Set([name]));
		else set.add(name);
	};
	for (const callee of portable) record(callee);
	for (const fn of program.functions.values()) {
		if (fn.module !== sourcePath) continue;
		for (const callee of fn.calls) {
			record(callee);
		}
	}
	const imports: TImport[] = [...byModule.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([target, used]) => ({
			from: backend.importPath(sourcePath, target),
			names: [...used].sort(),
		}));

	const localErrors = [...program.errors.values()].filter((error) => !error.exported || true);
	const usesErrors = module.functions.some((fn) => fn.fails.length > 0);
	if (usesErrors && localErrors.length > 0) {
		imports.push({
			from: backend.importPath(sourcePath, "errors"),
			names: [...new Set(module.functions.flatMap((fn) => fn.fails))].sort(),
		});
	}
	const usesEnv = module.functions.some((fn) => fn.usesEnv);
	for (const support of backend.supportImport?.(needs, usesEnv, builtins) ?? []) {
		if (support.names.length > 0) {
			imports.push({ from: support.from, names: [...support.names], typeOnly: support.typeOnly });
		}
	}
	return imports;
}

export function writeFiles(outDir: string, result: GenerateResult, extras: Record<string, string>): void {
	for (const file of [...result.files]) {
		const full = join(outDir, file.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, file.text);
	}
	for (const [name, text] of Object.entries(extras)) {
		const full = join(outDir, name);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, text);
	}
}

export { relative, typeToString };
