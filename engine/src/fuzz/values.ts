/**
 * Random `Value`s for a `SemType`, and the check that a `Value` really lies inside the range,
 * length and character class a `SemType` claims — the "checker against reality" comparison
 * (`docs/semantics.md` section 10, Layer 1), applied to whatever the generator produced rather
 * than to a fixed vector table.
 */

import type { SemType } from "../types.ts";
import type { Value } from "../values.ts";
import { NONE, some } from "../values.ts";
import { Rng } from "./rng.ts";

/** A value drawn uniformly-ish from the type's own proven domain, biased toward its edges. */
export function randomValue(rng: Rng, type: SemType): Value {
	switch (type.kind) {
		case "Bool":
			return rng.bool();
		case "Int": {
			// Boundary values catch off-by-one errors far more often than the middle of a range does.
			const edge = rng.weighted<bigint | undefined>([
				[2, type.lo],
				[2, type.hi],
				[1, 0n >= type.lo && 0n <= type.hi ? 0n : undefined],
				[5, undefined],
			]);
			return edge ?? rng.bigint(type.lo, type.hi);
		}
		case "String": {
			const length = rng.int(type.min, Math.max(type.min, Math.min(type.max, 20)));
			const points: number[] = [];
			for (let i = 0; i < length; i++) {
				points.push(
					type.cls === "digits"
						? rng.int(0x30, 0x39)
						: type.cls === "ascii"
							? rng.int(0x20, 0x7e)
							: rng.int(0x20, 0x2fff),
				);
			}
			return String.fromCodePoint(...points);
		}
		case "List": {
			const length = rng.int(type.min, Math.max(type.min, Math.min(type.max, 12)));
			return Array.from({ length }, () => randomValue(rng, type.elem));
		}
		case "Option":
			return rng.bool(0.3) ? NONE : some(randomValue(rng, type.inner));
		case "Enum":
			return rng.pick(type.members);
		default:
			throw new Error(`randomValue: unsupported type kind ${type.kind}`);
	}
}

/** Whether `value` lies inside every bound `type` claims to have proven. */
export function withinType(value: Value, type: SemType): boolean {
	switch (type.kind) {
		case "Bool":
			return typeof value === "boolean";
		case "Int":
			return typeof value === "bigint" && value >= type.lo && value <= type.hi;
		case "String": {
			if (typeof value !== "string") return false;
			const points = [...value].map((ch) => ch.codePointAt(0)!);
			if (points.length < type.min || points.length > type.max) return false;
			if (type.cls === "digits") return points.every((p) => p >= 0x30 && p <= 0x39);
			if (type.cls === "ascii") return points.every((p) => p <= 0x7f);
			return true;
		}
		case "List": {
			if (!Array.isArray(value)) return false;
			if (value.length < type.min || value.length > type.max) return false;
			return value.every((item) => withinType(item, type.elem));
		}
		case "Option": {
			if (typeof value === "object" && value !== null && "__kind" in value) {
				if (value.__kind === "none") return true;
				if (value.__kind === "some") return withinType((value as { value: Value }).value, type.inner);
			}
			return false;
		}
		case "Enum":
			return typeof value === "string" && type.members.includes(value);
		default:
			// Bool/Void/Never/Record/Decimal/CivilDate/… are not produced by anything this generator
			// emits; reaching here would itself be a finding worth investigating by hand.
			return true;
	}
}
