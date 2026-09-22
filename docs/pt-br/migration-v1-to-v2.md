---
title: "Guia de migração: v1 para v2"
description: "Como migrar um projeto do Brazilian Utils v1.x para a v2: os exports renomeados, os aliases descontinuados que ainda funcionam e um checklist para seguir."
keywords: ["migração", "v1", "v2", "descontinuado", "exports renomeados", "atualização"]
---

Este guia mostra como migrar um projeto do Brazilian Utils v1.x para a v2.

## Resumo

A v2 renomeia todas as funções para camelCase (`formatCPF` agora é `formatCpf`), mas mantém os nomes da v1 como aliases descontinuados, então a maioria dos projetos atualiza sem mudar código. O TypeScript e o editor marcam os nomes antigos. Os aliases são removidos na v3.0.0.

Quatro helpers da v1 eram internos e não têm alias. Substitua-os antes de atualizar:

| v1 | Substituto |
|---|---|
| `onlyNumbers(value)` | `value.replace(/\D/g, '')` |
| `isLastChar(index, input)` | `index === input.length - 1` |
| `generateChecksum` | Não é mais exportada. Escreva o cálculo do dígito verificador que precisar. |
| `generateRandomNumber(length)` | Um laço próprio sobre `Math.floor(Math.random() * 10)`. |

## O que mudou

- **Os nomes são camelCase.** Veja [Funções renomeadas](#funções-renomeadas).
- **O tree-shaking funciona até a função**, e cada utilitário também é um subpath próprio (`@brazilian-utils/brazilian-utils/is-valid-cpf`), então os pesados podem ser carregados sob demanda. Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle).
- **CNPJ alfanumérico.** `isValidCnpj` e `generateCnpj` aceitam o novo formato alfanumérico com `{ version: 2 }`. O numérico (versão 1) continua sendo o padrão. Veja [`generateCnpj` e a versão](#generatecnpj-e-a-versão).
- **`getAddressInfoByCep`** aceita a opção `providers`, completa com zeros um CEP numérico e lança erros tipados: `GetAddressInfoByCepValidationError`, `GetAddressInfoByCepNotFoundError` e `GetAddressInfoByCepServiceError`. Chamadas sem opções funcionam como na v1.
- **`getCities`** retorna a lista em ordem alfabética. Desde a 2.4.0 está descontinuada: `getMunicipalities('SP')` retorna os mesmos municípios com seus códigos IBGE, e `getMunicipalityByCode('3550308')` busca um deles offline.
- **`isValidIe`** recebe um único objeto desde a 2.4.0, `isValidIe({ value, stateCode })`. A forma posicional está descontinuada.
- **Muitos utilitários novos** desde a v2: feriados e dias úteis, Pix, chave de NF-e, leitura de boleto, formatação de telefone, contas bancárias e consulta de bancos, códigos de classificação (CBO, CNAE, NCM, CFOP), municípios offline, números por extenso e mais. Todos estão na [referência de utilitários](pt-br/utilities.md).
- **As ferramentas** mudaram para Vite+ e Vitest, com testes em navegador no CI. Isso só importa para quem contribui; veja o [CONTRIBUTING.md](https://github.com/brazilian-utils/javascript/blob/main/CONTRIBUTING.md).

## Funções renomeadas

Todos os outros exports mantêm o nome da v1.

| v1 | v2 |
|---|---|
| `isValidCPF` | `isValidCpf` |
| `isValidCNPJ` | `isValidCnpj` |
| `isValidCEP` | `isValidCep` |
| `isValidPIS` | `isValidPis` |
| `isValidIE` | `isValidIe` |
| `formatCPF` | `formatCpf` |
| `formatCNPJ` | `formatCnpj` |
| `formatCEP` | `formatCep` |
| `generateCPF` | `generateCpf` |
| `generateCNPJ` | `generateCnpj` |

Antes (v1):

```javascript
import { isValidCPF, formatCPF, generateCNPJ } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCPF('12345678909');
const formatted = formatCPF('12345678909');
const cnpj = generateCNPJ();
```

Depois (v2):

```javascript
import { isValidCpf, formatCpf, generateCnpj } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCpf('12345678909');
const formatted = formatCpf('12345678909');
const cnpj = generateCnpj();
```

### `generateCnpj` e a versão

`generateCnpj()` sem argumentos gera um CNPJ numérico na v2.x. Na v3.0.0 vai sortear entre numérico e alfanumérico, então passe a versão quando precisar de uma específica:

```javascript
generateCnpj(1); // sempre numérico
generateCnpj(2); // sempre alfanumérico, ex.: "Q0SLFMBD7VX439"
generateCnpj(); // numérico hoje, aleatório na v3.0.0
```

`isValidCnpj` valida CNPJs numéricos por padrão. Para validar alfanuméricos, passe `{ version: 2 }`:

```javascript
isValidCnpj('12.345.678/0001-95'); // true
isValidCnpj('Q0.SLF.MBD/7VX4-39', { version: 2 }); // true
isValidCnpj('Q0.SLF.MBD/7VX4-39'); // false (só numérico sem a opção)
```

### Erros de `getAddressInfoByCep`

```javascript
import {
  getAddressInfoByCep,
  GetAddressInfoByCepValidationError,
  GetAddressInfoByCepNotFoundError,
  GetAddressInfoByCepServiceError
} from '@brazilian-utils/brazilian-utils';

try {
  const address = await getAddressInfoByCep('01310100');
} catch (error) {
  if (error instanceof GetAddressInfoByCepValidationError) {
    // CEP inválido
  } else if (error instanceof GetAddressInfoByCepNotFoundError) {
    // nenhum endereço para este CEP
  } else if (error instanceof GetAddressInfoByCepServiceError) {
    // os provedores falharam
  }
}
```

## Checklist

Obrigatório antes de atualizar:

- [ ] Substituir `onlyNumbers`, `isLastChar`, `generateChecksum` e `generateRandomNumber`.

Recomendado antes da v3.0.0:

- [ ] Renomear os imports e as chamadas da tabela acima para camelCase.
- [ ] Trocar `getCities` por `getMunicipalities` e `getMunicipality` por `getMunicipalityByCode`.
- [ ] Chamar `isValidIe({ value, stateCode })` em vez de `isValidIe(stateCode, ie)`.
- [ ] Importar os tipos `*Params` em vez dos aliases `*Options` das funções que recebem um único objeto.
- [ ] Tirar `'widenet'` dos `providers` de `getAddressInfoByCep` (o serviço não existe mais).
- [ ] Passar a versão para `generateCnpj` quando precisar de uma específica.

Encontrou um bug na migração? [Abra uma issue](https://github.com/brazilian-utils/javascript/issues).
