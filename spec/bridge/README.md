# The bridge: write a utility once, ship it in seven languages

`spec/bridge` is a compiler. You write a utility once, in ordinary TypeScript, under
[`source/`](source). It emits idiomatic native code for **TypeScript, Python, Go, Rust, Ruby,
Java and C#** — no bindings, no embedded VM, no FFI, and nothing hand-written per language.

Three utilities are ported so far, chosen because between them they use everything hard:

| utility                     | what makes it hard                                                  |
| --------------------------- | ------------------------------------------------------------------- |
| `isValidCnpj`, `formatCnpj` | regular expressions, JavaScript's own coercion quirks               |
| `getMunicipalities`         | 5,571 rows of data and a `pt-BR` collation order                    |
| `getAddressInfoByCep`       | HTTP, JSON, retries, an error hierarchy, and racing three providers |

```
source/cnpj.ts  ──┐
source/municipalities.ts ─┼──> compiler/frontend.ts ──> IR ──┬──> out/typescript
source/cep.ts   ──┘         (oxc parser)                     ├──> out/python
                                                             ├──> out/go
                                                             ├──> out/rust
                                                             ├──> out/ruby
                                                             ├──> out/java
                                                             └──> out/csharp
```

## Is it actually the same?

Parity is measured against the package this repository ships, not asserted.

```bash
# The generated TypeScript drops into src/ and runs the package's own vitest suites.
bash spec/bridge/conformance/verify-typescript.sh

# Every target replays the expectations recorded from the shipped package.
bash spec/bridge/conformance/run-all.sh
```

| target     | CNPJ vectors           | municipality dump | CEP scenarios     |
| ---------- | ---------------------- | ----------------- | ----------------- |
| typescript | 5,740 / 5,740          | 11,176 / 11,176   | 110 / 110         |
| python     | 5,740 / 5,740          | 11,176 / 11,176   | 109 / 109 (1 n/e) |
| ruby       | 5,740 / 5,740          | 11,176 / 11,176   | 109 / 109 (1 n/e) |
| go         | 5,722 / 5,722 (18 n/e) | 11,176 / 11,176   | 103 / 103 (7 n/e) |
| rust       | 5,722 / 5,722 (18 n/e) | 11,176 / 11,176   | 103 / 103 (7 n/e) |
| java       | 5,722 / 5,722 (18 n/e) | 11,176 / 11,176   | 103 / 103 (7 n/e) |
| csharp     | 5,722 / 5,722 (18 n/e) | 11,176 / 11,176   | 103 / 103 (7 n/e) |

"n/e" is **not expressible**: a case whose input has no form in that language, listed under
[Known gaps](#known-gaps). Nothing is skipped for being inconvenient.

The CNPJ corpus is every string literal in the package's own CNPJ test files, plus 120 freshly
generated CNPJs and masked and mutated variants of each, so its total moves by a few dozen every
time the expectations are re-recorded. The municipality dump and the CEP scenarios are fixed.

And the package's own suites, run against the generated TypeScript:

```
Test Files  4 passed (4)
     Tests  157 passed | 3 skipped | 3 todo (164)
```

That includes the type level assertions — `expectTypeOf(getMunicipalities).parameter(0)` has to
be `StateCode | undefined`, `getAddressInfoByCep` has to resolve to `AddressInfo`, and the four
CEP error classes have to extend one another.

## The three things that would otherwise differ

Most of a utility ports without thought. Three things do not, and each is resolved at build
time rather than left to the host:

**Regular expressions.** `\s` is 25 code points in JavaScript, 6 in Go and Ruby, and a Unicode
property in Python and Rust; `^` and `$` are line anchors in Ruby; Java and C# expand `\uXXXX`
before the regex engine ever sees it. So a pattern is compiled, at build time, into explicit
code point ranges and a backtrack-free matcher that every runtime implements the same way
([`compiler/regex.ts`](compiler/regex.ts)). The compiler refuses any pattern whose consecutive
classes overlap, which is what makes the greedy, backtrack-free scan provably correct.

**Collation.** `getMunicipalities()` returns names sorted with `localeCompare(…, "pt-BR")`. Go
and Rust ship no collator at all; Ruby compares bytes; Python, Java and C# each resolve their
own. Sorting at run time would produce seven different orders, so
[`data/build.ts`](data/build.ts) resolves the order once, against the JavaScript package's own
comparator, and bakes it into the dataset. Every target replays it.

**JavaScript's boundary quirks.** `formatCnpj(12_345_678)` coerces, `{ obfuscate: 1 }` is
truthy, `getAddressInfoByCep("01310-100")` strips the mask. These are the package's contract,
not accidents, so they live in a small portable standard library
([`source/_std.ts`](source/_std.ts)) that each target implements natively: `asString`,
`isTruthy`, `isNumber`, `isList`.

## What the author never writes

The source is straight-line, synchronous TypeScript. Three things are the emitter's job:

- **`async`.** `source/cep.ts` calls `httpGet(…)` and returns an `AddressInfo`. The compiler
  works out which functions wait on the network, and colours the call graph per target:
  TypeScript and C# get `async`/`await` and a `Promise`/`Task` return, while Go, Rust, Ruby,
  Java and Python stay blocking.
- **Raising.** The source writes `throw new GetAddressInfoByCepNotFoundError(…)`. Java, C#,
  Python, Ruby and TypeScript get a real exception class. Go gets `(T, error)` with the error
  threaded through every call site; Rust gets `Result<T, runtime::Error>`. The declared error
  hierarchy survives in all seven.
- **Concurrency.** `startAll(fetchProvider, chosen, digits)` is the only concurrency primitive
  of the subset. It becomes promises in TypeScript, `Task`s in C#, goroutines and a channel in
  Go, threads and an `mpsc` channel in Rust, virtual threads in Java, and threads with a queue
  in Python and Ruby.

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
expressions, and `dataset("name")` for a table built by `data/build.ts`.

**Refused:** classes with bodies, inheritance other than for errors, inline closures, `switch`,
`while`, floating point, `null` as a value, mutation of anything but a local, and any regular
expression with alternation, lookaround or overlapping consecutive classes.

## Known gaps

These are the honest edges, all of them measured rather than assumed.

- **`string | number` has no static form.** `isValidCnpj(12_345_678_000_195)` is `false` in
  JavaScript, because the value is not a string. Go, Rust, Java and C# declare the parameter as
  a string, so the question cannot be asked: 18 of the CNPJ vectors and 2 of the CEP cases are
  not expressible there. Python and Ruby, being dynamically typed, answer all of them.
- **`null` and `undefined` are one value in most hosts.** `getAddressInfoByCep(cep, { providers:
null })` rejects, where an omitted `providers` uses the default. Only TypeScript can tell the
  two apart; Python's `None` and Ruby's `nil` are both, so that case is not expressible there
  either.
- **`toUpperCase` is not the same function everywhere.** The generated code calls each host's
  own uppercasing, which agrees with JavaScript's for ASCII and for the Latin-1 range the CNPJ
  alphabet uses, but not for every code point (Turkish dotless i, for instance). No utility in
  scope depends on the difference; one that did would need `upper` pinned in the portable std
  the way `trim` already is.
- **Retry policy is the host's.** `httpGet(url, retries, delayMs)` retries a _transient_
  transport failure, and what counts as transient is each client's own set of error codes. The
  generated TypeScript reproduces the shipped package's list exactly; the other six use their
  own client's equivalent.
- **The generated TypeScript is not (yet) what the package ships.** It passes the package's
  tests, but adopting it would mean moving the handwritten `src/` implementations to
  `spec/bridge/source/` and generating the rest. That is a decision, not a technical blocker.

## Layout

```
source/           the utilities, written once, and the portable std
  _std.ts         the operations each target implements natively
  *.data.json     datasets, built by data/build.ts
compiler/
  frontend.ts     TypeScript (via the oxc parser) -> IR
  ir.ts           the intermediate representation
  regex.ts        regular expressions -> code point classes + a matcher
  targets/*.ts    one emitter per language
  runtime/*       one small runtime per language, utility agnostic
data/build.ts     builds the datasets, resolving collation once
conformance/
  vectors.ts      records the CNPJ expectations from the shipped package
  municipalities.ts  records the municipality dump
  cep.ts          the CEP scenarios: recorder and mock server in one file
  drivers.ts      writes the replay driver for each language
  run-all.sh      regenerates everything and replays it through all seven
  verify-typescript.sh   runs the package's own vitest suites on the output
out/              generated; not committed
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
cargo, javac, dotnet) and uses a local HTTP server on port 18080, which
`BRUTILS_BRIDGE_PORT` overrides. The runtimes read `BRUTILS_BRIDGE_HTTP_ORIGIN` to point their
requests at it; unset, they call the real services.
