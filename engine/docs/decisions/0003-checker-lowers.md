# 0003 — The semantic checker lowers to Core in the same pass

## Context

The plan separates "check the HIR" from "lower the HIR to Core". In practice every typing decision
*is* a lowering decision: which intrinsic `+` resolves to depends on the operand types; whether
`str.codeAt` is allowed depends on a proven length; whether a local needs an unwrap depends on
flow-sensitive narrowing.

## Options

**Two passes.** A checker annotates the HIR, then a lowering pass reads the annotations. Every
decision is made once and recorded, and the recording is a second data structure to keep in sync.

**One pass.** The checker emits Core as it types, so a decision is made exactly where the
information exists.

## Decision

The checker types the HIR and emits the annotated Core in one pass (`src/core/check.ts`). The HIR
remains the frontend contract: it is produced by the frontend alone, it carries no target
knowledge, and nothing downstream sees a TypeScript node.

## Consequences

- There is no separate "annotated HIR" to keep consistent with the Core.
- Range analysis, refinement narrowing and effect inference are part of checking rather than a
  later pass, which is why a refinement can gate an intrinsic signature directly.
- `docs/semantics.md` describes the language; the checker is its only implementation, so the
  tests in `tests/refinements.spec.ts` and `tests/subset.spec.ts` are the specification's teeth.
