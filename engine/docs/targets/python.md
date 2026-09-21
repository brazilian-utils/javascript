# Target: Python

**Baseline** Python 3.9. **Dependencies** none. **Formatter** `ruff format`.
**Linters** `ruff check`, `pyright`.

## Representation

| Semantic type | Python |
|---|---|
| `Int[lo..hi]` | `int` (already arbitrary precision, so a range never forces a change) |
| `Float` | `float` |
| `Decimal<S>` | `int` holding the unscaled integer |
| `String`, `Ascii`, `Digits` | `str` |
| `List<T>` | `List[T]` |
| `Option<T>` | `Optional[T]` |
| `Record` | a frozen `@dataclass` |
| `Enum` | `Literal["a", "b"]` |
| `CivilDate`, `Instant`, `Duration` | `int` |

## Shape of the output

- One module per source module, with relative imports; `_support.py` holds the generated
  capability defaults, the engine's record types and the two division helpers.
- A module exports exactly what its source module exports, no more: a function the source never
  wrote `export` on (`is_ok` alongside `get_address_info_by_cep`, say) is renamed with a leading
  underscore, on its declaration and on every call site that names it — Python's own convention
  for "not part of this module's surface" — and left out of the module's `__all__`, the second
  half of that same convention. Every public function is still listed in `__all__` explicitly.
- Comprehensions for `map` and `filter`, `any`/`all` over a generator, `next(…, None)` for `find`,
  `sum` for a sum, `sorted(key=…)` for a keyed sort — the idiomatic form in each case, with the
  lambda inlined into the comprehension when it is a single expression.
- A fold becomes a loop: `functools.reduce` is not idiomatic Python.
- Domain errors are classes in `errors.py` extending a generated `DomainError(Exception)`.
- `race` is a `ThreadPoolExecutor` with `as_completed`.
- `_support.py`'s `Capabilities` class *is* the platform default (`urllib.request`, `time`,
  `random`), not an interface with a separate implementation; `DEFAULT_CAPABILITIES` is one
  instance of it, built once at import time. **A utility that reaches `Http`, `Clock` or `Random`
  is a public wrapper over an internal seam** (`docs/semantics.md` §4.1,
  [ADR 0011](../decisions/0011-public-entry-points-vs-capabilities.md)): `get_address_info_by_cep`
  keeps the source's exact signature and calls `get_address_info_by_cep_with(cep,
  DEFAULT_CAPABILITIES)`, a sibling in the same module the differential driver calls directly to
  inject a fixture-backed fake. Neither gets the underscore treatment above — both stay in
  `__all__` — but only the wrapper is listed as a utility in `API.json`; the seam is marked there
  under `seams` instead.

## Notable lowerings

`len` counts code points, which *is* the Core's definition of length, so `str.len` is native with
no precondition — the opposite of TypeScript. Positional access still needs the ASCII proof,
because an index into a `str` is a code point index while the Core's is a scalar index into an
ASCII string.

`//` and `%` are floored. The Core truncates, so the native operators are selected only when both
operands are proven non-negative; otherwise the generated `trunc_div` and `trunc_mod` are used.

`str.strip()` uses Python's own whitespace set, which includes U+001C to U+001F and U+0085 and
excludes U+FEFF. `str.trim` therefore passes the 25 code points explicitly.

`str.upper()` is ASCII-equivalent only on ASCII input, so it carries the same precondition as
TypeScript's `toUpperCase`.
