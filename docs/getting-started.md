---
title: "Getting Started"
description: "Install Brazilian Utils, the zero-dependency library of utilities for Brazilian data, import a util, check the supported runtimes and keep your bundle small."
keywords: ["Brazilian Utils", "install", "npm", "tree-shaking", "bundle size", "subpath imports", "Node.js", "Bun", "Deno", "browser", "AI assistants", "Context7"]
---

Brazilian Utils is a zero-dependency library of small utilities for the day-to-day problems of building software for Brazil: validating, formatting, parsing and generating CPF, CNPJ, CEP, boleto, Pix, phone numbers, holidays and more.

## Why Brazilian Utils

- **Zero runtime dependencies.** Nothing else lands in your `node_modules` or in your bundle.
- **Tree-shakeable, down to the function.** `import { isValidCpf }` costs about 0.5 KB minified (0.3 KB gzipped). Every util is also its own subpath entry, so the heavy ones can be lazy-loaded.
- **Runs everywhere.** Node.js `^20.19.0 || >=22.12.0`, Bun, Deno and evergreen browsers, all tested in CI.
- **Written in TypeScript.** Types ship with the package, and every pull request is checked against the last release so the public API never changes silently.
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

The [utilities reference](utilities.md) lists every function, grouped by family, with its options and examples. The [guides](guides/document-field.md) show a CPF field in React, Angular, Vue and plain JavaScript.

## AI assistants

The documentation is indexed on Context7 as [`/brazilian-utils/javascript`](https://context7.com/brazilian-utils/javascript). In a coding agent connected to the Context7 MCP server, name the library in the prompt and the agent skips the library search:

```text
Validate a CNPJ with Brazilian Utils. use library /brazilian-utils/javascript
```

To stop repeating it, add a rule to the agent's instructions file (`CLAUDE.md`, Cursor rules or the equivalent): "For Brazilian document utils, use the Context7 library /brazilian-utils/javascript".

Without Context7, point the assistant at [llms.txt](https://brazilian-utils.com.br/llms.txt), which lists every util with a one-line description, or at [llms-full.txt](https://brazilian-utils.com.br/llms-full.txt), the whole English documentation in one Markdown file.

## Bundle size

The package is tree-shakeable: importing one util from the root pulls in only that util's code. `isValidCpf`, for example, adds about 0.5 KB minified (0.3 KB gzipped) to your bundle.

A few utils embed an official dataset and weigh far more than everything else combined:

| Util | Dataset | Minified | Gzipped |
| --- | --- | --- | --- |
| `getCid10` | CID-10 V2008 categories and subcategories, with the DATASUS descriptions | 988.2 KB | 123.5 KB |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 IBGE municipalities, with names and codes | 153.6 - 154.0 KB | 49.4 - 49.7 KB |
| `getCities` | 5571 IBGE municipality names | 153.4 KB | 49.2 KB |
| `getMunicipalityByCep` | The IBGE municipality table above, plus 5573 Correios CEP ranges | 221.1 KB | 69.9 KB |
| `getCbo` | CBO 2002 occupation titles | 115.7 KB | 29.5 KB |
| `getCest` | CEST descriptions and segments (Convênio ICMS 142/18) | 115.6 KB | 26.1 KB |
| `getCnae` | CNAE-Subclasses 2.3 | 91.6 KB | 20.0 KB |
| `isValidNcm` | NCM (Nomenclatura Comum do Mercosul) codes | 82.6 KB | 22.8 KB |
| `getNbs` | NBS 2.0 (Nomenclatura Brasileira de Serviços) descriptions | 80.6 KB | 13.1 KB |
| `getCfop` | CFOP operation descriptions | 67.6 KB | 6.3 KB |
| `getClassTrib` | cClassTrib (IBS/CBS) names and descriptions | 50.0 KB | 9.0 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | Banco Central STR participants (COMPE + ISPB) | 37.5 - 37.8 KB | 9.0 - 9.2 KB |
| `isValidCid10` | CID-10 V2008 category and subcategory codes, without the descriptions | 26.2 KB | 6.8 KB |
| `getServiceItem` | Service list of the Lei Complementar 116/2003 | 26.1 KB | 8.4 KB |
| `isValidCbo` | CBO 2002 occupation codes, without the titles | 16.2 KB | 5.5 KB |
| `isValidCnae` | CNAE-Subclasses 2.3 codes, without the descriptions | 9.6 KB | 3.4 KB |
| `isValidNbs` | NBS 2.0 codes, without the descriptions | 8.5 KB | 2.3 KB |
| `isValidCest` | CEST codes, without the descriptions | 7.6 KB | 2.3 KB |

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
