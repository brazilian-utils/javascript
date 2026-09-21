# Migrating `core/source` to the ordinary spelling

`core/source` used to compile — `tsc` accepted it — without running: `str`, `re`, `seq`, `int`,
`date`, `dec`, `random` and `task` are ambient declarations (`engine/prelude/index.d.ts`) with
nothing behind them at runtime. This records what moved to the ordinary spelling the frontend now
recognizes (`engine/docs/semantics.md` §7.1), what still cannot move and why, and how the claim
"the source actually runs" is now checked rather than only asserted.

A second pass (this update) gave the **checked accessors** — `str.charAtOpt`, `str.codeAtOpt`,
`seq.at` — an ordinary spelling. They had none before: the frontend's provability rule for
`s[i]`/`xs[i]` picked the *unchecked* form whenever the index was proven in range, which is
exactly backwards for the three call sites that needed the checked form on purpose (see "`??`
forces the checked accessor" below), and `str.codeAtOpt` had no bracket form at all to pick
between. Giving these a spelling, and migrating what it unblocks, is what moved `formatCnpj` from
not running at all to matching on every case, and `isValidCnpj` from 1,216/2,032 to 1,627/2,032.

---

## What moved

Every occurrence the recognizer supports moved, across `core/source/**`:

| file | namespace form | ordinary form |
| --- | --- | --- |
| `lib/digits.ts` | `re.retain(DIGIT, value)` / `re.retain(ALPHANUMERIC, value)` | `value.replace(/[^0-9]/g, "")` / `value.replace(/[^0-9A-Za-z]/g, "")` |
| `lib/digits.ts` | `str.codeAt(value, index)` | `value.charCodeAt(index)` |
| `lib/cpf.ts`, `lib/cnpj.ts` | `str.codeAt(value, i)` | `value.charCodeAt(i)` |
| `lib/cnpj.ts` (`cnpjCheckDigit`) | `seq.get(weights, index)` | `weights[index]` |
| `lib/easter.ts` | `int.min(int.max(…))` | `Math.min(Math.max(…))` |
| `lib/format.ts` (`groupThousands`) | `seq.at(scalars, index) ?? 48` | `scalars[index] ?? 48` |
| `lib/json.ts` | `seq.at(points, i) ?? d` (most call sites) | `points[i] ?? d` |
| `lib/random.ts` | `str.fromInt(randomBelow(10))` | `String(randomBelow(10))` |
| `format-currency.ts` | `str.padStart(str.fromInt(n), …)`, `int.max`, `str.slice` | `String(n).padStart(…)`, `Math.max`, `.slice(…)` |
| `generate-cpf.ts`, `generate-cnpj.ts` | `str.fromInt(n)` | `String(n)` |
| `is-valid-cpf.ts`, `is-valid-cnpj.ts`, `get-address-info-by-cep.ts` | `re.test(PATTERN, s)` | `PATTERN.test(s)` |
| `is-valid-cnpj.ts` | `str.trim(s)` | `s.trim()` |

`digitAt`, `isRepeated`, `isRepeatedCnpj`, `isRepeatedRun`, `hasValidCnpjChecksum` and every
`.charCodeAt`/`.slice`/`.trim`/`PATTERN.test` call above type-check under real `tsc`
(`core/tsconfig.json`) and produce byte-identical `core/out` (see "Did `core/out` move" below).

Two ambient declarations were missing outright — `seq.at` and `date.clampEpochDays` — so `tsc`
rejected `lib/json.ts` and `lib/civil.ts` even before this migration touched them (the intrinsics
have always existed; only the hand-maintained `.d.ts` was incomplete). Both are added to
`engine/prelude/index.d.ts`. This is a declarations-only file ("never executed", per its own
header) with no effect on the checker, the generated code or `core/out`; it only makes the
existing "tsc accepts it" claim actually true for code nobody had migrated yet.

### The checked accessors moved too, in the second pass

The first pass left four call sites on the namespace form because the bracket idiom's rule —
unchecked when the index is proven in range, checked otherwise — picked the *wrong* accessor for
each of them: the index was provably in range, but the source wanted the checked form anyway, and
a fourth accessor (`str.codeAtOpt`) had no bracket form to pick between in the first place. Both
gaps are closed now (`engine/docs/semantics.md` §7.1, "`??` forces the checked accessor" and
"`s[i]?.charCodeAt(0)`"), and all four sites moved:

| file | namespace form | ordinary form |
| --- | --- | --- |
| `lib/cnpj.ts`, `hasLetter` | `str.codeAtOpt(value, index) ?? 0` | `value[index]?.charCodeAt(0) ?? 0` |
| `lib/format.ts`, `patternSlots`/`formatWithPattern` | `str.charAtOpt(pattern, index) ?? ""` | `pattern[index] ?? ""` |
| `lib/json.ts`, `matchesAt` | `seq.at(needle, offset) ?? -2` | `needle[offset] ?? -2` |
| `lib/digits.ts`, `keepAlphanumeric` | `str.asciiUpper(value.replace(…))` | `value.replace(…).toUpperCase()` |

The first three were exactly the "provable index, checked form wanted" case: `pattern` and
`needle` are always fixed-length literals at their call sites (`PATTERN`/`OBFUSCATED_PATTERN`,
`` str.codePoints(`"${key}"`) `` for a literal `key` — `"cep"`, `"uf"`, …), so the frontend's own
provability check would have picked the unchecked accessor. `hasLetter`'s index was never
provable at all, which used to be beside the point: there was no ordinary spelling for the
checked *numeric* accessor for a provable index to pick over either. Now there is.

Both gaps closed by the same two frontend rules, described in full in `engine/docs/semantics.md`
§7.1:

- **`??` forces the checked accessor.** Under `noUncheckedIndexedAccess`, real TypeScript already
  types a bracket index `T | undefined` regardless of what the checker can prove, so `xs[i] ??
  fallback` is the author's own statement that they want the absent case — not a claim about
  provability. `engine/src/core/check.ts`'s `logical` now special-cases `??` over an `index` node:
  `this.index(node.left, /* forceChecked */ true)` instead of the provability-driven call. This is
  what let `pattern[index] ?? ""` and `needle[offset] ?? -2` replace the namespace form without
  moving the Core — the two spellings choose the same accessor, `str.charAtOpt`/`seq.at`, either
  way; only the *reason* they choose it changed, from "the frontend proved it" to "the author
  wrote `??`". `engine/tests/idioms.spec.ts` asserts both directions: `xs[i] ?? fallback` and
  `seq.at(xs, i) ?? fallback` compile to identical Core even where `xs[i]` alone (no `??`) would
  have picked `seq.get`.
- **`s[i]?.charCodeAt(0)` is `str.codeAtOpt`.** `s.charCodeAt(i)` alone still has no `??` form —
  it answers `NaN` past the end, not `undefined`, so `s.charCodeAt(i) ?? fallback` would compile
  but never actually take the fallback branch, a silent behavior change this checker refuses
  elsewhere (`.replace`, section 7.1) and refuses here too. But `s[i]` alone already answers
  `undefined` past the end, and `?.charCodeAt(0)` on it reads the one scalar's code point only
  when present — the same case split `str.codeAtOpt` makes. `engine/src/frontend/lower.ts`'s
  `specialCall` recognizes exactly this shape (a plain bracket index, literal `0`) and lowers it
  directly to the intrinsic call, the same one the namespace form already produced — so, again,
  the Core is unchanged, only reached a different way. Oxc wraps any expression containing `?.`
  in a `ChainExpression` node, one level up from where every other optional-chain handling lived,
  so a `case "ChainExpression": return this.expr(node.expression);` was needed for this (or any)
  `?.` recognition to ever see the node it matches against; nothing depended on that case existing
  before because `?.` was always rejected regardless of shape.

Effect on this migration: `hasLetter` now runs for every input, so `isValidCnpj` no longer throws
on it, and `formatWithPattern` now runs unconditionally, so `formatCnpj` runs for every case
(`conformance/run-source.ts` below has the exact numbers, including why `isValidCnpj` is still not
at 100%, which is unrelated to any of the above).

### `str.asciiUpper`/`str.asciiLower` gained an ordinary spelling too

Not a checked accessor, but discovered while migrating what the checked-accessor work unblocked:
`keepAlphanumeric` (`lib/digits.ts`) calls `str.asciiUpper` on the result of `.replace(/[^0-9A-Za-z]/g,
"")` — already the ordinary spelling of `re.retain` on a mixed digit/letter class (first pass),
which types its result `Ascii` (`engine/src/core/check.ts`'s `singleClassOf`: every range's high
end is below `0x80`, so the class is `"ascii"`, not `"digits"`). `str.asciiUpper`'s own doc
already said "a proven-ASCII argument unlocks the host's own case mapping" — the intrinsic was
always meant to gain this idiom, it just hadn't yet. `engine/src/core/check.ts` now maps
`toUpperCase`/`toLowerCase` to `str.asciiUpper`/`str.asciiLower` (`STRING_METHODS`) once the
target is proven ASCII (`requireAsciiCase`, the same gate `charCodeAt`/`charAt`/`slice` already
use, `E_UNICODE_CASE` instead of `E_UTF16_POSITION` when it fails): JavaScript's case methods run
full Unicode case folding, which touches scalars outside ASCII an ASCII-only table leaves alone,
and folds those differently again by target — but restricted to ASCII the two are the identical
function.

### The one call site that still cannot move

`is-valid-cnpj.ts`'s alphanumeric (`version: "2"`) path, once a value is confirmed alphanumeric
and the right length, checks the raw, unsanitized shape with `CNPJ_FORMAT.test(str.asciiUpper(
trimmed))`. `trimmed` is `cnpj.trim()` on the function's own `string` parameter — raw external
input, with no ASCII proof — so `.toUpperCase()` is not available to it the way it is to
`keepAlphanumeric`'s already-ASCII result. Proving `trimmed` ASCII first (a regex guard, or
reusing `cleaned`) would restructure the check, not respell it, which is out of scope for a
migration that promises not to move `core/out`. This is the one place `isValidCnpj` still throws:
`conformance/run-source.ts` asserts it precisely (405 of 2,032 cases), the same way the resolved
gaps above used to be asserted.

Turning on `noUncheckedIndexedAccess` (`core/tsconfig.json`) was considered as part of the same
work — it is what makes `xs[i]` genuinely `T | undefined` to real `tsc`, which is the premise the
`??` rule above rests on — and it was off. Adding it changes nothing except one line:
`cnpjCheckDigit`'s `weights[index]` (`lib/cnpj.ts`), where the loop bound is `weights.length`
itself, provable to the engine's own checker but invisible to `tsc` because `List<T>` erases to a
plain `readonly T[]` (`engine/prelude/index.d.ts`). Every other bracket access in `core/source`
already uses `?? fallback`. But `weights[index]` is on `cnpjCheckDigit`, which every single CNPJ
check calls twice (`hasValidCnpjChecksum`) — reverting it to the namespace form to satisfy `tsc`,
the only Core-preserving fix available (`!` is refused outright elsewhere in this subset for
asserting exactly what it cannot prove, and `as` would be the same claim in different spelling),
was tried and measured: it dropped `isValidCnpj` from 1,627/2,032 matched to 415/2,032, because it
reintroduced an ambient-gap throw into the one helper nearly every case reaches. The flag stays
off: the one blind spot it would catch is not a real bug (the engine's own specialization already
proves `weights[index]` in range independently), and the cost of closing it is far larger than
the gap itself.

### The five effects, and whether "a real import of a real module" is honest here

The task frames a real import of a real module as categorically different from an ambient
declaration with nothing behind it — an author reaching for a date or decimal library is ordinary
TypeScript, and the engine recognizing a known module's API is not the same kind of lie. Assessed
honestly, per capability:

**`date.*` — a date library (e.g. Temporal, `date-fns`, `luxon`).** This is the strongest
candidate. A real `Temporal.PlainDate` (or a well-known library's date-only type) has exactly the
shape `CivilDate` wants: no zone, 1-indexed months, and a constructor that throws or clamps instead
of silently rolling over — the three complaints `E_HOST_DATE` raises about `new Date` do not apply
to it. Recognizing a specific, pinned version of `Temporal` or one library's API and lowering it to
`date.*` is plausible future work, not a change of kind: the semantics genuinely match, unlike
`new Date`, where they do not. The obstacle is scope and churn, not soundness: pinning a dependency
inside what is meant to be dependency-free source, and keeping the recognizer synchronized with
that library's exact surface across versions.

**`dec.*` — a decimal library (e.g. `decimal.js`, `big.js`).** Also plausible in principle: these
libraries do carry an explicit scale and explicit rounding, which is exactly what `dec.*` requires
and `Number` cannot give. The harder part is that `Decimal<S>`'s scale is a *compile-time* type
parameter the checker uses to keep `add`/`sub` type-safe and to size the generated integer in every
target; a real library's scale lives at the value level, checked at runtime if at all. Recognizing
the *values* a call produces is plausible; recognizing the *compile-time scale discipline* is a
larger design question than swapping a call's spelling, closer to admitting a new kind of
refinement than to adding a row to the idiom table.

**`random.nextU32` — no.** `Math.random()` is already rejected (`E_MATH_RANDOM`) for the reason
section 4 gives: it is a float in `[0, 1)`, and turning that into an unbiased integer needs a
scaling step that would have to round identically across JavaScript, Python, Go and Rust to stay
unbiased — exactly the kind of target-dependent arithmetic the engine exists to keep out. A real
CSPRNG module (`node:crypto`'s `randomInt`, `crypto.getRandomValues`) is closer, since it can
already produce an unbiased integer in a range directly. But it is a *Node* module, not a portable
one: the whole reason `random.nextU32` exists as a capability, rather than a call to `crypto`
inline, is that Python, Go and Rust each generate their own default environment from their own
standard library (`docs/semantics.md` §4) — recognizing `node:crypto` would tie the ordinary
spelling to one target's runtime, which the capability model specifically avoids. Recognizing it
only for the TypeScript target and requiring the namespace form elsewhere would split the idiom
table by target, which the table's whole design (`tests/idioms.spec.ts` proves *one* Core for both
spellings) does not accommodate today.

**`http.request` — no, for the reason semantics.md already gives.** `fetch` returns a
`Promise<Response>` whose status and body are two separate awaits, and it fails by rejecting rather
than by answering absent. `http.request` answers a plain `Option<HttpResponse>` with the body
already read. These are different *shapes*, not different spellings of the same shape — recognizing
`fetch(...)` would mean silently collapsing `await fetch(url).then(r => r.json())` into a single
synchronous-looking call, which is exactly the kind of "different operation with the same name"
`.replace()` is refused for (section 6/7.1). A library that already returns `Option`-shaped,
already-read responses could in principle be recognized the way a date or decimal library could;
`fetch` itself cannot be, regardless of how it is imported.

**`task.race` — no, and for a sharper reason than the others.** `Promise.any` is the closest native
shape, but the engine's semantics are explicitly deterministic under a *virtual* clock (`docs/
semantics.md` §4.2: "first" is virtual completion time, ties broken by task index) so that a race
is reproducible in conformance testing. `Promise.any` races on the real event loop; recognizing it
would mean recognizing a construct whose result depends on real scheduling, which is the one
property the capability model is built to avoid. No import changes that.

**`clock.sleep`/`clock.millis` — not asked for, but the same shape as the others.** No ordinary
spelling exists for these either (a raw `setTimeout`/`Promise` pair is real JavaScript but is not a
respelling of a synchronous-looking capability call), and they are used in `get-address-info-by-cep.ts`'s
retry loop. Left on the namespace form, same as `http.request`.

### `[...s]` has two different types depending on which checker you ask

One more thing worth recording precisely, because it looked at first like a valid migration and
is not: `docs/semantics.md` §7.1 says `[...s]` is `str.codePoints(s)`, and the *engine's own*
checker treats the two as producing identical Core (`tests/idioms.spec.ts`). But `Ascii`/`Digits`
are ambient aliases for `string` (`engine/prelude/index.d.ts`), so *real* `tsc` infers `[...s]` as
`string[]` — an array of one-character substrings — never as `number[]`. `lib/format.ts`'s
`groupThousands` and `lib/json.ts`'s `jsonStringField` both treat the spread's elements as numeric
code points immediately afterward (arithmetic, comparison against numeric constants), so migrating
either would type-check under the engine's checker and fail under real `tsc`
(`Argument of type 'string' is not assignable to parameter of type 'number'`). Both call sites keep
`str.codePoints`, with a comment explaining why, and both are confirmed clean under
`tsc --noEmit -p core/tsconfig.json`. The idiom is sound only where a spread's elements go on to be
used as strings, not as numbers — this codebase has no such site.

---

## The new step: proving the source runs

`conformance/run-source.ts` imports the migrated utilities directly — `import { isValidCpf } from
"../source/is-valid-cpf"`, no `tsc`, no `cli.ts build` — and calls them, in Node, against the same
vectors `conformance/cases.ts` already holds, run through `sloppy-imports.mjs` exactly as
`conformance/run.ts` is. Each result is compared against the published npm package (`src/`), the
same ground truth `run.ts` compares the reference interpreter against. It is wired into
`engine/scripts/verify.ts` as a new step, `conformance (source, no engine)`, after `conformance`.

It runs, and asserts on, exactly:

- **`isValidCpf`** — every case (1,519) runs for real and matches the published package. The step
  fails if even one case falls back to the ambient-gap path: this utility has no known gap left,
  so a regression here is real.
- **`formatCnpj`** — every case (160) runs for real and matches, now that `formatWithPattern`'s
  checked accessor has an ordinary spelling. Asserted the same way as `isValidCpf`: any case
  falling back to the ambient-gap path fails the step, since this utility has no known gap left
  either.
- **`isValidCnpj`** — every case (2,032) is attempted; 1,627 run for real and match, 405 hit the
  documented `str.asciiUpper(trimmed)` gap ("The one call site that still cannot move" above),
  confirmed by asserting the exact `ReferenceError` that line throws, not just "something threw".
  The step fails if the matched count reaches zero (the runnable part broke) or if the blocked
  count reaches zero (the gap silently vanished or the vectors stopped exercising it — either way,
  this file's claim about `isValidCnpj` would be stale and needs updating along with the step).
  `hasLetter`'s gap, the one this file used to describe here, is gone: it moved to the ordinary
  spelling and is no longer in the picture.
- **Everything else is named and skipped, with a reason, in the same file**: `formatCurrency`
  (`dec.*`), `generateCpf`/`generateCnpj` (`random.nextU32`), `getHolidays`/`isBusinessDay`
  (`date.*`), and `getAddressInfoByCep` (`http.request`/`task.race`, and it would need a live
  network to compare against the published package regardless).

A mismatch, an unexpected throw, or either count-shrinking condition fails the step and the
overall `verify.ts` run.

---

## Did `core/out` move?

No generated program logic did, in any of the four targets, in either idiom mode, in either pass.
After this second pass: `node ../engine/src/cli.ts build --project .` (idiomatic) and
`--no-idioms` both regenerate byte-identical `.ts`/`.py`/`.go`/`.rs` files and byte-identical
`API.json`/`LOWERING.md`.

`SOURCEMAP.json` in each of the four tracked output directories *does* differ — every entry is a
`{start, end}` byte offset into the (now differently spelled, differently commented) source file,
one of the "three review artifacts every target produces" (`backend/generate.ts`) for pointing a
reader from generated code back to its source span. It carries no executable meaning and is
unavoidable: any edit to the source text at all, including a comment-only change, shifts byte
offsets later in the same file. This was checked file by file (`git diff --stat core/out`) rather
than assumed — the four `SOURCEMAP.json` files are the entire diff.

---

## Results

- `cd core && node ../engine/scripts/verify.ts .` — all 16 steps pass, including
  `conformance (source, no engine)`.
- `node engine/scripts/fuzz.ts fast --seed 20260921 --count 1000` — clean (976/1000 compiled, every
  produced value stayed inside its proven bounds).
- `node engine/scripts/fuzz.ts full --seed 555 --count 200` — clean (194/200 compiled, interpreter
  and every target agree, in both idiom modes).
- `conformance/run.ts` — **4256/4256** matched, per target, in both idiom modes (typescript,
  python, go, rust, and their `-plain` counterparts), unchanged from before this pass.
- `conformance/run-source.ts` — `isValidCpf` 1,519/1,519, `formatCnpj` 160/160, `isValidCnpj`
  1,627/2,032 (405 on the one remaining `str.asciiUpper(trimmed)` gap), up from 1,519/1,519,
  not-run, and 1,216/2,032 before this pass. Two utilities newly run; five still do not
  (`formatCurrency`, `generateCpf`, `generateCnpj`, `getHolidays`, `isBusinessDay`,
  `getAddressInfoByCep` — six, all unrelated to checked accessors).
