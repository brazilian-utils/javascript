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

## Linha de comando

O pacote traz o comando `brazilian-utils`, que executa qualquer utilitário a partir do terminal ou de um shell script, sem precisar instalar nada:

```bash
npx @brazilian-utils/brazilian-utils isValidCpf 12345678909           # true
npx @brazilian-utils/brazilian-utils generateCpf                      # 45654643304
npx @brazilian-utils/brazilian-utils formatCnpj 12345678000195 --obfuscate # **.345.678/0001-**
npx @brazilian-utils/brazilian-utils getBankByCode 001                # { "code": "001", "ispb": "00000000", ... }
```

`bunx @brazilian-utils/brazilian-utils` executa o mesmo comando, e no Deno ele é `deno run npm:@brazilian-utils/brazilian-utils`, que pede as permissões necessárias (só as duas consultas de CEP acessam a rede). Com o pacote instalado no projeto ele vira `npx brazilian-utils`, ou só `brazilian-utils` em um script do `package.json`.

O comando é um despachante genérico sobre a API pública: o primeiro argumento é o nome de um utilitário, exatamente como ele é exportado, e o restante vira os argumentos dele.

| Você escreve                 | O utilitário recebe                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `isValidIe SP 110042490114`  | Valores posicionais, em ordem: `isValidIe("SP", "110042490114")`                                              |
| `--key value`, `--key=value` | Uma entrada do objeto de opções (ou de parâmetros); `--state-code` e `--stateCode` são a mesma chave          |
| `--flag`, `--no-flag`        | Uma opção booleana com valor `true` ou `false`: `formatCurrency 10 --symbol`, `isBusinessDay 2026-02-17 --no-include-optional` |
| `--json '<objeto>'`          | O objeto de opções (ou de parâmetros) em JSON; as opções passadas junto com ele têm prioridade                |
| `-`, ou nenhum valor em pipe | O valor é lido da stdin: `echo 12345678909 \| brazilian-utils formatCpf --obfuscate`                          |
| `--`                         | Encerra as opções, para que um valor que começa com `--` seja lido como valor                                 |

Um utilitário cujo primeiro argumento é um objeto de opções, como `isHoliday`, `getHolidays` ou `isValidBankAccount`, nunca pega um valor da stdin por conta própria: ele só lê a stdin onde você escreve `-`. Assim `brazilian-utils isHoliday --target-date 2026-09-07` responde a mesma coisa dentro de um script cuja stdin é um arquivo ou um pipe.

Os valores continuam sendo strings (assim `001` mantém os zeros), exceto onde o utilitário espera um número, uma lista (separada por vírgulas: `--accept cpf,cnpj`) ou uma data. Datas são escritas como `YYYY-MM-DD`, representam esse dia do calendário local e são impressas do mesmo jeito:

```bash
brazilian-utils addBusinessDays 2026-09-04 1                   # 2026-09-08
brazilian-utils getHolidays --year 2026 --state-code SP        # [{ "name": "Ano novo", "date": "2026-01-01", ... }]
brazilian-utils isValidBankAccount --json '{"bankCode":"001","agency":"1234","account":"12345678","digit":"9"}'
brazilian-utils getAddressInfoByCep 01001000                   # aguarda a consulta e imprime o endereço
```

Strings e números são impressos como estão, uma data como o seu dia local `YYYY-MM-DD` (também dentro do JSON), e todo o resto como JSON. O código de saída é `0` em caso de sucesso, `1` quando a resposta é negativa (`false`, `null` ou a string vazia que um formatador devolve quando não consegue ler o valor) ou quando o utilitário lança um erro (que vai para a stderr), e `2` quando a própria linha de comando está errada, então um validador funciona como condição no shell:

```bash
if brazilian-utils isValidCnpj "$CNPJ" > /dev/null; then echo "ok"; fi
```

`brazilian-utils list` imprime o nome de todos os utilitários, `--help` o modo de uso e `--version` a versão do pacote. O comando é um arquivo separado que nenhum ponto de entrada da biblioteca importa, então não acrescenta nada ao seu bundle.

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
