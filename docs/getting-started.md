# Getting Started

Brazilian Utils is a library focused on solving problems that we face daily in the development of applications for the Brazilian business.

## Why Brazilian Utils

- **Zero runtime dependencies.** Nothing else lands in your `node_modules` or in your bundle.
- **Tree-shakeable, down to the function.** `import { isValidCpf }` costs under 1 KB; every util is also its own subpath entry (`@brazilian-utils/brazilian-utils/get-cities`) for the heavy ones.
- **Runs everywhere.** Node.js `^20.19.0 || >=22.12.0`, Bun, Deno and evergreen browsers, tested in CI on every one of them.
- **Written in TypeScript.** Types ship with the package; the public API is tracked by an API report so nothing changes silently.
- **Validated against the official rules.** Every validator cites the specification, law or dataset it implements (`@see` in the docs), and the test suite is mutation-tested, not just covered.
- **Documented in English and Portuguese**, with an `llms.txt` for AI assistants.

## Installation

You can install **Brazilian Utils** in a few ways:

as npm package:

```bash
npm install --save @brazilian-utils/brazilian-utils
```

with yarn package manager:

```bash
yarn add @brazilian-utils/brazilian-utils
```

with pnpm:

```bash
pnpm add @brazilian-utils/brazilian-utils
```

with bun:

```bash
bun add @brazilian-utils/brazilian-utils
```

or `<script>` tag (global `BrazilianUtils`):

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
```

### Runtime support

Node `^20.19.0 || >=22.12.0`, Bun, Deno, and modern browsers.

## Usage

To use a utility, import the required function, as shown below:

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('1232454233345'); // false
```

You can check a list of utilities [by clicking here](utilities.md).

## Bundle size

The package is tree-shakeable: importing one util from the root pulls in only that util's code, not the rest of the library. `isValidCpf`, for example, adds roughly 0.7 KB minified to your bundle. A bundler that supports tree-shaking (webpack, Rollup, esbuild, Vite, etc.) drops every other util.

A handful of utils are the exception: each embeds an official dataset, so it weighs far more than every other util combined. These are their single-import sizes, minified and gzipped:

| Util | Dataset | Minified | Gzipped |
| --- | --- | --- | --- |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 IBGE municipalities, with names and codes | 156 KB | 50 KB |
| `getCities` | 5571 IBGE municipality names | 153 KB | 49 KB |
| `isValidNcm` | NCM (Nomenclatura Comum do Mercosul) codes | 113 KB | 24 KB |
| `isValidCbo` · `getCbo` | CBO 2002 occupation titles | 110 KB | 27 KB |
| `isValidCnae` · `getCnae` | CNAE 2.3 subclasses | 93 KB | 21 KB |
| `isValidCfop` · `getCfop` | CFOP operation descriptions | 55 KB | 5.4 KB |
| `getBanks` · `getBankByCode` | Banco Central STR participants (COMPE + ISPB) | 28 KB | 7.3 KB |

Importing any of them from the root, even alongside a single small util, pulls that whole dataset into your main bundle, because this package ships as a single ESM module: a dynamic `import()` of the root (`await import('@brazilian-utils/brazilian-utils')`) still resolves to that same one file, so it can't be split out on its own. A bundler doing code-splitting needs a separate module to split *into*.

Those separate modules are the per-util subpaths. Load a heavy util lazily, only where you actually need its data:

```javascript
const { getCities } = await import('@brazilian-utils/brazilian-utils/get-cities');

getCities('SP');
```

```javascript
const { getMunicipalityByCode } = await import(
  '@brazilian-utils/brazilian-utils/get-municipality-by-code'
);

getMunicipalityByCode('3550308');
```

Every util is available this way, as `@brazilian-utils/brazilian-utils/<util-name>` (kebab-case, matching the function name: `isValidCpf` → `is-valid-cpf`), for the same lazy-loading/code-splitting reason.

Pick one style per util in a given app: a bundler treats the root import and the subpath import as two unrelated modules, so importing `getCities` from both the root *and* `/get-cities` in the same app bundles the 153 KB city table twice, once in each module's own output.
