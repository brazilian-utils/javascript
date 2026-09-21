/**
 * Semantic types: what a value means, independent of any target language.
 *
 * Types carry their refinements (an integer's proven range, a string's character class and
 * length range, a list's length range). Refinements are what make an idiomatic native lowering
 * provably safe, so they live in the type rather than in a side table.
 */

/**
 * The largest number of elements a list or scalars a string may hold. Every collection length and
 * every index derived from one is bounded by this constant, which is how the analysis keeps every
 * integer range finite without asking authors to annotate lengths. It is the documented platform
 * limit shared by the three targets (see docs/semantics.md, "Integers").
 */
export const MAX_COLLECTION_LENGTH = 2 ** 31 - 1;

/** The integer domain every target represents exactly with its default integer type. */
export const SAFE_INT_LO = -(2n ** 53n - 1n);
export const SAFE_INT_HI = 2n ** 53n - 1n;

/** Character classes a `String` can be refined to. `digits` implies `ascii`. */
export type StringClass = "none" | "ascii" | "digits";

export type SemType =
	| { readonly kind: "Bool" }
	| { readonly kind: "Int"; readonly lo: bigint; readonly hi: bigint }
	| { readonly kind: "Float" }
	| { readonly kind: "Decimal"; readonly scale: number }
	| {
			readonly kind: "String";
			readonly cls: StringClass;
			readonly min: number;
			readonly max: number;
			/** Source text of a regex the value is proven to match, when known. */
			readonly pattern?: string;
	  }
	| { readonly kind: "List"; readonly elem: SemType; readonly min: number; readonly max: number }
	| { readonly kind: "Option"; readonly inner: SemType }
	| { readonly kind: "Record"; readonly name: string }
	| { readonly kind: "Enum"; readonly name: string; readonly members: readonly string[] }
	| { readonly kind: "Union"; readonly name: string }
	| { readonly kind: "CivilDate" }
	| { readonly kind: "Instant" }
	| { readonly kind: "Duration" }
	| { readonly kind: "Lambda"; readonly params: readonly SemType[]; readonly ret: SemType }
	| { readonly kind: "Void" }
	/** The type of an expression that never produces a value (a `throw`, or a diverging branch). */
	| { readonly kind: "Never" };

export const tBool: SemType = { kind: "Bool" };
export const tFloat: SemType = { kind: "Float" };
export const tVoid: SemType = { kind: "Void" };
export const tNever: SemType = { kind: "Never" };
export const tCivilDate: SemType = { kind: "CivilDate" };
export const tInstant: SemType = { kind: "Instant" };
export const tDuration: SemType = { kind: "Duration" };

export function tInt(lo: bigint, hi: bigint): SemType {
	return { kind: "Int", lo, hi };
}

/** The default integer domain of an unannotated `Int`. */
export function tIntDefault(): SemType {
	return tInt(SAFE_INT_LO, SAFE_INT_HI);
}

/** The range of any collection length or index. */
export function tIndex(): SemType {
	return tInt(0n, BigInt(MAX_COLLECTION_LENGTH));
}

export function tIntLit(value: bigint): SemType {
	return tInt(value, value);
}

export function tDecimal(scale: number): SemType {
	return { kind: "Decimal", scale };
}

export function tString(
	cls: StringClass = "none",
	min = 0,
	max = MAX_COLLECTION_LENGTH,
	pattern?: string,
): SemType {
	return { kind: "String", cls, min, max, pattern };
}

export function tList(elem: SemType, min = 0, max = MAX_COLLECTION_LENGTH): SemType {
	return { kind: "List", elem, min, max };
}

export function tOption(inner: SemType): SemType {
	return { kind: "Option", inner };
}

export function tRecord(name: string): SemType {
	return { kind: "Record", name };
}

export function tEnum(name: string, members: readonly string[]): SemType {
	return { kind: "Enum", name, members };
}

export function tUnion(name: string): SemType {
	return { kind: "Union", name };
}

export function tLambda(params: readonly SemType[], ret: SemType): SemType {
	return { kind: "Lambda", params, ret };
}

const CLASS_ORDER: Record<StringClass, number> = { none: 0, ascii: 1, digits: 2 };

/** True when `cls` guarantees at least what `required` guarantees. */
export function classSatisfies(cls: StringClass, required: StringClass): boolean {
	return CLASS_ORDER[cls] >= CLASS_ORDER[required];
}

export function weakerClass(a: StringClass, b: StringClass): StringClass {
	return CLASS_ORDER[a] <= CLASS_ORDER[b] ? a : b;
}

export function strongerClass(a: StringClass, b: StringClass): StringClass {
	return CLASS_ORDER[a] >= CLASS_ORDER[b] ? a : b;
}

/** `a <: b`: every value of `a` is a value of `b`. Refinements narrow, so they are subtypes. */
export function isSubtype(a: SemType, b: SemType): boolean {
	if (a.kind === "Never") return true;
	if (a.kind !== b.kind) {
		// A refined value flows into an Option without ceremony only through `some`, never here.
		return false;
	}

	switch (a.kind) {
		case "Bool":
		case "Float":
		case "CivilDate":
		case "Instant":
		case "Duration":
		case "Void":
			return true;
		case "Int": {
			const other = b as Extract<SemType, { kind: "Int" }>;
			return other.lo <= a.lo && a.hi <= other.hi;
		}
		case "Decimal":
			return a.scale === (b as Extract<SemType, { kind: "Decimal" }>).scale;
		case "String": {
			const other = b as Extract<SemType, { kind: "String" }>;
			if (!classSatisfies(a.cls, other.cls)) return false;
			if (other.pattern !== undefined && other.pattern !== a.pattern) return false;
			return other.min <= a.min && a.max <= other.max;
		}
		case "List": {
			const other = b as Extract<SemType, { kind: "List" }>;
			return (
				isSubtype(a.elem, other.elem) && other.min <= a.min && a.max <= other.max
			);
		}
		case "Option":
			return isSubtype(a.inner, (b as Extract<SemType, { kind: "Option" }>).inner);
		case "Record":
			return a.name === (b as Extract<SemType, { kind: "Record" }>).name;
		case "Union":
			return a.name === (b as Extract<SemType, { kind: "Union" }>).name;
		case "Enum": {
			const other = b as Extract<SemType, { kind: "Enum" }>;
			return a.members.every((member) => other.members.includes(member));
		}
		case "Lambda": {
			const other = b as Extract<SemType, { kind: "Lambda" }>;
			return (
				a.params.length === other.params.length &&
				a.params.every((param, index) => isSubtype(other.params[index]!, param)) &&
				isSubtype(a.ret, other.ret)
			);
		}
		default: {
			const exhaustive: never = a;
			return exhaustive;
		}
	}
}

/** Least upper bound of two types, used when control flow merges. */
export function join(a: SemType, b: SemType): SemType {
	if (a.kind === "Never") return b;
	if (b.kind === "Never") return a;
	if (a.kind === "Option" && b.kind !== "Option") return tOption(join(a.inner, b));
	if (b.kind === "Option" && a.kind !== "Option") return tOption(join(a, b.inner));
	if (a.kind !== b.kind) return a;

	switch (a.kind) {
		case "Int": {
			const other = b as Extract<SemType, { kind: "Int" }>;
			return tInt(a.lo < other.lo ? a.lo : other.lo, a.hi > other.hi ? a.hi : other.hi);
		}
		case "String": {
			const other = b as Extract<SemType, { kind: "String" }>;
			return tString(
				weakerClass(a.cls, other.cls),
				Math.min(a.min, other.min),
				Math.max(a.max, other.max),
				a.pattern === other.pattern ? a.pattern : undefined,
			);
		}
		case "List": {
			const other = b as Extract<SemType, { kind: "List" }>;
			return tList(join(a.elem, other.elem), Math.min(a.min, other.min), Math.max(a.max, other.max));
		}
		case "Option":
			return tOption(join(a.inner, (b as Extract<SemType, { kind: "Option" }>).inner));
		case "Enum": {
			const other = b as Extract<SemType, { kind: "Enum" }>;
			const members = [...new Set([...a.members, ...other.members])].sort();
			return tEnum(a.name, members);
		}
		default:
			return a;
	}
}

/** Drops refinements, keeping only the shape. Used to compare declared and inferred types. */
export function widen(type: SemType): SemType {
	switch (type.kind) {
		case "Int":
			return tIntDefault();
		case "String":
			return tString("none");
		case "List":
			return tList(widen(type.elem));
		case "Option":
			return tOption(widen(type.inner));
		default:
			return type;
	}
}

export function typeToString(type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return "Bool";
		case "Int":
			return `Int[${type.lo}..${type.hi}]`;
		case "Float":
			return "Float";
		case "Decimal":
			return `Decimal<${type.scale}>`;
		case "String": {
			const base = type.cls === "none" ? "String" : type.cls === "ascii" ? "Ascii" : "Digits";
			const length = type.min === type.max ? `${type.min}` : `${type.min}..${type.max}`;
			const pattern = type.pattern === undefined ? "" : ` matches ${type.pattern}`;
			return `${base}[${length}]${pattern}`;
		}
		case "List":
			return `List<${typeToString(type.elem)}>[${type.min}..${type.max}]`;
		case "Option":
			return `Option<${typeToString(type.inner)}>`;
		case "Record":
			return type.name;
		case "Union":
			return type.name;
		case "Enum":
			return type.members.map((member) => JSON.stringify(member)).join(" | ");
		case "CivilDate":
			return "CivilDate";
		case "Instant":
			return "Instant";
		case "Duration":
			return "Duration";
		case "Lambda":
			return `(${type.params.map(typeToString).join(", ")}) => ${typeToString(type.ret)}`;
		case "Void":
			return "Void";
		case "Never":
			return "Never";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}

/* ------------------------------------------------------------------ *
 * Interval algebra over proven integer ranges.
 * ------------------------------------------------------------------ */

export type Range = { readonly lo: bigint; readonly hi: bigint };

export function rangeOf(type: SemType): Range {
	return type.kind === "Int" ? { lo: type.lo, hi: type.hi } : { lo: SAFE_INT_LO, hi: SAFE_INT_HI };
}

const min = (...values: bigint[]): bigint => values.reduce((a, b) => (a < b ? a : b));
const max = (...values: bigint[]): bigint => values.reduce((a, b) => (a > b ? a : b));

export function rangeAdd(a: Range, b: Range): Range {
	return { lo: a.lo + b.lo, hi: a.hi + b.hi };
}

export function rangeSub(a: Range, b: Range): Range {
	return { lo: a.lo - b.hi, hi: a.hi - b.lo };
}

export function rangeMul(a: Range, b: Range): Range {
	const products = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
	return { lo: min(...products), hi: max(...products) };
}

/** Truncated division, the semantics of `/` and `%` in the Core (see docs/semantics.md). */
export function rangeDiv(a: Range, b: Range): Range {
	const divisors = [b.lo, b.hi].filter((value) => value !== 0n);
	if (divisors.length === 0) return { lo: 0n, hi: 0n };
	const quotients: bigint[] = [];
	for (const divisor of divisors) {
		quotients.push(a.lo / divisor, a.hi / divisor);
	}
	return { lo: min(...quotients), hi: max(...quotients) };
}

export function rangeMod(a: Range, b: Range): Range {
	const bound = max(b.lo < 0n ? -b.lo : b.lo, b.hi < 0n ? -b.hi : b.hi) - 1n;
	const lo = a.lo < 0n ? -bound : 0n;
	const hi = a.hi > 0n ? bound : 0n;
	return { lo, hi: hi < lo ? lo : hi };
}

export function rangeUnion(a: Range, b: Range): Range {
	return { lo: min(a.lo, b.lo), hi: max(a.hi, b.hi) };
}

export function rangeContains(outer: Range, inner: Range): boolean {
	return outer.lo <= inner.lo && inner.hi <= outer.hi;
}

export function rangeIsConstant(range: Range): boolean {
	return range.lo === range.hi;
}
