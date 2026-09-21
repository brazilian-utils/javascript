# 0008 — The portable fallbacks live in the engine's own source-language standard library

## Context

Fallbacks have to live in the source language, so that a new target is complete as soon as its
core constructs lower. The plan puts them in the *project's* `source/lib/`, which would make every
project that uses the engine reimplement civil dates and scalar comparison.

## Decision

The engine ships `stdlib/`, written in the same restricted subset, compiled alongside every
project under the module prefix `std/`. A portable lowering names one of its functions, and
`src/stdlib.ts` lists the ones a lowering may name — the standard library's public surface.

## Consequences

- `date.fromYmd` is Howard Hinnant's algorithm written once, and it is the same code in all three
  targets.
- `str.compare` on a string that is not proven ASCII is `std/strings::compareScalars` everywhere,
  which is why JavaScript's UTF-16 ordering never leaks into a result.
- The standard library is kept through pruning (a lowering may need it even when no project source
  names it) and dropped at generation time when the selected lowerings do not use it.
- Nothing in `stdlib/` may import anything: it is compiled in every project, so it stays
  self-contained. A test enforces that.
