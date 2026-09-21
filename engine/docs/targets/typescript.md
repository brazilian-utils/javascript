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
- A module exports exactly what its source module exports, no more: a function the source never
  wrote `export` on (`isOk` alongside `getAddressInfoByCep`, say) prints as a plain, unexported
  `function`, callable from elsewhere in the same file but invisible to an importer — TypeScript's
  own notion of a module-private helper, the one every other file in this package already uses.
- No effect at module load: constant data is inlined as literals, and nothing constructs a `Map`,
  a `Set` or a `RegExp` at the top level (`capabilities.ts`'s `DEFAULT_CAPABILITIES`, below, is the
  one deliberate exception).
- Relative imports carry their extension, so Node runs the generated sources directly.
- A function that reaches `Http` is `async`, and its callers await it. That colouring is computed
  from the effect set, never written by an author.
- Domain errors are classes in `errors.ts`, extending a generated `DomainError`.
- `capabilities.ts` holds the generated default environment (`fetch`, timers, `Math.random`) and
  the `raceFirstSome` helper. It is generated code, not a package: a test passes a different
  object. `DEFAULT_CAPABILITIES` is that environment built once, at module load, not per call —
  every public wrapper (below) shares the one instance, the way a caller who builds their own
  environment would share it across calls rather than rebuild it.
- **A utility that reaches `Http`, `Clock` or `Random` is a public wrapper over an internal seam**
  (`docs/semantics.md` §4.1, [ADR 0011](../decisions/0011-public-entry-points-vs-capabilities.md)):
  `getAddressInfoByCep(cep)` keeps the source's exact signature and calls
  `getAddressInfoByCepWith(cep, DEFAULT_CAPABILITIES)`, an exported sibling in the same module the
  differential driver calls directly to inject a fixture-backed fake. Both are `export`ed —
  the wrapper because it is the utility, the seam because the driver has to reach it from
  `_driver.ts` — but only the wrapper is listed as a utility in `API.json`; the seam is marked
  there under `seams` instead.

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
