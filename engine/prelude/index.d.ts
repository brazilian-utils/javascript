/**
 * The authoring prelude: declarations only, never executed.
 *
 * `tsc` sees `Int` and `Digits` as `number` and `string`, so the editor, go-to-definition and
 * inline errors all work on ordinary TypeScript. The engine's own checker sees them as distinct
 * semantic types with ranges and refinements. Source files are never run: only generated code is.
 */

/** A mathematical integer. Its proven range is inferred; annotate with `IntRange` to pin it. */
declare type Int = number;

/** An integer proven to lie in `[Lo, Hi]`. The bounds must be literals. */
declare type IntRange<Lo extends number, Hi extends number> = number;

/** IEEE-754 binary64. */
declare type Float = number;

/** An exact decimal with a fixed scale. */
declare type Decimal<Scale extends number> = { readonly __decimal: Scale };

/** A string proven to hold only scalars below U+0080. */
declare type Ascii = string;

/** A string proven to hold only ASCII digits. */
declare type Digits = string;

/** An ASCII string of exactly `N` scalars. */
declare type AsciiOf<N extends number> = string;

/** A digit string of exactly `N` scalars. */
declare type DigitsOf<N extends number> = string;

/** A list whose length is proven to lie in `[Min, Max]`. */
declare type List<T, Min extends number = 0, Max extends number = 2147483647> = readonly T[];

/** A date on the proleptic Gregorian calendar, years 1 to 9999, with no zone. */
declare type CivilDate = { readonly __civilDate: unique symbol };

/** Milliseconds since the Unix epoch. */
declare type Instant = { readonly __instant: unique symbol };

/** An exact count of milliseconds. */
declare type Duration = { readonly __duration: unique symbol };

/** The rounding mode every lossy decimal operation names explicitly. */
declare type RoundingMode =
	| "half-even"
	| "half-up"
	| "half-down"
	| "down"
	| "up"
	| "ceil"
	| "floor";

/** The root of every domain error. Subclasses must have empty bodies. */
declare class DomainError extends Error {}

/** Raised by `http.request` on a transport error or a timeout. */
declare class HttpError extends DomainError {}

declare type HttpHeader = { readonly name: Ascii; readonly value: string };

declare type HttpRequest = {
	readonly method: Ascii;
	readonly url: string;
	readonly headers: readonly HttpHeader[];
	readonly body: string;
	readonly timeoutMillis: Int;
};

declare type HttpResponse = {
	readonly status: Int;
	readonly headers: readonly HttpHeader[];
	readonly body: string;
};

declare namespace str {
	function len(value: string): Int;
	function codePoints(value: string): readonly Int[];
	function fromCodePoints(points: readonly Int[]): string;
	function concat(left: string, right: string): string;
	function codeAt(value: Ascii, index: Int): Int;
	function charAt(value: Ascii, index: Int): Ascii;
	function charAtOpt(value: Ascii, index: Int): Ascii | undefined;
	function codeAtOpt(value: Ascii, index: Int): Int | undefined;
	function slice(value: Ascii, from: Int, to: Int): Ascii;
	function indexOf(value: string, needle: string): Int;
	function contains(value: string, needle: string): boolean;
	function startsWith(value: string, prefix: string): boolean;
	function endsWith(value: string, suffix: string): boolean;
	function repeat(value: string, count: Int): string;
	function padStart(value: string, length: Int, pad: string): string;
	function trim(value: string): string;
	function asciiUpper(value: Ascii): Ascii;
	function asciiLower(value: Ascii): Ascii;
	function compare(left: string, right: string): Int;
	function asAscii(value: string): Ascii | undefined;
	function asDigits(value: string): Digits | undefined;
	function split(value: string, separator: Ascii): readonly string[];
	function join(values: readonly string[], separator: string): string;
	function fromInt(value: Int): Ascii;
	function parseInt(value: string): Int | undefined;
}

declare namespace seq {
	function len<T>(list: readonly T[]): Int;
	function get<T>(list: readonly T[], index: Int): T;
	function map<T, R>(list: readonly T[], fn: (item: T) => R): readonly R[];
	function filter<T>(list: readonly T[], fn: (item: T) => boolean): readonly T[];
	function fold<T, A>(list: readonly T[], initial: A, fn: (accumulator: A, item: T) => A): A;
	function sum(list: readonly Int[]): Int;
	function any<T>(list: readonly T[], fn: (item: T) => boolean): boolean;
	function all<T>(list: readonly T[], fn: (item: T) => boolean): boolean;
	function find<T>(list: readonly T[], fn: (item: T) => boolean): T | undefined;
	function indexOf<T>(list: readonly T[], needle: T): Int;
	function contains<T>(list: readonly T[], needle: T): boolean;
	function concat<T>(left: readonly T[], right: readonly T[]): readonly T[];
	function slice<T>(list: readonly T[], from: Int, to: Int): readonly T[];
	function reverse<T>(list: readonly T[]): readonly T[];
	function sortStable<T>(list: readonly T[], compare: (left: T, right: T) => Int): readonly T[];
	function sortStableBy<T, K>(list: readonly T[], key: (item: T) => K): readonly T[];
}

declare namespace re {
	/** Whole-string match against a comptime pattern. */
	function test(pattern: RegExp, value: string): boolean;
	/** Keeps only the scalars matching a comptime character class. */
	function retain(pattern: RegExp, value: string): string;
}

declare namespace int {
	function abs(value: Int): Int;
	function min(left: Int, right: Int): Int;
	function max(left: Int, right: Int): Int;
}

declare namespace float {
	function fromInt(value: Int): Float;
}

declare namespace dec {
	function fromScaled<S extends number>(unscaled: Int, scale: S): Decimal<S>;
	function fromInt<S extends number>(value: Int, scale: S): Decimal<S>;
	function fromFloat<S extends number>(value: Float, scale: S, mode: RoundingMode): Decimal<S>;
	function add<S extends number>(left: Decimal<S>, right: Decimal<S>): Decimal<S>;
	function sub<S extends number>(left: Decimal<S>, right: Decimal<S>): Decimal<S>;
	function mul<A extends number, B extends number>(left: Decimal<A>, right: Decimal<B>): Decimal<number>;
	function divRound<S extends number>(
		left: Decimal<number>,
		right: Decimal<number>,
		scale: S,
		mode: RoundingMode,
	): Decimal<S>;
	function rescale<S extends number>(value: Decimal<number>, scale: S, mode: RoundingMode): Decimal<S>;
	function compare<S extends number>(left: Decimal<S>, right: Decimal<S>): Int;
	function isNegative(value: Decimal<number>): boolean;
	function abs<S extends number>(value: Decimal<S>): Decimal<S>;
	function unscaled(value: Decimal<number>): Int;
}

declare namespace date {
	function fromYmd(year: Int, month: Int, day: Int): CivilDate | undefined;
	function fromEpochDays(days: Int): CivilDate | undefined;
	function toEpochDays(value: CivilDate): Int;
	function year(value: CivilDate): Int;
	function month(value: CivilDate): Int;
	function day(value: CivilDate): Int;
	function addDays(value: CivilDate, days: Int): CivilDate | undefined;
	function diffDays(left: CivilDate, right: CivilDate): Int;
	function dayOfWeek(value: CivilDate): Int;
	function compare(left: CivilDate, right: CivilDate): Int;
	function isLeapYear(year: Int): boolean;
}

declare namespace opt {
	function isNone<T>(value: T | undefined): boolean;
	function unwrap<T>(value: T | undefined): T;
	function some<T>(value: T): T | undefined;
	function orElse<T>(value: T | undefined, fallback: T): T;
}

declare namespace http {
	function request(request: HttpRequest): HttpResponse;
}

declare namespace clock {
	function now(): Instant;
	function sleep(duration: Duration): void;
	function millis(value: Int): Duration;
	function elapsed(from: Instant, to: Instant): Duration;
	function durationMillis(duration: Duration): Int;
}

declare namespace random {
	function nextU32(): Int;
}

declare namespace task {
	/** Runs idempotent tasks concurrently and takes the first success. */
	function race<T>(tasks: readonly (() => T)[]): T | undefined;
}
