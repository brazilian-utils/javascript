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
| TypeScript | 281 | 0 | 2 |
| Python | 268 | 13 | 2 |
| Go | 254 | 27 | 2 |

The portable selections are the interesting ones: `str.compare` on a value that is not proven
ASCII, in **every** target, and the calendar conversions. The 13 Python and 27 Go "library"
selections are that language's own standard library or a generated generic helper.

### 3. Backend size

| part | lines |
|---|---|
| frontend + HIR | 1166 |
| Core (checker, IR) | 2764 |
| analysis, link, comptime, optimize | 711 |
| intrinsics | 1827 |
| interpreter | 353 |
| backend framework | 1413 |
| target: TypeScript | 910 |
| target: Python | 961 |
| target: Go | 1207 |

Each backend is smaller than frontend + Core + analysis (4641), which is the shape the
architecture predicts: the expensive part is meaning, not syntax.

### 4. Generated expansion per utility

Source lines against generated lines, per target:

| utility | source | TypeScript | Python | Go |
|---|---|---|---|---|
| `is-valid-cpf` | 18 | 25 | 17 | 26 |
| `is-valid-cnpj` | 22 | 27 | 19 | 28 |
| `format-cnpj` | 14 | 24 | 17 | 30 |
| `get-holidays` | 49 | 57 | 39 | 55 |
| `is-business-day` | 22 | 35 | 20 | 32 |
| `get-address-info-by-cep` | 83 | 88 | 57 | 76 |
| `format-currency` | 25 | 40 | 27 | 51 |

Every utility is within 3× its source in every target; most are within 1.5×, and Python is
usually *smaller* than the source. 758 lines of source (including the engine's standard library)
produce 765 + 535 + 952 lines across the three targets.

### 5. Big-integer representations — **0**

No utility needs `bigint` or `math/big`: every proven range fits the platform-safe domain.
17 loops had their accumulator ranges widened rather than proven exactly, and 98 assignments were
clamped back into the platform domain under the bounded-step rule (`docs/semantics.md`, "Loops and
widening"). Both are reported rather than hidden, because a widened range is usually a hint that
the source could carry a tighter annotation.

### 6. Conformance — **4252/4252 in every target, in both idiom modes**

| comparison | result |
|---|---|
| reference interpreter vs the published npm package | 4245/4245 (every case that can be reproduced offline) |
| TypeScript, idiomatic and `--no-idioms` | 4252/4252 |
| Python, idiomatic and `--no-idioms` | 4252/4252 |
| Go, idiomatic and `--no-idioms` | 4252/4252 |

The seven remaining cases are `getAddressInfoByCep`, whose published implementation performs real
requests; they are compared between the interpreter and the three targets on scripted responses.

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
| `isValidCpf` | 63.4 ms | 36.6 ms | **0.58x** | within 1.5x |
| `isValidCnpj` | 129.7 ms | 105.7 ms | **0.82x** | within 1.5x |
| `formatCnpj` | 195.7 ms | 99.4 ms | **0.51x** | within 1.5x |

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

| | first pilot (`isValidCpf`) | last pilot (`formatCurrency`) |
|---|---|---|
| source lines | 18 (+ 34 in `lib/`) | 25 (+ 24 in `lib/`) |
| new intrinsics | 21 (`str.*`, `int.*`, `re.test`) | 0 |
| compiler changes | the frontend, the checker, the Core, the interpreter, three backends | none |
| conformance | the harness itself | 38 cases |

The fourth and fifth pilots (`getHolidays`, `isBusinessDay`) needed the `date.*` intrinsics and
the standard library's calendar; the sixth (`getAddressInfoByCep`) needed the capability plumbing
and two ADRs; the seventh needed nothing. The cost is front-loaded exactly where the thesis says
it should be.

## What this does not yet prove

- **One project, one domain.** The engine is domain-neutral by construction and
  `examples/generic` keeps it honest, but only Brazilian Utils has been ported.
- **Seven utilities out of 138.** [`core/docs/survey.md`](../../core/docs/survey.md) says 120 of
  them need only features that exist today; the remaining 18 need `Map`/`Set`, discriminated
  unions or Unicode normalization.
- **Three targets out of the eventual list.** The Rust sketch found two frictions, both from
  `std` being smaller than the other three standard libraries, and neither in the Core.
