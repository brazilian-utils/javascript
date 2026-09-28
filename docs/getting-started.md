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
| `getCid10` | CID-10 V2008 categories and subcategories plus the SIM `U07` codes, with the DATASUS descriptions | 988.3 KB | 123.6 KB |
| `getMunicipalitiesByAreaCode` · `getAreaCodeByMunicipalityCode` | 5571 IBGE municipalities, with the DDD of each (Anatel) | 165.0 - 167.8 KB | 52.1 - 52.8 KB |
| `getMunicipalities` · `getMunicipalityByCode` · `getCodeByMunicipalityName` · `getMunicipality` | 5571 IBGE municipalities, with names and codes | 153.6 - 154.2 KB | 49.4 - 49.8 KB |
| `getCities` | 5571 IBGE municipality names | 153.4 KB | 49.2 KB |
| `getCest` | CEST descriptions and segments (Convênio ICMS 142/18) | 111.5 KB | 24.0 KB |
| `getCbo` | CBO 2002 occupation titles | 107.6 KB | 24.7 KB |
| `getCnae` | CNAE-Subclasses 2.3 | 86.6 KB | 17.9 KB |
| `getNbs` | NBS 2.0 (Nomenclatura Brasileira de Serviços) descriptions | 75.5 KB | 11.5 KB |
| `getCfop` | CFOP operation descriptions | 66.7 KB | 5.2 KB |
| `getClassTrib` | cClassTrib (IBS/CBS) names and descriptions | 50.0 KB | 9.0 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | Banco Central STR participants (COMPE + ISPB) | 37.6 - 37.8 KB | 9.0 - 9.2 KB |
| `isValidNcm` | NCM (Nomenclatura Comum do Mercosul) codes | 29.6 KB | 8.9 KB |
| `getIsbnInfo` · `formatIsbn` | ISBN ranges of the International ISBN Agency (RangeMessage) | 27.0 - 27.1 KB | 6.2 KB |
| `isValidCid10` | CID-10 V2008 category and subcategory codes plus the SIM `U07` codes, without the descriptions | 26.2 KB | 6.8 KB |
| `getServiceItem` | Service list of the Lei Complementar 116/2003 | 26.0 KB | 8.0 KB |
| `isValidCbo` | CBO 2002 occupation codes, without the titles | 6.6 KB | 1.7 KB |
| `isValidCnae` | CNAE-Subclasses 2.3 codes, without the descriptions | 4.5 KB | 1.9 KB |
| `isValidCest` | CEST codes, without the descriptions | 3.5 KB | 0.8 KB |
| `isValidNbs` | NBS 2.0 codes, without the descriptions | 3.4 KB | 1.2 KB |

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
