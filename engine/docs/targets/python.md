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
- Comprehensions for `map` and `filter`, `any`/`all` over a generator, `next(…, None)` for `find`,
  `sum` for a sum, `sorted(key=…)` for a keyed sort — the idiomatic form in each case, with the
  lambda inlined into the comprehension when it is a single expression.
- A fold becomes a loop: `functools.reduce` is not idiomatic Python.
- Domain errors are classes in `errors.py` extending a generated `DomainError(Exception)`.
- `race` is a `ThreadPoolExecutor` with `as_completed`.

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
