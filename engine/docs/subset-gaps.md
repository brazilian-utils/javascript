# What ordinary TypeScript the subset still refuses

The goal this file tracks: someone writing a utility should write TypeScript the way they normally
would, and never learn this engine's vocabulary. Where that is not true yet, it is written down
here with the diagnostic it produces, so the distance is measured rather than remembered.

Each row was produced by compiling the smallest ordinary-TypeScript program that uses the feature,
one feature per project so that one rejection cannot hide another. The probes live in
`examples/features/` once they pass; until then they are in this file.

## Re-running the twelve probes

`number` is no longer refused outright, so every probe was re-compiled: one minimal program per row
below, plus three more of the original twelve that were never itemized here because they already
compiled cleanly (they cover constructs from "Accepted today"). One of those three happened to use
a `number` field as well and used to be blocked by `E_BARE_NUMBER` alongside everything else; it
now compiles cleanly on its own, which is the eighth of the "eight of the twelve" this file already
named. Of the nine rows below, seven (every one of them except "default and optional parameters"
and "method call syntax", neither of which ever used a `number`) used to report `E_BARE_NUMBER`
alongside their row's own diagnostic — sometimes the only diagnostic that made it out at all, when
`E_BARE_NUMBER` came from the frontend and cut the compile short before the real gap was even
reached. All seven now report only their row's own diagnostic — each row below says so. None of
them compiles cleanly (inference removes the mask, not the underlying gap), so none moves to
`examples/features/` yet.

One thing the re-run surfaced that is worth recording even though it has nothing to do with
`number`: "Method call syntax" below was stale. It no longer needs a recognizer — that landed in
an earlier change to this same subset — so the row has been rewritten to describe what it actually
hits now.

## Refused today

### `number` as a parameter or return type — accepted, with `E_BARE_NUMBER` refusing one case

```ts
export function sumPoint(x: number, y: number): number {
	return x + y;
}
```

This was the single biggest barrier: it was hit by eight of the twelve probes, masking whatever
else each one exercised. It no longer is — `number` is accepted exactly as an ordinary TypeScript
author writes it, and its range is inferred rather than demanded (`check.ts`, "Inferring a bare
`number`"; `docs/semantics.md` §2.1). `Int` and `IntRange<lo, hi>` are still there for an author who
wants to state the contract explicitly, and neither ever needed a guard, because writing one *is*
the proof.

Inside a function the range was already inferred, by the same abstract interpretation the loop
fixpoint runs — a local needs no annotation either (`let sum = 0` always worked). What was missing
was a contract at the boundary, and there are two places to find one without an annotation:

- **The call sites** of a helper — anything not an exported function of a module at the source
  root. The checker already specializes one of those per call site (ADR 0004), the same way
  `isRepeatedRun` is specialized today; a `number` parameter there simply starts at the
  platform-safe default `Int` already does, and the caller's own proven type is substituted in.
  Nothing new was needed for this case.
- **A guard the author already writes**, for an exported utility, which has no call site of its own
  to take a range from. `if (n < 0 || n > 99) return 0;` is a proof: every read of the parameter
  outside a guard's own condition — the condition proves nothing about a use that has not happened
  yet, only its *result* narrows anything — is tracked, and the union of what was actually proven
  at each of those reads becomes the parameter's published type.

What remains is exactly `sumPoint` above: an exported function whose body guards nothing before
using `x` and `y`. That is refused, with two diagnostics, one per parameter:

```
E_BARE_NUMBER: `x` is a bare `number`, and `sumPoint` never narrows it before using it
  help: add a guard before x is used, for example `if (x < 0 || x > 99) return …;` — the range a
  guard like that proves becomes x's published contract; write `x: Int` instead if the full range
  really is what is meant
```

A parameter that is read nowhere at all is refused too, with its own message (`` `n` is never used,
so `f` proves nothing about its range ``), so an unused bare `number` is never silently accepted
either. Tests: `engine/tests/number-inference.spec.ts`.

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

Re-run: a full probe (`n: number`, `while (index < n) { … }`) used to report `E_BARE_NUMBER` twice
alongside `E_WHILE`, all three from the frontend in one pass. It now reports `E_WHILE` alone.

### Destructuring — `E_DESTRUCTURING`

```ts
const { x, y } = point;
const [first, second] = pair;
```

Pure syntax. It desugars to field reads the subset already has, and nothing about it is hard; it
is refused only because the frontend never learned it.

Re-run: both the object and the array form (`{ x, y }` off a record with `number` fields; `[first,
second]` off a `number[]`) used to report two or three `E_BARE_NUMBER`s alongside `E_DESTRUCTURING`.
Both now report `E_DESTRUCTURING` alone.

### Default and optional parameters — `E_PARAM_PATTERN`, `E_SIGNATURE`

```ts
export function greet(name: string, upper: boolean = false): string;
export function maybeSuffix(value: string, suffix?: string): string;
```

A default desugars to a conditional at entry. An optional parameter is `T | undefined`, which the
Core already models as `Option`. Both are close to free and both are what a normal signature looks
like.

Re-run: neither probe used `number`, so neither was affected by the inference work, and `greet`
still hits `E_PARAM_PATTERN` exactly as before. `maybeSuffix` turned out to need its own probe
correction: the frontend's `params()` never reads a parameter's `?`, so `suffix?: string` is not
rejected at all today — it is silently read as a required `string`, and the body's own
`suffix === undefined` then fails with `E_UNDEFINED_COMPARE` (a `String` is never `undefined`)
rather than with the diagnostic this row names. That mistranslation is a real, separate gap this
row should track going forward, and is unrelated to `number`, so it is left unfixed here.

Confirmed directly against the parser rather than inferred from the diagnostic: `b?: string`
parses as an `Identifier` carrying `optional: true`, and `params()` reads `name` and
`typeAnnotation` and nothing else, so the flag is dropped on the floor. `c: boolean = false`
parses as an `AssignmentPattern`, which `params()` does reject (`E_PARAM_PATTERN`). So of the two
halves of this row, one is a loud refusal and the other is a **silent miscompile** — the worst
shape a gap can have, and the reason this row should be closed before the rest of the list.

What both should become, when it is closed: an optional parameter is `Option<T>`, which the Core
already models end to end, so the only new work is in the frontend. A default parameter keeps a
required parameter in the Core and substitutes the default expression at every internal call site
that omits the argument — the classic desugaring, which needs no `Option`, no renaming and no
change to the body, and which leaves the published signature saying what the author wrote. The
engine generates the core and never the public DX API (ADR 0011), so an exported utility's default
belongs to the wrapper, not to the generated signature.

### Discriminated unions — `E_UNION`, `E_SWITCH_SUBJECT`, `E_MEMBER`

```ts
type Shape = { kind: "circle"; radius: number } | { kind: "square"; side: number };
```

The one genuine type-system feature missing. `core/docs/survey.md` counts this among what the
remaining 18 of 138 utilities need. It requires a sum type in the Core and a representation in each
target — a tagged struct in Go, an `enum` in Rust, a tagged dataclass in Python, a tagged object in
TypeScript — plus exhaustiveness on the tag, which the `switch` checker mostly has already.

Re-run: `radius`/`side` are `number` fields, and used to hit `E_BARE_NUMBER` before the union itself
was ever considered. It now reaches `E_UNION` directly.

### `Map` and `Set` — `E_NEW`, `E_METHOD`, `E_MEMBER`

```ts
const seen = new Set<string>();
```

Also counted in the survey's remaining 18. The obstacle is not the data structure, it is that
**iteration order has to mean the same thing everywhere**: JavaScript's `Map` iterates in insertion
order, Go's map iteration is deliberately randomized, Python's `dict` is insertion-ordered, and
Rust's `HashMap` is unordered. Supporting it means picking insertion order and generating it, not
mapping onto whatever each language calls a map.

Re-run: a probe returning the `Set`'s size as `number` used to hit `E_BARE_NUMBER` on that return
type before the checker ever reached the `new Set<string>()` call. It now reaches `E_NEW` directly.

### Recursion — `E_RECURSION`

```ts
export function factorial(n: number): number {
	return n <= 1 ? 1 : n * factorial(n - 1);
}
```

Refused because nothing bounds the depth, and a generated Rust or Go program has a real stack.
Two ways out, both partial: self-tail-recursion can become a loop mechanically, and a depth the
checker can bound makes the rest safe. General recursion with an unbounded depth stays out.

Re-run: `n` used to hit `E_BARE_NUMBER` before the call graph was even walked. It now reaches
`E_RECURSION` directly — the ternary's own `n <= 1` test narrows `n` to `Int[2..9007199254740991]`
for the recursive branch, which is enough of a guard on its own, so nothing about `number` stands
in the way here at all.

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

Re-run: the declared return type is `number`, and used to report `E_BARE_NUMBER` alongside `E_TRY`
(the return type is processed before the body). It now reports `E_TRY` alone.

### Method call syntax — recognized; the remaining refusals are the ordinary ASCII proof rule

```ts
value.split("-").join(" ").toUpperCase().trim()
```

Not a missing capability, and no longer a missing recognizer either: `check.ts`'s `methodCall`
reads `.split`, `.join`, `.toUpperCase`, `.trim` and the rest of the ordinary method spellings
directly, each onto the intrinsic it already names.

Re-run: unaffected by this work (no `number` anywhere in the probe), but the row itself was stale —
this probe no longer hits `E_METHOD` for lacking a recognizer. It hits `E_UNICODE_CASE` on
`.toUpperCase()`, because `value` is a plain `string`, not proven ASCII, and the two case-mapping
tables genuinely disagree above U+007F (§2.3), the same rule a direct `str.asciiUpper` call would
also need satisfied. A version of the probe starting from an already-ASCII value compiles cleanly.

## Accepted today

`??` on an `Option`, counted `for`, `for…of`, `break`, `continue`, early `return`, `switch` over an
enum with exhaustiveness, template literals, the ternary operator, immutable records, `push` on a
local list, pure lambdas passed to combinators, `throw` of a declared domain error.

`.filter()`, `.map()` and `.reduce()` are accepted as shapes. `.filter()` over a `number[]` now
compiles cleanly end to end: the element type is `Int[default]`, the same unconstrained range `Int`
already had, since a list element is not a function boundary and has no guard or call site of its
own to narrow it from. `.map()` and `.reduce()` still fail on a `number[]` with unconstrained
elements, but not on the combinator or on `number` — doubling or summing an unconstrained element
can genuinely overflow the platform-safe domain, the same arithmetic-safety diagnostic `sumPoint`
above hits, so both still need either a guard on the elements or an explicit `IntRange` to bound
them, exactly as they would with an explicit `Int`.

## How this file is meant to end

Every row moves to "accepted", or stays with a diagnostic that tells an author what to write
instead — in ordinary code, naming the construct and why it has no equivalent, never in this
engine's vocabulary. A row that stays is a fact about the four languages, not a gap in the engine,
and it has to read that way to the person who hits it.
