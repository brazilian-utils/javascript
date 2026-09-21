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

The portable selections are the interesting ones: `str.compare` on a value that is not proven
ASCII, in **every** target, and the calendar conversions. The 12 Python and 27 Go "library"
selections are that language's own standard library or a generated generic helper.

### 3. Backend size

| part | lines |
|---|---|
| frontend + HIR | 1166 |
| Core (checker, IR) | 2984 |
| analysis, link, comptime, optimize | 716 |
| intrinsics | 1827 |
| interpreter | 353 |
| backend framework | 1418 |
| target: TypeScript | 949 |
| target: Python | 1059 |
| target: Go | 1259 |

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

Generated TypeScript against the handwritten implementation it replaces, same process, same
inputs, 200 000 iterations after a 20 000-iteration warm-up (`core/conformance/bench.ts`):

| utility | handwritten | generated | ratio | budget |
|---|---|---|---|---|
| `isValidCpf` | 55.7 ms | 33.9 ms | **0.61x** | within 1.5x |
| `isValidCnpj` | 110.7 ms | 86.9 ms | **0.78x** | within 1.5x |
| `formatCnpj` | 179.5 ms | 99.5 ms | **0.55x** | within 1.5x |

All three are faster than the handwritten code. They were not at first: the first measurement was
3.1x, 5.3x and 4.3x *slower*. Four changes closed the gap, and all four were lowering decisions
rather than changes to the source:

1. `re.retain`, an admitted intrinsic for "keep the scalars of this class", which is one pass in
   every target and refines its result to that class — replacing a scalar-list round-trip;
2. correcting the cost class of the portable string passes, which had been declared cheaper than
   the host's own pass and were therefore winning selection;
3. `str.charAtOpt` and `str.codeAtOpt`, checked positional accessors, so a scan does not have to
   materialize the scalars;
4. hoisting constant tables out of the functions that use them, so a weight table is not rebuilt
   on every call.

That is the architecture behaving as designed: performance was recovered by changing what the
compiler emits, not by rewriting a utility.

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
- **Three targets out of the eventual list.** The Rust sketch found two frictions, both from
  `std` being smaller than the other three standard libraries, and neither in the Core.
