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
- Go: `isValidCpf` and `isValidCnpj` came back roughly 6-9x *slower* on the generated side, on
  both the `full-pipeline` and `normalized` variants, and this is real, not a harness artifact.
  `core/out/go/is-valid-cpf.go` and `is-valid-cnpj.go` call `regexp.MustCompile(...)` **inline,
  inside the function body**, so the (fairly large, Unicode-range-heavy) mask-detection regex is
  recompiled from source on every single call, instead of being compiled once at package
  initialization the way idiomatic Go does it. `formatCnpj`'s generated Go code does not have this
  problem (it doesn't use a regex) and came back about 3x *faster* than the handwritten port. This
  is worth flagging to whoever owns the Go code generation template -- `core/out/**` is another
  agent's territory in this session, so nothing here was changed to fix it, but it is the single
  most consequential finding this benchmark produced.
- No disagreements were found on any benchmarked input, in any language: every generated/
  handwritten pair returned the same answer for every value used here.

## Rust

Not benchmarked yet. `core/out/rust/` is being generated by another agent concurrently with this
work, and this harness was told not to wait for it or write its half. `run.mjs` already looks for
`core/out/rust/` and a `core/bench/rust/` harness and reports plainly why the Rust row is absent
if either is missing, so adding Rust later is: generate `core/out/rust/`, write
`core/bench/rust/` (a `cargo run --release` binary following the same shape as `go/bench_main.go`
-- warm-up, timed loop, `BENCH_JSON` line), and `run.mjs` picks it up with no changes. The
handwritten Rust port's contract was confirmed while investigating fairness for this benchmark:
`rust/src/cpf.rs::validate()` rejects anything that isn't already all-ASCII-digits of the exact
length before doing any work, the same digits-only contract as the Python port, so its future row
should follow the Python row's `normalized`-only shape rather than Go's two-variant shape.
