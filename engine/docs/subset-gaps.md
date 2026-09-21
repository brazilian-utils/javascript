# What ordinary TypeScript the subset still refuses

The goal this file tracks: someone writing a utility should write TypeScript the way they normally
would, and never learn this engine's vocabulary. Where that is not true yet, it is written down
here with the diagnostic it produces, so the distance is measured rather than remembered.

Each row was produced by compiling the smallest ordinary-TypeScript program that uses the feature,
one feature per project so that one rejection cannot hide another. The probes live in
`examples/features/` once they pass; until then they are in this file.

## Refused today

### `number` as a parameter or return type — `E_BARE_NUMBER`

```ts
export function sumPoint(x: number, y: number): number {
	return x + y;
}
```

The single biggest barrier: it was hit by eight of the twelve probes, masking whatever else each
one exercised. Today the author must write `Int` or `IntRange<lo, hi>`. The range is what every
later proof rests on — an unchecked index, an `int` that did not have to become a `bigint`, a
native lowering chosen over a portable one — so it cannot simply be assumed.

It does not have to be written down, though. Inside a function the range is already inferred, by
the same abstract interpretation the loop fixpoint runs. What is missing is a contract at the
boundary, and there are two places to find one without an annotation: a **guard the author already
writes** (`if (n < 0 || n > 99) return 0;` is a proof), and the **call sites** of a helper, which
the checker already specializes per call site. What remains after those two is an exported
function whose body guards nothing — and there the answer is a diagnostic naming the guard to add,
not a silent assumption and not a silently slower lowering.

### `while` — `E_WHILE`

```ts
while (index < n) {
	total += index;
	index++;
}
```

Refused because nothing bounds it, and every range the checker proves depends on a loop running a
knowable number of times. A counted `for` carries its own bound. To accept `while`, the condition
has to yield one — a variable that provably moves toward the bound by at least a fixed step — or
the loop needs a declared ceiling. Reachable, and the most valuable single item after `number`.

### Destructuring — `E_DESTRUCTURING`

```ts
const { x, y } = point;
const [first, second] = pair;
```

Pure syntax. It desugars to field reads the subset already has, and nothing about it is hard; it
is refused only because the frontend never learned it.

### Default and optional parameters — `E_PARAM_PATTERN`, `E_SIGNATURE`

```ts
export function greet(name: string, upper: boolean = false): string;
export function maybeSuffix(value: string, suffix?: string): string;
```

A default desugars to a conditional at entry. An optional parameter is `T | undefined`, which the
Core already models as `Option`. Both are close to free and both are what a normal signature looks
like.

### Discriminated unions — `E_UNION`, `E_SWITCH_SUBJECT`, `E_MEMBER`

```ts
type Shape = { kind: "circle"; radius: number } | { kind: "square"; side: number };
```

The one genuine type-system feature missing. `core/docs/survey.md` counts this among what the
remaining 18 of 138 utilities need. It requires a sum type in the Core and a representation in each
target — a tagged struct in Go, an `enum` in Rust, a tagged dataclass in Python, a tagged object in
TypeScript — plus exhaustiveness on the tag, which the `switch` checker mostly has already.

### `Map` and `Set` — `E_NEW`, `E_METHOD`, `E_MEMBER`

```ts
const seen = new Set<string>();
```

Also counted in the survey's remaining 18. The obstacle is not the data structure, it is that
**iteration order has to mean the same thing everywhere**: JavaScript's `Map` iterates in insertion
order, Go's map iteration is deliberately randomized, Python's `dict` is insertion-ordered, and
Rust's `HashMap` is unordered. Supporting it means picking insertion order and generating it, not
mapping onto whatever each language calls a map.

### Recursion — `E_RECURSION`

```ts
export function factorial(n: number): number {
	return n <= 1 ? 1 : n * factorial(n - 1);
}
```

Refused because nothing bounds the depth, and a generated Rust or Go program has a real stack.
Two ways out, both partial: self-tail-recursion can become a loop mechanically, and a depth the
checker can bound makes the rest safe. General recursion with an unbounded depth stays out.

### `try`/`catch` — `E_TRY`

```ts
try {
	return Number.parseInt(value, 10);
} catch {
	return 0;
}
```

The one where the languages genuinely disagree. Rust has no exceptions, Go has no `try`, and the
Core already expresses failure as an effect (`Fail<E>`) that becomes `Result` in Rust, a second
return value in Go, and a raise in Python and TypeScript. A narrow `try`/`catch` around a call that
fails could map onto that. Arbitrary `try` around arbitrary code cannot, and should keep being
refused with a diagnostic that names the shape that works.

### Method call syntax — `E_METHOD`

```ts
value.split("-").join(" ").toUpperCase().trim()
```

Not a missing capability — every one of these exists as an intrinsic. The frontend simply does not
read the method spelling yet. This is the recognizer's job and it is in progress.

## Accepted today

`??` on an `Option`, counted `for`, `for…of`, `break`, `continue`, early `return`, `switch` over an
enum with exhaustiveness, template literals, the ternary operator, immutable records, `push` on a
local list, pure lambdas passed to combinators, `throw` of a declared domain error.

`.filter()`, `.map()` and `.reduce()` are accepted as shapes; what fails on them today is the range
of the result, which is the `number` inference above rather than the combinator itself.

## How this file is meant to end

Every row moves to "accepted", or stays with a diagnostic that tells an author what to write
instead — in ordinary code, naming the construct and why it has no equivalent, never in this
engine's vocabulary. A row that stays is a fact about the four languages, not a gap in the engine,
and it has to read that way to the person who hits it.
