# One implementation, every language

An exploration of whether Brazilian Utils can be written once and shipped in JavaScript, Python,
Go, Rust, Ruby, Erlang, .NET and whatever comes next, **without changing what any published
package does today**.

Everything claimed here is reproducible from this repository:

```bash
bash spec/conformance/run-all.sh                 # 6 languages, generated and checked
node spec/conformance/upstream.ts --python ../python --ruby ../ruby --go ../go --rust ../rust
```

---

## The short answer

Yes — but the thing to write once is **not code**. It is a specification, and code generation is
the last and most optional step of the three.

| Layer        | What it is                                                                 | Who consumes it                          | Risk to existing packages                                                 |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| L0 — Vectors | A list of inputs and the answer each named behaviour gives                 | Every package's test suite               | None. It is a test file.                                                  |
| L1 — Spec    | The behaviour itself, as data: charsets, check digit algorithms, pipelines | The generator, the reviewers, new ports  | None. Nothing ships it.                                                   |
| L2 — Codegen | Idiomatic source for each language, emitted from L1                        | Packages that opt in, utility by utility | None **by construction** — see [Profiles](#how-a-contract-survives-this). |

Writing the algorithm once means writing it at L1. L2 is how a package stops re-typing it, and a
package can adopt L2 for `isValidCpf` and keep everything else handwritten.

**Writing it in Rust and generating the rest is the wrong shape of the same idea.** Rust source is
still a language: to read it from Go you either transpile it (same problems as transpiling
TypeScript, below) or ship it as a native artifact, which costs this project the things it sells —
zero dependencies, tree shaking, Bun/Deno/browser parity, a pure gem, a pure wheel, a pure BEAM
library. A specification has no host language, so no package is anyone's downstream.

---

## What was built to test the claim

Three utilities — `isValidCpf`, `isValidPis`, `formatCpf` — were specified as data and emitted to
six languages, including Java, which has no package today.

```
spec/
  utilities/*.json        the utilities: profiles, pipelines, names per language   (416 lines)
  schema/                 charsets, check digit algorithms, the JSON Schema
  codegen/                the reference interpreter and the six emitters         (3,830 lines)
  vectors/conformance.json  743 inputs x 13 expectations, generated                (100 KB)
  conformance/            the differential runners
  generated/              output, not committed: `node spec/codegen/emit.ts`
```

The 416 lines of specification produce 1,647 lines of library code across the six languages, plus
the conformance drivers. A new language costs one emitter of 350–430 lines and buys every utility
already specified.

### Results

| Check                                                   | Result                                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Spec vs. the package **this repository ships** (`src/`) | **11,928/11,928** agree, over 1,983 corpus inputs plus `null`, `undefined`, numbers, `NaN`, arrays, objects |
| Generated TypeScript vs. vectors                        | 4,458/4,458                                                                                                 |
| Generated Python / Ruby / Go / Rust vs. vectors         | 2,229/2,229 each                                                                                            |
| Generated Java vs. vectors                              | 4,458/4,458                                                                                                 |
| Spec vs. the **published** `brutils` (Python)           | 741/743, plus 2 documented deviations                                                                       |
| Spec vs. the **published** gem (Ruby)                   | 743/743                                                                                                     |
| Spec vs. the **published** Go module                    | 743/743                                                                                                     |
| Spec vs. the **published** Rust crate                   | 743/743                                                                                                     |

The corpus is seeded and deterministic (`spec/codegen/corpus.ts`): valid numbers, masked numbers,
numbers with one digit flipped, junk, Unicode whitespace, NBSP, ZWNBSP, an emoji with a surrogate
pair, and CPFs written in full width and Arabic-Indic digits.

---

## Four things the exercise turned up

### 1. The contracts already disagree — badly

This is the central finding. The worry was "let us not create an issue by unifying". The issue
exists now, and nobody can see it because nothing compares the packages.

| Input                                   | JavaScript | Python    | Ruby    | Rust    | Erlang  | Go        |
| --------------------------------------- | ---------- | --------- | ------- | ------- | ------- | --------- |
| `"12345678909"`                         | valid      | valid     | valid   | valid   | valid   | valid     |
| `"123.456.789-09"`                      | **valid**  | invalid   | invalid | invalid | invalid | **valid** |
| `"123 456 789 09"`                      | **valid**  | invalid   | invalid | invalid | invalid | **valid** |
| `"abc12345678909"`                      | invalid    | invalid   | invalid | invalid | invalid | **valid** |
| `"１２３４５６７８９０９"` (full width) | invalid    | **valid** | invalid | invalid | invalid | invalid   |

Four different answers to "is this a CPF". A user who validates a masked CPF in the browser and
again in a Python backend gets two verdicts today.

The JavaScript, Python, Ruby, Rust and Go columns were produced by running those packages
(`spec/conformance/upstream.ts`). The Erlang column was read from `brutils_cpf.erl`, whose
`is_valid/1` requires a binary of exactly 11 ASCII digits; no Erlang toolchain was available here
to execute it.

### 2. `brutils` accepts a CPF written in Arabic-Indic digits

`brutils/cpf.py` and `brutils/pis.py` gate on `str.isdigit()`, which is Unicode aware, so
`"١٢٣٤٥٦٧٨٩٠٩"` validates and `format_cpf` returns `"١٢٣.٤٥٦.٧٨٩-٠٩"`. Ruby's `/^\d+$/` and Rust's
`is_ascii_digit` do not. This is recorded in the specs as a `knownDeviations` entry, and it is a
bug report waiting to be filed against the Python package.

### 3. PIS is the mirror image of CPF

The JavaScript package rejects `"00000000000"` as a PIS and accepts `"120.56874.10-7"`. Python, Go,
Ruby and Rust do the opposite on **both** counts: they accept the repeated run and reject every
mask. 66 of 743 corpus inputs differ. Neither side is obviously right; neither side knows.

### 4. A regex is not portable, so the spec has none

`\s` matches 6 characters in Go and Ruby, 25 in JavaScript, and a Unicode property in Python and
the Rust `regex` crate. `\d` matches Devanagari digits in Python. Ruby's `^`/`$` are line anchors,
not string anchors. Java expands `\u000a` _before_ lexing, so a generated string literal containing
one ends on a real line break — which is exactly how the first Java emitter failed here.

So the IR carries no regex: a charset is a list of code points
(`spec/schema/charsets.json`), and the shape of a masked number is digit group sizes plus a
separator set. Every emitter renders that as explicit comparisons. This is the concrete reason a
naive "transpile the TypeScript" approach cannot be trusted: the regexes would survive the
translation and quietly change meaning.

---

## How a contract survives this

A utility does not have _a_ behaviour. It has **profiles**, and each package declares which one it
implements today:

```jsonc
"adopted": {
  "typescript": { "profile": "masked-strict" },
  "python":     { "profile": "digits-only", "knownDeviations": [ /* the Unicode digits bug */ ] },
  "go":         { "profile": "digits-extracted" }
},
"profiles": {
  "masked-strict":    { "description": "...", "pipeline": [ /* ... */ ] },
  "digits-only":      { "description": "...", "pipeline": [ /* ... */ ] },
  "digits-extracted": { "description": "...", "pipeline": [ /* ... */ ] }
}
```

Three consequences:

1. **Generating a package is a no-op release.** The Go emitter produces Go's lenient behaviour, the
   Ruby emitter produces Ruby's strict one. The proof is in the table above: the generated code and
   the published code agree on every corpus input.
2. **Convergence becomes a decision, not an accident.** Moving Python from `digits-only` to
   `masked-strict` is a one line change whose blast radius the vectors print exactly: these inputs,
   this many, changing from this answer to that one. That is a major version conversation with data
   attached, per package, on each package's own schedule.
3. **A new language starts on the canonical profile.** Java here adopts `masked-strict` from day
   one, because there is no installed base to protect.

---

## What this does not solve

Of the 138 utilities in `src/`, the ones that are a pipeline over digits are the large majority,
but not all of them:

| Group                                                                                | Count | Portable as data?                                                                         |
| ------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------- |
| Digit/mask pipelines (`isValid*`, `format*`, `parse*`)                               | ~89   | Yes — this is what the prototype covers                                                   |
| Dataset lookups (banks, municipalities, CNAE, CBO, CFOP, NCM, legal natures, states) | 25    | The logic is trivial; the value is the table. See below.                                  |
| Random generators (`generate*`)                                                      | 13    | The construction is; the RNG and its seeding are per language.                            |
| Date logic (holidays, business days, date to words)                                  | 9     | Partly. Easter and the holiday table are data; the calendar type is not.                  |
| HTTP (`getAddressInfoByCep`, `getCepInfoByAddress`)                                  | 2     | The provider list, the fallback order and the error taxonomy are data. The client is not. |
| Locale formatting (`formatCurrency`)                                                 | 1     | `Intl`/CLDR has no equivalent in Go or Erlang. Handwritten, or a shared CLDR subset.      |

(24 utilities depend on a host facility — a clock, an RNG, `Intl` or the network — and 12 of those
also read a dataset, so the rows overlap slightly.)

Trying to specify all of it in one IR is how this kind of project dies. The IR should grow one
utility family at a time, and anything that resists it stays handwritten — that is a normal
outcome, not a failure.

**The dataset question is separate and probably worth more.** `src/_internals/constants/` (banks,
municipalities, CNAE, CBO, CFOP, NCM, legal natures) is already generated from official sources by
`scripts/`. Every other package either re-scrapes those sources or does without. Publishing those
tables as a versioned, language neutral artifact is less work than any of the above and removes
more duplication.

---

## Why not the other two options

**Transpile the TypeScript.** The semantics that would have to come along are `String()` coercion,
`NaN`, `null` vs `undefined`, UTF-16 versus scalar iteration, `Intl`, and the regex differences
above. The output would be unreviewable by the people who maintain the Go and Ruby packages, and
the generated names would not match what those packages publish. The value of these libraries is
that they read like ordinary Go and ordinary Ruby.

**One core in Rust, bindings everywhere.** It breaks the npm package's zero dependency,
tree shakeable, Bun/Deno/browser promise; it forces a native toolchain on the gem and the wheel;
it has no answer for Erlang or for a pure .NET assembly; and every binding still needs a
handwritten shell with its own contract. Worth revisiting only for something genuinely heavy, which
none of these utilities are.

---

## Suggested order of work

1. **Publish the vectors** (no code changes anywhere). A `brazilian-utils/spec` repository holding
   `charsets`, `check-digits`, the utility specs and `conformance.json`. Each package adds one test
   that reads it. The payoff is immediate: every package learns, in CI, exactly how it differs from
   the others.
2. **File the divergences as issues**, one per finding above, in the package that owns each.
3. **Specify the ~40 document number utilities** (CPF, CNPJ, CEP, PIS, CNH, CNS, CNO, CEI, CAEPF,
   NFe key, RENAVAM, voter ID, boleto, IBAN, Pix keys, plates...). This is the bulk of the
   duplicated work and the part the IR already covers.
4. **Opt into codegen where maintainers want it.** The Erlang and .NET packages, which cover the
   fewest utilities, gain the most: an emitter each, and they inherit everything specified.
5. **Converge profiles deliberately**, one package major version at a time, with the vector diff in
   the release notes.

Steps 1 and 2 are worth doing even if steps 3 to 5 never happen.

---

## Open questions for the team

- Which profile should be the canonical one? The JavaScript package is the most permissive on masks
  and the strictest on shape; is "accepts the mask a human would type" the contract we want
  everywhere?
- Should `spec` be its own repository, or live here with the other packages reading it by tag? The
  prototype lives here because that is where the most complete implementation is, not because that
  is the right home.
- Who owns a profile change? Today each package owns its behaviour. A shared spec needs one place
  where "CPF accepts masks" is decided.
