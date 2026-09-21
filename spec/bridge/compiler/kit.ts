/**
 * Shared helpers for the emitters.
 *
 * The IR is small enough that each target is its own file, but three things are the same
 * everywhere: naming conventions, walking the tree, and hoisting option reads into locals so
 * that no emitter has to inline a null check in the middle of an expression.
 */
import { type Expr, type FuncDecl, type Stmt } from "./ir.ts";

/**
 * Converts a camelCase or kebab-case name to snake_case.
 *
 * Module names are kebab-case, the way the directories under `src/` are, and every other name
 * the frontend collects is camelCase, so both spellings arrive here.
 *
 * @param {string} name - The name.
 * @returns {string} The converted name.
 */
export const snake = (name: string): string =>
	name
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replaceAll("-", "_")
		.toLowerCase();

/**
 * Converts a camelCase or kebab-case name to PascalCase.
 *
 * @param {string} name - The name.
 * @returns {string} The converted name.
 */
export const pascal = (name: string): string =>
	name
		.split(/[-_]/)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join("");

/**
 * Converts a camelCase name to kebab-case.
 *
 * @param {string} name - The name.
 * @returns {string} The converted name.
 */
export const kebab = (name: string): string =>
	name
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replaceAll("_", "-")
		.toLowerCase();

/**
 * Converts a name to SCREAMING_SNAKE_CASE.
 *
 * @param {string} name - The name.
 * @returns {string} The converted name.
 */
export const screaming = (name: string): string => snake(name).toUpperCase();

/**
 * Visits every expression of a statement list.
 *
 * @param {Stmt[]} body - The statements.
 * @param {Function} visit - Called with each expression.
 * @returns {void}
 */
export const walk = (body: Stmt[], visit: (expr: Expr) => void): void => {
	const expression = (node: Expr): void => {
		visit(node);

		switch (node.k) {
			case "field": {
				expression(node.target);
				break;
			}
			case "index": {
				expression(node.target);
				expression(node.index);
				break;
			}
			case "call": {
				for (const argument of node.args) expression(argument);
				break;
			}
			case "bin": {
				expression(node.left);
				expression(node.right);
				break;
			}
			case "not": {
				expression(node.operand);
				break;
			}
			case "cond": {
				expression(node.test);
				expression(node.whenTrue);
				expression(node.whenFalse);
				break;
			}
			case "listOf": {
				for (const item of node.items) expression(item);
				break;
			}
			case "struct": {
				for (const field of node.fields) expression(field.value);
				break;
			}
			case "await": {
				expression(node.value);
				break;
			}
			default: {
				break;
			}
		}
	};

	for (const statement of body) {
		switch (statement.k) {
			case "let":
			case "assign": {
				expression(statement.value);
				break;
			}
			case "if": {
				expression(statement.test);
				walk(statement.then, visit);
				walk(statement.otherwise, visit);
				break;
			}
			case "return": {
				if (statement.value !== undefined) expression(statement.value);
				break;
			}
			case "forOf": {
				expression(statement.iterable);
				walk(statement.body, visit);
				break;
			}
			case "forRange": {
				expression(statement.from);
				expression(statement.until);
				walk(statement.body, visit);
				break;
			}
			case "throw": {
				expression(statement.message);
				break;
			}
			case "try": {
				walk(statement.body, visit);
				walk(statement.catchBody, visit);
				break;
			}
			case "expr": {
				expression(statement.value);
				break;
			}
		}
	}
};

export type OptionRead = { target: string; field: string; local: string; expr: Expr };

/**
 * Every option field a function reads, with the local name the emitter binds it to.
 *
 * Hoisting them turns `options?.version === 2` into a plain comparison against a local that the
 * prologue already defaulted, which every target can write idiomatically.
 *
 * @param {FuncDecl} entry - The function.
 * @returns {OptionRead[]} The reads, de-duplicated.
 */
export const optionReads = (entry: FuncDecl): OptionRead[] => {
	const found = new Map<string, OptionRead>();

	walk(entry.body, (node) => {
		if (node.k !== "optionField") return;

		const key = `${node.target}.${node.field}`;

		if (found.has(key)) return;

		found.set(key, {
			target: node.target,
			field: node.field,
			local: `${node.target}${pascal(node.field)}`,
			expr: node,
		});
	});

	return [...found.values()];
};

/**
 * The names a function pushes onto, which some targets must declare mutable.
 *
 * @param {FuncDecl} entry - The function.
 * @returns {Set<string>} The names.
 */
export const pushTargets = (entry: FuncDecl): Set<string> => {
	const found = new Set<string>();

	walk(entry.body, (node) => {
		if (node.k !== "call" || node.callee.k !== "std" || node.callee.name !== "listPush") return;

		const target = node.args[0];

		if (target.k === "ref") found.add(target.name);
	});

	return found;
};

/**
 * Whether a function's body calls a given runtime helper.
 *
 * @param {FuncDecl[]} functions - The functions to scan.
 * @param {string} name - The helper name.
 * @returns {boolean} True when it is called at least once.
 */
export const usesStd = (functions: FuncDecl[], name: string): boolean => {
	let used = false;
	const look = (node: Expr): void => {
		if (node.k === "call" && node.callee.k === "std" && node.callee.name === name) used = true;
	};

	for (const entry of functions) walk(entry.body, look);

	return used;
};

/**
 * The prose of a doc comment, without the JSDoc tags, for targets that do not use them.
 *
 * The `@see` lines survive: the provenance of an algorithm belongs in every language.
 *
 * @param {string} doc - The source doc comment.
 * @returns {string} The prose and the `@see` lines.
 */
export const prose = (doc: string): string => {
	const lines: string[] = [];
	let skipping = false;

	for (const line of doc.split("\n")) {
		const trimmed = line.trim();

		if (trimmed.startsWith("@see")) {
			lines.push(trimmed);
			skipping = false;
			continue;
		}

		if (trimmed.startsWith("@")) {
			skipping = true;
			continue;
		}

		if (skipping) continue;

		lines.push(line);
	}

	return lines
		.join("\n")
		.replaceAll(/\n{3,}/g, "\n\n")
		.trim();
};
