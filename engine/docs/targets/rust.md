# Target: Rust

**Baseline** Rust 2021, `std` only. **Formatter** `rustfmt` (run as `cargo fmt`, which is rustfmt
applied to every file a `Cargo.toml` lists). **Linters** `cargo clippy -- -D warnings`.

## Representation

| Semantic type | Rust |
|---|---|
| `Int[lo..hi]`, `Decimal<S>`, `CivilDate`, `Instant`, `Duration` | `i64` |
| `Float` | `f64` |
| `String`, `Ascii`, `Digits`, `Enum` | `String` |
| `List<T>` | `Vec<T>` |
| `Option<T>` | `Option<T>` |
| `Record` | `#[derive(Clone, Debug, PartialEq)] struct` with `pub` fields |
| Capability environment | `&dyn Capabilities` |

Every heap value is **owned wherever it is bound** — parameters, locals and struct fields alike,
never `&str`/`&[T]`. `docs/targets/rust-sketch.md` planned the opposite (parameters borrow, the
sketch's central claim); [ADR 0009](../decisions/0009-rust-values-are-owned.md) records why that
plan does not survive contact with the shared Target AST, and what it costs instead.

## Shape of the output

- One crate, `coreout`: `src/lib.rs` declares `pub mod` for every generated module plus `support`
  and (when the project declares any) `errors`, and re-exports each flatly (`pub use lib_digits::*;`
  and so on). A module calls another's function unqualified — Go's advantage of a single package,
  recovered here through the glob rather than through the language having no module system at all.
- `support.rs` holds the `Capabilities` trait and its request/response records, the generic
  sequence and string helpers the capability table names, and the regex matcher (below).
- `errors.rs` holds one flat `CoreError` enum, one variant per declared domain error — not one type
  per utility, which is the other half of ADR 0009.
- `Fail<E>` is `Result<T, CoreError>`. The shared lowerer's Go-shaped hoist
  (`let (v, err) = f(); if err != nil { return zero, err }`) collapses back into `let v = f()?;` at
  print time, which reads as idiomatic Rust specifically because every fallible function shares one
  error type, so `?` never has to bridge a mismatch.
- Rust has a conditional expression, so `cond` prints as `if … { … } else { … }` directly — no
  statement hoist, unlike Go.
- `seq.fold`, `seq.map` and `seq.filter` are loops, matching Go; `seq.any`, `seq.all`, `seq.find`
  and `seq.sortStableBy` stay as intrinsic calls taking a closure.
- `task.race` is `std::thread::scope` plus an `mpsc` channel: one thread per task, the first `Some`
  received wins, exactly Go's `raceFirstSome` shape. The closures borrow rather than `move`, which
  is what lets the same argument be handed to every task (see ADR 0009).
- The differential driver (`src/bin/driver.rs`) hand-writes a minimal JSON reader/writer
  (`src/json.rs`) for its own `{"fn":…,"args":[…]}` protocol: `std` has no JSON, and this is driver
  code, not project code, in the same sense the regex matcher below is.

## Notable lowerings

**`str.len`** on a proven-ASCII value is `s.len()` (bytes, cheap); otherwise it is
`s.chars().count()`, which walks scalars without allocating — unlike Go's `[]rune(s)` conversion,
which the coordinator's own benchmark found recompiling a *pattern* from source on every call, not
counting scalars, but the same "does this walk allocate" question applies here too, and here the
answer is no.

**`str.compare`** is native with no precondition: `Ord` on `str` compares UTF-8 bytes, which is
code point order — like Go, unlike JavaScript's UTF-16 comparison. This is the sketch's headline
claim and it holds exactly as predicted.

**`re.test`**. `std` has no regex engine — the sketch's second predicted friction, confirmed. The
fix is a hand-written matcher (`support.rs`'s `re_test`/`re_ends`) that interprets a `ReNode` tree:
concatenation, alternation and bounded/unbounded repetition all reduce to tracking the *set* of
positions a partial match could be at, so it is backtracking-free without needing the accepted
subset's "no ambiguous quantifier" guarantee to prove termination (it holds regardless). Each
project pattern is a `pub static` `ReNode` value — a `const` expression, so rustc places it in the
binary's read-only data once, at compile time. This is the fix the cross-language benchmark asked
for while this backend was being built (see the coordinator's note in the session): Go's
`regexp.MustCompile` runs on every call, recompiling the pattern from source text; the Rust matcher
never compiles anything at call time, because there is no source text left to compile by the time
the binary runs. No new hoisting facility was needed to get there — `static` is the language's own
answer to "compute this once."

**`int.max`/`int.min`** detect a nested clamp (`x.max(lo).min(hi)`, the shape the source's own
`int.min(int.max(x, lo), hi)` prints as by default) and merge it into `.clamp(lo, hi)`, which
`clippy::manual_clamp` (default warn) asks for. This is a printer-level rewrite, not a new
intrinsic: the Core has no clamp primitive, and adding one for one target would be the wrong fix.

**`x >= lo && x <= hi`** (and the `||`-negated shape `x < lo || x > hi`) prints as
`(lo..=hi).contains(&x)` / `!(lo..=hi).contains(&x)`. The Core has no range type (`docs/semantics.md`
admits `<`/`<=`/`>`/`>=`, not a bounds check), so a source author always writes the pair, and
`clippy::manual_range_contains` (default warn) always asks for the idiom instead. Recognized in the
printer's `binary` case, which is where every occurrence — however deeply nested a source
expression buries it — is reached exactly once, recursively, regardless of where it came from.

**`opt.unwrap`**, printed as a bare `.unwrap()`, moves the `Option` it unwraps. A narrowed read —
`if (response === undefined) return …` followed by two or three further reads of `response.field`
— re-runs `opt.unwrap` at *every* read (the Core never re-types a local narrower; see ADR 0009's
Go comparison), so a plain `.unwrap()` would move `response` out on the first read and leave the
second one looking at a moved value. A read reached through `.unwrap()` goes through `.as_ref()`
first instead, a borrow, which is what makes any number of narrowed reads work the way a Go pointer
dereference already does for free.
