# Engine documentation

- [semantics.md](semantics.md) — the specification: types, refinements, effects, the subset, and
  every rule that exists because two languages disagree.
- [intrinsics.md](intrinsics.md) — generated from the registry: every operation the Core can
  express.
- [adding-a-utility.md](adding-a-utility.md) — the workflow, including the habits that make the
  checker's job possible.
- [adding-a-target.md](adding-a-target.md) — what a backend is made of.
- [fuzzing.md](fuzzing.md) — the random program generator: what it generates, the two comparisons
  it runs, and the seed-and-shrink story.
- [targets/](targets) — representation and notable lowerings per target, plus the Rust sketch.
- [decisions/](decisions) — the architectural decisions and the evidence behind them.
- [progress.md](progress.md) — milestone status and the measured metrics.
