/**
 * `seq`: combinators over immutable lists.
 *
 * The Core never chooses a target idiom, so an author may write either a combinator or an
 * imperative loop; the loop raiser turns recognizable loops into these, and each backend decides
 * whether to print a comprehension, a native array method or a plain loop.
 */

import type { SemType } from "../types.ts";
import {
	MAX_COLLECTION_LENGTH,
	isSubtype,
	join,
	rangeMul,
	tBool,
	tFloat,
	tInt,
	tList,
	tOption,
	typeToString,
} from "../types.ts";
import type { Value } from "../values.ts";
import { NONE, asBigInt, asLambda, asList, asNumber, some, valuesEqual } from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind } from "./registry.ts";

function expectList(name: string, args: readonly SemType[], index: number) {
	return expectKind(name, args, index, "List");
}

function expectLambda(name: string, args: readonly SemType[], index: number) {
	const arg = args[index];
	if (arg === undefined || arg.kind !== "Lambda") {
		throw new SignatureError(`${name}: argument ${index} must be a function`);
	}
	return arg;
}

defineIntrinsic({
	name: "seq.len",
	doc: "Number of elements.",
	signature: (args) => {
		expectArity("seq.len", args, 1);
		const list = expectList("seq.len", args, 0);
		return tInt(BigInt(list.min), BigInt(list.max));
	},
	evaluate: ([list]) => BigInt(asList(list!).length),
});

defineIntrinsic({
	name: "seq.get",
	doc: "Element at an index proven to be in range.",
	signature: (args) => {
		expectArity("seq.get", args, 2);
		const list = expectList("seq.get", args, 0);
		const index = expectKind("seq.get", args, 1, "Int");
		if (index.lo < 0n || index.hi >= BigInt(list.min)) {
			throw new SignatureError(
				`seq.get: the index may be out of range (index ${typeToString(index)} into ${typeToString(list)})`,
				"guard the index against the list length, or narrow the list's length range",
			);
		}
		return list.elem;
	},
	evaluate: ([list, index]) => asList(list!)[Number(asBigInt(index!))]!,
});

defineIntrinsic({
	name: "seq.at",
	doc: "The element at an index, or `none` when the index is outside the list. The checked form of seq.get.",
	signature: (args) => {
		expectArity("seq.at", args, 2);
		const list = expectList("seq.at", args, 0);
		expectKind("seq.at", args, 1, "Int");
		return tOption(list.elem);
	},
	evaluate: ([list, index]) => {
		const items = asList(list!);
		const position = Number(asBigInt(index!));
		return position < 0 || position >= items.length ? NONE : some(items[position]!);
	},
});

defineIntrinsic({
	name: "seq.map",
	doc: "Applies a pure function to every element.",
	lambdaParams: (prior) => [expectList("seq.map", prior, 0).elem],
	signature: (args) => {
		expectArity("seq.map", args, 2);
		const list = expectList("seq.map", args, 0);
		const fn = expectLambda("seq.map", args, 1);
		return tList(fn.ret, list.min, list.max);
	},
	evaluate: ([list, fn]) => asList(list!).map((item) => asLambda(fn!).call([item])),
});

defineIntrinsic({
	name: "seq.filter",
	doc: "Keeps the elements a pure predicate accepts.",
	lambdaParams: (prior) => [expectList("seq.filter", prior, 0).elem],
	signature: (args) => {
		expectArity("seq.filter", args, 2);
		const list = expectList("seq.filter", args, 0);
		const fn = expectLambda("seq.filter", args, 1);
		if (fn.ret.kind !== "Bool") throw new SignatureError("seq.filter: the predicate must return Bool");
		return tList(list.elem, 0, list.max);
	},
	evaluate: ([list, fn]) => asList(list!).filter((item) => asLambda(fn!).call([item]) === true),
});

defineIntrinsic({
	name: "seq.fold",
	doc: "Left fold with an explicit initial value.",
	lambdaParams: (prior) => [prior[1]!, expectList("seq.fold", prior, 0).elem],
	signature: (args) => {
		expectArity("seq.fold", args, 3);
		expectList("seq.fold", args, 0);
		const initial = args[1]!;
		const fn = expectLambda("seq.fold", args, 2);
		return join(initial, fn.ret);
	},
	evaluate: ([list, initial, fn]) =>
		asList(list!).reduce<Value>((accumulator, item) => asLambda(fn!).call([accumulator, item]), initial!),
});

defineIntrinsic({
	name: "seq.sum",
	doc: "Sum of a list of integers or floats.",
	signature: (args) => {
		expectArity("seq.sum", args, 1);
		const list = expectList("seq.sum", args, 0);
		if (list.elem.kind === "Float") return tFloat;
		if (list.elem.kind !== "Int") throw new SignatureError("seq.sum: expects Int or Float elements");
		const total = rangeMul(
			{ lo: list.elem.lo, hi: list.elem.hi },
			{ lo: BigInt(list.min), hi: BigInt(list.max) },
		);
		return tInt(total.lo < 0n ? total.lo : 0n, total.hi > 0n ? total.hi : 0n);
	},
	evaluate: ([list]) => {
		const items = asList(list!);
		if (items.length > 0 && typeof items[0] === "number") {
			return items.reduce<number>((total, item) => total + asNumber(item), 0);
		}
		return items.reduce<bigint>((total, item) => total + asBigInt(item), 0n);
	},
});

for (const op of ["any", "all"] as const) {
	defineIntrinsic({
		name: `seq.${op}`,
		doc: `True when ${op === "any" ? "at least one element" : "every element"} satisfies the predicate.`,
		lambdaParams: (prior) => [expectList(`seq.${op}`, prior, 0).elem],
		signature: (args) => {
			expectArity(`seq.${op}`, args, 2);
			expectList(`seq.${op}`, args, 0);
			const fn = expectLambda(`seq.${op}`, args, 1);
			if (fn.ret.kind !== "Bool") throw new SignatureError(`seq.${op}: the predicate must return Bool`);
			return tBool;
		},
		evaluate: ([list, fn]) =>
			op === "any"
				? asList(list!).some((item) => asLambda(fn!).call([item]) === true)
				: asList(list!).every((item) => asLambda(fn!).call([item]) === true),
	});
}

defineIntrinsic({
	name: "seq.find",
	doc: "The first element satisfying the predicate, or `none`.",
	lambdaParams: (prior) => [expectList("seq.find", prior, 0).elem],
	signature: (args) => {
		expectArity("seq.find", args, 2);
		const list = expectList("seq.find", args, 0);
		const fn = expectLambda("seq.find", args, 1);
		if (fn.ret.kind !== "Bool") throw new SignatureError("seq.find: the predicate must return Bool");
		return tOption(list.elem);
	},
	evaluate: ([list, fn]) => {
		const found = asList(list!).find((item) => asLambda(fn!).call([item]) === true);
		return found === undefined ? NONE : some(found);
	},
});

defineIntrinsic({
	name: "seq.indexOf",
	doc: "Index of the first structurally equal element, or -1.",
	signature: (args) => {
		expectArity("seq.indexOf", args, 2);
		const list = expectList("seq.indexOf", args, 0);
		if (!isSubtype(args[1]!, list.elem) && !isSubtype(list.elem, args[1]!)) {
			throw new SignatureError(
				`seq.indexOf: cannot look for ${typeToString(args[1]!)} in ${typeToString(list)}`,
			);
		}
		return tInt(-1n, BigInt(Math.max(0, list.max - 1)));
	},
	evaluate: ([list, needle]) =>
		BigInt(asList(list!).findIndex((item) => valuesEqual(item, needle!))),
});

defineIntrinsic({
	name: "seq.contains",
	doc: "Whether a structurally equal element is present.",
	signature: (args) => {
		expectArity("seq.contains", args, 2);
		const list = expectList("seq.contains", args, 0);
		if (!isSubtype(args[1]!, list.elem) && !isSubtype(list.elem, args[1]!)) {
			throw new SignatureError(
				`seq.contains: cannot look for ${typeToString(args[1]!)} in ${typeToString(list)}`,
			);
		}
		return tBool;
	},
	evaluate: ([list, needle]) => asList(list!).some((item) => valuesEqual(item, needle!)),
});

defineIntrinsic({
	name: "seq.concat",
	doc: "Concatenation of two lists.",
	signature: (args) => {
		expectArity("seq.concat", args, 2);
		const left = expectList("seq.concat", args, 0);
		const right = expectList("seq.concat", args, 1);
		return tList(
			join(left.elem, right.elem),
			Math.min(left.min + right.min, MAX_COLLECTION_LENGTH),
			Math.min(left.max + right.max, MAX_COLLECTION_LENGTH),
		);
	},
	evaluate: ([left, right]) => [...asList(left!), ...asList(right!)],
});

defineIntrinsic({
	name: "seq.slice",
	doc: "A slice, clamped to the list's length, from inclusive to exclusive.",
	signature: (args) => {
		expectArity("seq.slice", args, 3);
		const list = expectList("seq.slice", args, 0);
		const from = expectKind("seq.slice", args, 1, "Int");
		const to = expectKind("seq.slice", args, 2, "Int");
		if (from.lo < 0n || to.lo < 0n) throw new SignatureError("seq.slice: negative bounds are outside the subset");
		const max = Math.min(Number(to.hi - from.lo), list.max);
		return tList(list.elem, Math.max(0, Math.min(Number(to.lo - from.hi), max)), Math.max(0, max));
	},
	evaluate: ([list, from, to]) =>
		asList(list!).slice(Number(asBigInt(from!)), Number(asBigInt(to!))),
});

defineIntrinsic({
	name: "seq.reverse",
	doc: "The list in reverse order.",
	signature: (args) => {
		expectArity("seq.reverse", args, 1);
		const list = expectList("seq.reverse", args, 0);
		return tList(list.elem, list.min, list.max);
	},
	evaluate: ([list]) => [...asList(list!)].reverse(),
});

defineIntrinsic({
	name: "seq.sortStable",
	doc: "Stable sort by an explicit comparator returning a negative, zero or positive Int.",
	lambdaParams: (prior) => {
		const elem = expectList("seq.sortStable", prior, 0).elem;
		return [elem, elem];
	},
	signature: (args) => {
		expectArity("seq.sortStable", args, 2);
		const list = expectList("seq.sortStable", args, 0);
		const fn = expectLambda("seq.sortStable", args, 1);
		if (fn.ret.kind !== "Int") {
			throw new SignatureError("seq.sortStable: the comparator must return an Int");
		}
		return tList(list.elem, list.min, list.max);
	},
	evaluate: ([list, fn]) => {
		// Explicitly stable: decorate with the original index and break ties by it, so the
		// reference never depends on the host sort's stability.
		const decorated = asList(list!).map((item, index) => ({ item, index }));
		decorated.sort((left, right) => {
			const ordering = Number(asBigInt(asLambda(fn!).call([left.item, right.item])));
			return ordering !== 0 ? ordering : left.index - right.index;
		});
		return decorated.map((entry) => entry.item);
	},
});

defineIntrinsic({
	name: "seq.sortStableBy",
	doc: "Stable sort by a key: Int, Decimal, CivilDate or a string compared in scalar order.",
	lambdaParams: (prior) => [expectList("seq.sortStableBy", prior, 0).elem],
	signature: (args) => {
		expectArity("seq.sortStableBy", args, 2);
		const list = expectList("seq.sortStableBy", args, 0);
		const fn = expectLambda("seq.sortStableBy", args, 1);
		const allowed = ["Int", "String", "Decimal", "CivilDate"];
		if (!allowed.includes(fn.ret.kind)) {
			throw new SignatureError(
				`seq.sortStableBy: the key must be one of ${allowed.join(", ")}, got ${typeToString(fn.ret)}`,
				"return an Int or a String key, or use seq.sortStable with an explicit comparator",
			);
		}
		return tList(list.elem, list.min, list.max);
	},
	evaluate: ([list, fn]) => {
		const decorated = asList(list!).map((item, index) => ({
			item,
			index,
			key: asLambda(fn!).call([item]),
		}));
		decorated.sort((left, right) => {
			const ordering = compareKeys(left.key, right.key);
			return ordering !== 0 ? ordering : left.index - right.index;
		});
		return decorated.map((entry) => entry.item);
	},
});

function compareKeys(left: Value, right: Value): number {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left < right ? -1 : left > right ? 1 : 0;
	}
	if (typeof left === "string" && typeof right === "string") {
		const a = [...left].map((scalar) => scalar.codePointAt(0)!);
		const b = [...right].map((scalar) => scalar.codePointAt(0)!);
		const shared = Math.min(a.length, b.length);
		for (let index = 0; index < shared; index++) {
			if (a[index]! !== b[index]!) return a[index]! < b[index]! ? -1 : 1;
		}
		return a.length - b.length;
	}
	if (typeof left === "object" && typeof right === "object" && left !== null && right !== null) {
		const a = left as { __kind: string; unscaled?: bigint; days?: number };
		const b = right as { __kind: string; unscaled?: bigint; days?: number };
		if (a.__kind === "decimal" && b.__kind === "decimal") {
			return a.unscaled! < b.unscaled! ? -1 : a.unscaled! > b.unscaled! ? 1 : 0;
		}
		if (a.__kind === "date" && b.__kind === "date") return a.days! - b.days!;
	}
	throw new Error("unsupported sort key");
}
