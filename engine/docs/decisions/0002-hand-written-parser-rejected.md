# 0002 — `oxc-parser` rather than a hand-written parser

## Context

The engine has exactly one external dependency, and it is the parser. A hand-written parser for
the subset would remove it.

## Options

**Hand-written parser.** No dependencies at all, and the grammar would be exactly the subset. But
it would diverge from TypeScript in small ways forever, and every divergence is a confusing error
for a contributor who writes ordinary TypeScript.

**`oxc-parser`.** A real TypeScript parser, fast, with spans on every node and a stable
ESTree-shaped output. It costs one dependency, pinned in `package.json` and
`toolchain.lock.json`.

## Decision

Use `oxc-parser`, and keep it behind the frontend boundary so the cost is contained: exactly one
module imports it, and `tests/boundary.spec.ts` proves that.

## Consequences

- Source that is valid TypeScript parses like TypeScript, and the subset is enforced semantically
  rather than syntactically, which makes the diagnostics better ("`while` is outside the subset;
  use a counted `for`") than a parse error would be.
- Replacing the frontend later means replacing one module.
