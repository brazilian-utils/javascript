# `spec/` — the language neutral specification

A prototype of describing a utility once, as data, and emitting it to every language Brazilian
Utils publishes. Read [EXPLORATION.md](EXPLORATION.md) first: it explains why this exists, what it
proves, what it does not, and what to do next. Then
[BINDINGS-INVESTIGATION.md](BINDINGS-INVESTIGATION.md), which measures this approach against the
alternative — one binary core plus bindings — in five languages, and says why generated source
wins.

Nothing here ships in the npm package. `src/` is untouched, and the build, the bundle and the
public API are exactly what they were.

## Layout

| Path                         | What it holds                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `utilities/*.json`           | One file per utility: its profiles, the pipeline of each, and the name every language gives it |
| `utilities.json`             | The utilities the specification covers, in emission order                                      |
| `schema/charsets.json`       | Character sets as explicit code points — never a regex shorthand                               |
| `schema/check-digits.json`   | Check digit algorithms as weights, modulus and clamp                                           |
| `schema/utility.schema.json` | JSON Schema of a utility file                                                                  |
| `codegen/interpret.ts`       | The reference interpreter: the normative implementation                                        |
| `codegen/corpus.ts`          | The seeded input corpus                                                                        |
| `codegen/vectors.ts`         | Writes `vectors/conformance.json` from the interpreter                                         |
| `codegen/targets/*.ts`       | One emitter per language                                                                       |
| `vectors/conformance.json`   | The committed vectors: every input, every profile, every option set                            |
| `conformance/`               | The runners that check the generated code, this package, and the published ones                |
| `generated/`                 | Emitter output. Not committed; `node spec/codegen/emit.ts` rebuilds it                         |

## Running it

```bash
node spec/codegen/vectors.ts        # rebuild the vectors from the interpreter
node spec/codegen/emit.ts           # emit every target into spec/generated
node spec/codegen/emit.ts rust      # ...or just one

bash spec/conformance/run-all.sh    # emit, then run all six conformance drivers
node spec/conformance/differential-javascript.ts   # spec vs. the package this repo ships
```

`run-all.sh` needs `node`, `python3`, `ruby`, `go`, `rustc` and `javac` on the PATH; each driver is
standalone and needs no package manager.

To compare the specification against the other packages, check them out as siblings and point the
upstream runner at them:

```bash
node spec/conformance/upstream.ts --python ../python --ruby ../ruby --go ../go --rust ../rust
```

It prints, per package and per utility, how many of the corpus inputs agree with the profile that
package declares, and the first few that do not. `0 disagreement(s)` means the specification
describes every shipped contract exactly.

## Adding a utility

1. Write `utilities/<id>.json`. Give it one profile per behaviour that exists in the wild, and an
   `adopted` entry per language saying which one that package implements **today** — not the one
   you wish it implemented. Add it to `utilities.json`.
2. Run `node spec/conformance/upstream.ts ...` against the other checkouts. If a package
   disagrees with the profile you gave it, the profile is wrong, or you found a bug: record it
   under `knownDeviations` with a reason, and open an issue there.
3. Run `node spec/codegen/vectors.ts` to refresh the vectors, then `bash
spec/conformance/run-all.sh`.
4. For a utility this repository already ships, extend `conformance/differential-javascript.ts` so
   the specification is checked against the handwritten implementation over the whole corpus,
   hostile inputs included.

If a utility needs a step the IR does not have, add the step to `schema/utility.schema.json`, to
`Step` in `codegen/ir.ts`, to the interpreter, and to the six emitters — in that order. That cost
is the honest price of a new kind of behaviour, and it is why the IR should stay small.

## Benchmarking a target

`bash spec/bench/run-all.sh` builds every artifact and prints one JSON line per measurement into
`spec/bench/results.jsonl`; `python3 spec/bench/table.py` folds that into the table in the
investigation. A new or changed emitter is not done until its output has been measured against
idiomatic handwritten code for that language: emitting a per code point loop into a language whose
regex engine is written in C costs 2–4×, which is how the Python and Ruby emitters were found to
be slow and then fixed.

## Adding a language

Write `codegen/targets/<language>.ts` (350–430 lines, modelled on any existing one), register it in
`codegen/targets/registry.ts`, add a driver in `codegen/conformance.ts`, and add the language's
`names` and `adopted` entries to each utility file. The Java target exists precisely as the worked
example of a language with no package yet.
