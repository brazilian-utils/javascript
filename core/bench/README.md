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

(Matches `engine/toolchain.lock.json`'s `measuredWith` block, which is the generator's own record
of what it was last verified against.)

## Utilities covered

`isValidCpf` and `isValidCnpj` everywhere they're comparable, plus `formatCnpj` where the port's
contract makes that fair (TypeScript and Go; see below for why Python's is excluded). No port
exposes a directly comparable `formatCpf` with the same options shape as the generated core, so it
was left out for all three languages rather than force a mismatched comparison.

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

## What the numbers actually showed

Run `node core/bench/run.mjs` for current numbers; this section describes what was found while
building the harness, not a frozen result.

- TypeScript and Python: the generated core lands close to its handwritten sibling (TypeScript
  clearly faster across all three rows; Python within a few percent either way on both rows), and
  every input in both languages produced identical answers on both sides.
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
- No disagreements were found on any benchmarked input, in any language: every generated/
  handwritten pair returned the same answer for every value used here.

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

**What is left, and why it is not "the same thing, still there".** The new bottleneck is not the
regex at all: it is `cpf_check_digit`'s loop, `sum += digit_at(cpf.to_owned(), index)` run 9 or 10
times per call. Every value in the Core is owned wherever it is bound ([ADR
0009](../../engine/docs/decisions/0009-rust-values-are-owned.md)), so each call to the
`digit_at(value: String, ...)` helper needs its own owned copy of the 11-digit string -- one
`to_owned()` per loop iteration, not one per top-level call, because the loop calls a
String-taking helper instead of indexing bytes directly. `cpf_check_digit(_, 9)` alone, at 44.9 ms,
accounts for most of the remaining gap; the other `cpf_check_digit(_, 10)` call, `is_repeated`, and
two more `digit_at` calls in `is_valid_cpf` itself make up the rest. This is the ownership-clone
cost the coordinator's original measurement called "about 1%" and asked not to be spent on --
correct as stated (one clone at one call site is about 1% of the *old*, regex-dominated call) but
multiplied here by a loop the regex fix does not touch and this task did not ask to: the fix is
scoped to `re.test`, and ADR 0009's ownership model is explicitly out of scope. `cnpj_check_digit`
does not have this cost -- its source indexes `cnpj.as_bytes()[index]` directly rather than calling
a String-taking helper in its loop -- which is exactly why `isValidCnpj`'s gap (3.6x) is so much
smaller than `isValidCpf`'s (10.8x) despite CNPJ validating more digits: the difference is which
loop-body shape `core/source` happens to use, not the pattern each one matches.

The mask-tolerance asymmetry the coordinator's note anticipated (`brazilian_utils::cpf::validate`
rejects anything not already digit-only; the generated core accepts and re-normalizes masked
input) is real but small next to the above: `re_match_3` still walks the full 11-character input
once even when it is already digits-only, on the order of a few milliseconds here, not the
dominant term.

Against Go (`core/bench/README.md`'s Go section above), generated Rust now roughly matches
`isValidCnpj` (53.5 ms vs. Go's 49.0 ms normalized) but is still behind on `isValidCpf` (79.3 ms
vs. Go's 39.9 ms normalized) -- both by the same `cpf_check_digit` loop, which Go's target also
lowers to a String-taking helper call but without Rust's per-call ownership cost to pay for it.
Closing that gap further means changing how a loop that calls a helper repeatedly is lowered (or
revisiting ADR 0009's borrowing decision), not anything about `re.test`, and is future work rather
than part of this fix.
