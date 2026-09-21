# The bridge: write a utility once, ship it in seven languages

`spec/bridge` is a compiler. You write a utility once, in ordinary TypeScript, under
[`source/`](source). It emits idiomatic native code for **TypeScript, Python, Go, Rust, Ruby,
Java and C#**, and a C ABI on top of the Rust crate — no bindings, no embedded VM, no FFI, and
nothing hand-written per language.

```
source/is-valid-cnpj.ts ─┐
source/format-cnpj.ts   ─┼─> compiler/frontend.ts ─> IR ─┬─> out/typescript
source/…                ─┘        (oxc parser)           ├─> out/python
                                                         ├─> out/go
                                                         ├─> out/rust  (+ the C ABI)
                                                         ├─> out/ruby
                                                         ├─> out/java
                                                         └─> out/csharp
```

What is shared is the **utility's implementation**, not the published package. Every ecosystem
keeps writing its own DX by hand — its naming, its option objects, its types, its docs — over
whichever core it gets. That is why each source file holds exactly one utility and each target
emits exactly one self-contained unit: the JavaScript output has to stay tree shakeable, and a
C symbol table has to stay flat.

## One utility, one file

`src/` in this repository is one directory per utility, with everything two of them share
under `_internals/`. `source/` is laid out the same way, and
[`compiler/link.ts`](compiler/link.ts) is what makes that work across seven languages at once:

- **`inline`** splices the helpers a module imports into the module, so the compiler sees one
  file and every target emits one unit that references nothing else.
- **`prune`** then drops whatever that splicing brought in and the module does not reach. A
  utility importing one helper out of a file of ten emits one helper.

So `source/is-valid-cnpj.ts` and `source/format-cnpj.ts` both import from
`source/_internals/cnpj.ts`, the check digit rules are written once, and neither generated
module carries a line of the other's.

The alternative — a shared module per target, imported across — would mean seven module
systems, seven visibility models, and a Go package named after a directory Rust spells
differently. Inlining costs a few duplicated helper bodies across utilities and buys all of
that back.

## The three things that would otherwise differ

Most of a utility ports without thought. Three things do not, and each is resolved at build
time rather than left to the host:

**Regular expressions.** `\s` is 25 code points in JavaScript, 6 in Go and Ruby, and a Unicode
property in Python and Rust; `^` and `$` are line anchors in Ruby; Java and C# expand `\uXXXX`
before the regex engine ever sees it. So a pattern is compiled, at build time, into explicit
code point ranges and a backtrack-free matcher that every runtime implements the same way
([`compiler/regex.ts`](compiler/regex.ts)). The compiler refuses any pattern whose consecutive
classes overlap, which is what makes the greedy, backtrack-free scan provably correct.

**Collation.** A utility that returns names in `localeCompare(…, "pt-BR")` order cannot sort
at run time: Go and Rust ship no collator at all, Ruby compares bytes, and Python, Java and C#
each resolve their own. [`data/build.ts`](data/build.ts) resolves the order once, against the
JavaScript package's own comparator, and bakes it into the dataset the emitters materialise.
Every target replays it.

**JavaScript's boundary quirks.** `formatCnpj(12_345_678)` coerces, `{ obfuscate: 1 }` is
truthy, `getAddressInfoByCep("01310-100")` strips the mask. These are the package's contract,
not accidents, so they live in a small portable standard library
([`source/_std.ts`](source/_std.ts)) that each target implements natively: `asString`,
`isTruthy`, `isNumber`, `isList`.

## What the author never writes

The source is straight-line, synchronous TypeScript. Three things are the emitter's job:

- **`async`.** A utility that calls `httpGet(…)` returns its record, plainly. The compiler
  works out which functions wait on the network and colours the call graph per target:
  TypeScript and C# get `async`/`await` and a `Promise`/`Task` return, while Go, Rust, Ruby,
  Java and Python stay blocking.
- **Raising.** The source writes `throw new SomeError(…)`. Java, C#, Python, Ruby and
  TypeScript get a real exception class. Go gets `(T, error)` with the error threaded through
  every call site; Rust gets `Result<T, runtime::Error>`. The declared error hierarchy
  survives in all seven.
- **Concurrency.** `startAll(fn, values, argument)` is the only concurrency primitive of the
  subset. It becomes promises in TypeScript, `Task`s in C#, goroutines and a channel in Go,
  threads and an `mpsc` channel in Rust, virtual threads in Java, and threads with a queue in
  Python and Ruby.

## The eighth target: a C ABI, for the ecosystems that would rather bind

Generated source is not the only way to get one implementation into seven languages. The other
is one compiled core with a hand-written binding per ecosystem, and
[`spec/BINDINGS-INVESTIGATION.md`](../BINDINGS-INVESTIGATION.md) measures what that boundary
actually costs when it is written the way a package writes it rather than the way a script
does: **~1 ns in C#, 27 ns in Python, ~60 ns in Go, Java and Ruby**, against a validator body
of 47 ns. In Python and Ruby that is 21× and 18× faster than the generated source.

So the Rust target emits both surfaces from the same source:

```
out/rust/src/is_valid_cnpj.rs        the library a Rust caller uses
out/rust/src/cabi_is_valid_cnpj.rs   #[no_mangle] extern "C" wrappers over the same functions
out/rust/include/is_valid_cnpj.h     the header a binding author reads
```

```c
int32_t  is_valid_cnpj(const uint8_t *cnpj, size_t len, int64_t version);
intptr_t format_cnpj(const uint8_t *value, size_t len, int64_t version,
                     int32_t obfuscate, int32_t pad, uint8_t *out, size_t out_len);
```

Pointers, lengths and integers, nothing owned and nothing allocated across the boundary. An
option that was not given is its "unset" sentinel — the same one the emitters already compare
against. A function that answers text writes into the caller's buffer and returns the length.

`conformance/run-all.sh` replays the same tables through that ABI from C, as an eighth arm,
which checks every hand-written binding's target at once: a CPython extension, a Ruby C
extension, a NuGet package over P/Invoke and a JAR over Panama all call exactly these symbols.

What the ABI does **not** cover is listed in the generated file itself: a function that raises
needs an out parameter for the error, one that waits on the network needs a callback or a
poll, and one that answers a list needs an iterator. Those are refused rather than guessed at,
so they are generated-source only.

## Is it actually the same?

Parity is measured against the package this repository ships, not asserted. Nothing is written
by hand per utility except the utility: the expectations are recorded by calling the shipped
package, and the program that replays them in each language is generated from the compiled
signature.

```bash
# The generated TypeScript drops into src/ and runs the package's own vitest suites.
bash spec/bridge/conformance/verify-typescript.sh

# Every target replays the expectations recorded from the shipped package.
bash spec/bridge/conformance/run-all.sh
```

A run prints one line per utility per target:

```
go: isValidCnpj 1707/1707 matched (18 not expressible)
```

"not expressible" is a case whose input has no form in that language — a number where the
signature says `string`, `null` where it says a list of names. The row says which targets can
be handed it, so nothing is skipped for being inconvenient, and the count is visible.

## Ported so far

| utility       | what makes it worth porting                                       |
| ------------- | ----------------------------------------------------------------- |
| `isValidCnpj` | regular expressions, check digits, JavaScript's own type coercion |
| `formatCnpj`  | a shared mask helper, and three options that interact             |

## Adding a utility

Two files, and nothing else changes:

1. **`source/<name>.ts`** — the utility, in the subset below, exporting exactly one function.
   Anything it shares with another utility goes in `source/_internals/`.
2. **`conformance/cases/<name>.ts`** — the arguments to replay. Only the arguments: the
   expectation comes from calling the shipped package, the table's columns come from the
   compiled signature, and each target's replay program is generated.

A utility that needs a baked table adds **`data/<name>.ts`**, which builds it from the shipped
package. A utility that reaches the network adds a `serve` to its recorder, and `run-all.sh`
starts it for the run.

```ts
// conformance/cases/is-valid-cnpj.ts
export const recorder: Recorder = {
	module: "is-valid-cnpj",
	inputs: (shipped) => [["12.345.678/0001-95"], ["q0slfmbd7vx439", { version: 2 }]],
};
```

## The subset

The frontend accepts a subset and refuses everything else with a pointed error rather than
emitting something that means one thing in Go and another in Ruby.

**Accepted:** `const`/`let`, `if`/`else`, `for (let i = …)`, `for…of`, `return`, `throw`,
arrow functions at module level, `+ - * % === !== < <= > >= && || !`, compound assignment,
template literals, the ternary operator (outside Go), object literals for declared record
types, array literals, `.push()`, `.length`, and the string methods `charCodeAt`, `slice`,
`toUpperCase`, `trim`, `padStart`, `repeat`, `replaceAll(/…/g, "")`.

**Declarations:** `type X = { … }` (a record, or an options record when every field is
optional), `type X = "a" | "b"` (a closed set of strings), `class X extends Y {}` (an error
type, body must be empty), module level `const` for strings, integers, lists and regular
expressions, and `dataset("name")` for a table built by `data/`.

**Imports:** `./_std.ts` for the portable standard library, and `./_internals/*.ts` for
helpers, which are inlined and pruned rather than emitted as a module.

**Refused:** classes with bodies, inheritance other than for errors, inline closures, `switch`,
`while`, floating point, `null` as a value, mutation of anything but a local, and any regular
expression with alternation, lookaround or overlapping consecutive classes.

## Known gaps

These are the honest edges, all of them measured rather than assumed.

### What the subset cannot express yet

A survey of the 140 utilities this package ships says four capabilities are missing, and each
is a decision rather than a detail:

| missing             | utilities it blocks                                                              | why it is not a detail                                                                              |
| ------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| dates               | 11, including `isBusinessDay`, `getHolidays`, `addBusinessDays`, `getBoletoInfo` | a date type and an arithmetic per target, plus a calendar whose rules move                          |
| randomness          | 15 `generate*` utilities                                                         | untestable by replay: a recorded expectation needs a seeded generator every target agrees on        |
| floats and `Intl`   | ~8, including `formatCurrency`, `clampPrecision`, `convertCurrencyToWords`       | rounding and currency formatting differ per target; the IR is integers only for exactly this reason |
| Unicode `normalize` | `removeAccents` and `sanitizeToAscii`                                            | NFD tables ship with the host and are not the same everywhere; this one wants a baked table         |

Everything else in the survey is reachable with what is here.

### Where the targets cannot be handed the same call

- **`string | number` has no static form.** `isValidCnpj(12_345_678_000_195)` is `false` in
  JavaScript, because the value is not a string. Go, Rust, Java and C# declare the parameter
  as a string, so the question cannot be asked there. Python, Ruby and TypeScript answer it.
- **`null` and `undefined` are one value in most hosts.** An option given as `null` is not the
  same as an omitted one. Only TypeScript can tell them apart; Python's `None` and Ruby's
  `nil` are both.
- **`toUpperCase` is not the same function everywhere.** The generated code calls each host's
  own uppercasing, which agrees with JavaScript's for ASCII and for the Latin-1 range, but not
  for every code point (Turkish dotless i, for instance). No utility in scope depends on the
  difference; one that did would need `upper` pinned in the portable std the way `trim` is.
- **Retry policy is the host's.** `httpGet(url, retries, delayMs)` retries a _transient_
  transport failure, and what counts as transient is each client's own set of error codes. The
  generated TypeScript reproduces the shipped package's list exactly; the other six use their
  own client's equivalent.
- **The generated TypeScript is not (yet) what the package ships.** It passes the package's
  tests, but adopting it would mean moving the handwritten `src/` implementations to
  `spec/bridge/source/` and generating the rest. That is a decision, not a technical blocker.

## Layout

```
source/
  _std.ts            the operations each target implements natively
  _internals/*.ts    helpers, inlined into whichever utility imports them
  <utility>.ts       one utility, one exported function
  *.data.json        datasets, built by data/
compiler/
  frontend.ts        TypeScript (via the oxc parser) -> IR
  ir.ts              the intermediate representation
  link.ts            inlines the imported helpers, prunes what is unreachable
  regex.ts           regular expressions -> code point classes + a matcher
  kit.ts             naming and traversal, shared by the emitters
  cli.ts             compiles every module into every target
  targets/*.ts       one emitter per language, plus cabi.ts for the C ABI
  runtime/*          one small runtime per language, utility agnostic
data/
  build.ts           runs every dataset builder
  <utility>.ts       one dataset, with its order resolved once
conformance/
  cases.ts           the case format: columns, rendering, which target can be handed what
  cases/<utility>.ts the arguments to replay, per utility
  record.ts          calls the shipped package and writes the tables
  drivers.ts         writes each target's replay program from the compiled signature
  serve.ts           serves what the generated code talks to, for a run
  run-all.sh         records, compiles, and replays through all seven plus the C ABI
  verify-typescript.sh  runs the package's own vitest suites on the output
  recorded/          generated; not committed
out/                 generated; not committed
```

## Running it

```bash
cd spec/bridge
npm install                 # oxc-parser, for the frontend
node data/build.ts          # rebuild the datasets
node compiler/cli.ts        # every target
node compiler/cli.ts rust   # one target
bash conformance/run-all.sh # the whole parity check
```

The conformance run needs the toolchains of the languages it checks (node, python3, ruby, go,
cargo, javac, dotnet) and uses a local HTTP server on port 18080, which `BRUTILS_BRIDGE_PORT`
overrides. The runtimes read `BRUTILS_BRIDGE_HTTP_ORIGIN` to point their requests at it;
unset, they call the real services.
