# 0012 — Generated source, not one binary core with bindings

## Context

The engine generates native source for every target. The obvious alternative was never written
down: build the logic once — in Rust, in C, in WebAssembly — and give every ecosystem a **binding**
to that one artifact. It is a smaller tool, it has one implementation to review instead of four
emitters, and the binding is code each ecosystem already writes by hand.

A separate branch measured it rather than argued it, and the measurements are kept in
[`../bindings-or-generated-source.md`](../bindings-or-generated-source.md). Two of its findings
decide this, and one of them decides it unconditionally.

## The unconditional one

**A tree-shakeable package cannot take a binary core.** The npm package drops a utility nobody
imports; a WebAssembly module is indivisible and asynchronous to start. Measured on that branch:
one utility as generated source was 509 bytes that disappear when unused, against 9,291 bytes that
cannot be split and cannot be removed. That is not a preference between two acceptable options, it
is a requirement the package already has, so JavaScript gets generated source whatever is true
elsewhere.

Go is the second case where the currency is not nanoseconds: cgo costs cross compilation, static
binaries and `CGO_ENABLED=0` builds, all of which a Go library is expected to keep, in exchange
for tens of nanoseconds.

## The one that does not decide it, and is worth knowing anyway

For Python, Ruby, C# and Java, a **binding is genuinely cheaper than generated source** — a CPython
extension module at 27 ns per call against `ctypes` at 433 ns, P/Invoke at about a nanosecond — and
the first version of that document got this wrong by measuring the bindings a *script* reaches for
rather than the ones a *package* ships. It was corrected on the branch, and the correction is the
reason this decision is scoped rather than absolute.

So the honest position is not "generated source wins". It is:

- JavaScript and Go must have generated source, on grounds that are not about speed;
- the other ecosystems could be served either way, and this engine chooses generated source for a
  different reason — the output has no runtime, reads like code a person in that language would
  have written, and can be read in review without running anything.

## Decision

Generate source for every target. Do not ship a binary core.

Where an ecosystem would rather bind to one, that remains open and this engine does not block it:
its Rust target is `std`-only and carries no runtime, so a `cdylib` with `extern "C"` wrappers over
the generated crate is an addition to the backend rather than a second compiler. Nothing in the
Core, the checker or the other three targets would move.

## Consequences

- Four emitters to maintain instead of one core plus bindings, and per-target semantic knowledge
  (`str.compare`'s ordering, `charCodeAt`'s UTF-16, `regexp`'s lack of a compilation cache) has to
  be encoded four times rather than once. That cost is real and the lowering tables are where it
  lands.
- In exchange, the output is readable, tree-shakeable, dependency-free and per-target idiomatic,
  and the differential harness can compare four independent implementations against a reference
  rather than one implementation against itself.
- The numbers behind this cannot be re-run from this repository: the harness was retired on the
  branch that produced them. Anything load-bearing should reproduce them first.
