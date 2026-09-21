# Target: TypeScript

**Baseline** ES2020 on Node 20. **Dependencies** none. **Formatter** Prettier.
**Linters** `tsc --strict --noEmit`.

## Representation

| Semantic type | TypeScript |
|---|---|
| `Int[lo..hi]` | `number` while the range fits ±(2^53 − 1), `bigint` otherwise |
| `Float` | `number` |
| `Decimal<S>` | `number` holding the unscaled integer |
| `String`, `Ascii`, `Digits` | `string` |
| `List<T>` | `readonly T[]`, and `T[]` while a local is still being built |
| `Option<T>` | `T \| undefined` |
| `Record` | an exported `type` with `readonly` fields |
| `Enum` | a union of string literals |
| `CivilDate`, `Instant`, `Duration` | `number` |

## Shape of the output

- ESM only, one module per source module, named exports, no default export.
- No effect at module load: constant data is inlined as literals, and nothing constructs a `Map`,
  a `Set` or a `RegExp` at the top level.
- Relative imports carry their extension, so Node runs the generated sources directly.
- A function that reaches `Http` is `async`, and its callers await it. That colouring is computed
  from the effect set, never written by an author.
- Domain errors are classes in `errors.ts`, extending a generated `DomainError`.
- `capabilities.ts` holds the generated default environment (`fetch`, timers, `crypto`) and the
  `raceFirstSome` helper. It is generated code, not a package: a test passes a different object.

## Notable lowerings

`String#length` counts UTF-16 code units, so it is selected only for proven-ASCII values;
otherwise the length is `[...value].length`. `charCodeAt`, `slice`, `indexOf` and `padStart` need
the same proof, for the same reason.

`toUpperCase` is selected only for proven-ASCII values: it maps "ß" to "SS", which ASCII-only case
mapping does not.

`<` on strings compares UTF-16 code units, which orders astral scalars below U+E000. The native
comparison is therefore selected only for proven-ASCII operands, and everything else uses
`std/strings::compareScalars`. This is the clearest case in the system of a refinement paying for
itself.

`Array#sort` has been required to be stable since ES2019, so `seq.sortStable` is a native sort on
a copy.
