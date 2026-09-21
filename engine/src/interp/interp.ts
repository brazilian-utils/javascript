/**
 * The reference interpreter: the executable definition of the semantics.
 *
 * It runs the Core directly, so it is what every generated target is compared against, what
 * comptime evaluation reuses, and what translation validation runs before and after each Core
 * pass. Capabilities are injected, and the fakes are deterministic: a seeded PCG32, a virtual
 * clock and scripted Http.
 */

import { DomainFailure, lookupIntrinsic } from "../intrinsics/index.ts";
import type { EvalContext } from "../intrinsics/index.ts";
import type { CExpr, CFunc, CProgram, CStmt } from "../core/ir.ts";
import { regexMatches } from "../regex.ts";
import type { Value } from "../values.ts";
import {
	NONE,
	asBigInt,
	asList,
	asRecord,
	codePointsOf,
	isNone,
	record,
	some,
} from "../values.ts";

export type HttpHandler = (request: {
	method: string;
	url: string;
	headers: readonly { name: string; value: string }[];
	body: string;
	timeoutMillis: bigint;
}) =>
	| { status: number; body: string; headers?: readonly { name: string; value: string }[]; latencyMillis?: number }
	/** A transport error or a timeout, which the core reads as an absent response. */
	| undefined;

export type Capabilities = {
	/** Scripted Http. Throwing `DomainFailure("HttpError", …)` models a transport failure. */
	readonly http?: HttpHandler;
	/** Virtual time in milliseconds; `clock.sleep` advances it instantly. */
	startMillis?: bigint;
	/** Seed of the reference PCG32, so a Random-using utility is compared bit for bit. */
	readonly seed?: bigint;
};

type Signal =
	| { readonly kind: "normal" }
	| { readonly kind: "return"; readonly value: Value }
	| { readonly kind: "break" }
	| { readonly kind: "continue" };

const NORMAL: Signal = { kind: "normal" };

class VirtualClock {
	now: bigint;

	constructor(start: bigint) {
		this.now = start;
	}
}

/** The reference pseudo-random generator: PCG32 with the reference stream. */
class Pcg32 {
	private state: bigint;
	private readonly increment: bigint;

	constructor(seed: bigint) {
		this.state = 0n;
		this.increment = 1442695040888963407n;
		this.next();
		this.state = (this.state + seed) & 0xffff_ffff_ffff_ffffn;
		this.next();
	}

	next(): bigint {
		const previous = this.state;
		this.state = (previous * 6364136223846793005n + this.increment) & 0xffff_ffff_ffff_ffffn;
		const xorshifted = ((previous >> 18n) ^ previous) >> 27n & 0xffff_ffffn;
		const rotation = previous >> 59n;
		return ((xorshifted >> rotation) | (xorshifted << ((-rotation) & 31n))) & 0xffff_ffffn;
	}
}

export class Interpreter {
	private readonly program: CProgram;
	private readonly clock: VirtualClock;
	private readonly random: Pcg32;
	private readonly httpHandler: HttpHandler | undefined;
	/** Set while a `race` task runs, so each task keeps its own virtual completion time. */
	private raceTime: { millis: bigint } | undefined;

	constructor(program: CProgram, capabilities: Capabilities = {}) {
		this.program = program;
		this.clock = new VirtualClock(capabilities.startMillis ?? 0n);
		this.random = new Pcg32(capabilities.seed ?? 0x853c49e6748fea9bn);
		this.httpHandler = capabilities.http;
	}

	get virtualNow(): bigint {
		return this.clock.now;
	}

	call(name: string, args: readonly Value[]): Value {
		const fn = this.program.functions.get(name);
		if (fn === undefined) throw new Error(`unknown function ${name}`);
		return this.invoke(fn, args);
	}

	private invoke(fn: CFunc, args: readonly Value[]): Value {
		const locals = new Map<string, Value>();
		fn.params.forEach((param, index) => locals.set(param.name, args[index]!));
		const signal = this.block(fn.body, locals);
		return signal.kind === "return" ? signal.value : true;
	}

	private get context(): EvalContext {
		return {
			http: (request) => {
				if (this.httpHandler === undefined) {
					throw new DomainFailure("HttpError", "no Http capability was provided");
				}
				const fields = request.fields;
				const response = this.httpHandler({
					method: String(fields["method"]),
					url: String(fields["url"]),
					headers: asList(fields["headers"]!).map((header) => {
						const item = asRecord(header);
						return { name: String(item.fields["name"]), value: String(item.fields["value"]) };
					}),
					body: String(fields["body"]),
					timeoutMillis: asBigInt(fields["timeoutMillis"]!),
				});
				if (response === undefined) return undefined;
				this.advance(BigInt(response.latencyMillis ?? 0));
				return record("HttpResponse", {
					status: BigInt(response.status),
					body: response.body,
					headers: (response.headers ?? []).map((header) =>
						record("HttpHeader", { name: header.name, value: header.value }),
					),
				});
			},
			now: () => this.currentMillis,
			sleep: (milliseconds) => this.advance(milliseconds),
			nextU32: () => this.random.next(),
		};
	}

	private get currentMillis(): bigint {
		return this.raceTime === undefined ? this.clock.now : this.raceTime.millis;
	}

	private advance(milliseconds: bigint): void {
		if (this.raceTime === undefined) this.clock.now += milliseconds;
		else this.raceTime.millis += milliseconds;
	}

	/* ---------------------------------------------------------------- *
	 * Statements
	 * ---------------------------------------------------------------- */

	private block(body: readonly CStmt[], locals: Map<string, Value>): Signal {
		for (const statement of body) {
			const signal = this.statement(statement, locals);
			if (signal.kind !== "normal") return signal;
		}
		return NORMAL;
	}

	private statement(statement: CStmt, locals: Map<string, Value>): Signal {
		switch (statement.kind) {
			case "let":
				locals.set(statement.name, this.expr(statement.init, locals));
				return NORMAL;
			case "assign":
				locals.set(statement.name, this.expr(statement.value, locals));
				return NORMAL;
			case "setIndex": {
				const list = [...asList(locals.get(statement.name)!)];
				list[Number(asBigInt(this.expr(statement.index, locals)))] = this.expr(statement.value, locals);
				locals.set(statement.name, list);
				return NORMAL;
			}
			case "push": {
				const list = [...asList(locals.get(statement.name)!), this.expr(statement.value, locals)];
				locals.set(statement.name, list);
				return NORMAL;
			}
			case "if":
				return this.expr(statement.test, locals) === true
					? this.block(statement.then, locals)
					: this.block(statement.otherwise, locals);
			case "switch": {
				const subject = this.expr(statement.subject, locals);
				for (const entry of statement.cases) {
					if (entry.values.some((value) => value === subject)) return this.block(entry.body, locals);
				}
				return statement.otherwise === undefined ? NORMAL : this.block(statement.otherwise, locals);
			}
			case "forRange": {
				const from = asBigInt(this.expr(statement.from, locals));
				const to = asBigInt(this.expr(statement.to, locals));
				const step = statement.step;
				for (
					let counter = from;
					statement.step > 0n
						? statement.inclusive
							? counter <= to
							: counter < to
						: statement.inclusive
							? counter >= to
							: counter > to;
					counter += step
				) {
					locals.set(statement.name, counter);
					const signal = this.block(statement.body, locals);
					if (signal.kind === "break") break;
					if (signal.kind === "return") return signal;
				}
				return NORMAL;
			}
			case "forEach": {
				for (const item of asList(this.expr(statement.iterable, locals))) {
					locals.set(statement.name, item);
					const signal = this.block(statement.body, locals);
					if (signal.kind === "break") break;
					if (signal.kind === "return") return signal;
				}
				return NORMAL;
			}
			case "return":
				return {
					kind: "return",
					value: statement.value === undefined ? true : this.expr(statement.value, locals),
				};
			case "fail": {
				const message = statement.args.map((arg) => String(this.expr(arg, locals))).join(" ");
				throw new DomainFailure(statement.errorClass, message);
			}
			case "break":
				return { kind: "break" };
			case "continue":
				return { kind: "continue" };
			case "expr":
				this.expr(statement.expr, locals);
				return NORMAL;
			default: {
				const exhaustive: never = statement;
				return exhaustive;
			}
		}
	}

	/* ---------------------------------------------------------------- *
	 * Expressions
	 * ---------------------------------------------------------------- */

	expr(expr: CExpr, locals: Map<string, Value>): Value {
		switch (expr.kind) {
			case "lit":
				return expr.value;
			case "local": {
				const value = locals.get(expr.name);
				if (value === undefined) throw new Error(`unbound local ${expr.name}`);
				return value;
			}
			case "none":
				return NONE;
			case "some":
				return some(this.expr(expr.inner, locals));
			case "record": {
				const fields: Record<string, Value> = {};
				for (const field of expr.fields) fields[field.name] = this.expr(field.value, locals);
				return record(expr.typeName, fields);
			}
			case "field": {
				const target = this.expr(expr.target, locals);
				return asRecord(target).fields[expr.name]!;
			}
			case "list":
				return expr.items.map((item) => this.expr(item, locals));
			case "call": {
				const fn = this.program.functions.get(expr.fn);
				if (fn === undefined) throw new Error(`unknown function ${expr.fn}`);
				return this.invoke(
					fn,
					expr.args.map((arg) => this.expr(arg, locals)),
				);
			}
			case "op":
				return this.operation(expr, locals);
			case "lambda":
				return {
					__kind: "lambda",
					call: (args: Value[]) => {
						const inner = new Map(locals);
						expr.params.forEach((param, index) => inner.set(param.name, args[index]!));
						const signal = this.block(expr.body, inner);
						return signal.kind === "return" ? signal.value : true;
					},
				};
			case "cond":
				return this.expr(expr.test, locals) === true
					? this.expr(expr.then, locals)
					: this.expr(expr.otherwise, locals);
			case "and":
				return this.expr(expr.left, locals) === true ? this.expr(expr.right, locals) : false;
			case "or":
				return this.expr(expr.left, locals) === true ? true : this.expr(expr.right, locals);
			case "not":
				return this.expr(expr.operand, locals) !== true;
			default: {
				const exhaustive: never = expr;
				return exhaustive;
			}
		}
	}

	private operation(expr: Extract<CExpr, { kind: "op" }>, locals: Map<string, Value>): Value {
		if (expr.op === "re.test") {
			const subject = this.expr(expr.args[0]!, locals);
			return regexMatches(expr.regex!, codePointsOf(String(subject)));
		}
		if (expr.op === "re.retain") {
			const subject = String(this.expr(expr.args[0]!, locals));
			return codePointsOf(subject)
				.filter((point) => regexMatches(expr.regex!, [point]))
				.map((point) => String.fromCodePoint(point))
				.join("");
		}
		if (expr.op === "task.race") {
			return this.race(expr, locals);
		}
		const definition = lookupIntrinsic(expr.op);
		if (definition === undefined) throw new Error(`unknown intrinsic ${expr.op}`);
		const args = expr.args.map((arg) => this.expr(arg, locals));
		return definition.evaluate(args, this.context);
	}

	/**
	 * `race` under the reference model.
	 *
	 * Each task runs under its own virtual clock, starting at the race's start time; the winner is
	 * the successful task with the smallest virtual completion time, ties broken by task index.
	 * Losing tasks are discarded, which is what makes cancellation unobservable. A task that fails
	 * with a domain error simply does not win, so `race` answers `none` only when all tasks fail.
	 */
	private race(expr: Extract<CExpr, { kind: "op" }>, locals: Map<string, Value>): Value {
		const tasks = asList(this.expr(expr.args[0]!, locals));
		const start = this.currentMillis;
		const outcomes: { index: number; finishedAt: bigint; value: Value }[] = [];
		const outer = this.raceTime;
		for (const [index, task] of tasks.entries()) {
			const scope = { millis: start };
			this.raceTime = scope;
			try {
				const value = (task as { call: (args: Value[]) => Value }).call([]);
				if (!isNone(value)) outcomes.push({ index, finishedAt: scope.millis, value });
			} catch (error) {
				if (!(error instanceof DomainFailure)) throw error;
			} finally {
				this.raceTime = outer;
			}
		}
		if (outcomes.length === 0) return NONE;
		outcomes.sort((left, right) =>
			left.finishedAt === right.finishedAt
				? left.index - right.index
				: left.finishedAt < right.finishedAt
					? -1
					: 1,
		);
		const winner = outcomes[0]!;
		this.advance(winner.finishedAt - start);
		return winner.value;
	}
}

export { DomainFailure, isNone };
