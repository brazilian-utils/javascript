# `spec/` — write a utility once, ship it in every language

Brazilian Utils publishes the same utilities in JavaScript, Python, Go, Rust and Ruby, and each
one is written by hand, in each language, again. This directory is the attempt to write each
utility **once** and have every language's implementation come out of that.

Nothing here ships in the npm package. `src/` is untouched, and the build, the bundle and the
public API are exactly what they were.

## Layout

| Path                        | What it holds                                                                   |
| --------------------------- | ------------------------------------------------------------------------------- |
| `bridge/`                   | The engine: a portable TypeScript subset in, native code for seven targets out  |
| `BINDINGS-INVESTIGATION.md` | The other route — one binary core plus bindings — measured, and where each wins |

Start with [`bridge/README.md`](bridge/README.md): it is the manual for the engine, the subset it
accepts and what it refuses. [`BINDINGS-INVESTIGATION.md`](BINDINGS-INVESTIGATION.md) is the
research that decided the shape of it, including the benchmark numbers that say a binding is
cheap in C#, Python, Ruby and Java, and that JavaScript cannot take one at all.

## Running it

```bash
node spec/bridge/compiler/cli.ts          # compile source/ into every target
node spec/bridge/compiler/cli.ts rust     # ...or just one

bash spec/bridge/conformance/run-all.sh   # every target replays what the npm package answers
```
