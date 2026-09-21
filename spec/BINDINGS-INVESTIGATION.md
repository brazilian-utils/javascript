# One core, every language: bindings or generated source?

The follow up question to [EXPLORATION.md](EXPLORATION.md): instead of generating **source** for
each language, could Brazilian Utils build the logic once — in Rust, in C, in WebAssembly — and
give every package a **binding** to it? Is there an off the shelf tool for that? And what does it
cost at run time?

Everything below was measured on this branch. Reproduce with:

```bash
bash spec/bench/run-all.sh            # every arm, every language
bash spec/conformance/run-all.sh      # every arm still answers identically
```

---

## The answer

**Generated source wins, and it is not close.** The approach from the previous exploration —
a language neutral spec compiled to idiomatic source per language — beats every binding strategy
once distribution is taken into account, and after two emitter fixes it is also _faster than the
handwritten code it replaces_ in all five languages measured.

A shared binary core is not useless, but it is a second, optional layer: worth it only for a host
that validates in bulk, never for the npm package, and never as the only implementation.

| Strategy                                 | Run time                                             | Ship cost                                                | Verdict                 |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| **Generated native source**              | 0.36×–0.66× of handwritten (i.e. faster)             | none: it is just source                                  | **default**             |
| Shared core + wasm                       | 0.12×–15.5× depending entirely on the host's runtime | one 9 KB artifact, plus a runtime dependency per package | optional, batch only    |
| Shared core + C ABI (FFI/cgo)            | 0.10×–0.45×                                          | a native build per platform × arch, per ecosystem        | last resort             |
| Off the shelf binding generator (UniFFI) | **3.7× slower than plain Python**                    | as above                                                 | rejected on the numbers |

---

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

| Arm             | What it is                                                               |
| --------------- | ------------------------------------------------------------------------ |
| `handwritten`   | Idiomatic code a contributor would write in that language, regex and all |
| `generated`     | The emitter's output for the same spec                                   |
| `wasm`          | The Rust core compiled to `wasm32-unknown-unknown`, one call per input   |
| `wasm-batch`    | Same core, the whole corpus in one call                                  |
| `wasm-callonly` | The boundary alone: same pointer, same length, no marshalling            |
| `ffi` / `cgo`   | The same core as a `cdylib`, over ctypes / Fiddle / cgo                  |
| `uniffi`        | The same logic behind UniFFI generated Python bindings                   |

---

## Results

Lower is better. `× hand` is the ratio to that language's handwritten arm, so **below 1.00 is
faster than handwritten**.

| Language | Arm           |      ns/op |   × hand |   valid |
| -------- | ------------- | ---------: | -------: | ------: |
| Node     | handwritten   |      386.2 |     1.00 |     337 |
| Node     | **generated** |  **256.5** | **0.66** |     337 |
| Node     | wasm          |      224.6 |     0.58 |     337 |
| Node     | wasm-batch    |      240.5 |     0.62 |     337 |
| Python   | handwritten   |     2460.6 |     1.00 | **333** |
| Python   | **generated** | **1366.0** | **0.56** |     337 |
| Python   | wasm          |    38039.3 |    15.46 |     337 |
| Python   | wasm-callonly |    30058.9 |    12.22 |       — |
| Python   | wasm-batch    |      306.3 |     0.12 |     337 |
| Python   | ffi (ctypes)  |      535.3 |     0.22 |     337 |
| Python   | ffi-batch     |      239.9 |     0.10 |     337 |
| Python   | **uniffi**    | **9064.2** | **3.68** |     337 |
| Python   | uniffi-batch  |     6195.8 |     2.52 |     337 |
| Ruby     | handwritten   |     3675.8 |     1.00 | **329** |
| Ruby     | **generated** | **2020.1** | **0.55** |     337 |
| Ruby     | wasm          |      729.9 |     0.20 |     337 |
| Ruby     | wasm-batch    |      430.0 |     0.12 |     337 |
| Ruby     | ffi (Fiddle)  |     1662.1 |     0.45 |     337 |
| Go       | handwritten   |      446.2 |     1.00 | **334** |
| Go       | **generated** |  **193.1** | **0.43** |     337 |
| Go       | wasm (wazero) |      189.1 |     0.42 |     337 |
| Go       | wasm-batch    |      104.5 |     0.23 |     337 |
| Go       | cgo           |      119.1 |     0.27 |     337 |
| Go       | cgo-batch     |       52.6 |     0.12 |     337 |
| Java     | handwritten   |     1365.3 |     1.00 |     337 |
| Java     | **generated** |  **493.6** | **0.36** |     337 |

---

## Six findings

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

### 2. The boundary costs more than the work

The validator itself takes ~100 ns. Look at the `callonly` arms — the same pointer and length every
time, no marshalling, no string conversion, pure boundary:

| Host                        | Boundary cost per call |
| --------------------------- | ---------------------- |
| Go → wasm (wazero)          | 104 ns                 |
| Go → C (cgo)                | 98 ns                  |
| Ruby → wasm (wasmtime gem)  | 521 ns                 |
| Ruby → C (Fiddle)           | 1518 ns                |
| Python → C (ctypes)         | 472 ns                 |
| Python → wasm (wasmtime-py) | **30059 ns**           |

For a function whose body is 100 ns, a boundary of 500–1500 ns means the binding _is_ the cost.
That is why `ffi` in Python (535 ns) is almost exactly `ffi-callonly` (472 ns): the validation is
noise next to the call.

The corollary is the `batch` arms: amortise one boundary crossing over 1000 inputs and everything
becomes fast (Python 240 ns/op over ctypes, 306 ns/op over wasm). A shared core is a **bulk
validation** tool, not a per call one.

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

### 5. The JS package would pay the most and gain the least

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

### 6. Every handwritten port is already subtly wrong

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

1. **Generated source is the default.** It has no runtime dependency, no build matrix, no cold
   start, no bundle penalty, it is reviewable by each package's maintainers, and it is now measured
   faster than the handwritten code in Node, Python, Ruby, Go and Java (0.36×–0.66×).
2. **Keep the two emitter rules from §1 as a requirement of every new target.** A target is not
   done until its output is benchmarked against idiomatic handwritten code for that language. The
   harness in `spec/bench` is the acceptance test.
3. **Do not put a binary core in the npm package.** §5 is disqualifying on its own.
4. **A shared wasm core stays an option for one specific case**: a host validating in bulk — a
   batch importer, an ETL job, a CEP sweep. `wasm-batch` runs at 0.12× of handwritten in Python and
   Ruby. If that demand ever appears, it should be a separate, optional package
   (`brazilian-utils-turbo`), never the only implementation, and it should reuse the same spec so
   the two cannot drift.
5. **Revisit only if the workload changes.** Bindings win when the work per call grows past a few
   microseconds. Nothing in this library is close: the heaviest validator here is ~100 ns.

## What would change the answer

- A utility whose work is genuinely heavy (a full NF-e XML parse, a large dataset search). Then the
  boundary stops dominating.
- A host runtime fixing its call overhead — a wasmtime-py that costs 500 ns instead of 30 000 ns
  would make the wasm core competitive per call in Python.
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

Requires `node`, `python3` (with `wasmtime`), `ruby` (with the `wasmtime` gem), `go`, `cargo` with
the `wasm32-unknown-unknown` target, and `javac`.
