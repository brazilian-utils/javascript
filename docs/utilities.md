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

Check if a CPF is valid. Accepts the value masked or not, with whitespace between or around the groups.

- Returns `false` for a reserved number (all digits the same, such as `00000000000`) and for a wrong check digit.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (whitespace mask)
```

### formatCpf

Format a CPF.

- **Options** (`FormatCpfOptions`): `pad` left-pads the value with zeros up to the 11 slots of the pattern before masking (default `false`); `obfuscate` hides the first 3 digits and the 2 check digits (`***.456.789-**`), the gov.br / Receita Federal display convention.
- `obfuscate` is applied after `pad` and is read for truthiness, like `pad`, so any truthy value obfuscates.

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

- The optional `state` argument (`StateCode`, the two-letter code of one of the 27 states, e.g. `"SP"`) fixes the região fiscal digit in the 9th position to that state's code.
- Without `state`, a random region is used. An unknown code also draws a random região fiscal digit instead of throwing, so the result is still a valid CPF.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // the 9th digit is 8, the SP região fiscal code
generateCpf('MG'); // the 9th digit is 6, the MG região fiscal code
```

Source: [Receita Federal, folheto "Cadastros: CPF e CNPJ"](https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf) (região fiscal codes).

## CNPJ

### isValidCnpj

Check if a CNPJ is valid.

- **Options** (`IsValidCnpjOptions`): `version` picks the accepted format: `1` (default) numeric only, `2` both numeric and alphanumeric. Any other value is read as `1`, as `formatCnpj` and `parseCnpj` read it.
- Accepts the value masked or not, in either version. Letters are accepted in lowercase too.
- Version `2` has no reserved-value list, because the Receita Federal manual defines none for the alphanumeric format. A repeated-character alphanumeric base (all `A`s, say) that passes the checksum is accepted.
- A numeric reserved number (all digits the same) is rejected under both versions.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (lowercase alphanumeric)
```

Source: [Receita Federal, Manual do DV do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf) and [CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).

### formatCnpj

Format a CNPJ.

- **Options** (`FormatCnpjOptions`): `pad` left-pads the value with zeros up to the 14 slots of the pattern before masking (default `false`); `version` picks which format to read, `1` (default) numeric only, `2` alphanumeric; `obfuscate` hides the first 2 digits and the 2 check digits (`**.345.678/0001-**`), the gov.br / Receita Federal display convention.
- Version `2` keeps letters and digits and upper-cases the letters. Version `1` keeps digits only.
- `obfuscate` works in both versions, is applied after `pad` and is read for truthiness, like `pad`, so any truthy value obfuscates.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

### parseCnpj

Remove CNPJ formatting, return a normalized value, and cap the result to 14 characters.

- **Options** (`ParseCnpjOptions`): `version` picks which format to normalize: `1` (default) keeps digits only, `2` keeps letters and digits (upper-cased), so an alphanumeric CNPJ survives the round trip.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

### generateCnpj

Generate a valid random CNPJ.

- The first argument is either the version, `1` (default) numeric or `2` alphanumeric, or a `GenerateCnpjParams` object with the same `version` plus `branch`.
- `branch` is the "número de ordem" (filial) block in positions 9 to 12: an integer from 1 to 9999, written zero-padded to four characters. Random by default.
- An invalid `branch` is ignored and a random block is used. The block stays numeric in the alphanumeric version.
- Never throws: `null`, `undefined` or any other value that is neither `2` nor an object generates a numeric CNPJ.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // alphanumeric CNPJ, e.g. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // ordem block '0003', e.g. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // alphanumeric CNPJ whose ordem block is '0001'
```

## CEP and address

### isValidCep

Check if a CEP ([brazilian postal code](https://en.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)) is valid.

- Accepts a `string` or a `number`. A CEP that starts with `0` has to be a string, since a number cannot keep the leading zero: `isValidCep(1310100)` is `false`, `isValidCep('01310100')` is `true`.
- Spaces, dots and hyphens around or between the 8 digits are ignored. Any other character, a letter in particular, makes the value invalid.

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

- **Options** (`FormatCepOptions`): `pad` left-pads the value with zeros to the full 8 digits before masking (default `false`).
- A CEP that starts with `0` given as a number loses that zero: pass it as a string or use `pad`.

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

- **Options** (`GetAddressInfoByCepOptions`): `providers` (`CepProvider[]`) lists the providers to race (default `['viacep', 'brasilapi']`).
- The `'widenet'` provider is deprecated (its endpoint no longer responds) and left out of the default list, but can still be requested explicitly.
- Accepts a string or a number. A number is left-padded with zeros to 8 digits.
- The providers start together and are raced with `Promise.any`, not queried one after the other.
- A transient network failure is retried twice per provider, with a linear backoff (250 ms, then 500 ms). A provider that keeps failing is tried 3 times and adds about 750 ms before its own failure lands.
- An HTTP error status or a non-retryable failure is not retried. Retries delay nothing for the other providers, only the moment an all-failed rejection can surface.
- Rejects with `GetAddressInfoByCepValidationError` when the CEP is invalid or when `providers` names no known provider ("Nenhum provedor válido especificado"). That covers an empty array, an array of unknown names, or a value that is not an array, `null` included.
- Rejects with `GetAddressInfoByCepNotFoundError` when every provider failed and at least one reported the CEP as unknown, and with `GetAddressInfoByCepServiceError` when every provider failed for another reason.
- With `providers: ['brasilapi']`, a CEP BrasilAPI does not know is a not-found error, since BrasilAPI signals a miss with HTTP 404. Any other error status is a service error.
- All three extend `GetAddressInfoByCepError`, so a single `catch` on it covers every error this util rejects with.

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

- The argument (`GetCepInfoByAddressParams`) carries `federalUnit`, `city` and `street`. `federalUnit` may be lowercase or have surrounding whitespace; `city` and `street` are trimmed and stripped of accents before the query.
- Rejects with `GetCepInfoByAddressValidationError` when the UF, city or street is missing or invalid. An argument that is not an object (omitted, `null`, a string) or a `federalUnit` that is not a string rejects the same way, never with a raw `TypeError`.
- Rejects with `GetCepInfoByAddressNotFoundError` when no address matches the query, and with `GetCepInfoByAddressError` when ViaCEP answers with an HTTP error status.
- A transient network failure is retried as in `getAddressInfoByCep`. A request that cannot be performed at all (a transport failure) then rejects with the underlying `fetch` error instead.
- Each item carries the ViaCEP payload unchanged, under ViaCEP's own field names: `cep`, `logradouro`, `complemento`, `unidade`, `bairro`, `localidade`, `uf`, `estado`, `regiao`, `ibge`, `gia`, `ddd` and `siafi`.
- A broad street name matches many CEPs, so query as narrowly as the address allows.

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

- Accepts the 47 digit "cobrança bancária" linha digitável and the "boleto de arrecadação" (convênio/tributos). For the latter, either its 48 digit linha digitável or its 44 digit barcode, both starting with `8`.
- The código de moeda in position 4 of the cobrança bancária barcode is not checked, although Carta-Circular BCB nº 2.926/2000 fixes it at `9` (real). A slip with any other moeda digit still validates.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

Source: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf) (cobrança bancária) and [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf) (arrecadação).

### formatBoleto

Format a boleto number.

- **Options** (`FormatBoletoOptions`): `pad` left-pads the value with zeros up to the number of slots in the pattern before masking (default `false`).
- A 48 digit linha digitável starting with `8` gets the arrecadação (convênio/tributos) mask: four blocks of 11 digits, each followed by its own check digit.
- The 44 digit arrecadação barcode has no display grouping defined by FEBRABAN and keeps the "cobrança bancária" mask instead.

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
- An arrecadação slip draws its segment from 1 to 7 (segment 9 is the banks' own). Its value identifier is drawn from all four values: `6` and `8` for an effective amount, `7` and `9` for a reference quantity.
- Both `hasEffectiveValue` results of `getBoletoInfo` are therefore reachable.

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

### getBoletoInfo

Extract information from a boleto (amount, expiration date, bank code). Returns `null` when the value is not a valid boleto, so the result has to be narrowed before it is read.

- **Options** (`GetBoletoInfoOptions`): `referenceDate` resolves the "fator de vencimento" cycle as of that date instead of now.
- Returns a `BoletoInfo`: `amount` in cents, `expirationDate` and the three digit `bankCode`. `isValidBoleto` is checked first, so an invalid slip never gives a partial result.
- `expirationDate` is `null` when the slip carries no fator de vencimento (a factor below `1000`).
- The fator de vencimento cycle reset on 22/02/2025 per FEBRABAN. Neither FEBRABAN nor the Banco Central publishes a way of telling an old cycle factor from a new cycle one. Every factor can therefore mean either of two dates 9000 days apart.
- `referenceDate` picks between them through the library's own safety windows. The same slip can switch to the other candidate as time passes, so pass `referenceDate` explicitly whenever the answer has to stay stable.
- The cycle search never goes below the first cycle. A `referenceDate` older than the scheme itself still maps a factor to the oldest date that factor can denote, never to one before the 07/10/1997 base date.
- For a boleto de arrecadação, the result still carries both keys but empty, `bankCode: ''` and `expirationDate: null`, since the slip has neither. It adds `type: 'arrecadacao'`, `segment`, `value` (the amount in reais) and `hasEffectiveValue`.

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

Source: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf) (cobrança bancária) and [FEBRABAN, Layout Padrão de Arrecadação](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf) (arrecadação).

## Pix

### isValidPixKey

Check if a Pix key (chave Pix) is valid: a CPF, a CNPJ, an e-mail address, a Brazilian mobile phone number or a random EVP key, per the DICT key formats. A landline is not a valid phone key, since the manual registers a "número de telefone celular".

- **Options** (`IsValidPixKeyOptions`): `accept` lists the kinds of key that count as valid, as `PixKeyType[]` (default: all of them); `[]` rejects everything.
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

- Returns a `PixKeyInfo` with the `type` (`PixKeyType`) and the normalized `value`.
- Canonical forms: 11 digit CPF, 14 character CNPJ (uppercase in the alphanumeric format), trimmed and lowercased e-mail, E.164 mobile phone or lowercase UUID EVP. The phone form is `+55` followed by the DDD and the subscriber number.
- A landline is not a Pix key. An e-mail longer than the 77 characters the DICT allows is rejected.
- The CPF and the phone number are recognized by the way they are written, not only by their digits. Surrounding text is not stripped, so `'abc123.456.789-09'` is not a CPF key.
- An 11 digit value valid both as a CPF and as a mobile phone is read as a CPF. Written as a phone number (a `+55`/`0055` prefix or a DDD in parentheses), it is a phone key.
- A value with a valid CNPJ check digit is read as a CNPJ even when it starts with `0055`, since a phone key inside a BR Code always carries `+55`.
- The version and variant nibbles of the EVP UUID are not enforced.

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

Source: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html), [pix-api](https://github.com/bacen/pix-api).

### isValidPixPayload

Check if a Pix BR Code payload (the string behind a Pix QR Code and behind "Pix copia e cola") is valid. The Pix key itself is not checked against the DICT formats; use `isValidPixKey` for that.

- The TLV structure must be well-formed and the CRC-16 must match the rest of the payload.
- The mandatory objects must be present and well-formed: payload format indicator `01`, merchant category code, currency `986`, country `BR`, merchant name and merchant city.
- One "Merchant Account Information" template (IDs 26 to 51) must carry the `br.gov.bcb.pix` GUI with a key, in a static payload, or the PSP URL, in a dynamic one, never both. A payload with no Pix template at all in IDs 26 to 51 is invalid.
- The "Point of Initiation Method" object (`01`) is optional in either shape. Only a value outside `{"11", "12"}` makes the payload invalid.
- The "Additional Data Field Template" (ID 62) is accepted when absent: it is mandatory in the BR Code table but optional in the EMV® specification.
- The lengths the manual reserves for the merchant name, city, `txid` and key field 26-01 (25, 15, 25 and 77) are not enforced. They are generator side limits, checked by `generatePixPayload`.
- A payload built around a key that carries an amount (`54`) must carry one greater than zero. Rejecting `"0"`/`"0.00"` is a restriction of this library, not a rule of the manual.
- The exception is the Pix Saque BR Code of §2.6 of the Pix manual: with the ISPB of the "facilitador de serviço de saque" in sub-object 26-03 (`fss`), a zero amount is accepted.
- `fss` must be 8 digits and cannot appear next to a PSP location. §2.7 of the manual gives the dynamic QR Code only two sub-objects, `00` for the GUI and `25` for the URL. Pix Troco exists only for dynamic QR Codes.
- Unreserved Templates (IDs 80 to 99) are ignored. A "QR Code composto" of Pix Automático (Pix recorrente) that also carries a payment location in 26-25 is accepted as an ordinary dynamic payload; its recurrence location is dropped.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (broken CRC)
```

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [pix-api](https://github.com/bacen/pix-api), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).

### getPixPayloadInfo

Parse a Pix BR Code payload into its fields. Accepts what `isValidPixPayload` accepts and returns `null` for anything else, never a partial result.

- Returns a `PixPayloadInfo`: `merchantName`, `merchantCity`, `pointOfInitiation` and either `key`, in a static payload, or `url`, in a dynamic one.
- `amount`, `txid`, `description` and `withdrawalFacilitator` are present only when the payload carries them. `txid` is absent when the payload carries the `***` marker.
- `pointOfInitiation` (`PixPointOfInitiation`) is `"dynamic"` when the payload carries a PSP location or when object `01` is `"12"`, `"static"` otherwise.
- When the payload carries a PSP location, the amount and the `txid` are ignored, as the manual mandates: the location is the source of truth for both.
- `withdrawalFacilitator` is the `fss` of a Pix Saque BR Code, the 8 digit ISPB of the "facilitador de serviço de saque".
- A "QR Code composto" of Pix Automático is parsed as an ordinary dynamic payload with its recurrence location dropped, so this parser cannot tell the two apart.

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

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [pix-api](https://github.com/bacen/pix-api), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).

### generatePixPayload

Generate the payload of a Pix BR Code. Exactly one of `params.key` or `params.url` must be given; `null` is returned when both or neither are given.

- **Params** (`GeneratePixPayloadParams`): `key` or `url`, `merchantName`, `merchantCity`, and the optional `amount`, `txid` and `description`.
- With `key`, the key is normalized to its DICT canonical form by `getPixKeyInfo` and the payload is static: the "Point of Initiation Method" object is left out.
- With `url`, the payload is dynamic per the Manual de Padrões para Iniciação do Pix: the URL takes the key's place in the "Merchant Account Information" template and the "Point of Initiation Method" object is set to `12`.
- `url` must be a PSP location as the Bacen manual defines it: a host name, with its path, written without a scheme (`pix.example.com/qr/v2/1234`), at most 77 characters.
- A dynamic payload cannot carry `amount` or `txid`, which belong to the PSP location.
- `amount` is written with the two decimal places the BR Code takes. An amount that rounds to `0.00` or does not survive that round trip (`0.005`, `123.456`) is rejected, not rewritten.
- `txid` is 1 to 25 characters of `[A-Za-z0-9]` (default: the absent marker `***`).
- `merchantName`, `merchantCity` and `description` are folded to printable ASCII (accents dropped) and truncated to what the BR Code allows: 25, 15 and what is left of the template.
- The `fss` of the Pix Saque BR Code and the Unreserved Templates (IDs 80 to 99) are never written; `getPixPayloadInfo` only parses them.
- `getPixPayloadInfo(generatePixPayload({ url, ... }))` round-trips.

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

Source: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [pix-api](https://github.com/bacen/pix-api), [DICT API](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html).

## NF-e key

### isValidNfeKey

Check if a DF-e access key (chave de acesso) is valid. It covers every Documento Fiscal eletrônico whose access key is the same 44 digit string; the CF-e-SAT (59) is out, since its "chave de consulta" is composed differently.

- Models: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) and NFCom (62).
- The 44 digits may be split into the printed groups of 4 by whitespace, `.`, `-` or `/` (a run of them between two groups included). A separator inside a group of 4, or any other character, is rejected.
- The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes of the XML `Id` attribute are stripped first, along with any whitespace between the prefix and the first group.
- The emission type (`tpEmis`) must be one of the codes the MOC of that model assigns, listed in the table below. Code 8, the authorização pela SVC-SP, is assigned by the CT-e MOC only, never by the NF-e one.
- For NF-e and NFC-e the numeric code (`cNF`) must also pass rule B03-10 of the NF-e MOC: none of the twenty repeated and sequential values it lists, and not equal to the document number.
- A document number of all zeros is rejected for every model, since every layout types the number as `[1-9]{1}[0-9]{0,8}`.
- The check digit is a modulus 11 over the first 43 digits.

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

Source: [MOC NF-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), [NF-e schema package](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos), Ajustes SINIEF [09/07](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2007/AJ_009_07), [36/19](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2019/AJ036_19) and [03/20](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2020/ajuste-sinief-03-20), and the MOCs of the [CT-e](https://dfe-portal.svrs.rs.gov.br/CTE/Documentos), [BP-e](https://dfe-portal.svrs.rs.gov.br/BPE/Documentos), [NF3e](https://dfe-portal.svrs.rs.gov.br/NF3e/Documentos) and [NFCom](https://dfe-portal.svrs.rs.gov.br/NFCOM/Documentos).

### formatNfeKey

Format a DF-e (Documento Fiscal eletrônico) access key into groups of 4 digits separated by spaces, the form the DANFE, DACTE, DAMDFE, DABPE, DANF3E and DANFE-COM print it in.

- **Options** (`FormatNfeKeyOptions`): `pad` left pads the value with zeros up to the 44 digits of a complete access key (default `false`).
- A masked or partial key is grouped as far as its digits go. Anything without a digit (an object, `true`) gives `''` instead of throwing.
- The parameter is typed as a string, since 44 digits are more than a JavaScript number holds exactly. At runtime a number is read as the string of its digits.
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

- The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes of the XML `Id` attribute are stripped first, since `NF3e` carries a digit of its own.
- Use `isValidNfeKey` to check the key and `getNfeKeyInfo` to read its fields.

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
- NFCom and NF3e (models `'62'` and `'66'`) spend position 36 of the key on `nSiteAutoriz`. For those two models the result also carries `authorizationSite` and `code` is 7 digits instead of 8.

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

## Phone

### isValidPhone

Check if a phone number (mobile or landline) is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, under the rule of `parsePhone`.

- **Options** (`IsValidPhoneOptions`): `accept` (`PhoneType[]`, default `['mobile', 'landline']`) picks which kinds of number count as valid; `version` (`PhoneVersion`, default `1`) is forwarded to `isValidMobilePhone`.
- Add `'service'` to `accept` to also accept the numbers `isValidServicePhone` recognizes; `[]` accepts none.
- `version` `1` accepts a first number digit of 6, 7, 8 or 9; `2` accepts 7, 8 or 9 and rejects the `700` series, per Resolução Anatel 749/2022, art. 12, I, "a". It only affects mobile numbers.

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

Format a phone number according to Brazilian patterns. If `value` includes a DDD, pass `{ mask: 'auto' }` or `'nanp'` explicitly, since the default `"sn"` mask assumes no DDD and silently truncates one.

- **Options** (`FormatPhoneOptions`): `mask` (`PhoneMask`, default `"sn"`) picks one of the patterns below. A `mask` outside the union falls back to `"sn"` instead of throwing.
- `"sn"`: subscriber number only, 9 digits, no DDD (`"98765-4321"`).
- `"nanp"`: DDD plus subscriber number, `"(00) 00000-0000"` for the 11 digits of a mobile and `"(00) 0000-0000"` for the 10 digits of a landline. Any other length keeps the 11 digit grouping.
- `"e164"`: `"+5511987654321"`, no separators.
- `"international"`: `"+55 11 98765-4321"` (or `"+55 11 3000-0000"` for a landline), the way a Brazilian number is printed for foreign callers.
- `"service"`: `"0800 123 4567"` for the Códigos Não Geográficos and `"4004-1234"` for the abbreviated `300X`/`400X` numbers, the conventional groupings.
- `"auto"`: `"service"` for a service number, `"international"` when `value` carries a Brazilian country code (`+55`, `0055` or a bare `55` followed by 10 or 11 digits). Otherwise the digit count decides: `"nanp"` when `value` has more than 9 digits, `"sn"` when it does not.
- `"e164"` and `"international"` drop the country code first, under the rule of `parsePhone`, and fall back to the `"service"` presentation for a service number, which has no E.164 form.
- The service number check reads `value` under the same rule, so `'5508001234567'` is the `0800` number, not a `+55 08` one.

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

- A Brazilian country code (`+55`, `0055` or a bare `55`) is stripped first, but only when the digits left behind are exactly 10 or 11 long. That is a plausible national number: DDD plus an 8 or 9 digit subscriber number.
- The rule is length-based, not sign-based, so a number from area code 55 is not mistaken for a country code.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('55987654321'); // 55987654321 (area code 55, not mistaken for the +55 country code)
```

### generatePhone

Generate a random Brazilian phone number. Accepts `'mobile'`, `'landline'` or `'service'` (`GeneratePhoneType`); when omitted, it generates a mobile or a landline at random, never a service number.

- A mobile number always starts with 9 after the DDD, so it passes both `isValidMobilePhone` numbering rules. A landline has 8 digits after the DDD and starts with 2 to 6.
- A service number has no DDD: an 11 digit `0X00` number or an 8 digit `300X`/`400X` one.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' or '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' or '40041234'
```

### isValidMobilePhone

Check if a mobile phone number is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, under the rule of `parsePhone`.

- **Options** (`IsValidMobilePhoneOptions`): `version` (`PhoneVersion`, default `1`) picks the mobile numbering rule.
- `1`: the format before Resolução Anatel 749/2022, kept for compatibility, whose first number digit (after the DDD) may be 6, 7, 8 or 9.
- `2`: art. 12, I, "a" of the resolution places 7, 8 and 9 in the Serviço Móvel Pessoal (SMP), so a leading 6 is Reserva Técnica and is rejected.
- `2` also rejects the `700` series, which art. 12, II reserves for the Serviço Móvel Global por Satélite; `1` accepts it.

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

Check if a landline phone number is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed first, under the rule of `parsePhone`.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
isValidLandlinePhone('+55 11 3000-0000'); // true (country code accepted)
```

### isValidServicePhone

Check if a phone number is a valid Brazilian service number, dialed without a DDD. Only the structure is checked: the number does not have to be assigned to anyone.

- The Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900` followed by 7 digits (11 in total). The shorter, extinct `0800` + 6 digit form is rejected.
- The abbreviated `300X`/`400X` numbers, 8 digits. Other "Número Único" carrier prefixes in market use, such as `4020` and `4062`, are rejected: Anatel withdrew the 4 digit codes instead of allocating them, so only the conventional roots are recognized.
- The 3 digit Códigos de Acesso a Serviços de Utilidade Pública Anatel has designated (e.g. `190`, `192`), listed in the Anexo of Ato Anatel nº 43.151/2004.
- `112` and `911` are rejected: Anatel designates neither, and `911` is not even inside the `1N₂N₁` range of art. 13 of Resolução nº 749/2022. Handsets route them by GSM convention, not by a numbering designation.
- The `0500` rule that encodes a donation amount in the last two digits is not enforced.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (geographic number)
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) (arts. 13, 14, 18 and 28), [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151), [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86) (art. 43, I).

### getAreaCodeInfo

Get the state and region a Brazilian DDD (area code) belongs to, out of the 67 DDDs in use under the Anatel Plano Geral de Numeração. Accepts a string or a non-negative integer number, stripping any non-digit characters before matching.

- Returns an `AreaCodeInfo`: `areaCode`, `stateCode`, `stateName`, `regionCode`, `regionName` and `stateCodes`.
- Returns `null` when the DDD is not in use, or when the number is negative or not an integer (`-11`, `1.1`).
- `stateCode` is always a single state: the one the DDD is seated in, the state of the city the code was allocated around, not necessarily the one holding most of its municipalities.
- Four DDDs straddle a state border, and for those `stateCodes` lists the other states too, the seat first.
- DDD 61 serves the Distrito Federal and the twelve Goiás municipalities of the Entorno do Distrito Federal. Its `stateCode` is `'DF'` and its `stateCodes` is `['DF', 'GO']`, even though the Distrito Federal holds only Brasília.
- The other three are 42 for Porto União, 47 for Rio Negro and 49 for Barracão: `['PR', 'SC']`, `['SC', 'PR']` and `['SC', 'PR']`. There the seat holds every municipality but the one named.

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

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) (art. 15), [Anatel Códigos Nacionais](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

### getAreaCodesByState

Get every DDD (area code) that serves a given Brazilian state, under the Anatel Plano Geral de Numeração. The match is case-insensitive and the result is sorted in ascending order.

- Returns `[]` when `stateCode` does not match a Brazilian state.
- A DDD that straddles a state border is listed under every state it serves: 61 under `'DF'` and `'GO'`, 42 under `'PR'` and `'SC'`, 47 and 49 under `'SC'` and `'PR'`. Same four border DDDs as `getAreaCodeInfo`.

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
getAreaCodesByState('XX'); // []
```

Source: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) (art. 15), [Anatel Códigos Nacionais](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais).

## License plate

### isValidLicensePlate

Check if a license plate is valid. Accepts the old Brazilian format (`ABC-1234`) and the Mercosul format (`ABC1D23`), with or without a hyphen or space, in any case.

- The Mercosul sequence `LLLNLNN` is the single one Resolução CONTRAN nº 969/2022 defines for every vehicle, motorcycles included.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (Brazilian format)
isValidLicensePlate('ABC-1234'); // true (Brazilian format with hyphen)
isValidLicensePlate('ABC 1234'); // true (whitespace mask)
isValidLicensePlate('ABC1D23'); // true (Mercosul format)
isValidLicensePlate('ABC12D3'); // false (not a Mercosul sequence)
isValidLicensePlate('ABC1234EXTRA'); // false (too many characters)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf) and its [Anexos](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

### formatLicensePlate

Format a license plate. Old Brazilian plates (`LLLNNNN`) get a hyphen; Mercosul plates (`LLLNLNN`) are returned without a separator.

- Letters are uppercased.
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

- `format` (`GenerateLicensePlateFormat`): `'LLLNLNN'` (Mercosul, the default) or `'LLLNNNN'` (the old Brazilian format).
- Any other `format` falls back to the Mercosul default, so the result is always a plate `isValidLicensePlate` accepts.
- The default is the single sequence Resolução CONTRAN nº 969/2022 (Anexo I, item 1.2) defines for every vehicle, motorcycles included.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, the default)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
generateLicensePlate('LLLNNLN'); // 'ABC1D23' (a format outside the two in circulation falls back to the default)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf) and its [Anexos](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

### getFormatLicensePlate

Detect the normalized format of a license plate: `'LLLNNNN'` for the old Brazilian format, `'LLLNLNN'` for Mercosul.

- Returns `null` when the value is not a string, has other than exactly 7 letters and digits once separators are removed, or matches neither format.
- Exports the `LicensePlateFormat` type (`"LLLNNNN" | "LLLNLNN"`); `generateLicensePlate` re-exports it as `GenerateLicensePlateFormat`.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (not a Mercosul sequence)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (too many characters)
```

### convertLicensePlateToMercosul

Convert an old format Brazilian license plate (`LLLNNNN`) to the Mercosul format (`LLLNLNN`). The digit in the 5th position becomes a letter, `0` through `9` mapping to `A` through `J`; every other character is kept.

- Returns `""` when the value is not a valid old format license plate.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (already Mercosul)
```

Source: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), art. 2º § 4º, and the conversion table in its [Anexo II](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

## RENAVAM

### isValidRenavam

Check if a RENAVAM (Registro Nacional de Veículos Automotores) is valid. Accepts the old format (9 digits) and the new format (11 digits).

- The 9 digit form is left-padded with zeros to 11 digits before the modulo 11 check digit is verified.
- Spaces, dots and hyphens around or between the digits are ignored. Any other character, a letter in particular, makes the value invalid.
- A value whose digits are all the same is rejected.

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

- A base whose digits are all the same is drawn again, since `isValidRenavam` rejects it.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## PIS

### isValidPis

Check if a PIS is valid. Accepts the value masked or not.

- Only digits, whitespace and the mask characters `.`, `-`, `/`, `(`, `)`, `,` and `*` are allowed; any other character makes the value invalid.
- A value whose digits are all the same is rejected.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412847'); // true
isValidPis('12056412547'); // false
```

### formatPis

Format a PIS.

- **Options** (`FormatPisOptions`): `pad` left-pads the value with zeros to the full 11 digits before masking (default `false`).

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

- `J` and `TR` must name an órgão and a tribunal from the closed lists of art. 1º, § 4º and § 5º. A correct check digit with a court that does not exist is rejected.
- The lists include the TRF da 6ª Região, seated by Resolução CNJ nº 477/2022 in § 5º, III.
- The unidade de origem (`OOOO`) is only read as four digits: art. 1º, § 6º leaves its codification to each tribunal and publishes no central list.
- The CNJ mask separators (whitespace, `.` and `-`) are accepted between the fields, and whitespace around the value is ignored. Any other character, a letter in particular, makes the value invalid.

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

- **Options** (`FormatProcessoJuridicoOptions`): `pad` left-pads the value with zeros to the full 20 digits before masking (default `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
formatProcessoJuridico('20802520125150049', { pad: true }); // 0002080-25.2012.5.15.0049
```

Source: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### parseProcessoJuridico

Remove processo jurídico formatting, keep only digits, and cap the result to 20 digits. Both the current CNJ mask (`NNNNNNN-DD.AAAA.J.TR.OOOO`) and the older one are accepted, since only the digits are kept.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

### generateProcessoJuridico

Generate a valid random processo jurídico number in the layout of Resolução CNJ nº 65/2008.

- **Options** (`GenerateProcessoJuridicoParams`): `year` sets the `AAAA` field, an integer from the current year to 9999 (default: the current year); `court` sets the órgão `J`, from 1 to 9 (default: random).
- Returns `null` when `year` or `court` is out of range, or when `options` is not an object.
- `J` and `TR` are drawn from the closed lists of art. 1º, § 4º and § 5º, so the pair always names a court that exists. `court` picks the órgão and `TR` is drawn among that órgão's tribunais.
- The unidade de origem (`OOOO`) is drawn freely, since the resolution publishes no central list for it.

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

Check if a Brazilian bank account is valid. The `bankCode` must be in the Banco Central do Brasil STR participants list (the same base `getBankByCode` uses), so an unassigned code such as `'999'` is always invalid.

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

Banks validated by structure only, because they publish no check digit rule. The agency (1-5 digits), the account (1-13 digits) and a single numeric `digit` are enough to make the account valid:

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

- Every other listed bank uses the generic fallback: `digit` must match mod10 or mod11 over the account.
- When `digit` has 2 characters, the generic fallback chains mod10 followed by mod11 over the account.

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

Source: Banco Central's [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv) (bank codes) and the "Regras de Validação de dígito verificador de agência e conta corrente" compendium (per bank algorithms).

### getBanks

Get every Brazilian bank with a compensation code (COMPE), from the Banco Central do Brasil STR participants list.

- Each bank (`Bank`) has a `code` (COMPE, 3 digits), an `ispb` (Identificador do Sistema de Pagamentos Brasileiro, 8 digits) and a `name`.

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

Source: Banco Central's [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByCode

Look a Brazilian bank up by its compensation code (COMPE), from the Banco Central do Brasil STR participants list. Accepts a `string` or a `number`, with or without leading zeros.

- Returns a copy of the matching `Bank`, or `null` when no bank has that code.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

Source: Banco Central's [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByIspb

Look a Brazilian bank up by its ISPB (Identificador do Sistema de Pagamentos Brasileiro), the 8 digit code of every SPB participant. Accepts a `string` or a `number`, with or without leading zeros, so `getBankByIspb(0)` finds the same bank as `getBankByIspb('00000000')`.

- The base only carries the institutions that also have a COMPE code, so an ISPB whose institution has no COMPE code of its own returns `null`.
- Returns a copy of the matching `Bank`, or `null` when no bank has that ISPB.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

Source: Banco Central's [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), with [BrasilAPI](https://brasilapi.com.br/api/banks/v1) as the fallback when the base is regenerated and the Bacen request fails.

## IBAN

### isValidIban

Check if a Brazilian IBAN (International Bank Account Number) is valid. Only Brazilian IBANs (country code `BR`) are recognized; any other country returns `false`.

- Layout: `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 digit ISPB + 5 digit branch + 10 digit account. Then 1 letter account type + 1 owner indicator, 29 characters in all.
- The account type is any letter, usually `C` (conta corrente) or `P` (conta poupança).
- The owner indicator is `1` for the first or only holder up to `9` for the ninth, then `A` to `Z` from the tenth. A `0` is rejected.
- Case-insensitive. Accepts the compact form (`'BR1500000000000010932840814P2'`) or the ISO 13616 print format, letters and digits in groups of 4 (the last one shorter). Whitespace around the value is ignored.
- The groups may be split by whitespace, `.`, `-` or `/`.
- Rejects a separator away from a group boundary, a run of separators (ISO 13616 prints a single one) or any character other than letters and digits.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (grouping spaces)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (any of the mask characters)
isValidIban('BR1500000000000010932840814P3'); // false (bad check digits)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (a separator inside a group)
isValidIban('DE89370400440532013000'); // false (non Brazilian IBAN)
```

Source: Bacen's [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf) and [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf); [ISO 13616-1:2020](https://www.iso.org/standard/81090.html) for the structure and [ISO/IEC 7064:2003](https://www.iso.org/standard/31531.html) for the check digits.

### formatIban

Format an IBAN in the ISO 13616 print grouping: blocks of 4 characters, the presentation used on statements and bank forms. Does not validate the check digits or the field layout; use `isValidIban` for that.

- Reads only the letters and digits, uppercases them and groups them as far as they go. Any other character (a hyphen, a dot, extra whitespace) is dropped.
- Caps the result at the 29 characters of a Brazilian IBAN. An IBAN of another country is grouped the same way up to that length.
- The value may be compact (`'BR1500000000000010932840814P2'`), already in the print format, or a partial value still being typed (`'BR15'`).
- Returns `''` only when the value is not a string.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (only letters and digits are read)
```

### parseIban

Remove IBAN formatting, keep the letters and digits, uppercase the result, and cap it to the 29 characters of a Brazilian IBAN. Use `isValidIban` to check the check digits and `getIbanInfo` to read the fields.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR15 0000 0000 0000 1093 2840 814P 2'); // 'BR1500000000000010932840814P2'
parseIban('br15-0000.0000/0000 1093 2840 814p-2'); // 'BR1500000000000010932840814P2'
```

### getIbanInfo

Parse a Brazilian IBAN into its fields. Returns an `IbanInfo` object, or `null` whenever `isValidIban` would return `false`.

- Fields: `countryCode` (always `BR`), `checkDigits` (2 ISO 7064 MOD 97-10 digits), `bankIspb` (8 digits), `branch` (5 digits) and `account` (10 digits).
- `accountType` is 1 letter, typed as a `string`: usually `C` (conta corrente) or `P` (conta poupança). `owner` is `1` to `9`, then `A` to `Z`.
- Only Brazilian IBANs are supported: a well-formed IBAN of another country also returns `null`.
- Same input rules as `isValidIban`: compact or in the ISO 13616 print format, groups split by a single whitespace, `.`, `-` or `/`. Surrounding whitespace is ignored and case does not matter.
- Returns `null` for a separator away from a group boundary, a run of separators or any character other than letters and digits.

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

Source: Bacen's [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf) and [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf); [ISO 13616-1:2020](https://www.iso.org/standard/81090.html) for the structure and [ISO/IEC 7064:2003](https://www.iso.org/standard/31531.html) for the check digits.

## Currency, numbers and dates in words

### formatCurrency

Format a number or a numeric string in the BRL pattern (`1.234,56`). A `number` is formatted as is, sign and decimals preserved.

- **Options** (`FormatCurrencyOptions`): `symbol` (default `false`) prefixes the result with `R$`; `precision` (default 2) sets the decimal places, clamped to 0 to 20; a non-finite `precision` falls back to 2.
- A `string` is read by the rules of `parseCurrency`, except that a value without any separator stays in whole units: `'1234'` formats as `1.234,00`.
- In a string, the last `,` or `.` followed by 1 to 2 digits is the decimal separator (up to `precision` digits, when that is larger).
- Every other `,` or `.` is a thousands separator, and a `-` before the first digit is preserved.
- Returns `''` for a non-finite value (`NaN`, `Infinity`, `-Infinity`). Also `''` for a value that cannot be coerced to a number: a symbol, a plain object, a null-prototype object.
- `null`, arrays and booleans go through `Number()`, so `null` and `[]` format as `0,00` and `true` as `1,00`.

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

- **Options** (`ParseCurrencyOptions`): `precision` (default 2) is the number of digits read as minor units, clamped to 0 to 20; it falls back to 2 when it is not a finite number.
- The last `,` or `.` followed by 1 to 2 digits is the decimal separator (up to `precision` digits, when that is larger).
- Every other `,` or `.` is a thousands separator. So `'R$ 1.234,56'` parses to `1234.56` and `'12.34'` to `12.34`.
- A value without any separator keeps the cents convention and is divided by `10 ** precision`: `'1234'` parses to `12.34`.
- A `-` before the first digit is preserved.

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

- **Options** (`ConvertNumberToWordsOptions`): `gender` (default `"masculine"`) agrees "um/dois" and the hundreds ("duzentos/duzentas") with the noun the number qualifies; an invalid value is ignored.
- Accepts integers from `-999999999999999` to `999999999999999` (999 trillion in absolute value). A non-integer is truncated toward zero.
- The result is always lowercase.
- Returns `""` for a value outside that range, `NaN` or a non-finite value.

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
- Uses the singular for exactly 1 ("um real", "um centavo") and inserts "de" before "reais" for a round million, billion or trillion.
- An amount that truncates to nothing becomes `"zero reais"`, with no "menos" prefix; any other negative amount is prefixed with "menos".
- Above `Number.MAX_SAFE_INTEGER / 100` reais (about 90 trillion) a double cannot carry cents, so the amount is read as whole reais.
- The result is always lowercase.
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
- In `"full"` style, day 1 is written as "primeiro" and every other day as a cardinal number. The year is written the way `convertNumberToWords` writes it: `1999` reads as `"mil novecentos e noventa e nove"`.
- An invalid `style` is ignored. Month names and the whole result are lowercase.
- February 29 is accepted on the leap years of the proleptic Gregorian calendar (divisible by 4, except centuries not divisible by 400).
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

## States and municipalities

### getStates

Get all Brazilian states, each with its two-letter code, name, region code, region name and 2-digit IBGE code (`cUF`).

- Sorted by name with `localeCompare` in the "pt-BR" locale, so Pará, Paraíba, Paraná and Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul come in that order.
- Exports the `State`, `StateCode` and `StateName` types.
- `State` is a discriminated union with one member per state: narrowing it by `code` also narrows `name`, `regionCode`, `regionName` and `ibgeCode` (`Extract<State, { code: 'SP' }>['name']` is `'São Paulo'`).
- An impossible combination such as `{ code: 'SP', name: 'Acre' }` is not a `State`.

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

### getStateByIbgeCode

Get the Brazilian state whose 2-digit IBGE code (`cUF`, the Código da Unidade da Federação) matches the given value.

- This is the UF code in the first field of every DF-e access key (chave de acesso) `isValidNfeKey` covers.
- Models: NF-e 55, NFC-e 65, CT-e 57, MDF-e 58, CT-e OS 67, GTV-e 64, BP-e 63, NF3e 66 and NFCom 62.
- Accepts a string or a non-negative integer; non-digit characters are stripped before matching.
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

- The match ignores accents, case and leading/trailing whitespace: `'sao paulo'`, `'SÃO PAULO'` and `'  São Paulo  '` all return `'SP'`.
- Every run of internal whitespace collapses into one space, so `'Rio  de  Janeiro'` returns `'RJ'`; a name without the space (`'saopaulo'`) matches nothing.
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

- The match ignores case and leading/trailing whitespace: `'sp'`, `'SP'` and `'  Sp  '` all return `'São Paulo'`.
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

- The match ignores case and leading/trailing whitespace.
- Some zones cover several states: `America/Sao_Paulo` also covers DF, GO, MG, ES, RJ, PR, SC and RS; `America/Fortaleza` also covers MA, PI, RN and PB.
- Pernambuco returns `America/Recife`, not `America/Noronha` (Fernando de Noronha is a district of PE, not a state).
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

Get the Brazilian municipalities published by the IBGE: every municipality, or only those of one state when `stateCode` is given.

- Each municipality (`Municipality`) is `{ code, name, stateCode }`, where `code` is the 7-digit IBGE code. Sorted by name with `localeCompare` in the "pt-BR" locale.
- Only an omitted (or `undefined`) `stateCode` asks for the full list: `getMunicipalities(null)` and `getMunicipalities('')` return `[]`, where `getCities` returns every city.
- The state code is case-sensitive: `getMunicipalities('sp')` returns `[]`, `getMunicipalities('SP')` the 645 São Paulo municipalities.
- Only `getMunicipalities` and `getCities` are case-sensitive; `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality` ignore case.
- Returns `[]` for an unknown state code.
- Embeds all 5571 IBGE municipalities and their codes, the same bundle-size cost as `getCities`. See [Bundle size](getting-started.md#bundle-size) to lazy-load it via `@brazilian-utils/brazilian-utils/get-municipalities` instead of the root import.

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

Look up a Brazilian municipality by its 7-digit IBGE code.

- Accepts the code as a string or a number; non-digit characters are stripped before matching. A number must be a non-negative integer: `-3550308` and `355030.8` return `null`.
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

### getCities

Get the names of Brazilian cities: every city, or only those of one state. **Deprecated:** use `getMunicipalities` instead.

- Sorted with `localeCompare` in the "pt-BR" locale.
- Any falsy `state` asks for the full list: `getCities(null)` and `getCities('')` return every city, where `getMunicipalities` returns `[]`.
- The state code is case-sensitive: `getCities('sp')` returns `[]`, `getCities('SP')` the 645 São Paulo cities. Same case rule as `getMunicipalities`.
- Returns `[]` for an unknown state code or a non-`StateCode` value.
- Embeds all 5571 IBGE municipality names (~154.2 KB minified, ~49.8 KB gzipped), one of the few heavy exceptions in this tree-shakeable package. See [Bundle size](getting-started.md#bundle-size) to lazy-load it via `@brazilian-utils/brazilian-utils/get-cities` instead of the root import.

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

- One function handles both directions, based on whether `options` has a `code` or a `municipalityName`/`uf`. The lookup is offline, from a bundled IBGE dataset: no network request is made.
- `code` accepts a string or a number and must be exactly 7 digits. A number must be a non-negative integer: `-3550308` and `355030.8` resolve to `null`.
- The name match ignores accents and case, and every run of whitespace collapses into one space: `'sao  paulo'` matches `'São Paulo'`, a name without the space does not.
- Case is folded to upper case, the direction Unicode expands `'ß'` to `'SS'` in, so `'Paßos'` matches `'Passos'`.
- Resolves to `null` for an unknown municipality, an unknown UF, invalid input, or an `options` that is not an object.
- In TypeScript the return type follows the query: `{ code }` resolves to `[string, string] | null` and `{ municipalityName, uf }` to `string | null`. A variable typed `GetMunicipalityParams` resolves to the union of both.
- `GetMunicipalityOptions`, `GetMunicipalityByCodeOptions` and `GetMunicipalityByNameOptions` are deprecated aliases of these types.

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
- "Dia da Consciência Negra", Nov 20, is national from 2024 on (Lei nº 14.759/2023).
- Before 2024, MT, RJ, AM and SP list a state entry under that same name. AP lists it as `"Dia Estadual da Consciência Negra"`, the name its law uses.
- Commemorative dates without a holiday law are not listed: RN's "Dia do Rio Grande do Norte" (Aug 7, Lei RN nº 7.831/2000) is one. RO's "Dia dos Evangélicos" of Jun 18 is another: the STF struck its law down in ADI 3940.
- Only one state holiday per UF is a feriado civil under Lei nº 9.093/1995, art. 1º, II. The other entries rest on ordinary state laws and are listed because they are observed in practice.
- The date returned is the statutory one. SC's shift below is the only observance shift modelled; Acre's Tuesday-to-Thursday shift and the Goiás decrees that may move Jul 26 and Oct 28 are not.
- Results are memoized per `year`/`stateCode`.
- An unknown or non-string `stateCode` is ignored and only national holidays are returned; `"__proto__"`, `"constructor"` and the like are unknown codes, not a crash.
- Returns `[]` when the year is not an integer from 1900 to 2099, or when the argument is neither a number nor an object.

Notable per-state rules:

- **SC**: both state holidays move to the following Sunday when they fall Monday to Friday ([Lei SC nº 18.531/2022](http://leis.alesc.sc.gov.br/html/2022/18531_2022_lei.html)). They are "Dia do Estado de Santa Catarina", Aug 11, and "Dia de Santa Catarina de Alexandria", Nov 25.
- **SC, Aug 11**: transfers from 2005 on ([Lei SC nº 13.408/2005](http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html)) and stays on Aug 11 before that. So Monday Aug 11 2025 is a business day in SC and the holiday lands on Sunday Aug 17.
- **SC, Nov 25**: transfers from 1999 on ([Lei SC nº 11.213/1999](http://leis.alesc.sc.gov.br/html/1999/11213_1999_lei.html)), except in 2004: [Lei SC nº 12.906/2004](http://leis.alesc.sc.gov.br/html/2004/12906_2004_lei.html) revoked the clause without restating it, so Nov 25 2004 stays put.
- **DF**: Corpus Christi is a feriado ([Lei distrital nº 72/1989](https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html), art. 1º parágrafo único). With `stateCode: 'DF'` the single Corpus Christi entry is typed `"state"` instead of `"optional"`: replaced, not duplicated.
- **GO**: three feriados estaduais ([Lei GO nº 20.756/2020](https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756), art. 269, II). They are Jul 26, Fundação da Cidade de Goiás; Oct 24, Lançamento da Pedra Fundamental de Goiânia; and Oct 28, Dia do Servidor Público.
- **AL**: Sep 16 is a feriado estadual from 2024 on ([Lei AL nº 9.358/2024](https://sapl.al.al.leg.br/norma/3117)). Before that it is only a ponto facultativo, typed `"optional"`.
- **PB**: Jul 26 ("Morte de João Pessoa") is listed up to 2015 only: [Lei PB nº 10.601/2015](https://sapl.al.pb.leg.br/norma/11988), art. 2º, revoked its basis.
- **TO**: Mar 18 ("Autonomia do Estado do Tocantins") is listed up to 2008 only: [Lei TO nº 2.013/2009](https://www.al.to.leg.br/arquivo/15724) turned the feriado clause into a commemorative provision.

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

Source: [Lei nº 662/1949](https://www.planalto.gov.br/ccivil_03/leis/l0662.htm), [Lei nº 10.607/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm), [Lei nº 6.802/1980](https://www.planalto.gov.br/ccivil_03/leis/l6802.htm), [Lei nº 14.759/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm), [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm), [Portaria MGI nº 11.460/2025](https://www.in.gov.br/web/dou/-/portaria-mgi-n-11.460-de-29-de-dezembro-de-2025-678388627); the state laws are cited one by one in `src/get-holidays/constants.ts`.

### isHoliday

Check if a date is a Brazilian holiday. Accepts `{ targetDate, stateCode? }` (`IsHolidayParams`).

- The check uses `targetDate`'s local calendar date (year, month and day as read locally), not its UTC instant.
- `stateCode` also considers that state's holidays. A string that is not a known state code is ignored, as in `getHolidays`.
- Returns `false` when `targetDate` is missing or not a valid `Date`, or when `stateCode` is present and not a string (a number, `null`, an object), even on a national holiday.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

### isBusinessDay

Check if a date is a Brazilian business day (dia útil): not a Saturday, a Sunday or a holiday `getHolidays` lists for its local calendar day.

- **Options** (`BusinessDayOptions`, shared by every business day util): `includeOptional` (default `true`) also counts the `"optional"` holidays, Carnaval and Corpus Christi, as non-business days; `stateCode` also counts that state's holidays.
- Pass `includeOptional: false` to count only statutory (`"national"` and `"state"`) holidays.
- A `stateCode` string that is not a known state code is ignored, as in `getHolidays`.
- Returns `false` when `value` is not a valid `Date` or its year is outside 1900 to 2099. Also `false` when `stateCode` is present and not a string (a number, `null`, an object), even on an ordinary weekday.

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
- Returns a new `Date` and never mutates `date`. The time of day is preserved.
- An `amount` of `0` returns the same date, even on a weekend or holiday, like date-fns. A negative `amount` walks backwards.
- Returns `null` when `date` is not a valid `Date`, `amount` is not a finite integer, `stateCode` is not a string, or the result leaves the years 1900 to 2099. An `options` that is not an object is ignored.

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

- Same rules as `addBusinessDays`, `BusinessDayOptions` included: a new `Date` with the time of day preserved, an `amount` of `0` returns the same date, and the same `null` cases.
- A negative `amount` walks forwards.

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

### differenceInBusinessDays

Count the Brazilian business days (dias úteis) between two dates. Signature: `differenceInBusinessDays(laterDate, earlierDate, options?)`, the same as date-fns.

- **Options** (`BusinessDayOptions`, shared with `isBusinessDay`): `includeOptional` (default `true`) also skips Carnaval and Corpus Christi; `stateCode` also skips that state's holidays.
- Counts `earlierDate` when it is a business day and every business day strictly between the two dates; `laterDate` is never counted. Only the calendar day matters; the time of day is ignored.
- The result is positive when `laterDate` is after `earlierDate`, negative when it is before, and `0` on the same calendar day.
- Returns `null` when either date is not a valid `Date` or is outside the years 1900 to 2099, or `stateCode` is not a string. An `options` that is not an object is ignored.

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

Check if a Brazilian passport number is valid: 2 letters followed by 6 digits. Accepts a `string` or a `number`, but a number is never valid, because its decimal form never starts with the two letters.

- Not case-sensitive. Non-alphanumeric characters (spaces, dots, hyphens) are ignored.
- There is no check digit, so a well-formed number is not necessarily a real passport.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (case-insensitive)
isValidPassport('AB-123.456'); // true (symbols are ignored)
isValidPassport('12345678'); // false
```

Source: [Polícia Federal, passport pages](https://www.gov.br/pf/pt-br/assuntos/passaporte), whose [FAQ](https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-numero-onde-fica-e) states the layout.

### formatPassport

Format a Brazilian passport number: uppercase, without symbols, capped to 8 characters. It is the same operation as `parsePassport`, of which it is an alias.

- Returns `''` for a non-string input.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

### parsePassport

Remove all non-alphanumeric characters from a passport number, uppercase the result, and cap it to 8 characters.

- Returns `''` for a non-string input.

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

Check if a CNH is valid. Spaces, dots and hyphens are ignored, but any other character, a letter in particular, makes the value invalid.

- A value whose 11 digits are all the same is rejected, so `'11111111111'` is invalid.
- The first check digit keeps a remainder of 1 as `1`, following the reference implementation. Art. 4º § 1º of Resolução CONTRAN nº 886/2021 says a remainder of 0 or 1 yields `0`, which real registry numbers do not follow.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hyphen before the check digits)
isValidCnh('ab00000000119'); // false (letters are rejected)
```

Source: [Resolução CONTRAN nº 886/2021, art. 4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf), which defines the layout but not the check digit weights; the weights follow [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/).

### formatCnh

Format a CNH.

- **Options** (`FormatCnhOptions`): `pad` left-pads the value with zeros to the full 11 digits before masking (default `false`).

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
```

### parseCnh

Remove CNH formatting, keep only digits, and cap the result to 11 digits. Returns `''` when there is no digit at all.

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

Check if a legal nature code exists in the official list, the IBGE/CONCLA "Natureza Jurídica 2021" table. Only hyphens, dots and whitespace are tolerated around the 4 digits, so `'2062a'` is rejected instead of being read as `'2062'`.

- The 92 codes in force are accepted, plus the 8 a past revision of the table retired, which still appear in records filed while they were in force.
- Use `getLegalNature` to tell the two apart: a retired code comes back with `legacy: true` and the `currentCode` it corresponds to today.

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

Generate a random valid legal nature code. Only the 92 codes in force are drawn, never one of the 8 a past revision retired.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

### getLegalNature

Look a legal nature code up in the official IBGE/CONCLA table. Accepts a string or a number, with or without mask characters, and returns `null` for an unknown code or any other input.

- The entry (`LegalNature`) also carries the CONCLA category the code is listed under, given by its first digit (1 to 5).
- No code starts with a zero, so nothing is padded: a number and the string of the same digits are read identically.
- A code a past revision of the table retired is still looked up, because it keeps appearing in records filed while it was in force. It comes back with `legacy: true` and the `currentCode` it corresponds to today, per the CONCLA correspondence spreadsheets, or `currentCode: null` when there is no successor.
- The 92 codes in force have `legacy: false` and no `currentCode`.

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

Source: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021) and its [detailed structure PDF](https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf).

### getLegalNatures

Get the legal nature map keyed by code. Only the 92 codes of the CONCLA 2021 table, the ones in force, are listed by default.

- **Options** (`GetLegalNaturesParams`): `includeLegacy` (default `false`) adds the 8 codes a past revision of the table retired.

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
- **Options** (`GetLegalNaturesByCategoryOptions`): `includeLegacy` (default `false`) adds the retired codes of the category, in code order.
- The entries come back sorted by code. An unknown category, or an input that is not a string or a number, returns `[]`.

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

- A voter ID is an 8-digit sequential number, a 2-digit federative union code (`01` to `28`) and 2 check digits. The 13-digit form carries a 9-digit sequential number and is valid only for UF `01` and `02`.
- Whitespace and dots are accepted around and between the `0000 0000 00 00` groups. Any other character, a letter or a hyphen included, makes the value invalid.
- Only a string is accepted; a number returns `false`.

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
isValidVoterId('102385010671'); // true (12 digits)
isValidVoterId('1234567880191'); // true (13 digits, São Paulo)
isValidVoterId('123456780124'); // false (invalid check digits)
```

Source: [Resolução TSE nº 23.659/2021, art. 36](https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021), which publishes the UF table and the two-step módulo 11 structure but not the weights. The weights and the 13-digit SP/MG form follow [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py) and [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/).

### formatVoterId

Format a voter ID number with the 12-digit grouping `0000 0000 00 00`.

- The 13-digit grouping `0000 0000 0 00 00` is used only when the value has more than 12 digits and its UF code is `01` or `02`, São Paulo and Minas Gerais. The UF code is the 10th and 11th digits.
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

- An unknown state, or a value that is not a string, falls back to `"ZZ"` (UF `28`) instead of throwing.
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

- Definitive cards (first digit 1 or 2) are an 11-digit PIS/PASEP/NIS derived base, a 3-digit suffix and a check digit. The check digit is 11 minus the remainder of the base's weighted sum (weights 15 down to 5) by 11, with 11 read as 0.
- When that digit would be 10, DATASUS adds 2 to the weighted sum, recomputes the digit and marks the card with the suffix `001` instead of `000`.
- Provisional cards (first digit 7, 8 or 9) are valid when the weighted sum of all 15 digits (weights 15 down to 1) is a multiple of 11.
- A run of separators between two groups is accepted. A letter among the digits, or a separator inside a group, is rejected.
- A number starting with 5 is rejected, following ANVISA. The e-SUS APS page applies the provisional routine to 5 as well.

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

Source: [ANVISA CNS validation page](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/), the two routines implemented, and the [e-SUS APS page](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html) of the same DATASUS algorithm.

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

Remove CNS (Cartão Nacional de Saúde) formatting, keep only digits, and cap the result to 15 digits. A partial value passes through as far as it goes; use `isValidCns` to check the number itself.

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

- Both check digits are modulus 11, the digit being the remainder itself, with a remainder of 10 read as 1. The first pass weights the 30 base digits by 2, 3, ... 10, 0, 1, 2, ... The second weights the 31 digits including the first check digit by 1, 2, ... 10, 0, 1, ...
- The serviço must be `55`, the code art. 473, III assigns to the registro civil das pessoas naturais. Any other pair in the ninth and tenth positions is rejected however good the check digits are.
- The book-type digit must name one of the nine books (`CertidaoType`, the type `getCertidaoInfo` returns). A `0` there is rejected, the same way `getCertidaoInfo` returns `null` for it.
- **Options** (`IsValidCertidaoOptions`): `accept` narrows the valid book types to the listed ones (default: every type). A value that is not an array falls back to the default.
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

Source: [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243), Provimento CNJ nº 149/2023. Inciso II and §§ 1º and 3º to 5º are in the redação of Provimento CN nº 237/2026, the rest in that of Provimento CN nº 182/2024. The matrícula was instituted by [Provimento CNJ nº 2/2009](https://atos.cnj.jus.br/atos/detalhar/1311) and got its digit structure from [Provimento CNJ nº 3/2009, art. 7º](https://atos.cnj.jus.br/atos/detalhar/1310), both revoked. The check digits follow [ghiorzi.org](http://ghiorzi.org/DVnew.htm), [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) and [validator-docs](https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php).

### formatCertidao

Format the matrícula of a certidão de registro civil into the printed mask of art. 473. The 32 digits are grouped as 6 2 2 4 1 5 3 7 2 and separated by spaces.

- **Options** (`FormatCertidaoOptions`): `pad` left-pads the value with zeros up to 32 digits (default `false`).
- A number is accepted and read as the string of its digits. A full 32-digit matrícula has to be a string, though: that many digits are more than a JavaScript number holds exactly.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
formatCertidao(104539015520); // 104539 01 55 20 (a number is read as the string of its digits)
```

Source: [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243).

### parseCertidao

Remove the formatting of the matrícula of a certidão de registro civil, keep only digits, and cap the result to 32 digits. This only takes the mask off: use `isValidCertidao` to check the matrícula and `getCertidaoInfo` to read its fields.

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
// '10453901552013100012021000012321'
```

### getCertidaoInfo

Parse the matrícula of a certidão de registro civil into its fields. Accepts the same input forms as `isValidCertidao` and returns `null` when the matrícula is not valid.

- Returns `null` also for a serviço other than `55`, for a book code that is not one of the nine books, and for an input that is not a string.
- Art. 473, V lists only the book codes 1 to 7. The codes 8 (emancipação) and 9 (interdição) come from ghiorzi.org and validation-br and are kept because matrículas carrying them circulate.

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

Source: [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); the book codes 8 and 9 per [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

## CEI, CNO and CAEPF

### isValidCei

Check if a CEI (Cadastro Específico do INSS) number is valid. The CEI identifies an employer with no CNPJ, such as a construction work or a rural producer.

- Layout: 12 digits printed as `00.000.00000/00`, 11 base digits and one check digit.
- Check digit: the base is weighted by 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4. The tens of the sum are added to its units, and the digit is the complement of the units digit to 10 (10 reads as 0).
- Accepts the 12 digits masked or not, a run of separators between two groups included. A letter among the digits is rejected.
- A value whose 12 digits are all the same is rejected.
- The CEI was replaced by the CNO for construction works and by the CAEPF for individuals, but numbers already issued keep their check digit.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (invalid check digit)
isValidCei('000000000000'); // false (repeated digits)
```

Source: the [CNO page of the Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno) publishes neither the mask nor the check digit rule. The rule follows [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php) and [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs), cross-checked against the [CNO open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCei

Format a CEI (Cadastro Específico do INSS) number with the usual `00.000.00000/00` mask. The Receita Federal does not print the mask; it is the one the reference implementations cited by `isValidCei` agree on.

- **Options** (`FormatCeiOptions`): `pad` left-pads the value with zeros up to 12 digits (default `false`).

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

### parseCei

Remove CEI (Cadastro Específico do INSS) formatting, keep only digits, and cap the result to 12 digits. A partial value passes through as far as it goes; use `isValidCei` to check the number itself.

```javascript
import { parseCei } from '@brazilian-utils/brazilian-utils';

parseCei('27.729.71181/87'); // '277297118187'
```

### isValidCno

Check if a CNO (Cadastro Nacional de Obras) number is valid. The CNO replaced the CEI for construction works and kept its numbering, so a work registered under a legacy CEI keeps the same number.

- Same rules as `isValidCei`: 12 digits printed as `00.000.00000/00`, the same check digit, mask handling and rejection of repeated digits.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (invalid check digit)
isValidCno('000000000000'); // false (repeated digits)
```

Source: the [CNO page of the Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno) publishes neither the mask nor the check digit rule. The rule was cross-checked against the [CNO open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno): every work in its Minas Gerais extract passes, a result the catalogue page itself does not publish.

### formatCno

Format a CNO (Cadastro Nacional de Obras) number. The CNO kept the CEI's numbering, so both share the same 12-digit `00.000.00000/00` mask.

- Same rules as `formatCei`, with `pad` in `FormatCnoOptions`.

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

### parseCno

Remove CNO (Cadastro Nacional de Obras) formatting, keep only digits, and cap the result to 12 digits, the numbering the CNO kept from the CEI. A shorter value passes through as far as it goes; use `isValidCno` to check the number itself.

```javascript
import { parseCno } from '@brazilian-utils/brazilian-utils';

parseCno('11.113.01373/68'); // '111130137368'
```

### isValidCaepf

Check if a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number is valid. The CAEPF replaced the CEI for individuals who hire employees, such as rural producers.

- Layout: 14 digits printed as `000.000.000/000-00`: the 9-digit CPF base of the holder, a 3-digit sequence for the holder's several registrations and 2 check digits.
- Both check digits are the CNPJ's modulus 11: the weights cycle from 9 down to 2 from the right and the digit is the remainder itself, with 10 read as 0. That is the same digit the CNPJ's `11 - remainder` rule gives. The pair is then shifted by 12, wrapping around 100.
- A base whose 12 digits are all the same is rejected before the check digits are computed, so the otherwise well-formed `00000000000012` is invalid.
- Accepts the 14 digits masked or not. A letter among the digits is rejected.

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (invalid check digits)
isValidCaepf('00000000000000'); // false (repeated base digits)
isValidCaepf('00000000000012'); // false (repeated base digits)
```

Source: the [CAEPF page of the Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf) publishes neither the layout nor the check digit rule. Both follow [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

### formatCaepf

Format a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number with the usual `000.000.000/000-00` mask.

- Same rules as `formatCei`: the Receita Federal does not print the mask, and `pad` (`FormatCaepfOptions`) left-pads the value with zeros up to 14 digits (default `false`).

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

### parseCaepf

Remove CAEPF (Cadastro de Atividade Econômica da Pessoa Física) formatting, keep only digits, and cap the result to 14 digits. A shorter value passes through as far as it goes; use `isValidCaepf` to check the number itself.

```javascript
import { parseCaepf } from '@brazilian-utils/brazilian-utils';

parseCaepf('293.118.610/001-84'); // '29311861000184'
```

## Classification codes (CBO, CNAE, NCM, CFOP, CST, CSOSN)

### isValidCbo

Check if a CBO (Classificação Brasileira de Ocupações) code exists in the official CBO 2002 table.

- Accepts a string with the 6 digits or with the `NNNN-NN` mask, or a number.
- A masked string needs a single separator (space, `.`, `-` or `/`) between the groups; surrounding whitespace is ignored. Any other string is rejected instead of having its digits picked out.
- A number is accepted only when it is a non-negative safe integer.
- Leading zeros are part of the code, so bare digits are left padded with zeros to 6, as a string or as a number: `10205`, `'10205'` and `'010205'` are the same code. A masked value is read as written.

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

- A shorter value passes through as far as it goes and is never left padded. The leading zero of a code such as `010205` has to be written out.
- Use `getCbo` or `isValidCbo`, which do pad a bare numeric code, to look an occupation up.

```javascript
import { parseCbo } from '@brazilian-utils/brazilian-utils';

parseCbo('2124-05'); // '212405'
```

### getCbo

Look a CBO (Classificação Brasileira de Ocupações) code up and get its official occupation title. The result is a `Cbo` record: `{ code, description }`.

- Same rules as `isValidCbo`: bare digits are padded to 6, so `getCbo(10205)` and `getCbo('10205')` are both read as `010205`.
- Returns `null` when the code is unknown or the value is not in a documented form.

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

- Same rules as `isValidCbo`, with 7 digits and the `NNNN-N/NN` mask: `111301`, `'111301'` and `'0111301'` are the same code.

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

- **Options** (`FormatCnaeOptions`): `pad` (default `false`) first left pads the value with zeros to the 7 digits of a complete subclass code, so it always comes back fully masked.
- With the default `pad: false` the mask is applied progressively, as far as the value goes.
- A number is treated like the string of its digits, so it is only padded under `pad: true`.
- Characters outside the mask are dropped, and a number is read as the string of its digits, sign and decimal point included. Returns `''` when there is no digit at all.

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

- Same rules as `parseCbo`: nothing is left padded here. Use `getCnae` or `isValidCnae`, which do pad a bare numeric code, to look a subclass up.

```javascript
import { parseCnae } from '@brazilian-utils/brazilian-utils';

parseCnae('6201-5/01'); // '6201501'
parseCnae('62'); // '62' (a partial code is kept as written)
```

### getCnae

Look a CNAE (Classificação Nacional de Atividades Econômicas) subclass code up and get its code and official description. The result is a `Cnae` record: `{ code, description }`.

- Same rules as `getCbo`, with 7 digits and the `NNNN-N/NN` mask: `getCnae(111301)` and `getCnae('111301')` are both read as `0111301`.
- `code` comes back as the 7 bare digits; pass it to `formatCnae` for the `NNNN-N/NN` form.
- Returns `null` when the code is unknown or the value is not in a documented form.

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

- Same rules as `isValidCbo`, with 8 digits and the `NNNN.NN.NN` mask: `1012100`, `'1012100'` and `'01012100'` are the same code.

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

- **Options** (`FormatNcmOptions`): `pad` (default `false`) first left pads the value with zeros to the 8 digits of a complete code, so it always comes back fully masked.
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

- Same rules as `parseCbo`: nothing is left padded here. Use `isValidNcm`, which does pad a bare numeric code, to check a code against the official table.

```javascript
import { parseNcm } from '@brazilian-utils/brazilian-utils';

parseNcm('8471.30.12'); // '84713012'
parseNcm('8471'); // '8471' (a partial code is kept as written)
```

### isValidCfop

Check if a CFOP (Código Fiscal de Operações e Prestações) code exists in the official table, the consolidated Anexo II of Convênio SINIEF s/nº 1970 in force.

- Only operable codes count: the group and subgroup headings, the codes ending in `00` and `50` (1000, 1100, 1150, 5350, ...), are rejected.
- Accepts a string with the 4 digits or with the `N.NNN` form the annex prints, with a single separator (space, `.`, `-` or `/`) and optional surrounding whitespace. Any other string is rejected.
- A number is accepted only when it is a non-negative safe integer.
- No CFOP code starts with a zero (the first digit is the operation group, 1 to 7), so nothing is padded. A number and the string of the same digits are read identically, and a value shorter than 4 digits is not a code.

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

Source: [consolidated Anexo II of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), current wording by Ajuste SINIEF 03/24, last amended by [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### parseCfop

Remove CFOP (Código Fiscal de Operações e Prestações) formatting, keep only digits, and cap the result to 4 digits.

- A shorter value passes through as far as it goes. No CFOP code starts with a zero, so nothing is padded here.

```javascript
import { parseCfop } from '@brazilian-utils/brazilian-utils';

parseCfop('5.102'); // '5102'
```

### getCfop

Look a CFOP (Código Fiscal de Operações e Prestações) code up and get its code and official description. The result is a `Cfop` record: `{ code, description }`.

- Same rules as `isValidCfop`. The description is worded as the annex in force prints it.
- Returns `null` for the group and subgroup headings (the codes ending in `00` and `50`), for an unknown code and for a value not in a documented form.

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

- **Options** (`IsValidCstOptions`): `tax` picks the table. Omit it to accept a code that exists in any one of the four tables; a `tax` outside those four values falls back to that same default.
- Returns `false` when `options` is given and is not an object.
- `02`, `15`, `53` and `61` are the monofasia de combustíveis codes of the ICMS Tabela B.
- Accepts a string with the 2 digits of a Tabela B code, or with the 3 digits of the ICMS form. The ICMS form may have a single separator (space, `.`, `-` or `/`) after the origin digit; surrounding whitespace is ignored.
- The origin digit is the only boundary a printed CST has, so `'0 10'` and `'1-10'` are read while `'0-0'`, `'11-0'` and `'00-'` are not. Any other string is rejected.
- A number is accepted only when it is a non-negative safe integer.
- A single digit is left padded with zeros to the 3 digits of the ICMS form, as a string or as a number: `0`, `'0'` and `'000'` are all the ICMS code `000`.
- A 2 digit value is read as written, as a Tabela B code: `'07'` keeps its two digits, while `7` is the ICMS code `007`.

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

Source: ICMS Tabela B from the [consolidated Anexo I of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), as worded by [Ajuste SINIEF 39/23](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2023/ajuste-sinief-39-23) and amended by [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24). That amendment struck items 12, 13, 52, 72 and 74 before they took effect. IPI, PIS and COFINS tables from [Instrução Normativa RFB nº 1.009/2010](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974).

### isValidCsosn

Check if a CSOSN (Código de Situação da Operação no Simples Nacional) code is one of the 10 codes of the official table: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` or `900`.

- Accepts a string with the bare 3 digits and optional surrounding whitespace. A CSOSN has no printed grouping (the NF-e carries the origin digit in its own `orig` field), so `'1-01'` is rejected.
- A number is accepted only when it is a non-negative safe integer.
- No CSOSN code starts with a zero, so nothing is padded: a number and the string of the same digits are read identically.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn(900); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (not a documented form)
isValidCsosn(-101); // false (not a non-negative safe integer)
```

Source: [consolidated Anexo III-A of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), the table [Ajuste SINIEF 03/2010](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10) instituted.

## Text

### capitalize

Capitalize the first letter of each word, the way a Brazilian name, company name or address is written, with no options needed.

- **Options** (`CapitalizeOptions`): `lowerCaseWords` lists the words kept in lower case when they link two words; `upperCaseWords` lists the words written in upper case wherever they appear. A list given replaces its default entirely.
- Words are separated by whitespace, by `-` and `/`, by the apostrophe and by punctuation that touches a word (`'(empresa)'`, `'bairro:centro'`). The separators are kept where they are.
- Every run of whitespace (spaces, tabs, newlines) collapses into a single space, and leading and trailing whitespace is dropped.
- The default `lowerCaseWords` are the Portuguese prepositions, articles and conjunctions that stay lower case inside a proper name (`de`, `da`, `do`, `e`, ...).
- A word of that list that is the first word, ends the value or is followed by punctuation is a designator and keeps its capital: `'condomínio a, quadra d, lote o'` becomes `'Condomínio A, Quadra D, Lote O'`.
- The particles of foreign-origin names (`del`, `della`, `di`, `du`, `van`, `von`, `der`, `den`) stay lower case like the Portuguese prepositions.
- The elided `d'` stays lower case wherever it appears, when an apostrophe and a word follow it (`'dias d'ávila'` becomes `'Dias d'Ávila'`). A single letter right after an apostrophe is the English possessive and stays lower case too.
- The default `upperCaseWords` are the company designations and document abbreviations (`LTDA`, `S.A.`, `S/A`, `S.S.`, `S/S`, `ME`, `EPP`, `MEI`, `EIRELI`, `CIA`, `SCP`, `CNPJ`, `CPF`, `RG`, `CEP`, `UF`). It also has the roman numerals `II` through `XXIII`, except `VI`, which is also the verb form "vi".
- `S/A` and `S/S` are matched across the slash, even though a slash separates words.
- `SA` without punctuation is not in the list: it is also the surname "Sá" typed without its accent.
- `ME` is also the pronoun "me", so it is upper cased only as the last word of the value or right before another designation (`'fulano me epp'` becomes `'Fulano ME EPP'`). Anywhere else it is an ordinary word (`'diga-me a verdade'` becomes `'Diga-Me a Verdade'`).
- A two letter word after a `/` is upper cased when it is a Brazilian state code. This rule stays on even when `upperCaseWords` is given; a state code that does not follow a `/` is left alone.
- Both lists are matched case-insensitively (pt-BR locale). A list that is not an array falls back to its default, and a member that is not a string is ignored.
- Every other word is capitalized letter by letter: `'İSTANBUL'` becomes `'İstanbul'`. A first letter whose upper case is two letters (`ß`, the `ﬁ` ligature) keeps its case, so `'straße'` becomes `'Straße'` and `'ßa'` stays `'ßa'`.
- Returns `''` when `value` is not a string.

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

Source: [Manual de Redação da Presidência da República, 3ª edição](https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf), items 5.1.8 b) and 10.2 a), for the default `lowerCaseWords`.

### removeAccents

Remove diacritical marks (accents, tildes, cedillas) from a string. Every accented character is decomposed into its base letter plus combining marks (Unicode NFD), and the combining marks are dropped.

- Every combining mark (Unicode general category M) is dropped, so accents from any script go.
- Returns `''` when `value` is not a string.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```

## Standard Schema

### toStandardSchema

Wraps an `isValid*` utility (or any function of the same shape) in a [Standard Schema](https://standardschema.dev), the interface that form libraries, routers and API frameworks accept as a validator whichever library produced it: TanStack Form, tRPC, Hono, react-hook-form and the rest, next to schemas made with Zod, Valibot or ArkType. The types of the specification are copied into the package, so nothing is installed. The schema validates synchronously and does not transform: a valid value comes back as it was given, an invalid one yields a single issue. `config.options` (part of `ToStandardSchemaOptions`) is handed to the validator on every call, and `config.message` is the message of that issue (default `'Invalid value'`). Like the validators it wraps it never throws: a first argument that is not a function gives a schema that rejects everything, and a `message` that is not a string falls back to the default. Validators that take a single object (`isValidBankAccount`, `isValidRegistroProfissional`, `isValidIe`) work the same way, the object being the value under validation; wrap the overloaded `isValidIe` in an arrow function, `toStandardSchema((params) => isValidIe(params))`. The types `StandardSchemaV1`, `StandardSchemaV1Result`, `StandardSchemaV1Issue` and the others of the specification are exported too.

```javascript
import { isValidCnpj, isValidCpf, toStandardSchema } from '@brazilian-utils/brazilian-utils';

const cpf = toStandardSchema(isValidCpf, { message: 'CPF inválido' });

cpf['~standard'].validate('123.456.789-09'); // { value: '123.456.789-09' }
cpf['~standard'].validate('123'); // { issues: [{ message: 'CPF inválido' }] }

const cnpj = toStandardSchema(isValidCnpj, { options: { version: 2 } }); // alphanumeric CNPJ
```

Anything that takes a Standard Schema takes it as is, a TanStack Form field for example:

```javascript
<form.Field name="cpf" validators={{ onChange: cpf }} />
```

Inside a Zod or Valibot schema the validators plug in directly, no wrapper needed, and the result is itself a Standard Schema, which is how a whole form is validated with react-hook-form:

```javascript
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { isValidCep, isValidCpf } from '@brazilian-utils/brazilian-utils';
import { useForm } from 'react-hook-form';
import * as v from 'valibot';
import { z } from 'zod';

// Zod
const zodSchema = z.object({
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  cep: z.string().refine(isValidCep, 'CEP inválido'),
});

// Valibot
const valibotSchema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido')),
  cep: v.pipe(v.string(), v.check(isValidCep, 'CEP inválido')),
});

// react-hook-form, with either one
const form = useForm({ resolver: standardSchemaResolver(zodSchema) });
```

## Inscrição estadual (IE)

### isValidIe

Check if an inscrição estadual (state registration) is valid for a state. **Deprecated:** the positional form `isValidIe(stateCode, ie)` still works but is deprecated; use the object form `isValidIe({ value, stateCode })`.

- Takes a single object (`IsValidIeParams`): `value` is the registration and `stateCode` the state it belongs to (a `StateCode`, case-insensitive). Any other first argument returns `false`.
- GO accepts the prefixes `10`, `11` and `15`, with the check digit special cases of the SEFAZ-GO roteiro (the range `10103105` to `10119997` and the registration `11094402`).
- PA accepts the prefixes `15` and `75` to `79`; MS accepts `28` and `50`.
- SP also accepts the produtor rural pattern `P0MMMSSSSD000`. It rejects any character other than `P` and digits, a deviation from the SINTEGRA regra geral, which ignores them.
- TO accepts the 11 digit form, with the type codes `01`, `02`, `03` and `99`. It also accepts a 9 digit form, applying the same modulus 11 rule to the first eight digits. That form is kept for compatibility; no published SEFAZ-TO roteiro covers it.
- DF follows the 13 digit AC rule under the prefix `07`. PE accepts only the current 9 digit eFisco format, not the old 14 digit CACEPE one. AL does not restrict the tipo de empresa digit.
- RJ: the SINTEGRA page publishes only the modulus rule. The 8 digit length and the weights 2, 7, 6, 5, 4, 3 and 2 come from the SINTEGRA validator itself.
- An all-zero registration is accepted wherever the published formula yields a check digit of 0 for it: AM, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS, SC, SE and SP, plus BA with 8 or 9 digits and TO with 9 digits.
- AM is on that list through the `resto <= 1 ⇒ 0` branch of its formula, the one implemented here; the page's first branch, `Se Soma < 11 Então Dígito = 11 - Soma`, gives 11.

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

Check if an email address is valid. The accepted set is a practical subset of the WHATWG HTML "valid e-mail address" definition, not of RFC 5322.

- The local part is limited to letters, digits and `_'+-.`. It may not start with a dot, end with a dot or an apostrophe, or contain two dots in a row.
- The domain must carry at least one dot. Each label follows the WHATWG production `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?`, so it may neither start nor end with a hyphen nor exceed 63 characters.
- The final label is alphabetic and 2 to 63 letters long, so `user@example.c1` is rejected.
- Quoted local parts and address literals are rejected: `"john doe"@example.com`, `john@[127.0.0.1]`.
- Returns `false` when `value` is not a string.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
isValidEmail('invalid.email'); // false
```

Source: [WHATWG HTML, valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) and [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322).

## Credit card

### isValidCreditCard

Check if a payment card number (credit or debit) is valid using the Luhn algorithm. Only the digit count (12 to 19) and the Luhn check digit are checked. There is no brand detection (Visa, Mastercard, Amex...), issuer range lookup or expiration/CVV checks.

- Accepts the mask characters (whitespace, `.`, `-` and `/`) between any two digits, a run of them included, and whitespace around the value. Any other character makes the value invalid.
- The separators are accepted between any two digits because the printed grouping changes with the brand (4-4-4-4 for Visa and Mastercard, 4-6-5 for American Express, 4-6-4 for Diners Club).
- A number is accepted only when it is a non-negative safe integer. Anything above `Number.MAX_SAFE_INTEGER` (2^53 - 1, 16 digits) has already been rounded, so pass a longer PAN as a string.
- A value whose digits are all the same (`'0000000000000000'`) is rejected even when it passes the Luhn check.

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

Source: [ISO/IEC 7812-1](https://www.iso.org/standard/70484.html), which caps the PAN at 19 digits; the 12 digit floor is the de facto industry minimum (Maestro).

## Professional registration

### isValidRegistroProfissional

Check the structure of a professional council registration number (registro/inscrição profissional). Only the digit count and the UF are checked; no check digit is computed, even for CRC, whose format includes one.

- Takes a single object (`IsValidRegistroProfissionalParams`): `value` is the registration number, `council` the issuing council (`"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` or `"CRC"`, a `RegistroProfissionalCouncil`) and the optional `stateCode` the expected UF.
- Returns `false` for anything that is not an object, for an object missing `value` or `council`, and for a `council` outside those five.
- `"OAB"` and `"CRM"`: 4 to 6 digits plus the UF (`123456/SP`, `123456-SP`).
- `"CRO"`: 3 to 6 digits plus the UF (`12345/SP`).
- `"CRP"`: a 2 digit regional code, CRP-01 to CRP-24, plus 4 to 6 digits (`06/12345`). The code is not a UF (some regions cover more than one state), so `stateCode` is ignored.
- `"CRC"`: the UF, 6 digits, the tipo de registro and one check digit, as in `SP-123456/O-3`. The tipo de registro is `"O"` Originário or `"P"` Provisório, unrelated to the professional category.
- A CRC Registro Transferido or Secundário appends `"T"` or `"S"` and the destination UF after the check digit (`SP-123456/O-3 T-MG`, `TO-654321/P-8 T-SC`, `PI-111222/O-5 S-AC`). Both UFs must be real state codes; `stateCode` is compared against the originating one.
- The OAB, the CFM and the CFO publish no format, so the `"OAB"`, `"CRM"`, `"CRO"` and `"CRP"` digit ranges are conventional. The OAB/SP search field takes 7 characters, and the CFM documents `300`-prefixed and `P`-suffixed CRMs, which these shapes do not express.
- CREA is not covered: its format after the 2016 national unification (RNP) has no official public source.

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

Source: [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf), item 1.1, [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), art. 5º parágrafo único, and the [24 Conselhos Regionais of the CFP](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/).

## VIN

### isValidVin

Check if a VIN (Vehicle Identification Number / chassi) is valid. This is a North-American-style structural check, not a universal validator of Brazilian VINs.

- Checks the length (17 characters) and the excluded letters `I`, `O` and `Q`, per the ISO 3779:2009 structure. Checks the check digit at the 9th position, computed and transliterated per 49 CFR 565.15.
- That check digit is a North-American requirement (49 CFR 565.15 / SAE J853). Resolução CONTRAN nº 968/2022 and ABNT NBR 6066 define the Brazilian VIN structure but do not mandate it. So many Brazilian-built VINs do not carry a matching check digit.
- Case-insensitive; surrounding whitespace is trimmed. Returns `false` when `value` is not a string.
- A VIN is one unbroken run of 17 characters, so no separator is accepted: a space, `.`, `-` or `/` among the characters is rejected instead of being stripped.
- A value whose 17 characters are all the same (`'00000000000000000'`) is rejected even when its check digit matches.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (check digit X, lowercase)
isValidVin('1HGCM82633A004353'); // false (bad check digit)
isValidVin('00000000000000000'); // false (every character the same, though the check digit matches)
isValidVin('1HGCM8263IA004352'); // false (contains the excluded letter I)
isValidVin('1HGCM82633A00435'); // false (16 characters)
```

Source: [ISO 3779:2009](https://www.iso.org/standard/52200.html), [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15) and [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf), which revoked Resolução CONTRAN nº 24/1998 from 1 January 2025.
