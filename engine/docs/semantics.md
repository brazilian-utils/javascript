# Semantics

This document is the specification the engine implements. The reference interpreter implements
it, every backend preserves it, and every disagreement between the two is a bug in one of them —
never a "platform difference".

Where a rule exists because two languages disagree, the disagreement is named. That is the point
of writing the rule down.

---

## 1. Shape of the system

```
authoring source (restricted TypeScript)
        │  frontend (swappable)
        ▼
Semantic HIR ── the frontend contract
        ▼
Core IR ── what the program means
        ▼
target backends ── how each language represents that meaning
        ▼
native source per language
```

Three invariants:

1. the **source** expresses the implementation;
2. the **Core IR** expresses what the implementation means, independent of any language, including
   the authoring language;
3. a **backend** decides how that meaning is represented in its target.

| Layer | Owns |
|---|---|
| Compiler (frontend to Core) | semantics, types, refinements, effects, proofs, conformance |
| Backend | representation, idioms, standard library selection, allocation, syntax, formatting |
| DX (handwritten, per language) | public API, input coercion, user-facing types, docs |

The engine generates the **core**, never the public API. A DX may accept
`formatCnpj(12345678000199)`; the generated core takes
`formatCnpj(value: String, options: FormatCnpjOptions)`. Converting one into the other is the DX's
job, and that split is what keeps the core free of JavaScript-shaped coercion.

---

## 2. Semantic types

| Type | Meaning |
|---|---|
| `Bool` | boolean |
| `Int[lo..hi]` | mathematical integer with a finite, statically proven range |
| `Float` | IEEE-754 binary64 |
| `Decimal<scale>` | exact decimal with a compile-time scale |
| `String[min..max]` | immutable sequence of Unicode scalars; `length` counts scalars |
| `Ascii`, `Digits` | refinements of `String` |
| `List<T>[min..max]` | immutable list with a length range |
| `Option<T>` | explicit absence, written `T \| undefined` |
| `Record` | nominal, immutable, declared with `type X = { … }` |
| `Enum` | string-literal union, `"a" \| "b"` |
| `CivilDate` | proleptic Gregorian date, years 1 to 9999, no zone |
| `Instant`, `Duration` | integer milliseconds |

Deliberately absent: `UInt` (an `Int` with `lo ≥ 0` already says it), a run-time `Regex` (patterns
are compile-time only), `Calendar` and holiday tables (source library code), `Timezone` and
`Period` (deferred until a utility needs them).

Not yet admitted, and rejected with a diagnostic rather than silently mistranslated: discriminated
unions of records, `Map` and `Set`, and recursion.

### 2.1 Integers

Integers are mathematical: no wraparound anywhere, and every value carries a proven range.

- Ranges are tracked with arbitrary-precision integers inside the compiler.
- Every collection length and every index derived from one lies in `[0, 2^31 - 1]`
  (`MAX_COLLECTION_LENGTH`), which is the documented platform limit shared by the three targets.
  That bound is what keeps every range finite without asking authors to annotate lengths.
- `Int` with no annotation means the platform-safe domain, `±(2^53 − 1)`: the integers every
  target represents exactly with its default integer type.
- `IntRange<lo, hi>` pins a tighter range, and the checker proves the value stays inside it.
- `number`, ordinary TypeScript's own spelling, is accepted and its range is *inferred* rather than
  declared — see "Inferring a bare `number`" below.

A backend picks a representation it can prove safe for the range:

| Target | Representation |
|---|---|
| TypeScript | `number` within ±(2^53 − 1), `bigint` otherwise |
| Python | `int` (already arbitrary precision) |
| Go | `int`, assumed 64-bit (see [targets/go.md](targets/go.md)) |

`/` and `%` are **truncated**: the quotient rounds toward zero and the remainder takes the sign of
the dividend, which is what JavaScript, Go, Java and C# do. Python's `//` and `%` are floored, so
the Python backend selects a native lowering only when both operands are proven non-negative and
a generated helper otherwise. Division and `%` require a divisor proven non-zero.

`Math.min`, `Math.max` and `Math.abs` on an Int are `int.min`, `int.max` and `int.abs`; `Math.trunc`
and `Math.floor` on an Int are the identity, since an Int is already exact. There is no `float.*`
counterpart yet — admitting one needs a second caller, section 8's admission rule — so the same
calls on a `Float` are `E_MATH_FLOAT` rather than a made-up lowering.

#### Inferring a bare `number`

Inside a function, `number`'s range is already inferred the moment it is written: a local needs no
annotation at all (`let sum = 0`), and a parameter or a return type is just two more places the
same abstract interpretation runs. The only question is where the contract at a function's own
boundary comes from, and there are exactly two sound answers, one per kind of function
(`check.ts`, `checkFunction`):

- **Library code** (anything not a root-level exported utility) has no published contract of its
  own — it is already checked once per call site (section 3, specialization). A `number` parameter
  there simply starts at the platform-safe default, the same starting point `Int` is, and the
  caller's own proven type is substituted in exactly the way it already is for an explicit `Int`.
  Nothing new has to happen for this case; it falls out of specialization for free.
- **A utility** (an exported function in a module at the source root) is the published API, so
  there is no call site to take a range from — the range has to come from the utility's own body.
  Every read of a `number` parameter outside the test of an `if` or a ternary (the guard's own
  condition proves nothing about a use that has not happened yet; what its *result* narrows for the
  rest of the function is what counts) is tracked, and once the body is fully checked, the union of
  what was actually proven at each of those reads becomes the parameter's published type. A
  parameter that is only ever read at its unconstrained default — no guard ever narrowed it before
  a real use — or that is never read at all, cannot be given a published range without assuming or
  silently degrading to a checked, portable lowering, both of which are unsound or throw away the
  performance this project exists for; the checker refuses instead, with `E_BARE_NUMBER` naming the
  parameter, saying that nothing narrows it, and naming the guard shape to add, in ordinary
  TypeScript, never this engine's vocabulary.

A return type written as a bare `number` is unconditionally inferred from what the body computes,
for a utility exactly as much as for library code: there is no published ceiling to stay under, so
there is nothing to prove ahead of time and nothing to refuse.

`Int`, `IntRange<lo, hi>`, `Float` and `Decimal<scale>` remain exactly what they were: an explicit,
deliberate statement of the contract, never requiring a guard, because writing one *is* the proof.

### 2.2 Loops and widening

Every loop has a proven trip count: counted `for` loops and `for…of` only, which is why `while` is
outside the subset. The checker re-checks a loop body until the types of its mutable locals stop
growing:

- when the trip count is at most 64, the fixpoint is exact, and an accumulator ends with the range
  it really has;
- above that, ranges widen to the platform-safe domain, and the loop is counted in the metrics.

A widened counter may then be *clamped* back into that domain on assignment, but only while one
step is at most 2^22: since a loop runs at most 2^31 − 1 times, a bounded step cannot leave the
domain. A step the analysis cannot bound is an error, not a clamp.

### 2.3 Strings

A `String` is a sequence of Unicode scalars, and `length` counts scalars.

- Generic strings support iteration by scalar (`str.codePoints`, or `[...s]`), concatenation,
  comparison and the intrinsics. They never support positional indexing, because "position" means
  a UTF-16 code unit in JavaScript, a byte in Go and a code point in Python.
- `str.codeAt`, `str.charAt` and `str.slice` — written `s.charCodeAt(i)`, `s.charAt(i)`/`s[i]` and
  `s.slice(a, b)` — are admitted only on `Ascii` (and therefore on `Digits`), where the index means
  the same thing in all three targets and is O(1) in each. On a string that is not proven ASCII
  these are `E_UTF16_POSITION`, not a silent, target-dependent lowering: JavaScript's position is a
  UTF-16 code unit, Python's is a code point and Go's is a byte, and the three disagree above
  U+007F, so there is nothing to lower to. `s[i]` additionally picks between the unchecked
  accessor and its checked, Option-returning form depending on whether the index is proven in
  range — the same choice `xs[i]` makes below, and for the same reason: JavaScript answers
  `undefined` past the end, which only the checked form can mean.
- `str.trim` removes exactly the 25 code points JavaScript's `String#trim` removes. Python's
  `str.strip()` also removes U+001C to U+001F and U+0085 and does not remove U+FEFF, so the Python
  backend passes the cut set explicitly; Go's `strings.Trim` takes the cut set as an argument
  anyway.
- Case mapping is ASCII-only: `str.asciiUpper` and `str.asciiLower` map `a-z` and `A-Z` and leave
  every other scalar alone. Full Unicode case mapping is out of scope because the targets disagree
  ("ß" uppercases to "SS" in JavaScript, Python, Java and Rust, and stays "ß" in Go's
  `strings.ToUpper` and C#'s `ToUpperInvariant`). A proven-ASCII argument unlocks the host's own
  case mapping, which is equivalent there; anything else uses the portable implementation.
- `str.compare` is scalar order. JavaScript's `<` compares UTF-16 code units, so an astral scalar
  would sort *below* U+E000 there and *above* it in Python and Go; the TypeScript backend
  therefore selects the native comparison only for proven-ASCII strings and the portable one
  otherwise.
- Unicode normalization is out of scope. It depends on the host's UCD version, which differs
  between runtimes and between Python releases.

### 2.4 Decimal

`Decimal<S>` is an exact decimal whose scale is a compile-time constant, represented in every
target as its unscaled integer.

- `+`, `-`, `*` and comparison are exact. Multiplication adds the scales.
- Division, rescale and conversion from a float name their scale **and** their rounding mode at
  the call site. There is no hidden global context: Python's default 28-digit context and Java's
  throwing `BigDecimal.divide` are exactly what this rule avoids.
- `dec.fromFloat` rounds the *exact binary value* of the double, which is why `1.005` at scale 2
  under `half-up` is `1.00`: the double is really 1.00499999999999989…. A host that formats
  `1.005` as `1,01` (as `Intl.NumberFormat` does) is rounding the shortest decimal representation
  instead, which is a different operation and belongs to the DX.

### 2.5 Time

`CivilDate` is a day on the proleptic Gregorian calendar, years 1 to 9999 — the range Python's
`date` and C#'s `DateOnly` share — represented everywhere as days since 1970-01-01.

- `date.fromYmd` answers an `Option`: there is no implicit rollover. JavaScript's `new Date(y, m,
  d)` is `E_HOST_DATE`, not a lowering to it: `Date`'s months are zero-indexed where `fromYmd`'s
  are 1-12, an out-of-range component silently rolls over into the next one instead of answering
  `undefined`, and the value is bound to a timezone that a civil date never has.
- `dayOfWeek` is ISO: Monday is 1 through Sunday is 7.
- Month arithmetic is not admitted. When it is, it will have to name its overflow policy, because
  JavaScript's `setMonth` rolls over (31 January + 1 month is 3 March) while Java's `plusMonths`
  and C#'s `AddMonths` clamp.
- `Instant` is milliseconds since the Unix epoch and `Duration` is an exact count of
  milliseconds. An `Instant` and a `CivilDate` are never interchangeable: converting between them
  needs a zone, which is deferred, so a host date is the DX's problem.

---

## 3. Refinements

Refinements are what make an idiomatic native lowering safe. A lowering declares preconditions
over facts; without the fact, the portable implementation is selected.

Facts: `Ascii`, `Digits`, `Matches<R>`, integer ranges, string and list length ranges.

They enter in four ways:

1. **annotations**: `Digits`, `AsciiOf<14>`, `IntRange<0, 9>`, `List<T, min, max>`;
2. **flow-sensitive analysis**: after `if (!re.test(PATTERN, value)) return …`, the rest of the
   scope knows `value` matches the pattern, and therefore its class and its length range; a
   `value.length !== 14` guard narrows the length; a comparison narrows an integer on both sides;
   `x === undefined` narrows an `Option`;
3. **checked conversions**: `str.asAscii` and `str.asDigits` answer an `Option`;
4. **intrinsic guarantees**, declared by each intrinsic's signature.

A fact crosses a function boundary by **specialization**: a library helper is checked once per
distinct call-site argument type, so `digitAt(cpf, index)` can serve an 11-digit CPF and a
14-digit CNPJ without either caller losing the proof it already had. Specializations that compile
to the same code are folded back together by the linker, which is sound precisely because the
types they differ in are proofs, not run-time structure.

A utility — an exported function in a module at the source root — always keeps its declared
signature, because that signature is the published contract.

---

## 4. Effects and capabilities

Effects are `Pure`, `Fail<E>`, `Http`, `Clock` and `Random`. The last three are capabilities.

- An author calls `http.request(…)`, `clock.now()` or `random.nextU32()` and never mentions an
  environment. The compiler infers effects over the call graph and threads a capability record
  into exactly the functions that transitively need one (`analysis/capabilities.ts`).
- Threading is an internal concern of the generated code, not something a caller of a utility
  ever sees. An exported utility keeps exactly the signature its source module declares; a
  capability parameter never reaches that signature (see "The public entry point vs. the
  capability-taking seam" below). Threading between a utility's own internal helpers is still
  visible in generated source — an implementation detail worth reading, not one worth hiding.
- Each target that can build one generates its own default environment from its standard library —
  `fetch`, `urllib.request`, the system clock, OS randomness — as generated code, not a runtime
  package. Go and Rust cannot: see below.
- `Http` answers an `Option`: a transport error or a timeout is absence, and a 4xx or 5xx status
  is an ordinary value. Retry and fallback are then written as ordinary control flow, which the
  subset can express without `catch` (see [ADR 0006](decisions/0006-http-is-an-option.md)). Its
  shape does not match JavaScript's `fetch`, whose Promise-of-`Response` splits the status and the
  body across two separate awaits and fails by rejecting rather than by answering absent, so a bare
  `fetch(...)` call keeps the generic host-global diagnostic (`call http.request`) instead of a
  lowering.
- `Random` offers only `nextU32`. Everything derived from it — a range by rejection sampling, a
  shuffle — is written in source, so the algorithm and its bias are identical everywhere.
  `Math.random()`, a float in [0, 1), is `E_MATH_RANDOM` rather than a scaled `nextU32`: the scaling
  itself would have to round identically in every target to stay unbiased, which is exactly the
  kind of thing this rule keeps out of the core.
- **Async is computed, not written.** The TypeScript backend makes a function `async` exactly when
  it reaches `Http`, and awaits its calls; Python and Go emit blocking code.

### 4.1 The public entry point vs. the capability-taking seam

A utility whose effects reach `Http`, `Clock` or `Random` is, at the Core level, a function that
takes a capability record. Its *published* signature is not: the source declares
`getAddressInfoByCep(cep: string)`, not `getAddressInfoByCep(cep: string, env: Capabilities)`, and
a drop-in replacement for the package that utility comes from has to keep it that way (see
[ADR 0011](decisions/0011-public-entry-points-vs-capabilities.md) for the fuller reasoning).

Where a target can build a default environment from its own standard library (TypeScript, Python),
`generate()` (`backend/generate.ts`, `splitCapabilityEntryPoints`) splits such a utility in two:

- a **public wrapper**, under the utility's own name, with the source's exact signature and no
  capability parameter. It builds nothing itself — it calls the seam below with a module-level
  default, built once at load time, never per call.
- an internal **seam**, named so it reads as one (`generateCpfWith` in TypeScript,
  `generate_cpf_with` in Python), that still takes the capability record. It is not part of the
  utility surface `API.json` lists as a normal function — it is marked there, under `seams`,
  precisely so a reader does not mistake it for one — but it stays reachable (`export`/no leading
  underscore) because two things need to reach it from outside its own module: the wrapper, and
  the differential conformance driver, which calls it directly to inject a fixture-backed fake
  instead of the real environment. This is why the seam, not the wrapper, is what a target's
  driver dispatch table names.

Where a target cannot build a default without either reaching past its standard library or
fabricating one (Go, Rust — neither ships an HTTP client, a CSPRNG or a default `Capabilities`
value anywhere in the generated *library*; the fake either driver builds lives in the driver
binary, never in `coreout`/`core`), no wrapper is generated. The capability-taking function stays
the only entry point, under its own original name, and is marked the same way in `API.json`'s
`seams` list (`hasWrapper: false`) so a DX author sees plainly that this one utility, unlike the
rest, needs an environment passed in by hand. This is a real, reported gap from drop-in parity,
not one papered over with a fake standard-library capability that would behave differently from
what a caller's own environment actually does.

### 4.2 Concurrency

The only primitive is `task.race(tasks)`, admitted because looking a CEP up in several services at
once needs it.

- Every task answers an `Option`; the race answers the first task that answers `some`, or `none`.
- Under the reference model — virtual clock, scripted Http latencies — "first" is virtual
  completion time, ties broken by task index, so a race is compared deterministically.
- Cancellation is best effort and semantically unobservable: a losing task may run to completion
  and its answer is dropped. Only idempotent work belongs inside a race.
- Lowerings: `Promise.any` in TypeScript, a `ThreadPoolExecutor` in Python, goroutines and a
  channel in Go.

---

## 5. Errors

```ts
export class InvalidCepError extends DomainError {}

throw new InvalidCepError("CEP inválido");
```

Error classes have empty bodies. A `throw` becomes the effect `Fail<E>`, and each target
represents it natively: exception classes in TypeScript and Python, `(T, error)` with typed errors
and `errors.Is` compatibility in Go.

Bugs are not domain errors. Overflow, invalid indexing, division by zero and non-exhaustive
matches are proven impossible at compile time; there is no `catch` to fall back on.

---

## 6. Regex

A regex is a compile-time value, normalized into explicit code point classes.

Rejected: lookaround, backreferences, lazy quantifiers, `.`, inline flags, unanchored patterns and
the shorthand classes `\d`, `\w`, `\s` and `\b` — JavaScript's `\d` is ASCII-only while Python's
matches every Unicode digit, and `\s` differs again. Write the class out; the compiler prints it
in each dialect's own syntax (`\uXXXX` in JavaScript and Python, `\x{…}` in RE2).

Anchoring is supplied by the target: `^…$` in JavaScript (which are string anchors without the `m`
flag), `re.fullmatch` in Python, `\A…\z` in Go.

The accepted subset is linear-time on backtracking engines as well, because there is no
alternation of overlapping classes under an unbounded quantifier.

---

## 7. Subset

**Rejected**, each with a diagnostic code and, where possible, the construct to write instead:

`any`, `unknown`; `==`; truthiness of anything but `Bool`; `null`; `?.` and `??` outside an
`Option`; `this`, prototypes, getters and setters, classes with bodies; dynamic property access;
objects used as maps; escaping mutable values; closures that capture mutable locals; effectful
lambdas inside combinators; generators, custom iterators, `for…in`; `while`; generic `try`/`catch`;
host globals (`Date`, `Intl`, `JSON`, `fetch`, timers, `console`, and every `Math` member except the
handful section 7.1 admits); regex constructs outside section 6; recursion. A bare `number` used as
a utility's parameter is accepted, but still refused with `E_BARE_NUMBER` when the body never
narrows it before using it — section 2.1, "Inferring a bare `number`".

**Allowed**: `const` and `let` with local mutation; `if`/`else`; counted `for`; `for…of`;
`break` and `continue`; `return`; `throw` of a declared domain error; `switch` over an `Enum` with
exhaustiveness; template literals and the ternary operator; immutable records; enums; `Option`;
pure module-level functions, including pure lambdas passed to combinators; `push` on a local list
and assignment to a local list element; `dataset`-style constant tables.

`break` and `continue` leave the innermost loop, and the state they carry is part of that loop's
fixpoint: what a local holds when a `continue` is taken reaches the next iteration, and what it
holds when a `break` is taken reaches the code after the loop, so a range proven for a loop-carried
value covers every path out of the body. A `switch` case ends with a `break` that closes the case
and nothing else; a `break` anywhere else inside a case is rejected with `E_SWITCH_BREAK`, because
a target whose `switch` does not swallow it would read it as a loop break instead.

Only locals are mutable. A list may be built with `push` and is frozen when it escapes its
construction scope, so aliasing behaves identically across Go slices, Python lists, Rust ownership
and JavaScript arrays.

### 7.1 Idiomatic spellings

Everything above is described in the `str`/`seq`/`re`/`int`/`dec`/`date`/`random`/`task` namespace
vocabulary because that is what the frontend recognized first. An author writes ordinary
TypeScript instead, and never has to learn that vocabulary: the frontend (`frontend/lower.ts`,
`core/check.ts`) recognizes the idiomatic spelling on the left below and lowers it to exactly the
Core the namespace spelling on the right already produced. Both spellings stay accepted — the
namespace forms are the older spelling, not a deprecated one — and `tests/idioms.spec.ts` asserts
the equivalence directly, by checking that the two sides of every row compile to the identical
Core, rather than testing each spelling's *behavior* separately.

| ordinary TypeScript | namespace form |
|---|---|
| `s.charCodeAt(i)` | `str.codeAt(s, i)` |
| `s.charAt(i)` | `str.charAt(s, i)` |
| `s[i]` | `str.charAt(s, i)`, or `str.charAtOpt(s, i)` when the index is not proven in range |
| `s[i] ?? fallback` | `str.charAtOpt(s, i) ?? fallback`, always — see "`??` forces the checked accessor" below |
| `s[i]?.charCodeAt(0)` | `str.codeAtOpt(s, i)` |
| `s.slice(a, b)` | `str.slice(s, a, b)` |
| `s.trim()` | `str.trim(s)` |
| `s.padStart(n, c)` | `str.padStart(s, n, c)` |
| `s.length` | `str.len(s)` |
| `s.toUpperCase()`, `s.toLowerCase()`, on a proven-ASCII string | `str.asciiUpper(s)`, `str.asciiLower(s)` |
| `[...s]` | `str.codePoints(s)` |
| `String(n)`, `n.toString()`, for `n: Int` | `str.fromInt(n)` |
| `s.replace(/[^…]/g, "")` | `re.retain` on the un-negated class |
| `PATTERN.test(s)`, for a regex literal or constant `PATTERN` | `re.test(PATTERN, s)` |
| `xs[i]` | `seq.get(xs, i)`, or `seq.at(xs, i)` when the index is not proven in range |
| `xs[i] ?? fallback` | `seq.at(xs, i) ?? fallback`, always — see "`??` forces the checked accessor" below |
| `xs.length` | `seq.len(xs)` |
| `xs.push(v)` | (already the only spelling) |
| `Math.min(a, b)`, `Math.max`, `Math.abs`, for `Int` operands | `int.min`, `int.max`, `int.abs` |
| `Math.trunc(n)`, `Math.floor(n)`, for `n: Int` | (the identity; an Int is already exact) |

`s[i]` and `xs[i]` each pick between the unchecked accessor and its checked, Option-returning form
by the same rule: the unchecked one when the index is proven in range, matching JavaScript's own
guaranteed-present case exactly, and the checked one otherwise, because JavaScript answers
`undefined` past the end where Go and Rust panic — the same reason the Core keeps both forms of
each accessor in the first place (section 3, "checked conversions"). That rule decides the
accessor only where a *value* is wanted; see the next paragraph for `?? fallback`.

**`??` forces the checked accessor, regardless of provability.** `xs[i] ?? fallback` and
`s[i] ?? fallback` always pick `seq.at`/`str.charAtOpt`, even where the index is proven in range
and a bare `xs[i]` would have picked the unchecked accessor. Under `noUncheckedIndexedAccess`,
real TypeScript already types a bracket index `T | undefined` no matter what the checker can
prove about the index (`tsc` has no access to that proof), so writing `?? fallback` is the
author's own statement, in the language's own terms, that they want the absent case handled —
not a claim about provability the checker would otherwise have to second-guess. Using the
provability rule here instead would mean the *same source text*, `xs[i] ?? fallback`, silently
lowers to a different Core depending on a fact about `xs` the author cannot see from the call
site, which is exactly the kind of surprise this frontier is built to avoid.

**`s[i]?.charCodeAt(0)` is `str.codeAtOpt`, the checked *numeric* accessor.** `s.charCodeAt(i)`
alone has no `??` form: it answers `NaN` past the end, not `undefined`, so `s.charCodeAt(i) ??
fallback` would compile under real `tsc` but never actually take the fallback branch — a
respelling that changes behavior, which this checker does not admit (compare the `.replace`
refusal below). But `s[i]` alone already answers `undefined` past the end, and chaining
`?.charCodeAt(0)` onto it reads the one scalar's code point only when it is present: the exact
case split `str.codeAtOpt` makes, spelled in ordinary TypeScript. Only this literal shape is
recognized — a plain (non-optional) bracket index and a literal `0` — since that is what keeps
the translation total; anything else is `E_OPTIONAL_CHAIN`, whose message for this one shape
names the accepted spelling directly.

**`s.toUpperCase()`/`s.toLowerCase()` are `str.asciiUpper`/`str.asciiLower` once `s` is proven
ASCII**, the same gate `requireAsciiPositional` already applies to `charCodeAt`/`charAt`/`slice`
(section 2.3): JavaScript's case methods run Unicode's full case-folding table, which touches
scalars outside ASCII that `str.asciiUpper`/`asciiLower` leave alone, and folds those scalars
differently by target besides. Restricted to a proven-ASCII argument, the two case methods and
the two intrinsics are the identical function, so the ordinary spelling is sound there and only
there; an unproven string is `E_UNICODE_CASE`.

Several idiomatic forms carry JavaScript-specific meaning that has no equivalent in Go, Python or
Rust, and the checker says so instead of lowering them regardless:

- **`s.charCodeAt(i)`, `s.charAt(i)`, `s[i]` and `s.slice(a, b)` on a string not proven ASCII** —
  `E_UTF16_POSITION`. JavaScript's "position" is a UTF-16 code unit, Python's is a code point and
  Go's is a byte, and the three disagree on every scalar above U+007F; section 2.3 has the
  detail.
- **`s.toUpperCase()`/`s.toLowerCase()` on a string not proven ASCII** — `E_UNICODE_CASE`. Unicode
  default case folding touches scalars an ASCII-only table leaves alone, and differs again by
  target outside U+007F, the same shape of problem as `E_UTF16_POSITION` above.
- **`Math.random()`** — `E_MATH_RANDOM`. It is a float in [0, 1), and the Random capability offers
  only an unbiased 32-bit `nextU32`; section 4 has the detail.
- **`new Date(y, m, d)` and its friends** — `E_HOST_DATE`. Zero-indexed months, silent rollover and
  a timezone binding, none of which `date.fromYmd` reproduces; section 2.5 has the detail.
- **`Math.min`/`max`/`abs`/`trunc`/`floor` on a `Float`** — `E_MATH_FLOAT`. There is no `float.*`
  counterpart yet (section 2.1); a Float operand needs the comparison or the truncation written in
  source instead of a made-up lowering.
- **`[...xs, ...ys]` and every array spread other than `[...s]` on a single string** —
  `E_ARRAY_SPREAD`. Combining lists is `seq.concat`, a different operation with a different name,
  not something JavaScript's spread syntax can stand in for.
- **`.replace` in every shape but a global, empty-replacement match of one negated class** —
  `E_REPLACE_UNSUPPORTED`. `.replace` runs JavaScript's own replacement algorithm — capture group
  substitution, a callback, only the first match without `/g/` — which nothing else has to
  reproduce identically; the one shape that *is* target-independent, dropping every scalar outside
  a class, is the one the checker accepts.

---

## 8. Admission rule for intrinsics

An operation becomes an intrinsic only if all three hold:

1. it cannot be expressed efficiently and idiomatically as source library code;
2. it has a precise specification, a reference implementation and vectors;
3. at least two utilities need it, or it is a prerequisite of an admitted intrinsic.

The default answer is: write it in source. Check digits, Easter, holidays, business days, pt-BR
currency formatting and the JSON field reader behind the CEP lookup are all library code.

Every intrinsic that some target cannot lower natively with proven equivalence has a portable
implementation in the engine's own source-language standard library (`stdlib/`), compiled like any
other module. That is what makes a new target complete as soon as its core constructs lower:
native lowerings are optimizations, not requirements.

---

## 9. Lowering selection

Each target declares, per intrinsic, the candidates it has, what each requires, and what each
costs. Selection is deterministic and applied lexicographically:

1. keep the candidates whose preconditions hold (facts, language baseline, allowed dependencies);
   if none remain, it is a compile error;
2. prefer the lower declared cost class (allocations, then time complexity);
3. prefer `native`, then `library`, then `portable`;
4. break ties by declaration order.

There is no measured tuning: costs are declared. Every non-trivial selection is written to
`out/<target>/LOWERING.md` with the rule that decided it, and that file is reviewed in pull
requests.

---

## 10. Verification

- **Layer 0 — random program generation.** A generator (`src/fuzz/`, `docs/fuzzing.md`) produces
  well-typed programs in the subset above, biased toward loops with `break`/`continue`, nested
  loops, a `switch` inside a loop, and indices derived from a loop counter — the shapes the two
  soundness bugs found in this codebase both lived in. It runs the reference interpreter's actual
  answers against the checker's own proven bounds (fast mode, wired into `verify`) and, on demand,
  the interpreter against all four targets in both idiom modes (full mode), reusing the Layer 3
  machinery below. This is the layer that goes looking for a bug nobody wrote a test for yet; the
  fixed 64 cases and two translation-validation programs are what confirms a known one stays fixed.
- **Layer 1 — reference semantics.** The interpreter is compared against the published package on
  inputs inside the core's domain. Every divergence is classified as an interpreter bug, as
  behavior owned by the DX, or as a documented semantic difference.
- **Layer 2 — intrinsic vectors.** Every intrinsic is checked against its own vectors,
  independently of any utility. This is the layer that scales.
- **Layer 3 — differential per utility.** The interpreter and each generated target answer the
  same cases through one JSON protocol, in both idiom modes.
- **Translation validation.** For every Core pass, the interpreter runs the Core before and after
  the pass and the results must be identical.
- **Boundaries.** Tests read the sources to prove that nothing after the HIR imports the parser
  and nothing before the backends imports or branches on a target.
- **Determinism.** Output is byte-identical across runs; `verify` regenerates and diffs.
