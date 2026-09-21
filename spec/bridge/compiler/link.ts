/**
 * The two passes that let a utility be one file without repeating itself.
 *
 * `src/` in this repository is one directory per utility, with everything two of them share
 * under `_internals/`. The source under `source/` is laid out the same way, and these two
 * passes are what make that work across seven languages at once:
 *
 * - `inline` splices the helpers a module imports into the module, so the compiler still sees
 *   exactly one file and every target still emits exactly one self-contained unit. Nothing
 *   cross-references anything, which is what keeps the JavaScript output tree shakeable and
 *   the C ABI a flat list of symbols.
 * - `prune` then drops whatever that splicing brought in and the module does not reach. A
 *   utility importing one helper out of a file of ten emits one helper.
 *
 * The alternative — emitting a shared module per target and importing across it — would mean
 * seven different module systems, seven visibility models, and a Go package named after a
 * directory that Rust would spell differently. Inlining costs a few duplicated helper bodies
 * across utilities and buys all of that back.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
	type CharClass,
	type ConstDecl,
	type DataDecl,
	type EnumDecl,
	type ErrorDecl,
	type Expr,
	type FuncDecl,
	type Module,
	type PatternDecl,
	type Stmt,
	type StructDecl,
	type Ty,
} from "./ir.ts";
import { walk } from "./kit.ts";

/** `import { a, b } from "./_internals/name.ts"`, which is the only import that is resolved. */
const INTERNAL_IMPORT =
	/^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+"([^"]*_internals\/[^"]+)";?[ \t]*$/gm;

/**
 * Reads a module and appends every helper file it imports, with the imports resolved.
 *
 * The helpers go after the module rather than before it, for two reasons: the frontend
 * collects signatures in a first pass, so order does not matter to it, and the module's own
 * doc comment has to stay the first block comment in the text.
 *
 * `export` is stripped from the helpers on the way in. A helper is shared source, not a public
 * name, so once it is part of a module it is one of that module's private declarations, and
 * every target emits it unexported.
 *
 * @param {string} path - The module path.
 * @returns {string} The module's source with its helpers appended.
 */
export const inline = (path: string): string => {
	const seen = new Set<string>();
	const parts: string[] = [];

	const read = (file: string, top: boolean): void => {
		if (seen.has(file)) return;

		seen.add(file);

		const text = readFileSync(file, "utf8");
		const imports = [...text.matchAll(INTERNAL_IMPORT)].map((match) => match[1]);

		parts.push(
			top
				? text
				: `\n// Inlined from ${file.slice(file.lastIndexOf("/source/") + 1)}.\n${text.replaceAll(
						/^export /gm,
						"",
					)}`,
		);

		for (const from of imports) read(resolve(dirname(file), from), false);
	};

	read(path, true);

	return parts.join("\n");
};

/** Every table a name can be found in, so that one lookup resolves a reference. */
type Tables = {
	functions: Map<string, FuncDecl>;
	constants: Map<string, ConstDecl>;
	patterns: Map<string, PatternDecl>;
	charClasses: Map<string, CharClass>;
	structs: Map<string, StructDecl>;
	enums: Map<string, EnumDecl>;
	errors: Map<string, ErrorDecl>;
	data: Map<string, DataDecl>;
};

/** The names reached so far, one set per table. */
type Kept = Record<keyof Tables, Set<string>>;

/**
 * Drops every private declaration the module's exported surface cannot reach.
 *
 * Reachability starts at the exported functions and the exported errors — a caller catches
 * those by name, so they stay whether or not this module raises them — and follows calls,
 * references, thrown errors, and the types of parameters, returns, locals and struct fields.
 *
 * @param {Module} module - The compiled module.
 * @returns {Module} The same module with the unreachable declarations removed.
 */
export const prune = (module: Module): Module => {
	const tables: Tables = {
		functions: new Map(module.functions.map((entry) => [entry.name, entry])),
		constants: new Map(module.constants.map((entry) => [entry.name, entry])),
		patterns: new Map(module.patterns.map((entry) => [entry.name, entry])),
		charClasses: new Map(module.charClasses.map((entry) => [entry.name, entry])),
		structs: new Map(module.structs.map((entry) => [entry.name, entry])),
		enums: new Map(module.enums.map((entry) => [entry.name, entry])),
		errors: new Map(module.errors.map((entry) => [entry.name, entry])),
		data: new Map(module.data.map((entry) => [entry.name, entry])),
	};

	const kept: Kept = {
		functions: new Set(),
		constants: new Set(),
		patterns: new Set(),
		charClasses: new Set(),
		structs: new Set(),
		enums: new Set(),
		errors: new Set(),
		data: new Set(),
	};

	const keepType = (ty: Ty): void => {
		switch (ty.k) {
			case "named": {
				keepStruct(ty.name);
				break;
			}
			case "enum": {
				if (tables.enums.has(ty.name)) kept.enums.add(ty.name);
				break;
			}
			case "list":
			case "opt":
			case "tasks": {
				keepType(ty.of);
				break;
			}
			default: {
				break;
			}
		}
	};

	const keepStruct = (name: string): void => {
		if (kept.structs.has(name)) return;

		const entry = tables.structs.get(name);

		if (entry === undefined) return;

		kept.structs.add(name);

		for (const field of entry.fields) keepType(field.ty);
	};

	const keepError = (name: string): void => {
		if (kept.errors.has(name)) return;

		const entry = tables.errors.get(name);

		if (entry === undefined) return;

		kept.errors.add(name);

		if (entry.base !== undefined) keepError(entry.base);
	};

	const keepPattern = (name: string): void => {
		if (kept.patterns.has(name)) return;

		const entry = tables.patterns.get(name);

		if (entry === undefined) return;

		kept.patterns.add(name);

		for (const step of entry.steps) kept.charClasses.add(step.charClass);
	};

	/** A bare name is whatever table holds it: they never collide inside one module. */
	const keepName = (name: string): void => {
		if (tables.functions.has(name)) keepFunction(name);
		if (tables.constants.has(name)) kept.constants.add(name);
		if (tables.patterns.has(name)) keepPattern(name);
		if (tables.charClasses.has(name)) kept.charClasses.add(name);
		if (tables.data.has(name)) kept.data.add(name);
		if (tables.errors.has(name)) keepError(name);
	};

	const keepExpr = (node: Expr): void => {
		switch (node.k) {
			case "ref": {
				keepName(node.name);
				break;
			}
			case "field": {
				keepType(node.ty);
				keepExpr(node.target);
				break;
			}
			case "index": {
				if (node.ty !== undefined) keepType(node.ty);

				keepExpr(node.target);
				keepExpr(node.index);
				break;
			}
			case "call": {
				keepType(node.ty);

				if (node.callee.k === "user") keepFunction(node.callee.name);
				if (node.callee.k === "error") keepError(node.callee.name);

				// `anyFailedWith(attempts, SomeError)` carries the error as its name, because what
				// the targets compare is the kind rather than a class object.
				if (node.callee.k === "std" && node.callee.name === "anyFailedWith") {
					const kind = node.args[1];

					if (kind?.k === "str") keepError(kind.value);
				}

				for (const argument of node.args) keepExpr(argument);

				break;
			}
			case "bin": {
				if (node.ty !== undefined) keepType(node.ty);

				keepExpr(node.left);
				keepExpr(node.right);
				break;
			}
			case "not": {
				keepExpr(node.operand);
				break;
			}
			case "cond": {
				keepExpr(node.test);
				keepExpr(node.whenTrue);
				keepExpr(node.whenFalse);
				break;
			}
			case "listOf": {
				keepType(node.of);

				for (const item of node.items) keepExpr(item);

				break;
			}
			case "struct": {
				keepStruct(node.name);

				for (const field of node.fields) keepExpr(field.value);

				break;
			}
			case "await": {
				keepExpr(node.value);
				break;
			}
			case "optionField": {
				keepType(node.ty);
				keepExpr(node.fallback);
				break;
			}
			default: {
				break;
			}
		}
	};

	const keepBody = (body: Stmt[]): void => {
		for (const statement of body) {
			switch (statement.k) {
				case "let": {
					keepType(statement.ty);
					keepExpr(statement.value);
					break;
				}
				case "assign": {
					keepExpr(statement.value);
					break;
				}
				case "if": {
					keepExpr(statement.test);
					keepBody(statement.then);
					keepBody(statement.otherwise);
					break;
				}
				case "return": {
					if (statement.value !== undefined) keepExpr(statement.value);

					break;
				}
				case "forOf": {
					keepType(statement.ty);
					keepExpr(statement.iterable);
					keepBody(statement.body);
					break;
				}
				case "forRange": {
					keepExpr(statement.from);
					keepExpr(statement.until);
					keepBody(statement.body);
					break;
				}
				case "throw": {
					keepError(statement.error);
					keepExpr(statement.message);
					break;
				}
				case "try": {
					keepBody(statement.body);
					keepBody(statement.catchBody);
					break;
				}
				case "expr": {
					keepExpr(statement.value);
					break;
				}
			}
		}
	};

	function keepFunction(name: string): void {
		if (kept.functions.has(name)) return;

		const entry = tables.functions.get(name);

		if (entry === undefined) return;

		kept.functions.add(name);

		for (const param of entry.params) keepType(param.ty);

		keepType(entry.ret);
		keepBody(entry.body);
	}

	for (const entry of module.functions) if (entry.exported) keepFunction(entry.name);

	for (const entry of module.errors) if (entry.exported) keepError(entry.name);

	// A record the runtime already declares is not this module's to drop: an emitter recognises
	// it by name and skips it, and the frontend needs it in the table to type a field read.
	for (const entry of module.structs) if (entry.external === true) kept.structs.add(entry.name);

	return renumber({
		...module,
		charClasses: module.charClasses.filter((entry) => kept.charClasses.has(entry.name)),
		constants: module.constants.filter((entry) => kept.constants.has(entry.name)),
		data: module.data.filter((entry) => kept.data.has(entry.name)),
		enums: module.enums.filter((entry) => kept.enums.has(entry.name)),
		errors: module.errors.filter((entry) => kept.errors.has(entry.name)),
		functions: module.functions.filter((entry) => kept.functions.has(entry.name)),
		patterns: module.patterns.filter((entry) => kept.patterns.has(entry.name)),
		structs: module.structs.filter((entry) => kept.structs.has(entry.name)),
	});
};

/**
 * Closes the gaps pruning leaves in the character class names.
 *
 * The classes are interned as `class0`, `class1`, … in the order the regexes are read, so
 * dropping one leaves a hole in a name a reader of the generated code would otherwise take for
 * a missing declaration.
 *
 * @param {Module} module - The pruned module.
 * @returns {Module} The same module with its character classes numbered from zero.
 */
const renumber = (module: Module): Module => {
	const renamed = new Map<string, string>();

	for (const [index, entry] of module.charClasses.entries()) {
		const name = `class${index}`;

		if (name !== entry.name) renamed.set(entry.name, name);

		entry.name = name;
	}

	if (renamed.size === 0) return module;

	for (const entry of module.patterns)
		for (const step of entry.steps) step.charClass = renamed.get(step.charClass) ?? step.charClass;

	for (const entry of module.functions)
		walk(entry.body, (node) => {
			if (node.k === "ref") node.name = renamed.get(node.name) ?? node.name;
		});

	return module;
};
