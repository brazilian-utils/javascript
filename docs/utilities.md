---
title: "Utilities"
description: "Every utility of Brazilian Utils, grouped by family (CPF, CNPJ, CEP, boleto, Pix and more), with its options, examples and edge cases."
keywords: ["CPF", "CNPJ", "CEP", "boleto", "Pix", "NF-e", "phone", "license plate", "RENAVAM", "PIS", "CNH", "IBAN", "holidays", "business days", "CBO", "CNAE", "NCM", "CFOP", "validator", "formatter", "parser", "generator"]
---

Every function of the package, grouped by family. Each section says what the function does, its options, what it returns on bad input, and shows an example.

## Conventions

These rules hold for every function unless its section says otherwise.

- **Nothing throws on bad input** (`null`, `undefined`, the wrong type): `isValid*` return `false`, `format*` and `parse*` return `''`, single-item `get*` return `null`, list `get*` return `[]`. The only exceptions are the async `getAddressInfoByCep` and `getCepInfoByAddress`, which reject with typed errors.
- **Validators accept the value masked or not**: the usual mask characters (`.`, `-`, `/`) and spaces between or around the groups are ignored, so there is no need to strip formatting first.
- **Formatters mask as far as the value goes**, so they also work as input masks while the user types. `parse*` functions do the reverse and keep only the meaningful characters.
- **Generators use `Math.random()`**, so they are fine for tests and fixtures and never for anything security-related.
- **Getters return a new array or object on every call**, so mutating a result never affects the next call.
- **Every function is synchronous** except `getAddressInfoByCep`, `getCepInfoByAddress` and the deprecated `getMunicipality`.


## CPF

### isValidCpf

Check if a CPF is valid.

- Returns `false` for a reserved number (all digits the same, such as `00000000000`) and for a wrong check digit.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (whitespace mask)
```

### formatCpf

Format a CPF.

- **Options** (`FormatCpfOptions`): `pad` left-pads the value with zeros to 11 digits before masking (default `false`); `obfuscate` hides the first 3 digits and the 2 check digits.
- `obfuscate` is applied after `pad`.

```javascript
import { formatCpf } from '@brazilian-utils/brazilian-utils';

formatCpf('74650688000'); // 746.506.880-00
formatCpf('746506880', { pad: true }); // 007.465.068-80
formatCpf('12345678909', { obfuscate: true }); // ***.456.789-**
```

### parseCpf

Remove CPF formatting, keep only digits, and cap the result to 11 digits.

```javascript
import { parseCpf } from '@brazilian-utils/brazilian-utils';

parseCpf('746.506.880-00'); // 74650688000
```

### generateCpf

Generate a valid random CPF.

- The optional `state` argument (`StateCode`, e.g. `"SP"`) fixes the região fiscal digit (the 9th) to that state's code.
- Without `state`, or with an unknown code, a random região fiscal digit is drawn.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // the 9th digit is 8, the SP região fiscal code
generateCpf('MG'); // the 9th digit is 6, the MG região fiscal code
```

### getCpfInfo

Read the fields a CPF encodes, as a `CpfInfo`: the 8 digit `base`, the `fiscalRegion` digit (the 9th digit, the Região Fiscal of the Receita Federal the CPF was registered in, `"1"` to `"9"` and `"0"` for the 10ª), the `states` of that region (`StateCode[]`, sorted by state name) and the 2 `checkDigits`. Accepts the same masked or unmasked input as `isValidCpf` and returns `null` for anything that is not a valid CPF. The region is the one of the address given at the first registration: it says nothing about where the holder was born, lives today or asked for the number, and a region with more than one state does not tell which of them it was.

| `fiscalRegion` | `states` |
| --- | --- |
| `"1"` | DF, GO, MT, MS, TO |
| `"2"` | AC, AP, AM, PA, RO, RR |
| `"3"` | CE, MA, PI |
| `"4"` | AL, PB, PE, RN |
| `"5"` | BA, SE |
| `"6"` | MG |
| `"7"` | ES, RJ |
| `"8"` | SP |
| `"9"` | PR, SC |
| `"0"` | RS |

```javascript
import { getCpfInfo } from '@brazilian-utils/brazilian-utils';

getCpfInfo('123.456.789-09');
// {
//   base: '12345678',
//   fiscalRegion: '9',
//   states: ['PR', 'SC'],
//   checkDigits: '09',
// }

getCpfInfo('12345678900'); // null (invalid check digits)
```

Source: [Receita Federal, "Cadastros: CPF e CNPJ"](https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf).

## CNPJ

### isValidCnpj

Check if a CNPJ is valid.

- **Options** (`IsValidCnpjOptions`): `version` picks the accepted format: `1` (default) numeric only, `2` numeric and alphanumeric. Any other value is read as `1`.
- A reserved number (all digits the same) is rejected under both versions; version `2` has no reserved list for letters.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (lowercase alphanumeric)
```

Source: [Receita Federal, Manual do DV do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf), [CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).

### formatCnpj

Format a CNPJ.

- **Options** (`FormatCnpjOptions`): `pad` left-pads the value with zeros to 14 characters before masking (default `false`); `version` picks the format, `1` (default) numeric only, `2` alphanumeric; `obfuscate` hides the first 2 digits and the 2 check digits.
- Version `2` keeps letters (upper-cased) and digits; version `1` keeps digits only.
- `obfuscate` works in both versions and is applied after `pad`.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

### parseCnpj

Remove CNPJ formatting, return a normalized value, and cap the result to 14 characters.

- **Options** (`ParseCnpjOptions`): `version` picks the format: `1` (default) keeps digits only, `2` keeps letters and digits, upper-cased.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

### generateCnpj

Generate a valid random CNPJ.

- The first argument is either the version, `1` (default) numeric or `2` alphanumeric, or a `GenerateCnpjParams` object with `version` plus `branch`.
- `branch` is the "número de ordem" (filial) block, an integer from 1 to 9999 (random by default). An invalid `branch` is ignored. The block stays numeric in both versions.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // alphanumeric CNPJ, e.g. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // ordem block '0003', e.g. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // alphanumeric CNPJ whose ordem block is '0001'
```

### getCnpjInfo

Parse a CNPJ into the fields the number encodes. Accepts the same input forms as `isValidCnpj` and returns `null` whenever it would return `false` for the same arguments, so an alphanumeric CNPJ read under version `1` is `null`.

- **Options** (`GetCnpjInfoOptions`): `version` is read the way `isValidCnpj` reads it, `1` (default) the numeric-only format, `2` both the numeric and the alphanumeric one.
- Returns a `CnpjInfo`, the 14 positions as Anexo XV lays them out: 8 (`root`, the raiz that identifies the entity) + 4 (`branch`, the establishment, called número de ordem by the Receita Federal) + 2 (`checkDigits`, always numeric). `branch` is named after the `branch` parameter of `generateCnpj`, which fills the same four positions.
- `isInitialHeadquarters` tells whether the branch is `0001`, the one the Receita Federal gives the headquarters (matriz) when the root is registered. A filial can later become the headquarters while keeping its número de ordem, so only the Receita Federal registry tells the current headquarters.
- The fields of an alphanumeric CNPJ are returned upper cased.

```javascript
import { getCnpjInfo } from '@brazilian-utils/brazilian-utils';

getCnpjInfo('12.345.678/0001-95');
// {
//   root: '12345678',
//   branch: '0001',
//   checkDigits: '95',
//   isInitialHeadquarters: true
// }

getCnpjInfo('12.abc.345/01de-35', { version: 2 });
// {
//   root: '12ABC345',
//   branch: '01DE',
//   checkDigits: '35',
//   isInitialHeadquarters: false
// }

getCnpjInfo('12.ABC.345/01DE-35'); // null (alphanumeric, read under version 1)
getCnpjInfo('12.345.678/0001-90'); // null (bad check digits)
```

Source: [Instrução Normativa RFB nº 2.229/2024](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=141102), whose Anexo Único is the Anexo XV of IN RFB nº 2.119/2022 and lays the 14 positions out, [Receita Federal Q&A on the alphanumeric CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf) (questions 21, 23 and 25).

## CEP and address

### isValidCep

Check if a CEP ([brazilian postal code](https://en.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)) is valid.

- Accepts a `string` or a `number`. A CEP that starts with `0` has to be a string, since a number cannot keep the leading zero.
- Spaces, dots and hyphens are ignored. Any other character makes the value invalid.

```javascript
import { isValidCep } from '@brazilian-utils/brazilian-utils';

isValidCep('01310100'); // true
isValidCep('92500-000'); // true (hyphen between groups)
isValidCep('92.500-000'); // true (dot and hyphen)
isValidCep('013 10 100'); // true (spaces anywhere between the digits)
isValidCep(20040020); // true (number input)
isValidCep('9250000A'); // false (letters are rejected)
isValidCep('12345'); // false (invalid length)
```

### formatCep

Format a CEP ([brazilian postal code](https://en.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)).

- **Options** (`FormatCepOptions`): `pad` left-pads the value with zeros to 8 digits before masking (default `false`).
- A CEP that starts with `0` given as a number loses that zero: pass a string or use `pad`.

```javascript
import { formatCep } from '@brazilian-utils/brazilian-utils';

formatCep('92500000'); // 92500-000
formatCep('9250000', { pad: true }); // 09250-000
```

### parseCep

Remove CEP formatting, keep only digits, and cap the result to 8 digits.

```javascript
import { parseCep } from '@brazilian-utils/brazilian-utils';

parseCep('92500-000'); // 92500000
```

### generateCep

Generate a random CEP. A CEP has no check digit, so every 8 digit string is structurally valid.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

### getAddressInfoByCep

Fetch the address of a CEP from several providers at once and resolve to the first successful answer. The result is an `AddressInfo`: `cep`, `state`, `city`, `neighborhood` and `street`.

- **Options** (`GetAddressInfoByCepOptions`): `providers` (`CepProvider[]`) lists the providers to race (default `['viacep', 'brasilapi']`). `'widenet'` is deprecated and left out of the default list.
- Accepts a string or a number. A number is left-padded with zeros to 8 digits.
- Retries transient network failures per provider.
- Rejects with `GetAddressInfoByCepValidationError` when the CEP is invalid or `providers` names no known provider, with `GetAddressInfoByCepNotFoundError` when every provider failed and at least one reported the CEP as unknown, and with `GetAddressInfoByCepServiceError` when every provider failed for another reason.
- All three extend `GetAddressInfoByCepError`, so one `catch` covers them.

```javascript
import { getAddressInfoByCep } from '@brazilian-utils/brazilian-utils';

// Using the default providers (['viacep', 'brasilapi'])
const address = await getAddressInfoByCep('01310100');
// { cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' }

// Using specific providers
const addressFromProviders = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Using number input (will be padded automatically)
const addressFromNumber = await getAddressInfoByCep(1310100);
```

### getCepInfoByAddress

Fetch the CEPs of an address from ViaCEP. Resolves to an array of `CepAddressInfo`.

- The argument (`GetCepInfoByAddressParams`) carries `federalUnit`, `city` and `street`. `federalUnit` may be lowercase; `city` and `street` are trimmed and stripped of accents before the query.
- Rejects with `GetCepInfoByAddressValidationError` when the UF, city or street is missing or invalid, with `GetCepInfoByAddressNotFoundError` when no address matches, and with `GetCepInfoByAddressError` when ViaCEP answers with an HTTP error status.
- Retries transient network failures, as `getAddressInfoByCep` does.
- Each item carries the ViaCEP payload unchanged, under ViaCEP's own field names.

```javascript
import { getCepInfoByAddress } from '@brazilian-utils/brazilian-utils';

const ceps = await getCepInfoByAddress({
  federalUnit: 'MG',
  city: 'Ouro Preto',
  street: 'Rua Direita'
});

// [
//   {
//     cep: '35411-152',
//     logradouro: 'Rua Direita',
//     complemento: '',
//     unidade: '',
//     bairro: 'Riacho (Amarantina)',
//     localidade: 'Ouro Preto',
//     uf: 'MG',
//     estado: 'Minas Gerais',
//     regiao: 'Sudeste',
//     ibge: '3146107',
//     gia: '',
//     ddd: '31',
//     siafi: '4921'
//   }
// ]
```

## Boleto

### isValidBoleto

Check if a boleto ([brazilian payment method](https://en.wikipedia.org/wiki/Boleto)) is valid.

- Accepts the 47 digit "cobrança bancária" linha digitável and, for the "boleto de arrecadação", either its 48 digit linha digitável or its 44 digit barcode.
- The código de moeda (position 4 of the cobrança bancária barcode) is not checked.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

Source: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

### formatBoleto

Format a boleto number.

- **Options** (`FormatBoletoOptions`): `pad` left-pads the value with zeros to the length of the pattern before masking (default `false`).
- A 48 digit linha digitável starting with `8` gets the arrecadação mask: four blocks of 11 digits, each followed by its check digit. The 44 digit arrecadação barcode keeps the "cobrança bancária" mask.

```javascript
import { formatBoleto } from '@brazilian-utils/brazilian-utils';

formatBoleto('00190000090114971860168524522114675860000102656'); // 00190.00009 01149.718601 68524.522114 6 75860000102656
formatBoleto('1900000901149', { pad: true }); // 00000.00000 00000.000000 00000.000000 0 01900000901149
formatBoleto('846100000005246100291102005460339004695895061080'); // 84610000000-5 24610029110-2 00546033900-4 69589506108-0 (48 digit arrecadação linha digitável)
formatBoleto('84610000000246100291100054603390069589506108'); // 84610.00000 02461.002911 00054.603390 0 69589506108 (44 digit arrecadação barcode keeps the bancária mask)
```

Source: [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

### parseBoleto

Remove boleto formatting, keep only digits, and cap the result to 47 digits (48 for boleto de arrecadação).

```javascript
import { parseBoleto } from '@brazilian-utils/brazilian-utils';

parseBoleto('00190.00009 01149.718601 68524.522114 6 75860000102656'); // 00190000090114971860168524522114675860000102656
```

### generateBoleto

Generate a valid random boleto.

- Pass `{ type: 'arrecadacao' }` (`GenerateBoletoParams`) for a 48 digit boleto de arrecadação instead of the default `'bancario'` (cobrança bancária, 47 digits).

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

### getBoletoInfo

Extract information from a boleto (amount, expiration date, bank code). Returns `null` when the value is not a valid boleto.

- **Options** (`GetBoletoInfoOptions`): `referenceDate` resolves the "fator de vencimento" cycle as of that date instead of now.
- Returns a `BoletoInfo`: `amount` in cents, `expirationDate` and the three digit `bankCode`. `expirationDate` is `null` when the slip carries no fator de vencimento (a factor below `1000`).
- The fator de vencimento cycle reset on 22/02/2025, so a factor can mean either of two dates 9000 days apart. `referenceDate` picks between them; pass it whenever the answer has to stay stable.
- A boleto de arrecadação has `bankCode: ''` and `expirationDate: null`, plus `type: 'arrecadacao'`, `segment`, `value` (the amount in reais) and `hasEffectiveValue`.

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }

getBoletoInfo('00190000090114971860168524522114675860000102656', {
  referenceDate: new Date(2018, 6, 1)
});
// Resolves the fator de vencimento cycle as of 2018-07-01

getBoletoInfo('846100000005246100291102005460339004695895061080');
// { amount: 2461, expirationDate: null, bankCode: '', type: 'arrecadacao', segment: 4, value: 24.61, hasEffectiveValue: true }

getBoletoInfo('invalid'); // null
```

Source: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf).

## Pix

### isValidPixKey

Check if a Pix key (chave Pix) is valid: a CPF, a CNPJ, an e-mail address, a Brazilian mobile phone number or a random EVP key, per the DICT key formats.

- **Options** (`IsValidPixKeyOptions`): `accept` (`PixKeyType[]`, default all of them) lists the kinds of key that count as valid; `[]` rejects everything.
- Same recognition rules as `getPixKeyInfo`.

```javascript
import { isValidPixKey } from '@brazilian-utils/brazilian-utils';

isValidPixKey('123.456.789-09'); // true
isValidPixKey('fulano@example.com'); // true
isValidPixKey('(11) 98765-4321'); // true
isValidPixKey('71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d'); // true
isValidPixKey('(11) 3000-0000'); // false (landlines are not Pix keys)
isValidPixKey('123.456.789-09', { accept: ['email', 'evp'] }); // false
isValidPixKey('not a key'); // false
```

Source: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html), [pix-api](https://github.com/bacen/pix-api).

### getPixKeyInfo

Identify a Pix key and normalize it to the canonical form the DICT expects inside a BR Code. Returns `null` when the value is not a valid Pix key.

- Returns a `PixKeyInfo` with the `type` (`PixKeyType`) and the `value`.
- The canonical `value` is digits for a CPF or CNPJ (letters upper-cased), a lowercase e-mail, an E.164 phone or a lowercase UUID.
- An 11 digit value valid as both CPF and mobile phone is read as a CPF, unless written as a phone (`+55` prefix or DDD in parentheses).
- An e-mail longer than 77 characters is rejected.

```javascript
import { getPixKeyInfo } from '@brazilian-utils/brazilian-utils';

getPixKeyInfo('123.456.789-09'); // { type: 'cpf', value: '12345678909' }
getPixKeyInfo('Fulano@Example.COM '); // { type: 'email', value: 'fulano@example.com' }
getPixKeyInfo('(11) 98765-4321'); // { type: 'phone', value: '+5511987654321' }
getPixKeyInfo('71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D');
// { type: 'evp', value: '71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d' }
getPixKeyInfo('(11) 3000-0000'); // null (a landline is not a Pix key)
getPixKeyInfo('51998259765'); // { type: 'cpf', value: '51998259765' } (also a valid phone)
getPixKeyInfo('+5551998259765'); // { type: 'phone', value: '+5551998259765' }
```

Source: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).

### isValidPixPayload

Check if a Pix BR Code payload (the string behind a Pix QR Code and behind "Pix copia e cola") is valid. The key itself is not checked; use `isValidPixKey`.

- The TLV structure, the CRC-16 and the mandatory objects (format indicator, category code, currency, country, merchant name and city) are checked.
- One "Merchant Account Information" template (IDs 26 to 51) must carry the `br.gov.bcb.pix` GUI with a key (static) or a PSP URL (dynamic), never both.
- Objects `01` (Point of Initiation Method) and `62` (Additional Data Field) are optional; `01` must be `11` or `12` when present.
- An amount (`54`) must be greater than zero, except in a Pix Saque BR Code (8 digit `fss` in sub-object 26-03).
- Unreserved Templates (IDs 80 to 99) are ignored.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (broken CRC)
```

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### getPixPayloadInfo

Parse a Pix BR Code payload into its fields. Accepts what `isValidPixPayload` accepts and returns `null` for anything else, never a partial result.

- Returns a `PixPayloadInfo`: `merchantName`, `merchantCity`, `pointOfInitiation` and either `key` (static) or `url` (dynamic).
- `amount`, `txid`, `description` and `withdrawalFacilitator` (the `fss` of a Pix Saque) are present only when the payload carries them. `txid` is absent for the `***` marker.
- `pointOfInitiation` (`PixPointOfInitiation`) is `"dynamic"` when the payload carries a PSP location or object `01` is `"12"`, `"static"` otherwise.
- With a PSP location, `amount` and `txid` are ignored, as the manual mandates.

```javascript
import { getPixPayloadInfo } from '@brazilian-utils/brazilian-utils';

getPixPayloadInfo(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
);
// {
//   merchantName: 'Fulano de Tal',
//   merchantCity: 'BRASILIA',
//   pointOfInitiation: 'static',
//   key: '123e4567-e12b-12d1-a456-426655440000'
// }
```

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### generatePixPayload

Generate the payload of a Pix BR Code. Exactly one of `params.key` or `params.url` must be given; `null` is returned when both or neither are given.

- **Params** (`GeneratePixPayloadParams`): `key` or `url`, `merchantName`, `merchantCity`, and the optional `amount`, `txid` and `description`.
- With `key` the payload is static and the key is normalized by `getPixKeyInfo`. With `url` it is dynamic (object `01` set to `12`) and cannot carry `amount` or `txid`.
- `url` is a PSP location: host and path, no scheme (`pix.example.com/qr/v2/1234`), at most 77 characters.
- `amount` takes two decimal places; `0.005`, `123.456` or a value that rounds to `0.00` is rejected.
- `txid` is 1 to 25 characters of `[A-Za-z0-9]` (default `***`).
- `merchantName`, `merchantCity` and `description` lose their accents and are truncated to 25, 15 and what is left of the template.

```javascript
import { generatePixPayload } from '@brazilian-utils/brazilian-utils';

generatePixPayload({
  key: '123.456.789-09',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília',
  amount: 123.45
});
// "00020126330014br.gov.bcb.pix0111123456789095204000053039865406123.455802BR5913Fulano de Tal6008Brasilia62070503***630479EE"

generatePixPayload({
  url: 'pix.example.com/qr/v2/1234',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília'
});
// "00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008Brasilia62070503***6304FC66"

generatePixPayload({ merchantName: 'Fulano', merchantCity: 'Brasília' }); // null (neither key nor url)
```

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

## NF-e key

### isValidNfeKey

Check if a DF-e access key (chave de acesso) is valid. Covers every DF-e with a 44 digit access key; the CF-e-SAT (59) is out.

- Models: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) and NFCom (62).
- The 44 digits may be grouped in 4 by whitespace, `.`, `-` or `/`. The XML `Id` prefixes (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) are stripped first.
- `tpEmis` must be one the MOC of that model assigns (table below).
- For NF-e and NFC-e the `cNF` must pass rule B03-10 of the MOC (no repeated or sequential values, not the document number).
- A document number of all zeros is rejected. The check digit is a modulus 11 over the first 43 digits.

| Model | `tpEmis` accepted |
| --- | --- |
| NF-e (55), NFC-e (65) | 1 to 7 and 9 |
| CT-e (57) | 1, 3, 4, 5, 7, 8 |
| CT-e OS (67) | 1, 5, 7, 8 |
| GTV-e (64) | 1, 2, 7, 8 |
| MDF-e (58) | 1, 2, 3 |
| BP-e (63), NF3e (66), NFCom (62) | 1, 2 |

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (XML Id prefix)
isValidNfeKey('CTe35170458716523000119570010000000128000123452'); // true (CT-e authorised by the SVC-SP)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (masked)
isValidNfeKey('3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458'); // true (any of the mask characters)
isValidNfeKey('351 70458716523000119550010000000121000123458'); // false (a separator inside a group of 4)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (invalid cUF)
isValidNfeKey('35170458716523000119010010000000121000123450'); // false (invalid mod)
isValidNfeKey('35170458716523000119550010000000128000123455'); // false (the NF-e MOC does not assign tpEmis 8)
isValidNfeKey('35170458716523000119550010000000121000000003'); // false (cNF 00000000, rule B03-10)
```

Source: [MOC NF-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), [NF-e schemas](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos) and the MOCs cited in `src/is-valid-nfe-key/is-valid-nfe-key.ts`.

### formatNfeKey

Format a DF-e (Documento Fiscal eletrônico) access key into groups of 4 digits separated by spaces, the form the DANFE, DACTE, DAMDFE, DABPE, DANF3E and DANFE-COM print it in.

- **Options** (`FormatNfeKeyOptions`): `pad` left pads the value with zeros up to the 44 digits of a complete access key (default `false`).
- A masked or partial key is grouped as far as its digits go.
- Use `isValidNfeKey` to check a key.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'

formatNfeKey('12345'); // '1234 5'

formatNfeKey('12345', { pad: true });
// '0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345'
```

### parseNfeKey

Remove the formatting of a DF-e access key (chave de acesso), keep only digits, and cap the result to 44 digits.

- The XML `Id` prefixes (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) are stripped first.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458');
// '35170458716523000119550010000000121000123458'

parseNfeKey('NFe35170458716523000119550010000000121000123458');
// '35170458716523000119550010000000121000123458'
```

### getNfeKeyInfo

Parse a DF-e access key into its fields. Accepts the same input forms as `isValidNfeKey` and returns `null` when the key is not valid.

- Returns an `NfeKeyInfo`: `stateCode`, `year`, `month`, `taxId`, `model` (`NfeKeyModel`), `series`, `number`, `emissionType`, `code` and `checkDigit`.
- For NFCom and NF3e (models `'62'` and `'66'`) the result also carries `authorizationSite` and `code` is 7 digits instead of 8.

```javascript
import { getNfeKeyInfo } from '@brazilian-utils/brazilian-utils';

getNfeKeyInfo('35170458716523000119550010000000121000123458');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '55',
//   series: 1, number: 12, emissionType: 1, code: '00012345', checkDigit: 8 }

getNfeKeyInfo('35170458716523000119620010000000121000123450');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '62',
//   series: 1, number: 12, emissionType: 1, code: '0012345', checkDigit: 0, authorizationSite: 0 }

getNfeKeyInfo('invalid'); // null
```

## SUFRAMA

### isValidSuframa

Check if an Inscrição SUFRAMA is valid. It is the registration number the Superintendência da Zona Franca de Manaus gives to companies with tax incentives, carried by the `ISUF` field of the NF-e recipient.

- The number is `SS.NNNN.LLD`: sector of activity, sequential number, locality of the SUFRAMA unit and check digit.
- Accepts 8 or 9 digits: an 8 digit value is a number whose sector code lost its leading zero.
- Returns `false` for a sector code of `00` and for a wrong módulo 11 check digit.
- The sector and locality codes are not checked against a table, since the manual lists them only as examples.
- Besides the usual mask characters, `(`, `)`, `,` and `*` are also ignored.

```javascript
import { isValidSuframa } from '@brazilian-utils/brazilian-utils';

isValidSuframa('123456789'); // true
isValidSuframa('12.3456.789'); // true
isValidSuframa('10001018'); // true (same as '010001018')
isValidSuframa('123456780'); // false
isValidSuframa('001234560'); // false (sector 00)
```

### formatSuframa

Format an Inscrição SUFRAMA.

- **Options** (`FormatSuframaOptions`): `pad` left-pads the value with zeros to the full 9 digits before masking (default `false`), which restores the leading zero of an 8 digit value.
- The mask is progressive, as in the other `format` utilities, so an 8 digit value without `pad` is grouped one position early: use `pad: true` for a value read straight out of the `ISUF` field, which may be stored with 8 digits.

```javascript
import { formatSuframa } from '@brazilian-utils/brazilian-utils';

formatSuframa('123456789'); // 12.3456.789
formatSuframa('10001018'); // 10.0010.18 (8 digits, the mask groups one position early)
formatSuframa('10001018', { pad: true }); // 01.0001.018
```

### parseSuframa

Remove Inscrição SUFRAMA formatting, keep only digits, and cap the result to 9 digits.

```javascript
import { parseSuframa } from '@brazilian-utils/brazilian-utils';

parseSuframa('12.3456.789'); // 123456789
```

### generateSuframa

Generate a valid random 9 digit Inscrição SUFRAMA.

- The check digit is valid and the sector code is never `00`. The sector and locality codes are random.

```javascript
import { generateSuframa } from '@brazilian-utils/brazilian-utils';

generateSuframa(); // '205678106'
```

Source: [NF-e Manual de Orientação do Contribuinte 7.0, Visão Geral](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf) (section 8.4), [MOC 7.0, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf) (field 79, `E18` `ISUF`, and rule E18-20).

## Phone

### isValidPhone

Check if a phone number (mobile or landline) is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, as in `parsePhone`.

- **Options** (`IsValidPhoneOptions`): `accept` (`PhoneType[]`, default `['mobile', 'landline']`) picks which kinds of number count as valid; add `'service'` for the numbers `isValidServicePhone` recognizes. `version` (`PhoneVersion`, default `1`) is forwarded to `isValidMobilePhone`.

```javascript
import { isValidPhone } from '@brazilian-utils/brazilian-utils';

isValidPhone('11900000000'); // true
isValidPhone('11712345678', { version: 2 }); // true (7, 8 and 9 are all SMP)
isValidPhone('11700123456', { version: 2 }); // false (the 700 series is satellite)
isValidPhone('+55 11 98765-4321'); // true (country code accepted)
isValidPhone('08001234567'); // false (service numbers rejected by default)
isValidPhone('08001234567', { accept: ['service'] }); // true
isValidPhone('11900000000', { accept: [] }); // false
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### formatPhone

Format a phone number according to Brazilian patterns. If `value` includes a DDD, pass `{ mask: 'auto' }` or `'nanp'`: the default `"sn"` mask assumes no DDD and truncates one.

- **Options** (`FormatPhoneOptions`): `mask` (`PhoneMask`, default `"sn"`) picks one of the patterns below. An unknown `mask` falls back to `"sn"`.
- `"sn"`: subscriber number only, 9 digits. `"nanp"`: DDD plus subscriber number, 11 digits for a mobile and 10 for a landline; any other length keeps the 11 digit grouping.
- `"e164"` and `"international"` drop the country code first, as `parsePhone` does, and fall back to `"service"` for a service number.
- `"service"`: the Códigos Não Geográficos (`0800 123 4567`) and the abbreviated `300X`/`400X` numbers (`4004-1234`).
- `"auto"`: `"service"` for a service number, `"international"` when `value` carries a country code, otherwise `"nanp"` for more than 9 digits, else `"sn"`.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('987654321'); // 98765-4321 (default "sn", no DDD)
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // (11) 90000-0000
formatPhone('1130000000', { mask: 'nanp' }); // (11) 3000-0000 (10 digit landline)
formatPhone('1130000000', { mask: 'auto' }); // (11) 3000-0000 (10 digit landline)
formatPhone('11987654321', { mask: 'e164' }); // +5511987654321
formatPhone('+5511987654321', { mask: 'international' }); // +55 11 98765-4321
formatPhone('08001234567', { mask: 'service' }); // 0800 123 4567
formatPhone('40041234', { mask: 'service' }); // 4004-1234
formatPhone('+5511987654321', { mask: 'auto' }); // +55 11 98765-4321 ("auto" detects the +55 prefix and picks "international")
formatPhone('5508001234567', { mask: 'auto' }); // 0800 123 4567 ("auto" reads the 0800 number, not a +55 08 one)
formatPhone('11900000000'); // 11900-0000 (BEWARE: default "sn" truncates a DDD-prefixed number)
```

Source: [ITU-T E.164](https://www.itu.int/rec/T-REC-E.164), [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### parsePhone

Remove phone formatting, keep only digits, and cap the result to 11 digits.

- A Brazilian country code (`+55`, `0055` or a bare `55`) is stripped first, but only when 10 or 11 digits are left (DDD plus subscriber number), so area code 55 is not mistaken for it.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('55987654321'); // 55987654321 (area code 55, not mistaken for the +55 country code)
```

### generatePhone

Generate a random Brazilian phone number. Accepts `'mobile'`, `'landline'` or `'service'` (`GeneratePhoneType`); when omitted, it generates a mobile or a landline at random, never a service number.

- A mobile starts with 9 after the DDD (valid under both `isValidMobilePhone` versions); a landline has 8 digits after the DDD, starting with 2 to 6; a service number has no DDD.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' or '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' or '40041234'
```

### isValidMobilePhone

Check if a mobile phone number is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, as in `parsePhone`.

- **Options** (`IsValidMobilePhoneOptions`): `version` (`PhoneVersion`, default `1`) picks the numbering rule: `1` accepts a first digit of 6, 7, 8 or 9; `2` follows Resolução Anatel 749/2022, accepts only 7, 8 or 9 and rejects the `700` series.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true (legacy format)
isValidMobilePhone('11712345678', { version: 2 }); // true (7 is SMP as well)
isValidMobilePhone('11612345678', { version: 2 }); // false (6 is Reserva Técnica)
isValidMobilePhone('11700123456', { version: 2 }); // false (the 700 series is satellite)
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### isValidLandlinePhone

Check if a landline phone number is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, as in `parsePhone`.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
isValidLandlinePhone('+55 11 3000-0000'); // true (country code accepted)
```

### isValidServicePhone

Check if a phone number is a valid Brazilian service number, dialed without a DDD. Only the structure is checked: the number does not have to be assigned to anyone.

- The Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900` followed by 7 digits (11 in total).
- The abbreviated `300X`/`400X` numbers, 8 digits. Other carrier prefixes such as `4020` and `4062` are rejected.
- The 3 digit public utility codes Anatel has designated (e.g. `190`, `192`). `112` and `911` are not among them and are rejected.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (geographic number)
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151), [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86).

### getAreaCodeInfo

Get the state and region a Brazilian DDD (area code) belongs to, out of the 67 DDDs in use under the Anatel Plano Geral de Numeração. Accepts a string or a non-negative integer.

- Returns an `AreaCodeInfo`: `areaCode`, `stateCode`, `stateName`, `regionCode`, `regionName` and `stateCodes`. Returns `null` when the DDD is not in use.
- `stateCode` is the state the DDD is seated in. For the four DDDs that straddle a border (61, 42, 47 and 49) `stateCodes` also lists the other state, the seat first.

```javascript
import { getAreaCodeInfo } from '@brazilian-utils/brazilian-utils';

getAreaCodeInfo('11');
// { areaCode: 11, stateCode: 'SP', stateName: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['SP'] }

getAreaCodeInfo(21);
// { areaCode: 21, stateCode: 'RJ', stateName: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['RJ'] }

getAreaCodeInfo('61');
// { areaCode: 61, stateCode: 'DF', stateName: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', stateCodes: ['DF', 'GO'] }

getAreaCodeInfo('00'); // null
getAreaCodeInfo(-11); // null
getAreaCodeInfo(1.1); // null
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Anatel Códigos Nacionais](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

### getAreaCodesByState

Get every DDD (area code) that serves a given Brazilian state, under the Anatel Plano Geral de Numeração. The match is case-insensitive and the result is sorted in ascending order.

- Returns `[]` when `stateCode` does not match a Brazilian state.
- A DDD that straddles a border (the same four as `getAreaCodeInfo`) is listed under every state it serves.

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
getAreaCodesByState('XX'); // []
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Anatel Códigos Nacionais](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

## License plate

### isValidLicensePlate

Check if a license plate is valid. Accepts the old Brazilian format (`ABC-1234`) and the Mercosul format (`ABC1D23`), with or without a hyphen or space, in any case.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (Brazilian format)
isValidLicensePlate('ABC-1234'); // true (Brazilian format with hyphen)
isValidLicensePlate('ABC 1234'); // true (whitespace mask)
isValidLicensePlate('ABC1D23'); // true (Mercosul format)
isValidLicensePlate('ABC12D3'); // false (not a Mercosul sequence)
isValidLicensePlate('ABC1234EXTRA'); // false (too many characters)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexos](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

### formatLicensePlate

Format a license plate. Old Brazilian plates (`LLLNNNN`) get a hyphen; Mercosul plates (`LLLNLNN`) are returned without a separator.

- Returns `''` when the value cannot start a valid plate.

```javascript
import { formatLicensePlate } from '@brazilian-utils/brazilian-utils';

formatLicensePlate('abc1234'); // 'ABC-1234'
formatLicensePlate('abc1d23'); // 'ABC1D23'
```

### parseLicensePlate

Remove separators from a license plate, normalize it to uppercase, and cap it to 7 characters.

```javascript
import { parseLicensePlate } from '@brazilian-utils/brazilian-utils';

parseLicensePlate('abc-1234'); // 'ABC1234'
```

### generateLicensePlate

Generate a valid random license plate in the chosen format.

- `format` (`GenerateLicensePlateFormat`): `'LLLNLNN'` (Mercosul, the default) or `'LLLNNNN'` (the old Brazilian format). Any other value falls back to the default.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, the default)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
generateLicensePlate('LLLNNLN'); // 'ABC1D23' (a format outside the two in circulation falls back to the default)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf).

### getFormatLicensePlate

Detect the normalized format of a license plate: `'LLLNNNN'` for the old Brazilian format, `'LLLNLNN'` for Mercosul.

- Returns `null` when the value, separators removed, is not 7 letters and digits in one of the two formats.
- Exports the `LicensePlateFormat` type, which `generateLicensePlate` re-exports as `GenerateLicensePlateFormat`.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (not a Mercosul sequence)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (too many characters)
```

### convertLicensePlateToMercosul

Convert an old format Brazilian license plate (`LLLNNNN`) to the Mercosul format (`LLLNLNN`). The 5th digit becomes a letter, `0` through `9` mapping to `A` through `J`.

- Returns `""` when the value is not a valid old format license plate.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (already Mercosul)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexo II](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

## RENAVAM

### isValidRenavam

Check if a RENAVAM (Registro Nacional de Veículos Automotores) is valid. Accepts the old format (9 digits) and the new format (11 digits).

- Spaces, dots and hyphens are ignored; any other character makes the value invalid.

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 digits, old format)
isValidRenavam('00639884962'); // true (11 digits, new format)
isValidRenavam('0063988.4962'); // true (dots and hyphens are ignored)
isValidRenavam('12345678901'); // false (invalid checksum)
isValidRenavam('00000000000'); // false (repeated digits)
isValidRenavam('ab00639884962'); // false (letters are rejected)
```

### generateRenavam

Generate a valid random RENAVAM in the 11 digit form: ten base digits plus the check digit.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## PIS

### isValidPis

Check if a PIS is valid. Accepts the value masked or not.

- A value whose digits are all the same is rejected.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412847'); // true
isValidPis('12056412547'); // false
```

### formatPis

Format a PIS.

- **Options** (`FormatPisOptions`): `pad` left-pads the value with zeros to 11 digits before masking (default `false`).

```javascript
import { formatPis } from '@brazilian-utils/brazilian-utils';

formatPis('12345678901'); // 123.45678.90-1
formatPis('123456789', { pad: true }); // 001.23456.78-9
```

### parsePis

Remove PIS formatting, keep only digits, and cap the result to 11 digits.

```javascript
import { parsePis } from '@brazilian-utils/brazilian-utils';

parsePis('123.45678.90-1'); // 12345678901
```

### generatePis

Generate a valid random PIS.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

## Processo jurídico

### isValidProcessoJuridico

Check if a processo jurídico number is valid, per Resolução CNJ nº 65/2008. Three things are checked: the `NNNNNNN-DD.AAAA.J.TR.OOOO` layout, the `DD` check digits (ISO 7064 MOD 97-10) and the `J`/`TR` pair.

- `J` and `TR` must name an órgão and a tribunal that exist.
- The unidade de origem (`OOOO`) is only checked as four digits.

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
isValidProcessoJuridico('0002080-25.2012.5.15.0049'); // true (CNJ mask)
isValidProcessoJuridico('0000100-68.2008.4.06.0000'); // true (TRF da 6ª Região)
isValidProcessoJuridico('0000100-23.2008.8.28.0000'); // false (no 28th Tribunal de Justiça)
isValidProcessoJuridico('ab00020802520125150049'); // false (letters are rejected)
```

Source: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### formatProcessoJuridico

Format a processo jurídico number in the CNJ mask `NNNNNNN-DD.AAAA.J.TR.OOOO`.

- **Options** (`FormatProcessoJuridicoOptions`): `pad` left-pads the value with zeros to 20 digits before masking (default `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
formatProcessoJuridico('20802520125150049', { pad: true }); // 0002080-25.2012.5.15.0049
```

Source: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### parseProcessoJuridico

Remove processo jurídico formatting, keep only digits, and cap the result to 20 digits.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

### generateProcessoJuridico

Generate a valid random processo jurídico number in the layout of Resolução CNJ nº 65/2008.

- **Options** (`GenerateProcessoJuridicoParams`): `year` sets the `AAAA` field, an integer from the current year to 9999 (default: the current year); `court` sets the órgão `J`, from 1 to 9 (default: random).
- `TR` is drawn among the tribunais of the chosen órgão, so the pair always names a court that exists.
- Returns `null` when `year` or `court` is out of range.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478645020266070326'
generateProcessoJuridico({ year: 2026, court: 5 }); // '98412562120265087260' (Justiça do Trabalho, TRT da 8ª Região)
generateProcessoJuridico({ year: 10000 }); // null (year out of range)
generateProcessoJuridico({ court: 10 }); // null (no such órgão)
```

Source: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

## Bank accounts and banks

### isValidBankAccount

Check if a Brazilian bank account is valid. The `bankCode` must be a Banco Central STR participant (the list `getBankByCode` uses).

- **Params** (`IsValidBankAccountParams`, all strings): `bankCode` (3 digits), `agency` (1-5 digits), `account` (1-13 digits) and `digit` (1-2 characters, or `X` for Banco do Brasil and `P` for Bradesco).
- A listed bank is validated in one of three ways: by its published check digit algorithm, by structure only, or by a generic mod10/mod11 fallback.

Banks validated by their published check digit algorithm:

| Bank | Code | Agency | Account | Notes |
| --- | --- | --- | --- | --- |
| Banco do Brasil | `001` | 4-5 digits | 8-10 digits | mod11 with weights 2..9 cycling from the right; `digit` may be `"X"` |
| Santander | `033` | 4 digits | 8 digits | weights `9,7,3,1,0,0,9,7,1,3,1,9,7,3` over agency + `"00"` + account, tens discarded |
| Banrisul | `041` | 4 digits | 9 digits | weights `3,2,4,7,6,5,4,3,2`; remainder 0 gives `0` and remainder 1 gives `6`; `account` is tipo (2 digits) + conta (7 digits) |
| Caixa Econômica Federal | `104` | 4 digits | 11 digits | mod11 over agency + account; `account` is operação (3 digits) + conta (8 digits) |
| Bradesco | `237` | 4 digits | 7 digits | mod11 with weights 2..7 cycling from the right; remainder 0 gives `0` and remainder 1 gives `"P"` |
| Nubank | `260` | 4 digits | 5-13 digits | Verhoeff check digit over the account, leading zeros dropped |
| Itaú Unibanco | `341` | 4 digits | 5 digits | mod10 over agency + account |
| HSBC / Kirton Bank | `399` | 4 digits | 6 digits | weights `8,9,2,3,4,5,6,7,8,9` over agency + account; remainder 10 gives `0` |
| Citibank | `745` | 4 digits | 10 digits | weights `11..2` over the account; remainder 0 or 1 gives `0` |

Banks validated by structure only (a single numeric `digit` is enough):

| Bank | Code | | Bank | Code |
| --- | --- | --- | --- | --- |
| Inter | `077` | | Mercado Pago | `323` |
| Ailos | `085` | | C6 | `336` |
| XP | `102` | | PicPay | `380` |
| Unicred | `136` | | Cora | `403` |
| Stone | `197` | | Pan | `623` |
| BTG Pactual | `208` | | BV | `655` |
| Original | `212` | | Daycoval | `707` |
| PagBank | `290` | | Sicredi | `748` |
| BMG | `318` | | Sicoob | `756` |

- Every other listed bank uses the generic fallback: `digit` must match mod10 or mod11 over the account. A 2 character `digit` chains mod10 then mod11.

```javascript
import { isValidBankAccount } from '@brazilian-utils/brazilian-utils';

isValidBankAccount({
  bankCode: '001',
  agency: '1584',
  account: '00210169',
  digit: '6'
}); // true (Banco do Brasil)

isValidBankAccount({
  bankCode: '341',
  agency: '2545',
  account: '02366',
  digit: '1'
}); // true (Itaú)

isValidBankAccount({
  bankCode: '104',
  agency: '0647',
  account: '00188888888',
  digit: '7'
}); // true (Caixa: operação "001" + conta "88888888")

isValidBankAccount({
  bankCode: '041',
  agency: '2664',
  account: '358507670',
  digit: '6'
}); // true (Banrisul: tipo "35" + conta "8507670")

isValidBankAccount({
  bankCode: '260',
  agency: '0001',
  account: '5216125',
  digit: '0'
}); // true (Nubank, Verhoeff)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: '0'
}); // true (Banco Inter, structure only)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: 'X'
}); // false (a structure only bank still requires a numeric digit)

isValidBankAccount({
  bankCode: '999',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // false (999 is not a Banco Central participant)

isValidBankAccount({
  bankCode: '246',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // true (Banco ABC Brasil, generic mod10 fallback)
```

Source: [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), [Regras de Validação de dígito verificador](https://github.com/eduardokum/laravel-boleto/blob/master/manuais/Regras%20Validacao%20Conta%20Corrente%20VI_EPS.pdf).

### getBanks

Get every Brazilian bank with a compensation code (COMPE), from the Banco Central do Brasil STR participants list.

- Each bank (`Bank`) has a `code` (COMPE, 3 digits), an `ispb` (8 digits) and a `name`.

```javascript
import { getBanks } from '@brazilian-utils/brazilian-utils';

getBanks();
// [
//   { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' },
//   { code: '003', ispb: '04902979', name: 'BANCO DA AMAZONIA S.A.' },
//   { code: '004', ispb: '07237373', name: 'Banco do Nordeste do Brasil S.A.' },
//   ... 460 more items
// ]
```

Source: [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByCode

Look a Brazilian bank up by its compensation code (COMPE), from the Banco Central do Brasil STR participants list. Accepts a `string` or a `number`.

- Returns the matching `Bank`, or `null` when no bank has that code.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

Source: [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByIspb

Look a Brazilian bank up by its ISPB (Identificador do Sistema de Pagamentos Brasileiro), the 8 digit code of every SPB participant. Accepts a `string` or a `number`, with or without leading zeros.

- Returns the matching `Bank`, or `null` when no bank has that ISPB. The base only carries institutions that also have a COMPE code.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

Source: [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), [BrasilAPI](https://brasilapi.com.br/api/banks/v1).

## IBAN

### isValidIban

Check if a Brazilian IBAN (International Bank Account Number) is valid. Only Brazilian IBANs (country code `BR`) are recognized; any other country returns `false`.

- Layout, 29 characters: `BR`, 2 check digits (ISO 7064 MOD 97-10), 8 digit ISPB, 5 digit branch, 10 digit account, 1 letter account type, 1 owner indicator.
- Account type: any letter, usually `C` or `P`. Owner: `1` to `9`, then `A` to `Z`.
- Accepts the compact form or groups of 4 split by one whitespace, `.`, `-` or `/`, in any case.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (grouping spaces)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (any of the mask characters)
isValidIban('BR1500000000000010932840814P3'); // false (bad check digits)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (a separator inside a group)
isValidIban('DE89370400440532013000'); // false (non Brazilian IBAN)
```

Source: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

### formatIban

Format an IBAN in the ISO 13616 print grouping: blocks of 4 characters, the presentation used on statements and bank forms. Does not validate; use `isValidIban` for that.

- Caps the result at 29 characters, the length of a Brazilian IBAN.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (only letters and digits are read)
```

### parseIban

Remove IBAN formatting, keep the letters and digits, uppercase the result, and cap it to the 29 characters of a Brazilian IBAN.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR15 0000 0000 0000 1093 2840 814P 2'); // 'BR1500000000000010932840814P2'
parseIban('br15-0000.0000/0000 1093 2840 814p-2'); // 'BR1500000000000010932840814P2'
```

### getIbanInfo

Parse a Brazilian IBAN into its fields. Returns an `IbanInfo` object, or `null` whenever `isValidIban` would return `false`.

- Fields, all strings: `countryCode`, `checkDigits`, `bankIspb`, `branch`, `account`, `accountType` (usually `C` or `P`) and `owner` (`1` to `9`, then `A` to `Z`).
- Same input rules as `isValidIban`.

```javascript
import { getIbanInfo } from '@brazilian-utils/brazilian-utils';

getIbanInfo('BR1500000000000010932840814P2');
// {
//   countryCode: 'BR',
//   checkDigits: '15',
//   bankIspb: '00000000',
//   branch: '00001',
//   account: '0932840814',
//   accountType: 'P',
//   owner: '2'
// }

getIbanInfo('DE89370400440532013000'); // null (non Brazilian IBAN)
getIbanInfo('BR15 000 00000 0000 1093 2840 814P 2'); // null (a separator inside a group)
```

Source: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

## Currency, numbers and dates in words

### formatCurrency

Format a number or a numeric string in the BRL pattern (`1.234,56`). A `number` is formatted as is, sign and decimals preserved.

- **Options** (`FormatCurrencyOptions`): `symbol` (default `false`) prefixes the result with `R$`; `precision` (default 2) sets the decimal places, clamped to 0 to 20.
- A `string` is read as `parseCurrency` reads it, except that a value without any separator stays in whole units: `'1234'` formats as `1.234,00`.
- Returns `''` for a non-finite value or one that cannot be coerced to a number.

```javascript
import { formatCurrency } from '@brazilian-utils/brazilian-utils';

formatCurrency(10); // 10,00
formatCurrency(10756.11); // 10.756,11
formatCurrency(10756.123, { precision: 3 }); // 10.756,123
formatCurrency(1234.56, { symbol: true }); // R$ 1.234,56
formatCurrency(-1050); // -1.050,00 (a number's sign is preserved)
formatCurrency('123456'); // 123.456,00 (a plain digit string is read as a whole number)
formatCurrency('1.234,56'); // 1.234,56 (the last "," or "." followed by 1 to 2 digits is the decimal separator)
formatCurrency('-10.5'); // -10,50 (a leading "-" is preserved)
formatCurrency(Number.NaN); // "" (non finite numbers format as an empty string)
```

### parseCurrency

Parse a BRL currency string into a number.

- **Options** (`ParseCurrencyOptions`): `precision` (default 2) is the number of digits read as minor units, clamped to 0 to 20.
- The last `,` or `.` followed by 1 to 2 digits (up to `precision`, when larger) is the decimal separator; every other `,` or `.` is a thousands separator.
- A value without any separator is read as cents and divided by `10 ** precision`.

```javascript
import { parseCurrency } from '@brazilian-utils/brazilian-utils';

parseCurrency('R$ 1.234,56'); // 1234.56
parseCurrency('1234,56'); // 1234.56
parseCurrency('R$ 0,50'); // 0.5
parseCurrency('R$ 1.234'); // 1234 ("." followed by 3 digits is a thousands separator)
parseCurrency('1,5'); // 1.5
parseCurrency('1234'); // 12.34 (no separator at all keeps the cents convention)
parseCurrency('-R$ 1,00'); // -1 (a leading "-" is preserved)
parseCurrency('R$ 1,001', { precision: 3 }); // 1.001
parseCurrency(''); // 0
```

### convertNumberToWords

Write an integer in Brazilian Portuguese cardinal words ("por extenso"): `1235` becomes `"mil duzentos e trinta e cinco"`.

- **Options** (`ConvertNumberToWordsOptions`): `gender` (default `"masculine"`) agrees "um/dois" and the hundreds ("duzentos/duzentas") with the noun the number qualifies.
- Accepts integers from `-999999999999999` to `999999999999999` (999 trillion). A non-integer is truncated toward zero.
- Returns `""` for a value outside that range or not finite.

```javascript
import { convertNumberToWords } from '@brazilian-utils/brazilian-utils';

convertNumberToWords(123); // "cento e vinte e três"
convertNumberToWords(1001); // "mil e um"
convertNumberToWords(2000000); // "dois milhões"
convertNumberToWords(-42); // "menos quarenta e dois"
convertNumberToWords(2, { gender: 'feminine' }); // "duas"
convertNumberToWords(12.9); // "doze" (truncated toward zero)
convertNumberToWords(NaN); // ""
```

### convertCurrencyToWords

Write an amount in reais in words ("por extenso"), as on cheques and contracts: `1523.45` becomes `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`. Takes no options.

- `value` is truncated (not rounded) to 2 decimal places.
- Returns `""` for invalid input or an amount above 999 trillion reais.

```javascript
import { convertCurrencyToWords } from '@brazilian-utils/brazilian-utils';

convertCurrencyToWords(1523.45); // "mil quinhentos e vinte e três reais e quarenta e cinco centavos"
convertCurrencyToWords(1); // "um real"
convertCurrencyToWords(0.01); // "um centavo"
convertCurrencyToWords(1000000); // "um milhão de reais"
convertCurrencyToWords(0); // "zero reais"
convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
convertCurrencyToWords(-0.001); // "zero reais" (truncates to nothing)
```

### convertDateToWords

Write a date in Brazilian Portuguese words ("por extenso"): `"01/01/2024"` becomes `"primeiro de janeiro de dois mil e vinte e quatro"`. Accepts a `Date`, read by its local calendar date, or a string in `"dd/mm/yyyy"` or ISO `"yyyy-mm-dd"` format.

- **Options** (`ConvertDateToWordsOptions`): `style` (default `"full"`) spells out day, month and year; `"month"` spells out only the month and leaves day and year as digits, day 1 as `"1º"`. `weekday` (default `false`) prefixes the lowercase weekday name and a comma.
- Returns `""` for an invalid `Date`, a malformed string, a day or month that does not exist, or a date before year 1.

```javascript
import { convertDateToWords } from '@brazilian-utils/brazilian-utils';

convertDateToWords('01/01/2024'); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('2024-01-02'); // "dois de janeiro de dois mil e vinte e quatro"
convertDateToWords(new Date(2024, 0, 1)); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('02/03/2024', { style: 'month' }); // "2 de março de 2024"
convertDateToWords('01/01/2024', { style: 'month' }); // "1º de janeiro de 2024"
convertDateToWords('02/03/2024', { weekday: true }); // "sábado, dois de março de dois mil e vinte e quatro"
convertDateToWords('10/05/1999'); // "dez de maio de mil novecentos e noventa e nove"
convertDateToWords('31/04/2024'); // "" (April has 30 days)
convertDateToWords('invalid'); // ""
convertDateToWords('29/02/1900'); // "" (1900 is not a leap year)
```

## States and municipalities (cities)

### getStates

Get all Brazilian states, each with its two-letter code, name, region code, region name and 2-digit IBGE code (`cUF`).

- Sorted by name in the "pt-BR" locale.
- Exports the `State`, `StateCode` and `StateName` types. `State` is a discriminated union: narrowing it by `code` also narrows the other fields.

```javascript
import { getStates } from '@brazilian-utils/brazilian-utils';

getStates();
// [
//   { code: 'AC', name: 'Acre', regionCode: 'N', regionName: 'Norte', ibgeCode: 12 },
//   { code: 'AL', name: 'Alagoas', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 27 },
//   { code: 'AP', name: 'Amapá', regionCode: 'N', regionName: 'Norte', ibgeCode: 16 },
//   { code: 'AM', name: 'Amazonas', regionCode: 'N', regionName: 'Norte', ibgeCode: 13 },
//   { code: 'BA', name: 'Bahia', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 29 },
//   { code: 'CE', name: 'Ceará', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 23 },
//   { code: 'DF', name: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 53 },
//   { code: 'ES', name: 'Espírito Santo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 32 },
//   { code: 'GO', name: 'Goiás', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 52 },
//   { code: 'MA', name: 'Maranhão', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 21 },
//   { code: 'MT', name: 'Mato Grosso', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 51 },
//   { code: 'MS', name: 'Mato Grosso do Sul', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 50 },
//   { code: 'MG', name: 'Minas Gerais', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 31 },
//   { code: 'PA', name: 'Pará', regionCode: 'N', regionName: 'Norte', ibgeCode: 15 },
//   { code: 'PB', name: 'Paraíba', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 25 },
//   { code: 'PR', name: 'Paraná', regionCode: 'S', regionName: 'Sul', ibgeCode: 41 },
//   { code: 'PE', name: 'Pernambuco', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 26 },
//   { code: 'PI', name: 'Piauí', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 22 },
//   { code: 'RJ', name: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 33 },
//   { code: 'RN', name: 'Rio Grande do Norte', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 24 },
//   { code: 'RS', name: 'Rio Grande do Sul', regionCode: 'S', regionName: 'Sul', ibgeCode: 43 },
//   { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 },
//   { code: 'RR', name: 'Roraima', regionCode: 'N', regionName: 'Norte', ibgeCode: 14 },
//   { code: 'SC', name: 'Santa Catarina', regionCode: 'S', regionName: 'Sul', ibgeCode: 42 },
//   { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 },
//   { code: 'SE', name: 'Sergipe', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 28 },
//   { code: 'TO', name: 'Tocantins', regionCode: 'N', regionName: 'Norte', ibgeCode: 17 },
// ]
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getStateByCep

Get the Brazilian state a CEP belongs to, from the CEP ranges the Correios assign to each state (the "Faixa de CEP" of each UF).

- It runs offline: no CEP API is called, so the answer says which state owns the range, not whether the CEP is in use.
- Accepts what `isValidCep` accepts: 8 digits, as a string or a number, with spaces, dots and hyphens ignored. A CEP that starts with `0` has to be a string, and a negative or fractional number is rejected.
- Amazonas, Distrito Federal and Goiás have two ranges each, and no state range covers `00000-000` to `00999-999` nor `78900-000` to `78999-999`.
- A range is the block the state owns, not a promise that every CEP in it is in use: `10000-000` sits unused inside the São Paulo range and still answers São Paulo.
- Returns `null` for an invalid CEP or one outside every range. Exports the `State` type.

```javascript
import { getStateByCep } from '@brazilian-utils/brazilian-utils';

getStateByCep('01310-100');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByCep(20040020);
// { code: 'RJ', name: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 33 }

getStateByCep('69300-000')?.code; // 'RR'
getStateByCep('72800-000')?.code; // 'GO'
getStateByCep('00999-999'); // null
getStateByCep('12345'); // null
```

Source: [Correios, Busca Faixa de CEP](https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php)

### getStateByIbgeCode

Get the Brazilian state whose 2-digit IBGE code (`cUF`, the Código da Unidade da Federação) matches the given value.

- This is the UF code in the first field of a DF-e access key (chave de acesso), the one `isValidNfeKey` covers.
- Accepts a string or a non-negative integer.
- Returns `null` when the code matches no state. Exports the `State` type.

```javascript
import { getStateByIbgeCode } from '@brazilian-utils/brazilian-utils';

getStateByIbgeCode('35');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByIbgeCode(11);
// { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 }

getStateByIbgeCode('00'); // null
getStateByIbgeCode(-35); // null
getStateByIbgeCode(3.5); // null
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/v1/localidades/estados), [Manual de Orientação do Contribuinte](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf)

### getStateCodeByName

Get the two-letter code (sigla) of a Brazilian state from its full name.

- The match ignores accents, case and surrounding whitespace; internal whitespace collapses into one space.
- Returns `null` when no state matches. Exports the `StateCode` type.

```javascript
import { getStateCodeByName } from '@brazilian-utils/brazilian-utils';

getStateCodeByName('São Paulo'); // 'SP'
getStateCodeByName('sao paulo'); // 'SP'
getStateCodeByName('  Rio de Janeiro  '); // 'RJ'
getStateCodeByName('Neverland'); // null
```

### getStateNameByCode

Get the full name of a Brazilian state from its two-letter code (sigla).

- The match ignores case and surrounding whitespace.
- Returns `null` when no state matches. Exports the `StateName` type.

```javascript
import { getStateNameByCode } from '@brazilian-utils/brazilian-utils';

getStateNameByCode('SP'); // 'São Paulo'
getStateNameByCode('sp'); // 'São Paulo'
getStateNameByCode('  Rj  '); // 'Rio de Janeiro'
getStateNameByCode('ZZ'); // null
```

### getTimezoneByState

Get the IANA time zone name (tzdata zone) of a Brazilian state: the zone of its capital.

- The match ignores case and surrounding whitespace.
- Returns `null` when no state matches.

```javascript
import { getTimezoneByState } from '@brazilian-utils/brazilian-utils';

getTimezoneByState('SP'); // 'America/Sao_Paulo'
getTimezoneByState('am'); // 'America/Manaus'
getTimezoneByState('AC'); // 'America/Rio_Branco'
getTimezoneByState('PE'); // 'America/Recife'
getTimezoneByState('ZZ'); // null
```

Source: [IANA Time Zone Database](https://www.iana.org/time-zones)

### getMunicipalities

Get the Brazilian municipalities (cities) published by the IBGE: every municipality, or only those of one state when `stateCode` is given.

- Each municipality (`Municipality`) is `{ code, name, stateCode }`, where `code` is the 7-digit IBGE code. Sorted by name in the "pt-BR" locale.
- Only an omitted (or `undefined`) `stateCode` asks for the full list: `null` and `''` return `[]`.
- `stateCode` is case-sensitive: `'sp'`, like an unknown code, returns `[]`.
- Embeds all 5571 municipalities. See [Bundle size](getting-started.md#bundle-size) to lazy-load it via `@brazilian-utils/brazilian-utils/get-municipalities`.

```javascript
import { getMunicipalities } from '@brazilian-utils/brazilian-utils';

// Return every Brazilian municipality (sorted by name).
getMunicipalities();
// [
//   { code: '5200050', name: 'Abadia de Goiás', stateCode: 'GO' },
//   { code: '3100104', name: 'Abadia dos Dourados', stateCode: 'MG' },
//   { code: '5200100', name: 'Abadiânia', stateCode: 'GO' },
//   { code: '3100203', name: 'Abaeté', stateCode: 'MG' },
//   { code: '1500107', name: 'Abaetetuba', stateCode: 'PA' },
//   ... 5566 more items
// ]

// Return every municipality of the São Paulo state.
getMunicipalities('SP');
// [
//   { code: '3500105', name: 'Adamantina', stateCode: 'SP' },
//   { code: '3500204', name: 'Adolfo', stateCode: 'SP' },
//   { code: '3500303', name: 'Aguaí', stateCode: 'SP' },
//   { code: '3500402', name: 'Águas da Prata', stateCode: 'SP' },
//   { code: '3500501', name: 'Águas de Lindóia', stateCode: 'SP' },
//   ... 640 more items
// ]

getMunicipalities('ZZ'); // []
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipalityByCode

Look up a Brazilian municipality (city) by its 7-digit IBGE code.

- Accepts the code as a string or a non-negative integer.
- Returns `{ code, name, stateCode }` (`Municipality`), or `null` when the code is not 7 digits long or matches no municipality.

```javascript
import { getMunicipalityByCode } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCode('3550308');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode(3550308);
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode('0000000'); // null (unknown code)
getMunicipalityByCode('123'); // null (not 7 digits)
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipalityByCep

Get the Brazilian municipality (city) a CEP belongs to, from the CEP ranges the Correios assign to each municipality.

- It runs offline: no CEP API is called, so the answer says which municipality owns the range, not whether the CEP is in use.
- Accepts what `isValidCep` accepts: 8 digits, as a string or a number, with spaces, dots and hyphens ignored. A CEP that starts with `0` has to be a string, and a negative or fractional number is rejected.
- Returns `{ code, name, stateCode }` (`Municipality`, the same shape `getMunicipalityByCode` returns), or `null` for an invalid CEP or one outside every range.
- Some municipalities were absorbed into another one's range, or have no dedicated range at all; a state `getStateByCep` resolves can still leave `getMunicipalityByCep` at `null`.

```javascript
import { getMunicipalityByCep } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCep('01310-100');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCep(20040020);
// { code: '3304557', name: 'Rio de Janeiro', stateCode: 'RJ' }

getMunicipalityByCep('00999-999'); // null
getMunicipalityByCep('12345'); // null
```

Source: [Correios, Busca Faixa de CEP](https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php)

### getCities

Get the names of Brazilian cities: every city, or only those of one state. **Deprecated:** use `getMunicipalities` instead.

- Sorted in the "pt-BR" locale.
- Any falsy `state` asks for the full list, where `getMunicipalities` returns `[]`.
- `state` is case-sensitive: `'sp'`, like an unknown code, returns `[]`.
- Embeds all 5571 names (~154.2 KB minified, ~49.8 KB gzipped). See [Bundle size](getting-started.md#bundle-size) to lazy-load it via `@brazilian-utils/brazilian-utils/get-cities`.

```javascript
import { getCities } from '@brazilian-utils/brazilian-utils';

// Return all Brazilian cities (sorted alphabetically).
getCities();
// [
//   'Abadia de Goiás',
//   'Abadia dos Dourados',
//   'Abadiânia',
//   'Abaeté',
//   'Abaetetuba',
//   'Abaiara',
//   'Abaíra',
//   'Abaré',
//   'Abatiá',
//   'Abdon Batista',
//   ... 5561 more items
// ]

// Return all Brazilian cities of the São Paulo state (sorted alphabetically).
getCities('SP');
// [
//   "Adamantina",
//   "Adolfo",
//   "Aguaí",
//   "Águas da Prata",
//   "Águas de Lindóia",
//   "Águas de Santa Bárbara",
//   "Águas de São Pedro",
//   "Agudos",
//   "Alambari",
//   "Alfredo Marcondes",
//   ... 635 more items
// ]
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipality

Get municipality information by IBGE code, or an IBGE code from a municipality name and UF. **Deprecated:** use `getMunicipalityByCode` instead, which is synchronous and offline; matching a municipality by name is up to the application, over `getMunicipalities`.

- One function handles both directions, based on whether `options` has a `code` or a `municipalityName`/`uf`. The lookup is offline: no network request is made.
- The name match ignores accents and case, and every run of whitespace collapses into one space.
- Resolves to `null` for an unknown municipality, an unknown UF or invalid input.
- `GetMunicipalityOptions`, `GetMunicipalityByCodeOptions` and `GetMunicipalityByNameOptions` are deprecated aliases of the types below.

```javascript
import { getMunicipality } from '@brazilian-utils/brazilian-utils';

await getMunicipality({ code: '3550308' });
// ['São Paulo', 'SP']

await getMunicipality({ code: 3550308 });
// ['São Paulo', 'SP']

await getMunicipality({ municipalityName: 'sao paulo', uf: 'sp' });
// '3550308'

await getMunicipality({ code: '0000000' });
// null (unknown code)

await getMunicipality({ code: '123' });
// null (not 7 digits)
```

```typescript
import {
  getMunicipality,
  type GetMunicipalityByCodeParams,
  type GetMunicipalityByNameParams,
  type GetMunicipalityParams,
} from '@brazilian-utils/brazilian-utils';

const byCode: GetMunicipalityByCodeParams = { code: '3550308' };
const byName: GetMunicipalityByNameParams = { municipalityName: 'sao paulo', uf: 'sp' };

await getMunicipality(byCode);
// Promise<[string, string] | null>

await getMunicipality(byName);
// Promise<string | null>

const lookUp = (options: GetMunicipalityParams) => getMunicipality(options);
// (options: GetMunicipalityParams) => Promise<[string, string] | string | null>
```

Source: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

## Holidays and business days

### getHolidays

Get the Brazilian holidays of a year: the national ones and, with a `stateCode`, that state's holidays too. Accepts a year or `{ year, stateCode }` (`GetHolidaysParams`).

- Each holiday is a `Holiday` whose `type` (`HolidayType`) is `"national"`, `"state"`, `"optional"` or `"religious"`. Holidays are sorted by date.
- "Dia da Consciência Negra", Nov 20, is national from 2024 on.
- Per-state rules (SC's Sunday shift, DF's Corpus Christi, dates that stopped being holidays) follow each state's law; see the source for the list.
- An unknown or non-string `stateCode` is ignored and only national holidays are returned.
- Returns `[]` when the year is not an integer from 1900 to 2099, or when the argument is neither a number nor an object.

```javascript
import { getHolidays } from '@brazilian-utils/brazilian-utils';

// Get all national holidays for 2024
getHolidays(2024);
// [
//   { name: 'Ano novo', date: Date('2024-01-01'), type: 'national' },
//   { name: 'Carnaval (terça-feira)', date: Date('2024-02-13'), type: 'optional' },
//   { name: 'Sexta-feira Santa', date: Date('2024-03-29'), type: 'national' },
//   { name: 'Páscoa', date: Date('2024-03-31'), type: 'religious' },
//   { name: 'Dia da Consciência Negra', date: Date('2024-11-20'), type: 'national' },
//   // ... more holidays
// ]

// Get holidays for a specific state
getHolidays({ year: 2024, stateCode: 'SP' });
// Includes national holidays plus state-specific holidays (e.g., "Revolução Constitucionalista")
```

Source: `src/get-holidays/constants.ts`, [Lei nº 662/1949](https://www.planalto.gov.br/ccivil_03/leis/l0662.htm), [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm).

### isHoliday

Check if a date is a Brazilian holiday. Accepts `{ targetDate, stateCode? }` (`IsHolidayParams`).

- The check uses `targetDate`'s local calendar date, not its UTC instant.
- `stateCode` also considers that state's holidays. An unknown code is ignored, as in `getHolidays`.
- Returns `false` when `targetDate` is missing or not a valid `Date`, or when `stateCode` is present and not a string.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

### isBusinessDay

Check if a date is a Brazilian business day (dia útil): not a Saturday, a Sunday or a holiday `getHolidays` lists for its local calendar day.

- **Options** (`BusinessDayOptions`, shared by every business day util): `includeOptional` (default `true`) also counts the `"optional"` holidays, Carnaval and Corpus Christi, as non-business days; `stateCode` also counts that state's holidays.
- Returns `false` when `value` is not a valid `Date` or its year is outside 1900 to 2099, or when `stateCode` is present and not a string.

```javascript
import { isBusinessDay } from '@brazilian-utils/brazilian-utils';

isBusinessDay(new Date(2024, 0, 2)); // true (Tuesday, not a holiday)
isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
isBusinessDay(new Date(2024, 0, 6)); // false (Saturday)
isBusinessDay(new Date(2024, 1, 13)); // false (Carnaval, optional holiday, counts by default)
isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
isBusinessDay(new Date(2024, 6, 9), { stateCode: 'SP' }); // false (Revolução Constitucionalista)
isBusinessDay(new Date(2024, 6, 9)); // true (state holiday ignored without stateCode)
isBusinessDay(new Date('not a date')); // false
```

### addBusinessDays

Add a number of Brazilian business days (dias úteis) to a date, skipping Saturdays, Sundays and the holidays `isBusinessDay` skips. Signature: `addBusinessDays(date, amount, options?)`, the same as date-fns.

- **Options** (`BusinessDayOptions`, shared with `isBusinessDay`): `includeOptional` (default `true`) also skips Carnaval and Corpus Christi; `stateCode` also skips that state's holidays.
- Returns a new `Date`, time of day preserved; `date` is never mutated.
- An `amount` of `0` returns the same date, even on a weekend or holiday. A negative `amount` walks backwards.
- Returns `null` when `date` is invalid, `amount` is not a finite integer, `stateCode` is not a string, or the result leaves the years 1900 to 2099.

```javascript
import { addBusinessDays } from '@brazilian-utils/brazilian-utils';

addBusinessDays(new Date(2024, 0, 2, 12), 1); // Date, 2024-01-03 12:00 (next day is already a business day)
addBusinessDays(new Date(2024, 11, 31, 12), 1); // Date, 2025-01-02 12:00 (2025-01-01 is Ano novo, skipped)
addBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-04 12:00 (walks backwards)
addBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (unchanged, even though Saturday is not a business day)
addBusinessDays(new Date(2024, 6, 8, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-10 12:00 (2024-07-09 is Revolução Constitucionalista in SP, skipped)
addBusinessDays(new Date('not a date'), 1); // null
addBusinessDays(new Date(2024, 0, 2), 1.5); // null (not an integer)
```

### subBusinessDays

Subtract a number of Brazilian business days (dias úteis) from a date. `subBusinessDays(date, amount, options?)` is `addBusinessDays(date, -amount, options)`.

- Same rules as `addBusinessDays`, `BusinessDayOptions` included. A negative `amount` walks forwards.

```javascript
import { subBusinessDays } from '@brazilian-utils/brazilian-utils';

subBusinessDays(new Date(2024, 0, 5, 12), 1); // Date, 2024-01-04 12:00 (previous day is already a business day)
subBusinessDays(new Date(2024, 0, 8, 12), 1); // Date, 2024-01-05 12:00 (walks back over the weekend)
subBusinessDays(new Date(2025, 0, 2, 12), 1); // Date, 2024-12-31 12:00 (2025-01-01 is Ano novo, skipped)
subBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-08 12:00 (walks forwards)
subBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (unchanged, even though Saturday is not a business day)
subBusinessDays(new Date(2024, 6, 10, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-08 12:00 (2024-07-09 is Revolução Constitucionalista in SP, skipped)
subBusinessDays(new Date('not a date'), 1); // null
subBusinessDays(new Date(2024, 0, 2), 1.5); // null (not an integer)
```

To get the n-th business day of a month, or the last one, start from the day just outside the month:

```javascript
import { addBusinessDays, subBusinessDays } from '@brazilian-utils/brazilian-utils';

// n-th business day of the month: add n from the last day of the month before
addBusinessDays(new Date(2024, 0, 0), 5); // Date, 2024-01-08 00:00 (5th business day of January 2024)
addBusinessDays(new Date(2024, 1, 0), 10); // Date, 2024-02-15 00:00 (10th of February 2024, Carnaval skipped)

// last business day of the month: subtract 1 from the first day of the month after
subBusinessDays(new Date(2024, 3, 1), 1); // Date, 2024-03-28 00:00 (2024-03-29 is Sexta-feira Santa, then a weekend)
subBusinessDays(new Date(2024, 1, 1), 2); // Date, 2024-01-30 00:00 (2nd to last of January 2024)
```

- An `n` beyond the business days of the month lands in the next month (`addBusinessDays(new Date(2024, 0, 0), 23)` is 2024-02-01, January 2024 has 22); compare `getMonth()` when that matters.
- This is the banking count (Monday to Friday). The payroll "quinto dia útil" of CLT art. 459 § 1º is counted differently by labour inspection.
- The n-th business day of January 1900 and the last business day of December 2099 return `null`, since the recipe starts from a day outside the supported years (31 December 1899 and 1 January 2100).

### differenceInBusinessDays

Count the Brazilian business days (dias úteis) between two dates. Signature: `differenceInBusinessDays(laterDate, earlierDate, options?)`, the same as date-fns.

- **Options** (`BusinessDayOptions`, shared with `isBusinessDay`): `includeOptional` (default `true`) also skips Carnaval and Corpus Christi; `stateCode` also skips that state's holidays.
- Counts `earlierDate` when it is a business day and every business day strictly between the two dates; `laterDate` is never counted. The time of day is ignored.
- The result is negative when `laterDate` is before `earlierDate`, and `0` on the same calendar day.
- Returns `null` when either date is not a valid `Date` or is outside the years 1900 to 2099, or `stateCode` is not a string.

```javascript
import { differenceInBusinessDays } from '@brazilian-utils/brazilian-utils';

differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1)); // 0 (Jan 1 is Ano novo, not counted)
differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2)); // 1 (Jan 2 counted, a Tuesday; Jan 3 is not)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3)); // -1 (the later date comes first, so the count is negative)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 2)); // 0 (same day)
differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), { stateCode: 'SP' }); // 1 (2024-07-09 is a state holiday in SP)
differenceInBusinessDays(new Date(), new Date('not a date')); // null
```

## Passport

### isValidPassport

Check if a Brazilian passport number is valid: 2 letters followed by 6 digits.

- There is no check digit, so a well-formed number is not necessarily a real passport.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (case-insensitive)
isValidPassport('AB-123.456'); // true (symbols are ignored)
isValidPassport('12345678'); // false
```

Source: [Polícia Federal](https://www.gov.br/pf/pt-br/assuntos/passaporte) and its [FAQ](https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-numero-onde-fica-e).

### formatPassport

Format a Brazilian passport number: uppercase, without symbols, capped to 8 characters. It is the same operation as `parsePassport`, of which it is an alias.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

### parsePassport

Remove all non-alphanumeric characters from a passport number, uppercase the result, and cap it to 8 characters.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

### generatePassport

Generate a random valid Brazilian passport number.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## CNH

### isValidCnh

Check if a CNH is valid. Spaces, dots and hyphens are ignored; any other character makes the value invalid.

- A value whose 11 digits are all the same is rejected, so `'11111111111'` is invalid.
- The first check digit keeps a remainder of 1 as `1`, as real registry numbers do. Resolução CONTRAN nº 886/2021 says `0`.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hyphen before the check digits)
isValidCnh('ab00000000119'); // false (letters are rejected)
```

Source: [Resolução CONTRAN nº 886/2021, art. 4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf); weights per [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/).

### formatCnh

Format a CNH.

- **Options** (`FormatCnhOptions`): `pad` left-pads the value with zeros to the full 11 digits before masking (default `false`).

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
```

### parseCnh

Remove CNH formatting, keep only digits, and cap the result to 11 digits.

```javascript
import { parseCnh } from '@brazilian-utils/brazilian-utils';

parseCnh('026503064-61'); // '02650306461'
```

### generateCnh

Generate a valid random CNH.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

## Legal nature

### isValidLegalNature

Check if a legal nature code exists in the official list, the IBGE/CONCLA "Natureza Jurídica 2021" table. Only hyphens, dots and whitespace are tolerated around the 4 digits.

- The 92 codes in force are accepted, plus the 8 a past revision retired. `getLegalNature` tells them apart (`legacy: true`).

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('2208'); // true (retired by a past revision, still accepted)
isValidLegalNature('9999'); // false
```

Source: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021) and its [detailed structure PDF](https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf).

### formatLegalNature

Format a legal nature code. Use `isValidLegalNature` to check a code.

- **Options** (`FormatLegalNatureOptions`): `pad` first left-pads the value with zeros to the 4 digits of a complete code (default `false`).

```javascript
import { formatLegalNature } from '@brazilian-utils/brazilian-utils';

formatLegalNature('2062'); // 206-2
formatLegalNature(2062); // 206-2
formatLegalNature('206'); // 206 (masked as far as it goes)
formatLegalNature('62', { pad: true }); // 006-2 (padded to 4 digits first)
```

### parseLegalNature

Remove legal nature formatting, keep only digits, and cap the result to 4 digits.

```javascript
import { parseLegalNature } from '@brazilian-utils/brazilian-utils';

parseLegalNature('206-2'); // '2062'
```

### generateLegalNature

Generate a random valid legal nature code. Only the 92 codes in force are drawn, never a retired one.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

### getLegalNature

Look a legal nature code up in the official IBGE/CONCLA table. Returns `null` for an unknown code.

- The entry (`LegalNature`) also carries the CONCLA category of the code, given by its first digit.
- A code a past revision retired comes back with `legacy: true` and the `currentCode` it corresponds to today, or `currentCode: null` when there is no successor. Codes in force have `legacy: false` and no `currentCode`.

| Retired code | Description | Corresponds to |
| --- | --- | --- |
| `2076` | Sociedade Empresária em Nome Coletivo | `2070`, the code the 2003.1 revision renumbered it to, same denomination |
| `2100` | Sociedade Mercantil de Capital e Indústria | none, marked "categoria extinta" by the 2003.1 x 2009 correspondence |
| `2208` | Entidade Binacional Itaipu | `2275` Empresa Binacional |
| `3042` | Organização Social | `3069` Fundação Privada; the 2014 revision later created `3301` Organização Social (OS), where an entity qualified as one is classified today |
| `3050` | Organização da Sociedade Civil de Interesse Público (Oscip) | none, an Oscip is classified by the form it takes (`3999` or `3069`) |
| `3093` | Unidade Executora (Programa Dinheiro Direto na Escola) | `3999` Associação Privada |
| `3123` | Partido Político | none, the 2014 revision split it into `3255`, `3263` and `3271` |
| `5002` | Organização Internacional e Outras Instituições Extraterritoriais | `5010` Organização Internacional, the code it was opened into alongside `5029` and `5037` |

```javascript
import { getLegalNature } from '@brazilian-utils/brazilian-utils';

getLegalNature('2062');
// {
//   code: '2062',
//   description: 'Sociedade Empresária Limitada',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: false,
// }
getLegalNature('2208');
// {
//   code: '2208',
//   description: 'Entidade Binacional Itaipu',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: true,
//   currentCode: '2275',
// }
getLegalNature('3123')?.currentCode; // null (retired without a successor)
getLegalNature('206-2')?.code; // '2062'
getLegalNature(206.2)?.category.description; // 'Entidades Empresariais'
getLegalNature('0000'); // null
```

Source: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021).

### getLegalNatures

Get the legal nature map keyed by code. Only the 92 codes in force are listed by default.

- **Options** (`GetLegalNaturesParams`): `includeLegacy` (default `false`) adds the 8 retired codes.

```javascript
import { getLegalNatures } from '@brazilian-utils/brazilian-utils';

const legalNatures = getLegalNatures();

legalNatures['2062']; // 'Sociedade Empresária Limitada'
Object.keys(legalNatures).length; // 92
legalNatures['2208']; // undefined (retired by a past revision)
getLegalNatures({ includeLegacy: true })['2208']; // 'Entidade Binacional Itaipu'
```

### getLegalNaturesByCategory

Get every legal nature of a CONCLA category, the group given by the first digit of the code. The category is accepted as a string or as a number.

- Categories: `1` Administração Pública, `2` Entidades Empresariais, `3` Entidades sem Fins Lucrativos, `4` Pessoas Físicas and `5` Organizações Internacionais e Outras Instituições Extraterritoriais.
- **Options** (`GetLegalNaturesByCategoryOptions`): `includeLegacy` (default `false`) adds the retired codes of the category.
- The entries come back sorted by code. An unknown category returns `[]`.

```javascript
import { getLegalNaturesByCategory } from '@brazilian-utils/brazilian-utils';

getLegalNaturesByCategory('4')[0];
// {
//   code: '4014',
//   description: 'Empresa Individual Imobiliária',
//   category: { code: '4', description: 'Pessoas Físicas' },
//   legacy: false,
// }
getLegalNaturesByCategory(4).length; // 6
getLegalNaturesByCategory('2').length; // 30
getLegalNaturesByCategory('2', { includeLegacy: true }).length; // 33
getLegalNaturesByCategory('9'); // []
```

## Voter ID (título de eleitor)

### isValidVoterId

Check if a voter ID number is valid. Accepts the standard 12-digit id and the 13-digit id issued by São Paulo (UF `01`) and Minas Gerais (UF `02`).

- A voter ID is an 8-digit sequential number, a 2-digit federative union code (`01` to `28`) and 2 check digits.
- Whitespace and dots are accepted around and between the groups. Any other character, a hyphen included, makes the value invalid.

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
isValidVoterId('102385010671'); // true (12 digits)
isValidVoterId('1234567880191'); // true (13 digits, São Paulo)
isValidVoterId('123456780124'); // false (invalid check digits)
```

Source: [Resolução TSE nº 23.659/2021, art. 36](https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021), [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py) and [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/).

### formatVoterId

Format a voter ID number with the 12-digit grouping `0000 0000 00 00`.

- The 13-digit grouping `0000 0000 0 00 00` is used only when the value has more than 12 digits and its UF code (the 10th and 11th digits) is `01` or `02`.
- Digits past the last slot of the pattern are dropped.

```javascript
import { formatVoterId } from '@brazilian-utils/brazilian-utils';

formatVoterId('123456780175'); // '1234 5678 01 75'
formatVoterId('1234567880191'); // '1234 5678 8 01 91' (13-digit SP/MG voter id)
```

### parseVoterId

Remove voter ID formatting, keep only digits, and cap the result to 12 digits (13 when the UF digits identify São Paulo or Minas Gerais).

```javascript
import { parseVoterId } from '@brazilian-utils/brazilian-utils';

parseVoterId('1234 5678 01 75'); // '123456780175'
parseVoterId('1234 5678 8 01 91'); // '1234567880191' (13-digit SP/MG voter id)
```

### generateVoterId

Generate a valid random voter ID number. The optional `state` argument (`StateCode`, or `"ZZ"` for a voter ID issued abroad) sets the federative union code.

- An unknown state, or a value that is not a string, falls back to `"ZZ"` (UF `28`).
- The result always has 12 digits, never the 13-digit São Paulo or Minas Gerais form.

```javascript
import { generateVoterId } from '@brazilian-utils/brazilian-utils';

generateVoterId(); // valid random voter ID (abroad, "ZZ")
generateVoterId('SP'); // valid random voter ID for Sao Paulo
generateVoterId('XX'); // falls back to "ZZ" instead of throwing
```

## CNS

### isValidCns

Check if a CNS (Cartão Nacional de Saúde) number is valid, the SUS (Sistema Único de Saúde) identifier of a user, health professional or health facility. The value must be the 15 digits, optionally split into the printed groups of 3-4-4-4 by whitespace, `.`, `-` or `/`.

- Definitive cards start with 1 or 2, provisional ones with 7, 8 or 9; each has its own modulus 11 rule.
- A number starting with 5 is rejected, following ANVISA.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitive)
isValidCns('100000000060018'); // true (definitive, raw check digit 10, suffix 001)
isValidCns('700000000000005'); // true (provisional)
isValidCns('123.4567-8901/0000'); // true (any of the mask characters)
isValidCns('123456789010001'); // false (wrong check digit)
isValidCns('12345678901'); // false (wrong length)
isValidCns('abc123456789010000'); // false (not written as a CNS)
```

Source: [ANVISA CNS validation page](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/) and the [e-SUS APS page](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html).

### formatCns

Format a CNS (Cartão Nacional de Saúde) number into the common display groups of 3-4-4-4 digits separated by spaces.

- **Options** (`FormatCnsOptions`): `pad` left-pads the value with zeros up to the 15 slots of the pattern before masking (default `false`).

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010000'); // '123 4567 8901 0000'
formatCns(123456789010000); // '123 4567 8901 0000'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

### parseCns

Remove CNS (Cartão Nacional de Saúde) formatting, keep only digits, and cap the result to 15 digits.

```javascript
import { parseCns } from '@brazilian-utils/brazilian-utils';

parseCns('123 4567 8901 0000'); // '123456789010000'
```

## Certidão (civil registry certificate)

### isValidCertidao

Check if the matrícula of a certidão de registro civil (birth, marriage, death and the other acts of a registro civil das pessoas naturais) is valid. Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can hold.

The matrícula has 32 digits, printed as `000000 00 00 0000 0 00000 000 0000000 00`:

| Digits | Field |
| --- | --- |
| 6 | CNS da serventia |
| 2 | acervo |
| 2 | serviço, always `55` |
| 4 | ano |
| 1 | tipo do livro |
| 5 | livro |
| 3 | folha |
| 7 | termo |
| 2 | dígitos verificadores |

- **Options** (`IsValidCertidaoOptions`): `accept` narrows the valid book types (`CertidaoType`) to the listed ones (default: every type).
- The serviço must be `55`, and the book-type digit must be one of the nine books (`0` is rejected).
- Accepts the value masked or not, with whitespace between and around the groups.

```javascript
import { isValidCertidao } from '@brazilian-utils/brazilian-utils';

isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21'); // true
isValidCertidao('09430001552010100020112000012087'); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 22'); // false (invalid check digits)
isValidCertidao('09400301542011100110002005191744'); // false (serviço is not 55)
isValidCertidao('123456'); // false (wrong length)
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['birth'] }); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['death'] }); // false
```

Source: [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); check digits per [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

### formatCertidao

Format the matrícula of a certidão de registro civil into the printed mask of art. 473. The 32 digits are grouped as 6 2 2 4 1 5 3 7 2 and separated by spaces.

- **Options** (`FormatCertidaoOptions`): `pad` left-pads the value with zeros up to 32 digits (default `false`).
- A number is accepted, but a full 32-digit matrícula has to be a string.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
formatCertidao(104539015520); // 104539 01 55 20 (a number is read as the string of its digits)
```

Source: [art. 473 of the Código Nacional de Normas](https://atos.cnj.jus.br/atos/detalhar/5243).

### parseCertidao

Remove the formatting of the matrícula of a certidão de registro civil, keep only digits, and cap the result to 32 digits.

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
// '10453901552013100012021000012321'
```

### getCertidaoInfo

Parse the matrícula of a certidão de registro civil into its fields. Accepts the same input forms as `isValidCertidao` and returns `null` when the matrícula is not valid.

- Returns `null` also for a serviço other than `55` and for a book code outside 1 to 9.
- Art. 473, V lists only the book codes 1 to 7. The codes 8 (emancipação) and 9 (interdição) are also accepted.

The `CertidaoInfo` result carries:

| Key | Description |
| --- | --- |
| `registryCns` | The 6 digit CNS (Código Nacional de Serventia) of the serventia that issued the act. |
| `acervo` | Acervo the book belongs to: `"01"` the serventia's own, `"02"` and up one per acervo it absorbed. Art. 473, §§ 3º to 5º splits the absorbed ones by the date the origin serventia was extinguished or deactivated. Up to 31/12/2009: the CNS of the incorporating unit and an acervo code from `"02"` up, one per incorporation. From 01/01/2010 on: the CNS of the incorporated unit itself and the code `"01"`, counted as that unit's own acervo. An acervo split between two or more successor serventias gets each successor's own CNS with the code `"02"`. |
| `service` | Service rendered by the serventia, always `"55"`, the registro civil das pessoas naturais. |
| `year` | Four digit year the act was recorded. |
| `type` | The book the act belongs to: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, `"emancipation"` or `"interdiction"`. |
| `typeCode` | Raw book code, 1 to 9, as printed in the fifteenth position of the matrícula. |
| `book` | The 5 digit book (livro) number, zero padded. |
| `page` | The 3 digit page (folha) number, zero padded. |
| `term` | The 7 digit term (termo) number, zero padded. |
| `checkDigits` | The 2 modulus 11 check digits of the matrícula. |

```javascript
import { getCertidaoInfo } from '@brazilian-utils/brazilian-utils';

getCertidaoInfo('104539 01 55 2013 1 00012 021 0000123 21');
// {
//   registryCns: '104539',
//   acervo: '01',
//   service: '55',
//   year: 2013,
//   type: 'birth',
//   typeCode: 1,
//   book: '00012',
//   page: '021',
//   term: '0000123',
//   checkDigits: '21'
// }

getCertidaoInfo('invalid'); // null
```

Source: [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); book codes 8 and 9 per [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

## CEI, CNO and CAEPF

### isValidCei

Check if a CEI (Cadastro Específico do INSS) number is valid. The CEI identifies an employer with no CNPJ, such as a construction work or a rural producer.

- Layout: 12 digits printed as `00.000.00000/00`, 11 base digits and one check digit.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (invalid check digit)
isValidCei('000000000000'); // false (repeated digits)
```

Source: [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php), [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs) and the [CNO open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCei

Format a CEI (Cadastro Específico do INSS) number with the usual `00.000.00000/00` mask.

- **Options** (`FormatCeiOptions`): `pad` left-pads the value with zeros up to 12 digits (default `false`).

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

### parseCei

Remove CEI (Cadastro Específico do INSS) formatting, keep only digits, and cap the result to 12 digits.

```javascript
import { parseCei } from '@brazilian-utils/brazilian-utils';

parseCei('27.729.71181/87'); // '277297118187'
```

### isValidCno

Check if a CNO (Cadastro Nacional de Obras) number is valid. The CNO replaced the CEI for construction works and kept its numbering.

- Same rules as `isValidCei`.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (invalid check digit)
isValidCno('000000000000'); // false (repeated digits)
```

Source: [CNO page of the Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno) and the [CNO open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCno

Format a CNO (Cadastro Nacional de Obras) number.

- Same rules as `formatCei`: the `00.000.00000/00` mask, with `pad` in `FormatCnoOptions`.

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

### parseCno

Remove CNO (Cadastro Nacional de Obras) formatting, keep only digits, and cap the result to 12 digits, the numbering the CNO kept from the CEI.

```javascript
import { parseCno } from '@brazilian-utils/brazilian-utils';

parseCno('11.113.01373/68'); // '111130137368'
```

### isValidCaepf

Check if a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number is valid. The CAEPF replaced the CEI for individuals who hire employees, such as rural producers.

- Layout: 14 digits printed as `000.000.000/000-00`: the 9-digit CPF base of the holder, a 3-digit sequence and 2 check digits.
- Both check digits follow the CNPJ's modulus 11; the pair is then shifted by 12, wrapping around 100.

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (invalid check digits)
isValidCaepf('00000000000000'); // false (repeated base digits)
isValidCaepf('00000000000012'); // false (repeated base digits)
```

Source: [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

### formatCaepf

Format a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number with the usual `000.000.000/000-00` mask.

- Same rules as `formatCei`, with `pad` (`FormatCaepfOptions`) padding up to 14 digits (default `false`).

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

### parseCaepf

Remove CAEPF (Cadastro de Atividade Econômica da Pessoa Física) formatting, keep only digits, and cap the result to 14 digits.

```javascript
import { parseCaepf } from '@brazilian-utils/brazilian-utils';

parseCaepf('293.118.610/001-84'); // '29311861000184'
```

## Classification codes (CBO, CNAE, NCM, CFOP, CST, CSOSN)

### isValidCbo

Check if a CBO (Classificação Brasileira de Ocupações) code exists in the official CBO 2002 table.

- Accepts a string with the 6 digits or with the `NNNN-NN` mask, or a number.
- A masked string needs a single separator (space, `.`, `-` or `/`) between the groups. Any other string is rejected instead of having its digits picked out.
- Bare digits are left padded with zeros to 6, as a string or as a number. A masked value is read as written.

```javascript
import { isValidCbo } from '@brazilian-utils/brazilian-utils';

isValidCbo('2124-05'); // true
isValidCbo('212405'); // true
isValidCbo(212405); // true
isValidCbo(10205); // true (padded to 6 digits, so this is '010205')
isValidCbo('10205'); // true (padded the same way a number is)
isValidCbo('000000'); // false
isValidCbo('2124abc05'); // false (not a documented form)
isValidCbo(-212405); // false (not a non-negative safe integer)
```

Source: [CBO 2002 occupation table published by the MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### parseCbo

Remove CBO (Classificação Brasileira de Ocupações) formatting, keep only digits, and cap the result to 6 digits.

- Nothing is left padded: the leading zero of a code such as `010205` has to be written out. Use `getCbo` or `isValidCbo` to look an occupation up.

```javascript
import { parseCbo } from '@brazilian-utils/brazilian-utils';

parseCbo('2124-05'); // '212405'
```

### getCbo

Look a CBO (Classificação Brasileira de Ocupações) code up and get its official occupation title. The result is a `Cbo` record: `{ code, description }`.

- Same rules as `isValidCbo`. Returns `null` when the code is unknown or the value is not in a documented form.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', description: 'Analista de desenvolvimento de sistemas' }
getCbo(10205); // { code: '010205', description: 'Oficial da aeronáutica' } (padded to 6 digits)
getCbo('10205'); // { code: '010205', description: 'Oficial da aeronáutica' } (padded the same way)
getCbo('000000'); // null
getCbo('2124abc05'); // null (not a documented form)
```

Source: [CBO 2002 occupation table published by the MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### isValidCnae

Check if a CNAE (Classificação Nacional de Atividades Econômicas) subclass code exists in the CNAE-Subclasses 2.3 table, the current subclass revision of CNAE 2.0.

- Same rules as `isValidCbo`, with 7 digits and the `NNNN-N/NN` mask.

```javascript
import { isValidCnae } from '@brazilian-utils/brazilian-utils';

isValidCnae('6201-5/01'); // true
isValidCnae('6201501'); // true
isValidCnae(111301); // true (padded to 7 digits, so this is '0111301')
isValidCnae('111301'); // true (padded the same way a number is)
isValidCnae('0000000'); // false
isValidCnae('0111abc301'); // false (not a documented form)
isValidCnae(-111301); // false (not a non-negative safe integer)
```

Source: [CNAE-Subclasses 2.3 at CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) and the [IBGE subclasses API](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### formatCnae

Format a CNAE (Classificação Nacional de Atividades Econômicas) subclass code. Only the structure changes; use `isValidCnae` to check a code against the table.

- **Options** (`FormatCnaeOptions`): `pad` (default `false`) first left pads the value with zeros to the 7 digits of a complete code. Without it the mask is applied as far as the value goes.
- Characters outside the mask are dropped, and a number is read as the string of its digits. Returns `''` when there is no digit at all.

```javascript
import { formatCnae } from '@brazilian-utils/brazilian-utils';

formatCnae('6201501'); // 6201-5/01
formatCnae('62'); // 62 (masked as far as it goes)
formatCnae('62015'); // 6201-5
formatCnae('62', { pad: true }); // 0000-0/62 (padded to 7 digits first)
formatCnae(111301, { pad: true }); // 0111-3/01
formatCnae('abc6201501'); // 6201-5/01 (only the digits are read)
formatCnae(-6201501); // 6201-5/01
```

### parseCnae

Remove CNAE (Classificação Nacional de Atividades Econômicas) formatting, keep only digits, and cap the result to the 7 digits of a complete subclass code.

- Same rules as `parseCbo`: nothing is left padded here.

```javascript
import { parseCnae } from '@brazilian-utils/brazilian-utils';

parseCnae('6201-5/01'); // '6201501'
parseCnae('62'); // '62' (a partial code is kept as written)
```

### getCnae

Look a CNAE (Classificação Nacional de Atividades Econômicas) subclass code up and get its code and official description. The result is a `Cnae` record: `{ code, description }`.

- Same rules as `getCbo`, with 7 digits and the `NNNN-N/NN` mask.
- `code` comes back as the 7 bare digits; pass it to `formatCnae` for the `NNNN-N/NN` form.

```javascript
import { formatCnae, getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201-5/01'); // { code: '6201501', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae(111301); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (padded to 7 digits)
getCnae('111301'); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (padded the same way)
getCnae('0000000'); // null
getCnae('0111abc301'); // null (not a documented form)
formatCnae(getCnae('6201501')?.code); // 6201-5/01 (the mask is the formatter's job)
```

Source: [CNAE-Subclasses 2.3 at CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) and the [IBGE subclasses API](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### isValidNcm

Check if an NCM (Nomenclatura Comum do Mercosul) code exists in the current table published by Siscomex/MDIC.

- Same rules as `isValidCbo`, with 8 digits and the `NNNN.NN.NN` mask.

```javascript
import { isValidNcm } from '@brazilian-utils/brazilian-utils';

isValidNcm('8471.30.12'); // true
isValidNcm('84713012'); // true
isValidNcm(1012100); // true (padded to 8 digits, so this is '01012100')
isValidNcm('1012100'); // true (padded the same way a number is)
isValidNcm('00000000'); // false
isValidNcm('abc01012100'); // false (not a documented form)
isValidNcm(-84713012); // false (not a non-negative safe integer)
```

Source: [NCM nomenclature published by the Portal Único Siscomex](https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json).

### formatNcm

Format an NCM (Nomenclatura Comum do Mercosul) code. Only the structure changes; use `isValidNcm` to check a code against the table.

- **Options** (`FormatNcmOptions`): `pad` (default `false`) first left pads the value with zeros to the 8 digits of a complete code.
- Same rules as `formatCnae`, with the `NNNN.NN.NN` mask.

```javascript
import { formatNcm } from '@brazilian-utils/brazilian-utils';

formatNcm('84713012'); // 8471.30.12
formatNcm('8471'); // 8471 (masked as far as it goes)
formatNcm('847130'); // 8471.30
formatNcm('8471', { pad: true }); // 0000.84.71 (padded to 8 digits first)
formatNcm('abc8471'); // 8471 (only the digits are read)
formatNcm(-84713012); // 8471.30.12
```

### parseNcm

Remove NCM (Nomenclatura Comum do Mercosul) formatting, keep only digits, and cap the result to the 8 digits of a complete code.

- Same rules as `parseCbo`: nothing is left padded here.

```javascript
import { parseNcm } from '@brazilian-utils/brazilian-utils';

parseNcm('8471.30.12'); // '84713012'
parseNcm('8471'); // '8471' (a partial code is kept as written)
```

### isValidCfop

Check if a CFOP (Código Fiscal de Operações e Prestações) code exists in the official table, the consolidated Anexo II of Convênio SINIEF s/nº 1970 in force.

- Only operable codes count: the group and subgroup headings, the codes ending in `00` and `50`, are rejected.
- Accepts a string with the 4 digits or with the `N.NNN` form, with a single separator (space, `.`, `-` or `/`), or a number. Any other string is rejected.
- No CFOP code starts with a zero, so nothing is padded.

```javascript
import { isValidCfop } from '@brazilian-utils/brazilian-utils';

isValidCfop('5102'); // true
isValidCfop('1.101'); // true
isValidCfop('7504'); // true (added by the 2022 rewrite of the annex)
isValidCfop('0000'); // false
isValidCfop('1150'); // false (a subgroup heading, not an operable code)
isValidCfop('abc5102'); // false (not a documented form)
isValidCfop(-5102); // false (not a non-negative safe integer)
```

Source: [consolidated Anexo II of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), last amended by [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### parseCfop

Remove CFOP (Código Fiscal de Operações e Prestações) formatting, keep only digits, and cap the result to 4 digits.

- No CFOP code starts with a zero, so nothing is padded here.

```javascript
import { parseCfop } from '@brazilian-utils/brazilian-utils';

parseCfop('5.102'); // '5102'
```

### getCfop

Look a CFOP (Código Fiscal de Operações e Prestações) code up and get its code and official description. The result is a `Cfop` record: `{ code, description }`.

- Same rules as `isValidCfop`. Returns `null` for a heading, an unknown code or a value not in a documented form.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('1101'); // { code: '1101', description: 'Compra para industrialização ou produção rural' }
getCfop('7504'); // { code: '7504', description: 'Exportação de mercadoria que foi objeto de formação de lote de exportação' }
getCfop('0000'); // null
getCfop('5350'); // null (a subgroup heading, not an operable code)
getCfop('abc5102'); // null (not a documented form)
```

Source: [consolidated Anexo II of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), last amended by [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### isValidCst

Check if a CST (Código de Situação Tributária) code is valid for a given tax. Pass the tax through `options.tax`:

| Tax | Format | Accepted codes |
| --- | --- | --- |
| `icms` | 3 digits (origem + CST) | origem `0`-`8` + one of `00`, `02`, `10`, `15`, `20`, `30`, `40`, `41`, `50`, `51`, `53`, `60`, `61`, `70`, `90` |
| `ipi` | 2 digits | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 digits | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 digits | same table as `pis` |

- **Options** (`IsValidCstOptions`): `tax` picks the table. Omitted, or outside those four values, every table is accepted.
- Accepts a string with the 2 digits of a Tabela B code or the 3 digits of the ICMS form, or a number. The ICMS form may have a single separator (space, `.`, `-` or `/`) after the origin digit.
- A single digit is padded to the 3-digit ICMS form; a 2-digit string is a Tabela B code, while the number `7` is the ICMS code `007`.

```javascript
import { isValidCst } from '@brazilian-utils/brazilian-utils';

isValidCst('000', { tax: 'icms' }); // true
isValidCst(0, { tax: 'icms' }); // true (a single digit is padded to the 3 digit form, '000')
isValidCst('0', { tax: 'icms' }); // true (padded the same way a number is)
isValidCst('110', { tax: 'icms' }); // true
isValidCst('002', { tax: 'icms' }); // true (monofasia de combustíveis)
isValidCst('06', { tax: 'pis' }); // true
isValidCst('99', { tax: 'ipi' }); // true
isValidCst('110'); // true (found in the icms table, tax omitted)
isValidCst('000', { tax: 'nope' }); // true (an unknown tax falls back to every table)
isValidCst('999'); // false (not in any table)
isValidCst('abc110'); // false (not a documented form)
isValidCst(-110); // false (not a non-negative safe integer)
```

Source: ICMS Tabela B from [Anexo I of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) as amended by [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24); IPI, PIS and COFINS from [IN RFB nº 1.009/2010](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974).

### isValidCsosn

Check if a CSOSN (Código de Situação da Operação no Simples Nacional) code is one of the 10 codes of the official table: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` or `900`.

- Accepts a string with the bare 3 digits, or a number. A CSOSN has no printed grouping, so `'1-01'` is rejected.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn(900); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (not a documented form)
isValidCsosn(-101); // false (not a non-negative safe integer)
```

Source: [consolidated Anexo III-A of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) and [Ajuste SINIEF 03/2010](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10).

## GTIN (product barcode)

### isValidGtin

Check if a GTIN (Global Trade Item Number, the number under an EAN/UPC barcode) is valid.

- Covers the four structures of the GS1 General Specifications, the same four the NF-e accepts in `cEAN` and `cEANTrib`: GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) and GTIN-14 (DUN-14).
- **Options** (`IsValidGtinOptions`): `lengths` accepts only some of the four lengths, and defaults to all four.
- The value must be a string of 8, 12, 13 or 14 digits, surrounding whitespace aside, whose last digit is the GS1 modulo 10 check digit: weights 3 and 1 alternating from the right, the sum subtracted from the nearest equal or higher multiple of ten. That is what rules I03-10 and I12-10 of SEFAZ Nota Técnica 2021.003 check (rejections 611 and 612).
- Leading zeros count, so a number is never accepted, and a masked value (`'7 890000 000017'`) is rejected instead of having its digits picked out.
- The `'SEM GTIN'` literal the NF-e uses for a product without a GTIN is not a GTIN, so it is not valid here: test for it before calling.
- The prefix does not change the verdict. Restricted Circulation Numbers (prefixes 02, 04 and 20 to 29, the codes a shop prints on its own scale labels) and the ISSN, ISBN and coupon ranges share the structure and the check digit, and the "Tabela Prefixo GS1" SEFAZ validates `cEAN` against lists them as valid; use `getGtinInfo` to tell them apart.
- The prefix is not checked against the list of GS1 Member Organisations either: GS1 keeps assigning ranges, so a copy of that list would turn down valid numbers as it ages. Whether the number is registered (the Cadastro Centralizado de GTIN lookup SEFAZ runs for the 789 and 790 prefixes) cannot be checked offline.

```javascript
import { isValidGtin } from '@brazilian-utils/brazilian-utils';

isValidGtin('7890000000017'); // true (GTIN-13, GS1 Brasil prefix)
isValidGtin('6291041500213'); // true (the example of the GS1 check digit page)
isValidGtin('78912342'); // true (GTIN-8)
isValidGtin('061414112345'); // true (GTIN-12)
isValidGtin('17890000000014'); // true (GTIN-14)
isValidGtin('7890000000018'); // false (wrong check digit)
isValidGtin('17890000000014', { lengths: [8, 12, 13] }); // false (GTIN-14 not accepted)
isValidGtin('7 890000 000017'); // false (digits only)
isValidGtin('SEM GTIN'); // false
```

### getGtinInfo

Parse a GTIN into its fields, as a `GtinInfo`.

- Returns `null` when the value is not a valid GTIN, under the same rules as `isValidGtin`.
- The prefix is read the way the "Tabela Prefixo GS1" of the Portal da NF-e tells: the value is left padded with zeros to 14 digits, and the prefix is positions 7 to 9 when positions 2 to 6 are zeros (a GTIN-8, or a GTIN-14 that packs one) and positions 2 to 4 otherwise. The first digit, the padding zero or the indicator digit, is never part of the prefix, so a GTIN-12 has a prefix that starts with `0`, and a GTIN-14 has the prefix of the GTIN it packs.

| Field | Description |
| --- | --- |
| `type` | `'GTIN-8'`, `'GTIN-12'`, `'GTIN-13'` or `'GTIN-14'` (`GtinType`), from the length the value was written with |
| `length` | `8`, `12`, `13` or `14` (`GtinLength`) |
| `prefix` | The three digit GS1 Prefix, or a GS1-8 Prefix when the first six digits of the 14 digit form are zeros, which covers every GTIN-8 and the GS1 Prefix `0000000`. It names the GS1 Member Organisation that licensed the number, not the country of origin |
| `isBrazilian` | `true` when the prefix is one of GS1 Brasil, `789` or `790`, what NT 2021.003 calls "prefixo do Brasil" |
| `isRestrictedCirculation` | `true` when the prefix is in a range GS1 sets aside for Restricted Circulation Numbers (GS1 Prefixes 02, 04 and 20 to 29; GS1-8 Prefixes 000 to 099 and 200 to 299, which is also where the GS1 Prefix `0000000` lands, since its 14 digit form starts with six zeros), so the number is only unique inside a company or region |
| `checkDigit` | The modulo 10 check digit, the last digit |

```javascript
import { getGtinInfo } from '@brazilian-utils/brazilian-utils';

getGtinInfo('7890000000017');
// { type: 'GTIN-13', length: 13, prefix: '789', isBrazilian: true,
//   isRestrictedCirculation: false, checkDigit: 7 }

getGtinInfo('17890000000014');
// { type: 'GTIN-14', length: 14, prefix: '789', isBrazilian: true,
//   isRestrictedCirculation: false, checkDigit: 4 }

getGtinInfo('061414112345');
// { type: 'GTIN-12', length: 12, prefix: '006', isBrazilian: false,
//   isRestrictedCirculation: false, checkDigit: 5 }

getGtinInfo('2000000000015')?.isRestrictedCirculation; // true (in-store number)
getGtinInfo('7890000000018'); // null (wrong check digit)
```

Source: [GS1 General Specifications](https://ref.gs1.org/standards/genspecs/), [GS1 check digit calculator](https://www.gs1.org/services/how-calculate-check-digit-manually), [SEFAZ Nota Técnica 2021.003](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=SrQT9ys8ODo%3D) and the [Tabela Prefixo GS1](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Oc+fygAxwmc%3D) of the Portal da NF-e.

## Text

### capitalize

Capitalize the first letter of each word, the way a Brazilian name, company name or address is written, with no options needed.

- **Options** (`CapitalizeOptions`): `lowerCaseWords`, words kept in lower case between two words, by default prepositions and articles such as `de`, `da`, `do`, `e`; `upperCaseWords`, words always in upper case, by default company designations and abbreviations such as `LTDA`, `S.A.`, `ME`, `CNPJ` and roman numerals. A list replaces its default.
- Words split at whitespace, `-`, `/`, apostrophes and adjoining punctuation; whitespace runs collapse into one space.
- A lower-case word that is first, last or followed by punctuation is a designator and keeps its capital.
- `ME` is upper-cased only as a designation (last word, or before another designation); `SA` without dots is left alone (the surname Sá). A state code after a `/` is upper-cased even with `upperCaseWords` given.

```javascript
import { capitalize } from '@brazilian-utils/brazilian-utils';

capitalize('jose da silva'); // Jose da Silva
capitalize('JOSÉ DA SILVA'); // José da Silva
capitalize('empresa ltda'); // Empresa LTDA
capitalize('banco do brasil s.a.'); // Banco do Brasil S.A.
capitalize('casa de carnes s/a'); // Casa de Carnes S/A ("S/A" is matched across the slash)
capitalize('mogi-guaçu'); // Mogi-Guaçu ("-" starts a new word)
capitalize("santa bárbara d'oeste"); // Santa Bárbara d'Oeste ("'" starts a new word, "d" stays lower case)
capitalize("bob's"); // Bob's (a single letter after an apostrophe is the English possessive)
capitalize('rua a, 100'); // Rua A, 100 (a preposition followed by punctuation is a designator)
capitalize('fulano comércio me'); // Fulano Comércio ME ("ME" as the last word is the designation)
capitalize('não-me-toque'); // Não-Me-Toque (anywhere else "me" is an ordinary word)
capitalize('(empresa) ltda'); // (Empresa) LTDA
capitalize('luiz von schmidt'); // Luiz von Schmidt
capitalize('santana/rs'); // Santana/RS ("RS" is a state code right after a "/")
capitalize('porto alegre/rs'); // Porto Alegre/RS
capitalize('santana rs'); // Santana Rs (no "/", so "rs" is just a word)
capitalize('rua xv de novembro'); // Rua XV de Novembro (roman numeral, "de" stays lower case)
capitalize('joão paulo ii'); // João Paulo II
capitalize('de'); // De (a preposition keeps its capital when it is the first word)
capitalize('empresa ltda', { upperCaseWords: [] }); // Empresa Ltda (the list given replaces the default one)
capitalize('josé Ama MARIA', { lowerCaseWords: ['ama'] }); // José ama Maria
capitalize('doc inválido', { upperCaseWords: ['DOC'] }); // DOC Inválido (case-insensitive match)
capitalize('  josé   maria  '); // José Maria (every run of whitespace, tabs and newlines included, collapses into one space)
```

Source: [Manual de Redação da Presidência da República](https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf).

### removeAccents

Remove diacritical marks (accents, tildes, cedillas) from a string.

- Every combining mark (Unicode general category M) is dropped, so accents from any script go.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```

## Inscrição estadual (IE)

### isValidIe

Check if an inscrição estadual (state registration) is valid for a state. **Deprecated:** the positional form `isValidIe(stateCode, ie)` still works but is deprecated; use the object form `isValidIe({ value, stateCode })`.

- Takes a single object (`IsValidIeParams`): `value` is the registration and `stateCode` the state it belongs to (a `StateCode`, case-insensitive).
- GO, PA, MS, SP, TO, DF, PE, AL and RJ have special cases (extra prefixes or formats, or a deviation from the SINTEGRA page); see the JSDoc in `src/is-valid-ie` for the details.
- An all-zero registration is accepted wherever the published formula yields a check digit of 0 for it: AM, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS, SC, SE and SP, plus BA with 8 or 9 digits and TO with 9 digits.

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe({ value: '110042490114', stateCode: 'SP' }); // true
isValidIe({ value: 'P011004243002', stateCode: 'SP' }); // true (produtor rural)
isValidIe({ value: '0187634580933', stateCode: 'AC' }); // false
isValidIe({ value: '109161793', stateCode: 'go' }); // true (case-insensitive)
```

Source: [SINTEGRA state pages](http://www.sintegra.gov.br/insc_est.html) and the [SEFAZ-GO roteiro de crítica](https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/).

## Email

### isValidEmail

Check if an email address is valid. A practical subset of the WHATWG HTML definition.

- Local part: letters, digits and `_'+-.`, with no leading or trailing dot and no two dots in a row.
- Domain: at least one dot, labels of up to 63 characters, final label 2 to 63 letters; quoted local parts and address literals are rejected.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
isValidEmail('invalid.email'); // false
```

Source: [WHATWG HTML, valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) and [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322).

## Credit card

### isValidCreditCard

Check if a payment card number (credit or debit) is valid using the Luhn algorithm. Only the digit count (12 to 19) and the Luhn check digit are checked. There is no brand detection (Visa, Mastercard, Amex...), issuer range lookup or expiration/CVV checks.

- Accepts a string or a number, with the mask characters (whitespace, `.`, `-` and `/`) anywhere between the digits.

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (Visa test number)
isValidCreditCard('5555555555554444'); // true (Mastercard test number)
isValidCreditCard('378282246310005'); // true (American Express test number)
isValidCreditCard('4111 1111 1111 1111'); // true (spaced mask)
isValidCreditCard('4111 - 1111 - 1111 - 1111'); // true (a run of separators between the digits)
isValidCreditCard('4111.1111/1111-1111'); // true (any of the mask characters)
isValidCreditCard('4111111111111112'); // false (bad check digit)
isValidCreditCard('0000000000000000'); // false (every digit the same, though the Luhn check passes)
isValidCreditCard('4111a1111b1111c1111'); // false (letters between the digits)
isValidCreditCard(4111111111111111111); // false (above 2^53 - 1, pass it as a string)
```

Source: [ISO/IEC 7812-1](https://www.iso.org/standard/70484.html).

## Professional registration

### isValidRegistroProfissional

Check the structure of a professional council registration number (registro/inscrição profissional). Only the digit count and the UF are checked, never a check digit, even for CRC.

- Takes an object (`IsValidRegistroProfissionalParams`): `value`, `council` (`"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` or `"CRC"`, a `RegistroProfissionalCouncil`) and an optional `stateCode` (expected UF).
- `"OAB"` and `"CRM"`: 4 to 6 digits plus the UF (`123456/SP`, `123456-SP`); `"CRO"`: 3 to 6 digits (`12345/SP`).
- `"CRP"`: a 2-digit regional code (`01` to `24`) plus 4 to 6 digits (`06/12345`); `stateCode` is ignored.
- `"CRC"`: UF, 6 digits, tipo de registro (`O` or `P`) and check digit (`SP-123456/O-3`); a transfer appends `T` or `S` and the destination UF (`SP-123456/O-3 T-MG`). `stateCode` matches the originating UF.
- The OAB, CRM, CRO and CRP shapes are conventional (no published format). CREA is not covered.

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional({ value: '123456/SP', council: 'OAB' }); // true
isValidRegistroProfissional({ value: '123456-RJ', council: 'OAB', stateCode: 'SP' }); // false (UF mismatch)
isValidRegistroProfissional({ value: '123456', council: 'OAB' }); // false (no UF)
isValidRegistroProfissional({ value: '06/12345', council: 'CRP' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3', council: 'CRC' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3 T-MG', council: 'CRC' }); // true (registro transferido)
isValidRegistroProfissional({ value: 'SP-123456/T-3', council: 'CRC' }); // false ("T" is not a tipo de registro)
```

Source: [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf), [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), [CFP regional councils](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/).

## VIN

### isValidVin

Check if a VIN (Vehicle Identification Number / chassi) is valid. This is a North-American-style structural check, not a universal validator of Brazilian VINs.

- Checks the 17-character length, the excluded letters `I`, `O` and `Q`, and the check digit at position 9.
- Brazilian rules do not mandate the check digit, so many Brazilian-built VINs fail it.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (check digit X, lowercase)
isValidVin('1HGCM82633A004353'); // false (bad check digit)
isValidVin('00000000000000000'); // false (every character the same, though the check digit matches)
isValidVin('1HGCM8263IA004352'); // false (contains the excluded letter I)
isValidVin('1HGCM82633A00435'); // false (16 characters)
```

Source: [ISO 3779:2009](https://www.iso.org/standard/52200.html), [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15) and [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf).

## Standard Schema

### toStandardSchema

Wrap an `isValid*` utility in a [Standard Schema](https://standardschema.dev), the validator format that form libraries, routers and API frameworks accept: TanStack Form, react-hook-form, tRPC, Hono and more.

- `config.options` is handed to the validator on every call, and `config.message` is the message of the issue (default `'Invalid value'`). Both are part of `ToStandardSchemaOptions`.
- It validates synchronously and does not transform: a valid value comes back as it was given, an invalid one yields a single issue.
- Validators that take an object (`isValidBankAccount`, `isValidRegistroProfissional`, `isValidIe`) work the same way. Wrap the overloaded `isValidIe` in an arrow function: `toStandardSchema((params) => isValidIe(params))`.
- The types of the specification (`StandardSchemaV1`, `StandardSchemaV1Result`, `StandardSchemaV1Issue` and the rest) are exported too, so nothing else is installed.

```javascript
import { isValidCnpj, isValidCpf, toStandardSchema } from '@brazilian-utils/brazilian-utils';

const cpf = toStandardSchema(isValidCpf, { message: 'CPF inválido' });

cpf['~standard'].validate('123.456.789-09'); // { value: '123.456.789-09' }
cpf['~standard'].validate('123'); // { issues: [{ message: 'CPF inválido' }] }

const cnpj = toStandardSchema(isValidCnpj, { options: { version: 2 } }); // alphanumeric CNPJ

// Anything that takes a Standard Schema takes it as is, a TanStack Form field for example
<form.Field name="cpf" validators={{ onChange: cpf }} />;
```

Inside a Zod or Valibot schema the validators plug in directly, with no wrapper, and the result is itself a Standard Schema:

```javascript
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { isValidCep, isValidCpf } from '@brazilian-utils/brazilian-utils';
import { useForm } from 'react-hook-form';
import * as v from 'valibot';
import { z } from 'zod';

const zodSchema = z.object({
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  cep: z.string().refine(isValidCep, 'CEP inválido'),
});

const valibotSchema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido')),
  cep: v.pipe(v.string(), v.check(isValidCep, 'CEP inválido')),
});

const form = useForm({ resolver: standardSchemaResolver(zodSchema) }); // or valibotSchema
```

Source: [Standard Schema specification](https://standardschema.dev).
