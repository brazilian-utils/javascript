# Contributing to Brazilian Utils

Thank you for your interest in contributing to Brazilian Utils! This project exists thanks to
[everyone who contributes](README.md#contributors), and we'd love your help solving the little
day-to-day problems of building software for Brazil.

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

### Requirements

- Node.js `24` for development (see `.nvmrc`): the toolchain (Vite+) needs it. The **library itself** supports Node.js `^20.19.0 || >=22.12.0` (the `engines` field); the CI runs the test suite on Node 20, 22, 24 and 26.
- [npm](https://docs.npmjs.com) `12.x` (the exact version is pinned via `packageManager` in `package.json`)

### Setup

```bash
git clone https://github.com/brazilian-utils/javascript.git
cd javascript
npm install
```

This repository uses [Vite+](https://github.com/voidzero-dev/vite-plus) (`vp`) as its local
toolchain for linting, formatting, type-checking and testing. `vp` is installed as a dependency
and is invoked through the `npm` scripts below, so you don't need to install anything globally.

### Useful scripts

| Command                                                                                                                   | What it does                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`                                                                                                           | Runs `vp check`: format check, lint and type-check together. Run this before opening a PR.                                                                                                                                                                               |
| `npm run check:fix`                                                                                                       | Same as above, but auto-fixes what it can.                                                                                                                                                                                                                               |
| `npm run format` / `npm run format:check`                                                                                 | Formats the codebase / checks formatting with `vp fmt`.                                                                                                                                                                                                                  |
| `npm run lint` / `npm run lint:fix`                                                                                       | Lints the codebase with `vp lint`.                                                                                                                                                                                                                                       |
| `npm run test`                                                                                                            | Runs the unit test suite with `vp test`.                                                                                                                                                                                                                                 |
| `npm run test:coverage`                                                                                                   | Runs tests with coverage (`vp test run --coverage`).                                                                                                                                                                                                                     |
| `npm run test:bun`                                                                                                        | Runs the test suite on [Bun](https://bun.sh) (`bun test src`).                                                                                                                                                                                                           |
| `npm run test:deno`                                                                                                       | Runs the test suite on [Deno](https://deno.com) (`deno test`).                                                                                                                                                                                                           |
| `npm run test:live`                                                                                                       | Runs the live CEP-provider test against the real network (`RUN_LIVE_CEP_TESTS=1 vp test src/get-address-info-by-cep/get-address-info-by-cep.test.ts`); not part of the regular test run, only of the scheduled `Live tests` workflow.                                    |
| `npm run test:chrome-browser`, `npm run test:firefox-browser`, `npm run test:edge-browser`, `npm run test:safari-browser` | Runs the test suite in real browsers via `vp test --browser.enabled`.                                                                                                                                                                                                    |
| `npm run build`                                                                                                           | Builds the library for publishing with `vp pack` (also runs attw and publint over the built output).                                                                                                                                                                     |
| `npm run build:data`                                                                                                      | Regenerates the datasets under `src/_internals/constants` from the IBGE/CONCLA sources (`scripts/data.ts`); run by the scheduled `Update datasets` workflow.                                                                                                             |
| `npm run build:llms`                                                                                                      | Regenerates `docs/llms.txt` and `docs/llms-full.txt` from the docs (`scripts/llms.ts`); CI fails if they're out of date.                                                                                                                                                 |
| `npm run build:site`                                                                                                      | Regenerates the per-page copies of `docs/index.html`, `docs/404.html` and `docs/sitemap.xml` from the sidebars (`scripts/site.ts`); CI fails if they're out of date.                                                                                                     |
| `npm run build:jsr`                                                                                                       | Regenerates the `exports` of `jsr.json`, one per utility folder (`scripts/jsr.ts`); CI fails if they're out of date.                                                                                                                                                     |
| `npm run check:dependencies`                                                                                              | Fails if `package.json` declares any runtime `dependencies` (this package ships zero by design).                                                                                                                                                                         |
| `npm run check:tree-shaking`                                                                                              | Builds nothing; measures the single-import size of every export against `dist` (`scripts/tree-shaking.ts`). Run it after `npm run build` when you change a dataset, and update the bundle-size table in `docs/getting-started.md` / `docs/pt-br/getting-started.md`.     |
| `npm run check:duplication`                                                                                               | Runs [jscpd](https://jscpd.dev) over `src` and `scripts`; any copy-pasted block of 5+ lines / 50+ tokens fails.                                                                                                                                                          |
| `npm run check:unused`                                                                                                    | Runs [knip](https://knip.dev): unused files, exports, types and dependencies fail.                                                                                                                                                                                       |
| `npm run test:mutation`                                                                                                   | Runs [Stryker](https://stryker-mutator.io) mutation tests (`stryker run`); pass `-- --mutate src/<util>/<util>.ts` for one file.                                                                                                                                         |
| `npm run bench`                                                                                                           | Runs the `describe("… benchmarks")` blocks with vitest in benchmark mode (`vp test bench --run`); they register nothing in test mode.                                                                                                                                    |
| `npm run check:api`                                                                                                       | Builds the package and runs API Extractor over `dist/brazilian-utils.d.ts`: a public type without a doc comment, a type the API refers to without exporting, or a public signature that differs from the committed baseline `reports/api/brazilian-utils.api.md`, fails. |
| `npm run check:api:update`                                                                                                | Rewrites the committed API Extractor baseline `reports/api/brazilian-utils.api.md` from the current build; run it when a public signature changes on purpose and commit the new report.                                                                                  |
| `npm run check:commits`                                                                                                   | Checks the commit messages since `origin/main` with commitlint (Conventional Commits).                                                                                                                                                                                   |
| `npm run check:lockfile`                                                                                                  | Checks `package-lock.json` only resolves to the npm registry over HTTPS with integrity hashes (lockfile-lint).                                                                                                                                                           |
| `npm run check:vex`                                                                                                       | Checks that every advisory suppressed for `audit-ci` and OSV-Scanner has a `not_affected` statement in `openvex.json`, and nothing else does.                                                                                                                            |

Before opening a pull request, make sure `npm run check` and `npm run test` both pass locally. If your
change touches runtime behavior, also consider running the Bun/Deno scripts above. The library is
tested and must keep working on Node.js, Bun, Deno and in browsers.

## Architecture

The library is a flat collection of pure functions, so there is not much architecture to learn,
but the few rules below hold everywhere:

- `src/<util>/<util>.ts` is one exported utility, next to its `<util>.test.ts`; `src/index.ts`
  re-exports it and `package.json` exposes it as a subpath import, so consumers bundle only what
  they call.
- `src/_internals/` holds the helpers shared between utilities (check-digit arithmetic, `mod10`/
  `mod11`, TLV parsing for Pix, sanitizers). `src/_internals/constants/` holds the datasets
  (banks, municipalities, CNAE, CBO, CFOP, NCM, legal natures), generated by the `scripts/`
  from their official sources and refreshed by the `Update datasets` workflow through
  a pull request, never edited by hand.
- Utilities are synchronous, stateless and side-effect free: input in, value out, no globals, no
  environment access, no dynamic code. The two exceptions are `getAddressInfoByCep` and
  `getCepInfoByAddress`, the only utilities that do I/O: they query public CEP APIs (BrasilAPI,
  ViaCEP and the alternatives listed in their docs) over HTTPS through
  `src/_internals/fetch-with-retry`, treat every response as untrusted input and never send anything
  but the CEP or address being looked up.
- There are no runtime dependencies (see [Zero runtime dependencies](#zero-runtime-dependencies)),
  so the trust boundary of the published package is this repository, its build toolchain and the
  npm registry; [MAINTAINERS.md](MAINTAINERS.md) lists who can change what, and
  [SECURITY.md](SECURITY.md) how a release is verified.

The actors around the code are the consumers of the npm package, the contributors (pull requests
from forks), the maintainers (review, merge, release approval) and the automation: GitHub Actions
builds, tests and publishes, Dependabot and the `Update datasets` workflow open update pull requests, and
release-please turns merged commits into releases.

## Datasets

The tables under `src/_internals/constants/` fall in two groups, and only the first refreshes
itself:

- **Generated from an official source** by a script in `scripts/` (`npm run build:data`, run
  every Monday by the `Update datasets` workflow): banks (Banco Central, `banks.ts`), CBO
  (`cbo.ts`), CFOP (CONFAZ, `cfop.ts`), municipalities and states (IBGE, `cities.ts`,
  `states.ts`), CNAE (`cnae.ts`), legal natures (CONCLA, `legal-natures.ts`) and NCM (Siscomex,
  `ncm.ts`). When a run changes a file, the workflow opens a pull request whose description, written
  by `scripts/data-summary.ts`, lists per table how many entries were added and removed, with a
  sample of each. Never edit these files by hand.
- **Maintained by hand**, because the source is a law or a regulation with no machine-readable
  form: area codes and their states (Anatel, `area-codes.ts`), service phone prefixes (Anatel,
  `service-phone.ts`), national and state holidays (`holidays.ts`), the órgãos and tribunals of the
  processo number (Resolução CNJ nº 65/2008, `processo-juridico.ts`), IBAN lengths per country
  (`iban.ts`), IBGE state codes (`ibge-uf-codes.ts`), legal nature categories, the CST and CSOSN
  tables (`src/is-valid-cst`, `src/is-valid-csosn`), the professional councils
  (`src/is-valid-registro-profissional`), the região fiscal digit of each state
  (`src/generate-cpf`) and the voter ID state codes (`src/is-valid-voter-id`). A change to one of
  these cites the act that changed it (`@see Official:`), like any rule.

## Adding a new utility

Brazilian Utils follows a consistent folder convention for every utility. To add a new one (for
example `formatSomething`):

1. Create a folder under `src/` named after the utility in kebab-case, e.g. `src/format-something/`.
   The folder name must match the function name (in kebab-case). This is not only a naming
   convention: `vite.config.ts` scans `src/` at build time and turns every folder with a
   same-named entry file (`src/format-something/format-something.ts`) into its own build entry,
   published as the subpath `@brazilian-utils/brazilian-utils/format-something`, with no manual
   wiring needed. That subpath lets consumers lazy-load a single heavy util (see `getCities` in
   [Bundle size](docs/getting-started.md#bundle-size)) without touching the root bundle.
2. Add the implementation in `src/format-something/format-something.ts`. If the function takes an
   object argument, name its type after the function's `PascalCase` name plus the suffix that says
   which argument it is: `FormatSomethingOptions` for a second, usually optional, options object
   (`formatSomething(value, options?)`), and `FormatSomethingParams` for the object that is the
   function's only (or first and only object) argument (`formatSomething(params)`). Export it
   alongside the function. The rule has no exceptions: the 2.3.0 names that broke it
   (`GenerateProcessoJuridicoOptions`, `GetCepInfoByAddressOptions`, `GetHolidaysOptions`,
   `IsHolidayOptions`, `IsValidBankAccountOptions` and the three `GetMunicipality*Options`) are
   now `@deprecated` aliases of the rule-compliant `*Params` names, and go away in v3. Write a
   JSDoc comment (description, `@param`, `@returns`, `@example`, and an `@see` link to the
   authoritative source when the utility implements an official Brazilian
   specification/algorithm (e.g. a Bacen manual, an IBGE table, a government validation
   algorithm) following the style used in the existing utilities (see
   `src/format-cpf/format-cpf.ts` for a reference). Keep the module tree-shakeable: no top-level
   allocations or calls (`new Map()`, `new Set()`, etc.) that a bundler cannot prove side-effect
   free, since those pin the module into every bundle that imports any util from the package.
   Build such values lazily on first call instead (see `src/format-currency/format-currency.ts`
   or `src/is-valid-service-phone/is-valid-service-phone.ts` for examples).
3. Add tests alongside it in `src/format-something/format-something.test.ts`. Cover valid input,
   invalid/edge-case input, and options, if any. Tests must pass on Node, Bun and Deno (see
   `npm run test:bun` / `npm run test:deno` under Useful scripts). Expectations are hand-written literals,
   never values computed by the code under test. Close the file with a `describe("properties")`
   block of [fast-check](https://fast-check.dev) properties that hold by specification (a
   generated value is valid, format/parse round-trip, masks never change the verdict, arbitrary
   input never throws); a property that needs a valid document draws it with `fc.gen()` from the
   arbitraries in `src/_internals/test/` (`const cpf = g(cpfs)`, from `document-arbitraries.ts` and
   its siblings), never by calling a `generate*` utility inside the property: those use
   `Math.random()`, which the seed fast-check reports does not control, so a failure could be
   neither replayed nor shrunk. Then a `describe("<name> types")` block that pins the public signature with
   `expectTypeOf` (parameters, options and return type; `vp check` fails on a wrong assertion). A
   hot path may also get a `describe("<name> benchmarks")` block of `bench` cases: they are todo
   entries in a normal run and execute with `npx vp test bench --run`. `describe`, `test`,
   `expect`, `expectTypeOf` and `bench` all come from `src/_internals/test/runtime`, which maps
   them to vitest, Bun or Deno.
4. Export the new function (and any exported types) from `src/index.ts`, keeping the existing
   alphabetical ordering. Then add the function name to the `PUBLIC` list and the type(s) to the
   `publicTypes` map in `src/index.test.ts`, alphabetically. These two make up the package's
   public surface contract, and the test suite fails the build if either is out of sync.
5. Document the utility in **both**:
   - `docs/utilities.md` (English)
   - `docs/pt-br/utilities.md` (Portuguese translation)

   Follow the existing format: a `###` heading with the function name under the `##` family it
   belongs to, one sentence saying what it does (`llms.txt` indexes that sentence), a few short
   bullets for the options and the return rules, a `javascript` code block showing example
   input/output, and a one-line `Source:` (`Fonte:` in Portuguese) with the official reference when
   there is one. Do not repeat what the Conventions section at the top of the file already says
   (nothing throws, masked input is accepted, generators use `Math.random()`); the JSDoc is the place
   for every edge case, the reference is the place for what a caller needs. Keep both files in the
   same order.

   After editing `docs/getting-started.md` or `docs/utilities.md`, run `npm run build:llms` to
   regenerate `docs/llms.txt` and `docs/llms-full.txt` (see [llms.txt](https://llmstxt.org/)) and
   commit the result. CI fails the build if these files are stale.

6. If the utility is based on an official Brazilian specification/document (e.g. a government
   validation algorithm), link to the authoritative source in the code comment (`@see`) or PR
   description so reviewers can verify the implementation.

When an exported function has a source to credit, list the authoritative source first, labeled
`@see Official:` (a law, regulator, standard body or government dataset), followed by one
`@see Based on:` line for every third-party implementation, mirror dataset or reference test
vector the code actually relied on (a GitHub repo, a blog article, a community CSV/JSON mirror,
and so on), one `@see` per line. A regulator's own repository counts as `Official:` even though it
is a GitHub URL: `https://github.com/bacen/pix-api` is the Banco Central publishing the normative
Pix/SPI specification, not a third party reimplementing it. Put the URL alone on the `@see` line
and the description on the lines below it. Every utility in the package currently has at least one
`@see`; if you add one whose behaviour is a plain convention with no locatable source, say so in
prose in the JSDoc instead of inventing a citation. See
`src/is-valid-certidao/is-valid-certidao.ts` and `src/is-valid-cei/is-valid-cei.ts` for the style.

Shared helpers used by multiple utilities live under `src/_internals/`. Check there before
duplicating logic (e.g. `src/_internals/format/format.ts`,
`src/_internals/sanitize-to-digits/sanitize-to-digits.ts`).

`npm run check:tree-shaking` (`scripts/tree-shaking.ts`) checks the tree-shakeable-module rule
above for every function the package exports, by building a one-import consumer bundle per
export with esbuild and printing its size. There is no committed budgets file: instead, the
`tree-shaking` job in CI measures every export's single-import bundle size on the PR's base
branch and on the PR head, then comments a Markdown report on the PR that leads with the impact:
a single "no bundle size impact" line when every export is the same size, otherwise the bundle
totals plus a "What changed" table listing only the exports that grew, shrank, appeared or
disappeared (sorted by absolute delta); the full per-export list is always there, collapsed. The
check fails the PR
when a pre-existing export grows by more than 20% and more than 256 bytes, or when a bundle
importing every export that already existed on the base grows by more than 5% (new exports
never count as a regression); those thresholds live as constants at the top of
`scripts/tree-shaking.ts`. When a size increase is intentional (a dataset refresh, a validator
that now covers more cases), a maintainer adds the `tree-shaking: accepted` label to the pull
request: the report is still posted, but the check no longer fails. Run `node scripts/tree-shaking.ts` locally to see the current sizes,
or `node scripts/tree-shaking.ts --json before.json` before a change and
`node scripts/tree-shaking.ts --compare before.json` after it to preview the same diff.

## Lint and type strictness

`npm run check` runs oxlint through Vite+ with the `correctness`, `suspicious`, `perf` and `pedantic`
categories as errors, the `import`, `jsdoc` and `promise` plugins, and a curated set of
`restriction`/`style` rules on top (see `lint.rules` in `vite.config.ts`): explicit return types
on every function, no `console` outside `scripts/`, no `forEach`, no parameter reassignment, no
non-null assertions, no unsafe type assertions, JSDoc `@param`/`@returns` with types on exported
functions, `type` over `interface`, `T[]` over `Array<T>`, and no default exports outside the
config files. On top of the categories, about two hundred `style`/`restriction` rules that
have a clear quality payoff are switched on one by one (inline `type` import specifiers,
`startsWith` over `slice` comparisons, negative indexes, no `reduce`, `await` over `then`, no
`Array#apply`, `max-params` of 4, kebab-case file names, the `promise` invariants, the `jsdoc`
tag checks and the `vitest` matcher preferences, among others); whole categories such as
`no-magic-numbers`, `no-null`, `one-var` or `no-plusplus` stay off because they fight the
check-digit code and the `null`-returning API on purpose. Test files relax the rules that only
make sense for production code (return types, JSDoc, the `unsafe-*` family, since the
multi-runtime `expect` shim is untyped) and every `@ts-expect-error` must carry a description.

[SonarJS](https://github.com/SonarSource/SonarJS) runs as an
oxlint JS plugin (`lint.jsPlugins` in `vite.config.ts`) with every rule as an error, minus a
short list that is off on purpose right below the spread: formatting and naming rules that
`vp fmt` owns, the complexity/duplication rules already gated by `eslint/complexity` and jscpd,
`no-reference-error` (it reports TypeScript utility types), `max-union-size` and `pseudo-random`
(the 27 state codes and the generators' `Math.random` are intentional), `redundant-type-aliases`
(deprecated aliases kept for compatibility) and `todo-tag` (`test.todo` is a shim feature). It
adds what the Rust plugins do not have: cognitive complexity (25), regex complexity (25) and
regex bug patterns (anchor precedence, super-linear backtracking), nested ternaries and template
literals, redundant assignments and optional markers, and the test smells (hooks after test
cases, disabled or exclusive tests, assertions outside tests). Its type-aware rules are inert,
since oxlint does not hand ESLint plugins a type checker. The plugin adds about three seconds to
`vp check`.

`tsconfig.json` is `strict` plus `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters` and
`noPropertyAccessFromIndexSignature`. `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
stay off on purpose: the lookup tables are indexed by digits the code has already validated, so
those flags only add unreachable fallbacks, and every unreachable branch shows up as missing
coverage and as an equivalent mutant. Fix a type error with a real check that returns the same
value the code returned before, never with `!` or `as`.

Two pedantic rules stay off on purpose: `require-unicode-regexp` (the `u` flag changes what a
few escapes mean) and `prefer-code-point`/`prefer-number-coercion` (the digit arithmetic on
`charCodeAt` and `parseInt` is deliberate, and `codePointAt` would add a nullable branch to every
check-digit loop).

## Code quality gates

Three extra gates run in CI next to lint, types and coverage; run them locally before opening a
pull request so the CI result is not a surprise.

- **Duplicated code** (`npm run check:duplication`, [jscpd](https://jscpd.dev), config in
  `.jscpd.json`): scans `src` and `scripts`, tests included, and fails on any clone of at least
  5 lines and 50 tokens. Generated tables under `src/_internals/constants` are ignored. Fix a
  clone by extracting the shared code into an `_internals` helper (production code) or into a
  small local helper or a table-driven test (test code); expectations in tests stay hand-written
  literals either way.
- **Unused code** (`npm run check:unused`, [knip](https://knip.dev), config in `knip.json`): the
  entry points are `src/index.ts`, every `src/<util>/<util>.ts` subpath entry, the scripts and the
  config files. It fails on unused files, exports, exported types, duplicate exports and unused
  dependencies. `publint` and `@arethetypeswrong/core` are listed in `ignoreDependencies` because
  `vp pack` invokes them itself, and `src/_internals/test/runtime-deno.ts` is ignored because its
  `it`/`test` aliases mirror the vitest API on purpose.
- **Mutation testing** (`npm run test:mutation`, [Stryker](https://stryker-mutator.io), config in
  `stryker.config.json`): mutates every source file except tests, constants and the test
  runtime shims, and runs the vitest suite against each mutant. The score must stay at or above
  the `thresholds.break` value in the config. The `Mutation tests` workflow runs the whole suite on
  every pull request and on every push to `main`, like the other checks (about 3 minutes); the
  HTML report is attached to the run as the `mutation-report` artifact. A surviving mutant
  means a test is missing (add one, with a literal expectation) or the code has a branch that can
  never matter (simplify it). Only when a mutant is truly equivalent, use
  `// Stryker disable next-line <MutatorName>: <reason>` right above the line; that is the one
  place an inline comment is accepted in this codebase. The config sets `tsconfigFile` to an empty
  string because Stryker's sandbox preprocessor rewrites the `tsconfig.json` it finds through
  `ts.parseConfigFileTextToJson`, which TypeScript 7 no longer exposes; an empty value skips that
  preprocessor, and the sandbox does not need the tsconfig since vitest transpiles the sources
  itself (`stryker.config.json` is parsed as strict JSON, so the note cannot live in the file).

## Public API validation

[API Extractor](https://api-extractor.com) runs over the bundled `dist/brazilian-utils.d.ts` in CI
(`npm run check:api`). It fails when a type the public API refers to is not itself exported (a
consumer could not name it) and when an exported function, type or class has no doc comment. It
also compares the public API against the reviewed baseline committed at
`reports/api/brazilian-utils.api.md` (the only file of the ignored `reports/` folder that is
committed) and fails when the two differ, so a change to a public signature has to be reviewed in
the diff of that report: run `npm run check:api:update` to write the new baseline and commit it
along with the change. On top of that, the public signatures are pinned by the
`describe("<name> types")` blocks in the tests, and the `src/index.test.ts` export map catches an
export that goes missing.

## Supply chain

- Every GitHub Action is pinned to a full commit SHA with the version in a trailing comment
  (Dependabot updates both). Checkouts use `persist-credentials: false`.
- The `Security` workflow lints the workflows themselves with
  [actionlint](https://github.com/rhysd/actionlint) and [zizmor](https://github.com/zizmorcore/zizmor),
  scans `package-lock.json` with [OSV-Scanner](https://google.github.io/osv-scanner/) and scans the
  commits of every pull request (the whole history on the weekly run) for leaked secrets with
  [TruffleHog](https://github.com/trufflesecurity/trufflehog), next to GitHub's own secret scanning
  and push protection; the `Check` workflow runs `audit-ci` and lockfile-lint on top, and
  `npm run check:vex` keeps the advisories those two suppress accounted for in `openvex.json` (see
  SECURITY.md). The `Security` workflow also runs the
  [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/brazilian-utils/javascript) on
  every push to `main` and weekly: it grades the repository configuration (pinned actions, token
  permissions, branch protection, code review, dependency updates, SAST) rather than the code,
  publishes the score and uploads the findings to the Security tab.
- Every release ships `brazilian-utils.cdx.json` inside the package, a CycloneDX SBOM generated
  with `npm sbom` from the release tag right before staging on npm, and keeps the same file as a
  workflow artifact (`sbom-<tag>`); releases are immutable here, so the file cannot be attached to
  the release itself. The package has no
  runtime dependencies, so the document describes the package itself; it exists for consumers
  whose supply-chain policy requires one.
- Commit messages are checked with commitlint on every pull request, since release-please derives
  the version bump and the changelog from them.
- The URLs cited in the Markdown files and in the `@see` tags of the source are checked by hand
  when a citation is added or changed: an automated link check was tried and dropped, since the
  government hosts the library cites time out or answer 403 to anything that is not a browser.

## Zero runtime dependencies

Brazilian Utils ships with **zero runtime dependencies**. This is a deliberate, load-bearing
design decision, since the library is meant to be small, safe and embeddable anywhere (Node.js,
Bun, Deno, bundlers, `<script>` tags). Do not add a `dependencies` entry to `package.json`. If a
piece of logic seems to require a third-party package, implement it locally in
`src/_internals/` instead, or discuss the trade-off in an issue first.

## Runtime support

Every utility must keep working across all the runtimes this library targets:

- Node.js `^20.19.0 || >=22.12.0` (the `engines` field in `package.json` is the contract with consumers; do not bump it for tooling reasons)
- Bun
- Deno
- Browsers (evergreen; the CI matrix covers Chrome, Firefox, Edge and Safari)

Avoid Node-specific APIs unless they are polyfilled/guarded, and prefer standard, widely available
JavaScript/TypeScript features.

## Documentation site

`docs/` is the source of [brazilian-utils.com.br](https://brazilian-utils.com.br), served by GitHub
Pages with [docsify](https://docsify.js.org): `docs/index.html` renders the Markdown in the
browser, with `_sidebar.md`, `_navbar.md` and `_coverpage.md` as its navigation.

- docsify runs in history mode, so every page is a real URL (`/getting-started`,
  `/pt-br/utilities`) that search engines index on its own. GitHub Pages serves each one from a
  copy of `index.html` next to the page (`getting-started.html`) that carries the page's own
  title, description, canonical URL and hreflang pair, and `npm run build:site`
  (`scripts/site.ts`) writes those copies, `404.html` and `sitemap.xml` from the sidebars and the
  pages' front matter. The Check workflow fails when they are stale, so run it after editing
  `index.html`, a sidebar or a page's front matter. Links from the hash-router era
  (`/#/getting-started?id=usage`) are rewritten on load, so nothing out there breaks.
- Every page starts with a front matter block with a quoted `title` and `description` (and
  `keywords`), and has no `#` heading of its own: the plugin in `docs/index.html` turns the title
  into the page's heading and the block feeds the page's metadata (a small wrapper there hands
  the search plugin the same view, so the block never shows up in search results). Scripts read
  the block through `scripts/front-matter.ts`.
- The site's own CSS is `docs/styles.css`, linked by every shell: styles go there, not in a
  `<style>` block of `index.html`.
- `docs/examples.md` shows the files of `docs/snippets/` in one tab per framework. Each example is
  complete on its own, so it can be copied as is, and its tab's live demo runs that same file
  (`docs/snippets/live/run.js` compiles it in the browser). The demos take their look from
  `docs/snippets/styles.css`.
- `scripts/llms.ts` reads the title back out of the front matter, so `docs/llms.txt` and
  `docs/llms-full.txt` keep their headings; run `npm run build:llms` after editing a page.
- Context7 indexes `docs/` as `/brazilian-utils/javascript`; `context7.json` says what it reads,
  and `.github/workflows/context7.yml` asks for a refresh when the docs change on `main`.

Every pull request that touches `docs/` gets a preview deployment on Vercel (`vercel.json`), with
the URL posted as a comment. The file publishes `docs/` as it is (no install, no build), serves
`/getting-started` from `getting-started.html` like GitHub Pages does (`cleanUrls`), marks every
response `noindex` and turns deployments of `main` off: production stays on GitHub Pages. To
preview the site locally, point a static file server that resolves `/page` to `page.html`, the way
GitHub Pages does, at `docs/`.

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Examples:

```text
feat: add formatSomething utility
fix: correct check digit calculation for generateCpf
docs: add pt-br translation for formatSomething
chore(deps-dev): bump vitest
```

Releases are cut from these commit types (see [Releasing](#releasing) below), so an accurate
type/scope matters.

### Developer Certificate of Origin

Every commit must carry a `Signed-off-by` line, as in the Linux kernel: it is your statement that
you wrote the change, or have the right to submit it, under the project's MIT license, per the
[Developer Certificate of Origin](https://developercertificate.org). Git adds the line for you:

```bash
git commit -s
```

`git commit -s --amend` (or `git rebase --signoff main`) fixes a commit that is missing it. Use a
real name and an e-mail address that reaches you; GitHub's `noreply` address is fine.

## Breaking changes

This library is used in production by many projects, so please do not introduce breaking changes
(renamed/removed exports, changed function signatures, changed default behavior) without first
opening an issue or discussion to align on the approach with maintainers. If a breaking change is
unavoidable, call it out explicitly in the PR description (and use a `feat!`/`fix!` or
`BREAKING CHANGE:` footer in the commit, per Conventional Commits).

## Releasing

Releases are fully CI-driven with [release-please](https://github.com/googleapis/release-please).
There are no local release commands to run.

1. Every commit merged to `main` (from a contributor PR, a Dependabot bump, or an automated
   dataset-update PR) is scanned for its Conventional Commit type. release-please keeps a single
   open "release PR" that accumulates these changes, computing the next version from them:
   `feat:` bumps the minor version, `fix:` bumps the patch version, and a `!` after the type/scope
   or a `BREAKING CHANGE:` footer bumps the major version. The release PR's description and the
   `CHANGELOG.md` entry it adds are generated from the commit subjects/bodies, so writing a clear,
   accurately-typed commit message matters. `release-please-config.json` maps the types to the
   changelog sections: `feat`, `fix`, `perf`, `revert`, `docs` and `chore(data)` (the dataset
   refreshes) are listed; `build`, `ci`, `chore` (including the Dependabot `chore(deps)` and
   `chore(deps-dev)` bumps, which only touch the toolchain), `test`, `refactor` and `style` stay
   hidden.
2. A maintainer reviews the release PR (version bump, changelog) and merges it. **Merging the
   release PR is the first confirmation.** Nothing is published yet at this point.
3. Merging tags the release and publishes a GitHub Release, which triggers the `publish-npm` job in
   `.github/workflows/release.yml`. That job builds and validates the package and **stages** it on
   npm with `npm stage publish --provenance` (npm Trusted Publishing/OIDC; no npm token is stored
   in the repository). A staged version is not installable yet.
4. A maintainer approves the staged version with 2FA, on npmjs.com (package → Staged versions) or
   with `npm stage approve <stage-id>` from any machine. **That approval is the second
   confirmation** (npm's proof-of-presence); the trusted publisher only allows staged publishing,
   so nothing can reach npm without it.

5. The same release is published to [JSR](https://jsr.io/@brazilian-utils/brazilian-utils) by the
   `publish-jsr` job, from the TypeScript sources and through OIDC as well. `jsr.json` names what
   is published; release-please bumps its `version` with `package.json`, and the Deno job of the
   Tests workflow dry-runs the publication on every pull request.

No local `npm login`/`npm publish` or tagging is ever needed to cut a release.

Every pull request also gets an installable preview build from [pkg.pr.new](https://pkg.pr.new)
(the `Preview` workflow), with the install command posted as a comment, so a change can be tried
in a real project before it is merged.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your change, following the conventions above.
3. Add or update tests. PRs without tests for new behavior will not be merged.
4. Update `docs/utilities.md` and `docs/pt-br/utilities.md` if you added or changed a utility's
   public behavior.
5. Run `npm run check`, `npm run test`, `npm run check:duplication` and `npm run check:unused` and make
   sure all of them pass; run `npm run test:mutation -- --mutate <files you touched>` when you
   changed production code.
6. Open a pull request against `main` using a Conventional Commit-style title. Fill in the pull
   request template checklist.

## Code review

Every change reaches `main` through a pull request, a maintainer's own included, and is reviewed
before it is merged. The pipeline does the mechanical half of the review, so a reviewer's time goes
to what no tool can judge.

**What CI already decided.** A reviewer does not re-check these; a red check is a "not yet":
formatting, lint and types (`vp check`), the tests on every runtime, 100% coverage and mutation
score, duplicated code (jscpd), unused files and exports (knip), the public API report, bundle size
per export (the tree-shaking report), the lockfile, known vulnerabilities (`audit-ci`,
OSV-Scanner), CodeQL, the workflow linters, stale generated files (`llms.txt`, the site shells) and
the commit messages.

**What the reviewer checks**, in this order:

1. **Is it right?** For a utility that implements an official rule, open the `@see Official:`
   source and confirm the algorithm, the lengths, the weights and the edge cases against it. A
   validator that says "valid" to a bad document is the worst bug this library can ship, so a
   change without a verifiable source is not merged on trust. The expectations in the tests must be
   hand-written literals, ideally taken from the source, never values produced by the code under
   test.
2. **Does it keep the contract?** Public functions never throw on bad input: `isValid*` return
   `false`, `format*`/`parse*` return `""`, getters return `null` or `[]`, and there is a property
   test that says so. No renamed or removed export, no changed default, no narrower accepted input
   ([Breaking changes](#breaking-changes)); a rename keeps the old name as a `@deprecated` alias.
3. **Does it fit the project?** One utility per folder named after it, shared logic in
   `src/_internals/` instead of a copy, `XxxOptions`/`XxxParams` naming, datasets generated by a
   script and never edited by hand, and nothing in the change the pull request does not need.
4. **What does it cost the consumer?** No runtime dependency, ever
   ([Zero runtime dependencies](#zero-runtime-dependencies)). No top-level allocation or call that
   pins a module into every bundle, and no dataset pulled into a utility that did not need one:
   read the tree-shaking report, and accept a size increase (the `tree-shaking: accepted` label)
   only when the pull request says why. No regex that can backtrack on adversarial input, no
   unbounded loop on user-controlled values; a hot path gets a `bench` block.
5. **Does it run everywhere?** Standard JavaScript only: no Node-specific API, no `Intl` feature
   or syntax newer than the supported range ([Runtime support](#runtime-support)).
6. **Is it safe?** No `eval`, dynamic `import()` of user input, prototype access through a
   user-supplied key, environment access or I/O outside the two CEP utilities, which keep treating
   responses as untrusted. A workflow change keeps actions pinned by SHA, permissions minimal and
   secrets away from pull request code. A new development dependency needs a reason, a maintained
   upstream and a license compatible with MIT.
7. **Can the next person use it?** The JSDoc describes what the code does, edge cases included,
   both `docs/utilities.md` files describe what a caller needs, with an example that is true; the commit message has the right
   Conventional Commit type, because the changelog and the version are computed from it.

**Automated pull requests** get the same review with a narrower focus: a Dependabot bump is read
for what changed upstream (changelog, new install scripts, new transitive dependencies); a dataset
refresh is checked against its official source for plausibility (a table that lost half its rows
is a broken scraper, not news); the release pull request is checked for the version bump and the
changelog the commits imply.

**What it takes to merge**: green required checks, every review comment answered (fixed, or
explained and agreed), and an approval from a maintainer. A maintainer who is the only one
available may merge their own pull request after the same checklist, and says so in the pull
request; anything touching the release pipeline, the published API or a check-digit rule waits for
a second pair of eyes whenever there is one.

## Governance

[MAINTAINERS.md](MAINTAINERS.md) lists who maintains the project, what each role can do and how
write access is granted and removed. In short: contributors send pull requests from forks, one
maintainer reviews and merges them, the same maintainers approve releases on npm, and access grows
with a track record of merged contributions, never before.

## Recognition

We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize
everyone who helps the project, not only code, but also documentation, ideas, tests and tooling.
Maintainers will add you to the list in `README.md` after your contribution is merged; feel free to
mention in your PR what kind of contribution it is if it's not code.

## Questions?

If anything here is unclear, open a [GitHub Discussion](https://github.com/brazilian-utils/javascript/discussions)
or an issue. Improving this guide is itself a welcome contribution.
