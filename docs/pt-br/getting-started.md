---
title: "Introdução"
description: "Instale o Brazilian Utils, a biblioteca sem dependências de utilitários para dados brasileiros, importe um utilitário, veja os runtimes suportados e mantenha o bundle pequeno."
keywords: ["Brazilian Utils", "instalação", "npm", "tree-shaking", "tamanho do bundle", "subpath", "Node.js", "Bun", "Deno", "navegador", "assistentes de IA", "Context7"]
---

Brazilian Utils é uma biblioteca de utilitários, sem dependências, para os problemas do dia a dia de quem desenvolve software para o Brasil: validar, formatar, interpretar e gerar CPF, CNPJ, CEP, boleto, Pix, telefone, feriados e mais.

## Por que Brazilian Utils

- **Zero dependências de runtime.** Nada além da biblioteca entra no seu `node_modules` ou no seu bundle.
- **Tree-shakeable até a função.** `import { isValidCpf }` custa cerca de 1,4 KB minificado (0,8 KB com gzip). Cada utilitário também é um subpath próprio, então os pesados podem ser carregados sob demanda.
- **Roda em qualquer lugar.** Node.js `^20.19.0 || >=22.12.0`, Bun, Deno e navegadores modernos, todos testados no CI.
- **Escrita em TypeScript.** Os tipos vêm no pacote, e um relatório de API acompanha a API pública para que nada mude em silêncio.
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

| Runtime     | Suportado                 | Testado no CI                 |
| ----------- | ------------------------- | ----------------------------- |
| Node.js     | `^20.19.0 \|\| >=22.12.0` | 20, 22, 24, 26                |
| Bun         | mais recente              | mais recente                  |
| Deno        | 2.x                       | 2.x                           |
| Navegadores | modernos                  | Chrome, Firefox, Edge, Safari |

## Como usar

Importe a função que precisar:

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('1232454233345'); // false
```

A [referência de utilitários](pt-br/utilities.md) lista todas as funções, agrupadas por família, com opções e exemplos. Os [guias](pt-br/guides/document-field.md) mostram um campo de CPF em React, Angular, Vue e JavaScript puro.

## Assistentes de IA

A documentação está indexada no Context7 como [`/brazilian-utils/javascript`](https://context7.com/brazilian-utils/javascript). Em um agente de código conectado ao servidor MCP do Context7, cite a biblioteca no prompt e o agente pula a busca pela biblioteca:

```text
Valide um CNPJ com o Brazilian Utils. use library /brazilian-utils/javascript
```

Para não repetir isso a cada prompt, coloque uma regra no arquivo de instruções do agente (`CLAUDE.md`, regras do Cursor ou equivalente): "Para utilitários de documentos brasileiros, use a biblioteca /brazilian-utils/javascript do Context7".

Sem o Context7, aponte o assistente para o [llms.txt](https://brazilian-utils.com.br/llms.txt), que lista todos os utilitários com uma descrição de uma linha, ou para o [llms-full.txt](https://brazilian-utils.com.br/llms-full.txt), a documentação completa em inglês em um único arquivo Markdown.

## Tamanho do bundle

O pacote é tree-shakeable: importar um utilitário da raiz traz apenas o código daquele utilitário. `isValidCpf`, por exemplo, adiciona cerca de 1,4 KB minificado (0,8 KB com gzip) ao seu bundle.

Alguns utilitários embutem uma base de dados oficial e pesam muito mais que todos os outros somados:

| Utilitário | Base de dados | Minificado | Gzip |
| --- | --- | --- | --- |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 municípios do IBGE, com nomes e códigos | 154,9 - 156,5 KB | 50,3 - 50,4 KB |
| `getCities` | nomes dos 5571 municípios do IBGE | 154,2 KB | 49,8 KB |
| `isValidNcm` | códigos NCM (Nomenclatura Comum do Mercosul) | 114,2 KB | 24,6 KB |
| `isValidCbo` · `getCbo` | títulos das ocupações da CBO 2002 | 119,1 KB | 30,6 KB |
| `isValidCnae` · `getCnae` | CNAE-Subclasses 2.3 | 93,9 KB | 21,2 KB |
| `isValidCfop` · `getCfop` | descrições das operações do CFOP | 68,9 KB | 6,9 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | participantes do STR do Banco Central (COMPE + ISPB) | 38,3 - 38,6 KB | 9,5 - 9,7 KB |

A raiz do pacote é um único módulo ESM, então o bundler não consegue separar uma dessas bases de dados dele: importar um utilitário pesado da raiz coloca a base inteira no seu bundle principal, e um `import()` dinâmico da raiz não ajuda. Para carregar sob demanda, importe do subpath próprio:

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

Todo utilitário tem um subpath, `@brazilian-utils/brazilian-utils/<nome-do-utilitario>` em kebab-case (`isValidCpf` vira `is-valid-cpf`).

Escolha um estilo por utilitário em cada aplicação. O bundler trata o import da raiz e o import do subpath como dois módulos independentes, então importar `getCities` dos dois inclui a tabela de municípios duas vezes.
