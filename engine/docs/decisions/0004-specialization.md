# 0004 — Library helpers are specialized per call site

## Context

A refinement is only useful if it survives a function call. `digitAt(value, index)` needs `value`
to be proven long enough for `index`; the caller knows that (its CPF is 11 digits), the helper's
declared signature does not.

## Options

**Dependent refinements.** `digitAt(value: Digits, index: Int[0..len(value) - 1])` would express
it exactly, and would turn the checker into a refinement type checker with an SMT-shaped core.

**Checked accessors everywhere.** `seq.at` answers an `Option`, so nothing needs proving. Correct,
but it pushes a bounds check into every access, including the ones a caller has already proven.

**Specialization.** Check a helper once per distinct call-site argument type.

## Decision

An exported function in a module at the source root is a **utility**: it keeps its declared
signature, which is the published core API. Everything else is **library code** and is checked per
call site, with the caller's proven types substituted for the declared ones (the declared types
still have to accept them). Specializations are capped at 16 per function.

`seq.at` exists as well, for the genuinely dynamic case: an index derived from a scan.

## Consequences

- A helper can serve an 11-digit CPF and a 14-digit CNPJ without either caller losing its proof.
- Several specializations often compile to identical code, so the linker folds functions whose
  bodies are structurally identical and joins their parameter types. This is sound because what
  the specializations differ in — the refinements — is a proof, not run-time structure, and each
  one was proven safe on its own arguments.
- A helper that is never called is never checked, and never generated.
