# Progress

Status of the milestones and the measured metrics. Every number here is produced by
`node scripts/metrics.ts ../core`, `node ../engine/scripts/verify.ts .` or
`npm run conformance` / `conformance/bench.ts` in `core/`, and can be re-derived.

## Milestones

| Milestone | State | Evidence |
|---|---|---|
| M0 survey, contracts, specification | done | [`core/docs/survey.md`](../../core/docs/survey.md), [`core/docs/contracts.md`](../../core/docs/contracts.md), [semantics.md](semantics.md), [decisions/](decisions) |
| M1 frontend, HIR, semantic checker | done | `src/frontend`, `src/hir`, `tests/subset.spec.ts` (19 rejected constructs), `tests/boundary.spec.ts` |
| M2 Core IR, linking, interpreter, comptime | done | `src/core`, `src/link`, `src/interp`, `src/comptime`, `--dump core` |
| M3 analysis | done | ranges, refinements, effects and capability threading live in the checker ([ADR 0003](decisions/0003-checker-lowers.md)); `tests/refinements.spec.ts` |
| M4 conformance infrastructure | done | `src/conformance`, `core/conformance`, capability fakes driven by one fixture file |
| M5 backend framework and TypeScript | done | `src/backend`, `src/targets/typescript`, `LOWERING.md`, `API.json`, `SOURCEMAP.json` |
| M6 Python and Go | done | `src/targets/python`, `src/targets/go` |
| M7 minimal `CivilDate` and `Decimal` | done | `date.*` and `dec.*` intrinsics, `stdlib/date.ts`, the holiday and currency pilots |
| M8 falsification report | done | [targets/rust-sketch.md](targets/rust-sketch.md), [adding-a-target.md](adding-a-target.md), [adding-a-utility.md](adding-a-utility.md), this file |

Not done, and deliberately: a tree-shaking bundle gate (needs a bundler in the toolchain), a baked
`Dataset` type, `Map`/`Set`, discriminated unions, and recursion.

## Metrics

### 1. Target conditionals outside the backends — **0**

Enforced, not asserted: `tests/boundary.spec.ts` reads every source file under `frontend`, `hir`,
`core`, `link`, `comptime`, `analysis`, `optimize`, `interp` and `intrinsics` and fails on an
import of `targets/` or a comparison against a target name. The same test proves only
`src/frontend/lower.ts` imports the parser.

### 2. Lowering mix

| target | native | library | portable |
|---|---|---|---|
| TypeScript | 304 | 0 | 2 |
| Python | 292 | 12 | 2 |
| Go | 277 | 27 | 2 |
| Rust | 250 | 54 | 2 |

The portable selections are the interesting ones: `str.compare` on a value that is not proven
ASCII, in **every** target, and the calendar conversions. The "library" column measures each
standard library rather than the engine: Rust needs twice as many as Go because `std` has no
regex, no left pad, no checked index and no stable sort that clones.

### 3. Backend size

| part | lines |
|---|---|
| frontend + HIR | 1166 |
| Core (checker, IR) | 2984 |
| analysis, link, comptime, optimize | 716 |
| intrinsics | 1827 |
| interpreter | 353 |
| backend framework | 1482 |
| target: TypeScript | 949 |
| target: Python | 1062 |
| target: Go | 1292 |
| target: Rust | 2384 |

Each backend is smaller than frontend + Core + analysis (4866), which is the shape the
architecture predicts: the expensive part is meaning, not syntax.

### 4. Generated expansion per utility

Source lines against generated lines, per target:

| utility | source | TypeScript | Python | Go |
|---|---|---|---|---|
| `is-valid-cpf` | 28 | 25 | 20 | 26 |
| `is-valid-cnpj` | 30 | 27 | 23 | 28 |
| `format-cnpj` | 28 | 24 | 20 | 30 |
| `generate-cpf` | 32 | 30 | 24 | 28 |
| `generate-cnpj` | 31 | 31 | 23 | 27 |
| `get-holidays` | 54 | 41 | 36 | 37 |
| `is-business-day` | 32 | 35 | 26 | 32 |
| `get-address-info-by-cep` | 104 | 88 | 62 | 76 |
| `format-currency` | 31 | 27 | 23 | 39 |

Every utility is within 3× its source in every target; most are *smaller* than their source, since
the source carries the prose that says why. 902 lines of source (including the engine's standard
library) produce 895 + 676 + 1060 lines across the three targets.

### 5. Big-integer representations — **0**

No utility needs `bigint` or `math/big`: every proven range fits the platform-safe domain.
16 loops had their accumulator ranges widened rather than proven exactly, and 98 assignments were
clamped back into the platform domain under the bounded-step rule (`docs/semantics.md`, "Loops and
widening"). Both are reported rather than hidden, because a widened range is usually a hint that
the source could carry a tighter annotation.

### 6. Conformance — **4256/4256 in every target, in both idiom modes**

| comparison | result |
|---|---|
| reference interpreter vs the published npm package | 4247/4247 (every case that can be reproduced offline) |
| TypeScript, idiomatic and `--no-idioms` | 4256/4256 |
| Python, idiomatic and `--no-idioms` | 4256/4256 |
| Go, idiomatic and `--no-idioms` | 4256/4256 |

The nine cases the npm comparison leaves out are `getAddressInfoByCep`, whose published
implementation performs real requests, and the two generators, which have no deterministic
reference to compare against; all nine are compared between the interpreter and the three targets,
on scripted responses and on the reference generator. What the generators draw is then fed back
through `isValidCpf` and `isValidCnpj` in the same run, so three targets agreeing bit for bit on
an invalid document would still fail.

### 7. Idiomaticity

`tsc --strict --noEmit`, `python3 -m compileall` and `go vet` are clean over the generated output,
and the output is formatted by Prettier, `ruff format` and `gofmt`. `verify` runs all of it.

Read `out/python/get_holidays.py` and `out/go/get-holidays.go` side by side: the same utility is a
`sorted(key=…)` in one and a `slices.SortStableFunc` in the other, from one source.

### 8. Performance

**The bar is 1.0x, not 1.5x.** `core/bench/README.md`'s original budget was "within 1.5x of the
handwritten implementation"; every row below is now judged against **equal or faster**, and 1.5x
survives only as a line a row used to be allowed to cross. Numbers below are from
`node core/bench/run.mjs`, the cross-language harness (`core/bench/`), which asks the same
question of every language against the implementation that language's community actually ships —
`brazilian-utils/{python,go,rust}` for Python, Go and Rust; this package's own `src/` for
TypeScript.

| language | utility | ratio before this pass | ratio now | moved by |
|---|---|---|---|---|
| typescript | `getHolidays` | 1.77x | **0.93x** | `date.fromYmd` native candidate, below |
| typescript | `isBusinessDay` | 1.26x | **0.66x** | inherits `getHolidays`' fix |
| typescript | `generateCpf` | 1.44x | **1.06x** | call-site inlining, budget 6 |
| typescript | `generateCnpj` | 1.24x | **1.10x** | call-site inlining, budget 6 |
| python | `formatCurrency` | 2.91x | **2.66x** | `trunc_mod`/`trunc_div` inlined; ASCII-byte `codePoints`/`fromCodePoints` |
| python | `generateCpf` | 1.86x | **1.65x** | call-site inlining, budget 12 |
| python | `generateCnpj` | 1.99x | **1.89x** | call-site inlining, budget 12 |
| go | `formatCurrency` | 1.08x | **0.93x** | ASCII-byte `re.retain`, `codePoints`/`fromCodePoints` |
| rust | `isValidCpf` | 2.73x | **2.57x** | ASCII-byte `re.retain` (`keep_digits`) |
| rust | `isValidCnpj` | 1.43x | **1.35x** | inherits the same `re.retain` fix |
| rust | `formatCurrency` | 1.81x | **1.74x** | one-buffer `str.concatAll`; ASCII-byte `re.retain` |
| rust | `generateCpf` | 2.37x | **1.68x** | one-buffer `str.concatAll` (nine-digit chain) |
| rust | `generateCnpj` | 1.89x | **1.22x** | one-buffer `str.concatAll` (twelve-digit chain) |

Every other row (`isValidCpf`/`isValidCnpj`/`formatCnpj` in every language, Go's `generateCpf`/
`generateCnpj`) was already at or under 1.0x and stayed there. `core/bench/README.md`'s
"What the numbers actually showed" and "Rust" sections carry the full account, row by row,
including the three shapes behind every fix (a missing native candidate, a per-target inlining
budget, one allocation instead of a chain) and what remains over 1.0x with the reason it cannot
come down further inside this pass: Python's `formatCurrency`/`generateCpf`/`generateCnpj` and
Rust's `isValidCpf`/`formatCurrency`/`generateCpf`.

**The missing candidate.** `civilDate` (`core/out/typescript/lib/civil.ts`) computed a day forward
and then verified it by decomposing the result back through three more floor-division-heavy
Hinnant functions — a round trip that was 78% of `getHolidays`' call. The round trip only answers
one question, "is `day` within the month it names", which a days-in-month table (28-31, with
February's leap adjustment) answers directly; a native TypeScript candidate for `date.fromYmd` now
does the table check plus the single forward computation, with no `new Date` involved at all — a
`Date`-based candidate was tried first and measured *slower* than the portable round trip it was
meant to replace (Date construction and its getters cost more than four Hinnant functions), which
is exactly why every claim in this document is a measurement, not an assumption from the shape of
the problem.

**Per-target inlining, measured per target.** `randomDigit → randomBelow → env.nextU32()` is a
three-layer call chain run 9-12 times per `generateCpf`/`generateCnpj` call, in every language that
has it. `engine/src/optimize/inline.ts` splices an eligible callee's body into its call site
(parameters bound once each, an early `return` turned into an `Option` assignment plus a `break`
where it is inside a loop), run once per target from `generate` with that target's own budget —
because whether this is free is a target property, not a program property:

- **Python: aggressive (budget 12).** CPython pays a full stack frame per call with no JIT to elide
  it; inlining the whole chain (`random_digit`, `random_below`, and incidentally `cpf_check_digit`/
  `is_repeated`, both under the same budget) took `generateCpf` from 1.86x to 1.65x and `generateCnpj`
  from 1.99x to 1.89x. The trade is real: `generate_cpf.py`'s body is now one long flattened
  function rather than a chain of four-line helpers, and Python has no bundle-size constraint to
  weigh that against, so the budget stayed at 12.
- **TypeScript: conservative (budget 6), measured against a larger one.** V8 already inlines a
  small monomorphic call once it is hot; a budget of 1 (inlining only `randomDigit`'s single-`return`
  body, not `randomBelow`'s rejection-sampling loop) left `generateCpf`/`generateCnpj` at 1.14x-1.25x
  — barely moved, confirming the JIT was not the bottleneck by itself. A budget of 6 (`randomBelow`'s
  own size) reached 1.06x/1.10x. **Bundle-size effect, measured**: `generate-cpf.ts` grew from 45 to
  408 lines (1796 to 14695 bytes) and `generate-cnpj.ts` from 55 to 519 lines (1959 to 18305 bytes);
  the whole `core/out/typescript` tree grew from 156322 to 187760 bytes (+20%), partly offset by
  `lib/random.ts` disappearing entirely (everything that called it now has it spliced in) and by
  `std/date.ts` shrinking from the `date.fromYmd` fix above. This is the trade the task asked to be
  stated, not hidden: a real speed win, paid for in bytes, for a row that was already close to 1.0x
  before the pass and stayed close after.
- **Rust: none, and the reason is itself a finding.** A first attempt at budget 6 measured *worse*
  code, not better: this pass has no notion of a Rust borrow (`docs/decisions/0010-*.md`) — it binds
  every inlined parameter as an owned local, so an inlined call to a function that ADR 0010 had
  proven could borrow its argument instead printed a `.to_owned()` at every splice, one full string
  clone per digit. That is exactly the allocation ADR 0010 exists to avoid, and by more than the
  call overhead this pass would have removed, so `inlineBudget` is deliberately absent from
  `RUST_BACKEND` (`engine/src/targets/rust/index.ts`'s own comment there has the same account). A
  follow-up `#[inline]` attribute hint (a much smaller ask: let rustc's own inliner decide) was
  tried and measured to change nothing (`isValidCpf`: 22-25ms with or without it, indistinguishable
  from run-to-run noise) — rustc was already making the same decision either way — so that was
  reverted too rather than kept as an unproven change.
- **Go: not attempted.** Every Go row was already at or under 1.0x before this pass except
  `formatCurrency`, which the allocation fix below closed without touching call structure.

**Allocation.** Two shapes, one in Rust, one in three languages at once:

- `re.retain` (`keep_digits`, `keep_alphanumeric`) walked `.chars()`/`strings.Map`/
  `[ord(c) for c in whole]`-style, decoding the whole input as Unicode scalars before ever testing
  one. Every class this project retains is ASCII (digits, upper and lower case letters), and an
  ASCII byte needs no decoding to be range-tested — a multi-byte scalar's bytes are all ≥ 0x80, so
  each one fails an ASCII range test on its own exactly as the decoded scalar would have, meaning a
  byte-wise scan is not an approximation, it is the same predicate for less work. Rust
  (`String::from_utf8(bytes().filter(...).collect())`) and Go (a `[]byte` scan) both got this
  candidate, gated on every retained range being ≤ 127; a non-ASCII-range class (none exist in this
  project today) still falls back to the scalar-wise pass. Python's and Go's `str.codePoints`/
  `str.fromCodePoints` (`group_thousands`' `out` list, proven `IntRange<0,127>` by its own source
  type) got the same treatment for the same reason.
- Rust's string assembly built a `+` chain (`a + b + c`) as nested `str.concat` calls, each
  allocating and copying everything to its left — `format_currency`'s `prefix`/`sign`/`body`
  assembly and every `concat2` in `random_cpf_base`'s nine-digit chain were exactly this.
  `backend/lower.ts`'s `operation` now flattens a chain of three or more pieces into their leaves
  before lowering, and hands them to a new `str.concatAll` op when a target declares one (Rust
  only, today; every other target falls through to the unchanged pairwise path). Rust's
  `str.concatAll` sizes one buffer once, from every piece's own length, and pushes each piece into
  it — with each length-costing piece bound to a local first, so a piece that is itself a call
  (`group_thousands(keep_digits(&whole))`) runs once, not twice for sizing and pushing both; a
  single-character literal piece prints `.push('x')`, not `.push_str("x")`, for
  `clippy::single_char_add_str`.

That is the architecture behaving as designed: performance was recovered by changing what the
compiler emits, not by rewriting a utility. Conformance stayed 4256/4256 in every target, in both
idiom modes, throughout every fix in this section; `node engine/scripts/fuzz.ts fast` and `full`
both stayed clean.

### 9. Marginal cost

| | first pilot (`isValidCpf`) | a late pilot (`formatCurrency`) |
|---|---|---|
| source lines | 28 (+ 39 in `lib/`) | 31 (+ 55 in `lib/`) |
| new intrinsics | 21 (`str.*`, `int.*`, `re.test`) | 0 |
| compiler changes | the frontend, the checker, the Core, the interpreter, three backends | none |
| conformance | the harness itself | 38 cases |

The fourth and fifth pilots (`getHolidays`, `isBusinessDay`) needed the `date.*` intrinsics and
the standard library's calendar; the sixth (`getAddressInfoByCep`) needed the capability plumbing
and two ADRs; the seventh needed nothing. The eighth and ninth (`generateCpf`, `generateCnpj`)
needed one more intrinsic, `random.nextU32`, and everything derived from it — a uniform value
below a bound, by rejection sampling — is written in the subset, because a modulo bias would
otherwise have to match digit for digit across three standard libraries to stay invisible. The
cost is front-loaded exactly where the thesis says it should be.

## What this does not yet prove

- **One project, one domain.** The engine is domain-neutral by construction and
  `examples/generic` keeps it honest, but only Brazilian Utils has been ported.
- **Nine utilities out of 138.** [`core/docs/survey.md`](../../core/docs/survey.md) says 120 of
  them need only features that exist today; the remaining 18 need `Map`/`Set`, discriminated
  unions or Unicode normalization.
- **Four targets, and the falsification held.** Rust was the one meant to break the design, and
  it did not: `std` only, no crate, 4256/4256, and both frictions the sketch predicted turned out
  to be about `std` rather than about the Core. What is still untried is a language whose strings
  are UTF-16, which is where `str.compare`'s precondition gets its real test.
