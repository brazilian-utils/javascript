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
first fix (landed with this target) was to stop recompiling anything at call time: each project
pattern became a `pub static` `ReNode` tree, a `const` expression rustc places in the binary's
read-only data once. That was necessary but not sufficient — a later cross-language benchmark
(200 000 iterations of `isValidCpf`/`isValidCnpj` against the handwritten `brazilian-utils/rust`
crate) found the generated code 24-50x slower even with compilation gone, because the *matcher*
itself, walking that `ReNode` tree, allocated a fresh `Vec<usize>` of reachable positions per node
per position and sorted and deduplicated each one: dozens of heap allocations per call for a
14-character input. `support::re_test` alone was 79% of the call.

The engine knows every pattern in a project before it generates a line of Rust, so the real fix is
to stop interpreting a tree at call time at all. `engine/src/targets/rust/index.ts`'s "Regex"
section compiles each pattern into one of two things, decided once, at generation time:

- **A dedicated scanner** (`re_match_N`, in `support.rs`), for a pattern that is a top-level chain
  of character classes and repeated character classes with no alternation and no repeated group —
  every pattern `core/source` actually uses. `chainElementsOf` additionally requires that any
  variable-length run have a class disjoint from whatever immediately follows it (maximal munch:
  the two classes can never disagree about where one run ends and the next begins), which is what
  lets the emitted scanner consume each run greedily, in one forward pass over `&str`, and never
  need to back off. It is built from two small generic helpers, `re_take_fixed`/`re_take_class`,
  that slice the input forward; nothing here allocates.
- **The fallback matcher** (`re_test`/`ReNode`, still in `support.rs`), for anything
  `chainElementsOf` refuses — alternation anywhere, or a repeated group more complex than one
  class. This is no longer the position-set NFA: it is continuation-passing backtracking over
  `&str` byte slices, a direct port of `regex.ts`'s own reference matcher (`matchNode`), which is
  what every accepted pattern is already checked against in `engine/tests/regex.spec.ts`. Its
  continuations are stack-local closures borrowed with `&dyn Fn`, never boxed, so it does not
  allocate either — the `Vec<char>` `re_test` used to collect the input into, and the per-node
  `Vec<usize>`, are both just gone, not replaced with a differently-shaped allocation.

No pattern in `core/source` takes the fallback path today; `LOWERING.md`'s `re.test` row and the
`because` string in `RUST_CANDIDATES` name the rule that decides, so a reviewer does not have to
infer it from which patterns happen to appear. Re-measured, `support::re_match_3` (the CPF
pattern's scanner) alone is on the order of the input's own length to walk once — see
`core/bench/README.md`'s Rust section for the current numbers and what dominates the call now that
the matcher no longer does.

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
