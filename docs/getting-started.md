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

The [utilities reference](utilities.md) lists every function, grouped by family, with its options and examples. The [guides](guides/document-field.md) show a CPF field in React, Angular, Vue and plain JavaScript.

## Command line

The package ships a `brazilian-utils` command that runs any utility from a terminal or a shell script, with no install needed:

```bash
npx @brazilian-utils/brazilian-utils isValidCpf 12345678909           # true
npx @brazilian-utils/brazilian-utils generateCpf                      # 45654643304
npx @brazilian-utils/brazilian-utils formatCnpj 12345678000195 --obfuscate # **.345.678/0001-**
npx @brazilian-utils/brazilian-utils getBankByCode 001                # { "code": "001", "ispb": "00000000", ... }
```

`bunx @brazilian-utils/brazilian-utils` runs the same command, and Deno runs it as `deno run npm:@brazilian-utils/brazilian-utils`, asking for the permissions it needs (only the two CEP lookups reach the network). Once the package is installed in a project it is `npx brazilian-utils`, or plain `brazilian-utils` in a `package.json` script.

The command is a generic dispatcher over the public API: the first argument is the name of a utility, exactly as it is exported, and the rest maps to its arguments.

| You write                    | The utility receives                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `isValidIe SP 110042490114`  | Positional values, in order: `isValidIe("SP", "110042490114")`                                                |
| `--key value`, `--key=value` | An entry of the options (or params) object; `--state-code` and `--stateCode` are the same key                 |
| `--flag`, `--no-flag`        | A boolean option set to `true` or to `false`: `formatCurrency 10 --symbol`, `isBusinessDay 2026-02-17 --no-include-optional` |
| `--json '<object>'`          | The options (or params) object as JSON; options given next to it win                                          |
| `-`, or no value in a pipe   | The value is read from stdin: `echo 12345678909 \| brazilian-utils formatCpf --obfuscate`                     |
| `--`                         | Ends the options, so that a value starting with `--` is read as a value                                       |

A utility whose first argument is an options object, such as `isHoliday`, `getHolidays` or `isValidBankAccount`, never takes a value from stdin on its own: it reads stdin only where you write `-`. So `brazilian-utils isHoliday --target-date 2026-09-07` answers the same inside a script whose own stdin is a file or a pipe.

Values stay strings (so `001` keeps its zeros), except where the utility expects a number, a list (comma separated: `--accept cpf,cnpj`) or a date. Dates are written `YYYY-MM-DD`, mean that local calendar day, and are printed the same way:

```bash
brazilian-utils addBusinessDays 2026-09-04 1                   # 2026-09-08
brazilian-utils getHolidays --year 2026 --state-code SP        # [{ "name": "Ano novo", "date": "2026-01-01", ... }]
brazilian-utils isValidBankAccount --json '{"bankCode":"001","agency":"1234","account":"12345678","digit":"9"}'
brazilian-utils getAddressInfoByCep 01001000                   # awaits the lookup, then prints the address
```

Strings and numbers are printed as they are, a date as its `YYYY-MM-DD` local day (inside JSON too), anything else as JSON. The exit code is `0` on success, `1` when the answer is negative (`false`, `null`, or the empty string a formatter answers with when it cannot read its value) or the utility throws (the error goes to stderr), and `2` when the command line itself is wrong, so a validator works as a shell condition:

```bash
if brazilian-utils isValidCnpj "$CNPJ" > /dev/null; then echo "ok"; fi
```

`brazilian-utils list` prints the name of every utility, `--help` the usage and `--version` the version of the package. The command is a separate file that no entry point of the library imports, so it adds nothing to your bundle.

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
