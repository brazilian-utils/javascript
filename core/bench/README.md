# Cross-language benchmark

Answers one question per language: is the code the engine generates (`core/out/<language>/`)
faster or slower than the implementation that language's community actually ships? The ratio is
always **generated ÷ handwritten**, so below 1.0 means the generated code is faster -- the same
convention `conformance/bench.ts` already used.

**The bar is 1.0x: equal or faster, everywhere.** Earlier revisions of this document budgeted 1.5x;
that number is gone as a target and survives below only where it names the line a row used to be
allowed to cross. `## Rust: five lowerings, measured one at a time

Rust was the worst target by some distance — `isValidCpf` at 2.73x, nothing under 1.0x — and the
reason turned out not to be one thing. Each of these was timed in isolation first, on a scratch
crate built against the generated one, and only then written as a candidate:

| lowering | isolated cost, 200k calls | after |
| --- | ---: | ---: |
| `re.retain` (`keep_digits`) — a `for` loop into one `String` instead of `.filter().collect::<Vec<u8>>()` then `from_utf8().unwrap()` | 11.4–12.3 ms | 5.4–7.1 ms |
| `re_take_fixed`/`re_take_class` — test the leading byte directly, decode a `char` only above 0x7F | 6.7 ms | 4.4 ms |
| `str.padStart`, ASCII-gated — no `Vec<char>` built just to learn a length | 22.8–24.2 ms | 10.4–10.5 ms |
| `str.codePoints` / `str.fromCodePoints`, ASCII-gated — no decode, no `char::from_u32` round trip | 5.5–5.8 / 11.6–12.1 ms | 3.5–3.6 / 8.0–8.3 ms |
| `str.fromInt` for a value proven `Int[0..9]` — one ASCII byte instead of the general integer formatter | — | — |

The scanner fix is the one worth noticing: `re_take_fixed` and `re_take_class` are the whole of
every generated chain-pattern scanner, so making them byte-first speeds up every regex-shaped
validator this engine will ever emit, not the two rows that motivated it.

Two findings from the same pass that are not speedups:

- `unsafe { String::from_utf8_unchecked(..) }` for `keep_digits` measured 5.4–5.6 ms against the
  safe loop's 5.4–5.5 ms — indistinguishable. The generated code stays `unsafe`-free, and now for a
  measured reason rather than a stylistic one.
- The first version of the `str.fromInt` candidate returned a `raw` text fragment, which stringifies
  its argument immediately. That broke `hoistConstantTables` (`backend/lower.ts`), which walks the
  *structured* target AST after every candidate's `emit` has run: a weight table that had been a
  module-level `const` silently became a `vec![...]` allocated on every call. Conformance did not
  catch it — the answers were identical — and `cargo clippy`'s `useless_vec` did. The candidate now
  builds a structured `call` node, which is the discipline the other candidates already follow, and
  the hoisted constants came back.

## Size is a result too, and it is measured the same way

Speed is not the only thing a generated target is judged on. The npm package this engine generates
for is tree-shakeable, which
[ADR 0012](../../engine/docs/decisions/0012-generated-source-not-a-bound-binary.md) records as a
requirement rather than a preference, so for TypeScript **bytes over the wire are a benchmark
row** — and a row that is asserted rather than measured is not a row.

`node engine/scripts/size.ts core` measures it the way a consumer's bundler would: one
single-import entry point per exported utility, bundled and minified by esbuild against
`core/out/typescript`, then compressed. Raw source bytes are the wrong number (comments, type
annotations and formatting all vanish first) and the whole tree is the wrong number too (nobody
imports all of it).

It reports three numbers per export, because they answer different questions and this project has
already been wrong about which one matters. **Minified** is what the browser parses and the engine
holds; it is not a transfer size, but it is the only one that tracks parse and compile cost.
**Gzip** and **brotli** are both transfer sizes, and they disagree: gzip's window makes locally
repeated text almost free, so an encoding can be meaningfully *shorter raw and larger gzipped* —
which is not a hypothetical, it is what the measurement below found. Brotli weighs the same source
differently and is what most CDNs actually serve.

Both transfer encodings are gated at zero growth, since a consumer gets whichever their CDN
negotiates. Minified is reported and not gated: trading parse cost against transfer size is an
argument to have, not a threshold to trip. `--check` compares against the committed
`core/out/typescript/SIZE.json`; `verify` runs it as its `typescript size` step, so the trade is
checked on every run rather than remembered.

Gzipped bytes per utility, with the pass disabled, under the first (uncapped) inlining budget, and
under the budget this section settled on:

Gzipped bytes, since that is the metric the three columns below were compared under:

| export | no inlining | uncapped (`maxStatements: 6`) | now (8 / cap 6) |
| --- | ---: | ---: | ---: |
| `formatCnpj` | 348 | 348 | **334** |
| `formatCurrency` | 331 | 333 | **312** |
| `generateCnpj` | 642 | 1,591 | **629** |
| `generateCpf` | 623 | 1,343 | **614** |
| `getAddressInfoByCep` | 1,286 | 1,295 | **1,277** |
| `getHolidays` | 872 | 1,403 | **817** |
| `isBusinessDay` | 1,065 | 1,638 | **1,022** |
| `isValidCnpj` | 512 | 569 | **499** |
| `isValidCpf` | 342 | 440 | **333** |
| every export | 3,224 | 5,644 | **3,175** |

Three changes got it there, and each is worth stating separately because only the first is about
inlining at all.

- **The budget prices an inline instead of only sizing the callee**
  ([ADR 0013](../../engine/docs/decisions/0013-inlining-pays-for-itself.md)). A callee spliced into
  its last remaining call site costs nothing — its definition falls out of the dependency closure —
  while a helper copied to nine call sites costs eight copies of itself. Alongside it, a callee that
  is one `return <expr>` is now substituted as an expression rather than through a synthetic
  `Option`, and a straight-line callee is spliced without the early-return sentinel.
- **Constants the checker already proved are printed as constants.** Specialization (ADR 0004)
  gives a helper called with a literal a parameter of type `Int[n..n]`, and a read of one *is* that
  integer — nothing new is decided, the range on the node is the checker's own conclusion. That
  turns `randomBelow`'s `4294967296 - (4294967296 % bound)` from a modulo per draw into the
  constant `4294967290`, and it proves two intermediates of the Meeus Easter algorithm constant
  outright for the years `easterSunday` accepts. Folding then leaves bindings nothing reads and
  parameters nothing needs, which Go and Rust both refuse to compile, so `optimize.ts` removes
  both — a parameter only when every call site passes something whose evaluation cannot be
  noticed. This is where Go's generators moved from 0.57x/0.44x to **0.39x/0.32x**.
- **A fold over the lowered target AST** (`engine/src/backend/fold.ts`). A lowering is code
  generation too: TypeScript's `date.fromYmd` expands a month into a days-in-month ladder, so once
  the month is a constant the ladder is five comparisons and two branches with one possible answer.
  The Core folder never saw them, because they did not exist when it ran.

One defect surfaced on the way and is worth recording: `writeFiles` never removed generated files a
later run stopped producing, so a module that disappeared from the dependency closure — which is
exactly what inlining a helper into its only caller does — stayed on disk and was typechecked,
benchmarked and committed as though it were still output. Two stale files were in the repository.
Generated files now carry their own removal: anything under the output directory with this engine's
header that the current run did not write is deleted, and nothing else is touched.

## Getting every row to 1.0x`, after the row-by-row account below, has the pass
that closed most of the gap, what moved each row and by what mechanism, the per-target inlining
budgets that pass measured rather than assumed, and the rows still over 1.0x with the structural
reason they did not come down further.

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

## Rust: five lowerings, measured one at a time

Rust was the worst target by some distance — `isValidCpf` at 2.73x, nothing under 1.0x — and the
reason turned out not to be one thing. Each of these was timed in isolation first, on a scratch
crate built against the generated one, and only then written as a candidate:

| lowering | isolated cost, 200k calls | after |
| --- | ---: | ---: |
| `re.retain` (`keep_digits`) — a `for` loop into one `String` instead of `.filter().collect::<Vec<u8>>()` then `from_utf8().unwrap()` | 11.4–12.3 ms | 5.4–7.1 ms |
| `re_take_fixed`/`re_take_class` — test the leading byte directly, decode a `char` only above 0x7F | 6.7 ms | 4.4 ms |
| `str.padStart`, ASCII-gated — no `Vec<char>` built just to learn a length | 22.8–24.2 ms | 10.4–10.5 ms |
| `str.codePoints` / `str.fromCodePoints`, ASCII-gated — no decode, no `char::from_u32` round trip | 5.5–5.8 / 11.6–12.1 ms | 3.5–3.6 / 8.0–8.3 ms |
| `str.fromInt` for a value proven `Int[0..9]` — one ASCII byte instead of the general integer formatter | — | — |

The scanner fix is the one worth noticing: `re_take_fixed` and `re_take_class` are the whole of
every generated chain-pattern scanner, so making them byte-first speeds up every regex-shaped
validator this engine will ever emit, not the two rows that motivated it.

Two findings from the same pass that are not speedups:

- `unsafe { String::from_utf8_unchecked(..) }` for `keep_digits` measured 5.4–5.6 ms against the
  safe loop's 5.4–5.5 ms — indistinguishable. The generated code stays `unsafe`-free, and now for a
  measured reason rather than a stylistic one.
- The first version of the `str.fromInt` candidate returned a `raw` text fragment, which stringifies
  its argument immediately. That broke `hoistConstantTables` (`backend/lower.ts`), which walks the
  *structured* target AST after every candidate's `emit` has run: a weight table that had been a
  module-level `const` silently became a `vec![...]` allocated on every call. Conformance did not
  catch it — the answers were identical — and `cargo clippy`'s `useless_vec` did. The candidate now
  builds a structured `call` node, which is the discipline the other candidates already follow, and
  the hoisted constants came back.

## Size is a result too, and it is measured the same way

Speed is not the only thing a generated target is judged on. The npm package this engine generates
for is tree-shakeable, which
[ADR 0012](../../engine/docs/decisions/0012-generated-source-not-a-bound-binary.md) records as a
requirement rather than a preference, so for TypeScript **bytes over the wire are a benchmark
row** — and a row that is asserted rather than measured is not a row.

`node engine/scripts/size.ts core` measures it the way a consumer's bundler would: one
single-import entry point per exported utility, bundled and minified by esbuild against
`core/out/typescript`, then compressed. Raw source bytes are the wrong number (comments, type
annotations and formatting all vanish first) and the whole tree is the wrong number too (nobody
imports all of it).

It reports three numbers per export, because they answer different questions and this project has
already been wrong about which one matters. **Minified** is what the browser parses and the engine
holds; it is not a transfer size, but it is the only one that tracks parse and compile cost.
**Gzip** and **brotli** are both transfer sizes, and they disagree: gzip's window makes locally
repeated text almost free, so an encoding can be meaningfully *shorter raw and larger gzipped* —
which is not a hypothetical, it is what the measurement below found. Brotli weighs the same source
differently and is what most CDNs actually serve.

Both transfer encodings are gated at zero growth, since a consumer gets whichever their CDN
negotiates. Minified is reported and not gated: trading parse cost against transfer size is an
argument to have, not a threshold to trip. `--check` compares against the committed
`core/out/typescript/SIZE.json`; `verify` runs it as its `typescript size` step, so the trade is
checked on every run rather than remembered.

Gzipped bytes per utility, with the pass disabled, under the first (uncapped) inlining budget, and
under the budget this section settled on:

Gzipped bytes, since that is the metric the three columns below were compared under:

| export | no inlining | uncapped (`maxStatements: 6`) | now (8 / cap 6) |
| --- | ---: | ---: | ---: |
| `formatCnpj` | 348 | 348 | **334** |
| `formatCurrency` | 331 | 333 | **312** |
| `generateCnpj` | 642 | 1,591 | **629** |
| `generateCpf` | 623 | 1,343 | **614** |
| `getAddressInfoByCep` | 1,286 | 1,295 | **1,277** |
| `getHolidays` | 872 | 1,403 | **817** |
| `isBusinessDay` | 1,065 | 1,638 | **1,022** |
| `isValidCnpj` | 512 | 569 | **499** |
| `isValidCpf` | 342 | 440 | **333** |
| every export | 3,224 | 5,644 | **3,175** |

Three changes got it there, and each is worth stating separately because only the first is about
inlining at all.

- **The budget prices an inline instead of only sizing the callee**
  ([ADR 0013](../../engine/docs/decisions/0013-inlining-pays-for-itself.md)). A callee spliced into
  its last remaining call site costs nothing — its definition falls out of the dependency closure —
  while a helper copied to nine call sites costs eight copies of itself. Alongside it, a callee that
  is one `return <expr>` is now substituted as an expression rather than through a synthetic
  `Option`, and a straight-line callee is spliced without the early-return sentinel.
- **Constants the checker already proved are printed as constants.** Specialization (ADR 0004)
  gives a helper called with a literal a parameter of type `Int[n..n]`, and a read of one *is* that
  integer — nothing new is decided, the range on the node is the checker's own conclusion. That
  turns `randomBelow`'s `4294967296 - (4294967296 % bound)` from a modulo per draw into the
  constant `4294967290`, and it proves two intermediates of the Meeus Easter algorithm constant
  outright for the years `easterSunday` accepts. Folding then leaves bindings nothing reads and
  parameters nothing needs, which Go and Rust both refuse to compile, so `optimize.ts` removes
  both — a parameter only when every call site passes something whose evaluation cannot be
  noticed. This is where Go's generators moved from 0.57x/0.44x to **0.39x/0.32x**.
- **A fold over the lowered target AST** (`engine/src/backend/fold.ts`). A lowering is code
  generation too: TypeScript's `date.fromYmd` expands a month into a days-in-month ladder, so once
  the month is a constant the ladder is five comparisons and two branches with one possible answer.
  The Core folder never saw them, because they did not exist when it ran.

One defect surfaced on the way and is worth recording: `writeFiles` never removed generated files a
later run stopped producing, so a module that disappeared from the dependency closure — which is
exactly what inlining a helper into its only caller does — stayed on disk and was typechecked,
benchmarked and committed as though it were still output. Two stale files were in the repository.
Generated files now carry their own removal: anything under the output directory with this engine's
header that the current run did not write is deleted, and nothing else is touched.

## Getting every row to 1.0x

The pass this section documents took the budget from "within 1.5x" to "equal or faster,
everywhere" and moved every over-budget row it could without touching `core/source/**` (the
utilities themselves) or the checker. `node core/bench/run.mjs`'s current numbers, before and
after, language by language:

| language | utility | before | after | fixed by |
| --- | --- | --- | --- | --- |
| typescript | `getHolidays` | 1.77x | **0.93x** | native `date.fromYmd` (below) |
| typescript | `isBusinessDay` | 1.26x | **0.66x** | inherits `getHolidays`' fix |
| typescript | `generateCpf` | 1.44x | **1.04-1.28x** | call-site inlining, 8 / cap 6 |
| typescript | `generateCnpj` | 1.24x | **1.20-1.23x** | call-site inlining, 8 / cap 6 |
| python | `formatCurrency` | 2.91x | **2.66x** | `trunc_mod`/`trunc_div` inlined; ASCII-byte `codePoints`/`fromCodePoints` |
| python | `generateCpf` | 1.86x | **1.40x** | call-site inlining, budget 12 |
| python | `generateCnpj` | 1.99x | **1.90x** | call-site inlining, budget 12 |
| go | `formatCurrency` | 1.08x | **0.92x** | ASCII-byte `re.retain`, `codePoints`/`fromCodePoints` |
| go | `generateCpf` | 0.57x | **0.39x** | constants the checker proved, and the dead parameters they left |
| go | `generateCnpj` | 0.44x | **0.32x** | the same fold |
| rust | `isValidCpf` | 2.73x | **1.44x** | ASCII-byte `re.retain`, then the pass below |
| rust | `isValidCnpj` | 1.43x | **0.96x** | the same, and now faster than the crate it compares against |
| rust | `formatCurrency` | 1.81x | **1.05x** | one-buffer `str.concatAll`; ASCII `padStart`/`codePoints` |
| rust | `generateCpf` | 2.37x | **1.68x** | one-buffer `str.concatAll` (nine-digit chain) |
| rust | `generateCnpj` | 1.89x | **1.22x** | one-buffer `str.concatAll` (twelve-digit chain) |

Every other row was already at or under 1.0x (`isValidCpf`/`isValidCnpj`/`formatCnpj` everywhere,
Go's `generateCpf`/`generateCnpj`) and stayed there; conformance stayed 4256/4256 per target in
both idiom modes throughout, `node engine/scripts/fuzz.ts fast --seed 20260921 --count 1000` and
`full --seed 555 --count 200` both stayed clean, and `core/out` here reflects every change
regenerated and committed.

Three shapes cover everything below: a lowering that did redundant work the target itself could
answer more cheaply (the missing candidate), a call chain whose overhead is a target property, not
a program property (per-target inlining), and a chain of allocations where one would do.

### The missing candidate: `date.fromYmd`

`civilDate` (`core/out/typescript/lib/civil.ts`) computed a day forward from `(year, month, day)`
and then verified the round trip by decomposing the result back through `yearFromDays`,
`monthFromDays` and `dayFromDays` -- three more Howard Hinnant floor-division-heavy functions --
measured at 78% of `getHolidays`' call. The round trip exists to answer exactly one question, "is
`day` within the month `month` names", and a days-in-month table (28-31, February adjusted for a
leap year) answers it directly, without decomposing anything back out: once the coarse bounds hold
(year 1-9999, month 1-12, day ≥ 1), `day > daysInMonth(month, year)` is the whole check, computed
without touching the calendar math at all. The candidate that replaced the round trip
(`engine/src/targets/typescript/index.ts`) is that check plus the single forward computation --
one Hinnant function, not four.

**What was tried and measured slower, and kept in this account rather than quietly dropped.** The
task's own framing named `new Date(year, month - 1, day)` as the obvious native candidate, since
that is what the handwritten side calls. It was implemented first -- `Date.UTC` to construct,
reading the result back through the UTC getters to detect a silently-rolled-over date, the same
round-trip *shape* the portable calendar already used, just against V8's calendar instead of four
Hinnant functions -- and measured directly against the portable round trip in isolation (2.4
million calls each): the portable round trip took 366-390 ms; the `Date`-based candidate took
574-608 ms, **slower**, because `Date` object construction plus three getter reads costs more than
the arithmetic it was meant to replace. The days-in-month table has no such cost (63-81 ms for the
same 2.4 million calls, a 4.5-6x improvement over the round trip) because it touches no host object
at all. The `Date`-based candidate was removed rather than kept as a fallback; every claim in this
document is a measurement of the actual candidate shipped, not of the first thing that seemed like
it should work.

The candidate is one expression for a "cheap" (name or literal) argument and an IIFE binding each
argument once for anything else, so an argument with a real cost is never evaluated twice; a
literal call site (`civilDate(year, 1, 1)`, `getHolidays`' own shape) always takes the cheap path.

### Per-target inlining, measured per target

`randomDigit(env) → randomBelow(10, env) → env.nextU32()` is a three-layer call chain, run nine to
twelve times per `generateCpf`/`generateCnpj` call, in every language that has it (TypeScript,
Python, Rust). Whether that chain's overhead disappears once it is hot is a property of the target,
not of the program -- V8 elides a monomorphic closure once it is hot, CPython pays a full stack
frame per call with nothing to elide it, and rustc/LLVM inline within a crate when they judge it
worthwhile, which for a bounds-checked call inside a loop was measured not to reliably include this
shape. `engine/src/optimize/inline.ts` is a Core-to-Core pass -- target-independent by construction,
the same layer `optimize/optimize.ts`'s constant-folding and dead-code passes live in -- but it runs
once per target, from `generate` (`backend/generate.ts`), with a budget (`InlineBudget.maxStatements`)
each `Backend` declares for itself. An eligible callee (no `Fail`, no `Http`, no direct or indirect
recursion, no lambda in its body, a statement count at or under the budget) gets its parameters
bound once each to fresh names, its body renamed so two splices of the same callee never collide,
and every `return` turned into an assignment to a synthetic `Option` result -- `break`ing the loop
it is directly inside where there is one -- so the whole thing prints as ordinary statements ending
in `opt.unwrap(result)`, using intrinsics (`opt.isNone`/`opt.unwrap`) every target already lowers on
its own. Multiple rounds let an inlined callee's own call (inlining `randomDigit` exposes its call
to `randomBelow`) get a chance in a later round.

- **Python: aggressive, budget 12.** `randomBelow`'s own body (a bounded rejection-sampling loop) is
  six statements; `cpf_check_digit`/`is_repeated` are five each, and fall under the same budget
  incidentally -- there is no way to size a budget that reaches `randomBelow` without also reaching
  them, since they are the same size. `generateCpf` moved from 1.86x to 1.65x, `generateCnpj` from
  1.99x to 1.89x. `generate_cpf.py`'s body is now one long flattened function instead of a chain of
  small ones; Python was not weighed against a bundle-size budget the way TypeScript was below, so
  12 stayed the number. Re-measured when `maxDuplicatedNodes` arrived, and deliberately left
  uncapped: at a cap of 6 its generators went to 1.65x/2.11x and at 24 to 1.59x/1.87x, against
  1.40x/1.90x uncapped, so the cap costs Python exactly what it saves TypeScript. Sweeping
  `maxStatements` over 6, 9, 12 and 18 moved neither generator row outside noise
  (`generateCpf` 1.35-1.46x, `generateCnpj` 1.85-1.96x), so 12 stayed rather than churn a number
  the measurement does not distinguish.
- **TypeScript: `maxStatements: 8, rounds: 4, maxDuplicatedNodes: 6`, and the cap is the point.**
  The first version of this budget was `maxStatements: 6` with no cap, and the note here recorded
  its cost as "+20% of the generated tree" -- raw source bytes, which is the wrong number twice
  over: comments, type annotations and formatting all vanish before a browser sees any of it, and
  nobody imports the whole tree. `engine/scripts/size.ts` measures the right one, bundling a
  single-import entry point per utility with esbuild and gzipping it. Measured that way the
  uncapped budget cost **+75% across every export and +148% on `generateCnpj` alone**, for two rows
  it moved by about a tenth each -- inside the run-to-run noise of a generator whose own retry loop
  is random. `generate-cpf.ts` was 45 lines before the pass and 408 after: nine unrolled copies of
  a rejection-sampling loop, one per digit.

  `maxDuplicatedNodes` fixes that by pricing an inline rather than only sizing the callee, and
  [ADR 0013](../../engine/docs/decisions/0013-inlining-pays-for-itself.md) has the mechanism. Both
  numbers were then swept against the measurement -- the cap at 0, 6, 12, 24 and 48, the statement
  budget at 6, 8, 10, 12, 16, 24 and 48 -- and 8/6 came out smallest on every single export. The
  result is that inlining is no longer a trade for this target at all: **every export is smaller
  than with the pass disabled** (3,175 bytes gzipped across all nine, against 3,224 with no
  inlining and 5,644 under the uncapped budget), and `generateCpf` still lands at 1.04-1.28x and
  `generateCnpj` at 1.20-1.23x. `verify`'s `typescript size` step holds it there against the
  committed `core/out/typescript/SIZE.json`.
- **Rust: none, deliberately, and the reason is itself a finding.** A first attempt at budget 6
  measured code that was *worse*, not better. This pass has no notion of a Rust borrow
  ([ADR 0010](../../engine/docs/decisions/0010-rust-parameters-borrow-where-sound.md)) -- it binds
  every inlined parameter as an owned local (`let name = argExpr;`), so a splice of a callee whose
  parameter ADR 0010 had proven could borrow its argument printed a `.to_owned()` at that binding
  instead: one full string clone per digit drawn, in `is_valid_cpf` and everywhere else the same
  shape appeared. That is exactly the allocation ADR 0010 exists to remove, and it cost more than
  the call overhead this pass would have saved, so `inlineBudget` is deliberately absent from
  `RUST_BACKEND` (`engine/src/targets/rust/index.ts` carries the same account at the call site). A
  smaller ask -- an `#[inline]` attribute hint on small non-exported functions, asking rustc's own
  inliner to look rather than manually splicing anything -- was tried next and measured to change
  nothing: `isValidCpf` came back at 22-25 ms with the hint present or absent across six runs,
  indistinguishable from run-to-run noise, meaning rustc was already making the same inlining
  decision either way. That was reverted too, rather than kept as a change with no measured effect
  behind it. Closing this gap for Rust means teaching the pass to reconstruct ADR 0010's borrow
  analysis for an inlined splice, not extending the budget -- future work, not this pass.
- **Go: not attempted.** Every Go row using this call shape (`generateCpf`, `generateCnpj`) was
  already at or under 1.0x before this pass; `formatCurrency`, Go's one over-budget row, was closed
  by the allocation fix below without touching call structure at all.

### Allocation: one buffer or one pass, not a chain

**Rust's string assembly.** A `+` chain (`a + b + c`) lowers as nested `str.concat` calls,
`concat2(concat2(a, b), c)`, and each `concat2` allocates a fresh `String` and copies everything to
its left into it -- `format_currency`'s `prefix`/`sign`/`body` assembly and every `concat2` in
`random_cpf_base`'s nine-digit chain were exactly this shape. `backend/lower.ts`'s `operation` now
flattens a chain of three or more pieces into its leaves before lowering (`(a + b) + c` is
`str.concat(str.concat(a, b), c)` in Core; the leaves are `[a, b, c]`, left to right, evaluated in
that order either way) and hands them to a new op, `str.concatAll`, when a target declares a
candidate for it -- Rust only, today; every target without one falls straight through to the
unchanged pairwise `str.concat` path, so nothing changed for TypeScript, Python or Go. Rust's
`str.concatAll` sizes one buffer once, from every piece's own length summed, and pushes each piece
into it once. Two correctness details worth naming because a first version of this got both wrong:
a piece whose length has to be computed (anything that is not already a name or a literal, most
often a call like `group_thousands(keep_digits(&whole))`) is bound to a local first, so it is
computed once, not twice -- once for sizing the buffer, once for pushing it, which the first version
of this candidate did not do, and which a differential run caught (`generateCpf`/`generateCnpj`
producing a well-formed but wrong document -- a different draw count changes which digits come out,
and every digit is still individually valid, so nothing but the reference interpreter's own answer
catches it); and a single-character literal piece prints `.push('x')`, not `.push_str("x")`, which
`clippy::single_char_add_str` (default warn) asks for. `generateCpf` moved from 2.37x to 1.68x and
`generateCnpj` from 1.89x to 1.22x; `formatCurrency` from 1.81x to 1.74x (smaller, because its own
remaining cost is elsewhere -- see the Rust section below).

**`re.retain` and `codePoints`/`fromCodePoints`, in three languages.** `keep_digits`/
`keep_alphanumeric` (`re.retain`) walked the input as decoded Unicode scalars --
`.chars().filter(...)` in Rust, `strings.Map` in Go, `[ord(c) for c in whole]` in Python -- before
ever testing one against a range. Every class this project retains is ASCII (digits, upper and
lower case letters), and an ASCII byte needs no decoding to be tested: a multi-byte scalar's bytes
are all ≥ 0x80, so each one fails an ASCII range test on its own, exactly as testing the decoded
scalar would have failed it -- a byte-wise scan is not an approximation of the scalar-wise one, it
is the same predicate for less work, sound for any input, ASCII or not. Rust
(`String::from_utf8(value.bytes().filter(...).collect::<Vec<u8>>())`) and Go (a `[]byte` scan
building a `[]byte` result) both got this candidate, gated on every retained range being ≤ 127 (a
class outside that range, none exist in this project today, still falls back to the scalar-wise
pass). `str.codePoints`/`str.fromCodePoints` (`group_thousands`' `out: IntRange<0,127>[]`, proven
ASCII by its own declared type) got the matching treatment in Python (`.encode("ascii")` /
`bytes(...).decode("ascii")`) and Go (`[]byte(value)` / one `string()` from a `[]byte`), gated the
same way -- on the *element* type's range for `fromCodePoints`, since that op takes a list of code
points, not a string. `trunc_mod`/`trunc_div` (Python's truncated remainder/division, needed
because `%`/`//` floor in Python but the Core's contract rounds toward zero) were Python-level
functions called on every `%`/`//` whose operands were not provably non-negative -- a real cost in
CPython, where a function call is a full frame, not the arithmetic itself -- so both now print
their own formula inline as a single expression (a tuple evaluates both operands into fixed names
once, unconditionally, before the ternary that uses them picks a branch, so an operand that is
itself a call is still evaluated exactly once). Together these moved Python's `formatCurrency` from
2.91x to 2.66x and Go's from 1.08x to 0.93x -- Go's crossed 1.0x; Python's did not, and the
"Remaining over 1.0x" note below says why.

### Remaining over 1.0x, and why

**Python: `formatCurrency` (2.66x), `generateCpf` (1.65x), `generateCnpj` (1.89x).**
`group_thousands`' own loop -- `for index in range(0, len(scalars)): ... out.append(...)` -- is
still a Python-level loop with a method call (`list.append`) every iteration; removing `trunc_mod`'s
call and switching to bytes removed real overhead (2.91x → 2.66x) but did not remove the loop
itself, which is where most of what is left lives. Nothing in `engine/src/targets/python/**` can
turn an author's explicit per-character loop into a single C-level format call without either
recognizing that specific algorithm's shape (which this project treats as out of bounds -- a
candidate is for an *operation*, never a pattern-match on one author's algorithm) or rewriting
`group_thousands` itself, which is `core/source/lib/format.ts`, out of scope for this pass. The
generators' remaining gap is `random_cpf_base`/`random_cnpj_base`'s draw chain: even with the whole
`random_digit → random_below → next_u32` chain inlined (above), each draw is still a rejection-
sampling loop plus an `Optional[int]` bookkeeping the inlining introduced, run nine to twelve times,
against one `randint()` call on the handwritten side. Closing the remaining gap would mean either a
larger inlining budget (tried at the whole-chain size already; `cpf_check_digit`/`is_repeated` are
already incidentally included) or a structural change to how the draw itself works, both outside
what a lowering-only pass can do.

**Rust: `isValidCpf` (2.57x), `formatCurrency` (1.74x), `generateCpf` (1.68x).** `isValidCpf`'s
`keep_digits` no longer decodes UTF-8 (above), and `cpf_check_digit`'s loop no longer clones (ADR
0010, already landed before this pass); `#[inline]` on `digit_at` was tried and measured to change
nothing (above), meaning the remaining ~2.5x is not a missed-inlining question. What is left is
spread across `re_match_3` (the CPF pattern's own scanner), the mask-character `trim_matches` every
`isValidCpf`/`isValidCnpj` call pays before `keep_digits` ever runs, and `keep_digits`' own
`String::from_utf8` allocation -- none individually dominant the way `.chars()` or the cloning loop
once were, which is itself the finding: the easy, single-cause wins are gone, and what remains is
distributed across several small, already-minimal operations, the last of which is a systems
language with an 11-character allocation and a bounds-checked scan against a handwritten crate
doing the same in roughly a third of the calls. `formatCurrency`'s remaining cost is
`group_thousands`/`keep_digits` themselves (now byte-based, but still O(n) passes CPython -- no,
Rust -- still pays for) plus `pad_start`'s own allocation, none of them a chain anymore.
`generateCpf`'s remaining 1.68x is the same rejection-sampling-loop-times-nine-to-twelve shape
Python's is, minus Python's per-call frame cost -- `next_u32()` itself is cheap in Rust, so what is
left is the loop and the `Option`/`Vec<u8>` bookkeeping around each draw, not a single hot line.
None of these three rows moved to a worse state than before this pass; all three are measurably
better than they were, and none reached 1.0x, which is reported here rather than left unexplained.

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

**Update -- the `concat2` chain, closed.** The gap this subsection describes (`random_cpf_base`/
`random_cnpj_base` threading each digit's owned `String` through a `concat2` chain, and
`format_currency`'s own `prefix`/`sign`/`body` assembly doing the same) is exactly what
`str.concatAll`'s one-buffer assembly, in "Getting every row to 1.0x" above, was built for.
`node core/bench/run.mjs`'s current numbers: `generateCpf` 1.68x (was 2.37x, closer to this
subsection's 2.78x before that), `generateCnpj` 1.22x (was 1.89x), `formatCurrency` 1.74x (was
1.81x -- smaller, because a `re.retain` fix also in that section, not the buffer, was
`format_currency`'s bigger factor). `isValidCpf`/`isValidCnpj` moved the same pass from 2.73x/1.43x
to 2.57x/1.35x, for the `keep_digits` byte-scan reason that section names, not this one. Full
before/after table and per-row attribution: "Getting every row to 1.0x" above.
