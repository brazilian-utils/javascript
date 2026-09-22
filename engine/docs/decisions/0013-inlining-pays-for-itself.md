# 0013 — Inlining has to pay for itself, in the currency the target is judged in

## Context

`optimize/inline.ts` runs per target, with a budget each backend sets, because the cost of a call
is not the same everywhere: CPython pays a full frame, V8 usually elides the call once a site is
hot, rustc inlines across crates only under LTO. That part was already measured and is not in
question here.

What the budget did not have was a price. It said how big a callee could be — "at most N
statements" — and nothing about how many copies of it the program ended up holding. For a target
that is compiled ahead of time, that is fine. For TypeScript it is not, and
[ADR 0012](0012-generated-source-not-a-bound-binary.md) already says why: the npm package this
engine generates for is tree-shakeable, and a consumer who imports `isValidCpf` must not carry
`getHolidays`. Bytes over the wire are a result that package is judged on, not a nicety.

Measured, with a single-import entry point per utility, bundled and minified by esbuild and
gzipped — what a consumer's bundler would actually produce. The budget of the day
(`maxStatements: 6`, nothing else) against the same program with the pass disabled:

| export | inlining off | `maxStatements: 6` |
| --- | ---: | ---: |
| `generateCnpj` | 642 | 1,591 (+148%) |
| `generateCpf` | 623 | 1,343 (+116%) |
| `getHolidays` | 872 | 1,403 (+61%) |
| `isBusinessDay` | 1,065 | 1,638 (+54%) |
| `isValidCpf` | 342 | 440 (+29%) |
| every export | 3,224 | 5,644 (+75%) |

What it bought was two rows of `core/bench`, `generateCpf` and `generateCnpj`, by around a tenth
each — inside the run-to-run noise of a generator whose own retry loop is random. `generateCpf`
was 45 lines of generated TypeScript before the pass and 408 after: nine unrolled copies of a
rejection-sampling loop, one per digit. Neither the speed nor the readability was worth the bytes.

## Decision

The budget states what an inline may **add**, and the pass refuses the ones that cost more than
that:

- **`maxDuplicatedNodes`** caps, per inline, the Core nodes it adds. A target compiled ahead of
  time leaves it unset; TypeScript sets it, and what it says is "duplicate only what is small".
- Nodes, not statements, because a one-expression helper is one statement whether it reads `a + b`
  or spans half a screen.
- An inline that takes a callee's **last** call site is refunded that callee's whole definition:
  nothing reaches it any more, so `backend/lower.ts`'s `closure` drops it and the code moved
  rather than multiplied. A sole-call-site helper is therefore absorbed whatever its size, and
  `maxDuplicatedNodes: 0` means "take the inlines that pay for themselves", not "inline nothing".
- The cap is per inline rather than a pool for the whole pass, so the answer does not depend on
  which call site the walk reached first.

Two things had to change before that budget could be honest about its own price, and both are
improvements on their own:

- A callee that is a single `return <expr>` is **substituted as an expression**. Routing it through
  the general path bound each parameter to a `let`, opened a synthetic `Option`, assigned through
  it and unwrapped it — four statements and a sentinel where the source had an expression, bigger
  than the call it replaced. `digitAt(cpf, index)` now becomes `cpf.charCodeAt(index) - 48`.
- A callee whose only `return` is its last statement is spliced **without the sentinel**, and a
  parameter passed a literal or a local is **substituted rather than bound**. There is nothing for
  a flag to answer in a straight line, and `const _inl117_year = year;` is scaffolding no author
  would leave in.

`engine/scripts/size.ts` measures the result, `verify`'s `typescript size` step fails on a
regression past the budget in `core/out/typescript/SIZE.json`, and `core/bench` measures what the
inlining bought.

## Consequences

- TypeScript settled at `maxStatements: 8, rounds: 4, maxDuplicatedNodes: 6`, chosen by sweeping
  both against the measurement rather than by argument. Every export is now **smaller than with
  the pass disabled** — 3,175 bytes gzipped across all nine against 3,224 — so inlining stopped
  being a trade for this target and became a win on both axes.
- Python keeps an uncapped budget (`maxStatements: 12`), which is the same decision reached the
  other way: its cost is interpreter frames, its output is not downloaded, and a sweep of
  `maxDuplicatedNodes` at 6 and 24 made both of its generator rows slower. Go and Rust still run
  no inlining at all, because their compilers do it better.
- The generated TypeScript reads like its source again. That was not the goal, and it is the part
  worth keeping: `generateCpfWith` is nine lines, the same nine the author wrote.
