# 0009 — Every Rust value the core touches is owned, not borrowed

## Context

`docs/targets/rust-sketch.md` planned parameters as `&str`/`&[T]`/`&Record`, with only results
owned, on the reasoning that "every value in the Core is immutable once it escapes, and a mutable
local never escapes, so parameters borrow and results own" — the frozen-on-escape rule doing the
work that would otherwise make borrow inference "the hard part of the backend."

That reasoning holds for a single function in isolation. It does not survive the shared pipeline
this engine actually has:

- A candidate's `emit` (the capability table) runs once, during `lowerProgram`, for the whole
  program — before `printModule` has run for *any* module. A native or library lowering (`str.trim`,
  `seq.at`, …) can itself contain a nested call to an ordinary Core function
  (`str.padStart(value, patternSlots(pattern), "0")`, say), and at the point that nested call is
  printed, no per-function scope — which locals are already bound, and to what type — exists yet to
  consult, because scope is print-time state and this is lowering time.
- `Backend.printModule(module: TModule): string` sees one module at a time, with no access to
  sibling modules' function signatures. Deciding "does this argument need `&`" from the *callee's*
  declared parameter type — the sketch's own model — needs exactly that cross-module signature
  table, which nothing in the shared pipeline hands a backend.
- The Target AST carries no lifetimes at all (`backend/tast.ts` is shared by three targets with no
  borrow checker), so there is no way to thread a lifetime parameter through a borrowed signature
  even if the first two problems were solved.

A borrowed-parameter design needs all three of these to hold the way a single hand-written Rust
function would take them for granted. None of them does, in this architecture.

## Options

**Borrow parameters, as sketched.** Requires either a whole-program pre-pass (computing every
function's owned-vs-borrowed signature before any lowering runs — a second traversal the other two
targets do not need) or accepting the timing gap above as a known-broken edge case. Neither is a
small addition; the second is a bug, not a design.

**Own everything, decide ownership only at print time, only where it is unavoidable.** A function
parameter, a struct field, a `Vec` element are all `String`/`Vec<T>`/`T` (owned). Borrowing appears
only where Rust supplies one for free: a method's `&self` receiver, a `for` loop's `.iter()`, a
`std`-provided helper's own `&str`/`&[T]` signature (which this backend's support functions use
throughout, and which candidates borrow into explicitly with `borrowed()`). The one recurring cost
is `.to_owned()` at the handful of positions that actually build an owned value — a `let`, a
`return`, a record field, a list item, `Some(...)`, a call argument — and those are exactly the
positions `docs/semantics.md` already treats as escape points, so the sketch's frozen-on-escape
insight is not wasted, only relocated from "which parameters borrow" to "which expressions need
`toOwned`.

## Decision

Every heap-typed value — parameter, local, struct field — is owned. `toOwned(expr, expectedType)`
converts a bare name, a field read or a string literal into an owned value at exactly the positions
that need one; everywhere else, `print` is used directly and never allocates on its own account.
`toOwned` reaches for `.to_owned()` uniformly, never `.clone()`: the blanket `impl<T: Clone>
ToOwned for T` makes `.to_owned()` exactly as correct on an already-owned value (a clone) as on a
reference (`&str` → `String`), so the printer never has to know which one it is looking at, and
`clippy::clone_on_copy` — which matches the method name `clone`, not `to_owned` — never fires on a
`Copy` value that happened to go through this path.

A related simplification travels with this one: `CoreError` is a single flat enum (one variant per
declared domain error), not one error type per utility the way Go's `error` interface and each
target's own error hierarchy might suggest. Every fallible function returning `Result<T, CoreError>`
is what makes the shared lowerer's Go-shaped `multiLet` + `if err != nil` hoist collapse into a
plain `f(...)?` at print time — there is never a type for `?` to bridge, because there is only ever
one error type in the whole program.

## Consequences

- **A few more clones than a hand-tuned Rust port would write.** A value passed to two different
  calls is `.to_owned()`'d at both, not moved at the last one; the backend does not attempt a
  last-use analysis. Given the actual generated code (nine document-formatting and lookup
  utilities, not a hot loop over millions of records), this is the right place to spend simplicity
  rather than the wrong one to spend allocations.
- **`opt.unwrap` needs a second form.** `Option::unwrap` takes `self` by value, unlike a Go pointer
  dereference, which is free to repeat. A Core-narrowed field read (`if x === undefined { return }`
  then `x.field`, possibly several times) re-inserts `opt.unwrap` at every read, since the Core
  never re-types the local narrower — so a narrowed read goes through `.as_ref().unwrap()` (a
  borrow) instead of a bare `.unwrap()` whenever it is immediately followed by a field access. See
  `docs/targets/rust.md`'s note on the same lowering.
- **`task.race`'s closures borrow, not `move`.** A `move` closure would take ownership of whatever
  it captures, and two tasks built from the same argument (`fetch_via_cep(cep, env)` and
  `fetch_brasil_api(cep, env)`, both closing over `cep`) cannot both move it. Since every capture
  here is read-only, an ordinary (non-`move`) closure borrows instead, and any number of tasks can
  share the same borrow.
- **Support functions (`support.rs`) still take `&str`/`&[T]`.** They are called the way `std`'s
  own functions are — read-only, any number of times, including from inside a loop — which is
  exactly the shape a borrow is for. A generated *project* function cannot always make the same
  promise (an owned parameter may need to be stored, not just read), which is why the two halves of
  this backend's own code borrow and own respectively, on purpose, not by oversight.
- This is the concrete way `docs/targets/rust-sketch.md`'s falsification exercise was wrong, and
  the interesting result of carrying it out: not the two frictions it predicted (HTTP, regex — both
  confirmed, both solved without a crate), but a third one it did not see, because the sketch
  reasoned about one function at a time and the actual friction is a property of the pipeline that
  lowers the whole program before any one function's text is final.
