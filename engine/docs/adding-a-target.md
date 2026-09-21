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

### `emit` returning `raw` hides everything inside it

`emit` may return a `raw` node carrying printed text, and every target does for the shapes that
have no node kind. It costs something: once an argument has been printed into that text, it is a
string, and no later pass over the Target AST can see it. `hoistConstantTables` lifts a constant
list out of a function body by walking that AST, so a table that reached a `raw` emission stays
inline — which is why the generated Go builds its weight table on every call in `generate-cnpj`
while the generated TypeScript, whose lowering of the same call keeps the argument as a node,
lifts it to module scope.

Prefer a structured node with the arguments as children (`call`, `method`, `binary`, `ternary`)
and keep `raw` for leaves. Where the target really needs text around an argument, know that
anything inside it is final.

The same applies in reverse to work a target wants done once: a pattern, a table, a lookup built
from a compile-time constant does not belong in the call path. Go compiles its regexes into
package level `var`s, Python into module level `re.compile`, and Rust turns each into a `static`
or a dedicated scanner, all decided at generation time. Each of those was a measured defect before
it was a rule — the Go one cost 79.6x the price of the match it was performing.

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

Then run the random program generator against the new target on its own, alongside the hand-written
cases:

```sh
node scripts/fuzz.ts full --seed 20260921 --count 300 --targets <name>
```

`fuzz full` does not know which target it is comparing — it generates cases and compares answers,
the same way for every target — so this gets the new backend the same generated coverage the first
four had, without writing a second harness. See [fuzzing.md](fuzzing.md).
