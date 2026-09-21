/**
 * The three capabilities — `http`, `clock` and `random` — and the one concurrency primitive.
 *
 * An author calls them directly and never mentions an environment; the compiler infers the effect
 * and threads a capability record into exactly the functions that need one. Each target generates
 * its own default implementation from its standard library, so there is no runtime package.
 */

import { effects } from "../effects.ts";
import { tDuration, tInstant, tInt, tOption, tRecord, tVoid } from "../types.ts";
import { NONE, asBigInt, asRecord, some } from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind } from "./registry.ts";

defineIntrinsic({
	name: "http.request",
	paramHint: (index) => (index === 0 ? tRecord("HttpRequest") : undefined),
	doc: "Performs one request. A transport error or a timeout answers `none`; a 4xx or 5xx status is a value, not a failure.",
	effects: effects({ http: true }),
	signature: (args) => {
		expectArity("http.request", args, 1);
		const request = expectKind("http.request", args, 0, "Record");
		if (request.name !== "HttpRequest") {
			throw new SignatureError(`http.request: expects an HttpRequest, got ${request.name}`);
		}
		// Absence rather than an exception: the subset has no `catch`, so a retry or a fallback is
		// written as ordinary control flow over an Option (docs/decisions/0006-http-is-an-option.md).
		return tOption(tRecord("HttpResponse"));
	},
	evaluate: ([request], ctx) => {
		const response = ctx.http(asRecord(request!));
		return response === undefined ? NONE : some(response);
	},
});

defineIntrinsic({
	name: "clock.now",
	doc: "The current instant, in milliseconds since the Unix epoch.",
	effects: effects({ clock: true }),
	signature: (args) => {
		expectArity("clock.now", args, 0);
		return tInstant;
	},
	evaluate: (_args, ctx) => ctx.now(),
});

defineIntrinsic({
	name: "clock.sleep",
	doc: "Suspends for a duration. Under the reference model this advances virtual time instantly.",
	effects: effects({ clock: true }),
	signature: (args) => {
		expectArity("clock.sleep", args, 1);
		expectKind("clock.sleep", args, 0, "Duration");
		return tVoid;
	},
	evaluate: ([duration], ctx) => {
		ctx.sleep(asBigInt(duration!));
		return true;
	},
});

defineIntrinsic({
	name: "clock.millis",
	doc: "A duration from a count of milliseconds.",
	signature: (args) => {
		expectArity("clock.millis", args, 1);
		const value = expectKind("clock.millis", args, 0, "Int");
		if (value.lo < 0n) throw new SignatureError("clock.millis: a duration may not be negative");
		return tDuration;
	},
	evaluate: ([value]) => asBigInt(value!),
});

defineIntrinsic({
	name: "clock.elapsed",
	doc: "The duration between two instants, `to - from`, clamped at zero.",
	signature: (args) => {
		expectArity("clock.elapsed", args, 2);
		expectKind("clock.elapsed", args, 0, "Instant");
		expectKind("clock.elapsed", args, 1, "Instant");
		return tDuration;
	},
	evaluate: ([from, to]) => {
		const span = asBigInt(to!) - asBigInt(from!);
		return span < 0n ? 0n : span;
	},
});

defineIntrinsic({
	name: "clock.durationMillis",
	doc: "The millisecond count of a duration.",
	signature: (args) => {
		expectArity("clock.durationMillis", args, 1);
		expectKind("clock.durationMillis", args, 0, "Duration");
		return tInt(0n, 2n ** 53n - 1n);
	},
	evaluate: ([duration]) => asBigInt(duration!),
});

defineIntrinsic({
	name: "random.nextU32",
	doc: "A uniform 32-bit value. Everything derived from it (ranges, shuffles) is written in source, so the algorithm is identical in every target.",
	effects: effects({ random: true }),
	signature: (args) => {
		expectArity("random.nextU32", args, 0);
		return tInt(0n, 2n ** 32n - 1n);
	},
	evaluate: (_args, ctx) => ctx.nextU32(),
});

defineIntrinsic({
	name: "task.race",
	doc: "Runs idempotent tasks concurrently and takes the first one to answer `some`, or `none` when none does.",
	// The interpreter evaluates this one itself: it has to run each task under its own virtual
	// clock to decide the winner deterministically (see docs/semantics.md, "Concurrency").
	effects: effects({}),
	lambdaParams: () => [],
	signature: (args) => {
		expectArity("task.race", args, 1);
		const tasks = expectKind("task.race", args, 0, "List");
		if (tasks.elem.kind !== "Lambda" || tasks.elem.params.length !== 0) {
			throw new SignatureError(
				"task.race: expects a list of zero-argument tasks",
				"pass `[() => first(env), () => second(env)]`",
			);
		}
		if (tasks.elem.ret.kind !== "Option") {
			throw new SignatureError(
				"task.race: every task must answer an Option",
				"a task that has nothing to report answers `undefined`, which is how a loser is recognized",
			);
		}
		if (tasks.min < 1) {
			throw new SignatureError("task.race: the task list must be proven non-empty");
		}
		return tasks.elem.ret;
	},
	evaluate: () => {
		throw new Error("task.race is evaluated by the interpreter, not by the registry");
	},
});
