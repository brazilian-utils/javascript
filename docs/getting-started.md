---
title: "Getting Started"
description: "Install Brazilian Utils, the zero-dependency utils library for Brazilian businesses, and learn how to import a util, which runtimes are supported and how the bundle size behaves."
keywords: ["Brazilian Utils", "install", "npm", "tree-shaking", "bundle size", "subpath imports", "Node.js", "Bun", "Deno", "browser", "AI assistants", "Context7", "MCP"]
---

Brazilian Utils is a library focused on solving problems that we face daily in the development of applications for the Brazilian business.

## Why Brazilian Utils

- **Zero runtime dependencies.** Nothing else lands in your `node_modules` or in your bundle.
- **Tree-shakeable, down to the function.** `import { isValidCpf }` costs about 1.4 KB minified (0.8 KB gzipped); every util is also its own subpath entry (`@brazilian-utils/brazilian-utils/get-cities`) for the heavy ones.
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

To stop repeating it, add the rule to the agent's instructions file (`CLAUDE.md`, Cursor rules or the equivalent): "For Brazilian document utils, use the Context7 library /brazilian-utils/javascript".

Without Context7, point the assistant at [llms.txt](https://brazilian-utils.com.br/llms.txt), which lists every util with a one-line description and a link to its section, or at [llms-full.txt](https://brazilian-utils.com.br/llms-full.txt), the whole English documentation in one Markdown file.

## MCP server

The package also ships `brazilian-utils-mcp`, a [Model Context Protocol](https://modelcontextprotocol.io) server that hands every util to an agent as a tool. The agent then validates a CPF, reads a boleto or looks an IBGE municipality up by calling the library, instead of answering from memory:

```bash
npx -y --package=@brazilian-utils/brazilian-utils brazilian-utils-mcp
```

It is a local server over stdio, so it goes in the client's configuration file the way any other one does. The same block works in Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows), in Claude Code (`.mcp.json` at the root of the project) and in Cursor (`.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` for every project):

```json
{
  "mcpServers": {
    "brazilian-utils": {
      "command": "npx",
      "args": ["-y", "--package=@brazilian-utils/brazilian-utils", "brazilian-utils-mcp"]
    }
  }
}
```

In Claude Code, `claude mcp add brazilian-utils -- npx -y --package=@brazilian-utils/brazilian-utils brazilian-utils-mcp` writes that file for you. Restart the client, and a prompt such as "is 111.444.777-35 a valid CPF, and which holidays does São Paulo have in 2026?" reaches the tools.

There is one tool per util, named exactly as the function is exported (`isValidCpf`, `formatCnpj`, `getHolidays`), taking the same arguments and answering with its result as JSON. Documents are passed as strings, so leading zeros survive, and dates are written `YYYY-MM-DD`. An invalid value is an ordinary answer, not a failure: validators answer `false`, formatters and parsers `""`, lookups `null`. Everything is computed offline from the embedded datasets, `getAddressInfoByCep` and `getCepInfoByAddress` aside, the only two tools that reach the network.

The server implements revision [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) of the specification, which negotiates the protocol version per request, and falls back to the `initialize` handshake of the older revisions, from 2025-11-25 down to 2024-11-05, for clients that speak one of those. It has no dependencies of its own: the stdio transport and the JSON-RPC surface ship with the package. Like the library, it is a separate file that no entry point imports, so it adds nothing to your bundle.

## Bundle size

The package is tree-shakeable: importing one util from the root pulls in only that util's code, not the rest of the library. `isValidCpf`, for example, adds roughly 1.4 KB minified (0.8 KB gzipped) to your bundle. A bundler that supports tree-shaking (webpack, Rollup, esbuild, Vite, etc.) drops every other util.

A handful of utils are the exception: each embeds an official dataset, so it weighs far more than every other util combined. These are their single-import sizes, minified and gzipped:

| Util | Dataset | Minified | Gzipped |
| --- | --- | --- | --- |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 IBGE municipalities, with names and codes | 154.9 - 156.5 KB | 50.3 - 50.4 KB |
| `getCities` | 5571 IBGE municipality names | 154.2 KB | 49.8 KB |
| `isValidNcm` | NCM (Nomenclatura Comum do Mercosul) codes | 114.2 KB | 24.6 KB |
| `isValidCbo` · `getCbo` | CBO 2002 occupation titles | 119.1 KB | 30.6 KB |
| `isValidCnae` · `getCnae` | CNAE-Subclasses 2.3 | 93.9 KB | 21.2 KB |
| `isValidCfop` · `getCfop` | CFOP operation descriptions | 68.9 KB | 6.9 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | Banco Central STR participants (COMPE + ISPB) | 38.3 - 38.6 KB | 9.5 - 9.7 KB |

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

Pick one style per util in a given app: a bundler treats the root import and the subpath import as two unrelated modules, so importing `getCities` from both the root *and* `/get-cities` in the same app bundles the 154.2 KB city table twice, once in each module's own output.
