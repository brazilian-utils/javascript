# 0007 — One Target AST, three printers

## Context

The plan calls for "a real AST per target". TypeScript, Python and Go differ in syntax and in a
handful of structural rules (Go has no conditional expression and returns errors as values; Python
has no statement lambdas), but their *structure* — functions, conditionals, loops, calls, records
— is the same.

## Decision

One Target AST (`src/backend/tast.ts`) with per-target printers, plus the structural differences
expressed as parameters of the lowering:

- `statementTernary` hoists a conditional into statements (Go);
- `errorsAsValues` turns a `Fail` effect into a second return value and hoists fallible calls
  (Go);
- `asyncColouring` makes a function that reaches `Http` async and awaits its calls (TypeScript);
- `loopCombinators` decides which combinators become loops rather than calls (Go, and `fold` in
  Python).

## Consequences

- A new target is a capability table, a printer and four flags, not a new tree.
- The risk this accepts is a target whose structure genuinely does not fit — which is exactly what
  [targets/rust-sketch.md](../targets/rust-sketch.md) examines before any Rust code is written.
- Nothing in the shared lowering may branch on a target name; the boundary test enforces that.
