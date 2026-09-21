# Cross-language benchmark

Answers one question per language: is the code the engine generates (`core/out/<language>/`)
faster or slower than the implementation that language's community actually ships? The ratio is
always **generated ÷ handwritten**, so below 1.0 means the generated code is faster -- the same
convention `conformance/bench.ts` already used.

## Running it

```sh
node core/bench/run.mjs
```

from the repository root. It runs each language's harness as a subprocess -- `node` for
TypeScript, `python3` for Python, `go run` for Go -- and folds their results into one combined
table. Each harness also runs standalone if you want just one language's numbers with its own
progress output:

```sh
cd core && node --import ./conformance/sloppy-imports.mjs ./bench/typescript.ts
python3 core/bench/python.py
cd core/bench/go && go run .
cd core/bench/rust && cargo run --release
```

## What this needs that isn't in this repository

The handwritten ports are cloned read-only, outside this repository, so this benchmark cannot run
in CI -- there is nothing to attach these paths to there. If a path is missing, `run.mjs` (and
each standalone harness) prints exactly which one and the clone command that fixes it, then skips
that language and keeps going:

They are expected in a `brazilian-utils/` directory beside this repository's checkout, which is
what the clone commands below produce. Set `BRUTILS_ROOT` to point somewhere else.

```sh
cd ..                                                       # beside the javascript checkout
git clone https://github.com/brazilian-utils/python brazilian-utils/python
git clone https://github.com/brazilian-utils/go     brazilian-utils/go
git clone https://github.com/brazilian-utils/rust   brazilian-utils/rust
```

TypeScript needs no external clone: its handwritten side is `../src` in this same repository.

Python's `formatCurrency` row additionally needs `num2words` installed (`pip install num2words`):
`brutils/currency.py` imports it at module scope even though `format_currency` itself never calls
it -- the same "declared but unused by this function" situation `cpf.py`/`cnpj.py` have with
`holidays`, except this one cannot be dodged by loading the file directly (see `python.py`'s
docstring), because the import is inside `currency.py` itself, not in `__init__.py`'s re-export
chain.

The numbers in this file were measured against these commits. Pin them to reproduce the
comparison byte for byte, since the ports move independently of this repository:

| port | commit | dated |
| --- | --- | --- |
| `brazilian-utils/python` | `330627e9d76df2c2a484ca4c6afd2ac9e20a995f` | 2026-09-11 |
| `brazilian-utils/go` | `ea155a85a012f0c5ed01a04f50a92a7edff7656c` | 2026-09-13 |
| `brazilian-utils/rust` | `a60585f7ae517adfb7389d3398da74916dd123f3` | 2026-09-14 |

The Go harness reaches its port through a `replace` directive in `core/bench/go/go.mod`, which is
a path relative to that file rather than an absolute one, so the default layout needs no
environment at all; `run.mjs` rewrites it for the run and restores it when `BRUTILS_ROOT` is set.

## Toolchain versions measured with

Recorded live by each harness and printed in the combined table's "Toolchain versions" section;
as measured for the run in this report:

- node: v22.22.2
- python: 3.11.15
- go: go1.24.7 linux/amd64
- rustc: rustc 1.94.1 (e408947bf 2026-03-25)

(Matches `engine/toolchain.lock.json`'s `measuredWith` block, which is the generator's own record
of what it was last verified against.)

## Utilities covered

The generated core has nine utilities. `getAddressInfoByCep` is not benchmarked anywhere -- it
makes real network calls, which a tight timed loop cannot exercise fairly -- so eight are in
scope, and the table below is what each language's harness actually compares them against.

| utility | TypeScript | Python | Go | Rust |
| --- | --- | --- | --- | --- |
| `isValidCpf` | yes | yes | yes | yes |
| `isValidCnpj` | yes | yes | yes | yes |
| `formatCnpj` | yes | excluded | yes | excluded |
| `formatCurrency` | yes | yes | yes | yes |
| `getHolidays` | yes | excluded | excluded | excluded |
| `isBusinessDay` | yes | excluded | excluded | excluded |
| `generateCpf` | yes | yes | yes | yes |
| `generateCnpj` | yes | yes | yes | yes |
| `getAddressInfoByCep` | not benchmarked (network calls) | | | |

No port exposes a directly comparable `formatCpf` with the same options shape as the generated
core, so it is left out for all four languages rather than force a mismatched comparison.
`formatCnpj` is excluded for Python (checksum validation, see below) and for Rust (same reason,
and it predates this pass -- `brazilian_utils::cnpj::format_cnpj` has the identical
validate-then-format contract). `getHolidays` and `isBusinessDay` are covered **only for
TypeScript**: Python's `brutils`, Go's `brazilian-utils/go` and Rust's `brazilian_utils` each
expose just `is_holiday(date, uf)` (or `IsHoliday`) -- a single-day boolean check built differently
in every port (Python wraps the third-party `holidays` package; Go and Rust hand-list state
holiday tables) -- with no function that returns a year's list and no weekend/business-day concept
at all. There is no counterpart with the same shape to compare against in any of the three, so all
six rows (two utilities × three languages) are left out; each harness's `skipped` list records the
same reason. TypeScript's own `src/get-holidays` and `src/is-business-day` are genuine counterparts
(same contract family, see `core/docs/contracts.md`), so those two rows exist for TypeScript alone.

`generateCpf` and `generateCnpj` are covered for all four languages, but not by equality -- see
"The generator agreement rule" below.

## Honesty notes: what each side's API actually expects

This is the part that decides how the table is shaped, not an afterthought.

**TypeScript.** Both the handwritten `src/*` functions and the generated
`core/out/typescript/*` functions take a value "as written" (masked or not) and do their own
normalization internally -- neither side does work the other skips. One `full-pipeline` variant
per utility is a fair comparison, and it's the one `conformance/bench.ts` already established.

**Python.** `brutils.cpf.is_valid` / `brutils.cnpj.is_valid` do *not* strip mask characters --
they require an already-digit (or already-alphanumeric, for CNPJ) string and return `False` on
anything else without doing any real validation work. Feeding them a masked string would not
exercise their logic at all, so every Python row is `normalized`: both sides receive the same
pre-sanitized, mask-free string. This means the generated core is doing marginally more work than
strictly necessary even here (its regex still walks the string checking for mask characters that
aren't present), which is a small, known bias in the generated core's favor being *reported*, not
hidden.

`brutils.cnpj.format_cnpj` is excluded entirely: it calls `is_valid` first and returns `None` on a
bad checksum, while the generated `formatCnpj` never validates a checksum at all. That's not a
normalization difference you can paper over with a shared input -- it's a different contract
(validate-then-format vs. format-unconditionally). Timing them against each other would mostly
measure the checksum computation Python's port does and the generated core does not, so no number
is published for it.

**Go -- the one with a trap in it.** `cpf.IsValid`, `cnpj.IsValid`, `cpf.Format` and `cnpj.Format`
all normalize their input themselves, via `helpers.OnlyNumbers`:

```go
func OnlyNumbers(numbers string) string {
	numericStr := regexp.MustCompilePOSIX("[0-9]+").FindAllString(numbers, -1)
	return strings.Join(numericStr[:], "")
}
```

which **compiles a POSIX regex on every call**, then allocates a `[]string` and joins it. There is
no lower-level entry point that skips this, so it cannot be avoided by calling "the checksum part
only" -- that part is unexported. Two variants are reported for `isValidCpf` and `isValidCnpj`:

- `full-pipeline`: both sides receive the same raw, masked input, and each does its own
  normalization plus validation. This is what a real caller of either library experiences, and
  it's fair because both sides are doing equivalent work.
- `normalized`: both sides receive the same pre-stripped digit-only input. This isolates most of
  the checksum work from the mask-stripping work, but not all of it -- the Go port's public
  functions call `OnlyNumbers` unconditionally, so even here the handwritten side still compiles a
  regex and rebuilds a string on every call, a cost the generated side does not pay once its input
  is already digits-only.

`formatCnpj` is compared only as `full-pipeline`, and only the plain case: the Go port's `Format`
has no `pad`, `obfuscate` or alphanumeric (version `2`) option, so those variants aren't
comparable and are left out. CNPJ validation is compared at version `"1"` (numeric) only, for the
same reason `IsValidCnpj`'s alphanumeric path has no counterpart -- `OnlyNumbers` strips letters
before the length check, so the Go port has no alphanumeric CNPJ support at all.

None of this is a criticism of the Go port or a suggestion to change it -- it's read-only, nothing
here modifies it, and the observation is only about what the "normalized" numbers do and don't
isolate.

**`formatCurrency` -- no `full-pipeline` variant exists for anyone.** `core/docs/contracts.md` is
explicit: the generated core's contract always takes an already-scaled `Decimal<2>` (an integer
number of cents), never a raw float or string -- scaling a host value into that shape is DX work,
done once, outside the core. Every port's own `format_currency`/`FormatCurrency` takes a raw
float and does its own scaling internally. There is no shape in which both sides do equivalent
"raw input" work, so unlike CPF/CNPJ, there is no `full-pipeline` row to publish here in any
language -- every `formatCurrency` row is `normalized`, meaning both sides receive the value
pre-processed into the shape their own API expects, which happens to hand the generated side less
work than a caller starting from a raw float would (it skips the float-to-decimal conversion the
handwritten side always does). This is a known, disclosed bias in the generated core's favor,
reported rather than hidden, the same way the Python CPF rows disclose theirs.

Python's `brutils.currency.format_currency` and Go's `currency.FormatCurrency` also have no
`symbol` option at all -- both always prefix `"R$ "` -- so the generated side is called with
`symbol=true` to match; there is no variant that compares the un-prefixed case for either.

**A real disagreement, found on every non-TypeScript port: where the minus sign goes.** All three
handwritten ports checked here -- `brutils.currency.format_currency` (Python),
`currency.FormatCurrency` (Go) and `brazilian_utils::currency::format_currency` (Rust) -- format a
negative amount as `"R$ -1.234,56"`: the symbol first, then the sign, then the number. The
generated core (and the TypeScript package it is modeled on -- see `core/docs/contracts.md` and
`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(-1234.56)`, which
produces `"-R$ 1.234,56"`) puts the sign *before* the symbol instead. Every harness includes a
negative value in its input set specifically to surface this, and it is not papered over: each of
the three non-TypeScript harnesses reports it as a disagreement (`input=-1234.56`,
`handwritten="R$ -1.234,56"`, `generated="-R$ 1.234,56"`), and `run.mjs`'s combined table prints
all three under "DISAGREEMENTS" rather than silently excluding the value that triggers it.

This is **not** a code-generation defect -- the generated core is doing exactly what its own
contract (traced to the published npm package's `Intl`-based output) says to do, and TypeScript's
own handwritten `src/format-currency` agrees with it on every value tested, including negative
ones. It is a genuine, independent divergence between three unrelated community reimplementations
(which all happened to agree with *each other* on sign placement) and the JS package all of this
tooling traces its contract to. Nothing here is changed to "fix" it, in either direction; it is
reported because rule 1 says a disagreement is a finding worth more than a benchmark row, and the
timed rows still run afterward on the same input set, following the same convention the CPF/CNPJ
rows already use elsewhere in this suite.

## The generator agreement rule, and what threading randomness through a capability costs

`generateCpf` and `generateCnpj` draw at random, so there is no fixed value for either side to
compare for equality -- a byte-for-byte match would only mean both sides used the same seed, not
that either one is correct. Every harness instead runs 500 samples through this check, before
either side is timed:

- every value the **handwritten** port produces must validate under **both** validators: its own
  port's `is_valid`/`IsValid`, and the generated core's `isValidCpf`/`isValidCnpj`;
- every value the **generated** core produces must also validate under both.

A generator that is fast because it skips work a correct one would do -- producing a document that
fails its own port's checksum, or one the generated validator rejects -- fails this check and is
reported as a disagreement (`core/bench/typescript.ts`'s `checkGeneratorAgreement` and its
Python/Go/Rust equivalents), not silently allowed to post a number. Every language passed this
check on every sample in every run made while building this section: no generated or handwritten
value failed either validator.

**The capability-threading difference.** The generated `generateCpf`/`generateCnpj` take a
`Capabilities` record (`env`) because the engine threads randomness as an effect, the same way it
threads HTTP and the clock -- see `core/out/typescript/capabilities.ts`'s `Capabilities` type, and
its equivalents (`python._support.Capabilities`, the Go `Capabilities` interface,
`coreout::support::Capabilities` in Rust). Every handwritten port instead calls its language's
global RNG directly (`Math.random()`, `random.randint`, `math/rand`, `rand::thread_rng()`) with no
capability object at all. This is a real, structural difference in how the two sides get
randomness, not a detail to bury -- and each harness builds its `Capabilities` value **once**,
outside the timed loop, and reuses it for all 200,000 calls, the way a real caller would build one
environment and thread it through many calls rather than rebuild it per call. Passing that
already-built value into each call is cheap; what is *not* always cheap is what `next_u32()` does
once it's called, and that is where the language-by-language story diverges -- see "What the
numbers actually showed" and the Rust section below for the measured breakdown in each language.

## What the numbers actually showed

Run `node core/bench/run.mjs` for current numbers; this section describes what was found while
building the harness, not a frozen result.

- TypeScript and Python: the generated core lands close to its handwritten sibling on
  `isValidCpf`/`isValidCnpj`/`formatCnpj` (TypeScript clearly faster across all three rows; Python
  within a few percent either way on both rows).
- Go: the first run came back 6-9x *slower* on the generated side for `isValidCpf` and
  `isValidCnpj`, on both variants, while generated `formatCnpj` -- which uses no regex -- was
  about 3x faster. That split was the whole diagnosis: the Go target emitted
  `regexp.MustCompile(...)` **inline in the function body**, so a large Unicode-range pattern was
  recompiled from its source string on every call. `regexp` has no compilation cache, and measured
  on its own the compile costs 2257.5 ms against 28.4 ms for the match over 200 000 iterations --
  **79.6x**, which is to say the benchmark was almost entirely timing regex compilation.

  The Go target now lifts every pattern into a package level `var`, the way a Go author would
  have written it, and the same rows come back at **0.14x to 0.16x** -- the generated code is
  roughly six times faster than the handwritten port rather than seven times slower. This is the
  most valuable thing the benchmark produced, and it is the argument for benchmarking against
  another language's real implementation rather than against yourself: the TypeScript benchmark
  had been green for weeks and could not have found it, because JavaScript caches compiled regex
  literals and Python caches compiled patterns in `re`, so only Go ever paid the cost.
- No disagreements were found on any `isValidCpf`/`isValidCnpj`/`formatCnpj`/`getHolidays`/
  `isBusinessDay` input, in any language -- see "Honesty notes" above for the one disagreement
  this pass did find (`formatCurrency`'s negative-sign placement, on Python, Go and Rust, not
  TypeScript), and "The generator agreement rule" for `generateCpf`/`generateCnpj`'s validity
  checks, all of which passed everywhere.
- TypeScript `getHolidays` (1.66x) and `isBusinessDay` (1.73x), both mildly over budget. Neither
  is caching: `src/get-holidays`'s per-year `Map` memoization looked like the obvious suspect (a
  real caller benefits from it, the generated core has nothing equivalent), but defeating it --
  200 distinct years, never repeating one -- changed the handwritten side's time by well under 1%
  (186.5 ms cached vs. 188.0 ms uncached over 200,000 calls), so the cache is not what is being
  measured here. Isolated with the same "time the pieces" approach the Go and Rust findings below
  use: `civilDate` (`core/out/typescript/lib/civil.ts`), called once per fixed holiday to turn a
  `(year, month, day)` triple into an epoch-day integer, costs 294.6 ms for 12 calls × 200,000
  iterations against a 378.8 ms whole `getHolidays` call -- about 78% of it. `civilDate` computes
  the day forward (`daysFromCivil`) and then verifies the round trip by computing `yearFromDays`,
  `monthFromDays` and `dayFromDays` back from it, four Howard Hinnant floor-division-heavy
  functions per call; the handwritten side instead calls `new Date(year, month - 1, day)`, one
  native V8 binding. That is the whole gap: portable, hand-rolled calendar math the core needs
  because it has no host `Date` type (`core/docs/contracts.md`: "the core never sees a zone") costs
  more than V8's own, highly optimized calendar engine. `isBusinessDay` inherits the same cost,
  because it calls generated `getHolidays` on every invocation with no caching of its own.
- TypeScript `generateCpf` (54.9x) and `generateCnpj` (48.4x), the largest gap this pass found
  anywhere. Isolated the same way: `randomCpfBase` (nine `env.nextU32()` draws) alone costs 4029 ms
  over 200,000 calls, against 3985-4129 ms for the whole `generateCpf` call across runs -- **at
  least 97%** of it, with `cpfCheckDigit` alone costing 4.9 ms, noise by comparison.
  `defaultCapabilities().nextU32()` (`core/out/typescript/capabilities.ts`) is backed by
  `crypto.getRandomValues(new Uint32Array(1))`; called alone, 200,000 draws cost 434.9 ms, against
  3.3 ms for 200,000 calls to `Math.random()`, the generator `src/generate-cpf` actually uses --
  **about 130x** the cost per draw. `generateCpf` makes nine of these draws per call (twelve for
  `generateCnpj`), so the entire ratio is explained by one thing: the default capability's choice
  of a syscall-backed CSPRNG, allocating a fresh `Uint32Array` per draw, called once per digit,
  against a single native, in-process float generator called once per document on the handwritten
  side. Nothing in the generated check-digit or string-building logic is at fault -- see "The
  generator agreement rule" above for why the capability, not the core, is what this measures.
- Python `formatCurrency` (2.74x). `group_thousands(keep_digits(whole))`
  (`core/out/python/lib/format.py` and `lib/digits.py`) alone costs 389.6 ms over 200,000 calls,
  against 503.8 ms for the whole generated `format_currency` call -- about 77%. `keep_digits` is a
  compiled-regex substitution and is cheap on its own; the cost is in `group_thousands`, which
  turns the string into `scalars: List[int] = [ord(c) for c in whole]`, walks it calling
  `trunc_mod` (a Python function call doing sign-aware modulo) once per character to decide where
  a `.` goes, then rebuilds the result with `"".join(chr(p) for p in out)` -- three to six Python
  function calls per character of a number that, in every value tested here, has at most six
  digits. `brutils.currency.format_currency` does the whole job in one call into `Decimal`'s C
  formatting machinery (`f"R$ {decimal_value:,.2f}"`) with no per-character Python loop at all.
  Same shape of finding as the Rust regex story below: a small, generic, reusable primitive
  (`group_thousands`, callable on a value of any length) costs more in per-character Python
  function-call overhead than a native formatter built for exactly this job.
- Python `generateCpf` (3.52x) and `generateCnpj` (3.97x) -- present, but far smaller than
  TypeScript's, and for a more mixed reason. `random_cpf_base` (nine `next_u32()` draws through
  the rejection-sampling wrapper) costs 1946 ms over 200,000 calls against 2612 ms for the whole
  `generate_cpf` call (about 75%); `cpf_check_digit` alone costs 184 ms per call, so its two calls
  in `generate_cpf` account for another ~14%. Unlike TypeScript, the capability itself is not the
  dominant cost: `python._support.Capabilities.next_u32` (`secrets.randbits(32)`) costs 132.8 ms
  for 200,000 calls, only about 2.1x `random.randint`'s 63.2 ms baseline -- nowhere near
  `crypto.getRandomValues`'s ~130x. Most of `random_cpf_base`'s cost is instead ordinary Python
  function-call overhead: nine separate `random_digit(env)` → `random_below(10, env)` →
  `env.next_u32()` call chains (manually timed at 1412 ms for nine raw `next_u32()` calls alone,
  meaning the wrapper functions add roughly as much again on top), against
  `str(randint(1, 999999998)).zfill(9)` on the handwritten side -- one draw, formatted once.

## Rust

`core/bench/rust/` compares the generated crate against `brazilian_utils`. Both sides take a
digits-only value -- `brazilian_utils::cpf::validate` rejects anything else before doing any work
-- so the Rust rows are `normalized` only, the same shape as the Python rows rather than Go's two
variants. `cnpj::format_cnpj` is left out for the same reason Python's is: it validates the
checksum and answers `None` for a bad one, while the generated `format_cnpj` never validates.

The generated crate **was correct and slow**: no disagreement on any input, and 50x / 24x the time
of the handwritten crate. The cost was not spread around, it was one thing. Timed against the
generated crate directly, before the fix:

| | 200 000 iterations |
| --- | --- |
| `support::re_test` alone | 266.9 ms |
| `keep_digits` alone | 11.7 ms |
| one `String` clone (baseline) | 3.4 ms |
| `is_valid_cpf` whole | 339.5 ms |

`std` has no regex, so the Rust target generated its own matcher: a `ReNode` tree walked by an NFA
simulation that returned a fresh `Vec<usize>` of reachable positions per node per position, sorting
and deduplicating each one. That interpretation was 79% of the call.

**The fix.** The engine knows every pattern in a project before it generates any Rust, so there is
no reason to interpret a pattern tree at call time at all. Each pattern now compiles to a dedicated
scanner -- straight-line Rust for that exact pattern, no allocation, one forward pass over `&str`
-- when it is a chain of character-class runs with no alternation, which is every pattern
`core/source` uses; a pattern that needs more than that (alternation, a repeated group) falls back
to a backtracking matcher over `&str` slices, also allocation-free, ported directly from the
engine's own reference regex matcher. `engine/docs/targets/rust.md` has the full account, and
`engine/src/targets/rust/index.ts`'s "Regex" section and `LOWERING.md`'s `re.test` row name the
rule that decides which pattern gets which. Re-measured the same way:

| | 200 000 iterations |
| --- | --- |
| `support::re_match_3` alone (the CPF pattern's scanner) | 4.4 ms |
| `keep_digits` alone | 11.2 ms |
| one `String` clone (baseline) | 2.6 ms |
| `cpf_check_digit(_, 9)` alone (includes its own `keep_digits`) | 44.9 ms |
| `is_valid_cpf` whole | 78.0 ms |

The matcher went from 79% of the call to noise: `support::re_match_3` costs about what walking an
11-character string once should. `isValidCpf` and `isValidCnpj` came down from **50x/24x to
10.8x/3.6x** the handwritten crate -- a 4.6x and 6.7x speedup respectively, and conformance stayed
4256/4256 in both idiom modes throughout, because nothing about the fix changes what a pattern
accepts (`node --test` also still passes `engine/tests/regex.spec.ts`, and every pattern
`core/source` uses classifies as the scanner shape, so the fallback matcher is unexercised code on
this project, not a silent second answer to any of these four patterns).

**What was left after the regex fix, and why it was not "the same thing, still there".** The
bottleneck was not the regex at all: it was `cpf_check_digit`'s loop, `sum += digit_at(cpf.to_owned(),
index)` run 9 or 10 times per call. Every value was owned wherever it was bound ([ADR
0009](../../engine/docs/decisions/0009-rust-values-are-owned.md)), so each call to the
`digit_at(value: String, ...)` helper needed its own owned copy of the 11-digit string -- one
`to_owned()` per loop iteration, not one per top-level call, because the loop called a
String-taking helper instead of indexing bytes directly. `cpf_check_digit(_, 9)` alone, at 44.9 ms,
accounted for most of the remaining gap; the other `cpf_check_digit(_, 10)` call, `is_repeated`, and
two more `digit_at` calls in `is_valid_cpf` itself made up the rest. `cnpj_check_digit` never had
this cost -- its source indexes `cnpj.as_bytes()[index]` directly rather than calling a
String-taking helper in its loop -- which is exactly why `isValidCnpj`'s gap (3.6x) was so much
smaller than `isValidCpf`'s (10.8x) despite CNPJ validating more digits: the difference was which
loop-body shape `core/source` happened to use, not the pattern each one matched. Against Go, on
this same benchmark, generated Rust was already behind on both rows (`isValidCpf` 79.7 ms vs. Go's
39.4 ms; `isValidCnpj` 52.3 ms vs. Go's 49.2 ms) -- a systems language with an ownership model
losing to one with a garbage collector, because the ownership model was not being used for
anything.

**The fix.** [ADR 0010](../../engine/docs/decisions/0010-rust-parameters-borrow-where-sound.md)
revisits ADR 0009's parameter-ownership choice with what ADR 0009 itself was missing: a pre-pass
over the *whole* Core program (`engine/src/analysis/borrows.ts`), run once before lowering starts,
deciding which `String`/`Enum`/`List` parameters are only ever read and may print as `&str`/`&[T]`
instead of being cloned at every call site that hands them one. `digit_at` and `cpf_check_digit`
both only read their string argument, so both now borrow it; `cpf_check_digit`'s loop is
`digit_at(cpf, index)` -- a bare `&str` copy, not a clone -- at every iteration, and
`is_valid_cpf`'s own `cpf` parameter borrows too, since it only ever forwards `cpf` into
`keep_digits` and the trim. `cnpj_check_digit(cnpj: &str, weights: &[i64])` borrows both of its
parameters the same way, including the hoisted weight table (`LIB_CNPJ_TABLE1: &[i64]`, already a
reference -- passed bare, not `&`-wrapped again). Re-measured the same way as the table above:

| | 200 000 iterations |
| --- | --- |
| `support::re_match_3` alone (the CPF pattern's scanner, unchanged by this fix) | 4.4 ms |
| `keep_digits` alone (the new largest single cost) | ~9.3 ms |
| `is_repeated` alone | ~1.4 ms |
| `cpf_check_digit(_, 9)` + `cpf_check_digit(_, 10)` together (was 44.9 ms for one of the two) | ~2.2 ms |
| `is_valid_cpf` whole | 16.8 ms |

**`isValidCpf` and `isValidCnpj` came down from 10.8x/3.6x to 2.22x/1.43x** the handwritten crate
(`node core/bench/run.mjs`: `isValidCpf` 7.6 ms handwritten vs. 16.8 ms generated; `isValidCnpj`
15.3 ms vs. 21.8 ms), and **both now beat generated Go** on the same benchmark (Go: `isValidCpf`
52.7-59.5 ms normalized/full-pipeline, `isValidCnpj` 53.1-66.6 ms -- generated Rust is now 3-4x
*faster* than generated Go on both rows it used to lose). Conformance stayed 4256/4256 in both
idiom modes throughout (nothing about a borrowed parameter's declared type changes what it
accepts -- `toOwned` converts a borrow to an owned value exactly the way it already converted an
owned value to another one), `cargo clippy --offline -- -D warnings` and `cargo fmt --check` are
clean on the regenerated crate, and `Cargo.lock` still lists exactly one package.

**What is left.** With the loop's clones gone, the largest remaining cost in `is_valid_cpf` is
`keep_digits` itself: `.chars().filter(...).collect::<String>()` has to build the fresh, owned
11-digit string the function returns, and `.chars()` decodes UTF-8 scalar by scalar rather than
scanning bytes directly. At ~9.3 ms of `is_valid_cpf`'s 16.8 ms, it is now close to 60% of the
call, next to `re.test`'s ~4.4 ms (unchanged -- this fix does not touch regex) and well under 2 ms
for `is_repeated` plus the now-cheap `cpf_check_digit` calls combined. `isValidCnpj`'s 1.43x is now
the *better*-behaved of the two rows: its remaining cost is almost entirely `keep_digits` on a
14-character input plus the two now-cheap check-digit calls, with no loop-shaped cost left to
distinguish it from `isValidCpf` the way the account above had it. Closing the `keep_digits` gap
further -- a byte-oriented ASCII filter instead of a `char` iterator, say -- is a different fix
than this one and is not part of it.

### formatCurrency, generateCpf, generateCnpj

`formatCurrency` is `normalized` for the reason every language's currency row is (see "Honesty
notes" above): the generated core always takes a pre-scaled `Decimal<2>` `i64`, so there is no
`full-pipeline` shape to compare. `getHolidays` and `isBusinessDay` are excluded for Rust for the
same reason as Python and Go: `brazilian_utils::date_utils` exposes only
`is_holiday(NaiveDate, Option<&str>) -> Option<bool>`, a single-day check with no year-list form
and no business-day concept, so there is no comparable counterpart. `generateCpf`/`generateCnpj`
are covered by the validity rule in "The generator agreement rule" above, not equality; the
`Capabilities` implementation the harness builds for them (`BenchCapabilities`) is a small
SplitMix64 seeded from the system clock -- a real, changing-per-run, non-cryptographic generator,
the same kind of thing `rand::thread_rng()` is, which is what `brazilian_utils::cpf::generate` and
`cnpj::generate` already use, so (unlike TypeScript's `crypto.getRandomValues`) the RNG's own
implementation cost is not a large factor here.

These three rows are not the ones ADR 0010 targeted (only `isValidCpf`/`isValidCnpj` were over
budget against Go; these three were never compared against Go at all, only against the handwritten
Rust crate, and stayed over *that* budget before and after the fix), but `generate_cpf` and
`generate_cnpj` both call `cpf_check_digit`/`cnpj_check_digit` in their own check-digit step, so
they picked up part of the same win. `node core/bench/run.mjs`: `formatCurrency` 2.00x (37.6 ms
handwritten vs. 75.4 ms generated, essentially unchanged by the borrowing fix -- see why below),
`generateCpf` 2.78x, down from 4.34x before ADR 0010 (50.6 ms vs. 140.8 ms), `generateCnpj` 2.03x,
down from 2.28x (85.1 ms vs. 173.2 ms). Timed against the generated crate directly, the same way
the regex fix above was attributed:

| | 200 000 iterations |
| --- | --- |
| `group_thousands("1234")` alone | 20.8 ms |
| `keep_digits("1234")` alone | 4.9 ms |
| `format_currency(123456, true)` whole | 76.8 ms |
| `cpf_check_digit("12345678900", 9)` alone | 0.1 ms |
| `random_cpf_base(&env)` alone (9x `next_u32` through the rejection-sampling wrapper) | 108.9 ms |
| `generate_cpf(&env)` whole | 139.5 ms |
| `random_cnpj_base(&env)` alone (12x `next_u32` through the wrapper) | 141.6 ms |
| `generate_cnpj(&env)` whole | 182.8 ms |

`group_thousands` and `keep_digits` together are only ~33% of `format_currency`'s call (25.7 ms of
76.8 ms); the rest is allocation, not computation -- `pad_start` and each `crate::support::concat2`
in the assembly chain builds a fresh owned `String`, and every intermediate result
(`digits`, `whole`, `cents`, `body`, `prefix`) is one. This is the same shape of cost the CPF/CNPJ
section above documents, but ADR 0010's fix does not reach it: `format_currency`'s own signature
takes `value: i64` and returns an owned `String` -- there is no `String`/`List` parameter here for
the borrow pre-pass to find borrowable in the first place, and the function's job (building a new
formatted string) inherently allocates regardless of ownership.

For `generateCpf`/`generateCnpj`, `cpf_check_digit` is no longer a factor at all (0.1 ms for one
call, the same near-zero cost the CPF/CNPJ section above measures for the pair together): the
entire remaining cost is `random_cpf_base`/`random_cnpj_base` -- about 109 ms of 140 ms and 142 ms
of 183 ms respectively. Both call `random_digit`/`random_below` once per digit (9 times for CPF, 12
for CNPJ), and each of those returns an owned `String` (`.to_string()`) that then gets threaded
through a `concat2` chain to build the base -- the same "many small owned allocations, one per
digit, chained together" pattern TypeScript's capability section above describes for a different
reason (there, the RNG call itself is the expensive part; here, `next_u32()` is cheap and the
wrapping and String-building around each draw is what adds up). None of `random_digit`/
`random_below`'s own parameters are `String`/`List` either (they take and return `i64`/`String`
built fresh each call, nothing to borrow), so this cost sits outside what ADR 0010 changes, the
same way `format_currency`'s does. Closing either gap, if it is worth closing, is separate work
from parameter borrowing.
