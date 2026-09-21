# 0001 — The authoring language is a restricted TypeScript with its own checker

## Context

The engine needs one source language in which each utility is written once. It has to be a
language contributors already use, it has to support the semantic model (nominal refinements,
integer ranges, effects), and its frontend has to be replaceable later without touching anything
downstream.

## Options

**AssemblyScript.** Reuses a ready type checker, but the language cannot express the model: union
types are unsupported by design except `ClassType | null`, so there are no discriminated unions
and no string-literal unions; closures cannot capture locals, so pure lambdas for combinators do
not work; `&&` and `||` always produce `bool`; its integer types are WebAssembly machine types
with wraparound, the opposite of range-proven integers; and its resolver is built for Binaryen
code generation rather than published as a stable library. The part it would save — name
resolution and basic typing of a small subset — is the cheap part; nominal semantic types, ranges,
refinements and effects have to be built either way.

**Rust as the authoring language.** Better semantics, but extracting types needs
rust-analyzer-grade infrastructure, ownership is noise for pure library logic, and the reference
behavior lives in an npm package.

**A custom DSL.** Maximum control, but the editor, the language server and highlighting all have
to be built from nothing.

**Restricted TypeScript with our own semantic checker.** Contributors already read it, `tsc` gives
editor support through a declarations-only prelude, and `oxc-parser` gives a fast, stable syntax
tree. The semantic checker is ours, so the semantics are ours.

## Decision

Author in a restricted subset of TypeScript. Parse with `oxc-parser`. Check with our own semantic
checker. `tsc` runs only as an editor and lint aid over the source, backed by
`prelude/index.d.ts`, which declares `Int`, `Digits`, `Ascii` and the intrinsic modules and is
never executed.

AssemblyScript's "portable code" idea — one source that also type-checks under `tsc` through type
aliases — is adopted in that prelude.

## Consequences

- The subset has to be enforced, not assumed: every rejected construct has a diagnostic and a test.
- The Semantic HIR is the frontend contract, and a boundary test proves nothing after it imports
  the parser, so a DSL frontend can replace this one later.
- `tsc` sees `Int` as `number`, so it cannot catch a range error; that is the checker's job, and
  the checker is the one that decides whether a program compiles.
