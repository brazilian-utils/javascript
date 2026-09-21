# Logic engine

Write a library's logic **once**, in a restricted, semantically typed subset of TypeScript, and
generate a native, idiomatic implementation for TypeScript, Python and Go.

No shared runtime package. No WASM, no FFI, no bridge. No interpreter at run time. No external
dependencies in the generated code.

```sh
npm install            # one runtime dependency, the parser; prettier and tsc for development
npm test               # the engine's own suite
node src/cli.ts build --project ../core
node scripts/verify.ts ../core
```

## What it is

A semantic compiler for a constrained library language — not a universal transpiler.

```
source (restricted TypeScript)
   │  frontend: parse, resolve, reject what is outside the subset
   ▼
Semantic HIR ── the frontend contract
   │  checker: types, refinements, ranges, effects → Core
   ▼
Core IR ── what the program means, in no particular language
   │  link, comptime, optimize, capability threading
   ▼
per target: lowering selection → Target AST → printer → formatter
   ▼
TypeScript · Python · Go
```

The engine generates the **core**, never the public API. The handwritten DX in each language keeps
its own coercion, defaults and naming, and calls a core whose signatures are stable and versioned.

## Why the types are the point

`Int` carries a proven range. `String` carries a character class and a length range. Those are not
decoration: they are what makes a native lowering *provably* equivalent.

```ts
str.compare(left, right)
```

- Python: `<` compares code points — the Core's order — so the native comparison is selected with
  no precondition.
- Go: `strings.Compare` compares UTF-8 bytes, which is the same order, so native again.
- TypeScript: `<` compares **UTF-16 code units**, which sorts an astral scalar below U+E000. The
  native comparison is selected only when both sides are proven ASCII; otherwise the portable
  implementation from the engine's own source-language standard library is used.

One line of source, three correct answers, and `out/<target>/LOWERING.md` says which rule decided
each one.

## What is generated

For each target: one module per source module, a `capabilities` file with the default environment
built from that language's standard library, an `errors` file, `LOWERING.md` (every non-trivial
selection and why), `API.json` (the published core signatures) and `SOURCEMAP.json` (each
generated function back to its source span). Every file carries a provenance header.

Each target is also generated in a `--no-idioms` mode, and conformance runs both, which is what
proves idiom selection preserves meaning.

## Using it in another project

The engine knows nothing about any particular library; `examples/generic` is a project with no
relation to the one that motivated it, and `tests/example.spec.ts` keeps it that way.

```
my-project/
  engine.config.json     { "name", "sourceRoot", "out", "targets" }
  source/
    my-utility.ts        one exported function per file at the root
    lib/…                library code, specialized per call site
  conformance/…          optional: cases and a runner
```

```sh
node <engine>/src/cli.ts build --project my-project
node <engine>/scripts/verify.ts my-project
```

## Documentation

[`docs/`](docs) — the specification, the generated intrinsic reference, how to add a utility or a
target, the per-target notes, the architectural decisions, and the measured metrics.
