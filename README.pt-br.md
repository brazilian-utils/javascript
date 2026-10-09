<div align="center">
<img src="https://raw.githubusercontent.com/brazilian-utils/brand/main/github-hero/github-hero-js.png" width="100%" alt="Brazilian Utils" />

<p>Utilitários para dados brasileiros: CPF, CNPJ, CEP, boleto, Pix, feriados e mais.</p>

[📖 Documentação](https://brazilian-utils.com.br/pt-br/libs/javascript/) · [🇺🇸 Read in English](https://github.com/brazilian-utils/javascript/blob/main/README.md)

[![npm version](https://img.shields.io/npm/v/@brazilian-utils/brazilian-utils.svg)](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils) [![Downloads per month](https://img.shields.io/npm/dm/@brazilian-utils/brazilian-utils.svg)](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils) [![License: MIT](https://img.shields.io/github/license/brazilian-utils/javascript.svg)](https://github.com/brazilian-utils/javascript/blob/main/LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://github.com/brazilian-utils/javascript/blob/main/CONTRIBUTING.md#zero-runtime-dependencies) [![TypeScript](https://img.shields.io/npm/types/@brazilian-utils/brazilian-utils)](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils)
[![Build Status](https://github.com/brazilian-utils/javascript/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/brazilian-utils/javascript/actions/workflows/build.yml?query=branch%3Amain) [![Tests](https://github.com/brazilian-utils/javascript/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/brazilian-utils/javascript/actions/workflows/tests.yml?query=branch%3Amain) [![codecov](https://codecov.io/gh/brazilian-utils/javascript/branch/main/graph/badge.svg)](https://codecov.io/gh/brazilian-utils/javascript) [![Mutation tests](https://github.com/brazilian-utils/javascript/actions/workflows/mutation.yml/badge.svg?branch=main)](https://github.com/brazilian-utils/javascript/actions/workflows/mutation.yml?query=branch%3Amain) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/brazilian-utils/javascript/badge)](https://scorecard.dev/viewer/?uri=github.com/brazilian-utils/javascript) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14695/badge)](https://www.bestpractices.dev/projects/14695)

</div>

# Introdução

Brazilian Utils é uma biblioteca de utilitários, sem dependências, para os problemas do dia a dia de quem desenvolve software para o Brasil: validar, formatar, interpretar e gerar CPF, CNPJ, CEP, boleto, Pix, telefone, feriados e mais.

## Por que Brazilian Utils

- **Zero dependências de runtime.** Nada além da biblioteca entra no seu `node_modules` ou no seu bundle.
- **Tree-shakeable até a função.** `import { isValidCpf }` custa cerca de 0,5 KB minificado (0,3 KB com gzip). Cada utilitário também é um subpath próprio, então os pesados podem ser carregados sob demanda.
- **Roda em qualquer lugar.** Node.js `^20.19.0 || >=22.12.0`, Bun, Deno e navegadores modernos, todos testados no CI.
- **Escrita em TypeScript.** Os tipos vêm no pacote, e todo pull request é comparado com a última versão publicada para que a API pública nunca mude em silêncio.
- **Validada contra as regras oficiais.** Cada validador cita a especificação, lei ou base de dados que implementa, e a suíte de testes passa por mutation testing, não só por cobertura.
- **Documentada em inglês e português**, com um `llms.txt` para assistentes de IA.

## Instalação

```bash
npm install @brazilian-utils/brazilian-utils
```

O mesmo pacote funciona com `yarn add`, `pnpm add` e `bun add`. Em uma tag `<script>` ele expõe a global `BrazilianUtils`:

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
```

### Runtimes suportados

A faixa suportada é o campo `engines` do `package.json`. Cada linha abaixo roda no [workflow de testes](https://github.com/brazilian-utils/javascript/actions/workflows/tests.yml?query=branch%3Amain) em todo pull request.

| Runtime     | Suportado                 | Testado no CI                 |
| ----------- | ------------------------- | ----------------------------- |
| Node.js     | `^20.19.0 \|\| >=22.12.0` | 20, 22, 24, 26                |
| Bun         | mais recente              | mais recente                  |
| Deno        | 2.x                       | 2.x                           |
| Navegadores | modernos                  | Chrome, Firefox, Edge, Safari |

## Como usar

Importe a função que precisar:

```javascript
import { isValidCpf } from "@brazilian-utils/brazilian-utils";

isValidCpf("1232454233345"); // false
```

A [referência de utilitários](https://brazilian-utils.com.br/pt-br/libs/javascript/) lista todas as funções, agrupadas por família, com opções e exemplos. Os [guias](https://brazilian-utils.com.br/pt-br/guides/) mostram um campo de CPF, um formulário de endereço e mais em React, Angular, Vue e JavaScript puro, e o [guia de migração](https://brazilian-utils.com.br/pt-br/guides/javascript/migration-v1-to-v2/) explica como sair da v1.

- Usa um assistente de código com IA? A documentação está indexada no Context7 como [`/brazilian-utils/javascript`](https://context7.com/brazilian-utils/javascript), e o [llms.txt](https://brazilian-utils.com.br/llms.txt) lista todos os utilitários para outras ferramentas. Veja [Assistentes de IA](https://github.com/brazilian-utils/javascript/blob/main/docs/pt-br/getting-started.md#assistentes-de-ia).
- O pacote é tree-shakeable. Cada utilitário também está disponível como um subpath próprio (por exemplo, `@brazilian-utils/brazilian-utils/get-cities`), então dá para carregar sob demanda os poucos que são pesados. Veja [Tamanho do bundle](https://github.com/brazilian-utils/javascript/blob/main/docs/pt-br/getting-started.md#tamanho-do-bundle).

## Desenvolvimento

Este repositório usa o Vite+ como ferramenta local. Ele é instalado como dependência, então não é preciso instalar nada globalmente além do Node.js 24 (a versão do `.nvmrc`, que a ferramenta exige; a biblioteca em si suporta Node.js `^20.19.0 || >=22.12.0`).

```bash
npm install
npm run check
npm test
npm run build
```

O [CONTRIBUTING.md](https://github.com/brazilian-utils/javascript/blob/main/CONTRIBUTING.md) lista todos os scripts e as verificações pelas quais um pull request passa.

As notas de cada versão são publicadas nas [GitHub Releases](https://github.com/brazilian-utils/javascript/releases).

## Contribuidores

Nosso "obrigado" vai para [todas as pessoas que contribuíram](https://github.com/brazilian-utils/javascript/blob/main/README.md#contributors). Este projeto segue a especificação [all-contributors](https://github.com/kentcdodds/all-contributors), e contribuições de qualquer tipo são bem-vindas!

## Licença

[MIT](https://github.com/brazilian-utils/javascript/blob/main/LICENSE)
