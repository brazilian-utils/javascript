/**
 * The Rust backend.
 *
 * Rust 2021, standard library only. `std` has no HTTP client and no regex engine, which is the
 * falsification exercise `docs/targets/rust-sketch.md` predicted; both frictions are handled
 * without a crate (a generated `Capabilities` trait for the first, a dedicated straight-line
 * scanner per pattern for the second, with an allocation-free backtracking matcher as the fallback
 * for a pattern shape a scanner cannot cover — see the "Regex" section below).
 *
 * Ownership. The shared Target AST carries no lifetimes, so this backend does not attempt the
 * sketch's `&str` parameters: every heap value (`String`, `Vec<T>`, a record) is owned wherever it
 * is bound — parameters, locals and struct fields alike. A borrow appears only where Rust supplies
 * one for free (a method call's `&self`, a `for` loop over `.iter()`) or where converting to owned
 * would be pointless (a fresh value returned by a call). The one recurring cost is `.to_owned()` at
 * points where a value has to be duplicated to satisfy the borrow checker; `docs/targets/rust.md`
 * has the accounting. `.to_owned()` is used uniformly rather than `.clone()` because it is exactly
 * as correct on a reference (`&str` → `String`) as on an owned value (`String` → `String`, via the
 * blanket `Clone` impl), so the printer never has to know which one it is looking at.
 *
 * `Fail<E>` is `Result<T, CoreError>`, one flat enum for the whole program rather than one type
 * per utility (the sketch's plan): every fallible generated function shares the same error type,
 * so a nested fallible call is exactly `let value = f(...)?;` — the idiomatic form, and simpler
 * than the sketch expected because there is never a type mismatch for `?` to bridge.
 */

import { computeBorrowableParams } from "../../analysis/borrows.ts";
import type { Backend, DriverEntry, SupportNeeds } from "../../backend/generate.ts";
import { ENGINE_VERSION } from "../../backend/generate.ts";
import type { TargetSpec } from "../../backend/lower.ts";
import type { Candidate } from "../../backend/select.ts";
import { LoweringTable, argIsAscii } from "../../backend/select.ts";
import type { TExpr, TFunc, TModule, TRecord, TStmt } from "../../backend/tast.ts";
import type { CProgram } from "../../core/ir.ts";
import type { CharRange, RegexNode } from "../../regex.ts";
import { complement } from "../../regex.ts";
import { BUILTIN_RECORDS, TRIM_CODE_POINTS } from "../../intrinsics/index.ts";
import type { SemType } from "../../types.ts";
import type { Value } from "../../values.ts";

export const RUST_CONFIG = {
	baseline: "Rust 2021",
	fileExtension: ".rs",
	dependencies: [] as string[],
	formatter: "rustfmt",
	linters: ["cargo clippy"],
};

/* ------------------------------------------------------------------ *
 * Naming
 * ------------------------------------------------------------------ */

/** Rust keywords a snake_cased source identifier can collide with (`type`, from `HolidayType`). */
const RUST_KEYWORDS = new Set([
	"as", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false", "fn", "for",
	"if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self",
	"Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while",
	"async", "await", "dyn", "abstract", "become", "box", "do", "final", "macro", "override", "priv",
	"typeof", "unsized", "virtual", "yield", "try",
]);

/** Escapes a Rust keyword with the raw-identifier prefix, so `type` becomes a usable field name. */
function escapeKeyword(name: string): string {
	return RUST_KEYWORDS.has(name) ? `r#${name}` : name;
}

/** camelCase or PascalCase to snake_case; the source language is always one of the two. */
function snake(name: string): string {
	const cleaned = name.replaceAll("$", "_").replace(/[-](.)/g, (_m, char: string) => char.toUpperCase());
	const snaked = cleaned
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
		.toLowerCase();
	return escapeKeyword(snaked);
}

function pascal(name: string): string {
	const cleaned = name.replaceAll("$", "_").replace(/[-_](.)/g, (_m, char: string) => char.toUpperCase());
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** The module's flat file identifier: also its `mod` name, so it has to be a valid identifier. */
function rustModuleName(sourcePath: string): string {
	return sourcePath.split("/").join("_").replaceAll("-", "_");
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export function rustType(type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return "bool";
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return "i64";
		case "Float":
			return "f64";
		case "String":
		case "Enum":
			return "String";
		case "List":
			return `Vec<${rustType(type.elem)}>`;
		case "Option":
			return `Option<${rustType(type.inner)}>`;
		case "Record":
			// The one record the engine defines that is not a plain struct: the capability
			// environment is threaded as a trait object, never constructed by generated code.
			return type.name === "Capabilities" ? "&dyn Capabilities" : pascal(type.name);
		case "Union":
			return pascal(type.name);
		case "Lambda":
			return `Box<dyn Fn(${type.params.map(rustType).join(", ")}) -> ${rustType(type.ret)}>`;
		case "Void":
			return "()";
		case "Never":
			return "()";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}

/** Whether a value of this type is `Copy`: never needs `.to_owned()`, and `.clone()` on it warns. */
function isCopyType(type: SemType): boolean {
	switch (type.kind) {
		case "Bool":
		case "Int":
		case "Float":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
		case "Void":
		case "Never":
			return true;
		case "Option":
			return isCopyType(type.inner);
		default:
			return false;
	}
}

/* ------------------------------------------------------------------ *
 * String and identifier literals
 * ------------------------------------------------------------------ */

/** Escapes a value as a Rust `&str` literal, ASCII only (Rust's escape syntax, not Go's/JS's). */
function rustString(value: string): string {
	let out = '"';
	for (const scalar of value) {
		const point = scalar.codePointAt(0)!;
		if (scalar === '"') out += '\\"';
		else if (scalar === "\\") out += "\\\\";
		else if (point === 0x0a) out += "\\n";
		else if (point === 0x0d) out += "\\r";
		else if (point === 0x09) out += "\\t";
		else if (point < 0x20 || point > 0x7e) out += `\\u{${point.toString(16)}}`;
		else out += scalar;
	}
	return `${out}"`;
}

/* ------------------------------------------------------------------ *
 * Record field types, for deciding when a field value needs `.to_owned()`.
 *
 * Rebuilt at the start of every `printModule` call from that module's own `TRecord`s, and seeded
 * once with the engine's own builtin records (`HttpRequest` and friends), which no module lists
 * in `TModule.records` under its own name.
 * ------------------------------------------------------------------ */

const recordFieldTypes = new Map<string, Map<string, SemType>>();
for (const record of BUILTIN_RECORDS) {
	recordFieldTypes.set(
		record.name,
		new Map(record.fields.map((field) => [field.name, field.optional ? { kind: "Option", inner: field.type } : field.type])),
	);
}

function rebuildRecordFieldTypes(records: readonly TRecord[]): void {
	for (const record of records) {
		recordFieldTypes.set(record.name, new Map(record.fields.map((field) => [field.name, field.type])));
	}
}

/**
 * A hoisted constant table (`hoistConstantTables` in the shared lowerer) is declared
 * `pub const NAME: &[T]`, Rust's own SCREAMING_SNAKE_CASE convention for a module-level constant;
 * the reference the lowerer rewrote the literal into keeps the original lowercase name, so these
 * two maps (rebuilt per module in `printModule`) are what let the printer reconcile the casing,
 * and know a constant's element type when a call needs `.to_owned()` to turn `&[T]` into `Vec<T>`.
 */
const hoistedConstantNames = new Set<string>();
const hoistedConstantTypes = new Map<string, SemType>();

function printedName(name: string): string {
	return hoistedConstantNames.has(name) ? name.toUpperCase() : name;
}

/* ------------------------------------------------------------------ *
 * Ownership: converting a value that may be a reference into one the target position owns.
 *
 * `print` never needs this by itself (see the module comment): a method call borrows its
 * receiver, a binary operator borrows both sides, an intrinsic's own text decides its own
 * borrowing. Only the handful of positions that build an owned aggregate — a record field, a list
 * item, `Some(...)`, a `let`/`assign`/`return` value, a call argument — ever need it, and each of
 * those calls `toOwned` with the type it expects there.
 * ------------------------------------------------------------------ */

function toOwned(expr: TExpr, expectedType: SemType | undefined): string {
	if (expectedType !== undefined && isCopyType(expectedType)) return print(expr);
	switch (expr.kind) {
		case "name":
			// The capability environment is `&dyn Capabilities`, never owned by generated code.
			if (expr.name === "env") return expr.name;
			return `${printedName(expr.name)}.to_owned()`;
		case "member":
			// Reuses `print`'s own "member" case (rather than repeating its target rendering here)
			// so a narrowed `Option` read goes through the same `.as_ref().unwrap()` rewrite either
			// way — whether the read stands alone or, as here, feeds an owning position.
			return `${print(expr)}.to_owned()`;
		case "lit":
			if (typeof expr.value === "string") return `${rustString(expr.value)}.to_string()`;
			if (Array.isArray(expr.value)) return print(expr);
			return print(expr);
		case "ternary":
			return `(if ${print(expr.test)} { ${toOwned(expr.then, expectedType)} } else { ${toOwned(expr.otherwise, expectedType)} })`;
		case "some": {
			const inner = expectedType !== undefined && expectedType.kind === "Option" ? expectedType.inner : undefined;
			return `Some(${toOwned(expr.inner, inner)})`;
		}
		case "none":
			return "None";
		default:
			// call, method, raw, binary, unary, index, record, list, lambda, zero: every one of
			// these already produces a fresh, owned value, so there is nothing to convert.
			return print(expr);
	}
}

/** The type of a place expression, resolved as far as the record field table can take it. */
function resolveType(expr: TExpr, scope: ReadonlyMap<string, SemType>): SemType | undefined {
	switch (expr.kind) {
		case "name":
			return scope.get(expr.name) ?? hoistedConstantTypes.get(expr.name);
		case "member": {
			const targetType = resolveType(expr.target, scope);
			if (targetType === undefined || targetType.kind !== "Record") return undefined;
			return recordFieldTypes.get(targetType.name)?.get(expr.name);
		}
		case "lit":
		case "list":
			return expr.type;
		default:
			return undefined;
	}
}

/**
 * A call argument: owned when the callee's parameter is (every generated parameter is owned).
 * When the type cannot be resolved — a candidate's own fragment reaching a nested call before any
 * scope exists (see `currentScope`) — `toOwned` still converts a bare name or field read, just
 * without being able to skip a `Copy` value's conversion as an optimization. That is never a
 * correctness problem (`.to_owned()` compiles, and is a plain unmodified copy, for any `Clone`
 * type, `Copy` ones included) and never a lint problem either: `clippy::clone_on_copy` matches the
 * method name `clone`, not `to_owned`, which is exactly why `toOwned` reaches for the latter.
 */
function callArg(expr: TExpr, scope: ReadonlyMap<string, SemType>): string {
	return toOwned(expr, resolveType(expr, scope));
}

/* ------------------------------------------------------------------ *
 * Regex: a dedicated matcher per pattern, compiled at engine build time.
 *
 * `std` has no regex engine (the sketch's second predicted friction). The engine knows every
 * pattern a project uses before it generates a single line of Rust, so there is no reason to make
 * the binary interpret a pattern tree at call time at all: each normalized pattern is compiled
 * here into a straight-line matching function (`re_match_N`, below) that only ever tests the exact
 * classes and counts that pattern names, in the order it names them. This is the fix the
 * coordinator's benchmark asked for (Go's `re.test` recompiles from source on every call): there
 * is no per-call compilation step to avoid here, because there is no run-time representation of
 * the pattern left to interpret.
 *
 * A "chain" pattern — the shape every pattern in this project actually has — is a top-level
 * sequence of plain character classes and repeated character classes, with no alternation and no
 * repeated group. `chainElementsOf` recognizes this shape and additionally requires that any
 * variable-length run (anything but an exact `{n}` or a bare class) have a class disjoint from
 * whatever immediately follows it: that is the maximal-munch property that lets the generated
 * scanner consume a run greedily, to the end of its own class, and never need to back off — the
 * two adjacent classes can never disagree about where one run ends and the next begins. Every
 * pattern `core/source` uses is exactly this: a fixed-count digit or alnum run, then a
 * variable-count mask-character run disjoint from it, repeated. `renderChainScanner` turns the
 * recognized element list directly into a `pub fn` built from two tiny generic helpers
 * (`re_take_fixed`/`re_take_class`, in `GENERIC_SUPPORT`) that slice `&str` forward once, with no
 * allocation anywhere.
 *
 * A pattern `chainElementsOf` refuses — alternation anywhere, a repeated group more complex than
 * one class, or two adjacent variable-length runs whose classes could overlap — falls back to
 * `re_test`/`ReNode` in `support.rs`: a backtracking matcher, structured exactly like `regex.ts`'s
 * own reference `matchNode` (greedy, try one more repetition before giving up and continuing), but
 * over `&str` byte slices instead of a collected `Vec<char>`, so it never allocates either. No
 * pattern in `core/source` takes this path today (see `LOWERING.md`'s `re.test` row and
 * `docs/targets/rust.md` for the rule this section implements), but the accepted regex subset is
 * not fully covered by the scanner, and soundness for whatever a project's patterns turn out to be
 * matters more than never emitting the fallback.
 * ------------------------------------------------------------------ */

/** One run in a chain pattern: `min === max` (and neither is `null`) means a fixed-count run. */
type ChainElement = {
	readonly ranges: readonly CharRange[];
	readonly negated: boolean;
	readonly min: number;
	readonly max: number | null;
};

function isFixed(element: ChainElement): boolean {
	return element.max !== null && element.max === element.min;
}

/** The positive code point set a class actually matches, negation resolved. */
function effectiveRanges(ranges: readonly CharRange[], negated: boolean): CharRange[] {
	return negated ? complement(ranges) : [...ranges];
}

/** Both range lists are already sorted and merged (every class is, from `regex.ts`'s parser). */
function rangesDisjoint(a: readonly CharRange[], b: readonly CharRange[]): boolean {
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		const x = a[i]!;
		const y = b[j]!;
		if (x.hi < y.lo) i++;
		else if (y.hi < x.lo) j++;
		else return false;
	}
	return true;
}

/**
 * Recognizes the "chain" shape (see the section comment) and answers its elements left to right,
 * or `undefined` when the pattern needs the fallback matcher instead.
 */
function chainElementsOf(node: RegexNode): ChainElement[] | undefined {
	const items: readonly RegexNode[] = node.kind === "seq" ? node.items : [node];
	const elements: ChainElement[] = [];
	for (const item of items) {
		if (item.kind === "class") {
			elements.push({ ranges: item.ranges, negated: item.negated, min: 1, max: 1 });
		} else if (item.kind === "repeat" && item.item.kind === "class") {
			// A `{0}` member matches nothing and never advances; it is pathological enough (and
			// absent from every real pattern) that falling the whole thing back is simpler than
			// reasoning about it here.
			if (item.min === 0 && item.max === 0) return undefined;
			elements.push({ ranges: item.item.ranges, negated: item.item.negated, min: item.min, max: item.max });
		} else {
			// Alternation, or a repeated group that is itself a sequence/alternation/repeat.
			return undefined;
		}
	}
	for (let i = 0; i < elements.length; i++) {
		const element = elements[i]!;
		if (isFixed(element)) continue;
		if (i === elements.length - 1) continue; // nothing follows: consume the rest, no ambiguity
		const next = elements[i + 1]!;
		// Two adjacent variable-length runs would need to negotiate how much each one takes; the
		// maximal-munch argument above only settles that question one run at a time.
		if (!isFixed(next)) return undefined;
		const ownSet = effectiveRanges(element.ranges, element.negated);
		const nextSet = effectiveRanges(next.ranges, next.negated);
		if (!rangesDisjoint(ownSet, nextSet)) return undefined;
	}
	return elements;
}

/** `c: u32` inline range test, the same idiom `re.retain` and `manual_range_contains` both use. */
function classPredicateExpr(ranges: readonly CharRange[], negated: boolean): string {
	const test = ranges
		.map((range) => (range.lo === range.hi ? `c == ${range.lo}` : `(${range.lo}..=${range.hi}).contains(&c)`))
		.join(" || ");
	const body = test === "" ? "false" : test;
	return negated ? `!(${body})` : body;
}

function renderChainScanner(name: string, elements: readonly ChainElement[]): string {
	const lines: string[] = [`pub fn ${name}(value: &str) -> bool {`];
	if (elements.length === 0) {
		// The empty chain: a pattern that only ever matches the empty string.
		lines.push("\tvalue.is_empty()", "}");
		return lines.join("\n");
	}
	lines.push("\tlet rest = value;");
	for (const element of elements) {
		const predicate = `|c: u32| ${classPredicateExpr(element.ranges, element.negated)}`;
		if (isFixed(element)) {
			lines.push(`\tlet Some(rest) = re_take_fixed(rest, ${element.min}, ${predicate}) else { return false; };`);
		} else {
			const max = element.max === null ? "usize::MAX" : String(element.max);
			lines.push(`\tlet Some(rest) = re_take_class(rest, ${element.min}, ${max}, ${predicate}) else { return false; };`);
		}
	}
	lines.push("\trest.is_empty()", "}");
	return lines.join("\n");
}

function renderReNode(node: RegexNode): string {
	switch (node.kind) {
		case "class": {
			const ranges = node.ranges.map((range) => `(${range.lo}, ${range.hi})`).join(", ");
			return `ReNode::Class(&[${ranges}], ${node.negated})`;
		}
		case "seq":
			return `ReNode::Seq(&[${node.items.map(renderReNode).join(", ")}])`;
		case "alt":
			return `ReNode::Alt(&[${node.options.map(renderReNode).join(", ")}])`;
		case "repeat":
			return `ReNode::Repeat(&${renderReNode(node.item)}, ${node.min}, ${node.max === null ? "None" : `Some(${node.max})`})`;
		default: {
			const exhaustive: never = node;
			return exhaustive;
		}
	}
}

type RePattern =
	| { readonly kind: "scanner"; readonly name: string; readonly rust: string }
	| { readonly kind: "fallback"; readonly name: string; readonly rust: string };

const rePatterns = new Map<string, RePattern>();
/** Whether any registered pattern took the fallback path — `supportModule` uses this to decide
 * whether `RE_MATCHER_SUPPORT` (dead weight otherwise) belongs in the emitted `support.rs`. */
let reFallbackUsed = false;

/** Registers (or reuses) the matcher for one regex, and answers its Rust identifier and kind. */
function registerPattern(node: RegexNode, source: string): RePattern {
	const existing = rePatterns.get(source);
	if (existing !== undefined) return existing;
	const index = rePatterns.size;
	const elements = chainElementsOf(node);
	const pattern: RePattern =
		elements !== undefined
			? { kind: "scanner", name: `re_match_${index}`, rust: renderChainScanner(`re_match_${index}`, elements) }
			: {
					kind: "fallback",
					name: `RE_PATTERN_${index}`,
					rust: `pub static RE_PATTERN_${index}: ReNode = ${renderReNode(node)};`,
				};
	if (pattern.kind === "fallback") reFallbackUsed = true;
	rePatterns.set(source, pattern);
	return pattern;
}

/* ------------------------------------------------------------------ *
 * Capability table
 * ------------------------------------------------------------------ */

const raw = (text: string): TExpr => ({ kind: "raw", text });

function binary(op: string): Candidate["emit"] {
	return (args) => ({ kind: "binary", op, left: args[0]!, right: args[1]! });
}

/**
 * An index or length as `usize`, the type every Rust indexing operation needs (the Core's own
 * index type is `i64`, matching every other integer). A literal is printed bare rather than cast:
 * Rust infers a bare integer literal's type from context (here, always `usize`, since indexing
 * demands it), and `clippy::unnecessary_cast` (default warn) is exactly what flags `12 as usize`
 * once that inference already gets there for free.
 */
function asUsize(expr: TExpr): string {
	if (expr.kind === "lit" && typeof expr.value === "bigint") return expr.value.toString();
	return `${print(expr)} as usize`;
}

/**
 * A borrow of a value for a support helper's `&str`/`&[T]` parameter (see `GENERIC_SUPPORT`'s own
 * comment on why every one of those borrows). A string literal is already `&'static str`, so
 * borrowing it again is a redundant double reference — harmless to run, but exactly what
 * `clippy::needless_borrow` (default warn) exists to catch — so this skips the `&` for one.
 */
function borrowed(expr: TExpr): string {
	if (expr.kind === "lit" && typeof expr.value === "string") return print(expr);
	// A candidate's own fragment (`str.trim`, say) ends in `.to_string()` because it is written to
	// be self-sufficient wherever it lands — including an owning position, where that is exactly
	// right. Immediately borrowing the String it just allocated is never right, though
	// (`clippy::unnecessary_to_owned`, default warn, is what catches it), and every case this
	// backend produces can just drop the conversion: what is left already borrows the original.
	if (expr.kind === "raw" && expr.text.endsWith(".to_string()")) {
		return expr.text.slice(0, -".to_string()".length);
	}
	// Likewise a fresh list literal: `&vec![1, 2, 3]` heap-allocates a `Vec` only to borrow it
	// once: `&[1, 2, 3]` is the same `&[T]` argument, `clippy::useless_vec`'s (default warn) point.
	if (expr.kind === "list") {
		const elem = expr.type.kind === "List" ? expr.type.elem : undefined;
		return `&[${expr.items.map((item) => toOwned(item, elem)).join(", ")}]`;
	}
	// A name already carrying its own reference — a parameter the borrow pre-pass found read-only
	// (`expr.borrowed`, set at lowering time; see `docs/decisions/0010-*.md`) or a hoisted constant
	// table (always `&[T]`, never owned) — needs no second `&`; that would be `&&str`/`&&[T]`,
	// exactly what `clippy::needless_borrow` (default warn) exists to catch, same as the cases above.
	if (expr.kind === "name" && (expr.borrowed === true || hoistedConstantNames.has(expr.name))) {
		return printedName(expr.name);
	}
	return `&${print(expr)}`;
}

/** `Ordering`'s discriminants are exactly -1/0/1, so a cast is the whole comparison. */
function orderingAsInt(a: TExpr, b: TExpr): TExpr {
	return raw(`(${print(a)}.cmp(&${print(b)}) as i64)`);
}

const cheap = { alloc: "none", time: "constant" } as const;
const linear = { alloc: "none", time: "linear" } as const;
const allocating = { alloc: "one", time: "linear" } as const;
const scalarPass = { alloc: "many", time: "linear" } as const;

export const RUST_CANDIDATES: readonly Candidate[] = [
	...["add:+", "sub:-", "mul:*"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return { op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) };
	}),
	{
		op: "int.div",
		impl: "native",
		because: "Rust's `/` truncates toward zero, which is the Core's rule",
		cost: cheap,
		emit: binary("/"),
	},
	{
		op: "int.mod",
		impl: "native",
		because: "Rust's `%` takes the sign of the dividend, which is the Core's rule",
		cost: cheap,
		emit: binary("%"),
	},
	...["add:+", "sub:-", "mul:*", "div:/"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return { op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) };
	}),
	{ op: "int.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{ op: "float.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{ op: "int.abs", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)}.abs()`) },
	{
		op: "int.min",
		impl: "native",
		cost: cheap,
		// `int.max(x, lo)` then `int.min(…, hi)` is how the source spells a clamp (there is no
		// clamp intrinsic); printed as two separate calls that is `x.max(lo).min(hi)`, exactly the
		// shape `clippy::manual_clamp` (default warn) asks to become `.clamp(lo, hi)`. Recognizing
		// it here, rather than adding a `clamp` intrinsic, keeps that merge a printer concern.
		emit: (args) => {
			const inner = args[0]!;
			if (inner.kind === "method" && inner.name === "max" && inner.args.length === 1) {
				return raw(`${print(inner.target)}.clamp(${print(inner.args[0]!)}, ${print(args[1]!)})`);
			}
			return { kind: "method", target: inner, name: "min", args: [args[1]!] };
		},
	},
	{
		op: "int.max",
		impl: "native",
		cost: cheap,
		emit: (args) => {
			const inner = args[0]!;
			if (inner.kind === "method" && inner.name === "min" && inner.args.length === 1) {
				return raw(`${print(inner.target)}.clamp(${print(args[1]!)}, ${print(inner.args[0]!)})`);
			}
			return { kind: "method", target: inner, name: "max", args: [args[1]!] };
		},
	},
	...["lt:<", "le:<=", "gt:>", "ge:>="].flatMap((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return [
			{ op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
			{ op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
		];
	}),
	{ op: "float.fromInt", impl: "native", cost: cheap, emit: (args) => raw(`(${print(args[0]!)} as f64)`) },
	{ op: "core.eq", impl: "native", cost: cheap, emit: binary("==") },

	{
		op: "opt.isNone",
		impl: "native",
		cost: cheap,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "is_none", args: [] }),
	},
	{
		op: "opt.unwrap",
		impl: "native",
		cost: cheap,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "unwrap", args: [] }),
	},
	{ op: "opt.some", impl: "native", cost: cheap, emit: (args) => ({ kind: "some", inner: args[0]! }) },
	{
		op: "opt.orElse",
		impl: "native",
		cost: cheap,
		// `unwrap_or`'s fallback has to match the `Option`'s own inner type exactly (a bare string
		// literal is `&str`, not the `String` an `Option<String>` needs), which is the one place a
		// candidate's own argument genuinely needs `toOwned` rather than a plain `print`.
		emit: (args, types) => {
			const inner = types[0]?.kind === "Option" ? types[0].inner : undefined;
			return raw(`${print(args[0]!)}.unwrap_or(${toOwned(args[1]!, inner)})`);
		},
	},

	{
		op: "str.len",
		impl: "native",
		requires: argIsAscii(0),
		because: "`str::len` counts bytes, which equals the scalar count only for ASCII",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)}.len() as i64)`),
	},
	{
		op: "str.len",
		impl: "native",
		because: "`chars().count()` walks scalars without allocating, unlike Go's `[]rune` conversion",
		cost: linear,
		emit: (args) => raw(`(${print(args[0]!)}.chars().count() as i64)`),
	},
	{
		op: "str.concat",
		impl: "library",
		because: "`concat2` borrows both operands, unlike `+`, which would consume the left one",
		cost: allocating,
		// Not `format!("{}{}", a, b)`: the Core builds a multi-piece join as nested binary
		// concatenations, so a template literal with several interpolations nests one `format!`
		// call inside another's arguments, which `clippy::format_in_format_args` (default warn)
		// catches every time. A plain function call nests without that concern.
		emit: (args) => raw(`crate::support::concat2(${borrowed(args[0]!)}, ${borrowed(args[1]!)})`),
	},
	{
		op: "str.codeAt",
		impl: "native",
		requires: argIsAscii(0),
		because: "indexing a byte string yields a byte",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)}.as_bytes()[${asUsize(args[1]!)}] as i64)`),
	},
	{
		op: "str.charAt",
		impl: "native",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => raw(`(${print(args[0]!)}.as_bytes()[${asUsize(args[1]!)}] as char).to_string()`),
	},
	{
		op: "str.codeAtOpt",
		impl: "library",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) => raw(`crate::support::code_at(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "str.charAtOpt",
		impl: "library",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => raw(`crate::support::char_at(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "str.slice",
		impl: "native",
		requires: argIsAscii(0),
		because: "slicing an ASCII string cuts at byte boundaries, which are scalar boundaries too",
		cost: allocating,
		emit: (args) =>
			raw(`${print(args[0]!)}[${asUsize(args[1]!)}..${asUsize(args[2]!)}].to_string()`),
	},
	{
		op: "str.indexOf",
		impl: "native",
		requires: argIsAscii(0),
		because: "`str::find` answers a byte offset",
		cost: linear,
		emit: (args) =>
			raw(`${print(args[0]!)}.find(${print(args[1]!)}).map_or(-1, |byte| byte as i64)`),
	},
	{
		op: "str.contains",
		impl: "native",
		cost: linear,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "contains", args: [args[1]!] }),
	},
	{
		op: "str.startsWith",
		impl: "native",
		cost: linear,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "starts_with", args: [args[1]!] }),
	},
	{
		op: "str.endsWith",
		impl: "native",
		cost: linear,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "ends_with", args: [args[1]!] }),
	},
	{
		op: "str.repeat",
		impl: "native",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.repeat(${asUsize(args[1]!)})`),
	},
	{
		op: "str.padStart",
		impl: "library",
		cost: allocating,
		emit: (args) =>
			raw(`crate::support::pad_start(${borrowed(args[0]!)}, ${print(args[1]!)}, ${borrowed(args[2]!)})`),
	},
	{
		op: "str.trim",
		impl: "native",
		because: "`trim_matches` takes the cut set explicitly, so the 25 code points are exact",
		cost: allocating,
		emit: (args) =>
			raw(
				`${print(args[0]!)}.trim_matches(|c: char| matches!(c as u32, ${TRIM_CODE_POINTS.join(" | ")})).to_string()`,
			),
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		requires: argIsAscii(0),
		because: "`to_ascii_uppercase` is only ASCII-equivalent on ASCII input",
		cost: allocating,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "to_ascii_uppercase", args: [] }),
	},
	{
		op: "str.asciiLower",
		impl: "native",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "to_ascii_lowercase", args: [] }),
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		because: "mapping only a-z, leaving every other scalar alone, is the Core's rule for any input",
		cost: allocating,
		emit: (args) =>
			raw(
				`${print(args[0]!)}.chars().map(|c| if c.is_ascii_lowercase() { c.to_ascii_uppercase() } else { c }).collect::<String>()`,
			),
	},
	{
		op: "str.asciiLower",
		impl: "native",
		because: "mapping only A-Z, leaving every other scalar alone, is the Core's rule for any input",
		cost: allocating,
		emit: (args) =>
			raw(
				`${print(args[0]!)}.chars().map(|c| if c.is_ascii_uppercase() { c.to_ascii_lowercase() } else { c }).collect::<String>()`,
			),
	},
	{
		op: "str.compare",
		impl: "native",
		because: "`Ord` on `str` compares UTF-8 bytes, which is code point order — like Go, unlike JavaScript",
		cost: linear,
		emit: (args) => orderingAsInt(args[0]!, args[1]!),
	},
	{
		op: "str.codePoints",
		impl: "library",
		cost: allocating,
		emit: (args) => raw(`crate::support::code_points(${borrowed(args[0]!)})`),
	},
	{
		op: "str.fromCodePoints",
		impl: "library",
		cost: allocating,
		emit: (args) => raw(`crate::support::from_code_points(${borrowed(args[0]!)})`),
	},
	{
		op: "str.asAscii",
		impl: "library",
		cost: linear,
		emit: (args) => raw(`crate::support::as_ascii(${borrowed(args[0]!)})`),
	},
	{
		op: "str.asDigits",
		impl: "library",
		cost: linear,
		emit: (args) => raw(`crate::support::as_digits(${borrowed(args[0]!)})`),
	},
	{
		op: "str.split",
		impl: "native",
		cost: allocating,
		emit: (args) =>
			raw(`${print(args[0]!)}.split(${print(args[1]!)}).map(str::to_string).collect::<Vec<String>>()`),
	},
	{
		op: "str.join",
		impl: "native",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.join(${print(args[1]!)})`),
	},
	{
		op: "str.fromInt",
		impl: "native",
		cost: allocating,
		emit: (args) => ({ kind: "method", target: args[0]!, name: "to_string", args: [] }),
	},
	{
		op: "str.parseInt",
		impl: "library",
		cost: linear,
		emit: (args) => raw(`crate::support::parse_digits(${borrowed(args[0]!)})`),
	},

	{
		op: "seq.at",
		impl: "library",
		cost: cheap,
		emit: (args) => raw(`crate::support::at(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "seq.get",
		impl: "library",
		cost: cheap,
		emit: (args) => raw(`crate::support::get_at(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "seq.len",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)}.len() as i64)`),
	},
	{
		op: "seq.push",
		impl: "native",
		cost: cheap,
		// Unlike every other method this table emits, `Vec::push` consumes its argument rather than
		// borrowing it, so — alone among them — it needs `toOwned` rather than a plain `print`, the
		// same reason `opt.orElse`'s fallback does above.
		emit: (args) => raw(`${print(args[0]!)}.push(${toOwned(args[1]!, undefined)})`),
	},
	{
		op: "seq.sum",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`${print(args[0]!)}.iter().sum::<i64>()`),
	},
	{
		op: "seq.contains",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`${print(args[0]!)}.contains(${borrowed(args[1]!)})`),
	},
	{
		op: "seq.indexOf",
		impl: "native",
		cost: linear,
		emit: (args) =>
			raw(`${print(args[0]!)}.iter().position(|item| item == ${borrowed(args[1]!)}).map_or(-1, |i| i as i64)`),
	},
	{
		op: "seq.concat",
		impl: "native",
		cost: allocating,
		emit: (args) =>
			raw(`${print(args[0]!)}.iter().chain(${print(args[1]!)}.iter()).cloned().collect::<Vec<_>>()`),
	},
	{
		op: "seq.slice",
		impl: "native",
		cost: allocating,
		emit: (args) =>
			raw(`${print(args[0]!)}[${asUsize(args[1]!)}..${asUsize(args[2]!)}].to_vec()`),
	},
	{
		op: "seq.reverse",
		impl: "native",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.iter().rev().cloned().collect::<Vec<_>>()`),
	},
	{
		op: "seq.sortStable",
		impl: "native",
		because: "`slice::sort` is a stable sort in Rust's own std, unlike Go's `sort.Slice`",
		cost: { alloc: "one", time: "nlogn" },
		emit: (args) => raw(`crate::support::sorted_stable(${borrowed(args[0]!)})`),
	},
	{
		op: "seq.sortStableBy",
		impl: "native",
		cost: { alloc: "one", time: "nlogn" },
		emit: (args) => raw(`crate::support::sorted_stable_by(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "seq.map",
		impl: "library",
		cost: allocating,
		emit: (args) => raw(`crate::support::mapped(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "seq.filter",
		impl: "library",
		cost: allocating,
		emit: (args) => raw(`crate::support::filtered(${borrowed(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "seq.any",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`${print(args[0]!)}.iter().any(${print(args[1]!)})`),
	},
	{
		op: "seq.all",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`${print(args[0]!)}.iter().all(${print(args[1]!)})`),
	},
	{
		op: "seq.find",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`${print(args[0]!)}.iter().find(${print(args[1]!)}).cloned()`),
	},

	{ op: "dec.fromScaled", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "dec.fromInt",
		impl: "native",
		cost: cheap,
		emit: (args, types) => raw(`(${print(args[0]!)} * ${10 ** scaleOf(types[1])})`),
	},
	{ op: "dec.add", impl: "native", cost: cheap, emit: binary("+") },
	{ op: "dec.sub", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "dec.mul", impl: "native", cost: cheap, emit: binary("*") },
	{ op: "dec.compare", impl: "native", cost: cheap, emit: (args) => orderingAsInt(args[0]!, args[1]!) },
	{ op: "dec.isNegative", impl: "native", cost: cheap, emit: (args) => raw(`(${print(args[0]!)} < 0)`) },
	{ op: "dec.abs", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)}.abs()`) },
	{ op: "dec.unscaled", impl: "native", cost: cheap, emit: (args) => args[0]! },

	{
		op: "date.clampEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`${print(args[0]!)}.clamp(-719162, 2932896)`),
	},
	{ op: "date.toEpochDays", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "date.fromEpochDays",
		impl: "library",
		cost: cheap,
		emit: (args) => raw(`crate::support::date_from_epoch_days(${print(args[0]!)})`),
	},
	{
		op: "date.fromYmd",
		impl: "portable",
		cost: linear,
		sourceFn: "std/date::ymdToDays",
		emit: (args, _types, ctx) => raw(`${portableCall("std/date::ymdToDays", ctx)}(${args.map(print).join(", ")})`),
	},
	{
		op: "date.year",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::yearFromDays",
		emit: (args, _types, ctx) => raw(`${portableCall("std/date::yearFromDays", ctx)}(${print(args[0]!)})`),
	},
	{
		op: "date.month",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::monthFromDays",
		emit: (args, _types, ctx) => raw(`${portableCall("std/date::monthFromDays", ctx)}(${print(args[0]!)})`),
	},
	{
		op: "date.day",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::dayFromDays",
		emit: (args, _types, ctx) => raw(`${portableCall("std/date::dayFromDays", ctx)}(${print(args[0]!)})`),
	},
	{
		op: "date.addDays",
		impl: "library",
		cost: cheap,
		emit: (args) => raw(`crate::support::date_from_epoch_days(${print(args[0]!)} + ${print(args[1]!)})`),
	},
	{ op: "date.diffDays", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "date.compare", impl: "native", cost: cheap, emit: (args) => orderingAsInt(args[0]!, args[1]!) },
	{
		op: "date.dayOfWeek",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(((${print(args[0]!)} + 3).rem_euclid(7)) + 1)`),
	},
	{
		op: "date.isLeapYear",
		impl: "native",
		cost: cheap,
		emit: (args) =>
			raw(`((${print(args[0]!)} % 4 == 0 && ${print(args[0]!)} % 100 != 0) || ${print(args[0]!)} % 400 == 0)`),
	},

	{
		op: "re.retain",
		impl: "native",
		because: "a `chars().filter(...)` pass over explicit ranges, with no regex engine involved",
		cost: allocating,
		emit: (args, _types, ctx) => {
			const ranges = ctx.regex === undefined || ctx.regex.node.kind !== "class" ? [] : ctx.regex.node.ranges;
			// `(lo..=hi).contains(&c)`, not `c >= lo && c <= hi`: the same range the class already
			// is, and what `clippy::manual_range_contains` (default warn) asks the latter to become.
			const test = ranges
				.map((range) => (range.lo === range.hi ? `c == ${range.lo}` : `(${range.lo}..=${range.hi}).contains(&c)`))
				.join(" || ");
			return raw(
				`${print(args[0]!)}.chars().filter(|&ch| { let c = ch as u32; ${test === "" ? "false" : test} }).collect::<String>()`,
			);
		},
	},
	{
		op: "re.test",
		// `std` has no regex engine, so this reaches into this backend's own support file — the
		// same reason Go classifies its `padStart` (its own generated helper) as "library" rather
		// than "native" — not into `std` itself, which is what "native" means throughout this table.
		impl: "library",
		because:
			"a dedicated straight-line scanner (no allocation, one pass) when the pattern is a chain " +
			"of character-class runs with no alternation and no two adjacent variable-length runs " +
			"that could overlap; otherwise a backtracking matcher over a static pattern tree, also " +
			"allocation-free — see engine/src/targets/rust/index.ts's \"Regex\" section for the rule",
		cost: linear,
		emit: (args, _types, ctx) => {
			const source = ctx.regex?.source ?? "";
			const pattern = ctx.regex === undefined ? undefined : registerPattern(ctx.regex.node, source);
			if (pattern === undefined) return raw("false");
			return pattern.kind === "scanner"
				? raw(`crate::support::${pattern.name}(${borrowed(args[0]!)})`)
				: raw(`crate::support::re_test(&crate::support::${pattern.name}, ${borrowed(args[0]!)})`);
		},
	},

	{
		op: "http.request",
		impl: "native",
		cost: { alloc: "many", time: "linear" },
		emit: (args, _types, ctx) => raw(`${print(ctx.env())}.request(${print(args[0]!)})`),
	},
	{
		op: "clock.now",
		impl: "native",
		cost: cheap,
		emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.now()`),
	},
	{
		op: "clock.sleep",
		impl: "native",
		cost: cheap,
		emit: (args, _types, ctx) => raw(`${print(ctx.env())}.sleep(${print(args[0]!)})`),
	},
	{ op: "clock.millis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.durationMillis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "clock.elapsed",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[1]!)} - ${print(args[0]!)}).max(0)`),
	},
	{
		op: "random.nextU32",
		impl: "native",
		cost: cheap,
		emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.next_u32()`),
	},
	{
		op: "task.race",
		impl: "library",
		because: "`std::thread::scope` plus an `mpsc` channel: one thread per task, first `Some` wins",
		cost: { alloc: "many", time: "linear" },
		emit: (args) => {
			const list = args[0]!;
			if (list.kind !== "list") return raw(`crate::support::race_first_some(vec![${print(list)}])`);
			const boxed = list.items
				// Not `move`: a task closure only ever needs to read what it captures (an argument, the
			// environment), and letting it borrow instead is what lets the *same* local be handed to
			// every task — each capture is a shared reference, and any number of those can coexist.
			.map((item) => `Box::new(|| ${printClosureBody(item)}) as Box<dyn FnOnce() -> _ + Send>`)
				.join(", ");
			return raw(`crate::support::race_first_some(vec![${boxed}])`);
		},
	},
];

/** A portable lowering's target sits in its own module, so the call needs a `crate::` path. */
function portableCall(qualified: string, ctx: Parameters<Candidate["emit"]>[2]): string {
	const [modulePath] = qualified.split("::");
	return `crate::${rustModuleName(modulePath!)}::${ctx.nameOf(qualified)}`;
}

/** The body of a lambda passed directly to `task.race`, as a closure body (`() -> Option<T>`). */
function printClosureBody(expr: TExpr): string {
	if (expr.kind !== "lambda") return `{ ${print(expr)}() }`;
	const body = withFnCtx({ ret: expr.ret, fails: [] }, () => printBody(expr.body, new Map()));
	return `{\n${body}\n}`;
}

function scaleOf(type: SemType | undefined): number {
	return type !== undefined && type.kind === "Int" ? Number(type.lo) : 0;
}

export const RUST_SPEC: TargetSpec = {
	name: "rust",
	table: new LoweringTable(RUST_CANDIDATES),
	naming: {
		func: (name) => snake(name),
		value: (name) => snake(name),
		field: (name) => snake(name),
		type: (name) => pascal(name),
		module: (path) => `src/${rustModuleName(path)}.rs`,
	},
	loopCombinators: new Set(["seq.fold", "seq.map", "seq.filter"]),
	statementTernary: false,
	errorsAsValues: true,
	asyncColouring: false,
	envType: { kind: "Record", name: "Capabilities" },
};

/* ------------------------------------------------------------------ *
 * Printer
 *
 * `print` is scope-free by design (see the module comment): it is called both from inside a
 * candidate's `emit` (lowering time, before any function's local scope exists) and from the
 * statement printer below (print time). The handful of positions that need to know whether a
 * value is owned or borrowed — record fields, list items, `return`, `let`, `assign`, call
 * arguments — go through `toOwned`/`callArg` instead, which take the expected type explicitly.
 * ------------------------------------------------------------------ */

export function print(expr: TExpr): string {
	switch (expr.kind) {
		case "lit":
			return literal(expr.value, expr.type);
		case "name":
			return printedName(expr.name);
		case "raw":
			return expr.text;
		case "call": {
			// Cross-module calls are not qualified at the call site (unlike a portable lowering's
			// or a support helper's, which this file writes by hand): a candidate's own `emit` can
			// call `print` on an argument that itself contains an ordinary Core function call,
			// which happens at lowering time, before any module's cross-module import data exists
			// to qualify it with. `crate::*` (see `printModule`) is what makes the bare name resolve
			// regardless of when the text was produced.
			//
			// `borrowedArgs[i]` (set at lowering time from the whole-program borrow map — see
			// `docs/decisions/0010-*.md`) says the callee's own parameter there was found read-only;
			// `borrowed()` is the same helper every support-function call already borrows its
			// arguments with, reused here rather than duplicated.
			const rendered = expr.args.map((arg, index) =>
				expr.borrowedArgs?.[index] === true ? borrowed(arg) : callArg(arg, currentScope),
			);
			return `${print(expr.callee)}(${rendered.join(", ")})`;
		}
		case "method":
			return `${print(expr.target)}.${snake(expr.name)}(${expr.args.map(print).join(", ")})`;
		case "member": {
			// A field read after a narrowed `Option` check (`if x === undefined { return … }`, then
			// `x.field`) is exactly this shape: the Core never re-types the local narrower, so the
			// `opt.unwrap` candidate still runs, once per read (see `docs/decisions/0009-*.md`). A
			// plain `.unwrap()` would move the option out on the first read and leave the second one
			// looking at a moved value, which is the one place `Option::unwrap`'s taking `self` by
			// value — unlike a Go pointer dereference, which repeats for free — actually bites; going
			// through `.as_ref()` borrows instead, and reads any number of times for the same reason
			// a reference does everywhere else in this backend.
			if (expr.target.kind === "method" && expr.target.name === "unwrap" && expr.target.args.length === 0) {
				return `${print(expr.target.target)}.as_ref().unwrap().${expr.name}`;
			}
			return `${print(expr.target)}.${expr.name}`;
		}
		case "index":
			return `${print(expr.target)}[${asUsize(expr.index)}]`;
		case "binary": {
			// `x == ""` / `x != ""` as `.is_empty()`: the Core has no dedicated emptiness check (an
			// author writes `value.length === 0` or `value === ""`, both `core.eq`), so the rewrite
			// belongs here rather than in a candidate. `clippy::comparison_to_empty` (default warn).
			if (expr.op === "==" || expr.op === "!==" || expr.op === "!=") {
				const empty = emptyStringCompare(expr);
				if (empty !== undefined) return empty;
			}
			// `x >= lo && x <= hi` as `(lo..=hi).contains(&x)`, and the `||`-negated shape as the
			// `!`-prefixed form: two source comparisons the Core has no range primitive to express
			// directly (`docs/semantics.md` admits `<`/`<=`/`>`/`>=`, not a range type), so a bounds
			// check is always written as the pair `clippy::manual_range_contains` (default warn)
			// already knows the idiom for.
			if (expr.op === "&&" || expr.op === "||") {
				const range = rangeContains(expr);
				if (range !== undefined) return range;
			}
			return `(${print(expr.left)} ${rustOperator(expr.op)} ${print(expr.right)})`;
		}
		case "unary": {
			// `is_none()` negated reads as `is_some()`, and `!(a == b)` as `a != b` — the same
			// rewrite Go's own printer makes, and for the same reason: the Core has no `!==`
			// primitive (a source `!==` lowers to `not(core.eq(...))`), so without this the printer
			// would otherwise hand `-D warnings` a `clippy::nonminimal_bool` finding on every one.
			if (expr.op === "!" && expr.operand.kind === "method" && expr.operand.args.length === 0) {
				if (expr.operand.name === "is_none") return `${print(expr.operand.target)}.is_some()`;
				if (expr.operand.name === "is_some") return `${print(expr.operand.target)}.is_none()`;
			}
			if (expr.op === "!" && expr.operand.kind === "binary" && expr.operand.op === "==") {
				return `(${print(expr.operand.left)} != ${print(expr.operand.right)})`;
			}
			const operand = print(expr.operand);
			// `binary` already parenthesizes itself, so wrapping it again would double up.
			const selfWrapped =
				expr.operand.kind === "name" ||
				expr.operand.kind === "call" ||
				expr.operand.kind === "method" ||
				expr.operand.kind === "binary" ||
				expr.operand.kind === "index" ||
				expr.operand.kind === "member";
			return selfWrapped ? `${expr.op}${operand}` : `${expr.op}(${operand})`;
		}
		case "ternary":
			// An `if`/`else` expression needs the same type on both arms, which a plain `print`
			// cannot promise (a literal branch prints as `&str`, a computed one as `String`) without
			// knowing the ternary's own type, which this function does not carry. `toOwned` with no
			// expected type still converts a bare name or literal, and leaves an already-owned
			// branch as it was, which is what reconciles the two sides for every case this backend
			// actually emits (a `Copy` branch is untouched either way — see `toOwned`'s own comment).
			return `(if ${print(expr.test)} { ${toOwned(expr.then, undefined)} } else { ${toOwned(expr.otherwise, undefined)} })`;
		case "list": {
			const elem = expr.type.kind === "List" ? expr.type.elem : undefined;
			return `vec![${expr.items.map((item) => toOwned(item, elem)).join(", ")}]`;
		}
		case "record": {
			const fields = recordFieldTypes.get(expr.typeName);
			const rendered = expr.fields
				.map((field) => `${field.name}: ${toOwned(field.value, fields?.get(fieldSourceName(field.name)))}`)
				.join(", ");
			const qualified = recordFieldTypes.has(expr.typeName) && isBuiltinRecord(expr.typeName);
			return `${qualified ? `crate::support::${expr.typeName}` : expr.typeName} { ${rendered} }`;
		}
		case "lambda": {
			const params = expr.params
				.map((param) => `${isCopyType(param.type) ? `&${param.name}` : param.name}: &${rustType(param.type)}`)
				.join(", ");
			const lambdaBody = withFnCtx({ ret: expr.ret, fails: [] }, () => printBody(expr.body, paramScope(expr.params)));
			return `|${params}| {\n${lambdaBody}\n}`;
		}
		case "none":
			return "None";
		case "zero":
			return "Default::default()";
		case "some":
			// `toOwned` with no expected type still converts a bare name or literal correctly (see
			// its own comment); `Some(...)` always needs an owned value, so this never wants a plain
			// `print` the way most of this function's other cases do.
			return `Some(${toOwned(expr.inner, undefined)})`;
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

const EMPTY_SCOPE: ReadonlyMap<string, SemType> = new Map();

/**
 * The scope `print` sees when it reaches a nested "call" node's arguments. Kept as module state,
 * not a `print` parameter, so `print` itself keeps the single-argument shape a candidate's `emit`
 * calls at lowering time (before any function's scope exists — `print` never needs one, since a
 * candidate's own fragments never construct a "call" node; see the module comment). `printBody`
 * sets this to the real scope for every statement it prints and restores it on the way out, so a
 * "call" reached while actually printing a function body resolves its arguments' types correctly.
 */
let currentScope: ReadonlyMap<string, SemType> = EMPTY_SCOPE;

function paramScope(params: readonly { readonly name: string; readonly type: SemType }[]): Map<string, SemType> {
	return new Map(params.map((param) => [param.name, param.type]));
}

/** A `TRecord` field name is already snake_cased; a builtin record's own field name is not. */
function fieldSourceName(name: string): string {
	return name;
}

function isBuiltinRecord(name: string): boolean {
	return BUILTIN_RECORDS.some((record) => record.name === name);
}

/** `x == ""` / `x != ""`, either operand order, as `x.is_empty()` / `!x.is_empty()`. */
function emptyStringCompare(expr: Extract<TExpr, { kind: "binary" }>): string | undefined {
	const isEmpty = (e: TExpr): boolean => e.kind === "lit" && typeof e.value === "string" && e.value === "";
	const other = isEmpty(expr.left) ? expr.right : isEmpty(expr.right) ? expr.left : undefined;
	if (other === undefined) return undefined;
	const negated = expr.op === "!=" || expr.op === "!==";
	return `${negated ? "!" : ""}${print(other)}.is_empty()`;
}

/** `x >= lo && x <= hi` (and the `||`-negated shape) as a `RangeInclusive`/`Range::contains`. */
function rangeContains(expr: Extract<TExpr, { kind: "binary" }>): string | undefined {
	if (expr.left.kind !== "binary" || expr.right.kind !== "binary") return undefined;
	const left = expr.left;
	const right = expr.right;
	if (left.left.kind !== "name" || right.left.kind !== "name" || left.left.name !== right.left.name) {
		return undefined;
	}
	const name = left.left.name;
	if (expr.op === "&&" && left.op === ">=" && right.op === "<=") {
		return `(${print(left.right)}..=${print(right.right)}).contains(&${name})`;
	}
	if (expr.op === "&&" && left.op === ">=" && right.op === "<") {
		return `(${print(left.right)}..${print(right.right)}).contains(&${name})`;
	}
	if (expr.op === "||" && left.op === "<" && right.op === ">") {
		return `!(${print(left.right)}..=${print(right.right)}).contains(&${name})`;
	}
	return undefined;
}

function rustOperator(op: string): string {
	switch (op) {
		case "===":
			return "==";
		case "!==":
			return "!=";
		default:
			return op;
	}
}

function literal(value: Value, type?: SemType): string {
	if (typeof value === "bigint") return value.toString();
	// Bare, not `.to_string()`: a string literal is already `&'static str`-compatible, which is
	// what every borrow context here wants (and a `match` pattern requires — `"a".to_string()` is
	// not a constant pattern at all); `toOwned`'s own "lit" case adds `.to_string()` wherever an
	// owned value is actually needed, before ever reaching this function.
	if (typeof value === "string") return rustString(value);
	if (typeof value === "boolean") return String(value);
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) {
		const elem = type !== undefined && type.kind === "List" ? type.elem : undefined;
		return `vec![${value.map((item) => literal(item, elem)).join(", ")}]`;
	}
	return "None";
}

/* ------------------------------------------------------------------ *
 * Statements
 * ------------------------------------------------------------------ */

type Scope = Map<string, SemType>;

function printBody(body: readonly TStmt[], scope: Scope): string {
	const previousScope = currentScope;
	currentScope = scope;
	try {
		return printBodyLines(body, scope);
	} finally {
		currentScope = previousScope;
	}
}

function printBodyLines(body: readonly TStmt[], scope: Scope): string {
	const lines: string[] = [];
	for (let i = 0; i < body.length; i++) {
		const statement = body[i]!;
		// The shared lowerer hoists a fallible call into `let (v, err) = call; if err != nil { ... }`
		// for a Go-shaped `errorsAsValues` target; here it collapses back into `let v = call()?;`,
		// which is what makes `?` — the idiomatic form — come out of the same shared nanopass.
		if (statement.kind === "multiLet" && statement.names.length === 2 && body[i + 1]?.kind === "if") {
			const [value] = statement.names;
			scope.set(value!, statement.types[0]!);
			lines.push(`let ${value} = ${print(statement.init)}?;`);
			i += 1; // the paired `if err != nil { return zero, err }` is now the `?` itself
			continue;
		}
		lines.push(printStmt(statement, scope));
	}
	return lines.join("\n");
}

function printStmt(statement: TStmt, scope: Scope): string {
	switch (statement.kind) {
		case "let":
			scope.set(statement.name, statement.type);
			return `let ${statement.mutable ? "mut " : ""}${statement.name} = ${toOwned(statement.init, statement.type)};`;
		case "multiLet":
			// Only reached with a name count other than 2, which the shared lowerer never produces.
			return `let (${statement.names.join(", ")}) = ${print(statement.init)};`;
		case "assign": {
			// `x = x + step` is how the Core always expresses an accumulator update (there is no
			// `+=` in the source language either); printing it as Rust's own compound assignment is
			// what `clippy::assign_op_pattern` (default warn) otherwise asks for on every one.
			const compound =
				statement.target.kind === "name" &&
				statement.value.kind === "binary" &&
				"+-*/%".includes(statement.value.op) &&
				statement.value.left.kind === "name" &&
				statement.value.left.name === statement.target.name;
			if (compound && statement.value.kind === "binary") {
				return `${statement.target.name} ${statement.value.op}= ${print(statement.value.right)};`;
			}
			return `${print(statement.target)} = ${toOwned(statement.value, resolveType(statement.target, scope))};`;
		}
		case "if": {
			const then = printBody(statement.then, new Map(scope));
			const otherwise = statement.otherwise.length === 0 ? "" : ` else {\n${printBody(statement.otherwise, new Map(scope))}\n}`;
			return `if ${print(statement.test)} {\n${then}\n}${otherwise}`;
		}
		case "switch": {
			const cases = statement.cases
				.map(
					(entry) =>
						`${entry.values.map((value) => literal(value)).join(" | ")} => {\n${printBody(entry.body, new Map(scope))}\n}`,
				)
				.join("\n");
			const fallback =
				statement.otherwise === undefined
					? `_ => unreachable!("the checker proves this switch exhaustive")`
					: `_ => {\n${printBody(statement.otherwise, new Map(scope))}\n}`;
			return `match ${print(statement.subject)} {\n${cases}\n${fallback}\n}`;
		}
		case "for": {
			const inner = new Map(scope);
			inner.set(statement.name, statement.type);
			const body = printBody(statement.body, inner);
			// The overwhelmingly common shape — ascending, step 1 — is an idiomatic Rust range; any
			// other step or direction (never produced by this project today) falls back to a plain
			// `while`, since Rust has no C-style `for` to carry an arbitrary step natively.
			if (statement.step === 1n && !statement.inclusive) {
				// A counted loop kept only for its trip count (`for (let attempt = 0; …)`, the
				// redraw-bounding pattern `docs/semantics.md` names) never reads its own counter,
				// which `unused_variables` (default warn) catches; `_name` is the same loop with the
				// warning it would otherwise need suppressing.
				const binding = new RegExp(`\\b${statement.name}\\b`).test(body) ? statement.name : `_${statement.name}`;
				return `for ${binding} in ${print(statement.from)}..${print(statement.to)} {\n${body}\n}`;
			}
			const forward = statement.step > 0n;
			const cmp = forward ? (statement.inclusive ? "<=" : "<") : statement.inclusive ? ">=" : ">";
			const update = statement.step === 1n ? "+= 1" : statement.step === -1n ? "-= 1" : `+= ${statement.step}`;
			return [
				"{",
				`\tlet mut ${statement.name}: i64 = ${print(statement.from)};`,
				`\twhile ${statement.name} ${cmp} ${print(statement.to)} {`,
				indent(body, 2),
				`\t\t${statement.name} ${update};`,
				"\t}",
				"}",
			].join("\n");
		}
		case "forEach": {
			const inner = new Map(scope);
			inner.set(statement.name, statement.type);
			const body = printBody(statement.body, inner);
			const binding = isCopyType(statement.type) ? `&${statement.name}` : statement.name;
			return `for ${binding} in ${print(statement.iterable)}.iter() {\n${body}\n}`;
		}
		case "return": {
			if (statement.value === undefined) {
				return currentFnCtx.fails.length === 0 ? "return;" : "return Ok(());";
			}
			const rendered = toOwned(statement.value, currentFnCtx.ret);
			return `return ${currentFnCtx.fails.length > 0 ? `Ok(${rendered})` : rendered};`;
		}
		case "throw": {
			const message = statement.args[0] === undefined ? `"".to_string()` : toOwned(statement.args[0], undefined);
			return `return Err(CoreError::${statement.errorClass} { message: ${message} });`;
		}
		case "break":
			return "break;";
		case "continue":
			return "continue;";
		case "expr":
			return `${print(statement.expr)};`;
		case "raw":
			return statement.text;
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

/**
 * The enclosing function's (or lambda's) return type and fallibility, for `return` alone — the
 * one statement whose rendering depends on something outside the statement tree itself. Module
 * state rather than a threaded parameter, for the same reason `currentScope` is: it lets `print`
 * stay a single-argument function. `printFunction` and the `lambda` case of `print` are the only
 * two places that set it (a lambda is never itself fallible, so it always installs `fails: []`).
 */
let currentFnCtx: { readonly ret: SemType; readonly fails: readonly string[] } = { ret: { kind: "Void" }, fails: [] };

function withFnCtx<T>(ctx: { readonly ret: SemType; readonly fails: readonly string[] }, run: () => T): T {
	const previous = currentFnCtx;
	currentFnCtx = ctx;
	try {
		return run();
	} finally {
		currentFnCtx = previous;
	}
}

function indent(text: string, levels: number): string {
	const pad = "\t".repeat(levels);
	return text
		.split("\n")
		.map((line) => (line === "" ? line : `${pad}${line}`))
		.join("\n");
}

/**
 * A parameter's declared type: `rustType` for every parameter but the ones the borrow pre-pass
 * (`analysis/borrows.ts`) found read-only, which print as a reference instead of an owned value —
 * `TParam.borrowed` is this function's only input, consulted rather than decided here, exactly the
 * way `docs/decisions/0010-*.md` describes. Only `String`/`List` have that distinction to make; a
 * `Capabilities` environment is handled separately, by its own always-borrowed case below.
 */
function rustParamType(type: SemType, borrowed: boolean): string {
	if (!borrowed) return rustType(type);
	if (type.kind === "String" || type.kind === "Enum") return "&str";
	if (type.kind === "List") return `&[${rustType(type.elem)}]`;
	return rustType(type);
}

export function printFunction(fn: TFunc): string {
	const scope = paramScope(fn.params.map((param) => ({ name: param.name, type: param.type })));
	const params = fn.params
		.map((param) => {
			if (param.type.kind === "Record" && param.type.name === "Capabilities") return `${param.name}: &dyn Capabilities`;
			return `${param.name}: ${rustParamType(param.type, param.borrowed === true)}`;
		})
		.join(", ");
	const returnType = fn.fails.length > 0 ? `Result<${rustType(fn.ret)}, CoreError>` : rustType(fn.ret);
	const doc = fn.doc === undefined ? "" : `${fn.doc.split("\n").map((line) => `/// ${line}`.trimEnd()).join("\n")}\n`;
	const body = withFnCtx({ ret: fn.ret, fails: fn.fails }, () => printBody(fn.body, scope));
	// `exported` (a utility) is `pub`, reachable from outside the crate through `lib.rs`'s flat
	// `pub use module::*;` re-export. `moduleExported` alone — the source module's own `export`,
	// which a library helper carries so other generated modules can call it — is `pub(crate)`: a
	// glob re-export silently drops an item that isn't at least as visible as the `pub use` itself
	// (verified against rustc directly), so this never leaks a library helper past the crate the
	// way a plain `pub` would. Neither flag set means the source never exported it at all, and
	// every caller found in `docs/semantics.md`'s survey lives in the same module, so a bare `fn`
	// — visible only here — is enough.
	const visibility = fn.exported ? "pub " : fn.moduleExported ? "pub(crate) " : "";
	return `${doc}${visibility}fn ${fn.name}(${params}) -> ${returnType} {\n${indent(body, 1)}\n}`;
}

export function printRecord(record: TRecord): string {
	const doc = record.doc === undefined ? "" : `/// ${record.doc.split("\n")[0]}\n`;
	const fields = record.fields.map((field) => `\tpub ${field.name}: ${rustType(field.type)},`).join("\n");
	return `${doc}#[derive(Clone, Debug, PartialEq)]\npub struct ${record.name} {\n${fields}\n}`;
}

/** A hoisted constant table: always a list literal of a Copy element type (see `hoistConstantTables`). */
function printConstant(name: string, value: TExpr): string {
	const elem = value.kind === "lit" && Array.isArray(value.value) && value.type.kind === "List" ? value.type.elem : undefined;
	const items = value.kind === "lit" && Array.isArray(value.value) ? value.value : [];
	const rendered = items.map((item) => literal(item, elem)).join(", ");
	return `pub const ${name.toUpperCase()}: &[${elem === undefined ? "i64" : rustType(elem)}] = &[${rendered}];`;
}

export function printModule(module: TModule): string {
	rebuildRecordFieldTypes(module.records);
	hoistedConstantNames.clear();
	hoistedConstantTypes.clear();
	for (const constant of module.constants) {
		hoistedConstantNames.add(constant.name);
		hoistedConstantTypes.set(constant.name, constant.type);
	}
	const rendered = [
		...module.records.map(printRecord),
		...module.constants.map((constant) => printConstant(constant.name, constant.value)),
		...module.functions.map(printFunction),
	].join("\n\n");
	// A plain function call is never qualified at its call site (see the "call" case of `print`),
	// so every module needs every other module's public items in scope; `lib.rs` re-exports each
	// module flatly (`pub use lib_digits::*;` and so on) for this glob to resolve against. Every
	// module gets it unconditionally rather than only the ones `computeImports` says reach outside
	// themselves, because that signal also fires for a portable or capability-only dependency this
	// file already qualifies explicitly (`crate::std_date::...`, `&dyn Capabilities`) — a real but
	// imprecise "might not end up using the glob" case that `unused_imports` would otherwise catch;
	// `lib.rs`'s crate-level `#![allow(unused_imports)]` is what that imprecision costs.
	const glob = "use crate::*;\n\n";
	return `${module.header}\n\n${glob}${rendered}\n`;
}

function importPath(_from: string, to: string): string {
	return rustModuleName(to);
}

/* ------------------------------------------------------------------ *
 * Support file: the capability trait, the JSON-free helpers the capability table names, and the
 * hand-written regex matcher.
 * ------------------------------------------------------------------ */

/**
 * The fallback matcher, for a pattern `chainElementsOf` (in the "Regex" section above) refused. It
 * is a direct port of \`regex.ts\`'s own reference matcher (\`matchNode\`): continuation-passing
 * backtracking over \`&str\` byte slices, greedy repeats trying one more repetition before giving up
 * and continuing. Porting that exact algorithm, rather than a from-scratch one, is what makes this
 * side sound without a separate proof: it is already what the engine's own tests check every
 * accepted pattern against.
 *
 * There is no allocation anywhere in it. \`Class\` borrows a suffix of its input; \`Seq\` and
 * \`Repeat\` build their continuations as stack-local closures passed by reference (\`&dyn Fn\`,
 * never \`Box\`), so backtracking costs stack frames, not heap traffic — the "Vec<char> and a
 * per-node Vec<usize> on every call" problem this whole fix exists to remove never had to be
 * replaced with a differently-shaped allocation, because CPS over slices does not need one.
 */
const RE_MATCHER_SUPPORT = `
/// One node of a normalized regex, compiled at engine build time into a \`static\` value: every
/// child is a \`&'static\` reference to a const expression, so rustc places the whole tree in the
/// binary's read-only data once. There is no run-time compilation step to avoid.
pub enum ReNode {
	Class(&'static [(u32, u32)], bool),
	Seq(&'static [ReNode]),
	Alt(&'static [ReNode]),
	Repeat(&'static ReNode, usize, Option<usize>),
}

fn re_class_matches(ranges: &[(u32, u32)], negated: bool, scalar: u32) -> bool {
	let hit = ranges.iter().any(|&(lo, hi)| scalar >= lo && scalar <= hi);
	hit != negated
}

/// Matches \`node\` at the front of \`rest\`, then hands whatever remains to \`cont\`; answers true for
/// the first way through \`node\` (greedy branch first) whose continuation also accepts. \`rest\` is
/// always a UTF-8 boundary slice of the original input, so every step is a borrow, never a copy.
fn re_match<'a>(node: &'static ReNode, rest: &'a str, cont: &dyn Fn(&'a str) -> bool) -> bool {
	match node {
		ReNode::Class(ranges, negated) => match rest.chars().next() {
			Some(c) if re_class_matches(ranges, *negated, c as u32) => cont(&rest[c.len_utf8()..]),
			_ => false,
		},
		ReNode::Seq(items) => re_match_seq(items, rest, cont),
		ReNode::Alt(options) => options.iter().any(|option| re_match(option, rest, cont)),
		ReNode::Repeat(item, min, max) => re_match_repeat(item, *min, max.unwrap_or(usize::MAX), 0, rest, cont),
	}
}

fn re_match_seq<'a>(items: &'static [ReNode], rest: &'a str, cont: &dyn Fn(&'a str) -> bool) -> bool {
	match items.split_first() {
		None => cont(rest),
		Some((first, remaining)) => {
			let next_cont = move |next: &'a str| re_match_seq(remaining, next, cont);
			re_match(first, rest, &next_cont)
		}
	}
}

fn re_match_repeat<'a>(
	item: &'static ReNode,
	min: usize,
	limit: usize,
	count: usize,
	rest: &'a str,
	cont: &dyn Fn(&'a str) -> bool,
) -> bool {
	if count < limit {
		let rest_len = rest.len();
		// A zero-width repetition would loop forever; the accepted subset never needs one (an
		// empty repeated item is rejected up front), so the length check is just that guard.
		let advance_cont =
			move |next: &'a str| next.len() != rest_len && re_match_repeat(item, min, limit, count + 1, next, cont);
		if re_match(item, rest, &advance_cont) {
			return true;
		}
	}
	count >= min && cont(rest)
}

/// Whether \`value\` fully matches \`pattern\`, anchored at both ends (the only mode the Core admits).
pub fn re_test(pattern: &'static ReNode, value: &str) -> bool {
	re_match(pattern, value, &|rest| rest.is_empty())
}
`;

// Every helper below takes its arguments borrowed, not owned — unlike a generated project
// function (see the module comment on ownership), which is why every call site in the capability
// table borrows explicitly (`&value`, never bare `value`): a reference is `Copy`, so the same
// local can be handed to as many of these calls as an operation needs, in a loop or anywhere
// else, without the caller ever losing it. Project functions cannot do the same for one another in
// general (an owned parameter may need to be stored, not just read), but every one of *these*
// helpers only ever reads.
const GENERIC_SUPPORT = `
pub fn concat2(a: &str, b: &str) -> String {
	let mut out = String::with_capacity(a.len() + b.len());
	out.push_str(a);
	out.push_str(b);
	out
}

pub fn code_points(value: &str) -> Vec<i64> {
	value.chars().map(|c| c as i64).collect()
}

pub fn from_code_points(points: &[i64]) -> String {
	points
		.iter()
		.map(|&p| char::from_u32(p as u32).unwrap_or('\\u{fffd}'))
		.collect()
}

pub fn as_ascii(value: &str) -> Option<String> {
	if value.chars().all(|c| (c as u32) < 0x80) {
		Some(value.to_string())
	} else {
		None
	}
}

pub fn as_digits(value: &str) -> Option<String> {
	if !value.is_empty() && value.chars().all(|c| c.is_ascii_digit()) {
		Some(value.to_string())
	} else {
		None
	}
}

pub fn parse_digits(value: &str) -> Option<i64> {
	if value.is_empty() || value.len() > 18 || !value.chars().all(|c| c.is_ascii_digit()) {
		return None;
	}
	value.parse::<i64>().ok()
}

/// Consumes exactly \`count\` chars matching \`in_class\` off the front of \`rest\`, or answers \`None\`
/// without consuming anything. One forward pass, no allocation: this and \`re_take_class\` below are
/// the whole of a generated chain-pattern scanner (\`re_match_N\`, in the "Regex" section of
/// engine/src/targets/rust/index.ts) — a fixed-count class run in the pattern becomes one call here.
#[inline]
fn re_take_fixed(rest: &str, count: usize, in_class: impl Fn(u32) -> bool) -> Option<&str> {
	let mut consumed = 0usize;
	let mut taken = 0usize;
	for c in rest.chars() {
		if taken == count {
			break;
		}
		if !in_class(c as u32) {
			return None;
		}
		consumed += c.len_utf8();
		taken += 1;
	}
	if taken < count {
		return None;
	}
	Some(&rest[consumed..])
}

/// Consumes as many chars matching \`in_class\` as \`rest\` offers, up to \`max\` (\`usize::MAX\` for
/// unbounded), then answers \`None\` unless at least \`min\` were taken. The maximal-munch property
/// \`chainElementsOf\` checks at generation time (see the "Regex" section) is what makes always
/// taking the longest available run — never backing off to try a shorter one — correct here.
#[inline]
fn re_take_class(rest: &str, min: usize, max: usize, in_class: impl Fn(u32) -> bool) -> Option<&str> {
	let mut consumed = 0usize;
	let mut taken = 0usize;
	for c in rest.chars() {
		if taken >= max || !in_class(c as u32) {
			break;
		}
		consumed += c.len_utf8();
		taken += 1;
	}
	if taken < min {
		return None;
	}
	Some(&rest[consumed..])
}

pub fn pad_start(value: &str, length: i64, pad: &str) -> String {
	let scalars: Vec<char> = value.chars().collect();
	let length = length as usize;
	if scalars.len() >= length {
		return value.to_string();
	}
	let pad_scalars: Vec<char> = pad.chars().collect();
	let mut prefix = String::new();
	for _ in 0..(length - scalars.len()) {
		prefix.extend(pad_scalars.iter());
	}
	prefix + value
}

pub fn code_at(value: &str, index: i64) -> Option<i64> {
	let bytes = value.as_bytes();
	if index < 0 || index as usize >= bytes.len() {
		return None;
	}
	Some(bytes[index as usize] as i64)
}

pub fn char_at(value: &str, index: i64) -> Option<String> {
	let bytes = value.as_bytes();
	if index < 0 || index as usize >= bytes.len() {
		return None;
	}
	Some((bytes[index as usize] as char).to_string())
}

pub fn at<T: Clone>(values: &[T], index: i64) -> Option<T> {
	if index < 0 {
		return None;
	}
	values.get(index as usize).cloned()
}

pub fn get_at<T: Clone>(values: &[T], index: i64) -> T {
	values[index as usize].clone()
}

pub fn mapped<T, R>(values: &[T], f: impl Fn(&T) -> R) -> Vec<R> {
	values.iter().map(f).collect()
}

pub fn filtered<T: Clone>(values: &[T], keep: impl Fn(&T) -> bool) -> Vec<T> {
	values.iter().filter(|v| keep(v)).cloned().collect()
}

pub fn sorted_stable<T: Clone + Ord>(values: &[T]) -> Vec<T> {
	let mut out = values.to_vec();
	out.sort();
	out
}

pub fn sorted_stable_by<T: Clone, K: Ord>(values: &[T], key: impl Fn(&T) -> K) -> Vec<T> {
	let mut out = values.to_vec();
	out.sort_by_key(key);
	out
}

pub fn date_from_epoch_days(days: i64) -> Option<i64> {
	if !(-719162..=2932896).contains(&days) {
		return None;
	}
	Some(days)
}
`;

const RACE_SUPPORT = `
/// Runs each task on its own thread and answers the first one that lands \`Some\`. Cancellation is
/// best effort and semantically unobservable, exactly as \`docs/semantics.md\` describes: a losing
/// task may run to completion, and its answer is dropped on the floor. Tasks are matched to
/// completion order through a channel, not through joining threads in task order, which is what
/// makes this "the first task that answers" rather than "the first task in the list".
pub fn race_first_some<'scope, T: Send + 'scope>(
	tasks: Vec<Box<dyn FnOnce() -> Option<T> + Send + 'scope>>,
) -> Option<T> {
	let count = tasks.len();
	let (sender, receiver) = std::sync::mpsc::channel::<Option<T>>();
	std::thread::scope(|scope| {
		for task in tasks {
			let sender = sender.clone();
			scope.spawn(move || {
				let _ = sender.send(task());
			});
		}
		drop(sender);
		for _ in 0..count {
			if let Ok(Some(value)) = receiver.recv() {
				return Some(value);
			}
		}
		None
	})
}
`;

const CAPABILITIES_SUPPORT = `
/// One request or response header. Headers are an ordered list, never a map, so every target
/// preserves order and duplicates.
#[derive(Clone, Debug, PartialEq)]
pub struct HttpHeader {
	pub name: String,
	pub value: String,
}

/// A request handed to the Http capability. The host adds no retries and no hidden headers.
#[derive(Clone, Debug, PartialEq)]
pub struct HttpRequest {
	pub method: String,
	pub url: String,
	pub headers: Vec<HttpHeader>,
	pub body: String,
	pub timeout_millis: i64,
}

/// A response from the Http capability. A status of 400 or more is a value, not a failure.
#[derive(Clone, Debug, PartialEq)]
pub struct HttpResponse {
	pub status: i64,
	pub headers: Vec<HttpHeader>,
	pub body: String,
}

/// Everything the generated core needs from the outside world. \`std\` has neither an HTTP client
/// nor a source of randomness or wall-clock time in one place, so the core takes this trait and
/// leaves the default implementation to the host — the same split every other capability
/// intrinsic uses, and the first friction \`docs/targets/rust-sketch.md\` predicted.
///
/// \`task.race\` spawns one thread per task (see \`race_first_some\` above), so an implementation has
/// to be safe to share across threads; \`Sync\` is what that costs a hand-written implementation
/// that \`std\` alone cannot supply.
pub trait Capabilities: Sync {
	/// A transport error or a timeout answers \`None\`; a 4xx or 5xx status is a value.
	fn request(&self, request: HttpRequest) -> Option<HttpResponse>;
	fn now(&self) -> i64;
	fn sleep(&self, millis: i64);
	fn next_u32(&self) -> i64;
}
`;

function supportModule(_program: CProgram, needs: SupportNeeds): { path: string; text: string } {
	const parts = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: support",
		"#![allow(dead_code)]",
		"",
		GENERIC_SUPPORT.trim(),
	];
	// `RE_MATCHER_SUPPORT` backs only the fallback path (see the "Regex" section above); a project
	// whose patterns all take the dedicated-scanner path, like this one, never needs it, and
	// `#![allow(dead_code)]` above does not excuse shipping a matcher nothing calls.
	if (reFallbackUsed) parts.push("", RE_MATCHER_SUPPORT.trim());
	parts.push("", ...[...rePatterns.values()].map((pattern) => pattern.rust));
	if (needs.race) parts.push("", RACE_SUPPORT.trim());
	if (needs.env) parts.push("", CAPABILITIES_SUPPORT.trim());
	return { path: "src/support.rs", text: `${parts.join("\n")}\n` };
}

function errorsModule(program: CProgram): { path: string; text: string } | undefined {
	const declared = [...program.errors.values()];
	if (declared.length === 0) return undefined;
	const lines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: errors",
		"",
		"/// Every domain error the project declares, as one flat enum: a nested fallible call is",
		"/// `f(...)?` because every fallible function shares this one error type, with never a",
		"/// mismatch for `?` to bridge. The sketch expected one type per utility; this is simpler,",
		"/// and loses nothing `errors.Is`-shaped, since the variant itself is the family membership",
		"/// test (`matches!(err, CoreError::SomeVariant { .. })`).",
		"#[derive(Clone, Debug, PartialEq)]",
		"pub enum CoreError {",
		...declared.map((error) => `\t${error.name} { message: String },`),
		"}",
		"",
		"impl std::fmt::Display for CoreError {",
		"\tfn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {",
		"\t\tmatch self {",
		...declared.map((error) => `\t\t\tCoreError::${error.name} { message } => write!(f, "{}", message),`),
		"\t\t}",
		"\t}",
		"}",
		"",
		"impl std::error::Error for CoreError {}",
		"",
	];
	return { path: "src/errors.rs", text: lines.join("\n") };
}

/* ------------------------------------------------------------------ *
 * Driver: `Cargo.toml`, `src/lib.rs` and the differential driver binary.
 *
 * The driver speaks the same `{"fn":...,"args":[...]}` / `{"ok":...}` line protocol as every
 * other target. `std` has no JSON, so this file hand-writes a minimal reader and writer for it —
 * driver code, not project code, in the same sense the regex matcher above is: nothing here is a
 * dependency, it is the one piece of machinery the differential harness needs that `std` does not
 * supply.
 * ------------------------------------------------------------------ */

const emittedModules: { path: string }[] = [];

const JSON_SUPPORT = `
//! A minimal JSON reader and writer for the differential driver's own protocol. This is driver
//! code, not project code: the driver has to speak JSON lines to the conformance harness, and
//! \`std\` has none, so this is the one piece of machinery it needs that \`std\` does not supply —
//! not a general-purpose JSON library, just enough to round-trip the protocol's own shapes
//! (numbers, strings, bools, null, arrays and objects of those).

#[derive(Clone, Debug, PartialEq)]
pub enum Json {
	Null,
	Bool(bool),
	Number(f64),
	String(String),
	Array(Vec<Json>),
	Object(Vec<(String, Json)>),
}

impl Json {
	pub fn as_str(&self) -> &str {
		match self {
			Json::String(s) => s,
			_ => "",
		}
	}

	pub fn as_i64(&self) -> i64 {
		match self {
			Json::Number(n) => *n as i64,
			_ => 0,
		}
	}

	pub fn as_f64(&self) -> f64 {
		match self {
			Json::Number(n) => *n,
			_ => 0.0,
		}
	}

	pub fn as_bool(&self) -> bool {
		matches!(self, Json::Bool(true))
	}

	pub fn as_array(&self) -> &[Json] {
		match self {
			Json::Array(items) => items,
			_ => &[],
		}
	}

	pub fn get(&self, key: &str) -> Option<&Json> {
		match self {
			Json::Object(fields) => fields.iter().find(|(name, _)| name == key).map(|(_, value)| value),
			_ => None,
		}
	}
}

pub fn parse(text: &str) -> Json {
	let chars: Vec<char> = text.chars().collect();
	let mut pos = 0usize;
	parse_value(&chars, &mut pos)
}

fn skip_space(chars: &[char], pos: &mut usize) {
	while *pos < chars.len() && chars[*pos].is_whitespace() {
		*pos += 1;
	}
}

fn parse_value(chars: &[char], pos: &mut usize) -> Json {
	skip_space(chars, pos);
	match chars.get(*pos) {
		Some('{') => parse_object(chars, pos),
		Some('[') => parse_array(chars, pos),
		Some('"') => Json::String(parse_string(chars, pos)),
		Some('t') => {
			*pos += 4;
			Json::Bool(true)
		}
		Some('f') => {
			*pos += 5;
			Json::Bool(false)
		}
		Some('n') => {
			*pos += 4;
			Json::Null
		}
		_ => parse_number(chars, pos),
	}
}

fn parse_object(chars: &[char], pos: &mut usize) -> Json {
	*pos += 1;
	let mut fields = Vec::new();
	skip_space(chars, pos);
	if chars.get(*pos) == Some(&'}') {
		*pos += 1;
		return Json::Object(fields);
	}
	loop {
		skip_space(chars, pos);
		let key = parse_string(chars, pos);
		skip_space(chars, pos);
		*pos += 1; // ':'
		let value = parse_value(chars, pos);
		fields.push((key, value));
		skip_space(chars, pos);
		match chars.get(*pos) {
			Some(',') => {
				*pos += 1;
			}
			_ => {
				*pos += 1; // '}'
				break;
			}
		}
	}
	Json::Object(fields)
}

fn parse_array(chars: &[char], pos: &mut usize) -> Json {
	*pos += 1;
	let mut items = Vec::new();
	skip_space(chars, pos);
	if chars.get(*pos) == Some(&']') {
		*pos += 1;
		return Json::Array(items);
	}
	loop {
		let value = parse_value(chars, pos);
		items.push(value);
		skip_space(chars, pos);
		match chars.get(*pos) {
			Some(',') => {
				*pos += 1;
			}
			_ => {
				*pos += 1; // ']'
				break;
			}
		}
	}
	Json::Array(items)
}

fn parse_string(chars: &[char], pos: &mut usize) -> String {
	*pos += 1; // opening quote
	let mut out = String::new();
	while let Some(&c) = chars.get(*pos) {
		*pos += 1;
		if c == '"' {
			break;
		}
		if c == '\\\\' {
			let escaped = chars.get(*pos).copied().unwrap_or('\\\\');
			*pos += 1;
			match escaped {
				'n' => out.push('\\n'),
				'r' => out.push('\\r'),
				't' => out.push('\\t'),
				'u' => {
					let hex: String = chars[*pos..*pos + 4].iter().collect();
					*pos += 4;
					if let Ok(code) = u32::from_str_radix(&hex, 16) {
						if let Some(scalar) = char::from_u32(code) {
							out.push(scalar);
						}
					}
				}
				other => out.push(other),
			}
		} else {
			out.push(c);
		}
	}
	out
}

fn parse_number(chars: &[char], pos: &mut usize) -> Json {
	let start = *pos;
	while chars
		.get(*pos)
		.is_some_and(|c| c.is_ascii_digit() || *c == '-' || *c == '+' || *c == '.' || *c == 'e' || *c == 'E')
	{
		*pos += 1;
	}
	let text: String = chars[start..*pos].iter().collect();
	Json::Number(text.parse::<f64>().unwrap_or(0.0))
}

pub fn write(value: &Json) -> String {
	match value {
		Json::Null => "null".to_string(),
		Json::Bool(b) => b.to_string(),
		Json::Number(n) => {
			if n.fract() == 0.0 && n.abs() < 1e15 {
				format!("{}", *n as i64)
			} else {
				format!("{}", n)
			}
		}
		Json::String(s) => write_string(s),
		Json::Array(items) => format!("[{}]", items.iter().map(write).collect::<Vec<_>>().join(",")),
		Json::Object(fields) => format!(
			"{{{}}}",
			fields
				.iter()
				.map(|(key, value)| format!("{}:{}", write_string(key), write(value)))
				.collect::<Vec<_>>()
				.join(",")
		),
	}
}

fn write_string(value: &str) -> String {
	let mut out = String::from("\\"");
	for c in value.chars() {
		match c {
			'"' => out.push_str("\\\\\\""),
			'\\\\' => out.push_str("\\\\\\\\"),
			'\\n' => out.push_str("\\\\n"),
			'\\r' => out.push_str("\\\\r"),
			'\\t' => out.push_str("\\\\t"),
			c if (c as u32) < 0x20 => out.push_str(&format!("\\\\u{:04x}", c as u32)),
			c => out.push(c),
		}
	}
	out.push('"');
	out
}
`;

function decodeArg(type: SemType, index: number): string {
	switch (type.kind) {
		case "Bool":
			return `args[${index}].as_bool()`;
		case "Float":
			return `args[${index}].as_f64()`;
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return `args[${index}].as_i64()`;
		case "String":
		case "Enum":
			return `args[${index}].as_str().to_string()`;
		case "List": {
			const item = decodeJsonValue(type.elem, "item");
			return `args[${index}].as_array().iter().map(|item| ${item}).collect::<Vec<_>>()`;
		}
		case "Record": {
			const fields = decodeRecordFields(type.name, `args[${index}]`);
			return `${pascal(type.name)} { ${fields} }`;
		}
		default:
			return `args[${index}].as_str().to_string()`;
	}
}

function decodeJsonValue(type: SemType, varName: string): string {
	switch (type.kind) {
		case "Bool":
			return `${varName}.as_bool()`;
		case "Float":
			return `${varName}.as_f64()`;
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return `${varName}.as_i64()`;
		case "Record": {
			const fields = decodeRecordFields(type.name, varName);
			return `${pascal(type.name)} { ${fields} }`;
		}
		default:
			return `${varName}.as_str().to_string()`;
	}
}

/** The wire name a keyword-escaped Rust field (`r#type`) was named before escaping (`type`). */
function wireName(name: string): string {
	return name.startsWith("r#") ? name.slice(2) : name;
}

function decodeRecordFields(recordName: string, jsonVar: string): string {
	const fields = recordFieldTypes.get(recordName);
	if (fields === undefined) return "";
	return [...fields.entries()]
		.map(([name, type]) => `${name}: ${decodeJsonValue(type, `${jsonVar}.get("${wireName(name)}").unwrap()`)}`)
		.join(", ");
}

function encodeValue(expr: string, type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return `coreout::json::Json::Bool(${expr})`;
		case "Float":
			return `coreout::json::Json::Number(${expr})`;
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return `coreout::json::Json::Number(${expr} as f64)`;
		case "String":
		case "Enum":
			return `coreout::json::Json::String(${expr})`;
		case "Option": {
			const inner = encodeValue("inner", type.inner);
			return `match ${expr} { Some(inner) => ${inner}, None => coreout::json::Json::Null }`;
		}
		case "List": {
			const inner = encodeValue("item", type.elem);
			return `coreout::json::Json::Array(${expr}.into_iter().map(|item| ${inner}).collect())`;
		}
		case "Record": {
			const fields = recordFieldTypes.get(type.name);
			const rendered =
				fields === undefined
					? ""
					: [...fields.entries()]
							.map(([name, fieldType]) => `("${wireName(name)}".to_string(), ${encodeValue(`rec.${name}`, fieldType)})`)
							.join(", ");
			// A dedicated binding name (`rec`, not `value`): `expr` is sometimes literally `"value"`
			// already (the outermost call in `driverFiles`), and rebinding it to itself is exactly
			// what `clippy::redundant_locals` (default warn) exists to catch.
			return `{ let rec = ${expr}; coreout::json::Json::Object(vec![${rendered}]) }`;
		}
		default:
			return `coreout::json::Json::Null`;
	}
}

function driverFiles(program: CProgram, entries: readonly DriverEntry[]): { path: string; text: string }[] {
	const modules = [...emittedModules];
	emittedModules.length = 0;
	// The driver is hand-written-shaped generated code, outside the Target AST this file's own
	// `print`/`callArg` consult for every other call site, so it borrows its own entry-point calls
	// straight from the borrow map rather than through `borrowedArgs` (see `docs/decisions/0010-*.md`).
	const borrows = computeBorrowableParams(program);

	const cases = entries.map((entry) => {
		const callee = program.functions.get(entry.coreName);
		const borrowedHere = borrows.get(entry.coreName);
		const args = entry.params.map((type, index) => {
			const paramName = callee?.params[index]?.name;
			const wantsBorrow = paramName !== undefined && borrowedHere?.has(paramName) === true;
			// A borrowed `String`/`Enum` parameter reads `args[i].as_str()` directly — already a
			// `&str` into the decoded JSON value, so there is no owned `String` to borrow a reference
			// to in the first place (`clippy::unnecessary_to_owned`, default warn, is what building
			// one only to immediately `&`-reference it would trip). A borrowed `List` has no such
			// borrowed JSON accessor to read instead, so it still decodes into an owned `Vec` and
			// borrows that: `&decoded` on a freshly built temporary is ordinary Rust temporary
			// lifetime extension, not a dangling reference.
			if (wantsBorrow && (type.kind === "String" || type.kind === "Enum")) return `args[${index}].as_str()`;
			const decoded = decodeArg(type, index);
			return wantsBorrow ? `&${decoded}` : decoded;
		});
		// `coreout`'s `lib.rs` re-exports every module flatly (see `driverFiles` below), and the
		// driver brings that flat namespace in with `use coreout::*;`, so a bare name resolves.
		// `dispatch`'s own `environment` parameter is already `&dyn Capabilities` (unlike
		// `new_environment()`'s `Box<dyn Capabilities>`, which is where `.as_ref()` belongs).
		const call = `${entry.targetName}(${[...args, ...(entry.usesEnv ? ["environment"] : [])].join(", ")})`;
		const encode = encodeValue("value", entry.ret);
		if (entry.fails.length > 0) {
			return [
				`\t\t${JSON.stringify(entry.coreName)} => match ${call} {`,
				`\t\t\tOk(value) => coreout::json::Json::Object(vec![("ok".to_string(), coreout::json::Json::Bool(true)), ("value".to_string(), ${encode})]),`,
				`\t\t\tErr(err) => coreout::json::Json::Object(vec![("ok".to_string(), coreout::json::Json::Bool(false)), ("error".to_string(), coreout::json::Json::String(error_name(&err)))]),`,
				"\t\t},",
			].join("\n");
		}
		return [
			`\t\t${JSON.stringify(entry.coreName)} => {`,
			`\t\t\tlet value = ${call};`,
			`\t\t\tcoreout::json::Json::Object(vec![("ok".to_string(), coreout::json::Json::Bool(true)), ("value".to_string(), ${encode})])`,
			"\t\t}",
		].join("\n");
	});

	const usesEnv = entries.some((entry) => entry.usesEnv);

	const moduleNames = modules.map((module) => module.path.replace(/^src\//, "").replace(/\.rs$/, ""));
	const libLines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: lib",
		"//",
		"// `needless_return`: every function body ends with an explicit `return`, mirroring the",
		"// Core's own structure (see the module comment on ownership); a tail-position rewrite would",
		"// have to reconstruct reachability through `if`/`match`/loops that the Core already settled.",
		"// `unused_parens`: the printer parenthesizes every binary and ternary uniformly rather than",
		"// tracking each operator's precedence, which is what makes the printer itself precedence-free.",
		"// `vec_init_then_push`: `push` on a local list, one call per element, is the Core's own",
		"// accumulation idiom (`docs/semantics.md` names it explicitly); collapsing a run of them into",
		"// one `vec![...]` literal would need the printer to prove nothing between them can fail or",
		"// branch, which a source author's control flow can defeat in ways this backend does not chase.",
		"#![allow(clippy::needless_return, clippy::vec_init_then_push, unused_parens, unused_imports)]",
		"",
		"pub mod support;",
		// A minimal JSON reader/writer for the driver's own protocol (see `JSON_SUPPORT`); it lives
		// here, as a module of the library crate, only because Cargo would otherwise mistake a file
		// under `src/bin/` for a binary target of its own. `driver.rs` is the only importer.
		"pub mod json;",
		...(program.errors.size > 0 ? ["pub mod errors;"] : []),
		...moduleNames.map((name) => `pub mod ${name};`),
		"",
		// Flat re-exports: a module's own `use crate::*;` (see `printModule`) is how a cross-module
		// call resolves without being qualified at its call site, and this is the flattening that
		// makes it resolve. Every generated function's name is unique program-wide (the shared
		// name assignment dedupes across the whole program, not per module), so this never collides.
		"pub use support::*;",
		...(program.errors.size > 0 ? ["pub use errors::*;"] : []),
		...moduleNames.map((name) => `pub use ${name}::*;`),
		"",
	];

	// Not `program.errors.size > 0`: the registry always carries the engine's own built-in
	// `HttpError`, whether or not this project's utilities can ever raise it, so `errors.rs` always
	// exists (harmlessly — an unused `pub enum` is not `dead_code`) but `error_name`, a private
	// driver function, would be if nothing here actually dispatches a fallible entry.
	const hasErrors = entries.some((entry) => entry.fails.length > 0);
	const driverLines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		"// source: _driver",
		"",
		"#![allow(clippy::needless_return, unused_parens, unused_imports)]",
		"",
		...(usesEnv ? ["use coreout::support::Capabilities;"] : []),
		"use coreout::*;",
		"",
		"use coreout::json;",
		"",
		...(hasErrors
			? [
					"// The variant name alone, the same family-membership test `errorName` gives the Go",
					"// driver: `CoreError`'s derived `Debug` prints \"VariantName { message: ... }\", so the",
					"// first token is it.",
					"fn error_name(err: &coreout::errors::CoreError) -> String {",
					'\tformat!("{:?}", err).split_whitespace().next().unwrap_or("").to_string()',
					"}",
					"",
				]
			: []),
		...(usesEnv
			? [
					"/// The reference PCG32: same constants and default seed as the interpreter's, so a draw",
					"/// matches the reference bit for bit. A fresh instance is built per case, the same way",
					"/// the reference model starts a fresh interpreter -- and so a fresh generator -- per case.",
					"struct Pcg32 {",
					"\tstate: u64,",
					"\tincrement: u64,",
					"}",
					"",
					"impl Pcg32 {",
					"\tfn new(seed: u64) -> Self {",
					"\t\tlet mut p = Pcg32 { state: 0, increment: 1442695040888963407 };",
					"\t\tp.next();",
					"\t\tp.state = p.state.wrapping_add(seed);",
					"\t\tp.next();",
					"\t\tp",
					"\t}",
					"",
					"\tfn next(&mut self) -> i64 {",
					"\t\tlet previous = self.state;",
					"\t\tself.state = previous.wrapping_mul(6364136223846793005).wrapping_add(self.increment);",
					"\t\tlet xorshifted = (((previous >> 18) ^ previous) >> 27) as u32;",
					"\t\tlet rotation = (previous >> 59) as u32;",
					"\t\t(xorshifted.rotate_right(rotation)) as i64",
					"\t}",
					"}",
					"",
					"/// The interpreter's own default seed, used whenever Capabilities.seed is left unset.",
					"const DEFAULT_SEED: u64 = 0x853c49e6748fea9b;",
					"",
					"struct Fixture {",
					"\tstatus: i64,",
					"\tbody: String,",
					"\tlatency_millis: i64,",
					"}",
					"",
					"/// The capability fake the differential harness drives: responses come from",
					"/// fixtures.json, a missing URL is a transport error, and the scripted latency is what",
					"/// decides a race.",
					"struct FakeCapabilities {",
					"\tfixtures: std::collections::HashMap<String, Fixture>,",
					"\trandom: std::sync::Mutex<Pcg32>,",
					"}",
					"",
					"impl Capabilities for FakeCapabilities {",
					"\tfn request(&self, request: coreout::support::HttpRequest) -> Option<coreout::support::HttpResponse> {",
					"\t\tlet fixture = self.fixtures.get(&request.url)?;",
					"\t\tstd::thread::sleep(std::time::Duration::from_millis(fixture.latency_millis as u64));",
					"\t\tSome(coreout::support::HttpResponse { status: fixture.status, headers: vec![], body: fixture.body.clone() })",
					"\t}",
					"",
					"\tfn now(&self) -> i64 { 0 }",
					"",
					"\tfn sleep(&self, millis: i64) {",
					"\t\tstd::thread::sleep(std::time::Duration::from_millis(millis as u64));",
					"\t}",
					"",
					"\tfn next_u32(&self) -> i64 {",
					"\t\tself.random.lock().unwrap().next()",
					"\t}",
					"}",
					"",
					"fn load_fixtures() -> std::collections::HashMap<String, Fixture> {",
					"\tlet mut fixtures = std::collections::HashMap::new();",
					"\tif let Ok(raw) = std::fs::read_to_string(\"fixtures.json\") {",
					"\t\tif let json::Json::Object(entries) = json::parse(&raw) {",
					"\t\t\tfor (url, value) in entries {",
					"\t\t\t\tfixtures.insert(",
					"\t\t\t\t\turl,",
					"\t\t\t\t\tFixture {",
					"\t\t\t\t\t\tstatus: value.get(\"status\").map(|v| v.as_i64()).unwrap_or(0),",
					"\t\t\t\t\t\tbody: value.get(\"body\").map(|v| v.as_str().to_string()).unwrap_or_default(),",
					"\t\t\t\t\t\tlatency_millis: value.get(\"latencyMillis\").map(|v| v.as_i64()).unwrap_or(0),",
					"\t\t\t\t\t},",
					"\t\t\t\t);",
					"\t\t\t}",
					"\t\t}",
					"\t}",
					"\tfixtures",
					"}",
					"",
					"fn new_environment() -> Box<dyn Capabilities> {",
					"\tBox::new(FakeCapabilities { fixtures: load_fixtures(), random: std::sync::Mutex::new(Pcg32::new(DEFAULT_SEED)) })",
					"}",
					"",
				]
			: []),
		"fn dispatch(name: &str, args: &[json::Json]" + (usesEnv ? ", environment: &dyn Capabilities" : "") + ") -> json::Json {",
		"\tmatch name {",
		...cases,
		'\t\t_ => coreout::json::Json::Object(vec![("ok".to_string(), coreout::json::Json::Bool(false)), ("error".to_string(), coreout::json::Json::String(format!("unknown function {}", name)))]),',
		"\t}",
		"}",
		"",
		"fn main() {",
		"\tuse std::io::BufRead;",
		"\tlet stdin = std::io::stdin();",
		"\tfor line in stdin.lock().lines() {",
		"\t\tlet line = line.unwrap();",
		"\t\tif line.trim().is_empty() {",
		"\t\t\tcontinue;",
		"\t\t}",
		"\t\tlet parsed = json::parse(&line);",
		'\t\tlet name = parsed.get("fn").map(|v| v.as_str().to_string()).unwrap_or_default();',
		'\t\tlet args: Vec<json::Json> = parsed.get("args").map(|v| v.as_array().to_vec()).unwrap_or_default();',
		...(usesEnv ? ["\t\tlet environment = new_environment();", "\t\tlet result = dispatch(&name, &args, environment.as_ref());"] : ["\t\tlet result = dispatch(&name, &args);"]),
		"\t\tprintln!(\"{}\", json::write(&result));",
		"\t}",
		"}",
		"",
	];

	return [
		{ path: "src/lib.rs", text: libLines.join("\n") },
		// Lives in the library crate, alongside `support`, rather than next to `driver.rs`: Cargo
		// auto-discovers every file directly under `src/bin/` as its own binary target (expecting a
		// `main` of its own), so a submodule there has to sit in a subdirectory or, more simply
		// here, just be a module of `coreout` itself that the driver binary imports.
		{ path: "src/json.rs", text: JSON_SUPPORT.trim() + "\n" },
		{ path: "src/bin/driver.rs", text: driverLines.join("\n") },
		{
			path: "Cargo.toml",
			text: [
				"[package]",
				'name = "coreout"',
				'version = "0.1.0"',
				'edition = "2021"',
				"",
				"[[bin]]",
				'name = "driver"',
				'path = "src/bin/driver.rs"',
				"",
				"[dependencies]",
				"",
			].join("\n"),
		},
	];
}

/* ------------------------------------------------------------------ *
 * printModule needs to record which modules it actually emitted, for `driverFiles` to build
 * `lib.rs`'s `pub mod` list from -- `entries` alone only covers modules with an exported utility,
 * and an internal-only module (a `lib/*` helper file) would otherwise be missing a `mod`
 * declaration despite having a file on disk.
 * ------------------------------------------------------------------ */

const originalPrintModule = printModule;

function printModuleTracked(module: TModule): string {
	emittedModules.push({ path: module.path });
	return originalPrintModule(module);
}

export const RUST_BACKEND: Backend = {
	spec: RUST_SPEC,
	fileExtension: RUST_CONFIG.fileExtension,
	// The whole-program pre-pass (see `analysis/borrows.ts` and `docs/decisions/0010-*.md`): the
	// shared lowerer only consults this map (`TParam.borrowed`, a "call" node's `borrowedArgs`), it
	// never computes it, and it is Rust's own free function precisely so no other target's build
	// pays for it or is affected by it.
	extraLowerOptions: (program) => ({ borrows: computeBorrowableParams(program) }),
	printModule: printModuleTracked,
	importPath,
	support: supportModule,
	errorsModule,
	renderType: rustType,
	comment: "//",
	driver: driverFiles,
};
