/**
 * Runtime values of the reference semantics.
 *
 * The interpreter, the comptime evaluator and the conformance harness all speak this
 * representation. It mirrors the semantic types one to one, so a divergence between the
 * interpreter and a generated target is always a compiler bug, never a representation accident.
 */

export type RecordValue = {
	readonly __kind: "record";
	readonly type: string;
	readonly fields: Readonly<Record<string, Value>>;
};

export type DecimalValue = {
	readonly __kind: "decimal";
	readonly unscaled: bigint;
	readonly scale: number;
};

export type DateValue = { readonly __kind: "date"; readonly days: number };

export type NoneValue = { readonly __kind: "none" };

export type SomeValue = { readonly __kind: "some"; readonly value: Value };

export type LambdaValue = {
	readonly __kind: "lambda";
	readonly call: (args: Value[]) => Value;
};

export type Value =
	| boolean
	| bigint
	| number
	| string
	| readonly Value[]
	| RecordValue
	| DecimalValue
	| DateValue
	| NoneValue
	| SomeValue
	| LambdaValue;

export const NONE: NoneValue = { __kind: "none" };

export function some(value: Value): SomeValue {
	return { __kind: "some", value };
}

export function isNone(value: Value): boolean {
	return typeof value === "object" && value !== null && "__kind" in value && value.__kind === "none";
}

export function unwrap(value: Value): Value {
	if (typeof value === "object" && value !== null && "__kind" in value && value.__kind === "some") {
		return value.value;
	}
	throw new Error("unwrap of a none value");
}

export function record(type: string, fields: Record<string, Value>): RecordValue {
	return { __kind: "record", type, fields };
}

export function decimal(unscaled: bigint, scale: number): DecimalValue {
	return { __kind: "decimal", unscaled, scale };
}

export function civilDate(days: number): DateValue {
	return { __kind: "date", days };
}

export function asBigInt(value: Value): bigint {
	if (typeof value === "bigint") return value;
	throw new Error(`expected an integer, got ${typeof value}`);
}

export function asNumber(value: Value): number {
	if (typeof value === "number") return value;
	throw new Error(`expected a float, got ${typeof value}`);
}

export function asString(value: Value): string {
	if (typeof value === "string") return value;
	throw new Error(`expected a string, got ${typeof value}`);
}

export function asBool(value: Value): boolean {
	if (typeof value === "boolean") return value;
	throw new Error(`expected a boolean, got ${typeof value}`);
}

export function asList(value: Value): readonly Value[] {
	if (Array.isArray(value)) return value as readonly Value[];
	throw new Error("expected a list");
}

export function asRecord(value: Value): RecordValue {
	if (typeof value === "object" && value !== null && "__kind" in value && value.__kind === "record") {
		return value;
	}
	throw new Error("expected a record");
}

export function asDecimal(value: Value): DecimalValue {
	if (typeof value === "object" && value !== null && "__kind" in value && value.__kind === "decimal") {
		return value;
	}
	throw new Error("expected a decimal");
}

export function asDate(value: Value): DateValue {
	if (typeof value === "object" && value !== null && "__kind" in value && value.__kind === "date") {
		return value;
	}
	throw new Error("expected a date");
}

export function asLambda(value: Value): LambdaValue {
	if (typeof value === "object" && value !== null && "__kind" in value && value.__kind === "lambda") {
		return value;
	}
	throw new Error("expected a lambda");
}

/** The scalars of a string, as code points. `String#length` in the semantics counts these. */
export function codePointsOf(text: string): number[] {
	return [...text].map((scalar) => scalar.codePointAt(0)!);
}

export function fromCodePoints(points: readonly number[]): string {
	return points.map((point) => String.fromCodePoint(point)).join("");
}

/** Scalar-order comparison, the semantics of `str.compare` in every target. */
export function compareScalars(a: string, b: string): number {
	const left = codePointsOf(a);
	const right = codePointsOf(b);
	const shared = Math.min(left.length, right.length);
	for (let index = 0; index < shared; index++) {
		if (left[index]! !== right[index]!) return left[index]! < right[index]! ? -1 : 1;
	}
	return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}

/** Structural equality over values, used by `===` in the Core and by the conformance differ. */
export function valuesEqual(a: Value, b: Value): boolean {
	if (typeof a !== typeof b) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => valuesEqual(item, b[index]!));
	}
	if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
		const left = a as { __kind: string };
		const right = b as { __kind: string };
		if (left.__kind !== right.__kind) return false;
		switch (left.__kind) {
			case "none":
				return true;
			case "some":
				return valuesEqual((left as SomeValue).value, (right as SomeValue).value);
			case "decimal": {
				const x = left as DecimalValue;
				const y = right as DecimalValue;
				return x.scale === y.scale && x.unscaled === y.unscaled;
			}
			case "date":
				return (left as DateValue).days === (right as DateValue).days;
			case "record": {
				const x = left as RecordValue;
				const y = right as RecordValue;
				const keys = Object.keys(x.fields);
				return (
					x.type === y.type &&
					keys.length === Object.keys(y.fields).length &&
					keys.every((key) => valuesEqual(x.fields[key]!, y.fields[key]!))
				);
			}
			default:
				return false;
		}
	}
	return a === b;
}

/** A stable, language-neutral JSON encoding used by the conformance protocol. */
export function encodeValue(value: Value): unknown {
	if (typeof value === "bigint") return { $int: value.toString() };
	if (Array.isArray(value)) return (value as readonly Value[]).map(encodeValue);
	if (typeof value === "object" && value !== null) {
		const tagged = value as { __kind: string };
		switch (tagged.__kind) {
			case "none":
				return { $none: true };
			case "some":
				return { $some: encodeValue((tagged as SomeValue).value) };
			case "decimal": {
				const item = tagged as DecimalValue;
				return { $dec: item.unscaled.toString(), scale: item.scale };
			}
			case "date":
				return { $date: (tagged as DateValue).days };
			case "record": {
				const item = tagged as RecordValue;
				const fields: Record<string, unknown> = {};
				for (const key of Object.keys(item.fields).sort()) {
					fields[key] = encodeValue(item.fields[key]!);
				}
				return { $record: item.type, fields };
			}
			default:
				return null;
		}
	}
	return value;
}

export function decodeValue(raw: unknown): Value {
	if (raw === null) return NONE;
	if (Array.isArray(raw)) return raw.map(decodeValue);
	if (typeof raw === "object") {
		const item = raw as Record<string, unknown>;
		if ("$int" in item) return BigInt(item["$int"] as string);
		if ("$none" in item) return NONE;
		if ("$some" in item) return some(decodeValue(item["$some"]));
		if ("$dec" in item) return decimal(BigInt(item["$dec"] as string), item["scale"] as number);
		if ("$date" in item) return civilDate(item["$date"] as number);
		if ("$record" in item) {
			const fields: Record<string, Value> = {};
			for (const [key, value] of Object.entries(item["fields"] as Record<string, unknown>)) {
				fields[key] = decodeValue(value);
			}
			return record(item["$record"] as string, fields);
		}
	}
	return raw as Value;
}
