# Guia de Migração: v1 para v2

Este guia irá ajudá-lo a migrar do Brazilian Utils v1.x para v2.0.0.

## TL;DR - Migração Rápida

**Boas notícias!** A v2.x mantém compatibilidade para a maioria das mudanças quebradoras:

**Você pode atualizar para v2.x sem alterar seu código** - nomes antigos de funções como `formatCPF`, `isValidCNPJ`, etc. ainda funcionam
**Você receberá avisos de deprecação** - encorajando você a migrar para os novos nomes
**Nomes antigos serão removidos na v3.0.0** - então migre gradualmente

**Porém**, você deve remover o uso dessas funções helper antes de atualizar:
- `onlyNumbers` → use `string.replace(/\D/g, '')`
- `isLastChar` → use `index === input.length - 1`
- `generateChecksum` → agora apenas interno
- `generateRandomNumber` → agora apenas interno

## Melhorias na v2.0.0

A versão 2.0.0 traz melhorias significativas em arquitetura, ferramentas e experiência do desenvolvedor:

### Melhor Tree Shaking

A biblioteca agora usa exports de módulos ES modernos com o campo `exports` adequado no `package.json`, permitindo melhor tree shaking em bundlers modernos. Você pode importar apenas o que precisa:

```javascript
// Apenas as funções que você importar serão incluídas no seu bundle
import { isValidCpf, formatCpf } from '@brazilian-utils/brazilian-utils';
```

### Estrutura Mais Simples

O código foi reorganizado para melhor manutenibilidade:
- **v1**: Estrutura complexa com diretórios separados `utilities/` e `helpers/`
- **v2**: Estrutura plana com utilitários internos no diretório `_internals/`
- Cada utilitário é autocontido em seu próprio diretório
- Caminhos de importação mais limpos e melhor organização do código

### Ferramentas Modernas

Atualizado para ferramentas modernas e mais rápidas:
- **Build**: Migrado de `tsdx` para uma stack com **Vite+** para builds e scripts mais rápidos
- **Testes**: Migrado de `jest` para **Vitest** (mais rápido, compatível com Jest, nativo ESM)
- **Linting/Formatação**: Migrado de `prettier` + `eslint` para **Biome** (mais rápido, tudo-em-um)
- **TypeScript**: Configuração moderna otimizada para bundlers

### Testes em Browsers

Agora inclui suporte para testes cross-browser:
- Testes rodam em browsers reais (Chrome, Firefox, Safari, Edge)
- Garante compatibilidade entre diferentes ambientes de browser
- Melhor confiança na funcionalidade cross-platform

Execute testes em browsers com:
```bash
npm run test:chrome-browser
npm run test:firefox-browser
npm run test:safari-browser
npm run test:edge-browser
```

### Menos Dependências

Redução de dependências de desenvolvimento mantendo zero dependências de runtime:
- **v1**: Múltiplas ferramentas (tsdx, jest, prettier, eslint, husky, lint-staged, commitlint, etc.)
- **v2**: Dependências mínimas (Vite+, suporte de browser do Vitest, webdriverio)
- Manutenção mais simples e pipelines CI/CD mais rápidos
- Zero dependências de runtime (mantido)

### Novas Funções e Recursos

Adicionadas novas utilitários úteis:
- `getHolidays` - Obtém feriados brasileiros (nacionais e estaduais)
- `getBoletoInfo` - Extrai informações de boleto (valor, vencimento, código do banco)
- `formatPhone` - Formata números de telefone com padrões brasileiros
- `formatBoleto` - Formata números de boleto
- `generateBoleto` - Gera números de boleto válidos aleatórios
- `formatPis` - Formata números de PIS
- `isValidRenavam` - Valida RENAVAM (número de registro de veículos)
- `isValidBankAccount` - Valida contas bancárias brasileiras com algoritmos específicos para principais bancos

#### Suporte a CNPJ Alfanumérico (Versão 2)

A v2.0.0 adiciona suporte ao novo formato alfanumérico de CNPJ introduzido pela Receita Federal. Tanto `isValidCnpj` quanto `generateCnpj` agora suportam CNPJs versão 2 (alfanuméricos):

```javascript
import { isValidCnpj, generateCnpj } from '@brazilian-utils/brazilian-utils';

// Gerar CNPJ alfanumérico
const alphaCnpj = generateCnpj(2); // ex: "Q0SLFMBD7VX439"

// Validar CNPJ alfanumérico (requer opção de versão)
isValidCnpj("Q0.SLF.MBD/7VX4-39", { version: 2 }); // true
isValidCnpj("Q0SLFMBD7VX439", { version: 2 }); // true

// Versão 1 (numérico) é o padrão
isValidCnpj("12.345.678/0001-95"); // true (valida apenas numérico)
isValidCnpj("12.345.678/0001-95", { version: 1 }); // true (explícito)
```

**Importante**: Por padrão, `isValidCnpj()` valida apenas CNPJs numéricos (versão 1). Para validar CNPJs alfanuméricos, você deve passar explicitamente `{ version: 2 }`.

### Melhor Suporte TypeScript

- Configuração TypeScript moderna otimizada para bundlers
- Melhor inferência de tipos e exports
- Experiência do desenvolvedor melhorada com melhor autocomplete

## Mudanças Quebradoras

### Nomes de Funções Alterados (PascalCase → camelCase)

Todos os nomes de funções foram alterados de PascalCase para camelCase para seguir as convenções de nomenclatura JavaScript.

**Importante: Compatibilidade com Versões Anteriores**

Para facilitar a migração, **a v2.x ainda exporta os nomes antigos em PascalCase como aliases deprecated**. Isso significa:

- Seu código existente usando `formatCPF`, `isValidCNPJ`, etc. continuará funcionando na v2.x
- Você receberá avisos de deprecação no seu IDE/TypeScript
- Os nomes antigos serão **removidos na v3.0.0**

**Recomendação:** Embora você possa atualizar para v2.x sem alterar seu código imediatamente, recomendamos migrar para os novos nomes em camelCase o quanto antes para se preparar para a v3.0.0.

#### Funções de Validação

| v1 | v2 |
|---|---|
| `isValidCPF` | `isValidCpf` |
| `isValidCNPJ` | `isValidCnpj` |
| `isValidCEP` | `isValidCep` |
| `isValidPIS` | `isValidPis` |
| `isValidIE` | `isValidIe` |
| `isValidProcessoJuridico` | `isValidProcessoJuridico` (inalterado) |
| `isValidBoleto` | `isValidBoleto` (inalterado) |
| `isValidEmail` | `isValidEmail` (inalterado) |
| `isValidPhone` | `isValidPhone` (inalterado) |
| `isValidMobilePhone` | `isValidMobilePhone` (inalterado) |
| `isValidLandlinePhone` | `isValidLandlinePhone` (inalterado) |
| `isValidLicensePlate` | `isValidLicensePlate` (inalterado) |
| `isValidRenavam` | `isValidRenavam` (novo) |

#### Funções de Formatação

| v1 | v2 |
|---|---|
| `formatCPF` | `formatCpf` |
| `formatCNPJ` | `formatCnpj` |
| `formatCEP` | `formatCep` |
| `formatPIS` | `formatPis` |
| `formatProcessoJuridico` | `formatProcessoJuridico` (inalterado) |
| `formatBoleto` | `formatBoleto` (inalterado) |
| `formatCurrency` | `formatCurrency` (inalterado) |
| `formatPhone` | `formatPhone` (novo) |

#### Funções de Geração

| v1 | v2 |
|---|---|
| `generateCPF` | `generateCpf` |
| `generateCNPJ` | `generateCnpj` |
| `generateBoleto` | `generateBoleto` (inalterado) |

**Nota sobre o comportamento do `generateCnpj`:**

Na v2.x, `generateCnpj()` sem argumentos retorna por padrão a versão 1 (CNPJ numérico). Na v3.0.0, este comportamento mudará para selecionar aleatoriamente entre versão 1 (numérico) e versão 2 (alfanumérico) para melhor aleatoriedade. Se você precisa de uma versão específica, sempre passe o parâmetro de versão explicitamente:

```javascript
// Recomendado: Sempre especifique a versão
generateCnpj(1); // Sempre gera CNPJ numérico
generateCnpj(2); // Sempre gera CNPJ alfanumérico

// Não recomendado: Depender do comportamento padrão
generateCnpj(); // Atualmente gera numérico (v1), mas será aleatório na v3.0.0
```

#### Outras Funções

| v1 | v2 |
|---|---|
| `parseCurrency` | `parseCurrency` (inalterado) |
| `capitalize` | `capitalize` (inalterado) |
| `getStates` | `getStates` (inalterado) |
| `getCities` | `getCities` (inalterado) |
| `getAddressInfoByCep` | `getAddressInfoByCep` (API alterada, veja abaixo) |

### Exemplo de Migração

**Antes (v1):**
```javascript
import { isValidCPF, formatCPF, generateCNPJ } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCPF('12345678909');
const formatted = formatCPF('12345678909');
const cnpj = generateCNPJ();
```

**Depois (v2):**
```javascript
import { isValidCpf, formatCpf, generateCnpj } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCpf('12345678909');
const formatted = formatCpf('12345678909');
const cnpj = generateCnpj();
```

### Funções Helper Removidas

As seguintes funções helper não são mais exportadas na API pública. Estas eram utilitários internos que não deveriam ter sido expostos.

**Nota:** Diferentemente das funções renomeadas acima, esses helpers **NÃO** possuem aliases de compatibilidade. Você deve migrar para longe deles antes de atualizar para a v2.x.

#### `onlyNumbers`
Esta função foi removida da API pública. Agora é um utilitário interno chamado `sanitizeToDigits`.

**Migração:**
```javascript
// v1 - Não use mais isso
import { onlyNumbers } from '@brazilian-utils/brazilian-utils';
const digits = onlyNumbers('123-456');

// v2 - Use uma substituição simples
const digits = '123-456'.replace(/\D/g, '');
```

#### `isLastChar`
Esta função foi removida. Use uma comparação inline simples.

**Migração:**
```javascript
// v1 - Não use mais isso
import { isLastChar } from '@brazilian-utils/brazilian-utils';
if (isLastChar(index, input)) { /* ... */ }

// v2 - Use comparação inline
if (index === input.length - 1) { /* ... */ }
```

#### `generateChecksum`
Esta função agora é interna e não é mais exportada na API pública.

**Migração:**
```javascript
// v1 - Não use mais isso
import { generateChecksum } from '@brazilian-utils/brazilian-utils';

// v2 - Se você absolutamente precisar, importe dos internals (não recomendado)
// Isto não faz parte da API pública e pode mudar sem aviso
import { generateChecksum } from '@brazilian-utils/brazilian-utils/dist/_internals/generate-checksum/generate-checksum';
```

#### `generateRandomNumber`
Esta função agora é interna e não é mais exportada na API pública.

**Migração:**
```javascript
// v1 - Não use mais isso
import { generateRandomNumber } from '@brazilian-utils/brazilian-utils';

// v2 - Use sua própria implementação
function generateRandomNumber(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}
```

## Novas Funções

As seguintes funções são novas na v2.0.0:

### `getHolidays`

Obtém feriados brasileiros para um determinado ano. Suporta feriados nacionais e estaduais.

```javascript
import { getHolidays } from '@brazilian-utils/brazilian-utils';

// Obtém todos os feriados nacionais
const holidays = getHolidays(2024);

// Obtém feriados para um estado específico
const spHolidays = getHolidays({ year: 2024, stateCode: 'SP' });
```

### `getBoletoInfo`

Extrai informações de um boleto (valor, data de vencimento, código do banco).

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

const info = getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }
```

### `formatPhone`

Formata números de telefone de acordo com padrões brasileiros.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('11900000000'); // 90000-0000
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // Detecta automaticamente a máscara
```

### `isValidRenavam`

Valida RENAVAM (Registro Nacional de Veículos Automotores). Suporta tanto o formato antigo (9 dígitos) quanto o novo formato (11 dígitos).

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 dígitos, formato antigo)
isValidRenavam('00639884962'); // true (11 dígitos, formato novo)
isValidRenavam('12345678901'); // false (checksum inválido)
```

### `isValidBankAccount`

Valida contas bancárias brasileiras. Suporta algoritmos de validação específicos para os principais bancos (Banco do Brasil, Itaú, Bradesco, Santander, Caixa Econômica Federal) e validação genérica mod10/mod11 para outros bancos.

```javascript
import { isValidBankAccount } from '@brazilian-utils/brazilian-utils';

// Banco do Brasil
isValidBankAccount({
  bankCode: '001',
  agency: '1234',
  account: '12345678',
  digit: '5'
}); // true (se válido)

// Itaú
isValidBankAccount({
  bankCode: '341',
  agency: '1234',
  account: '12345',
  digit: '6'
}); // true (se válido)

// Outros bancos usam validação genérica
isValidBankAccount({
  bankCode: '999',
  agency: '1234',
  account: '123456',
  digit: '7'
}); // true (se validação mod10/mod11 passar)
```

## Mudanças na API

### `getAddressInfoByCep`

A função `getAddressInfoByCep` agora suporta opções adicionais e melhor tratamento de erros.

**Antes (v1):**
```javascript
const address = await getAddressInfoByCep('01310100');
```

**Depois (v2):**
```javascript
// Ainda funciona da mesma forma
const address = await getAddressInfoByCep('01310100');

// Mas agora suporta opções
const address = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Também aceita números (será preenchido automaticamente com zeros à esquerda)
const address = await getAddressInfoByCep(1310100);
```

A função agora exporta classes de erro para melhor tratamento de erros:

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
    // Tratar erro de validação
  } else if (error instanceof GetAddressInfoByCepNotFoundError) {
    // Tratar erro de não encontrado
  } else if (error instanceof GetAddressInfoByCepServiceError) {
    // Tratar erro de serviço
  }
}
```

### `getCities`

A função `getCities` agora retorna resultados ordenados alfabeticamente.

**Antes (v1):**
```javascript
getCities(); // Retornava array não ordenado
getCities('SP'); // Retornava array não ordenado
```

**Depois (v2):**
```javascript
getCities(); // Retorna ordenado alfabeticamente
getCities('SP'); // Retorna ordenado alfabeticamente
```

## Checklist de Migração

### Obrigatório (antes de atualizar para v2.x)
- [ ] Remover uso de funções helper (`onlyNumbers`, `isLastChar`, `generateChecksum`, `generateRandomNumber`)

### Opcional (recomendado antes da v3.0.0)
- [ ] Atualizar todas as importações para usar nomes de funções em camelCase
- [ ] Substituir todas as chamadas de funções com nomes em camelCase

### Revisar se aplicável
- [ ] Atualizar tratamento de erros para `getAddressInfoByCep` se necessário
- [ ] Revisar uso de `getCities` se a ordenação era importante
- [ ] Testar todas as funções de validação e formatação
- [ ] Atualizar importações de tipos TypeScript se aplicável

## Obter Ajuda

Se você encontrar problemas durante a migração, por favor:

1. Verifique a [documentação de utilitários](pt-br/utilities.md) para as assinaturas corretas das funções
2. Revise os exemplos neste guia de migração
3. Abra uma issue no [repositório GitHub](https://github.com/brazilian-utils/brazilian-utils) se encontrar um bug
