# Adding a target

A target is a capability table, a printer, four structural flags and a support file. There is no
new tree and no new pass.

## 1. Decide the representation

Fill in the table in `docs/targets/<language>.md` before writing code: what each semantic type
becomes, and what each choice assumes. The two that matter most are the integer representation
(what the language's default integer covers, and what a wider range forces) and the string
representation (what "index" means, and whether comparison is code point order).

## 2. Write the spec

```ts
export const LANGUAGE_SPEC: TargetSpec = {
	name: "language",
	table: new LoweringTable(LANGUAGE_CANDIDATES),
	naming: { func, value, field, type, module },
	loopCombinators: new Set(["seq.fold"]),   // what reads better as a loop here
	statementTernary: false,                  // true when there is no conditional expression
	errorsAsValues: false,                    // true when a failure is a second return value
	asyncColouring: false,                    // true when reaching Http makes a function async
	envType: { kind: "Record", name: "Capabilities" },
};
```

## 3. Write the capability table

One entry per intrinsic the target can lower, each with:

- `impl`: `native`, `library` (the language's standard library) or `portable` (a call into the
  engine's source-language standard library);
- `requires`: the facts the lowering needs, and `because`: why it needs them, which is printed in
  `LOWERING.md`;
- `cost`: allocations and time complexity, which is how selection ranks candidates;
- `emit`: the Target AST fragment.

A missing entry is a compile error naming the operation and the argument types, so a partial table
is a usable table: the operations a project does not use never have to be written.

Where the language's own function is only conditionally equivalent, say so in `requires` rather
than in a comment. `String#length` counting UTF-16 code units is a precondition, not a footnote.

## 4. Write the printer and the support file

The printer renders the Target AST. The support file holds what the engine generates rather than
depends on: the capability interface and its default implementation from the language's standard
library, plus whatever generic helpers the capability table names.

## 5. Prove it

Add the backend to `src/cli.ts`, then:

```sh
node scripts/verify.ts ../core
```

`verify` generates in both idiom modes, regenerates and diffs for determinism, runs the language's
own linters over the output, and runs the differential conformance harness: every case, through
the generated driver, compared against the reference interpreter. A target is done when that is
green and a fluent reader would accept the golden files.
