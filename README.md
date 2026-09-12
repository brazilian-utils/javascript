<div align="center">
<img src="https://raw.githubusercontent.com/brazilian-utils/brand/main/github-hero/github-hero-js.png" width="100%" alt="Brazilian Utils" />

<p>Utils library for Brazilian-specific businesses.</p>

[📖 Documentation](https://brazilian-utils.com.br/#/getting-started)

[![Build Status](https://github.com/brazilian-utils/javascript/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/brazilian-utils/javascript/actions/workflows/build.yml?query=branch%3Amain) [![codecov](https://codecov.io/gh/brazilian-utils/javascript/branch/main/graph/badge.svg)](https://codecov.io/gh/brazilian-utils/javascript)
[![Downloads per month](https://img.shields.io/npm/dm/@brazilian-utils/brazilian-utils.svg)](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils) [![License: MIT](https://img.shields.io/github/license/brazilian-utils/javascript.svg)](LICENSE)

</div>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Contributors](#contributors)
  - [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Getting Started

Brazilian Utils is a library focused on solving problems that we face daily in the development of applications for the Brazilian business.

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
import { isValidCpf } from "@brazilian-utils/brazilian-utils";

isValidCpf("1232454233345"); // false
```

You can check a list of utilities [by clicking here](https://brazilian-utils.com.br/#/utilities).

- The package is tree-shakeable. Every util is also available as its own subpath (e.g. `@brazilian-utils/brazilian-utils/get-cities`) so you can lazy-load the few heavy ones. See [Bundle size](docs/getting-started.md#bundle-size).

## Development

This repository uses Vite+ as the local toolchain.

Requirements:

- Node.js `^20.19.0 || >=22.12.0`
- `vp` installed and available in your shell

Common commands:

```bash
vp install
vp check
vp test
vp run build
```

Release notes are published through [GitHub Releases](https://github.com/brazilian-utils/javascript/releases).

## Contributors

Our "thank you" goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/hyanmandian"><img src="https://avatars2.githubusercontent.com/u/5044101?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Hyan Mandian</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=hyanmandian" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=hyanmandian" title="Documentation">📖</a> <a href="#ideas-hyanmandian" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=hyanmandian" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/lucassveloso"><img src="https://avatars2.githubusercontent.com/u/4587602?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Lucas Veloso</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=lucassveloso" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=lucassveloso" title="Documentation">📖</a> <a href="#ideas-lucassveloso" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=lucassveloso" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/andreoav"><img src="https://avatars2.githubusercontent.com/u/508827?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Andreo Vieira</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=andreoav" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=andreoav" title="Documentation">📖</a> <a href="#ideas-andreoav" title="Ideas, Planning, & Feedback">🤔</a> <a href="#tool-andreoav" title="Tools">🔧</a></td>
    <td align="center"><a href="http://matalmeida.me"><img src="https://avatars3.githubusercontent.com/u/12724212?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matheus Almeida</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=matAlmeida" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=matAlmeida" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=matAlmeida" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/FernandoRogelin"><img src="https://avatars2.githubusercontent.com/u/32275453?s=400&u=55d9685df8b4dc14169719993d4997b2a9adda61&v=4?s=100" width="100px;" alt=""/><br /><sub><b>Fernando Rogelin</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=fernandorogelin" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=fernandorogelin" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=fernandorogelin" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/rodineijf"><img src="https://avatars2.githubusercontent.com/u/24531420?v=4?s=100" width="100px;" alt=""/><br /><sub><b>rodineijf</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=rodineijf" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=rodineijf" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=rodineijf" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://twitter.com/elaurent_"><img src="https://avatars2.githubusercontent.com/u/10627086?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Emerson Laurentino</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=emersonlaurentino" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=emersonlaurentino" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=emersonlaurentino" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Leonardo18"><img src="https://avatars2.githubusercontent.com/u/14338574?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Leonardo Dutra</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=Leonardo18" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=Leonardo18" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=Leonardo18" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://victormagalhaes.codes"><img src="https://avatars3.githubusercontent.com/u/357835?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Victor Magalhães</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=vhfmag" title="Code">💻</a> <a href="#tool-vhfmag" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/fxamauri"><img src="https://avatars0.githubusercontent.com/u/33326988?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Amauri Dias</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=fxamauri" title="Code">💻</a> <a href="#tool-fxamauri" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/felipediogo"><img src="https://avatars3.githubusercontent.com/u/26486135?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Felipe F. Diogo</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=felipediogo" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=felipediogo" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/alanraso"><img src="https://avatars0.githubusercontent.com/u/6992731?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alan Raso</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=alanraso" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=alanraso" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://ftfetter.wordpress.com/"><img src="https://avatars0.githubusercontent.com/u/18450242?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Felipe Fetter</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=ftfetter" title="Documentation">📖</a></td>
    <td align="center"><a href="https://rfoel.com"><img src="https://avatars3.githubusercontent.com/u/19496473?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rafael Franco</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=rfoel" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=rfoel" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/pezzetti"><img src="https://avatars1.githubusercontent.com/u/6005103?s=460&v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rafael Pezzetti</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=pezzetti" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=pezzetti" title="Tests">⚠️</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=pezzetti" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/arfurlaneto"><img src="https://avatars0.githubusercontent.com/u/3330854?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Antonio Roberto Furlaneto</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=arfurlaneto" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=arfurlaneto" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=arfurlaneto" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/felipe-nolleto-nascimento-a2a23788/"><img src="https://avatars2.githubusercontent.com/u/2437673?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Felipe Nolleto Nascimento</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=nolleto" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=nolleto" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=nolleto" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://linkedin.com/in/saulojoab"><img src="https://avatars2.githubusercontent.com/u/37988252?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Saulo Joab</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=saulojoab" title="Documentation">📖</a></td>
    <td align="center"><a href="http://fb.com/arantespp"><img src="https://avatars0.githubusercontent.com/u/16626980?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pedro Arantes</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=arantespp" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=arantespp" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=arantespp" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://fb.com/silvioclecio"><img src="https://avatars0.githubusercontent.com/u/1456829?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Silvio Clécio</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=silvioprog" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=silvioprog" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=silvioprog" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/saculbr"><img src="https://avatars1.githubusercontent.com/u/4311885?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Lucas Nascimento</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=saculbr" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://lincon.dev/"><img src="https://avatars3.githubusercontent.com/u/5117676?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Lincon Kusunoki</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=linconkusunoki" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=linconkusunoki" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=linconkusunoki" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://www.engenhandosoftware.com.br/"><img src="https://avatars3.githubusercontent.com/u/11621153?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Marcelo Cristiano</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=marceloabk" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=marceloabk" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=marceloabk" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/tbfreitas"><img src="https://avatars.githubusercontent.com/u/8523621?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tarcísio Batista de Freitas Junior</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=tbfreitas" title="Documentation">📖</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/lucas-carrias-474081195/"><img src="https://avatars.githubusercontent.com/u/24925816?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Lucas Carrias</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=LucasCarrias" title="Documentation">📖</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=LucasCarrias" title="Tests">⚠️</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=LucasCarrias" title="Code">💻</a> <a href="#tool-LucasCarrias" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/matheusandre1"><img src="https://github.com/matheusandre1.png?size=100" width="100px;" alt=""/><br /><sub><b>Matheus Andre</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=matheusandre1" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/Henrique-volponi"><img src="https://github.com/Henrique-volponi.png?size=100" width="100px;" alt=""/><br /><sub><b>Henrique Volponi</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=Henrique-volponi" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/lindsay-qive"><img src="https://github.com/lindsay-qive.png?size=100" width="100px;" alt=""/><br /><sub><b>Lindsay Ferreira</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=lindsay-qive" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/vicentevendramin"><img src="https://github.com/vicentevendramin.png?size=100" width="100px;" alt=""/><br /><sub><b>Vicente Vendramin</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=vicentevendramin" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/joaopedroassad"><img src="https://github.com/joaopedroassad.png?size=100" width="100px;" alt=""/><br /><sub><b>Joao Assad</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=joaopedroassad" title="Code">💻</a> <a href="https://github.com/brazilian-utils/javascript/commits?author=joaopedroassad" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/JanderSilv"><img src="https://github.com/JanderSilv.png?size=100" width="100px;" alt=""/><br /><sub><b>Jander Silva</b></sub></a><br /><a href="https://github.com/brazilian-utils/javascript/commits?author=JanderSilv" title="Code">💻</a></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind are welcome!

## License

[MIT](LICENSE)
