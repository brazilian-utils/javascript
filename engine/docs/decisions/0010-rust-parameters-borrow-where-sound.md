# 0010 — Rust parameters borrow where a whole-program pre-pass proves it is sound

**Supersedes [0009](0009-rust-values-are-owned.md).**

## Context

0009 was right about both of the obstacles it named: a candidate's `emit` runs once, during
`lowerProgram`, for the whole program, before `printModule` has run for *any* module, so it cannot
consult a callee's parameter types from a per-function scope that does not exist yet; and
`Backend.printModule(module: TModule): string` sees one module at a time, with no access to
sibling modules' signatures. Neither of those is a mistake in 0009's reasoning, and this decision
does not relitigate them.

What 0009 missed is that both obstacles are about *when* a decision is made, not about whether the
information exists. `lowerProgram` receives a `CProgram` with every function in it — every
signature, every call, every module — before it lowers a single one of them. The two problems 0009
found are both instances of one fact: deciding "does this parameter borrow" *during* lowering or
*during* printing does not have enough context. Deciding it *before* lowering starts, over the
whole program at once, does.

The cost 0009 accepted for owning everything was not hypothetical. `docs/targets/rust.md` and
`core/bench/README.md`'s Rust section measured it directly: `cpf_check_digit`'s loop called
`digit_at(cpf.to_owned(), index)` once per weight (9 to 11 times per call), because `digit_at`
took `value: String` and every call argument was cloned to build it. That loop was 44.9 ms of the
78.0 ms `is_valid_cpf` cost at 200 000 iterations — more than half the call, for a value that
`digit_at` and `cpf_check_digit` both only ever read. `cnpj_check_digit` has no such cost, because
its own source indexes `cnpj.as_bytes()[index]` directly instead of calling a `String`-taking
helper in a loop; that accident of which loop-body shape `core/source` happens to use is the entire
reason `isValidCnpj` (3.59x the handwritten crate) looked so much better than `isValidCpf`
(10.89x) despite validating more digits. Generated Go, on the same benchmark, was already faster
than generated Rust on both rows — a systems language with automatic memory management beating one
with an ownership model it was not using.

## Decision

A pre-pass (`analysis/borrows.ts`, `computeBorrowableParams`) walks the whole `CProgram` once,
before any target-specific lowering runs, and decides which `String`- and `Enum`- and `List`-typed
function parameters may be printed as `&str`/`&[T]` instead of `String`/`Vec<T>`. The search starts
**optimistic**: every eligible parameter is assumed borrowable, and a parameter is **demoted** to
owned the moment direct evidence shows it needs to be — returned, stored into a record field, a
list element or a thrown error's payload, assigned to, or forwarded unchanged to a parameter of
another function that already needs to be owned. That last rule is a fixpoint over the call graph:
whenever a callee's parameter is found to need ownership, every caller that forwards its own
parameter into it, bare and unchanged, is demoted too, and the demotion is applied with a worklist
over the reverse call graph until nothing more changes. Starting optimistic and demoting is sound
here specifically because demotion only ever *adds* to the owned set — never removes from it — so
the set of "still borrowable" parameters shrinks monotonically to a fixpoint no matter what order
the evidence is found in; `docs/semantics.md` §7 forbids recursion, so the call graph has no
cycles and the worklist provably terminates (each key enters the queue at most once).

The result — a `BorrowMap`, from a function's fully qualified name to the names of its own
borrowable parameters — is handed to the shared lowerer as an input (`LowerOptions.borrows`) and
to the Rust printer as data already baked into the Target AST, not as something either of them
computes:

- `Lowerer.lowerFunction` looks the map up once per function, before lowering that function's body,
  and sets `TParam.borrowed` on each parameter accordingly. `printFunction` reads that field to
  decide `&str`/`&[T]` vs. `String`/`Vec<T>` in the signature; it does not re-derive it.
- Every "local" reference the lowerer builds (`Lowerer.expr`'s `"local"` case) carries `borrowed:
  true` when it names one of the *current* function's own borrowed parameters. This is the fix for
  0009's exact timing problem: a candidate's `emit` can now ask a plain data field on the `TExpr`
  it already has in hand, at whatever point during lowering it runs, instead of needing a
  per-function scope that does not exist yet.
- Every "call" node carries `borrowedArgs`, one flag per argument, set from the *callee's* entry in
  the same `BorrowMap` at the point the call is lowered (`Lowerer.expr`'s `"call"` case already has
  the callee's `CFunc` in hand there). The printer's `call` case reads it directly: an argument the
  callee only reads is passed with `&`, everything else still goes through the existing
  `toOwned`/`callArg` path, unchanged.
- The Rust backend supplies the pre-pass to the shared pipeline through one new, optional hook on
  `Backend` (`extraLowerOptions: (program) => Partial<LowerOptions>`), merged into `LowerOptions`
  before `lowerProgram` runs. `generate.ts` stays target-independent — it calls the hook if the
  backend defines one and does nothing otherwise — and Go, Python and TypeScript, which define no
  such hook, are unaffected in every sense that matters: same code path, same output, same
  conformance, because `LowerOptions.borrows` is `undefined` for them and every place that reads it
  treats `undefined` as "owned", exactly 0009's model.

Record fields and every function's return type stay owned, unconditionally — this decision does
not touch either. A borrowed field would need a lifetime parameter on the struct itself
(`struct Foo<'a> { name: &'a str }`), which is a materially larger change (every consumer of that
struct now carries a lifetime too) for a benefit this task was not measuring; a borrowed return
type is not expressible without one either, since nothing borrowed can outlive the call that
produced it. `toOwned` already converts a borrow to an owned value uniformly at both positions
(`&str`'s `.to_owned()` and `String`'s `.to_owned()` are the same call, printed the same way), so
nothing about them needed to change for parameters to start borrowing.

### Why this is sound, position by position

Every position that builds an owned value in the Rust backend — a `let`, a `return`, a record
field, a list item, `Some(...)`, an owning call argument — already goes through `toOwned`, and
`toOwned`'s `.to_owned()` on a name is exactly as correct whether that name is a `String` or a
`&str` (0009's own point about `.to_owned()` vs. `.clone()`, unchanged by this decision). That is
what makes the four demotion rules a genuine *optimization* question rather than a *correctness*
one: nothing here is unsound to skip, in the sense of producing code that fails to compile. What
each rule actually buys is not needing a clone at all where a bare move or a bare borrow now
suffices instead:

- **Returned, or reaches a return through another value.** Returning an owned parameter can be a
  move (`return param;`, free); returning a borrowed one needs a clone (`return param.to_owned();`)
  because nothing borrowed can be handed out past the call. Keeping it owned keeps that path free.
  A local that is a bare, untransformed alias of the parameter (`let x = param;`) inherits the same
  treatment, because at the exact point that alias was built, it went through `toOwned` already —
  whatever the parameter's own status, that clone happened once, there; nothing about the
  parameter's declared type changes after that.
- **Stored into a record field, a list element or a thrown error's payload.** Same shape as above:
  a field, an item or an error payload is always built owned, so the parameter being owned instead
  of borrowed only matters for whether that specific write can be a move.
- **Assigned to.** `check.ts` marks every parameter binding `mutable: false`, so this never actually
  fires against an unshadowed parameter today — a mutable local can share a parameter's name only
  by shadowing it with its own `let`, which the alias tracking in `analysis/borrows.ts` already
  treats as a break in the alias (a fresh, independent, owned local from that `let` on). The rule
  is kept anyway, as a static safety net: if the source subset ever admits a form of parameter
  mutation, this rule already demotes the right parameter without anyone having to remember to add
  it then.
- **Forwarded to a parameter of another function that is itself owned.** A thin forwarding function
  (`f(s) { return g(s); }`, `s` used nowhere else) that keeps its own parameter owned can hand `s`
  to `g` as a move if `g` needs it owned, instead of paying a clone at that internal call; keeping
  `f`'s own parameter borrowed would force that clone every time `f` is called instead. This is
  the one rule that is not purely local to one function, which is why it is a fixpoint over the
  call graph rather than a single pass over one function's body.

Two things this pass deliberately does not chase, both because they cost nothing to leave alone,
given the design above:

- **Last-use elision.** `toOwned`'s `"name"` case still clones unconditionally on every occurrence,
  even the last one, even for an already-owned local — the same simplification 0009 named and
  accepted ("the backend does not attempt a last-use analysis"). This decision does not add one.
  What it removes is the clone an *owned call argument* needed only because the parameter itself
  was declared owned when the callee never asked for that; it does not remove the clone a
  genuinely-owned value pays when it is used more than once.
- **An intrinsic's own operands.** `str.concat`, `str.padStart` and the rest of `RUST_CANDIDATES`
  already borrow their own arguments, through the existing `borrowed()` helper, independently of
  this map — that is the "Support functions still take `&str`/`&[T]`" half of 0009, untouched.
  What *did* need a fix, because parameters can now genuinely be `&str`/`&[T]` themselves, is
  `borrowed()`'s own `"name"` case: wrapping an already-borrowed name in another `&` would print
  `&&str`/`&&[T]` — harmless at compile time (Rust's coercion resolves it) but exactly what
  `clippy::needless_borrow` exists to flag under `-D warnings`. `borrowed()` now checks the same
  `borrowed` field `Lowerer.expr` sets on every "local" reference (and the existing
  `hoistedConstantNames` check, for a hoisted `&'static [T]` table) before deciding to add a `&`.

## Consequences

- **`is_valid_cpf`'s loop cost is gone, not reduced.** `cpf_check_digit`'s own parameter, and
  `digit_at`'s, are both borrowable (each only reads its `value`), so `cpf_check_digit`'s loop is
  `digit_at(cpf, index)` — a bare `&str` copy, not a clone — at every iteration. Re-measured,
  `cpf_check_digit(_, 9)` and `cpf_check_digit(_, 10)` together cost about 2.2 ms over 200 000
  calls, against 44.9 ms for one of the two before this decision.
- **The new bottleneck is `keep_digits`, not ownership.** With the loop's clones gone,
  `is_valid_cpf`'s single remaining allocation-heavy step is `keep_digits`'s own
  `.chars().filter().collect::<String>()`, building the fresh, necessarily-owned value the function
  returns — about 9-9.5 ms of `is_valid_cpf`'s ~16.8 ms, next to `re.test`'s ~4.4 ms (unchanged;
  this decision does not touch regex) and well under 1 ms for `is_repeated` plus the now-free
  `cpf_check_digit` calls. `core/bench/README.md`'s Rust section has the full attribution and the
  before/after benchmark.
- **Generated Rust now beats generated Go on both CPF and CNPJ rows** (it did not, before this
  decision), the specific regression this decision exists to close.
- **A hand-written port would still borrow a few things this pass keeps owned.** The alias tracking
  in `analysis/borrows.ts` only follows a *bare* `let x = param;` as a continued alias; a parameter
  threaded through a `Record` field, or read inside a combinator lambda in a way more indirect than
  a bare capture-and-return, is not traced past that point, and the record/list/error-payload rule
  above is evidence-based rather than data-flow-complete (it looks at the immediate write, not at
  what later happens to the container). Where this pass cannot prove a parameter's status either
  way through those paths, it does not demote it — the parameter simply stays eligible and ends up
  borrowed if nothing else demotes it first, or a hand-written port would sometimes make a sharper
  call than this pass does in the other direction, on a value it can see is never touched again
  after a store this pass conservatively still credits toward "escapes". Both directions are safe;
  neither is exploited by anything measured in `core/source` today.
- **Go, Python and TypeScript are untouched.** `LowerOptions.borrows` and the `borrowed`/
  `borrowedArgs` Target AST fields are optional and target-agnostic by construction; none of the
  other three backends reads them, none of their `extraLowerOptions` hooks exist, and their
  generated output and conformance are unchanged by this decision.
