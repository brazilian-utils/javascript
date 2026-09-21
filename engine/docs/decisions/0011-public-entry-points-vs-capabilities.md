# 0011 — A public entry point never takes capabilities; a named seam does

## Context

Capability threading (`analysis/capabilities.ts`) infers which functions reach `Http`, `Clock` or
`Random` and adds an `env` parameter to exactly those, bottom-up over the call graph. That pass
was correct on its own terms — it is what lets `core/source/get-address-info-by-cep.ts` call
`http.request(…)` without ever naming an environment — but nothing stopped its output from
reaching the printed signature of an exported utility. `getAddressInfoByCep(cep: string)` in
`core/source` generated `getAddressInfoByCep(cep: string, env: Capabilities)` in every target;
`generateCpf(): string` generated `generateCpf(env: Capabilities): string`. A project treating
`core/out/<target>` as a drop-in replacement for the package `core/source` re-implements cannot
call it the way it calls the original — every capability-taking utility needs code changed at the
call site, for a parameter the source never declared and a caller has no way to construct
correctly (get the fixture-shaped fake instead of a real environment, and every value returned is
garbage or a transport error).

Two shapes were available once the defect was named:

1. **Keep threading, but stop it from reaching a utility's own signature** — thread `env` between
   internal helpers exactly as today, and give every utility a wrapper that supplies the
   capability itself, under a name that is not the utility's own.
2. **Stop threading at the top: make every utility a "root" the capability graph cannot cross**,
   forcing each one to build its own environment inline, at the top of its own body, with no
   internal function ever receiving one as a parameter.

Shape 2 was rejected. It would still need something to build an environment from nothing before
any of the utility's own logic runs — the exact problem this decision exists to solve, just moved
one call frame earlier — and it would also have to rebuild that environment on *every call*, since
a function with no capability parameter has nowhere to receive a shared one from; the resulting
generated code would call `defaultCapabilities()` (or its `Capabilities()`/`newEnvironment()`
equivalent) once per invocation, which is both a real per-call cost (a fresh `AbortController`, a
fresh dict, in a case where nothing about the environment changed) and a availability
regression against the actual published packages: they draw randomness through a bare
`Math.random()`, no allocation and no construction step per call, so their published cost floor is
lower than any shape that reconstructs an environment on every entry.

Shape 1 was chosen.

## Decision

An exported utility whose effects reach `Http`, `Clock` or `Random` is split, after lowering, into
two Target AST functions in the same generated module (`backend/generate.ts`,
`splitCapabilityEntryPoints`, run once per target's whole output):

- **The public wrapper** keeps the utility's own name and exactly the parameters and return type
  its source declares — no capability parameter, ever. Its body is one call: the seam below, with
  the source's own arguments forwarded unchanged plus one more, a reference to a **module-level
  singleton**, built once when the module loads, never reconstructed per call. `defaultCapabilities()`
  itself (TypeScript) or `Capabilities()` (Python) is still generated, exactly as before, precisely
  so that singleton has something to be built from once; what changed is that nothing calls it more
  than that one time.
- **The seam** is the function capability threading actually produced: the original name with a
  suffix that reads as what it is in each target's own casing (`generateCpfWith` in TypeScript,
  `generate_cpf_with` in Python) — never a generic word like "impl" or "internal" that carries no
  information about which capability-taking function this is. It keeps the capability parameter,
  keeps its own module's visibility (`export`/no leading underscore) because two things outside its
  own module have to reach it — the wrapper is a code-generation detail, not the reason it stays
  visible — and is what the differential conformance driver's dispatch table names directly, so
  fake capabilities from `fixtures.json` still reach every capability-taking utility exactly the
  way they did before this split. `rust: 4256/4256` and the other three targets' conformance counts
  are unaffected by this decision for exactly that reason: the driver was never calling the public
  surface to begin with, on any target, before or after.

`API.json` reflects the split directly: `functions` lists the wrapper — the source's own signature,
with no capability parameter and no `"env"` effect — and a new top-level array, `seams`, lists the
capability-taking form by its own name, with `publicName` pointing back at the wrapper and
`hasWrapper: true`. A DX author reading `API.json` sees the utility's real signature where they
would look for it, and sees separately, not folded silently into the same list, that this
particular utility has an internal form taking capabilities, without mistaking that form itself
for a second utility.

**Go and Rust get no wrapper.** Both generate the `Capabilities` interface/trait only — no HTTP
client, no clock, no RNG, anywhere in the generated *library* (`support.go`, `support.rs`); the
fake either differential driver builds lives in the driver binary (`cmd/driver`, `src/bin/driver`),
never in the crate or package a consumer would import. There is nothing standing in for
`defaultCapabilities()` to build a singleton from, and one is not fabricated for the sake of
producing a wrapper. `splitCapabilityEntryPoints` is target-generic; whether a target gets a
wrapper is entirely decided by whether `Backend.defaultCapabilities` is present, and Go's and
Rust's backend objects simply do not define it. For these two targets, the function
`splitCapabilityEntryPoints` would otherwise have renamed is instead only *marked* (`seam: true`,
`hasWrapper: false` in `API.json`), under its own original name, still taking `Capabilities`
directly as its only form. This is reported as a finding, in `docs/semantics.md` §4.1 and in
`docs/targets/go.md` and `docs/targets/rust.md`, not hidden behind a fake that would make the
generated library depend on something the published Go and Rust ports do not (an HTTP client, a
system RNG) or behave differently from a caller's own environment in ways nothing would flag.

Why the seam is a real, separate, generated function rather than an inline "if no capability was
given, build one" branch folded into the same signature (the shape a hand-written wrapper might
take, e.g. `getAddressInfoByCep(cep, env = null)`, defaulting internally): the source language this
engine compiles admits no optional parameters and no runtime type branching on "was an argument
supplied" — see `docs/semantics.md` §7's subset rule — so a single function that behaves two ways
depending on whether a caller passed a fourth thing is not a shape any Core function can express at
all, in any target. Two functions, one calling the other, is.

## Consequences

- **Every exported utility's signature now matches its own source declaration, name for name and
  parameter for parameter**, in every target that can build a default (TypeScript, Python) and,
  trivially, in every target where no utility needs one (all four, for the six utilities with no
  effects beyond `Fail`). `getAddressInfoByCep(cep)`, `generateCpf()`, `generateCnpj()` now compile
  and run as drop-in replacements for `src/get-address-info-by-cep`, `src/generate-cpf`,
  `src/generate-cnpj` with no call-site change.
- **A module-level singleton, not a per-call construction.** `core/out/typescript/capabilities.ts`
  gains `export const DEFAULT_CAPABILITIES: Capabilities = defaultCapabilities();`;
  `core/out/python/_support.py` gains `DEFAULT_CAPABILITIES = Capabilities()` at module scope. Both
  are built once, at import time, and every wrapper generated into that target shares the one
  instance — the same pattern `core/bench/typescript.ts` and `core/bench/rust/src/main.rs` already
  used by hand ("built once, like a real caller would, then reused") before this decision made it
  the generated default's own behavior, not something only a benchmark bothered to do.
- **Go and Rust keep a permanent, structural gap from full parity** on exactly the three utilities
  whose effects reach `Http`, `Clock` or `Random` (`getAddressInfoByCep`, `generateCpf`,
  `generateCnpj`). Closing it for real — not by fabricating a fake — would mean choosing and
  vendoring an HTTP client and a randomness source into the generated library for those two targets
  specifically, which is a materially larger decision (a new dependency the published Go and Rust
  ports do not have to carry, since `net/http` and `math/rand`/`crypto/rand` are already stdlib for
  them — so the actual obstacle is a design choice to keep `core`/`coreout` dependency-free rather
  than a technical one) than this task's scope, and is named here as the next thing to decide, not
  solved by this decision.
- **`core/bench/typescript.ts` and `core/bench/python.py` call the generated `generateCpf`/
  `generateCnpj` with no arguments now**, matching the handwritten side they are timed against
  exactly; the explicit `defaultCapabilities()`/`Capabilities()` construction those two harnesses
  used to need is gone from them, because the generated wrapper does it internally. Go's and Rust's
  bench harnesses are unaffected — both already built their own fake `Capabilities` value by hand,
  because neither language's generated library could give them a real one, before or after this
  decision.
