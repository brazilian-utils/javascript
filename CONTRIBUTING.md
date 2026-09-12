# Contributing to Brazilian Utils

Thank you for your interest in contributing to Brazilian Utils! This project exists thanks to
[everyone who contributes](README.md#contributors), and we'd love your help solving the little
day-to-day problems of building software for Brazilian businesses.

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

| Command                                                                                                   | What it does                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm check`                                                                                               | Runs `vp check`: format check, lint and type-check together. Run this before opening a PR.                                                                             |
| `npm check:fix`                                                                                           | Same as above, but auto-fixes what it can.                                                                                                                             |
| `npm format` / `npm format:check`                                                                         | Formats the codebase / checks formatting with `vp fmt`.                                                                                                                |
| `npm lint` / `npm lint:fix`                                                                               | Lints the codebase with `vp lint`.                                                                                                                                     |
| `npm test`                                                                                                | Runs the unit test suite with `vp test`.                                                                                                                               |
| `npm test:coverage`                                                                                       | Runs tests with coverage (`vp test run --coverage`).                                                                                                                   |
| `npm test:bun`                                                                                            | Runs the test suite on [Bun](https://bun.sh) (`bun test src`).                                                                                                         |
| `npm test:deno`                                                                                           | Runs the test suite on [Deno](https://deno.com) (`deno test`).                                                                                                         |
| `npm test:chrome-browser`, `npm test:firefox-browser`, `npm test:edge-browser`, `npm test:safari-browser` | Runs the test suite in real browsers via `vp test --browser.enabled`.                                                                                                  |
| `npm build`                                                                                               | Builds the library with `vp build`.                                                                                                                                    |
| `npm run check:duplication`                                                                               | Runs [jscpd](https://jscpd.dev) over `src` and `scripts`; any copy-pasted block of 5+ lines / 50+ tokens fails.                                                        |
| `npm run check:unused`                                                                                    | Runs [knip](https://knip.dev): unused files, exports, types and dependencies fail.                                                                                     |
| `npm run test:mutation`                                                                                   | Runs [Stryker](https://stryker-mutator.io) mutation tests (`stryker run`); pass `-- --mutate src/<util>/<util>.ts` for one file.                                       |
| `npm run check:api`                                                                                       | Builds the package and runs API Extractor over `dist/brazilian-utils.d.ts`: a public type without a doc comment, or a type the API refers to without exporting, fails. |
| `npm run check:commits`                                                                                   | Checks the commit messages since `origin/main` with commitlint (Conventional Commits).                                                                                 |
| `npm run check:lockfile`                                                                                  | Checks `package-lock.json` only resolves to the npm registry over HTTPS with integrity hashes (lockfile-lint).                                                         |

Before opening a pull request, make sure `npm check` and `npm test` both pass locally. If your
change touches runtime behavior, also consider running the Bun/Deno scripts above. The library is
tested and must keep working on Node.js, Bun, Deno and in browsers.

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
   options object, type it as `FormatSomethingOptions` (i.e. the function's `PascalCase` name plus
   `Options`) and export it alongside the function. Write a JSDoc comment (description, `@param`,
   `@returns`, `@example`, and an `@see` link to the authoritative source when the utility
   implements an official Brazilian specification/algorithm (e.g. a Bacen manual, an IBGE table,
   a government validation algorithm) following the style used in the existing utilities (see
   `src/format-cpf/format-cpf.ts` for a reference). Keep the module tree-shakeable: no top-level
   allocations or calls (`new Map()`, `new Set()`, etc.) that a bundler cannot prove side-effect
   free, since those pin the module into every bundle that imports any util from the package.
   Build such values lazily on first call instead (see `src/format-currency/format-currency.ts`
   or `src/is-valid-service-phone/is-valid-service-phone.ts` for examples).
3. Add tests alongside it in `src/format-something/format-something.test.ts`. Cover valid input,
   invalid/edge-case input, and options, if any. Tests must pass on Node, Bun and Deno (see
   `npm test:bun` / `npm test:deno` under Useful scripts).
4. Export the new function (and any exported types) from `src/index.ts`, keeping the existing
   alphabetical ordering. Then add the function name to the `PUBLIC` list and the type(s) to the
   `publicTypes` map in `src/index.test.ts`, alphabetically. These two make up the package's
   public surface contract, and the test suite fails the build if either is out of sync.
5. Document the utility in **both**:
   - `docs/utilities.md` (English)
   - `docs/pt-br/utilities.md` (Portuguese translation)

   Follow the existing format: a `##` heading with the function name, a short description, and a
   `javascript` code block showing example input/output. Place the new section next to the other
   utilities in the same domain, keeping both files in the same order.

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
and so on), one `@see` per line. A utility with no located source of either kind (e.g.
`capitalize`, `formatCurrency`) can be left without an `@see` block. See
`src/is-valid-certidao/is-valid-certidao.ts` and `src/is-valid-cei/is-valid-cei.ts` for the style.

Shared helpers used by multiple utilities live under `src/_internals/`. Check there before
duplicating logic (e.g. `src/_internals/format/format.ts`,
`src/_internals/sanitize-to-digits/sanitize-to-digits.ts`).

`npm run check:tree-shaking` (`scripts/tree-shaking.ts`) checks the tree-shakeable-module rule
above for every function the package exports, by building a one-import consumer bundle per
export with esbuild and printing its size. There is no committed budgets file: instead, the
`tree-shaking` job in CI measures every export's single-import bundle size on the PR's base
branch and on the PR head, then comments a Markdown diff on the PR (sorted by absolute delta,
with new and removed exports called out and unchanged exports collapsed). The check fails the PR
when a pre-existing export grows by more than 20% and more than 256 bytes, or when a bundle
importing every export that already existed on the base grows by more than 5% (new exports
never count as a regression); those thresholds live as constants at the top of
`scripts/tree-shaking.ts`. When a size increase is intentional (a dataset refresh, a validator
that now covers more cases), a maintainer adds the `tree-shaking: accepted` label to the pull
request: the report is still posted, but the check no longer fails. Run `node scripts/tree-shaking.ts` locally to see the current sizes,
or `node scripts/tree-shaking.ts --json before.json` before a change and
`node scripts/tree-shaking.ts --compare before.json` after it to preview the same diff.

## Lint and type strictness

`npm check` runs oxlint through Vite+ with the `correctness`, `suspicious`, `perf` and `pedantic`
categories as errors, the `import`, `jsdoc` and `promise` plugins, and a curated set of
`restriction`/`style` rules on top (see `lint.rules` in `vite.config.ts`): explicit return types
on every function, no `console` outside `scripts/`, no `forEach`, no parameter reassignment, no
non-null assertions, no unsafe type assertions, JSDoc `@param`/`@returns` with types on exported
functions, `type` over `interface`, `T[]` over `Array<T>`, and no default exports outside the
config files. Test files relax the rules that only make sense for production code (return types,
JSDoc, the `unsafe-*` family, since the multi-runtime `expect` shim is untyped) and every
`@ts-expect-error` must carry a description.

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
  place an inline comment is accepted in this codebase.

## Public API validation

[API Extractor](https://api-extractor.com) runs over the bundled `dist/brazilian-utils.d.ts` in CI
(`npm run check:api`). It fails when a type the public API refers to is not itself exported (a
consumer could not name it) and when an exported function, type or class has no doc comment. The
report it writes lands in the ignored `reports/api/` folder and is not committed: the public
signatures are pinned by the `describe("<name> types")` blocks in the tests, and the
`src/index.test.ts` export map catches an export that goes missing.

## Supply chain

- Every GitHub Action is pinned to a full commit SHA with the version in a trailing comment
  (Dependabot updates both). Checkouts use `persist-credentials: false`.
- The `Security` workflow lints the workflows themselves with
  [actionlint](https://github.com/rhysd/actionlint) and [zizmor](https://github.com/zizmorcore/zizmor)
  and scans `package-lock.json` with [OSV-Scanner](https://google.github.io/osv-scanner/); the
  `Check` workflow runs `audit-ci` and lockfile-lint on top.
- Commit messages are checked with commitlint on every pull request, since release-please derives
  the version bump and the changelog from them.
- The `Links` workflow checks every URL in the Markdown files and in the `@see` tags of the source
  with [lychee](https://lychee.cli.rs) when a pull request touches them.

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
   accurately-typed commit message matters.
2. A maintainer reviews the release PR (version bump, changelog) and merges it. **Merging the
   release PR is the first confirmation.** Nothing is published yet at this point.
3. Merging tags the release and publishes a GitHub Release, which triggers the `publish` job in
   `.github/workflows/release.yml`. That job builds and validates the package and **stages** it on
   npm with `npm stage publish --provenance` (npm Trusted Publishing/OIDC; no npm token is stored
   in the repository). A staged version is not installable yet.
4. A maintainer approves the staged version with 2FA, on npmjs.com (package → Staged versions) or
   with `npm stage approve <stage-id>` from any machine. **That approval is the second
   confirmation** (npm's proof-of-presence); the trusted publisher only allows staged publishing,
   so nothing can reach npm without it.

No local `npm login`/`npm publish` or tagging is ever needed to cut a release.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your change, following the conventions above.
3. Add or update tests. PRs without tests for new behavior will not be merged.
4. Update `docs/utilities.md` and `docs/pt-br/utilities.md` if you added or changed a utility's
   public behavior.
5. Run `npm check`, `npm test`, `npm run check:duplication` and `npm run check:unused` and make
   sure all of them pass; run `npm run test:mutation -- --mutate <files you touched>` when you
   changed production code.
6. Open a pull request against `main` using a Conventional Commit-style title. Fill in the pull
   request template checklist.

## Recognition

We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize
everyone who helps the project, not only code, but also documentation, ideas, tests and tooling.
Maintainers will add you to the list in `README.md` after your contribution is merged; feel free to
mention in your PR what kind of contribution it is if it's not code.

## Questions?

If anything here is unclear, open a [GitHub Discussion](https://github.com/brazilian-utils/javascript/discussions)
or an issue. Improving this guide is itself a welcome contribution.
