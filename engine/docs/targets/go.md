# Target: Go

**Baseline** Go 1.21. **Dependencies** standard library only. **Formatter** `gofmt`.
**Linters** `go vet`, `staticcheck`.

## Representation

| Semantic type | Go |
|---|---|
| `Int[lo..hi]` | `int`, **assumed 64-bit** |
| `Float` | `float64` |
| `Decimal<S>` | `int` holding the unscaled integer |
| `String`, `Ascii`, `Digits` | `string` |
| `List<T>` | `[]T` |
| `Option<T>` | `*T` |
| `Record` | a struct with exported fields |
| `Enum` | `string` |
| `CivilDate`, `Instant`, `Duration` | `int` |

`int` is 64 bits on every platform Go supports except the 32-bit ones. A range that leaves
±(2^53 − 1) is reported as a metric; a range that would leave 64 bits is a compile error, since no
`math/big` lowering is admitted yet.

## Shape of the output

- One package, `core`, with one file per source module and a `support.go` holding the generic
  helpers the capability tables name (`ptr`, `at`, `orElse`, the sequence helpers, `raceFirstSome`).
- A utility is exported (`IsValidCpf`); library helpers stay unexported (`digitAt`).
- A `Fail` effect becomes `(T, error)`. A fallible call is hoisted into
  `value, err := f(); if err != nil { return zero, err }`, which is what a Go author writes by
  hand.
- Go has no conditional expression, so a `cond` is hoisted into a temporary and an `if`/`else`.
- Combinators become loops.
- Domain errors are structs in `errors.go` with `Error()` and `Unwrap()` to a package-level
  `ErrDomain`, so `errors.Is` recognizes the family and `errors.As` recognizes the member.
- `race` is one goroutine per task and a buffered channel.
- **No default `Capabilities`.** `support.go` declares the interface only — no HTTP client, no
  clock, no RNG anywhere in `core`, on purpose: the package imports nothing beyond what the
  utilities' own logic needs. The differential driver's `cmd/driver/main.go` builds its own
  fixture-backed fake, but that fake lives in the driver binary, never in the library. This means
  a utility whose effects reach `Http`, `Clock` or `Random` (`GetAddressInfoByCep`, `GenerateCpf`,
  `GenerateCnpj`) cannot get the public-wrapper treatment TypeScript and Python give the same
  utilities (`docs/semantics.md` §4.1) — there is no default to hand a wrapper, and one is not
  fabricated to manufacture the appearance of parity. The capability-taking form stays the only
  entry point, under its original name, taking `Capabilities` as a normal parameter a caller
  supplies. This is a genuine, reported gap from drop-in replacement, not a defect in this
  backend's generation — see [ADR 0011](../decisions/0011-public-entry-points-vs-capabilities.md).

## Notable lowerings

`len(s)` counts bytes, so `str.len` is native only on proven-ASCII values; otherwise it is
`len([]rune(s))`, which costs an allocation and is declared as such in the cost table.

`strings.Compare` compares UTF-8 bytes, which is code point order, so scalar-order comparison is
native here with no precondition — unlike TypeScript.

RE2 has no backtracking and no `\uXXXX` escape: patterns are printed with `\x{…}` and anchored
with `\A…\z`.

`slices.SortStableFunc` is stable; `sort.Slice` is not, and is never selected.
