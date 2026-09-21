/**
 * The intermediate representation every emitter consumes.
 *
 * It is deliberately smaller than TypeScript: the frontend rejects anything that does not map
 * cleanly onto all seven targets, so an emitter never has to guess. Numbers are 64 bit signed
 * integers — none of the utilities in scope needs anything else, and float semantics differ
 * enough between the targets to be worth excluding until something needs them.
 */

export type Ty =
	| { k: "string" }
	| { k: "int" }
	| { k: "bool" }
	| { k: "void" }
	| { k: "json" }
	/** `string | number`: what a public entry point accepts before coercing. */
	| { k: "scalar" }
	/** A string whose values are a closed set: a union of string literals in the source. */
	| { k: "enum"; name: string }
	/** The running attempts of a race, as `startAll` hands them over. */
	| { k: "tasks"; of: Ty }
	| { k: "list"; of: Ty }
	| { k: "opt"; of: Ty }
	| { k: "named"; name: string };

export type Param = { name: string; ty: Ty; optional: boolean };

/** A call target: a runtime helper, a function from the source, or a declared error. */
export type Callee =
	| { k: "std"; name: string }
	| { k: "user"; name: string }
	| { k: "error"; name: string };

export type Expr =
	| { k: "str"; value: string }
	| { k: "int"; value: number }
	| { k: "bool"; value: boolean }
	| { k: "none" }
	| { k: "ref"; name: string }
	| { k: "field"; target: Expr; name: string; ty: Ty }
	| { k: "index"; target: Expr; index: Expr; ty?: Ty }
	| { k: "call"; callee: Callee; args: Expr[]; ty: Ty }
	| { k: "bin"; op: BinaryOp; left: Expr; right: Expr; ty?: Ty }
	| { k: "not"; operand: Expr }
	| { k: "cond"; test: Expr; whenTrue: Expr; whenFalse: Expr }
	| { k: "listOf"; items: Expr[]; of: Ty }
	| { k: "struct"; name: string; fields: { name: string; value: Expr }[] }
	| { k: "await"; value: Expr }
	/** `options?.version ?? fallback`: reads an optional field of an optional struct. */
	| { k: "optionField"; target: string; field: string; ty: Ty; fallback: Expr };

export type BinaryOp = "+" | "-" | "*" | "%" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "&&" | "||";

export type Stmt =
	| { k: "let"; name: string; ty: Ty; value: Expr; mutable: boolean }
	| { k: "assign"; name: string; value: Expr }
	| { k: "if"; test: Expr; then: Stmt[]; otherwise: Stmt[] }
	| { k: "return"; value?: Expr }
	| { k: "forOf"; name: string; ty: Ty; iterable: Expr; body: Stmt[] }
	| { k: "forRange"; name: string; from: Expr; until: Expr; body: Stmt[] }
	| { k: "throw"; error: string; message: Expr }
	| { k: "try"; body: Stmt[]; catchName: string; catchBody: Stmt[] }
	| { k: "expr"; value: Expr };

/** A record type: a struct in Go and Rust, a class in Java and C#, a dict-like in Python. */
export type StructDecl = {
	name: string;
	doc: string;
	fields: { name: string; ty: Ty; doc: string; domain?: number[] }[];
	/** Options structs are the second, optional argument of a public function. */
	isOptions: boolean;
	/** Records the runtime already declares, which no emitter writes out again. */
	external?: boolean;
};

/** A closed set of string values: `type StateCode = "AC" | "AL" | …`. */
export type EnumDecl = { name: string; doc: string; values: string[] };

/** An error type. `base` is another declared error, or undefined for a root error. */
export type ErrorDecl = {
	name: string;
	doc: string;
	base?: string;
	exported: boolean;
	/** The name and every name it inherits from, which is what a failure is matched on. */
	kinds: string[];
};

export type FuncDecl = {
	name: string;
	doc: string;
	params: Param[];
	ret: Ty;
	body: Stmt[];
	isAsync: boolean;
	exported: boolean;
	/** Whether the body waits on the network, directly or through another function. */
	blocking: boolean;
	/** Whether the body can raise, directly or through another function. */
	throws: boolean;
	/** The `@see` links of the source, carried into every target's documentation. */
	sources: { role: string; url: string }[];
};

/** A dataset: rows of values materialised by every emitter as native data. */
export type DataDecl = {
	name: string;
	doc: string;
	/** Column names, in order. Every row has one value per column. */
	columns: string[];
	rows: string[][];
	/** Row indexes grouped by the value of the first column, for the per key lookups. */
	groups: Record<string, number[]>;
	/** The order the rows are returned in when no key is given, baked at build time. */
	fullOrder: number[];
};

/** A compiled character class: sorted, non overlapping code point ranges. */
export type CharClass = { name: string; ranges: [number, number][]; negated: boolean };

/** One step of a compiled pattern: repeat a character class, optionally capturing it. */
export type PatternStep = { charClass: string; min: number; max: number; capture: boolean };

/** A compiled regular expression: anchored, and made only of repeated character classes. */
export type PatternDecl = { name: string; source: string; steps: PatternStep[] };

export type ConstDecl = { name: string; ty: Ty; expr: Expr };

export type Module = {
	name: string;
	doc: string;
	constants: ConstDecl[];
	charClasses: CharClass[];
	patterns: PatternDecl[];
	structs: StructDecl[];
	enums: EnumDecl[];
	errors: ErrorDecl[];
	functions: FuncDecl[];
	data: DataDecl[];
};

/**
 * The runtime surface every target implements. The frontend maps TypeScript's own string
 * methods onto these, so the author writes ordinary TypeScript and the semantics stay pinned.
 */
export const STD = {
	// strings
	len: { params: ["string"], ret: "int" },
	codeAt: { params: ["string", "int"], ret: "int" },
	slice: { params: ["string", "int", "int"], ret: "string" },
	upper: { params: ["string"], ret: "string" },
	/** Strips the code points JavaScript's `String.prototype.trim` strips — not the host's set. */
	trim: { params: ["string"], ret: "string" },
	padStart: { params: ["string", "int", "string"], ret: "string" },
	repeat: { params: ["string", "int"], ret: "string" },
	fromInt: { params: ["int"], ret: "string" },
	// compiled patterns
	patternTest: { params: ["pattern", "string"], ret: "bool" },
	patternCapture: { params: ["pattern", "string"], ret: "list<string>" },
	keepClass: { params: ["class", "string"], ret: "string" },
	classHas: { params: ["class", "string"], ret: "bool" },
	/** Reads the value of an optional the frontend has already proved present. */
	unwrap: { params: ["opt"], ret: "any" },
	// lists
	listLen: { params: ["list", "int"], ret: "int" },
	listGet: { params: ["list", "int"], ret: "any" },
	listPush: { params: ["list", "any"], ret: "void" },
	listEmpty: { params: [], ret: "list" },
	// datasets
	dataRows: { params: ["data", "string"], ret: "list" },
	dataAll: { params: ["data"], ret: "list" },
	dataHasKey: { params: ["data", "string"], ret: "bool" },
	/** Whether a list holds a value. */
	listHas: { params: ["list", "string"], ret: "bool" },
	// boundary questions only a dynamically typed host can answer with anything but a constant
	isNumber: { params: ["scalar"], ret: "bool" },
	isList: { params: ["any"], ret: "bool" },
	// json and http
	httpGet: { params: ["string", "int", "int"], ret: "named:HttpResponse" },
	jsonString: { params: ["json", "string"], ret: "string" },
	jsonInt: { params: ["json", "string"], ret: "int" },
	jsonTruthy: { params: ["json", "string"], ret: "bool" },
	jsonIsTrue: { params: ["json", "string"], ret: "bool" },
	// concurrency: the only primitive of the subset
	startAll: { params: ["function", "list", "string"], ret: "tasks" },
	firstSuccess: { params: ["tasks"], ret: "opt" },
	anyFailedWith: { params: ["tasks", "error"], ret: "bool" },
} as const;
