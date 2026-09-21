# Sketch: what a Rust backend would look like

No Rust is generated yet. This is the falsification exercise the architecture asks for: walk every
Core construct and every intrinsic, and say how Rust would represent it — and where it would not
fit.

## Representation

| Core | Rust |
|---|---|
| `Bool` | `bool` |
| `Int[lo..hi]` | the narrowest of `i8`…`i64`/`u8`…`u64` that contains the range, `i128` beyond, `num-bigint` never (it is a dependency) |
| `Float` | `f64` |
| `Decimal<S>` | `i64` or `i128` unscaled, chosen from the proven range |
| `String` | `&str` for parameters, `String` for results |
| `Ascii`, `Digits` | `&[u8]` behind a newtype, so indexing is a byte index and O(1) |
| `List<T>` | `&[T]` for parameters, `Vec<T>` for results |
| `Option<T>` | `Option<T>` |
| `Record` | a `#[derive(Clone, PartialEq)]` struct with public fields |
| `Enum` | a fieldless `enum` with `#[derive(Clone, Copy, PartialEq)]` |
| `CivilDate`, `Instant`, `Duration` | `i32`, `i64`, `i64` newtypes |

## Constructs

- **Ownership.** Every value in the Core is immutable once it escapes, and a mutable local never
  escapes, so parameters borrow (`&str`, `&[T]`) and results own (`String`, `Vec<T>`). The
  frozen-on-escape rule is exactly what makes this mechanical; without it, borrow inference would
  be the hard part of the backend.
- **`Fail<E>`.** `Result<T, E>` with a generated error enum per utility, `?` at the call sites the
  lowerer already hoists for Go. The Go hoisting pass is reusable as is.
- **Combinators.** Iterator chains: `map`, `filter`, `fold`, `any`, `all`, `find`, and
  `sort_by_key` for a stable sort (`sort_by_key` is stable; `sort_unstable_by_key` is not and is
  never selected).
- **Loops.** `for i in a..b` and `for item in slice`, which is what the Core's two loop forms are.
- **Capabilities.** A trait parameter: `fn get_address<E: Capabilities>(cep: &str, env: &E)`. The
  default implementation would need a dependency for HTTP (`ureq`, `reqwest`), which the "no
  external dependencies" rule forbids — so the default environment would have to be behind a
  feature flag, or omitted with the DX supplying one. **This is the first real friction.**
- **Async.** Rust has no runtime in `std`. The async colouring the TypeScript backend applies has
  no equivalent, so `race` would be threads and a channel (`std::sync::mpsc`), like Go without
  goroutines being cheap. Acceptable for two concurrent GETs, wrong for hundreds.
- **Regex.** No regex in `std`. Either a generated scanner (the normalized pattern is a DFA-shaped
  tree already) or a dependency. **This is the second real friction**, and it is the one that
  would decide whether the Rust backend needs a generated `re` module.
- **Strings.** `str.len` on a non-ASCII value is `s.chars().count()`; scalar comparison is native
  (`Ord` on `str` compares bytes, which is code point order), so Rust behaves like Go here.

## What has no clean lowering

1. **The default capability environment**, because HTTP is not in `std`.
2. **Regex**, for the same reason; a generated scanner is the principled answer and is more work
   than the other twelve intrinsics put together.
3. **Arbitrary-precision integers**, if a range ever demands them: `i128` is the ceiling without a
   dependency.

Everything else maps directly, and two of the three frictions are the same friction — `std` is
smaller than the other three targets' standard libraries. The architecture is not falsified by
Rust; the "no dependencies" rule is the thing that would have to bend, and it would bend for
exactly two operations.
