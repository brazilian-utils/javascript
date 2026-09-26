---
title: "Introdução"
description: "Instale o Brazilian Utils, a biblioteca sem dependências de utilitários para dados brasileiros, importe um utilitário, veja os runtimes suportados e mantenha o bundle pequeno."
keywords: ["Brazilian Utils", "instalação", "npm", "tree-shaking", "tamanho do bundle", "subpath", "Node.js", "Bun", "Deno", "navegador", "assistentes de IA", "Context7"]
---

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

O pacote é tree-shakeable: importar um utilitário da raiz traz apenas o código daquele utilitário. `isValidCpf`, por exemplo, adiciona cerca de 0,5 KB minificado (0,3 KB com gzip) ao seu bundle.

Alguns utilitários embutem uma base de dados oficial e pesam muito mais que todos os outros somados:

| Utilitário | Base de dados | Minificado | Gzip |
| --- | --- | --- | --- |
| `getCid10` | categorias e subcategorias da CID-10 V2008, com as descrições do DATASUS | 988,2 KB | 123,5 KB |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 municípios do IBGE, com nomes e códigos | 153,6 - 154,0 KB | 49,4 - 49,7 KB |
| `getCities` | nomes dos 5571 municípios do IBGE | 153,4 KB | 49,2 KB |
| `getMunicipalityByCep` | a tabela de municípios do IBGE acima, mais 5573 faixas de CEP dos Correios | 221,1 KB | 69,9 KB |
| `getCbo` | títulos das ocupações da CBO 2002 | 115,7 KB | 29,5 KB |
| `getCest` | descrições e segmentos do CEST (Convênio ICMS 142/18) | 115,6 KB | 26,1 KB |
| `getCnae` | CNAE-Subclasses 2.3 | 91,6 KB | 20,0 KB |
| `isValidNcm` | códigos NCM (Nomenclatura Comum do Mercosul) | 82,6 KB | 22,8 KB |
| `getNbs` | descrições da NBS 2.0 (Nomenclatura Brasileira de Serviços) | 80,6 KB | 13,1 KB |
| `getCfop` | descrições das operações do CFOP | 67,6 KB | 6,3 KB |
| `getClassTrib` | nomes e descrições do cClassTrib (IBS/CBS) | 50,0 KB | 9,0 KB |
| `getBanks` · `getBankByCode` · `getBankByIspb` | participantes do STR do Banco Central (COMPE + ISPB) | 37,5 - 37,8 KB | 9,0 - 9,2 KB |
| `isValidCid10` | códigos das categorias e subcategorias da CID-10 V2008, sem as descrições | 26,2 KB | 6,8 KB |
| `getServiceItem` | lista de serviços da Lei Complementar 116/2003 | 26,1 KB | 8,4 KB |
| `isValidCbo` | códigos das ocupações da CBO 2002, sem os títulos | 16,2 KB | 5,5 KB |
| `isValidCnae` | códigos da CNAE-Subclasses 2.3, sem as descrições | 9,6 KB | 3,4 KB |
| `isValidNbs` | códigos da NBS 2.0, sem as descrições | 8,5 KB | 2,3 KB |
| `isValidCest` | códigos do CEST, sem as descrições | 7,6 KB | 2,3 KB |

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
