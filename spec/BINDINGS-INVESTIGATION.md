# One core, every language: bindings or generated source?

The follow up question to [EXPLORATION.md](EXPLORATION.md): instead of generating **source** for
each language, could Brazilian Utils build the logic once — in Rust, in C, in WebAssembly — and
give every package a **binding** to it? Is there an off the shelf tool for that? And what does it
cost at run time?

What is being shared either way is the **utility's implementation**, not the published package.
Every ecosystem keeps writing its own DX by hand: its naming, its option objects, its types, its
docs. That matters for the answer, because a hand-written binding is then no more hand-written
code than the wrapper it sits behind.

> **Revised.** The first version of this document concluded that generated source beat every
> binding. It had only measured the bindings a script reaches for — `ctypes`, Fiddle, a wasm
> runtime — and not the ones a package ships. A CPython extension is 16× cheaper than `ctypes`
> and P/Invoke costs about a nanosecond, which changes the answer for four of the seven
> ecosystems. [§2](#2-the-boundary-costs-more-than-the-work--but-only-over-the-wrong-boundary)
> has the corrected numbers and what they turn on.

Everything below was measured on this branch. Reproduce with:

```bash
bash spec/bench/run-all.sh            # every arm, every language
bash spec/bench/run-native.sh         # the bindings each ecosystem actually ships
bash spec/conformance/run-all.sh      # every arm still answers identically
```

---

## The answer

**It depends on the ecosystem, and the deciding factor is not speed.**

The first pass of this document concluded that generated source beat every binding. That
conclusion was drawn from the wrong measurements: it compared generated source against the
bindings a _script_ reaches for — `ctypes`, Fiddle, a wasm runtime — and never against the
bindings a _package_ ships. Those are not the same thing, and they are not close: a CPython
extension module costs 27 ns per call where `ctypes` costs 433 ns, and P/Invoke with the GC
transition suppressed costs about 1 ns.

Measured properly, with the core called the way each ecosystem actually calls native code:

| Ecosystem  | Best per call               | Against its own generated source | Boundary cost |
| ---------- | --------------------------- | -------------------------------- | ------------- |
| **C#**     | **76 ns** P/Invoke          | 4.3× faster than handwritten     | **~1 ns**     |
| **Python** | **65 ns** CPython extension | **21× faster**                   | 27 ns         |
| **Ruby**   | **109 ns** C extension      | **18× faster**                   | 65 ns         |
| **Java**   | **127 ns** Panama FFM       | 3.9× faster                      | 62 ns         |
| **Go**     | 119 ns cgo                  | 1.6× faster                      | 58 ns         |
| **Node**   | 257 ns generated source     | binding not available            | —             |
| **Rust**   | 47 ns                       | it _is_ the core                 | 0             |

So a C ABI really is close to free in C#, cheap in Python, and about 60 ns everywhere else —
against a validator body of 47 ns. That is the correction.

What it does **not** change is the recommendation for the npm package, and that turns out to
decide the shape of the whole thing:

- **JavaScript cannot take a binary core**, because the package is tree shakeable and a wasm
  module is not. One utility as generated source is 509 bytes and disappears when unused; the
  wasm core is 9,291 bytes, indivisible, and asynchronous to start. This is not a preference,
  it is a requirement, so JavaScript gets generated source whatever the other ecosystems do.
- **Go pays for cgo in something other than nanoseconds.** It loses cross compilation, static
  binaries and `CGO_ENABLED=0` builds, for a 74 ns gain. Not worth it.
- **Everywhere else the binding is the better answer**, and the ship cost — a native artifact
  per platform × arch — is a cost those ecosystems already pay routinely.

Which points at a hybrid rather than a winner, and a smaller tool than either option alone:
write the utility once, emit **TypeScript** for npm and **Rust** for the shared core, and let
Python, Ruby, C#, Java and Erlang bind to the compiled core with a hand-written binding. Go
takes generated source. The full recommendation is [at the end](#recommendation).

## How it was measured

One function — `isValidCpf` under the `masked-strict` profile — over a fixed corpus of 1000
inputs (`spec/bench/corpus.json`): valid CPFs bare and masked, near misses with one digit flipped,
junk, Unicode whitespace, NBSP, ZWNBSP, an emoji, and CPFs written in full width and Arabic-Indic
digits. Each arm reports the best nanoseconds per call over 7 repetitions after warmup, plus how
many inputs it called valid — an arm cannot win by doing less work.

Every arm computes the same thing, and the source level arms are generated from the **same
profile** (`spec/bench/prepare.ts` overrides each package's adopted profile for the run), so the
comparison is not measuring one package's laxer contract against another's.

Machine: Intel Xeon @ 2.80GHz, 4 vCPU, Linux. Node 22.22.2, Python 3.11.15, Ruby 3.3.6, Go 1.24.7,
rustc 1.94.1, OpenJDK 21.0.10, wasmtime-py 48.0.0, wasmtime gem 48.0.1, wazero 1.9.0, UniFFI 0.29.

### Arms

| Arm             | What it is                                                                |
| --------------- | ------------------------------------------------------------------------- |
| `handwritten`   | Idiomatic code a contributor would write in that language, regex and all  |
| `generated`     | The emitter's output for the same spec                                    |
| `wasm`          | The Rust core compiled to `wasm32-unknown-unknown`, one call per input    |
| `wasm-batch`    | Same core, the whole corpus in one call                                   |
| `wasm-callonly` | The boundary alone: same pointer, same length, no marshalling             |
| `ffi` / `cgo`   | The same core as a `cdylib`, over ctypes / Fiddle / cgo                   |
| `uniffi`        | The same logic behind UniFFI generated Python bindings                    |
| `cext`          | The same core as a CPython extension module / a Ruby C extension          |
| `ffm`           | The same core over Java's Foreign Function & Memory API, trivial downcall |
| `ffi` (C#)      | The same core over P/Invoke with `[SuppressGCTransition]`                 |
| `core-direct`   | The same core called from C: the floor, the work with no boundary at all  |

---

## Results

Lower is better. `× hand` is the ratio to that language's handwritten arm, so **below 1.00 is
faster than handwritten**.

| Language | Arm                |      ns/op |   × hand |   valid |
| -------- | ------------------ | ---------: | -------: | ------: |
| C        | **core-direct**    |   **47.0** |        — |     337 |
| Node     | handwritten        |      386.2 |     1.00 |     337 |
| Node     | **generated**      |  **256.5** | **0.66** |     337 |
| Node     | wasm               |      224.6 |     0.58 |     337 |
| Node     | wasm-batch         |      240.5 |     0.62 |     337 |
| Python   | handwritten        |     2460.6 |     1.00 | **333** |
| Python   | **generated**      | **1366.0** | **0.56** |     337 |
| Python   | wasm               |    38039.3 |    15.46 |     337 |
| Python   | wasm-callonly      |    30058.9 |    12.22 |       — |
| Python   | wasm-batch         |      306.3 |     0.12 |     337 |
| Python   | ffi (ctypes)       |      535.3 |     0.22 |     337 |
| Python   | ffi-batch          |      239.9 |     0.10 |     337 |
| Python   | **uniffi**         | **9064.2** | **3.68** |     337 |
| Python   | uniffi-batch       |     6195.8 |     2.52 |     337 |
| Python   | **cext**           |   **65.4** | **0.03** |     337 |
| Python   | cext-batch         |      235.9 |     0.10 |     337 |
| Ruby     | handwritten        |     3675.8 |     1.00 | **329** |
| Ruby     | **generated**      | **2020.1** | **0.55** |     337 |
| Ruby     | wasm               |      729.9 |     0.20 |     337 |
| Ruby     | wasm-batch         |      430.0 |     0.12 |     337 |
| Ruby     | ffi (Fiddle)       |     1662.1 |     0.45 |     337 |
| Ruby     | **cext**           |  **109.3** | **0.03** |     337 |
| Go       | handwritten        |      446.2 |     1.00 | **334** |
| Go       | **generated**      |  **193.1** | **0.43** |     337 |
| Go       | wasm (wazero)      |      189.1 |     0.42 |     337 |
| Go       | wasm-batch         |      104.5 |     0.23 |     337 |
| Go       | cgo                |      119.1 |     0.27 |     337 |
| Go       | cgo-batch          |       52.6 |     0.12 |     337 |
| Java     | handwritten        |     1365.3 |     1.00 |     337 |
| Java     | **generated**      |  **493.6** | **0.36** |     337 |
| Java     | **ffm (Panama)**   |  **127.3** | **0.09** |     337 |
| C#       | handwritten        |      330.2 |     1.00 |     337 |
| C#       | **ffi (P/Invoke)** |   **76.4** | **0.23** |     337 |

---

## Seven findings

### 1. Generated source is faster than handwritten, in every language measured

0.36× in Java, 0.43× in Go, 0.56× in Python, 0.55× in Ruby, 0.66× in Node. Not because the generator is
clever, but because a human writing these by hand reaches for the regex engine (`\d{3}[\s.-]*...`)
while the emitter knows the exact character sets and can pick whichever construct is cheapest in
that language.

This did **not** hold on the first measurement. The emitters used to walk the string code point by
code point in every language, which is right for Go and Java and terrible for Python and Ruby
(6.5 µs and 15.1 µs per call — 2.6× and 4.1× _slower_ than handwritten). Two rules fixed it, and
both are in this branch:

- **Collapse `guard-shape` + `sanitize` into one anchored regex with capture groups.** The
  character classes are written out code point by code point (`[\u0009\u000a…\u2000-\u200a…]`), so
  the semantics stay exactly the spec's — `\s` would not — while the matching happens in C. The
  digits come out of the capture groups, so there is no second pass over the string and no
  intermediate allocation.
- **Read digits as bytes in the check digit loop** (`ord(char) - 48`, `getbyte(i) - 48`) instead of
  `int(char)` / `to_i`, and unroll the verification instead of iterating positions with a closure.

Python went 6485 → 1366 ns/op; Ruby 15051 → 2020. Conformance stayed at 2229/2229 for both.

**This is the load bearing result for the whole idea**: the emitter is allowed to know things
about its target language, and the moment it does, generated code stops being a compromise.

### 2. The boundary costs more than the work — but only over the wrong boundary

The validator body is 47 ns, measured by calling the same shared library from C
(`core-direct`). Against that, here is every boundary measured, isolated: the same pointer and
length every call, no marshalling, minus the 40 ns the same fixed input costs in C.

| Host          | Mechanism                          | Boundary cost per call |
| ------------- | ---------------------------------- | ---------------------- |
| C# → C        | P/Invoke, `[SuppressGCTransition]` | **~1 ns**              |
| Python → C    | CPython extension module           | **27 ns**              |
| Go → C        | cgo                                | 58 ns                  |
| Java → C      | Panama FFM, trivial downcall       | 62 ns                  |
| Ruby → C      | C extension                        | 65 ns                  |
| Go → wasm     | wazero                             | 64 ns                  |
| Python → C    | ctypes                             | 433 ns                 |
| Ruby → wasm   | wasmtime gem                       | 482 ns                 |
| Ruby → C      | Fiddle                             | 1,479 ns               |
| Python → wasm | wasmtime-py 48                     | **30,019 ns**          |

The top half and the bottom half are the same idea over different plumbing, and they differ by
three orders of magnitude. The first pass of this document measured only the bottom half and
drew a general conclusion from it; that was wrong.

Three details decide which half a binding lands in, and all three are easy to get wrong:

- **C#** needs `[SuppressGCTransition]`. Without it the call still costs only 42 ns rather than
  41, because .NET's transition is already cheap — this is the one runtime where the naive
  version is fine.
- **Java** needs the `MethodHandle` to be `static final` and the off-heap buffer to come from
  `Arena.global()`. With a shared arena and an instance handle the same call costs 84 ns more,
  because the JIT cannot fold the downcall stub and pays a liveness check per call.
  `Linker.Option.isTrivial()` itself is worth about 1 ns here.
- **Python and Ruby** need a real extension module. `ctypes` is 16× more expensive than a
  CPython extension; Fiddle is 23× more expensive than a Ruby C extension.

The corollary about batching still holds, and is now less interesting: amortising one crossing
over 1000 inputs helps the expensive boundaries and _hurts_ the cheap ones. Python's C
extension is 65 ns per call and 236 ns per call in batch, because packing the buffer in Python
costs more than the calls it saves.

### 3. Binding quality varies by 300× between runtimes of the same technology

Same `.wasm` file, same core, same machine:

- wazero (pure Go): **104 ns** per call
- wasmtime gem (Rust native extension): **521 ns**
- wasmtime-py 48 (ctypes over the C API): **30 059 ns**

wasmtime-py is not slow at running wasm; it is slow at _being called_, because every invocation
builds `Val` arrays through ctypes. Poking the linear memory through its raw pointer instead of
`Memory.write` only takes it from 38.0 µs to 32.4 µs — the cost is the call, not the copy.

So "we ship a wasm core" is not one decision with one performance profile. It is a different
decision per package, and in Python today it means "and also batch everything".

### 4. The off the shelf tool is slower than writing Python

UniFFI is the tool everyone recommends for this (Mozilla ships Firefox features with it). Its
generated Python bindings cost **9064 ns per call — 3.7× slower than just implementing the
validator in Python**, and 17× slower than the same `.so` called through hand written ctypes.

The generated call path explains it: `check_lower` validates the string, `lower` allocates a
`RustBuffer` and copies into it, a `_UniffiRustCallStatus` struct is built, the call goes through
ctypes, the status is checked, the result is lifted. Six Python level operations wrapped around
100 ns of work. Even `uniffi-batch` (a `Vec<String>` in, a `Vec<bool>` out) lands at 6196 ns/op,
still slower than plain Python, because the sequence has to be serialised into a `RustBuffer`.

UniFFI is built for coarse grained APIs — "sync this database", "decrypt this blob" — where a
microsecond of glue is irrelevant. Brazilian Utils is the opposite: a hundred tiny pure functions.

### 5. The JS package would pay the most and gain the least, which settles it

|                                              | Generated source            | Wasm core                                                               |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `isValidCpf` single import bundle, minified  | **509 bytes**               | 9291 bytes (4344 gzipped) for the core with **one** utility             |
| Tree shaking                                 | per function, as today      | none: the module is one indivisible blob                                |
| Bundling, Deno, Bun, browsers, edge runtimes | works everywhere, no config | needs a loader, async instantiation, and a bundler that handles `.wasm` |
| `sideEffects: false` and zero dependencies   | preserved                   | gone                                                                    |

An 18× size increase for one function, no tree shaking, and asynchronous initialisation, in
exchange for 160 ns. The npm package's selling points are exactly what a wasm core takes away.

Cold start, for the record: instantiating the 9 KB module costs 0.025 ms in Node, 3.5 ms in
Python, 3.8 ms in Ruby — fine for a server, not free for a CLI or a lambda.

### 6. A binding is cheap; a binary is not

Every number above is per call. The cost that decides the question is per release.

Generated source ships as source: it is reviewed in the package's own repository, `git diff`
shows what changed, a stack trace points at a line, and there is no build matrix at all. A
shared core ships as an artifact per platform × arch per ecosystem, and needs a release
pipeline that produces them, a fallback for platforms nobody built, and an ABI that the
package and the artifact both agree on.

Two ecosystems make that trade badly:

- **JavaScript**, because of §5: no tree shaking, 18× the bytes, asynchronous startup.
- **Go**, because cgo costs cross compilation, static binaries and `CGO_ENABLED=0` builds — the
  things a Go library is expected to keep — and buys 74 ns against the generated code.

Four make it well, because they already ship native extensions as a matter of course: Python,
Ruby, C# and Java. There the speedup is 3.9× to 21×, and the pipeline is one their maintainers
have built before.

### 7. Every handwritten port is already subtly wrong

Look at the `valid` column. Over the same 1000 inputs, the handwritten arms disagree with the
spec: Python 333, Ruby 329, Go 334, against 337 for everything generated.

These are not bugs I planted. I wrote each handwritten arm the way the language invites:
`cpf.strip()` in Python strips a different set from JavaScript's `trim()`; Ruby's `String#strip`
handles only ASCII whitespace plus NUL; Go's `strings.TrimSpace` is Unicode space separators, which
excludes `U+FEFF`. Three languages, three different answers, for a CPF a user pasted with an
invisible character in front of it.

The generated arms all answer 337 because the character set came from the spec, not from the
standard library's idea of whitespace. **The reason to generate is correctness; the performance is
what makes it affordable.**

---

## The tools, surveyed

| Tool                                                                             | What it does                                | Languages                                                                | Why it does or does not fit                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [UniFFI](https://github.com/mozilla/uniffi-rs)                                   | Rust → bindings, from proc macros           | Kotlin, Swift, Python, Ruby; C#/Go third party                           | **Measured: 3.6× slower than plain Python.** No JS, no Erlang. Built for coarse APIs                                                                                                            |
| [Diplomat](https://github.com/rust-diplomat/diplomat)                            | Rust → FFI, one bridge, many backends       | C, C++, JS/TS, Dart, Kotlin, Python                                      | Closest fit technically (ICU4X ships JS via wasm with it), still a binary core with the costs in §5; no Go, Ruby or Erlang                                                                      |
| [wit-bindgen](https://github.com/bytecodealliance/wit-bindgen) + Component Model | An IDL, guests and hosts generated          | Growing; `jco` transpiles components to JS                               | The most future proof binary story. Still a binary, and the JS output is a wasm blob, not tree shakeable source                                                                                 |
| [Extism](https://extism.org)                                                     | Wasm plugin framework, host SDKs everywhere | JS, Go, Ruby, Python, C#, Java, **Erlang/Elixir**, PHP, OCaml, Zig…      | Broadest host coverage by far. Adds a plugin protocol on top of the per call cost in §2–3                                                                                                       |
| [wasm2c](https://github.com/WebAssembly/wabt/tree/main/wasm2c)                   | Wasm → C, compiled natively, no runtime     | any language with a C FFI                                                | Removes the _runtime_ dependency, keeps the _binary_ one. Interesting for Erlang NIFs                                                                                                           |
| [wasmex](https://github.com/tessi/wasmex)                                        | Wasmtime as an Erlang/Elixir NIF            | Erlang, Elixir                                                           | The only realistic wasm route for the BEAM                                                                                                                                                      |
| [Kaitai Struct](https://kaitai.io)                                               | Declarative spec → parsers in 11 languages  | C++, C#, Go, Java, JS, Lua, Nim, Perl, PHP, Python, Ruby                 | **The precedent for the approach in this repository.** Binary formats only, so not reusable directly, but it proves a spec-to-source compiler scales to a dozen targets                         |
| [Haxe](https://haxe.org) / [Fable](https://fable.io)                             | One source language → many targets          | JS, Python, C#, Java, PHP, Lua, C++ / JS, TS, Python, Rust, Dart, Erlang | Both emit code that depends on their own runtime library, and neither produces something a Go or Ruby maintainer would review. Fable is worth a footnote because the .NET package is already F# |
| SWIG                                                                             | C/C++ → bindings                            | many                                                                     | Same binary tradeoffs, older ergonomics                                                                                                                                                         |

**Nothing off the shelf does what this project needs**, because the need is unusual: ~100 tiny pure
functions, six ecosystems that each demand idiomatic naming, zero runtime dependencies, and a
flagship package that must stay tree shakeable. Every binding generator optimises for the opposite
shape. The closest thing to prior art is Kaitai Struct, and its model — a declarative spec plus one
compiler backend per language — is exactly what `spec/codegen` already is, at 350–430 lines per
target.

---

## Recommendation

The unit being shared is the **utility's implementation**, not the published package: every
ecosystem writes its own DX by hand — its naming, its option objects, its types, its docs —
over whichever core it gets. That is what makes a hand-written binding acceptable, and it is
why the answer can differ per ecosystem without the library becoming incoherent.

1. **Write the utility once**, in the portable TypeScript subset
   ([`spec/bridge`](bridge/README.md)). One implementation, one review, one set of conformance
   vectors.
2. **Emit TypeScript for npm.** Not negotiable: the package is tree shakeable and a binary core
   is not. 509 bytes per utility that disappear when unused, against 9,291 indivisible bytes.
3. **Emit Rust for the shared core**, compiled to a C ABI. This is the piece that does not
   exist yet: the Rust emitter produces a library crate, and a `cdylib` with
   `#[no_mangle] extern "C"` wrappers is a small addition to it.
4. **Bind to that core from Python, Ruby, C#, Java and Erlang.** 21×, 18×, 4.3×, 3.9× and
   unmeasured respectively, over a boundary of 1–65 ns. Each binding is hand-written, small,
   and lives with the DX layer it serves — the same place those packages already keep their
   hand-written code.
5. **Give Go generated source.** cgo's cost is not its 58 ns. It is cross compilation, static
   binaries and `CGO_ENABLED=0`, all of which a Go library is expected to keep, traded for
   74 ns against the generated code. The wrong trade.
6. **Keep the other emitters.** They are written and they pass conformance, so they stay as the
   escape hatch for any ecosystem that would rather not ship a native artifact — and as the
   reference the bindings are checked against.

The two halves stay honest about each other the same way they do now: every target, generated
or bound, replays the same vectors recorded from the package this repository ships.

### What the binding route costs to ship

Worth pricing before agreeing to it, because this is where generated source is free and a
native core is not.

| Ecosystem | Artifact                                    | Notes                                                              |
| --------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Python    | wheels per platform × arch, `abi3`          | cibuildwheel; ~10 wheels; an sdist fallback needs a compiler       |
| Ruby      | native gem per platform, or source gem      | rake-compiler-dock; a source gem compiling on install is normal    |
| C#        | NuGet with `runtimes/{rid}/native/`         | well-trodden; `SuppressGCTransition` needs .NET 5+                 |
| Java      | JAR with the library per os-arch, extracted | **needs JDK 22+** for FFM without `--enable-preview`; JNI below it |
| Erlang    | a NIF, built on install                     | unmeasured here; the same C boundary                               |

None of that is exotic — every one of those ecosystems ships native extensions routinely — but
it is a release pipeline per package, and it is the reason step 6 exists.

## What would change the answer

- A utility whose work is genuinely heavy (a full NF-e XML parse, a large dataset search). Then the
  boundary stops dominating.
- A host runtime fixing its call overhead — a wasmtime-py that costs 500 ns instead of 30 000 ns
  would make the wasm core competitive per call in Python.
- Go removing the cost of cgo, or the library deciding it does not care about `CGO_ENABLED=0`.
  The nanoseconds already favour the binding there; nothing else does.
- The Component Model reaching the point where `jco` emits tree shakeable JS. Today it does not.

## Reproducing

```bash
cargo build --release --manifest-path spec/bench/core/Cargo.toml
cargo build --release --target wasm32-unknown-unknown --manifest-path spec/bench/core/Cargo.toml
bash spec/bench/run-all.sh > spec/bench/results.jsonl

# the UniFFI arm, which needs its own build
cargo build --release --manifest-path spec/bench/uniffi/Cargo.toml
cd spec/bench/uniffi && ./target/release/uniffi-bindgen generate \
  --library target/release/libbrutils_uniffi.so --language python --out-dir ../.build/uniffi-python
cp target/release/libbrutils_uniffi.so ../.build/uniffi-python/
python3 ../harness/uniffi_bench.py
```

The native binding arms are a separate script, because they need each ecosystem's build
toolchain rather than its wasm runtime:

```bash
bash spec/bench/run-native.sh >> spec/bench/results.jsonl
```

Requires `node`, `python3` (with `wasmtime` and its development headers), `ruby` (with the
`wasmtime` gem and its development headers), `go`, `cargo` with the `wasm32-unknown-unknown`
target, `javac` (21+), `dotnet` (8+) and a C compiler.
