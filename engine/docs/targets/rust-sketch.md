# Sketch: what a Rust backend would look like

**Carried out.** `engine/src/targets/rust/index.ts` exists, is registered as a fourth target, and
passes the same bar the other three do: `cargo build --offline --release`, `cargo clippy --offline
-- -D warnings` and `rustfmt --check` are clean, in both idiom modes, and the differential
conformance runner matches 4256/4256 cases against the reference interpreter — the same count the
other three targets report. See `docs/targets/rust.md` for the finished representation table and
notable lowerings, and [ADR 0009](../decisions/0009-rust-values-are-owned.md) for the one decision
below that turned out not to be obvious once real code was going through it.

**Where reality differed from this sketch**, the most interesting result of carrying it out:

1. **The two predicted frictions were exactly right.** No HTTP client in `std` → a generated
   `Capabilities` trait, same shape as every other target's capability record. No regex in `std` →
   a hand-written matcher, but not the "generated scanner" this sketch guessed at: a small general
   NFA-style interpreter (`support.rs`'s `re_ends`) over a `static ReNode` tree built once per
   pattern at compile time by rustc — closer to "one JSON codec, one regex codec" than to "one
   generated function per pattern." Concretely faster than Go's current `re.test`, which recompiles
   its pattern from source text on every call (measured during this task, on a benchmark run in
   parallel with it): the Rust matcher never compiles anything at call time, because rustc already
   placed the compiled `ReNode` data in the binary.
2. **`&str` parameters do not survive contact with the shared pipeline.** This sketch's ownership
   plan ("parameters borrow, results own") assumed borrow decisions could be made locally, the way
   a hand-written Rust function's author would make them. They cannot: a capability table's `emit`
   runs at lowering time, before any function's scope exists to consult, and `printModule` sees one
   module at a time with no access to another module's function signatures — neither of which this
   sketch had reason to consider, because it was reasoning about one function, not about the
   pipeline that emits the whole program before any one function's text is final. Every value is
   owned instead ([ADR 0009](../decisions/0009-rust-values-are-owned.md)), at the cost of a few
   more `.to_owned()` calls than a hand-tuned port would write and one Rust-specific rewrite
   (`opt.unwrap` sometimes needs `.as_ref()` first) this sketch did not anticipate at all, because
   the sketch's borrowed design would not have needed it — Go's own pointer-dereference version of
   the same narrowed read has no such problem, since a Go pointer dereference is free to repeat.
3. **One flat `CoreError` enum, not one type per utility.** Simpler than sketched, and what makes
   the shared Go-shaped fallible-call hoist collapse into a plain `f(...)?` at print time: there is
   only ever one error type in the program, so `?` never has to bridge a mismatch.
4. **`Enum` is `String`, matching Go, not the sketch's `#[derive(Clone, Copy, PartialEq)]`
   fieldless enum.** The project has two enum-shaped types (`CnpjVersion`, `HolidayType`) and
   neither is ever matched with a `switch`, only compared with `===`, so there is no exhaustiveness
   the richer representation would buy back today. `switch` over an `Enum` is still handled (a
   `match`, with a defensive `_ => unreachable!()` arm, since matching on `String` cannot be
   statically exhaustive the way matching on a real `enum` could be) — this is a case where a
   richer, sketch-shaped representation remains the right answer if a project ever needs it, just
   not yet demonstrated by one that does.
5. **`i64` throughout, exactly as sketched** — every proven range in this project fits the
   platform-safe domain, so the sketch's `i128`/never-`num-bigint` ceiling was never exercised. If a
   future range needs it, that is still the finding the sketch named.

The rest of the sketch below is the original falsification exercise, kept as the record of what was
reasoned out *before* any Rust code existed to correct it.

---

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
