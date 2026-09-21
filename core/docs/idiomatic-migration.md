# Migrating `core/source` to the ordinary spelling

`core/source` used to compile — `tsc` accepted it — without running: `str`, `re`, `seq`, `int`,
`date`, `dec`, `random` and `task` are ambient declarations (`engine/prelude/index.d.ts`) with
nothing behind them at runtime. This records what moved to the ordinary spelling the frontend now
recognizes (`engine/docs/semantics.md` §7.1), what still cannot move and why, and how the claim
"the source actually runs" is now checked rather than only asserted.

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

### Three occurrences that stayed on the namespace form on purpose

Three call sites look migratable but are not, for the same reason each time: the argument is
always a short, fixed-length value at its call site, so the checker's specialization *proves* the
index in range there — which means the bracket sugar (`s[i]`, `xs[i]`) would pick the *unchecked*
accessor instead of the checked one the source has always used. That is a different Core, not the
same one respelled, and it would move `core/out` by more than a rename. Each site has a comment
explaining this in place:

- `lib/cnpj.ts`, `hasLetter`: `str.codeAtOpt(value, index) ?? 0`. Also independently un-migratable
  regardless of specialization — see "The checked numeric accessor" below.
- `lib/format.ts`, `patternSlots` and `formatWithPattern`: `str.charAtOpt(pattern, index) ?? ""`,
  where `pattern` is always `PATTERN` or `OBFUSCATED_PATTERN` (fixed literals).
- `lib/json.ts`, `matchesAt`: `seq.at(needle, offset) ?? -2`, where `needle` is always
  `` str.codePoints(`"${key}"`) `` for a literal `key` (`"cep"`, `"uf"`, …).

## What still cannot move, and why

### The checked numeric accessor (`str.codeAtOpt`)

`hasLetter` (`lib/cnpj.ts`) scans an unbounded-length `Ascii` and cannot prove its index in range,
so it needs the *checked* accessor — but there is no ordinary spelling for it. The idiom table
recognizes `value[i]` as `str.charAtOpt`, the checked *string* form (JavaScript's own bracket index
on a string answers `undefined` past the end), but `value.charCodeAt(i)` answers `NaN` past the
end, not `undefined`, so it can only stand for the unchecked `str.codeAt`. There is no ordinary
JavaScript expression whose "past the end" behavior is `undefined` and whose in-range behavior is
a number. This is a smaller instance of the same gap as the five below, not one of them — it
blocks one helper, not a whole capability.

Effect on this migration: `is-valid-cnpj.ts`'s alphanumeric (`version: "2"`) path calls
`hasLetter` unconditionally once `cleaned` is non-empty, so it is the one place this specific gap
is externally visible: `isValidCnpj` runs correctly for every numeric-format case and for every
`version: "2"` case where the sanitized value is empty, and throws for the rest. `format-cnpj.ts`
is worse off — `formatWithPattern` always scans a fixed-length pattern, so *every* `formatCnpj`
call reaches the equivalent gap (`str.charAtOpt`) and none can run yet. Both are documented and
asserted precisely in `conformance/run-source.ts` (see below), not silently downgraded.

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
- **`isValidCnpj`** — every case (2,032) is attempted; 1,216 run for real and match, 816 hit the
  documented `str.codeAtOpt` gap in `hasLetter` (confirmed by asserting the exact `ReferenceError`
  that line throws, not just "something threw"). The step fails if the matched count reaches zero
  (the runnable half broke) or if the blocked count reaches zero (the gap silently vanished or the
  vectors stopped exercising it — either way, this file's claim about `isValidCnpj` would be stale
  and needs updating along with the step).
- **Everything else is named and skipped, with a reason, in the same file**: `formatCurrency`
  (`dec.*`), `generateCpf`/`generateCnpj` (`random.nextU32`), `getHolidays`/`isBusinessDay`
  (`date.*`), `getAddressInfoByCep` (`http.request`/`task.race`, and it would need a live network
  to compare against the published package regardless), and `formatCnpj` (`str.charAtOpt`,
  unconditional on every call, as described above).

A mismatch, an unexpected throw, or either count-shrinking condition fails the step and the
overall `verify.ts` run.

---

## Did `core/out` move?

No generated program logic did, in any of the four targets, in either idiom mode. After the
migration: `node ../engine/src/cli.ts build --project .` (idiomatic) and `--no-idioms` both
regenerate byte-identical `.ts`/`.py`/`.go`/`.rs` files and byte-identical `API.json`/`LOWERING.md`.

`SOURCEMAP.json` in each of the four tracked output directories *does* differ — every entry is a
`{start, end}` byte offset into the (now differently spelled, differently commented) source file,
one of the "three review artifacts every target produces" (`backend/generate.ts`) for pointing a
reader from generated code back to its source span. It carries no executable meaning and is
unavoidable: any edit to the source text at all, including a comment-only change, shifts byte
offsets later in the same file. This was checked file by file (`git diff --stat core/out`) rather
than assumed — the four `SOURCEMAP.json` files are the entire diff.

---

## Results

- `cd core && node ../engine/scripts/verify.ts .` — all 16 steps pass, including the new one.
- `node engine/scripts/fuzz.ts fast --seed 20260921 --count 1000` — clean (976/1000 compiled, every
  produced value stayed inside its proven bounds).
- `node engine/scripts/fuzz.ts full --seed 555 --count 200` — clean (194/200 compiled, interpreter
  and every target agree, in both idiom modes).
- `conformance/run.ts` — **4256/4256** matched, per target, in both idiom modes (typescript,
  python, go, rust, and their `-plain` counterparts), unchanged from before the migration.
