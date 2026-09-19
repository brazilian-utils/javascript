---
title: "Getting Started"
description: "Install Brazilian Utils, the zero-dependency library of utilities for Brazilian data, import a util, check the supported runtimes and keep your bundle small."
keywords: ["Brazilian Utils", "install", "npm", "tree-shaking", "bundle size", "subpath imports", "Node.js", "Bun", "Deno", "browser", "AI assistants", "Context7"]
---

Brazilian Utils is a zero-dependency library of small utilities for the day-to-day problems of building software for Brazil: validating, formatting, parsing and generating CPF, CNPJ, CEP, boleto, Pix, phone numbers, holidays and more.

## Why Brazilian Utils

- **Zero runtime dependencies.** Nothing else lands in your `node_modules` or in your bundle.
- **Tree-shakeable, down to the function.** `import { isValidCpf }` costs about 1.4 KB minified (0.8 KB gzipped). Every util is also its own subpath entry, so the heavy ones can be lazy-loaded.
- **Runs everywhere.** Node.js `^20.19.0 || >=22.12.0`, Bun, Deno and evergreen browsers, all tested in CI.
- **Written in TypeScript.** Types ship with the package, and an API report tracks the public API so nothing changes silently.
- **Validated against the official rules.** Every validator cites the specification, law or dataset it implements, and the test suite is mutation-tested, not just covered.
- **Documented in English and Portuguese**, with an `llms.txt` for AI assistants.

## Installation

```bash
npm install @brazilian-utils/brazilian-utils
```

The same package works with `yarn add`, `pnpm add` and `bun add`. In a plain `<script>` tag it exposes the global `BrazilianUtils`:

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
```

### Runtime support

| Runtime  | Supported                 | Tested in CI                  |
| -------- | ------------------------- | ----------------------------- |
| Node.js  | `^20.19.0 \|\| >=22.12.0` | 20, 22, 24, 26                |
| Bun      | latest                    | latest                        |
| Deno     | 2.x                       | 2.x                           |
| Browsers | evergreen                 | Chrome, Firefox, Edge, Safari |

## Usage

Import the function you need:

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('1232454233345'); // false
```

The [utilities reference](utilities.md) lists every function, grouped by family, with its options and examples. The [examples](examples.md) show a CPF field in React, Angular, Vue and plain JavaScript.

## AI assistants

The documentation is indexed on Context7 as [`/brazilian-utils/javascript`](https://context7.com/brazilian-utils/javascript). In a coding agent connected to the Context7 MCP server, name the library in the prompt and the agent skips the library search:

```text
Validate a CNPJ with Brazilian Utils. use library /brazilian-utils/javascript
```

To stop repeating it, add a rule to the agent's instructions file (`CLAUDE.md`, Cursor rules or the equivalent): "For Brazilian document utils, use the Context7 library /brazilian-utils/javascript".

Without Context7, point the assistant at [llms.txt](https://brazilian-utils.com.br/llms.txt), which lists every util with a one-line description, or at [llms-full.txt](https://brazilian-utils.com.br/llms-full.txt), the whole English documentation in one Markdown file.

## Bundle size

The package is tree-shakeable: importing one util from the root pulls in only that util's code. `isValidCpf`, for example, adds about 1.4 KB minified (0.8 KB gzipped) to your bundle.

A few utils embed an official dataset and weigh far more than everything else combined:

| Util | Dataset | Minified | Gzipped |
| --- | --- | --- | --- |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 IBGE municipalities, with names and codes | 154.9 - 156.5 KB | 50.3 - 50.4 KB |
| `getCities` | 5571 IBGE municipality names | 154.2 KB | 49.8 KB |
| `isValidNcm` | NCM (Nomenclatura Comum do Mercosul) codes | 114.2 KB | 24.6 KB |
| `isValidCbo` · `getCbo` | CBO 2002 occupation titles | 119.1 KB | 30.6 KB |
| `isValidCnae` · `getCnae` | CNAE-Subclasses 2.3 | 93.9 KB | 21.2 KB |
| `isValidCfop` · `getCfop` | CFOP operation descriptions | 68.9 KB | 6.9 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | Banco Central STR participants (COMPE + ISPB) | 38.3 - 38.6 KB | 9.5 - 9.7 KB |

The root of the package is a single ESM module, so a bundler cannot split one of these datasets out of it: importing a heavy util from the root puts its whole dataset in your main bundle, and a dynamic `import()` of the root does not help. To lazy-load one, import it from its own subpath:

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

Every util has a subpath, `@brazilian-utils/brazilian-utils/<util-name>` in kebab-case (`isValidCpf` is `is-valid-cpf`).

Pick one style per util in a given app. A bundler treats the root import and the subpath import as two unrelated modules, so importing `getCities` from both bundles the city table twice.
