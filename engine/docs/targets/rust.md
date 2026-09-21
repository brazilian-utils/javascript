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

Every **local and struct field** is owned wherever it is bound, never `&str`/`&[T]` — a `let`, a
record field, a list item, `Some(...)`, `return`, always builds an owned value. A **function
parameter** of `String`/`Enum`/`List` type borrows (`&str`/`&[T]`) instead when a whole-program
pre-pass proves it is never returned, stored, assigned to or forwarded to another owned parameter;
otherwise it stays owned, the same as everything else. `docs/targets/rust-sketch.md` planned
parameters borrowing from the start, on a single-function argument that did not survive contact
with the shared Target AST; [ADR 0009](../decisions/0009-rust-values-are-owned.md) records exactly
why not, and [ADR 0010](../decisions/0010-rust-parameters-borrow-where-sound.md) records what
changed to make the sketch's original claim about parameters true after all — a pre-pass over the
*whole* `CProgram`, computed once before lowering starts, rather than a decision made function by
function during lowering or printing. `analysis/borrows.ts` is the pre-pass; `TParam.borrowed` and
a "call" node's `borrowedArgs` (`backend/tast.ts`) are what it hands the lowerer and the printer.

## Shape of the output

- One crate, `coreout`: `src/lib.rs` declares `pub mod` for every generated module plus `support`
  and (when the project declares any) `errors`, and re-exports each flatly (`pub use lib_digits::*;`
  and so on). A module calls another's function unqualified — Go's advantage of a single package,
  recovered here through the glob rather than through the language having no module system at all.
- A utility is `pub` (reachable at the crate root through the flat re-export above). A helper its
  own source module exports but that is not itself a utility — reachable across generated modules,
  never meant to be reachable from outside the crate — is `pub(crate)`: visible to the `use
  crate::*;` every module imports, but a glob re-export silently drops it rather than leaking it
  further (verified against `rustc` directly: a `pub(crate)` item never surfaces through `pub use
  module::*;`). A helper never exported at all, called only from within its own module, is a plain
  `fn` — Rust's own notion of private, and the tightest of the three.
- `support.rs` holds the `Capabilities` trait and its request/response records, the generic
  sequence and string helpers the capability table names, and the regex matcher (below).
- **No default `Capabilities`.** `support.rs` declares the trait only — no HTTP client, no clock,
  no RNG anywhere in the `coreout` crate, on purpose: the library depends on `std` alone. The
  differential driver's `src/bin/driver.rs` builds its own fixture-backed `FakeCapabilities`, but
  that fake lives in the driver binary, never in the library crate. This means a utility whose
  effects reach `Http`, `Clock` or `Random` (`get_address_info_by_cep`, `generate_cpf`,
  `generate_cnpj`) cannot get the public-wrapper treatment TypeScript and Python give the same
  utilities (`docs/semantics.md` §4.1) — there is no default to hand a wrapper, and one is not
  fabricated to manufacture the appearance of parity. The capability-taking function stays the
  only entry point, under its original name, taking `&dyn Capabilities` as a normal parameter a
  caller supplies. This is a genuine, reported gap from drop-in replacement, not a defect in this
  backend's generation — see [ADR 0011](../decisions/0011-public-entry-points-vs-capabilities.md).
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

**Parameter borrowing.** `analysis/borrows.ts` decides, once per build and before lowering starts,
which `String`/`Enum`/`List` parameters may print as `&str`/`&[T]`; [ADR
0010](../decisions/0010-rust-parameters-borrow-where-sound.md) has the full rule set and why
starting optimistic and demoting on evidence is sound. In practice this reaches deepest along a
read-only chain: `digit_at(value: &str, index: i64)` only reads a byte, `cpf_check_digit(cpf: &str,
size: i64)` only forwards that byte read in a loop, and `is_valid_cpf(cpf: &str)` only forwards
`cpf` into `keep_digits` and the trim — none of the three needs to own the 11-digit string, so
none of them do, and the loop that used to clone it once per weight (`digit_at(cpf.to_owned(),
index)`, 9 to 11 times per call) now passes a bare `&str` copy instead. `cnpj_check_digit(cnpj:
&str, weights: &[i64])` borrows both parameters the same way, including the hoisted weight table
(`LIB_CNPJ_TABLE1: &[i64]`, already a reference — passed bare, not `&`-wrapped again). A record
parameter (`FormatCnpjOptions`, `AddressInfo`) and every return type stay owned regardless; ADR
0010 explains why a borrowed struct field is a different, larger change this decision does not
make.

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
