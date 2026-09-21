# Random program generation

The 64 hand-written cases and the two translation-validation programs are a fixed target. The two
soundness bugs found in this codebase before this generator existed — `break`/`continue` not
reaching a loop's fixpoint, and a switch-case `break` lowered as a loop break — were both found by
a person reading code, not by either of those. This is the search that replaces "read more code."

`src/fuzz/` generates well-typed programs in the engine's subset and checks them two ways; `scripts/fuzz.ts`
is its command line.

## Where it lives, and why it has no dependency

The generator is `engine/src/fuzz/`, inside the engine, not a separate package and not built on
`fast-check` (already a devDependency of the repository root, and the obvious tool for this if the
generator lived at the repository root instead). Two reasons pulled the other way:

1. **The engine has exactly one runtime dependency (`oxc-parser`), and that restraint is
   deliberate** — see the one-line "Deliberately absent" callouts throughout `semantics.md`. Taking
   `fast-check` as a second one to generate test input is a strange trade for a project whose whole
   design argument is "prove it, don't depend on a library proving it for you."
2. **A property-testing library's arbitraries compose *values*.** What this generator needs to
   compose is *statements that stay well-typed as they accumulate a range* — an `Int.map`/`chain`
   pipeline does not know that pushing a fourth statement into a loop body has to keep the whole
   body provable by the checker afterward. That bookkeeping (`src/fuzz/generate.ts`'s `Ctx`, tracking
   which locals are safe to index and which are in scope at all) is the actual content of a program
   generator for this language, and `fast-check` would not remove any of it — only its low-level
   `Random`/shrinking plumbing would be reused, and that plumbing is a few dozen lines to hand-roll
   (`src/fuzz/rng.ts`) against the wall of API surface a real dependency would carry.

So: a 32-bit seeded PRNG (`rng.ts`, mulberry32 + a splitmix32 sub-seed derivation), a small
generator-owned AST with its own printer (`ast.ts`), a recursive generator over that AST
(`generate.ts`), and a delta-debugging shrinker over the same AST (`shrink.ts`) — a few hundred
lines total, no new dependency, all reviewable the same way the rest of the compiler is.

## What it generates, and what it deliberately does not

Every generated program is one exported function, biased toward the shapes that broke the checker
before (see `generate.ts`'s module doc for the exact weighting):

- loops with `break`/`continue` in every position, including a `break`-then-fall-through-to-`else`
  shape that specifically exercises what a loop's fixpoint carries out of a conditional branch;
- an accumulator (`Int`, `boolean`, or a code-point list built into a string) carried across
  iterations, including through `break`/`continue`;
- nested loops, up to two deep;
- a `switch` over a generated `Enum`, sometimes nested inside a loop;
- an index into a list, generated *only* where the generator itself can see it is safe — a counted
  loop's own counter, ranging over a same-length list's `.length` — which is exactly the shape the
  `break`/`continue` fixpoint bug lived in (`docs/semantics.md` section 7's `E_SIGNATURE` example,
  and `tests/loops.spec.ts`);
- integer division and modulo with a proven non-zero literal divisor, which is what exercises the
  Python backend's truncated-vs-floored divergence (`docs/semantics.md` section 2.1);
- occasionally (one list per function, capped — see `generate.ts`) a list long enough to push a
  loop past the 64-iteration exact-fixpoint threshold into the widen/clamp path
  (`docs/semantics.md` section 2.2), not just the small exact case the historical bug happened to
  trip on;
- an early `return` from inside a loop.

Every mutable integer local is declared `Int` — the full platform-safe domain — never a tight
`IntRange`. This is not a simplification that dodges the interesting bugs: the checker still infers
and proves a *tight* range for the local on every assignment regardless of its declared ceiling,
and that tight range is exactly what Layer 1 (below) checks the interpreter's real answer against.
Declaring `Int` only means the compiler never rejects a program for accumulating past its author's
stated intent — which is not the analysis this generator exercises — and it is what makes free-form
generation of arithmetic tractable without re-implementing the checker's own interval arithmetic to
predict, before generating an expression, exactly how wide an annotation it would need.

**Deliberately absent**, to keep the generator's own surface reviewable: records, `Decimal`,
`CivilDate`/`Instant`/`Duration`, `Http`/`Clock`/`Random` capabilities, `task.race`, `throw`,
template literals, and `String`/`Ascii` function parameters (string values only appear as the
*output* of building a code-point list with `str.fromCodePoints`, not as generated input). None of
these are where the known bugs lived, and the bias list above is what the task asked this generator
to hunt for. Extending the generator to any of them is straightforward: add a case to the `Shape`
union and a branch to the relevant `gen*` function in `generate.ts`.

## The two comparisons

`src/fuzz/harness.ts` runs each generated program two ways:

- **`runFast` — checker against reality (Layer 1).** Compiles the program, runs the reference
  interpreter on random inputs (`values.ts`'s `randomValue`, biased toward each type's own edges),
  and checks that every value it actually produced lies inside the range, length and character
  class the checker proved for it (`values.ts`'s `withinType`). No code generation at all, which is
  what makes it cheap enough to run in the thousands on every `verify` — see "Wiring" below. This
  is exactly the shape of the `break`/`continue` bug: the checker proved a range, and the question
  is whether reality (the interpreter, which follows real control flow) agrees.
- **`runFull` — interpreter against all four targets, in both idiom modes (Layers 2/3).** Generates
  TypeScript, Python, Go and Rust from the same compiled program and compares every answer against
  the interpreter's, reusing `src/conformance/differential.ts`'s `runInterpreter`/`runTarget`/
  `compare` exactly as `core/conformance/run.ts` drives them by hand — this generator does not
  reimplement that machinery, only supplies it with generated cases instead of hand-written ones.
  Compiling and running four toolchains is slow, so `runFull` first compiles every candidate program
  on its own (an inexpensive pass — the same one `runFast` does) and only pays for code generation
  and four builds on the survivors, batched into one project so the cost is paid once per batch, not
  once per program.

A program that fails to compile is not a finding: the generator is not required to produce only
well-typed programs by construction (see `generate.ts`'s module doc on why that would mean
re-implementing the checker's own type inference to generate goal-directed expressions), only to
generate *mostly* well-typed ones and let the compiler be the filter. Both modes report the
compile success rate for this reason.

## Seed and shrink

Every program is addressed by a `(seed, index)` pair (`rng.ts`'s `subSeed`), so replaying
`--seed <seed> --count 1` after adding `--seed` reproduces bit-for-bit the same program the batch
produced at index 0, independent of what batch size or machine produced the original finding. A
report always prints the seed next to the finding for exactly this reason.

A finding is shrunk before it is reported (`shrink.ts`):

- **`shrinkInputs`** narrows the failing argument tuple toward the edge of each parameter's own
  type (zero, `false`, an empty or shorter list) without touching the program at all — cheap, since
  it costs one interpreter call per trial, no recompilation.
- **`shrinkProgram`** narrows the program itself, one delta-debugging pass at a time: drop a
  statement, drop an `if`'s `else`, drop a `switch` case. Every candidate is recompiled and rejected
  outright if it no longer type-checks, so a shrunk report is always itself a valid program in the
  subset. `runFast`'s violations are shrunk this way (`shrinkViolation`); `runFull`'s four-target
  divergences are reported with the program the generator produced, unshrunk — recompiling and
  rebuilding four toolchains per shrink trial is too slow to run automatically, so a full-mode
  finding is a starting point for a person's own minimization, not a final answer the way a fast-mode
  one is.

## Wiring

`scripts/verify.ts` runs `fuzz fast` with a small, fixed seed on every verification — no code
generation, so it costs seconds, not minutes. `fuzz full` is not wired into `verify`: it is run
deliberately, with a larger budget, exactly like `core/conformance/run.ts` is run deliberately
rather than on every keystroke.

```sh
node scripts/fuzz.ts fast --seed 20260921 --count 5000
node scripts/fuzz.ts full --seed 20260921 --count 300 --targets typescript,python,go,rust
```

A new target's own conformance story (`adding-a-target.md` step 5) should include a `fuzz full` run
restricted to it (`--targets <name>`) alongside the differential conformance harness: the generator
does not know which target it is comparing, so a new backend gets the same generated coverage the
first four did for free.

## Findings

The generator's first runs at scale found four bugs, none of which the 64 hand-written cases or
the two translation-validation programs reached. Three were small enough to fix on the spot and
are already fixed in this tree; the fourth is reported and left, per this project's own rule that a
found bug is the deliverable, not a failure to be smoothed over.

### Fixed: a `switch`'s effect on a mutable local never left the `switch` (Layer 1)

`seed 12345 --count 300`, program `program::fuzz_185` (auto-shrunk); minimal form:

```ts
export type Kind = "A" | "B";

export function f(p1: List<IntRange<-5, 2>, 7, 7>, kind: Kind): Int {
	let acc: Int = -8;
	for (const e of p1) {
		switch (kind) {
			case "B":
				acc *= -2;
				break;
			default:
				break;
		}
	}
	return acc;
}
```

`core/check.ts`'s `switchStatement` collected the type-state at the end of every case (`exits`) —
used to check exhaustiveness — but the state was never merged back into the enclosing scope: the
function restored the pre-switch snapshot and returned without ever calling `applyJoin`. The
checker proved `f`'s return was `Int[-8..-8]` (the switch, in its model, changes nothing) while the
interpreter, calling `f([0,0,0,0,0,0,0], "B")`, actually returned `1024` — `-8 * (-2)^7`, seven real
multiplications the checker never saw. This is the same shape as the historical `break`/`continue`
bug the checker's tests already guard against — a control-flow construct's effect not reaching the
point after it — just in `switch` instead of a loop. Every `if`/`else` in the same function was
already threaded correctly; `switch` was the one construct that dropped its own state on the floor.
The fix (`checkFunction.switchStatement`) joins the ending state of every case that can fall off
its own end (skipping one that always `return`s or leaves the loop, the same distinction `if`
already draws) into the scope after the switch — nine lines, and the fixed case now proves
`Int[-512..1024]`, which matches what the interpreter really computes.

### Fixed: a generated TypeScript `switch` fell through every case (Layer 3, TypeScript only)

`seed 1 --count 10`, program `program::fuzz_2`; the interpreter and the TypeScript target disagreed
on every one of 3 cases in both idiom modes. `core/check.ts`'s `caseBody` correctly drops the
source's own case-closing `break` on the way into Core — documented in `docs/semantics.md` section
7, because the Core's `switch` never falls through and a target that printed the Core's cases as a
bare chain would read a kept `break` as leaving the enclosing loop instead. The TypeScript printer
(`targets/typescript/index.ts`) took that documented fact one step too literally: it printed each
case's body with nothing after it at all. JavaScript's `switch` *does* fall through without an
explicit `break`, so every case ran every case below it too — a single matching case pushed three
or four values into the accumulator instead of one. Go's `switch` does not fall through, Python is
compiled to an `if`/`elif` chain, and Rust's `match` arms don't fall through either, so this was
TypeScript-only. The fix appends an unconditional `break;` after every case and the `default`
(cheaper and just as sound as proving which bodies already exit on their own, since an unreachable
`break` after a `return` is harmless). `core`'s own source has no `switch` at all, so this had zero
effect on its committed output or conformance numbers — exactly the kind of gap only a generator
that writes `switch` reaches.

### Fixed: an accumulator raised to a `const fold` was reassigned again later in the same function (Layers 1 and 3, every target)

`seed 2 --count 50`, program `program::fuzz_20`; the TypeScript target threw
`TypeError: Assignment to constant variable.` at run time (a genuine Core-level bug, not a
TypeScript-only one — see below). Minimal form:

```ts
export function f(p1: List<IntRange<-5, 4>, 3, 3>): Int {
	let acc: Int = 10;
	for (const e of p1) {
		acc += e;
	}
	for (let i = 0; i < p1.length; i++) {
		acc -= p1[i];
	}
	return acc;
}
```

`optimize/optimize.ts`'s `raiseLoops` turns `let acc = init; for (x of xs) { acc = update; }` into
`const acc = seq.fold(xs, init, (acc, x) => update)` — sound on its own, and a nice simplification
every backend can choose to print as a native fold. It decides this by looking only at the
statement immediately after the loop; it never checked whether `acc` is assigned again *anywhere
later* in the function. Here it is: the second loop still reassigns `acc`. The pass raised the
first loop anyway, declared `acc` immutable, and left the second loop's plain `acc -= p1[i]`
untouched — a `const` two lines away from its own reassignment. This is a Core-level pass, so it
was not really "TypeScript's bug": Rust would have refused to compile it outright ("cannot assign
twice to immutable variable"), and Python and Go would likely have run it "successfully" while
silently keeping the wrong (unfolded-and-never-updated-again) value in the const case, which is
worse. The fix (`isReassignedLater`) walks the rest of the function body — including inside a
nested `if`, loop or `switch` — before raising, and skips the transform if `acc` is reassigned
anywhere in it.

### Reported, not fixed: an unused `for…of` binding produces invalid Go

`seed 2 --count 50`, program `program::fuzz_0` (one of several in that batch); Go's `go vet` refuses
the whole file with `declared and not used: e`. Minimal form:

```ts
export function f(p1: List<IntRange<-5, 4>, 3, 3>): Int {
	let acc: Int = 0;
	for (const e of p1) {
		acc += 1;
	}
	return acc;
}
```

The subset allows a `for…of` whose body never touches the bound element — nothing in
`docs/semantics.md` requires it, and a hand-written source could easily do the same thing on
purpose (counting elements, say). `targets/go/index.ts`'s `forEach` printer always names the
binding (`for _, e := range …`); Go requires every named local to be used, so an untouched one is a
compile error, and it takes down every function in the same generated file, not just the one that
has it. The natural fix is for the Go backend to print `_` when the loop body never references the
name. That check has to walk the *printed* Target AST rather than the Core's, because the printer
can still legitimately choose a lowering that references the loop variable in text the Target AST
does not model as a node (`adding-a-target.md`'s warning about `raw` emissions hiding what is
inside them from every later pass) — a correct fix has to either prove no such `raw` text exists in
the body or fall back to "assume used" whenever it might, and getting that exactly right was not a
small enough change to make confidently in the time this task had. Left as found, with this
reproduction and `node scripts/fuzz.ts full --seed 2 --count 1 --targets go` to replay it.

### Not an engine bug: the generator's own nesting depth had an off-by-one

Also found at scale, and worth recording because it looked exactly like a hang at first: two
loop-nesting parameters (`generate.ts`'s "one list per function may be 'wide' enough to force the
64-iteration widen/clamp path" and "loops nest up to two deep") were each safe in isolation but
compounded once they landed in the same function. A budget meant to allow at most two nested loops
let a third one through (the budget was spent only when *choosing* to nest, not when a loop was
actually created), so a generated program could range three loops deep, all three over the same
"wide", roughly-90-element list — about 90³ ≈ 730,000 executions of a body that pushes onto a list
with `push`'s copy-the-whole-list-per-call semantics (`interp.ts`), which is quadratic in the
list's own length. That combination made one generated program's *interpretation* — not its
compilation — take minutes, which is what made an early full run of `fuzz fast` look hung rather
than slow. Fixed in the generator (one extra `- 1`, `generate.ts`), not in the engine: nothing the
checker or the interpreter proved was wrong, the reference interpreter's `push` is simply not
written for the input sizes three-deep nesting of a "wide" list produces, and no hand-written
utility's loop nests three deep over a 90-element list today. Recorded here rather than silently
fixed because it shaped the generator's own depth and width defaults, which a reader tuning them
later should know about.
