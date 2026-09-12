# Introdução

Brazilian Utils é uma biblioteca com foco na resolução de problemas que enfrentamos diariamente no desenvolvimento de aplicações para o business brasileiro.

## Por que Brazilian Utils

- **Zero dependências de runtime.** Nada além da lib entra no seu `node_modules` ou no seu bundle.
- **Tree-shakeable até a função.** `import { isValidCpf }` custa menos de 1 KB; cada utilitário também é um subpath próprio (`@brazilian-utils/brazilian-utils/get-cities`) para os mais pesados.
- **Roda em qualquer lugar.** Node.js 20+, Bun, Deno e navegadores modernos, testados no CI em todos eles.
- **Escrita em TypeScript.** Os tipos vêm no pacote; a API pública é acompanhada por um relatório de API, então nada muda em silêncio.
- **Validada contra as regras oficiais.** Cada validador cita a especificação, lei ou base de dados que implementa (`@see` na documentação), e a suíte de testes passa por mutation testing, não só por cobertura.
- **Documentada em inglês e português**, com um `llms.txt` para assistentes de IA.

## Instalação

Você pode instalar o **Brazilian Utils** de algumas formas:

como um pacote npm:

```bash
npm install --save @brazilian-utils/brazilian-utils
```

com gerenciador de pacotes yarn:

```bash
yarn add @brazilian-utils/brazilian-utils
```

com pnpm:

```bash
pnpm add @brazilian-utils/brazilian-utils
```

com bun:

```bash
bun add @brazilian-utils/brazilian-utils
```

ou `<script>` tag (global `BrazilianUtils`):

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
```

### Suporte a runtimes

Node `^20.19.0 || >=22.12.0`, Bun, Deno e navegadores modernos.

## Como usar

Para usar um de nossos utilitários, basta importar a função necessária, como no exemplo abaixo:

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('1232454233345'); // false
```

Você pode conferir a lista de utilitários [clicando aqui](utilities.md).

## Tamanho do bundle

O pacote é tree-shakeable: importar um utilitário da raiz traz apenas o código daquele utilitário, não o resto da biblioteca. `isValidCpf`, por exemplo, adiciona cerca de 0,7 KB minificado ao seu bundle. Um bundler com suporte a tree-shaking (webpack, Rollup, esbuild, Vite etc.) descarta todos os outros utilitários.

Alguns utilitários são a exceção: cada um embute um dataset oficial e pesa muito mais que todos os outros utilitários somados. Estes são os tamanhos de um import isolado, minificado e com gzip:

| Utilitário | Dataset | Minificado | Gzip |
| --- | --- | --- | --- |
| `getMunicipalities` · `getMunicipalityByCode` · `getMunicipality` | 5571 municípios do IBGE, com nomes e códigos | 156 KB | 50 KB |
| `getCities` | nomes dos 5571 municípios do IBGE | 153 KB | 49 KB |
| `isValidNcm` | códigos NCM (Nomenclatura Comum do Mercosul) | 113 KB | 24 KB |
| `isValidCbo` · `getCbo` | títulos das ocupações da CBO 2002 | 110 KB | 27 KB |
| `isValidCnae` · `getCnae` | subclasses da CNAE 2.3 | 93 KB | 21 KB |
| `isValidCfop` · `getCfop` | descrições das operações do CFOP | 55 KB | 5,4 KB |
| `getBanks` · `getBankByCode` | participantes do STR do Banco Central (COMPE + ISPB) | 28 KB | 7,3 KB |

Importar qualquer um deles da raiz, mesmo ao lado de um único utilitário pequeno, traz todo esse dataset para o seu bundle principal, porque este pacote é publicado como um único módulo ESM: um `import()` dinâmico da raiz (`await import('@brazilian-utils/brazilian-utils')`) ainda resolve para esse mesmo arquivo único, então não há como separá-lo sozinho. Um bundler que faz code-splitting precisa de um módulo separado para separar.

Esses módulos separados são os subpaths por utilitário. Carregue um utilitário pesado sob demanda, apenas onde você realmente precisar dos dados dele:

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

Todos os utilitários estão disponíveis dessa forma, como `@brazilian-utils/brazilian-utils/<nome-do-utilitario>` (kebab-case, seguindo o nome da função: `isValidCpf` → `is-valid-cpf`), pelo mesmo motivo de lazy-loading/code-splitting.

Escolha um estilo por utilitário em cada aplicação: um bundler trata o import da raiz e o import do subpath como dois módulos independentes, então importar `getCities` tanto da raiz quanto de `/get-cities` na mesma aplicação inclui a tabela de 153 KB de cidades duas vezes, uma em cada módulo.
