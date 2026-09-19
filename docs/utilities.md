---
title: "Utilities"
description: "Every utility of Brazilian Utils, grouped by family (CPF, CNPJ, CEP, boleto, Pix and more), with its options, examples and edge cases."
keywords: ["CPF", "CNPJ", "CEP", "boleto", "Pix", "NF-e", "phone", "license plate", "RENAVAM", "PIS", "CNH", "IBAN", "holidays", "business days", "CBO", "CNAE", "NCM", "CFOP", "validator", "formatter", "parser", "generator"]
---

Here you will find all the utilities available for use.

## CPF

### isValidCpf

Check if CPF is valid. Accepts the usual mask characters and whitespace between/around groups.

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (whitespace mask)
```

### formatCpf

Format CPF. `options.pad` (part of `FormatCpfOptions`) left-pads the value with zeros up to the 11 slots of the pattern before masking (default `false`). `options.obfuscate` (same type) hides the first 3 digits and the 2 check digits (`***.456.789-**`), the gov.br / Receita Federal display convention, applied after `pad`. It is read for truthiness, the way `pad` is, so any truthy value obfuscates.

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

Generate a valid random CPF. Uses `Math.random()` internally, so it is not cryptographically secure. The optional `state` argument (typed as `StateCode`, the two-letter codes of the 27 Brazilian states, e.g. `"SP"`, `"MG"`) ties the CPF to a state by fixing the região fiscal digit in the 9th position to that state's code. Omitted, a random region is used. An unknown code draws a random região fiscal digit instead of throwing, so the result is still a valid CPF.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // the 9th digit is 8, the SP região fiscal code
generateCpf('MG'); // the 9th digit is 6, the MG região fiscal code
```

## CNPJ

### isValidCnpj

Check if CNPJ is valid. `options.version` (part of `IsValidCnpjOptions`) picks which format is accepted: `1` (default) the numeric-only format, `2` both the numeric and the alphanumeric one; any other value is read as `1`, the way `formatCnpj` and `parseCnpj` read it. The usual mask characters and whitespace are accepted in either version. Version `2` has no reserved-value list, because the Receita Federal manual defines none for the alphanumeric format: a repeated-character alphanumeric base (all `A`s, say) that passes the checksum is accepted, while the numeric reserved numbers are rejected under version `1`.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (lowercase alphanumeric)
```

### formatCnpj

Format CNPJ. `options.pad` (part of `FormatCnpjOptions`) left-pads the value with zeros up to the 14 slots of the pattern before masking (default `false`). `options.version` (same type) picks which CNPJ format to read: `1` (default) numeric only, `2` alphanumeric. `options.obfuscate` hides the first 2 digits and the 2 check digits (`**.345.678/0001-**`), the gov.br / Receita Federal display convention. It applies to both versions and comes after `pad`, and is read for truthiness, the way `pad` is, so any truthy value obfuscates.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

### parseCnpj

Remove CNPJ formatting, return a normalized value, and cap the result to 14 characters. `options.version` (part of `ParseCnpjOptions`) picks which CNPJ format to normalize: `1` (default) keeps digits only, `2` keeps letters and digits, so an alphanumeric CNPJ survives the round trip.

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

### generateCnpj

Generate a valid random CNPJ. Uses `Math.random()` internally, so it is not cryptographically secure. The first argument is either the version, as before, or a `GenerateCnpjParams` object with the same `version` plus `branch`, the "número de ordem" (filial) block in positions 9 to 12: an integer from 1 to 9999 written zero padded to four characters, random by default. An invalid `branch` is ignored and a random block is used, and the block stays numeric on the alphanumeric version.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // alphanumeric CNPJ, e.g. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // ordem block '0003', e.g. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // alphanumeric CNPJ whose ordem block is '0001'
```

## CEP and address

### isValidCep

Check if CEP ([brazilian postal code](https://en.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)) is valid. Accepts both `string` and `number` input, but a CEP that starts with `0` has to be passed as a string, since a number cannot keep the leading zero (`isValidCep(1310100)` is `false`, `isValidCep('01310100')` is `true`); any spaces, dots and hyphens around/between the 8 digits are ignored, but any other character, a letter in particular, makes the value invalid.

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

Format CEP ([brazilian postal code](https://en.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)). `options.pad` (part of `FormatCepOptions`) left-pads the value with zeros to the full 8 digits before masking (default `false`); a CEP that starts with `0` given as a number loses that zero, so pass it as a string or use `pad`.

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

Generate a random CEP. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

### getAddressInfoByCep

Fetch address information for a given CEP using multiple providers. Defaults to `['viacep', 'brasilapi']`. The `'widenet'` provider is deprecated (its endpoint no longer responds) and excluded from the default list, but it can still be requested explicitly via `options.providers` (typed as `CepProvider[]`). The resolved address is typed as `AddressInfo`. A transient network failure is retried twice per provider, with a 250 ms linear backoff (250 ms, then 500 ms), so a provider that keeps failing is tried up to 3 times and adds about 750 ms before its own failure lands; an HTTP error status or a non-retryable failure is not retried. The providers are started together and raced with `Promise.any`, not queried one after the other, so those retries delay nothing for the other providers, only the moment an all-failed rejection can surface. An `options.providers` that names no known provider rejects with `GetAddressInfoByCepValidationError` ("Nenhum provedor válido especificado"): an empty array, an array of unknown names, and a value that is not an array at all, `null` included. With `providers: ['brasilapi']`, a CEP BrasilAPI does not know rejects with `GetAddressInfoByCepNotFoundError`, since BrasilAPI signals a miss with HTTP 404; any other error status is still a `GetAddressInfoByCepServiceError`. All three extend `GetAddressInfoByCepError`, the base class of every error this util rejects with, so a single `catch` on it covers all of them.

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

Fetch CEPs from an address using ViaCEP. Throws `GetCepInfoByAddressValidationError` when the UF, city or street is missing/invalid — including when the argument is not an object at all (omitted, `null`, a string) and when `federalUnit` is not a string, neither of which leaks a raw `TypeError` — `GetCepInfoByAddressNotFoundError` when no address matches the query, and `GetCepInfoByAddressError` when ViaCEP itself answers with an HTTP error status. A request that cannot be performed at all (a transport failure) rejects with the underlying `fetch` error instead. Each item is typed as `CepAddressInfo` and carries the ViaCEP payload unchanged, under ViaCEP's own field names: `cep`, `logradouro`, `complemento`, `unidade`, `bairro`, `localidade`, `uf`, `estado`, `regiao`, `ibge`, `gia`, `ddd` and `siafi`. A broad street name matches many CEPs, so query as narrowly as the address allows.

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

Check if boleto ([brazilian payment method](https://en.wikipedia.org/wiki/Boleto)) is valid. Supports both the 47 digit "cobrança bancária" boleto and the "boleto de arrecadação" (convênio/tributos): either its 48 digit linha digitável or its 44 digit barcode, both starting with `8`. One leniency is kept from 2.3.0: the código de moeda in position 4 of the cobrança bancária barcode is not checked, although Carta-Circular BCB nº 2.926/2000 fixes it at `9` (real), so a slip carrying any other moeda digit still validates.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
```

### formatBoleto

Format a boleto number. `options.pad` (part of `FormatBoletoOptions`) left-pads the value with zeros up to the number of slots in the pattern before masking (default `false`). The arrecadação (convênio/tributos) mask applies only to the 48 digit linha digitável starting with `8`; the 44 digit arrecadação barcode has no display grouping defined by FEBRABAN and keeps the "cobrança bancária" mask instead.

```javascript
import { formatBoleto } from '@brazilian-utils/brazilian-utils';

formatBoleto('00190000090114971860168524522114675860000102656'); // 00190.00009 01149.718601 68524.522114 6 75860000102656
formatBoleto('1900000901149', { pad: true }); // 00000.00000 00000.000000 00000.000000 0 01900000901149
formatBoleto('846100000005246100291102005460339004695895061080'); // 84610000000-5 24610029110-2 00546033900-4 69589506108-0 (48 digit arrecadação linha digitável)
formatBoleto('84610000000246100291100054603390069589506108'); // 84610.00000 02461.002911 00054.603390 0 69589506108 (44 digit arrecadação barcode keeps the bancária mask)
```

### parseBoleto

Remove boleto formatting, keep only digits, and cap the result to 47 digits (48 for boleto de arrecadação).

```javascript
import { parseBoleto } from '@brazilian-utils/brazilian-utils';

parseBoleto('00190.00009 01149.718601 68524.522114 6 75860000102656'); // 00190000090114971860168524522114675860000102656
```

### generateBoleto

Generate a valid random boleto. Pass `{ type: "arrecadacao" }` (typed as `GenerateBoletoParams`) to generate a boleto de arrecadação instead of the default "bancario" (cobrança bancária) type. An arrecadação slip draws its segment from 1 to 7 (segment 9 is the banks' own) and its value identifier from all four values, `6` and `8` for an effective amount and `7` and `9` for a reference quantity, so both `hasEffectiveValue` branches of `getBoletoInfo` are reachable.

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

### getBoletoInfo

Extract information from a boleto (amount, expiration date, bank code). Returns `null` when `value` is not a valid boleto — `isValidBoleto` is checked first — so the result has to be narrowed before it is read. 2.3.0 returned `undefined` here; every getter of the package now answers an unresolved lookup with `null`, so only a strict `=== undefined` comparison is affected. Accepts an optional `{ referenceDate }` (typed as `GetBoletoInfoOptions`) to resolve the "fator de vencimento" cycle as of a specific date instead of now (the factor's date-base cycle reset on 22/02/2025 per FEBRABAN). Neither FEBRABAN nor the Banco Central publishes a way of telling an old cycle factor from a new cycle one, so every factor resolves to either of two dates 9000 days apart and `referenceDate` picks between them through the library's own safety windows: the same slip can resolve to the other candidate as time passes, so pass `referenceDate` explicitly whenever the answer has to stay stable. The cycle search never goes below the first cycle, so a `referenceDate` older than the scheme itself still resolves a factor to the oldest date that factor can denote rather than to one before the 07/10/1997 base date. For a boleto de arrecadação, the result, typed as `BoletoInfo`, still carries both keys but empty, `bankCode: ''` and `expirationDate: null`, since the slip has neither a bank code nor a fator de vencimento, and adds `type: "arrecadacao"`, `segment`, `value` and `hasEffectiveValue`.

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

## Pix

### isValidPixKey

Check if a Pix key (chave Pix) is valid: a CPF, a CNPJ, an e-mail address, a Brazilian mobile phone number or a random key (EVP), per the DICT key formats. The manual registers a "número de telefone celular", so a landline is not a valid phone key. `options.accept` (typed as `IsValidPixKeyOptions`) restricts which kinds of key are accepted; it defaults to all of them, and `[]` rejects everything. Exports the `PixKeyType` type.

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

### getPixKeyInfo

Identifies a Pix key and normalizes it to the canonical form the DICT expects inside a BR Code: 11 digit CPF, 14 character CNPJ, lowercased e-mail, E.164 mobile phone (a landline is not a Pix key) or lowercase UUID EVP. An 11 digit value that is valid both as a CPF and as a mobile phone is read as a CPF, unless it was written as a phone number (a `+55`/`0055` prefix or a DDD wrapped in parentheses). The CPF and the phone number are recognized by the way they are written, not only by the digits they carry, so surrounding text is not stripped away and `'abc123.456.789-09'` is not a CPF key. An e-mail key is trimmed and lowercased, and one longer than the 77 characters the DICT allows is rejected. A value whose digits carry a valid CNPJ check digit is read as a CNPJ even when it starts with `0055`, since a phone key inside a BR Code always carries the `+55` prefix. Returns `null` when the value is not a valid Pix key. The result is typed as `PixKeyInfo`.

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

### isValidPixPayload

Check if a Pix BR Code payload (the string behind a Pix QR Code and behind "Pix copia e cola") is valid: well-formed TLV structure, the mandatory objects present, one of the "Merchant Account Information" templates carrying the `br.gov.bcb.pix` GUI with a key or a URL, and a matching CRC-16. The "Point of Initiation Method" object (`01`) is advisory: the Manual do BR Code marks it optional and only assigns a meaning to the value `"12"` ("só pode ser utilizado uma vez"), so it may be absent from either shape and only a value outside `{"11", "12"}` makes the payload invalid. When a payload built around a key carries an amount (`54`), that amount must be greater than zero, unless the payload is a Pix Saque BR Code, i.e. unless it carries the ISPB of the "facilitador de serviço de saque" in sub-object 26-03 (`fss`) as §2.6 of the Pix manual prescribes; rejecting `"0"`/`"0.00"` without `fss` is a deliberate restriction of this library, not a rule of the manual. A `fss` written next to a PSP location makes the payload invalid: §2.7 of the Manual de Padrões para Iniciação do Pix maps the dynamic QR Code to exactly two sub-objects, `00` (GUI) and `25` (URL), and `fss` belongs to the static template of §2.6. The key itself is not checked against the DICT formats, use `isValidPixKey` for that. Unreserved Templates (IDs 80 to 99) are ignored: the "QR Code composto" of Pix Automático (Pix recorrente) writes its recurrence location in one of them, and when such a payload also carries a payment location in 26-25, as the composite example of the Pix manual does, it is accepted and read as an ordinary dynamic payload with the recurrence location dropped. Only a payload with no Pix template at all in IDs 26 to 51 is reported as invalid.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (broken CRC)
```

### getPixPayloadInfo

Parses a Pix BR Code payload into its fields. The payload is validated by `isValidPixPayload` first, so a malformed structure, a broken CRC or a missing mandatory object returns `null` instead of a partial result. A static payload comes back with `key`, a dynamic one with `url`. The Pix key itself is not validated, since the manual allows a static QR Code built around a key that no longer exists in the DICT; key ownership is only settled at payment time. The "Additional Data Field Template" (ID 62) is mandatory in the BR Code table but optional in the EMV® specification it refers to, so it is accepted when absent. The lengths the manual reserves for the merchant name (25), the merchant city (15), the `txid` (25) and the Pix key field 26-01 (77) are generator side limits, enforced by `generatePixPayload` and not checked here, since payloads in the wild routinely overrun them. The result is typed as `PixPayloadInfo`; `pointOfInitiation` is always present and typed as `PixPointOfInitiation`, `"dynamic"` when the payload carries a PSP location or when the "Point of Initiation Method" object (`01`) is `"12"`, `"static"` otherwise. The merchant account information must carry exactly one of a key or a `url` (checked with the same PSP location rule as `generatePixPayload`); `01` itself is advisory, so it may be absent from either shape and only a value outside `{"11", "12"}` returns `null`. When a payload built around a key carries an amount, that amount must be greater than zero, unless the payload is a Pix Saque BR Code: §2.6 of the Pix manual puts the ISPB of the "facilitador de serviço de saque" in sub-object 26-03 (`fss`), which comes back as `withdrawalFacilitator`, and `54` set to `"0"` or `"0.00"` is accepted alongside it. Rejecting a zero amount without `fss` is a deliberate restriction of this library, not a rule of the manual. A `fss` written next to a PSP location returns `null`: §2.7 of the Manual de Padrões para Iniciação do Pix maps the dynamic QR Code to exactly two sub-objects, `00` (GUI) and `25` (URL), and `fss` belongs to the static template of §2.6. When the payload carries a PSP location the amount and the `txid` are ignored, as the manual mandates. Unreserved Templates (IDs 80 to 99) are ignored: a "QR Code composto" of Pix Automático that also carries a payment location in 26-25 is parsed as an ordinary dynamic payload and its recurrence location is dropped, so a consumer that has to tell the two apart cannot rely on this parser. Only a payload with no Pix template at all in IDs 26 to 51 returns `null`.

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

### generatePixPayload

Generates the payload of a Pix BR Code. Exactly one of `params.key` or `params.url` must be given (part of `GeneratePixPayloadParams`); `null` is returned when both or neither are given. `url` must be a PSP location as the Bacen manual defines it: a host name with a path, without a scheme (`pix.example.com/qr/v2/1234`); a dynamic payload cannot carry `amount` or `txid`, which belong to the PSP location. The amount is written with the two decimal places the BR Code takes, so one that rounds to `0.00` and one that does not survive that round trip (`0.005`, `123.456`) are both rejected rather than written as a different sum. The Pix Saque BR Code, which announces the `fss` of sub-object 26-03, is parsed by `getPixPayloadInfo` but not generated here.

When `params.key` is given, it is normalized to its DICT canonical form by `getPixKeyInfo` and the payload is static. When `params.url` is given instead (the PSP location, without a URL scheme, e.g. `"pix.example.com/qr/v2/1234"`), the payload is dynamic per the Manual de Padrões para Iniciação do Pix: the URL takes the key's place in the "Merchant Account Information" template and the "Point of Initiation Method" object is set to dynamic (`12`); `params.url` can be at most 77 characters. `merchantName`, `merchantCity` and `description` are folded to printable ASCII (accents dropped) and truncated to what the BR Code allows. `getPixPayloadInfo` already parses both shapes, so `getPixPayloadInfo(generatePixPayload({ url, ... }))` round-trips.

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

## NF-e key

### isValidNfeKey

Check if a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) is valid. It covers every document whose access key is the same 44 digit string: NF-e (modelo 55), NFC-e (65), CT-e (57, the Conhecimento de Transporte Eletrônico instituted by the cláusula primeira of the [Ajuste SINIEF 09/07](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2007/AJ_009_07)), MDF-e (58), CT-e OS (67, the Conhecimento de Transporte Eletrônico para Outros Serviços instituted by the cláusula primeira of the [Ajuste SINIEF 36/19](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2019/AJ036_19)), GTV-e (64, the CT-e Guia de Transporte de Valores instituted by the cláusula primeira of the [Ajuste SINIEF 03/20](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2020/ajuste-sinief-03-20)), BP-e (63), NF3e (66) and NFCom (62). The CF-e-SAT (59) is out: its 44 position "chave de consulta" is composed differently. The 44 digits may be split into the printed groups of 4 by whitespace, `.`, `-` or `/`, a run of them between two groups included, the same interchangeable mask `isValidCpf` and `isValidCnpj` accept; a separator inside a group of 4, or any other character, is rejected instead of being stripped. The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes found in the `Id` attribute of the document's XML are stripped before that check, along with any whitespace between the prefix and the first group.

The emission type (`tpEmis`) is checked against the codes the MOC of that model assigns, so the accepted set changes with the model: 1 to 7 and 9 for NF-e and NFC-e, `{1, 3, 4, 5, 7, 8}` for the CT-e, `{1, 5, 7, 8}` for the CT-e OS, `{1, 2, 7, 8}` for the GTV-e, `{1, 2, 3}` for the MDF-e and `{1, 2}` for the BP-e, the NF3e and the NFCom. Code 8, the authorização pela SVC-SP, is assigned by the [CT-e MOC 4.00](https://dfe-portal.svrs.rs.gov.br/CTE/Documentos) only, never by the NF-e one; the domains of the [BP-e](https://dfe-portal.svrs.rs.gov.br/BPE/Documentos), the [NF3e](https://dfe-portal.svrs.rs.gov.br/NF3e/Documentos) and the [NFCom](https://dfe-portal.svrs.rs.gov.br/NFCOM/Documentos) come from their own manuals. For NF-e and NFC-e the numeric code is also checked against rule B03-10 of the NF-e MOC, which forbids the twenty repeated and sequential `cNF` values it lists and a `cNF` equal to the document number. A document number of all zeros is turned down for every model, following the leiaute rather than a choice of this library: `tiposBasico_v4.00.xsd` of the [NF-e schema package](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos) types `nNF` as `TNF`, whose pattern is `[1-9]{1}[0-9]{0,8}`, and the Anexo I of every other model repeats the same regex for its own number field.

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (XML Id prefix)
isValidNfeKey('CTe35170458716523000119570010000000128000123452'); // true (CT-e authorised by the SVC-SP)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (masked)
isValidNfeKey('3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458'); // true (any of the mask characters)
isValidNfeKey('351 70458716523000119550010000000121000123458'); // false (a separator inside a group of 4)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (invalid cUF)
isValidNfeKey('35170458716523000119550010000000128000123455'); // false (the NF-e MOC does not assign tpEmis 8)
isValidNfeKey('35170458716523000119550010000000121000000003'); // false (cNF 00000000, rule B03-10)
```

### formatNfeKey

Format a DF-e (Documento Fiscal eletrônico) access key into groups of 4 digits separated by spaces, the form every auxiliary document prints it in: the DANFE of the NF-e and the NFC-e, the DACTE of the CT-e, the CT-e OS and the GTV-e, the DAMDFE of the MDF-e, the DABPE of the BP-e, the DANF3E of the NF3e and the DANFE-COM of the NFCom. Like every formatter of this package, the value is read for its digits and grouped as far as they go, so a masked or partial key still being typed is grouped progressively, and anything without a digit (an object, `true`, an object created with `Object.create(null)`) gives `''` instead of throwing. Use `isValidNfeKey` to check a key. `options.pad` (part of `FormatNfeKeyOptions`) left pads the value with zeros up to the 44 digits of a complete access key (default `false`). The parameter is typed as a string because 44 digits are more than a JavaScript number can hold exactly; at runtime a number is read as the string of its digits, like in every formatter of this package.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'

formatNfeKey('12345'); // '1234 5'

formatNfeKey('12345', { pad: true });
// '0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345'
```

### parseNfeKey

Remove the formatting of a DF-e access key (chave de acesso), keep only digits, and cap the result to 44 digits. The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes the `Id` attribute of the document XML puts in front of the key are stripped first, since `NF3e` carries a digit of its own; use `isValidNfeKey` to check the key and `getNfeKeyInfo` to read its fields.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458');
// '35170458716523000119550010000000121000123458'

parseNfeKey('NFe35170458716523000119550010000000121000123458');
// '35170458716523000119550010000000121000123458'
```

### getNfeKeyInfo

Parses a DF-e access key into its fields (stateCode, year, month, taxId, model, series, number, emissionType, code, checkDigit). Accepts the same input forms as `isValidNfeKey` and returns `null` when the key is not valid. The result is typed as `NfeKeyInfo`, whose `model` is an `NfeKeyModel`. NFCom (`'62'`) and NF3e (`'66'`) spend position 36 of the key on `nSiteAutoriz`, the site of the authorizer that received the document, so for those two models the result also carries `authorizationSite` and `code` is 7 digits instead of 8.

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

The Inscrição SUFRAMA is the registration number the Superintendência da Zona Franca de Manaus gives to companies with tax incentives, carried by the `ISUF` field of the NF-e recipient. It is `SS.NNNN.LLD`: sector of activity, sequential number, locality of the SUFRAMA unit and check digit ([NF-e Manual de Orientação do Contribuinte 7.0, Visão Geral](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), section 8.4).

### isValidSuframa

Check if an Inscrição SUFRAMA is valid: 8 or 9 digits (an 8 digit value is a number whose sector code lost its leading zero), a sector code other than `00` and a módulo 11 check digit. The sector and locality codes are not checked against a table, since the manual lists them only as examples. Accepts the usual mask characters (`.`, `-`, `/`, `(`, `)`, `,`, `*`) and whitespace.

```javascript
import { isValidSuframa } from '@brazilian-utils/brazilian-utils';

isValidSuframa('123456789'); // true
isValidSuframa('12.3456.789'); // true
isValidSuframa('10001018'); // true (same as '010001018')
isValidSuframa('123456780'); // false
isValidSuframa('001234560'); // false (sector 00)
```

### formatSuframa

Format an Inscrição SUFRAMA. `options.pad` (part of `FormatSuframaOptions`) left-pads the value with zeros to the full 9 digits before masking (default `false`), which restores the leading zero of an 8 digit value. The mask is progressive, as in the other `format` utilities, so an 8 digit value without `pad` is grouped one position early: use `pad: true` for a value read straight out of the `ISUF` field, which may be stored with 8 digits.

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

Generate a random 9 digit Inscrição SUFRAMA with a valid check digit and a sector code other than `00`. The sector and locality codes are random. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateSuframa } from '@brazilian-utils/brazilian-utils';

generateSuframa(); // '205678106'
```

## Phone

### isValidPhone

Check if phone number (mobile or landline) is valid. A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before validation, under the rule documented in `parsePhone`. `options.accept` (typed as `PhoneType[]`, part of `IsValidPhoneOptions`) picks which kinds of number count as valid and defaults to `['mobile', 'landline']`; add `'service'` to also accept the non-geographic numbers recognized by `isValidServicePhone`, or pass `[]` to accept none. `options.version` (typed as `PhoneVersion`, part of the same type) is forwarded to `isValidMobilePhone` and picks which mobile numbering rule is enforced: `1` (default) the legacy format, whose first number digit may be 6, 7, 8 or 9, and `2` the current one of Resolução Anatel 749/2022, art. 12, I, "a", which accepts 7, 8 or 9 and rejects the `700` prefix. It only affects mobile numbers; landline and service numbers are unaffected.

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

### formatPhone

Format phone number according to Brazilian patterns. `options.mask` (typed as `PhoneMask`) accepts `"sn"` (default, subscriber number only, 9 digits, no DDD), `"nanp"` (DDD + subscriber number, `"(00) 00000-0000"` for the 11 digits of a mobile and `"(00) 0000-0000"` for the 10 digits of a landline, any other length keeping the 11 digit grouping), `"e164"` (`"+5511987654321"`), `"international"` (`"+55 11 98765-4321"`, the way a Brazilian number is printed for foreign callers), `"service"` (`"0800 123 4567"` or `"4004-1234"`, the conventional groupings for service numbers) or `"auto"`. `"auto"` picks `"international"` when `value` carries a Brazilian country code (`+55`, `0055` or a bare `55` followed by 10 or 11 digits), `"service"` when `value` is a service number, and otherwise falls back to the digit count: `"nanp"` when `value` has more digits than a bare subscriber number, `"sn"` when it does not. `"e164"` and `"international"` drop the country code from `value` first, under the rule documented in `parsePhone`, and fall back to the `"service"` presentation for a service number, since those have no E.164 form. If `value` includes a DDD, pass `{ mask: 'auto' }` (or `'nanp'`) explicitly, since the default `"sn"` mask assumes no DDD and silently truncates one if present. A `mask` outside the union falls back to the default `"sn"` instead of throwing.

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
formatPhone('11900000000'); // 11900-0000 (BEWARE: default "sn" truncates a DDD-prefixed number)
```

### parsePhone

Remove phone formatting, keep only digits, and cap the result to 11 digits. A Brazilian country code is stripped first, but only when the digits left behind are exactly 10 or 11 long, i.e. a plausible national number. The rule is length-based, not sign-based, so a number from area code 55 is not mistaken for a country code.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('55987654321'); // 55987654321 (area code 55, not mistaken for the +55 country code)
```

### generatePhone

Generate a random Brazilian phone number. Accepts `'mobile'`, `'landline'` or `'service'` (typed as `GeneratePhoneType`); a service number has no DDD. Omitted, it randomly generates a mobile or a landline, never a service number. A generated mobile number always starts with 9, so it passes both `isValidMobilePhone` numbering rules.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' or '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' or '40041234'
```

### isValidMobilePhone

Check if mobile phone number is valid. `options.version` (typed as `PhoneVersion`) controls which mobile numbering rule is enforced: `1` (default) is the pre-Resolução Anatel 749/2022 format, kept for 2.3.0 compatibility, whose first number digit (after the DDD) may be 6, 7, 8 or 9; `2` enforces the resolution's art. 12, I, "a", which places 7, 8 and 9 in the Serviço Móvel Pessoal (SMP), so a leading 6 is Reserva Técnica and is rejected. Version `2` also carves out the `700` prefix, which art. 12, II reserves for the Serviço Móvel Global por Satélite rather than SMP, so `isValidMobilePhone('11700123456', { version: 2 })` is `false`; version `1` does not carve it out and accepts it.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true (legacy format)
isValidMobilePhone('11712345678', { version: 2 }); // true (7 is SMP as well)
isValidMobilePhone('11612345678', { version: 2 }); // false (6 is Reserva Técnica)
isValidMobilePhone('11700123456', { version: 2 }); // false (the 700 series is satellite)
```

### isValidLandlinePhone

Check if landline phone number is valid.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
```

### isValidServicePhone

Check if a phone number is a valid Brazilian service number, dialed without a DDD: the Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900` (11 digits total, so the shorter, extinct `0800` + 6 digit form is rejected), the abbreviated `300X`/`400X` numbers (8 digits), and the 3-digit Códigos de Acesso a Serviços de Utilidade Pública that Anatel has designated (e.g. `190`, `192`), whose consolidated table is the Anexo of [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151). `112` and `911` are rejected: Anatel designates neither, and `911` is not even inside the `1N₂N₁` range art. 13 of [Resolução nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) destines to public utility services, so the way handsets route them is a GSM convention rather than a numbering designation. Only the structure is checked: the number does not have to be assigned to anyone, and the `0500` rule that encodes a donation amount in the last two digits is not enforced. Anatel withdrew the 4-digit codes instead of allocating them (art. 43 I of [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86) and art. 2º II of the Ato above both ordered them released), so only the conventional `300X` and `400X` roots are recognised: other "Número Único" carrier prefixes in market use, such as `4020` and `4062`, are out of scope and are rejected.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('11987654321'); // false (geographic number)
```

### getAreaCodeInfo

Get the state (and its region) a Brazilian DDD (area code) belongs to, out of the 67 DDDs in use under the Anatel Plano Geral de Numeração. Accepts a string or a non-negative integer number, stripping any non-digit characters before matching. Exports the `AreaCodeInfo` type.

`stateCode` is always a single state: the one the DDD is seated in, the state of the city the code was allocated around, which is not necessarily the state holding most of its municipalities. Four DDDs straddle a state border, and for those `stateCodes` lists the other states too. DDD 61 is the widest of them, serving the Distrito Federal and the twelve Goiás municipalities of the Entorno do Distrito Federal (Águas Lindas de Goiás, Cabeceiras, Cidade Ocidental, Cristalina, Formosa, Luziânia, Novo Gama, Padre Bernardo, Planaltina, Santo Antônio do Descoberto, Valparaíso de Goiás and Vila Boa), so its `stateCode` is `'DF'` even though the Distrito Federal holds only one of its thirteen municipalities, Brasília. The other three are 42, shared by Paraná and Porto União (SC), 47, shared by Santa Catarina and Rio Negro (PR), and 49, shared by Santa Catarina and Barracão (PR), and there the seat does hold every municipality but the one named.

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

### getAreaCodesByState

Get every DDD (area code) that serves a given Brazilian state, under the Anatel Plano Geral de Numeração. The match is case-insensitive and the result is sorted in ascending order.

A DDD that straddles a state border is listed under every state it serves, so DDD 61 comes back for both `'DF'` and `'GO'`: it serves the Distrito Federal and the twelve Goiás municipalities of the Entorno do Distrito Federal. The other three are 42, shared by Paraná and Porto União (SC), 47, shared by Santa Catarina and Rio Negro (PR), and 49, shared by Santa Catarina and Barracão (PR).

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
getAreaCodesByState('XX'); // []
```

## License plate

### isValidLicensePlate

Check if license plate is valid. Supports the old Brazilian format (ABC-1234) and the Mercosul format (ABC1D23), the single sequence Resolução CONTRAN nº 969/2022 defines for every vehicle, motorcycles included.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (Brazilian format)
isValidLicensePlate('ABC-1234'); // true (Brazilian format with hyphen)
isValidLicensePlate('ABC 1234'); // true (whitespace mask)
isValidLicensePlate('ABC1D23'); // true (Mercosul format)
isValidLicensePlate('ABC12D3'); // false (not a Mercosul sequence)
isValidLicensePlate('ABC1234EXTRA'); // false (too many characters)
```

### formatLicensePlate

Format a license plate. Old Brazilian plates (`LLLNNNN`) are returned with a hyphen and Mercosul plates (`LLLNLNN`) stay normalized. Partial values are formatted as far as they go, so it can also be used as an input mask, and a value that cannot start a valid plate gives `''`.

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

Generate a random license plate in the chosen format. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1D23' (Mercosul, the default)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
generateLicensePlate('LLLNNLN'); // 'ABC1D23' (a format outside the two in circulation falls back to the default)
```

A `format` outside the two supported literals falls back to the Mercosul default, the way every other generator in this package treats an option it does not know, so the result is always a plate `isValidLicensePlate` accepts. That default sequence is `LLLNLNN`, from Resolução CONTRAN nº 969/2022, Anexo I item 1.2, the single sequence the resolution defines for every vehicle, motorcycles included. (2.3.0 used an unknown string verbatim, so `generateLicensePlate('LLLNNLN')` produced the withdrawn motorcycle sequence and `generateLicensePlate('bogus')` five digits; neither is a plate.)

### getFormatLicensePlate

Detect the normalized format of a license plate.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (not a Mercosul sequence)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (too many characters)
```

`getFormatLicensePlate` exports the `LicensePlateFormat` type (`"LLLNNNN" | "LLLNLNN"`); `generateLicensePlate` re-exports it as `GenerateLicensePlateFormat`.

### convertLicensePlateToMercosul

Convert an old format Brazilian license plate (`LLLNNNN`) to the Mercosul format (`LLLNLNN`), following the official conversion table: the digit in the 5th position becomes a letter (`0` through `9` mapping to `A` through `J`). Returns `""` when the value is not a valid old format license plate.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (already Mercosul)
```

## RENAVAM

### isValidRenavam

Check if RENAVAM (Registro Nacional de Veículos Automotores) is valid. Supports both the old format (9 digits) and the new format (11 digits). Any spaces, dots and hyphens around/between the digits are ignored, but any other character, a letter in particular, makes the value invalid. A registration whose digits are all the same is rejected as well.

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

Generate a valid random RENAVAM: the 11 digit form, ten base digits plus the check digit. A base whose digits are all the same is drawn again, since `isValidRenavam` rejects those. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## PIS

### isValidPis

Check if PIS is valid. Accepts the usual mask characters (`.`, `-`, `/`, `(`, `)`, `,`, `*`) and whitespace.

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412547'); // false
```

### formatPis

Format PIS number. `options.pad` (part of `FormatPisOptions`) left-pads the value with zeros to the full 11 digits before masking (default `false`).

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

Generate a valid random PIS. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

## Processo jurídico

### isValidProcessoJuridico

Validate the processo jurídico number according to [CNJ's definition](https://atos.cnj.jus.br/atos/detalhar/119): the `NNNNNNN-DD.AAAA.J.TR.OOOO` layout, the `DD` check digits and the `J`/`TR` pair, which must identify an existing órgão and tribunal from the closed lists defined by Resolução CNJ nº 65/2008, so a number carrying a correct check digit but a court that does not exist is rejected. The closed lists come from art. 1º, § 4º and § 5º of the resolution, § 5º, III in the wording Resolução CNJ nº 477/2022 gave it to seat the TRF da 6ª Região. The unidade de origem (`OOOO`) is only read as four digits, since art. 1º, § 6º leaves its codification to each tribunal and publishes no central list. The CNJ mask separators (whitespace, `.` and `-`) are accepted between the fields, and whitespace around the value is ignored, but any other character, a letter in particular, makes the value invalid.

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
isValidProcessoJuridico('0002080-25.2012.5.15.0049'); // true (CNJ mask)
isValidProcessoJuridico('0000100-68.2008.4.06.0000'); // true (TRF da 6ª Região)
isValidProcessoJuridico('0000100-23.2008.8.28.0000'); // false (no 28th Tribunal de Justiça)
isValidProcessoJuridico('ab00020802520125150049'); // false (letters are rejected)
```

### formatProcessoJuridico

Format the processo jurídico number according to [CNJ's definition](https://atos.cnj.jus.br/atos/detalhar/119) (mask `NNNNNNN-DD.AAAA.J.TR.OOOO`). `options.pad` (part of `FormatProcessoJuridicoOptions`) left-pads the value with zeros to the full 20 digits before masking (default `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // 0002080-25.2012.5.15.0049
formatProcessoJuridico('20802520125150049', { pad: true }); // 0002080-25.2012.5.15.0049
```

### parseProcessoJuridico

Remove processo jurídico formatting, keep only digits, and cap the result to 20 digits. Both the current CNJ mask (`NNNNNNN-DD.AAAA.J.TR.OOOO`) and the older one are accepted, since only the digits are kept.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // 00020802520125150049
```

### generateProcessoJuridico

Generate a valid random processo jurídico number according to [CNJ's definition](https://atos.cnj.jus.br/atos/detalhar/119). `year` must be between the current year and 9999, `court` between 1 and 9; out-of-range values return `null`. The órgão (`J`) and the tribunal (`TR`) are drawn from the closed lists of art. 1º, § 4º and § 5º, so the pair always names a court that exists: `court` picks the órgão and the `TR` is drawn among the tribunais that órgão has. The unidade de origem (`OOOO`) is drawn freely, since the resolution publishes no central list for it. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478645020266070326'
generateProcessoJuridico({ year: 2026, court: 5 }); // '98412562120265087260' (Justiça do Trabalho, TRT da 8ª Região)
generateProcessoJuridico({ year: 10000 }); // null (year out of range)
generateProcessoJuridico({ court: 10 }); // null (no such órgão)
```

## Bank accounts and banks

### isValidBankAccount

Check if a Brazilian bank account is valid. The `bankCode` must belong to the Banco Central do Brasil STR participants list (the same dataset used by `getBankByCode`), so an unassigned code such as `'999'` is always invalid. Banks are then validated in one of three ways: by their published check digit algorithm, by structure only (bank exists and the agency/account match the documented digit lengths, for banks that publish no check digit rule) or by a generic mod10/mod11 check, which stays the fallback for every other listed bank.

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

When `digit` has 2 characters, the generic fallback chains mod10 followed by mod11 over the account, the same way CPF/CNPJ check digits are chained.

Sources: the "Regras de Validação de dígito verificador de agência e conta corrente" compendium, cross checked against `banktools-br` (Ruby), `luizalabs/heimdall` (Python) and `Xerpa/bran_checker` (Elixir). Each shipped algorithm agrees on at least two independent sources.

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

### getBanks

Get every Brazilian bank with a compensation code (COMPE), published by Banco Central do Brasil in the [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Each bank (typed as `Bank`) has a `code` (COMPE, 3 digits), an `ispb` (Identificador do Sistema de Pagamentos Brasileiro, 8 digits) and a `name`. Each call returns a fresh array of fresh objects, so mutating the result never affects subsequent calls.

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

### getBankByCode

Look a Brazilian bank up by its compensation code (COMPE), published by Banco Central do Brasil in the [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Accepts both `string` and `number` input, with or without leading zeros. Returns a fresh copy (typed as `Bank`) of the matching bank, or `null` when no bank has that code.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

### getBankByIspb

Look a Brazilian bank up by its ISPB (Identificador do Sistema de Pagamentos Brasileiro), the 8 digit code published by Banco Central do Brasil in the [STR participants list](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv). Every SPB participant has an ISPB, but this dataset only carries the institutions that also have a COMPE code, so an ISPB whose institution has no COMPE code of its own returns `null`. Accepts both `string` and `number` input, with or without leading zeros, so `getBankByIspb(0)` finds the same bank as `getBankByIspb('00000000')`. The dataset is generated from that CSV, falling back to [BrasilAPI](https://brasilapi.com.br/api/banks/v1) when the Bacen request fails. Returns a fresh copy (typed as `Bank`) of the matching bank, or `null` when no bank has that ISPB.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

## IBAN

### isValidIban

Check if a Brazilian IBAN (International Bank Account Number) is valid, per Bacen's [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf) (Circular BCB nº 3.625/2013): `BR` + 2 ISO 7064 MOD 97-10 check digits + 8 digit ISPB + 5 digit branch + 10 digit account + 1 letter account type (any letter, usually `C` for conta corrente or `P` for conta poupança) + 1 owner indicator (`1` for the first or only holder up to `9` for the ninth, then `A` to `Z` from the tenth, so `0` is rejected), 29 characters total. Only Brazilian IBANs (country code `BR`) are recognized; any other country returns `false`, since this package does not carry the field layout of the other 90+ ISO 13616 countries. Is case-insensitive and accepts both forms an IBAN is written in: compact (`'BR1500000000000010932840814P2'`) or in the ISO 13616 print format, letters and digits in groups of 4 (the last one shorter), with optional surrounding whitespace either way. The groups may be split by whitespace, `.`, `-` or `/`, the interchangeable mask characters `isValidCpf` and `isValidCnpj` accept. Only a separator away from a group boundary, a run of separators (ISO 13616 prints a single one) or a character outside letters and digits makes the value something other than an IBAN, so it is rejected instead of being stripped.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (grouping spaces)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (any of the mask characters)
isValidIban('BR1500000000000010932840814P3'); // false (bad check digits)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (a separator inside a group)
isValidIban('DE89370400440532013000'); // false (non Brazilian IBAN)
```

### formatIban

Format an IBAN in the ISO 13616 print grouping, blocks of 4 characters, the presentation used on statements and bank forms. Does not validate the check digits or the field layout; formats whatever is given, up to the 29 character length of a Brazilian IBAN, as far as it goes, so the function can also be used as an input mask, and an IBAN of another country is grouped the same way up to that length. Use `isValidIban` to check validity. The value may be compact (`'BR1500000000000010932840814P2'`), already in the ISO 13616 print format or a partial value still being typed (`'BR15'`); like every formatter of this package, it is read for its letters and digits and grouped as far as they go, any other character (a hyphen, a dot, extra whitespace) is dropped and the letters are uppercased. Only a value that is not a string gives an empty string.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (only letters and digits are read)
```

### parseIban

Remove IBAN formatting, keep the letters and digits, uppercase the result, and cap it to the 29 characters of a Brazilian IBAN. An IBAN carries letters as well as digits, so the value is read the way `parsePassport` reads a passport number; use `isValidIban` to check the check digits and `getIbanInfo` to read the fields.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR15 0000 0000 0000 1093 2840 814P 2'); // 'BR1500000000000010932840814P2'
parseIban('br15-0000.0000/0000 1093 2840 814p-2'); // 'BR1500000000000010932840814P2'
```

### getIbanInfo

Parses a Brazilian IBAN into its fields: 2 (country code, always `BR`) + 2 (ISO 7064 MOD 97-10 check digits) + 8 (ISPB) + 5 (branch) + 10 (account) + 1 (account type, any letter, usually `C` for conta corrente or `P` for conta poupança) + 1 (owner indicator, `1` to `9` then `A` to `Z`). Only Brazilian IBANs are supported: the field layout of the other ISO 13616 countries is out of scope, so a well-formed non `BR` IBAN also returns `null`. Accepts the same input forms as `isValidIban`, compact or in the ISO 13616 print format (groups of 4 split by a single whitespace, `.`, `-` or `/`), in either case with optional surrounding whitespace and in any case, and returns `null` whenever `isValidIban` would return `false`, including a value carrying a separator away from a group boundary, a run of separators or any character other than letters and digits. The result is typed as `IbanInfo`, whose `accountType` is a `string`.

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

## Currency, numbers and dates in words

### formatCurrency

Formats an integer or float to a string in the BRL pattern. A `number` is formatted as-is (sign and decimals preserved). A `string` input is read by the same rule as `parseCurrency`, except that a value written without any separator stays in whole units: the last `,` or `.` followed by 1 to 2 digits (or up to `precision` digits, when that is larger) is the decimal separator, every other `,` or `.` is a thousands separator, and a `-` written before the first digit is preserved. So `'1.234,56'` formats as `1.234,56`, `'-10.5'` as `-10,50` and `'1234'` as `1.234,00`. `precision` is clamped to `0..20` (the package limit, the bound Node 20 still enforces on `Intl.NumberFormat`), defaults to 2, and falls back to 2 when it is not a finite number. A value that is not a finite number (`NaN`, `Infinity`, `-Infinity`) formats as an empty string, and so does a value that cannot be coerced to a number (a symbol, a plain object, a null-prototype object); `null`, arrays and booleans go through `Number()` as in 2.3.0. `options.symbol` prefixes the result with the `R$` currency symbol (default `false`). Options are typed as `FormatCurrencyOptions`.

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

Transforms a string to an integer or float format. The last `,` or `.` followed by 1 to 2 digits (or up to `precision` digits, when that is larger) is the decimal separator; every other `,` or `.` is a thousands separator. So `'R$ 1.234,56'` parses to `1234.56`, `'R$ 1.234'` to `1234`, `'1,5'` to `1.5` and `'12.34'` to `12.34`. A value written without any separator keeps the cents convention and is divided by `10 ** precision`, so `'1234'` parses to `12.34`. A `-` written before the first digit is preserved, so `'-R$ 1,00'` parses to `-1`. `precision` (default 2, clamped to `0..20`, and falling back to 2 when it is not a finite number) controls how many digits are treated as minor units. Options are typed as `ParseCurrencyOptions`.

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

Formats an integer as its Brazilian Portuguese cardinal number words ("por extenso"), e.g. `1235` becomes `"mil duzentos e trinta e cinco"`. Only integers from `-999999999999999` to `999999999999999` (999 trillion in absolute value) are supported; anything outside that range, `NaN` or a non-finite value returns `""`. A non-integer `value` is truncated toward zero before conversion. `options.gender` (part of `ConvertNumberToWordsOptions`) agrees "um/dois" and the hundreds group ("duzentos/duzentas", etc.) with the noun the number qualifies, defaulting to `"masculine"`. An invalid `gender` value is ignored and the default is used. The result is always lowercase; apply any other casing to it yourself.

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

Formats a monetary amount in Brazilian Reais as its "por extenso" textual representation, the style used to write out the amount by hand on cheques and contracts, e.g. `1523.45` becomes `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`. `value` is truncated (not rounded) to 2 decimal places. The singular noun is used for exactly 1 ("um real", "um centavo") and "de" is inserted before "reais" when the amount is a round million, billion or trillion of reais. An amount that truncates to nothing becomes `"zero reais"` with no "menos" prefix, any other negative amount is prefixed with "menos", and invalid input returns `""`. Above `Number.MAX_SAFE_INTEGER / 100` reais (about 90 trillion) a double cannot carry cents, so the amount is read as a whole number of reais. It takes no options: the result is always lowercase; apply any other casing to it yourself.

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

Formats a date as its Brazilian Portuguese "por extenso" textual representation, e.g. `"01/01/2024"` becomes `"primeiro de janeiro de dois mil e vinte e quatro"`. Accepts a `Date` (read by its local calendar date, the same convention used by `isHoliday`) or a string in `"dd/mm/yyyy"` or ISO `"yyyy-mm-dd"` format. With the default `options.style` of `"full"`, day 1 is written as "primeiro" and every other day uses the cardinal number; with `"month"`, only the month name is spelled out and the day/year are left as digits (day 1 as `"1º"`, e.g. `"2 de março de 2024"`, `"1º de janeiro de 2024"`). Month names are lowercase. In `"full"` style the year is written out as a cardinal number without the thousands comma that `convertNumberToWords`/`convertCurrencyToWords` use (`1999` reads as `"mil novecentos e noventa e nove"`, not `"mil novecentos e noventa e nove"`), matching how a date is read aloud. `options.weekday` (default `false`) prefixes the pt-BR weekday name in lowercase followed by a comma (`"sábado, dois de março de dois mil e vinte e quatro"`), computed from the resolved calendar date. An invalid `style` value is ignored and the default is used. The result is always lowercase; apply any other casing to it yourself. February 29th is accepted on the leap years of the proleptic Gregorian calendar (divisible by 4, except centuries not divisible by 400). Returns `""` for an invalid `Date`, a malformed string, a day/month that does not exist, or a date before year 1.

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

Get all Brazilian states, each with its two-letter code, name, region code, region name and 2-digit IBGE code of the Federative Unit (`cUF`). The list is sorted by name with `localeCompare` in the "pt-BR" locale, so accented names land where a Brazilian reader expects them: Pará, Paraíba, Paraná and Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul. Each call returns a fresh array of fresh objects, so mutating the result never affects subsequent calls. Exports the `State`, `StateCode` and `StateName` types. `State` is a discriminated union with one member per state, so the fields of a state are tied to each other: narrowing a `State` by `code` narrows its `name`, `regionCode`, `regionName` and `ibgeCode` too (`Extract<State, { code: 'SP' }>['name']` is `'São Paulo'`), and an impossible combination such as `{ code: 'SP', name: 'Acre' }` is not a `State`.

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

### getStateByIbgeCode

Get the Brazilian state whose 2-digit IBGE code ("cUF", the Código da Unidade da Federação) matches the given value. This is the same 2-digit UF code found in the first field of every DF-e access key (chave de acesso) issued for any of the models `isValidNfeKey` covers: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) and NFCom (62). Accepts a string or a non-negative integer number, stripping any non-digit characters before matching. Exports the `State` type.

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

### getStateCodeByName

Get the two-letter code (sigla) of a Brazilian state given its full name. The match is accent-insensitive, case-insensitive and ignores leading/trailing whitespace, so `'sao paulo'`, `'SÃO PAULO'` and `'  São Paulo  '` all resolve to `'SP'`. Every run of internal whitespace collapses into a single space too, so `'Rio  de  Janeiro'` resolves to `'RJ'`, while a name written without the space matches nothing (`'saopaulo'` is not `'São Paulo'`). Exports the `StateCode` type.

```javascript
import { getStateCodeByName } from '@brazilian-utils/brazilian-utils';

getStateCodeByName('São Paulo'); // 'SP'
getStateCodeByName('sao paulo'); // 'SP'
getStateCodeByName('  Rio de Janeiro  '); // 'RJ'
getStateCodeByName('Neverland'); // null
```

### getStateNameByCode

Get the full name of a Brazilian state given its two-letter code (sigla). The match is case-insensitive and ignores leading/trailing whitespace, so `'sp'`, `'SP'` and `'  Sp  '` all resolve to `'São Paulo'`. Exports the `StateName` type.

```javascript
import { getStateNameByCode } from '@brazilian-utils/brazilian-utils';

getStateNameByCode('SP'); // 'São Paulo'
getStateNameByCode('sp'); // 'São Paulo'
getStateNameByCode('  Rj  '); // 'Rio de Janeiro'
getStateNameByCode('ZZ'); // null
```

### getTimezoneByState

Get the IANA time zone database name (tzdata zone) for a Brazilian state, chosen as the zone of the state capital. The match is case-insensitive and ignores leading/trailing whitespace. Some tzdata zones cover more than one state: `America/Sao_Paulo` also covers DF, GO, MG, ES, RJ, PR, SC and RS besides SP, and `America/Fortaleza` also covers MA, PI, RN and PB besides CE. Pernambuco resolves to `America/Recife`, not `America/Noronha`: Fernando de Noronha is an archipelago district of PE, not a state of its own.

```javascript
import { getTimezoneByState } from '@brazilian-utils/brazilian-utils';

getTimezoneByState('SP'); // 'America/Sao_Paulo'
getTimezoneByState('am'); // 'America/Manaus'
getTimezoneByState('AC'); // 'America/Rio_Branco'
getTimezoneByState('PE'); // 'America/Recife'
getTimezoneByState('ZZ'); // null
```

### getMunicipalities

Get Brazilian municipalities published by the IBGE. Returns all municipalities if no state is provided, or municipalities from a specific state. Each municipality is returned as `{ code, name, stateCode }`, where `code` is the 7-digit IBGE municipality code. Results are sorted by name with `localeCompare` in the "pt-BR" locale. Each call returns a fresh array of fresh objects, so mutating the result never affects subsequent calls. An unknown state code returns an empty array instead of throwing. Only an omitted (or `undefined`) `stateCode` asks for the full list: `getMunicipalities(null)` and `getMunicipalities('')` return `[]`, where the looser `getCities(null)` and `getCities('')` return every city. The state code is matched exactly, case included: `getMunicipalities('sp')` returns `[]` where `getMunicipalities('SP')` returns the 645 São Paulo municipalities. `getMunicipalities` and `getCities` are the only state-taking lookups that are case-sensitive; `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality` all fold case.

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

`getMunicipalities` embeds all 5571 IBGE municipalities and their codes, so it carries the same bundle-size cost as `getCities`. See [Bundle size](getting-started.md#bundle-size) for how to lazy-load it via `@brazilian-utils/brazilian-utils/get-municipalities` instead of the root import.

### getMunicipalityByCode

Look up a Brazilian municipality by its 7-digit IBGE code. Accepts the code as a string or a number, with any non-digit characters stripped before matching; a code given as a number must be a non-negative integer, so `-3550308` and `355030.8` return `null` instead of being read as `3550308`. Returns `{ code, name, stateCode }`, a fresh object, or `null` when the code is not 7 digits long or does not match any known municipality.

```javascript
import { getMunicipalityByCode } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCode('3550308');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode(3550308);
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode('0000000'); // null (unknown code)
getMunicipalityByCode('123'); // null (not 7 digits)
```

### getCities

Get Brazilian cities. **Deprecated:** use `getMunicipalities` instead. Returns all cities if no state is provided, or cities from a specific state. Each call returns a fresh array, so mutating the result never affects subsequent calls. An unknown state code (or a non-`StateCode` value) returns an empty array instead of throwing, except for a falsy one: `getCities(null)` and `getCities('')` are read as "no state given" and return every city, where the stricter `getMunicipalities` returns `[]` for them. The state code is matched exactly, case included: `getCities('sp')` returns `[]` where `getCities('SP')` returns the 645 São Paulo cities. `getCities` and `getMunicipalities` are the only state-taking lookups that are case-sensitive; `getStateNameByCode`, `getTimezoneByState`, `getAreaCodesByState` and `getMunicipality` all fold case.

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

`getCities` embeds all 5571 IBGE municipality names (~154.2 KB minified, ~49.8 KB gzipped) and is one of the few heavy exceptions in this otherwise tree-shakeable package. See [Bundle size](getting-started.md#bundle-size) for how to lazy-load it via `@brazilian-utils/brazilian-utils/get-cities` instead of the root import.

### getMunicipality

Get municipality information by IBGE code, or get an IBGE code from municipality name and UF. **Deprecated:** use `getMunicipalityByCode` instead, which is synchronous and offline; matching a municipality by name is up to the application, over `getMunicipalities`. A single function handles both directions, based on whether `options` has a `code` or a `municipalityName`/`uf`. `code` accepts both `string` and `number` input and must be exactly 7 digits, otherwise the function resolves to `null`. A `code` given as a number must be a non-negative integer: a sign and a decimal point are not digits, so `-3550308` and `355030.8` resolve to `null` instead of being read as `3550308`. Resolution is entirely offline, from a bundled IBGE dataset: no network request is made. The municipality name match ignores accents and casing, and every run of whitespace collapses into a single space, so `'sao  paulo'` matches `'São Paulo'` while a name written without the space does not; the casing is folded to upper case, the direction Unicode expands `'ß'` to `'SS'` in, so `'Paßos'` matches `'Passos'`. An unknown municipality, an unknown UF or invalid input all resolve to `null`. The `[name, uf]` pair is a fresh array on every call, so mutating the result never affects subsequent lookups.

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

In TypeScript the return type follows the direction of the lookup: a `{ code }` query resolves to `[string, string] | null`, a `{ municipalityName, uf }` query resolves to `string | null`, and a query whose direction is only known at run time (a variable typed as `GetMunicipalityParams`) resolves to the union of both. The 2.3.0 names `GetMunicipalityOptions`, `GetMunicipalityByCodeOptions` and `GetMunicipalityByNameOptions` are still exported as deprecated aliases of these.

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

## Holidays and business days

### getHolidays

Get Brazilian holidays for a given year. Returns national holidays and optionally state-specific holidays. Each holiday (typed as `Holiday`) has a `type` field (`HolidayType`: `"national"`, `"state"`, `"optional"` or `"religious"`). "Dia da Consciência Negra" (Nov 20) is a national holiday from 2024 onward (Lei nº 14.759/2023). Before that, several states still carry a state-level entry of their own on the same date, under the same `"Dia da Consciência Negra"` name in MT, RJ, AM and SP, and under `"Dia Estadual da Consciência Negra"` in AP, the name that state's own law uses. Commemorative dates that no law turns into a holiday are not listed: RN's "Dia do Rio Grande do Norte" (7 August, Lei RN nº 7.831/2000) is one, and neither is RO's "Dia dos Evangélicos" (18 June), whose law the STF struck down in ADI 3940. Results are memoized per `year`/`stateCode`, but each call still returns a fresh copy. An unknown/invalid `stateCode` is ignored, returning national holidays only; the lookup reads own properties only, so `"__proto__"`, `"constructor"` and the like are unknown state codes rather than a crash. Only the years 1900 through 2099 are supported, the range the business day utilities inherit; a year outside it returns `[]`.

Only one state holiday per UF is a feriado civil under [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm), art. 1º, II, which authorises "a data magna do Estado fixada em lei estadual" in the singular; the other entries rest on ordinary state laws and are reported because they are observed in practice. Notable per-state rules:

- **SC** — [Lei SC nº 18.531/2022](http://leis.alesc.sc.gov.br/html/2022/18531_2022_lei.html) moves both state holidays, "Dia do Estado de Santa Catarina" (Aug 11) and "Dia de Santa Catarina de Alexandria" (Nov 25), to the following Sunday whenever they fall Monday to Friday, so Monday Aug 11 2025 is a business day in SC and the holiday lands on Sunday Aug 17. The two dates did not start transferring together. Aug 11 transfers from 2005 on, the year [Lei SC nº 13.408/2005](http://leis.alesc.sc.gov.br/html/2005/13408_2005_lei.html) extended the clause to it (published and in force on Jul 15 2005), and stays on Aug 11 before that. Nov 25 transfers from 1999 on, the year [Lei SC nº 11.213/1999](http://leis.alesc.sc.gov.br/html/1999/11213_1999_lei.html) first introduced the clause (published and in force on Nov 12 1999, thirteen days before that year's Nov 25), with a one-year gap: art. 3º of [Lei SC nº 12.906/2004](http://leis.alesc.sc.gov.br/html/2004/12906_2004_lei.html) revoked that law without restating the clause, so Nov 25 2004 alone stays on the statutory date until Lei SC nº 13.408/2005 reinstated the transfer. So Nov 25 1999 (a Thursday) lands on Sunday Nov 28, Nov 25 2002 (a Monday) on Sunday Dec 1, Nov 25 2004 (a Thursday) stays put, and Nov 25 2005 (a Friday) lands on Sunday Nov 27.
- **DF** — [Lei distrital nº 72/1989](https://www.sinj.df.gov.br/sinj/Norma/18459/Lei_72_27_12_1989.html), art. 1º parágrafo único, declares Corpus Christi a feriado. With `stateCode: 'DF'` the single Corpus Christi entry comes back typed `"state"` instead of `"optional"`; it is replaced, not duplicated.
- **GO** — [Lei GO nº 20.756/2020](https://legisla.casacivil.go.gov.br/pesquisa_legislacao/100979/lei-20756), art. 269, II, lists three feriados estaduais: Jul 26 (Fundação da Cidade de Goiás), Oct 24 (Lançamento da Pedra Fundamental de Goiânia) and Oct 28 (Dia do Servidor Público).
- **AL** — Sep 16 is a feriado estadual from 2024 ([Lei AL nº 9.358/2024](https://sapl.al.al.leg.br/norma/3117)) and only a ponto facultativo (`"optional"`) before that.
- **PB** — Jul 26 ("Morte de João Pessoa") is emitted up to 2015 only: [Lei PB nº 10.601/2015](https://sapl.al.pb.leg.br/norma/11988), art. 2º, revoked its basis.
- **TO** — Mar 18 ("Autonomia do Estado do Tocantins") is emitted up to 2008 only: [Lei TO nº 2.013/2009](https://www.al.to.leg.br/arquivo/15724) rewrote the clause that declared the feriado into a commemorative provision.

The statutory date is what is returned. SC's shift above is the only observance shift modelled; Acre's Tuesday-to-Thursday shift and the Goiás decrees that may move Jul 26 and Oct 28 are not.

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

### isHoliday

Check if a specific date is a Brazilian holiday. The check compares `targetDate`'s local calendar date (year/month/day as read locally), not its underlying UTC instant. Returns `false` when `targetDate` is missing or not a valid `Date`. An invalid `stateCode` is treated in two different ways: a string that is not a known state code is ignored and only national holidays are considered, the same as `getHolidays`, while a `stateCode` that is present and is not a string at all (a number, `null`, an object) is rejected and makes the call return `false` even for a national holiday.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

### isBusinessDay

Check if a date is a Brazilian business day (dia útil). Returns `false` for Saturdays, Sundays, and Brazilian holidays returned by `getHolidays` for `value`'s local calendar day (year/month/day as read locally), the same convention used by `isHoliday`. `options.includeOptional` (part of `BusinessDayOptions`, the option type every business day utility shares) defaults to `true`, so optional-type holidays (`Holiday.type === "optional"`, i.e. Carnaval and Corpus Christi) also count as non-business days; pass `false` to only treat statutory holidays this way. `options.stateCode` also considers that state's holidays; a string that is not a known state code is ignored, falling back to national holidays only, while a `stateCode` that is present and is not a string at all (a number, `null`, an object) is rejected and makes the call return `false` even for an ordinary weekday, the same split `isHoliday` makes and the value `addBusinessDays`, `subBusinessDays` and `differenceInBusinessDays` reject with `null`. A `value` that is not a valid `Date` returns `false`. Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date outside it returns `false`.

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

Add a number of Brazilian business days (dias úteis) to a date, skipping Saturdays, Sundays and Brazilian holidays exactly as `isBusinessDay` defines them (same `BusinessDayOptions`: `options.includeOptional`, default `true`, and `options.stateCode` work exactly as they do there). The signature is date-fns': `addBusinessDays(date, amount, options?)`. Returns a new `Date`; the input `date` is never mutated, and its time-of-day is preserved in the result. An `amount` of `0` returns a new `Date` equal to `date`, unchanged, even when `date` itself falls on a weekend or holiday, this mirrors the verified behavior of [date-fns' `addBusinessDays(date, 0)`](https://date-fns.org/docs/addBusinessDays), which also does not roll the input to the next business day. A negative `amount` walks backwards, one business day at a time, also like date-fns. Returns `null` on bad input: a `date` that is not a valid `Date`, an `amount` that is not a finite integer, or a `stateCode` that is not a string; an `options` that is not an object at all is ignored, exactly as `isBusinessDay` ignores it. Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date outside it, or a walk that leaves it, returns `null`.

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

Subtract a number of Brazilian business days (dias úteis) from a date: `subBusinessDays(date, amount, options?)` is `addBusinessDays(date, -amount, options)`, which is exactly how it is implemented, so every detail above (the preserved time-of-day, the untouched input, an `amount` of `0` returning the date unchanged, the 1900-2099 range and the `null` cases) holds here too, `options.stateCode` and `options.includeOptional` included. A negative `amount` walks forwards.

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

Count the number of Brazilian business days (dias úteis) between two dates, mirroring the semantics of [date-fns' `differenceInBusinessDays`](https://date-fns.org/docs/differenceInBusinessDays) (verified against its source), argument order included: `differenceInBusinessDays(laterDate, earlierDate, options?)`. The walk starts at `earlierDate` and stops just before `laterDate`, so `earlierDate` is counted when it is itself a business day, `laterDate` is never counted, and every business day strictly in between is counted once. Only the calendar day of each `Date` matters, the time of day is ignored. Business days are determined exactly like `isBusinessDay` (same `BusinessDayOptions`), `options.includeOptional` (default `true`) and `options.stateCode` included. The result is positive when `laterDate` is after `earlierDate` and negative when it is before it; two dates on the same calendar day return `0`. Returns `null` on bad input: a date that is not a valid `Date`, or a `stateCode` that is not a string; an `options` that is not an object at all is ignored. Only years from 1900 through 2099 are supported, the range `getHolidays` computes; a date outside it returns `null`.

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

Check if a Brazilian passport number is valid (2 letters followed by 6 digits). Accepts both `string` and `number` input; the input is case-insensitive and any non-alphanumeric characters (spaces, dots, hyphens) are ignored. A number is accepted for symmetry with `formatPassport`/`parsePassport` but is never valid: the decimal form of a number never starts with the two letters a passport number needs.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (case-insensitive)
isValidPassport('AB-123.456'); // true (symbols are ignored)
isValidPassport('12345678'); // false
```

### formatPassport

Format a Brazilian passport number (uppercase, without symbols, capped to 8 characters). A non-string input returns an empty string.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

### parsePassport

Remove all non-alphanumeric characters from a passport number, uppercase the result, and cap it to 8 characters. A non-string input returns an empty string.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

### generatePassport

Generate a random valid Brazilian passport number. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## CNH

### isValidCnh

Check if CNH is valid. Spaces, dots and hyphens around/between the digits are ignored, but any other character, a letter in particular, makes the value invalid. A value whose 11 digits are all the same is rejected before the check digits are computed, so `'11111111111'` is invalid.

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hyphen before the check digits)
isValidCnh('ab00000000119'); // false (letters are rejected)
```

### formatCnh

Format CNH. `options.pad` (part of `FormatCnhOptions`) left-pads the value with zeros to the full 11 digits before masking (default `false`).

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

Generate a valid random CNH. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

## Legal nature

### isValidLegalNature

Check if a legal nature code exists in the official list. The table follows IBGE/CONCLA's "Natureza Jurídica 2021": the 92 codes in force plus the 8 a past revision of the table retired, kept because they still appear in records filed while they were in force. Use `getLegalNature` to tell the two apart: a retired code comes back with `legacy: true` and the `currentCode` it corresponds to today. Only the usual mask characters (hyphens, dots, whitespace) are tolerated around the 4 digits, so `'2062a'` is rejected instead of being read as `'2062'`.

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('2208'); // true (retired by a past revision, still accepted)
isValidLegalNature('9999'); // false
```

### formatLegalNature

Format a legal nature code. `options.pad` (part of `FormatLegalNatureOptions`) works exactly like it does in `formatCpf`/`formatCep`: with the default `false` the mask is applied progressively, as far as the value goes; with `true` the value is first left padded with zeros to the 4 digits of a complete code. Use `isValidLegalNature` to check a code.

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

Generate a random valid legal nature code. Only the 92 codes in force are drawn, never one of the 8 a past revision retired. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

### getLegalNature

Look a legal nature code up in the official IBGE/CONCLA table. The entry also carries the CONCLA category the code is listed under, taken from its first digit. No legal nature code starts with a zero, that first digit is the category (1 to 5), so nothing is ever padded here: a number and the string of the same digits are read identically.

A code a past revision of the table retired is still looked up, because it keeps appearing in records filed while it was in force, and comes back with `legacy: true` and the `currentCode` it corresponds to today, per the CONCLA correspondence spreadsheets. The 92 codes in force have `legacy: false` and no `currentCode`.

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

### getLegalNatures

Get the legal nature map keyed by code. Only the 92 codes of the CONCLA 2021 table, the ones in force, are listed by default; pass `{ includeLegacy: true }` (`GetLegalNaturesParams`) to add the 8 a past revision of the table retired.

```javascript
import { getLegalNatures } from '@brazilian-utils/brazilian-utils';

const legalNatures = getLegalNatures();

legalNatures['2062']; // 'Sociedade Empresária Limitada'
Object.keys(legalNatures).length; // 92
legalNatures['2208']; // undefined (retired by a past revision)
getLegalNatures({ includeLegacy: true })['2208']; // 'Entidade Binacional Itaipu'
```

### getLegalNaturesByCategory

Get every legal nature of a CONCLA category, the group given by the first digit of the code: `1` Administração Pública, `2` Entidades Empresariais, `3` Entidades sem Fins Lucrativos, `4` Pessoas Físicas and `5` Organizações Internacionais e Outras Instituições Extraterritoriais. The category is accepted as a string or as a number, the entries come back sorted by code, and an unknown category gives `[]`. Only the codes in force are listed by default; pass `{ includeLegacy: true }` (`GetLegalNaturesByCategoryOptions`) to add the retired codes of the category, in code order.

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

## Voter ID

### isValidVoterId

Check if a voter ID number is valid. Accepts both the standard 12-digit id and the 13-digit id issued by São Paulo (UF `01`) and Minas Gerais (UF `02`). Whitespace and dots are accepted around and between the `0000 0000 00 00` groups, but any other character, a letter in particular, makes the value invalid.

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
```

### formatVoterId

Format a voter ID number. Uses the 12-digit grouping `0000 0000 00 00` by default; the 13-digit grouping `0000 0000 0 00 00` is used only when the sanitized value has more than 12 digits **and** its federative union code (the 10th and 11th digits) is `01` (São Paulo) or `02` (Minas Gerais), the two states whose voter ids may carry a 9-digit sequential number.

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

Generate a valid random voter ID number. You can optionally provide a state code; an unknown state code falls back to `"ZZ"` (issued abroad) instead of throwing. Uses `Math.random()` internally, so it is not cryptographically secure.

```javascript
import { generateVoterId } from '@brazilian-utils/brazilian-utils';

generateVoterId(); // valid random voter ID (abroad, "ZZ")
generateVoterId('SP'); // valid random voter ID for Sao Paulo
generateVoterId('XX'); // falls back to "ZZ" instead of throwing
```

## CNS

### isValidCns

Check if a CNS (Cartão Nacional de Saúde) number is valid, the unique SUS (Sistema Único de Saúde) user identifier. Definitive cards (starting with 1 or 2) are validated over an embedded 11 digit PIS/PASEP/NIS derived base weighted 15 down to 5; when the raw digit computes to 10, DATASUS raises the weighted sum by 2, recomputes the digit and marks the card with the suffix `001` instead of `000`. Provisional cards (starting with 7, 8 or 9) are validated instead by a single weighted sum (weights 15 down to 1) that must be a multiple of 11. The value has to be written as the 15 digits, optionally split into the printed groups of 3-4-4-4 by whitespace, `.`, `-` or `/`, the interchangeable mask characters `isValidCpf` and `isValidCnpj` accept, a run of them between two groups included; letters among the digits, or a separator inside a group, are rejected instead of being read past.

The two routines come from the [ANVISA CNS validation page](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/), which sits behind a bot filter and answers HTTP 403 to non-browser clients. The [e-SUS APS page](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html) documents the same algorithm and is reachable without a browser, but applies the provisional routine to numbers starting with 5, 7, 8 or 9; this implementation follows ANVISA and rejects a 5-prefixed number even when its weighted sum checks out.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitive)
isValidCns('700000000000005'); // true (provisional)
isValidCns('123.4567-8901/0000'); // true (any of the mask characters)
isValidCns('12345678901'); // false (wrong length)
isValidCns('abc123456789010000'); // false (not written as a CNS)
```

### formatCns

Format a CNS (Cartão Nacional de Saúde) number into the common display groups of 3-4-4-4 digits separated by spaces. `options.pad` (part of `FormatCnsOptions`) left-pads the value with zeros up to the 15 slots of the pattern before masking (default `false`).

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010000'); // '123 4567 8901 0000'
formatCns(123456789010000); // '123 4567 8901 0000'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

### parseCns

Remove CNS (Cartão Nacional de Saúde) formatting, keep only digits, and cap the result to 15 digits. A partial value passes through as far as it goes, so it can also strip the mask off an input still being typed; use `isValidCns` to check the number itself.

```javascript
import { parseCns } from '@brazilian-utils/brazilian-utils';

parseCns('123 4567 8901 0000'); // '123456789010000'
```

## Certidão

### isValidCertidao

Check if the matrícula of a certidão de registro civil (nascimento, casamento, óbito and the other acts kept by a serventia de registro civil das pessoas naturais) is valid. The matrícula has 32 digits laid out as 6 (CNS da serventia) + 2 (acervo) + 2 (serviço) + 4 (ano) + 1 (tipo do livro) + 5 (livro) + 3 (folha) + 7 (termo) + 2 (dígitos verificadores), and both check digits are modulus 11 with the weights cycling from 2 to 10 and back through 0: the first pass starts at 2 over the 30 base digits, the second at 1 over the 31 digits that include the first check digit, and in both a remainder of 10 is read as 1. Accepts the usual mask characters and whitespace between/around groups. The layout is the one [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243) (Provimento CNJ nº 149/2023) currently publishes, with inciso II and §§ 1º and 3º to 5º in the redação of the Provimento CN nº 237/2026 and the rest of the article, § 2º included, in that of the Provimento CN nº 182/2024; the matrícula itself was instituted by the now revoked [Provimento CNJ nº 2/2009](https://atos.cnj.jus.br/atos/detalhar/1311) and got its digit structure from the also revoked [Provimento CNJ nº 3/2009, art. 7º](https://atos.cnj.jus.br/atos/detalhar/1310). The check digits are detailed by [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and implemented by [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) and [validator-docs](https://github.com/geekcom/validator-docs/blob/master/src/validator-docs/Rules/Certidao.php).

The serviço digits are fixed at `55`, the code [art. 473, III](https://atos.cnj.jus.br/atos/detalhar/5243) assigns to the registro civil das pessoas naturais, so a matrícula carrying any other pair in the ninth and tenth positions is rejected however good its check digits are. The book-type digit always has to name one of the nine book types (the same `CertidaoType` returned by `getCertidaoInfo`), so a matrícula whose digit is `0` is rejected however good its check digits are, the same way `getCertidaoInfo` returns `null` for it. `options.accept` (part of `IsValidCertidaoOptions`) narrows that to the listed types; it defaults to every type, and a value that is not an array falls back to that default. Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can hold.

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

### formatCertidao

Format the matrícula of a certidão de registro civil into the printed mask of the Provimento, the 32 digits grouped as 6 2 2 4 1 5 3 7 2 and separated by spaces. `options.pad` (part of `FormatCertidaoOptions`) left pads the value with zeros up to 32 digits (default `false`). The mask is the one of [art. 473 of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243). A number is accepted and read as the string of its digits, like in `formatCpf`, but a full 32 digit matrícula has to be a string: that many digits are more than a JavaScript number can hold exactly. At runtime the value is read for its digits and masked as far as they go, like in every formatter of this package, so a partial matrícula still being typed is masked progressively.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // 104539 01 55 2013 1 00012 021 0000123 21
formatCertidao('1552010100020112000012087', { pad: true }); // 000000 01 55 2010 1 00020 112 0000120 87
formatCertidao(104539015520); // 104539 01 55 20 (a number is read as the string of its digits)
```

### parseCertidao

Remove the formatting of the matrícula of a certidão de registro civil, keep only digits, and cap the result to 32 digits. This only takes the mask off: use `isValidCertidao` to check the matrícula and `getCertidaoInfo` to read its fields.

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
// '10453901552013100012021000012321'
```

### getCertidaoInfo

Parse the matrícula of a certidão de registro civil into its fields, returning `null` when the matrícula is not valid, which includes a book code that is not one of the nine books. A serviço other than the `55` that art. 473, III fixes for the registro civil das pessoas naturais also gives `null`. [Art. 473, V of the Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243) lists the codes 1 to 7; no CNJ primary text reachable today publishes the other two, the Anexo IV of the revoked Provimento CNJ nº 63/2017 included, which lists the same seven. The codes 8 (emancipação) and 9 (interdição) come from the references the check digit rule rests on: [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts) both print the nine book list. They are kept because matrículas carrying them circulate. Only a string is accepted: the 32 digits of a matrícula are more than a JavaScript number can hold.

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

The `CertidaoInfo` result carries:

| Key | Description |
| --- | --- |
| `registryCns` | The 6 digit CNS (Código Nacional de Serventia) of the serventia that issued the act. |
| `acervo` | Acervo the book belongs to: `"01"` the serventia's own, `"02"` and up one per acervo it absorbed. [Art. 473, §§ 3º to 5º](https://atos.cnj.jus.br/atos/detalhar/5243) splits the absorbed ones by the date the origin serventia was extinguished or deactivated: up to 31/12/2009 the matrícula carries the CNS of the incorporating unit and an acervo code from `"02"` up, one per incorporation; from 01/01/2010 on it carries the CNS of the incorporated unit itself and the code `"01"`, counted as that unit's own acervo; and an acervo split between two or more successor serventias gets each successor's own CNS with the code `"02"`. |
| `service` | Service rendered by the serventia, always `"55"`, the registro civil das pessoas naturais. |
| `year` | Four digit year the act was recorded. |
| `type` | The book the act belongs to: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, `"emancipation"` or `"interdiction"`. |
| `typeCode` | Raw book code, 1 to 9, as printed in the fifteenth position of the matrícula. |
| `book` | The 5 digit book (livro) number, zero padded. |
| `page` | The 3 digit page (folha) number, zero padded. |
| `term` | The 7 digit term (termo) number, zero padded. |
| `checkDigits` | The 2 modulus 11 check digits of the matrícula. |

## CEI, CNO and CAEPF

### isValidCei

Check if a CEI (Cadastro Específico do INSS) number is valid. The CEI identifies an employer with no CNPJ, such as a construction work or a rural producer: 12 digits printed as `00.000.00000/00`, the last one a check digit calculated over the 11 base digits with the weights 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4. Accepts the usual mask characters and whitespace between/around groups, a run of them between two groups included. The Receita Federal does not publish this check digit rule, so it follows the reference implementations of [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php) and [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs), cross-checked against the [Cadastro Nacional de Obras (CNO) open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno) of the Receita Federal.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei('24.985.96743/68'); // false (invalid check digit)
isValidCei('000000000000'); // false (repeated digits)
```

### formatCei

Format a CEI (Cadastro Específico do INSS) number according to the usual `00.000.00000/00` mask, the one the reference implementations of the check digit agree on (the Receita Federal does not print it). Formats progressively, as far as the digits given go, so it can also be used as an input mask. `options.pad` (part of `FormatCeiOptions`) left pads the value with zeros up to 12 digits (default `false`).

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

Check if a CNO (Cadastro Nacional de Obras) number is valid. The CNO replaced the CEI for construction works and kept its numbering, so a work registered under a legacy CEI keeps the same number and both registries validate identically: 12 digits printed as `00.000.00000/00` with a check digit calculated over the 11 base digits. The Receita Federal does not publish the check digit rule; it was confirmed against the [Cadastro Nacional de Obras (CNO) open dataset](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno) of the Receita Federal: every work in the Minas Gerais extract of that dataset passes this check. The catalogue page itself publishes only the dataset's description and download links, not that result.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno('110840168063'); // false (invalid check digit)
isValidCno('000000000000'); // false (repeated digits)
```

### formatCno

Format a CNO (Cadastro Nacional de Obras) number. The CNO kept the CEI's numbering, so both share the same 12 digit, `00.000.00000/00` mask, the one the reference implementations of the check digit agree on (the Receita Federal does not print it). Formats progressively, as far as the digits given go, so it can also be used as an input mask. `options.pad` (part of `FormatCnoOptions`) left pads the value with zeros up to 12 digits (default `false`).

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

Check if a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number is valid. The CAEPF replaced the CEI for individuals who hire employees: 14 digits printed as `000.000.000/000-00`, formed by the 9 digit CPF base of the holder, a 3 digit sequence for the holder's several registrations and 2 check digits. Both check digits are the CNPJ's modulus 11 in the formulation of the cited reference: the weights cycle from 9 down to 2 from the right and the check digit is the remainder itself, with a remainder of 10 read as 0 — the same digit the CNPJ's 2-to-9 weights with `11 - remainder` produce. The resulting pair is then shifted by 12, wrapping around 100. A base whose 12 digits are all the same is rejected before the check digits are computed, the way `isValidCei` and `isValidCno` reject a repeated CEI/CNO number, so the otherwise well-formed `00000000000012` is invalid. The Receita Federal does not publish the layout or the check digit rule: both are described by [ghiorzi.org](http://ghiorzi.org/DVnew.htm) and implemented the same way by [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf('29311861000185'); // false (invalid check digits)
isValidCaepf('00000000000000'); // false (repeated base digits)
isValidCaepf('00000000000012'); // false (repeated base digits)
```

### formatCaepf

Format a CAEPF (Cadastro de Atividade Econômica da Pessoa Física) number according to the usual `000.000.000/000-00` mask, the one the sources of the check digit rule agree on (the Receita Federal does not print it). Formats progressively, as far as the digits given go, so it can also be used as an input mask. `options.pad` (part of `FormatCaepfOptions`) left pads the value with zeros up to 14 digits (default `false`).

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

Check if a CBO (Classificação Brasileira de Ocupações) code exists in the MTE occupation table. Accepts the code with or without the hyphen mask, or as a number. A string is only read as a code when it is written in one of those forms (the 6 digits, or the `NNNN-NN` mask, with a single separator between the groups and optional surrounding whitespace), and a number only when it is a non-negative safe integer. A CBO code is always 6 digits and its leading zeros are part of it, so a value written as bare digits is left padded with zeros to 6 whether it comes as a string or as a number, exactly like `getBankByCode` pads a bank code: `10205`, `'10205'` and `'010205'` are the same code. A masked value already carries its separators and is read as written.

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

The occupation titles come from the [official CBO 2002 occupation table published by the MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### parseCbo

Remove CBO (Classificação Brasileira de Ocupações) formatting, keep only digits, and cap the result to 6 digits. A shorter value passes through as far as it goes and nothing is left padded here, so the leading zero of a code such as `010205` has to be written out; use `getCbo` or `isValidCbo`, which do pad a bare numeric code, to look an occupation up.

```javascript
import { parseCbo } from '@brazilian-utils/brazilian-utils';

parseCbo('2124-05'); // '212405'
```

### getCbo

Look a CBO (Classificação Brasileira de Ocupações) code up and get its official occupation title, in the `{ code, description }` record every lookup of this library returns. A value written as bare digits keeps its implied leading zeros, as a string as much as a number: `getCbo(10205)` and `getCbo('10205')` are both read as `010205`. Same input rules as `isValidCbo`: a string has to be written as the 6 digits or with the `NNNN-NN` mask, and a number has to be a non-negative safe integer.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', description: 'Analista de desenvolvimento de sistemas' }
getCbo(10205); // { code: '010205', description: 'Oficial da aeronáutica' } (padded to 6 digits)
getCbo('10205'); // { code: '010205', description: 'Oficial da aeronáutica' } (padded the same way)
getCbo('000000'); // null
getCbo('2124abc05'); // null (not a documented form)
```

The occupation titles come from the [official CBO 2002 occupation table published by the MTE](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv).

### isValidCnae

Check if a CNAE (Classificação Nacional de Atividades Econômicas) subclass code exists in the [CNAE-Subclasses 2.3 table published by IBGE](https://concla.ibge.gov.br/busca-online-cnae.html), the current subclass revision of CNAE 2.0. Accepts the code with or without the `NNNN-N/NN` mask, or as a number. A string is only read as a code when it is written in one of those forms (the 7 digits, or the mask, with a single separator between the groups and optional surrounding whitespace), and a number only when it is a non-negative safe integer. A CNAE subclass code is always 7 digits and its leading zeros are part of it, so a value written as bare digits is left padded with zeros to 7 whether it comes as a string or as a number: `111301`, `'111301'` and `'0111301'` are the same code. A masked value already carries its separators and is read as written.

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

### formatCnae

Format a CNAE (Classificação Nacional de Atividades Econômicas) subclass code. `options.pad` (part of `FormatCnaeOptions`) works exactly like it does in `formatCpf`/`formatCep`: with the default `false` the mask is applied progressively, as far as the value goes, which is what an input being typed into needs; with `true` the value is first left padded with zeros to the 7 digits of a complete subclass code, so it always comes back fully masked. A number is treated exactly like the string of its digits, so it is only padded under `pad: true`. Like every formatter of this package, the value is read for its digits and masked as far as they go: characters outside the mask are dropped and a number is read as the string of its digits, sign and decimal point included. Use `isValidCnae` to check a code.

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

Remove CNAE (Classificação Nacional de Atividades Econômicas) formatting, keep only digits, and cap the result to the 7 digits of a complete subclass code. Nothing is left padded here; use `getCnae` or `isValidCnae`, which do pad a bare numeric code, to look a subclass up.

```javascript
import { parseCnae } from '@brazilian-utils/brazilian-utils';

parseCnae('6201-5/01'); // '6201501'
parseCnae('62'); // '62' (a partial code is kept as written)
```

### getCnae

Look a CNAE (Classificação Nacional de Atividades Econômicas) subclass code up and get its code and official description. `code` comes back as the 7 bare digits, like every other lookup of this library; pass it to `formatCnae` for the `NNNN-N/NN` form. A value written as bare digits keeps its implied leading zeros, as a string as much as a number: `getCnae(111301)` and `getCnae('111301')` are both read as `0111301`. Same input rules as `isValidCnae`: a string has to be written as the 7 digits or with the `NNNN-N/NN` mask, and a number has to be a non-negative safe integer.

```javascript
import { formatCnae, getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201-5/01'); // { code: '6201501', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae(111301); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (padded to 7 digits)
getCnae('111301'); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (padded the same way)
getCnae('0000000'); // null
getCnae('0111abc301'); // null (not a documented form)
formatCnae(getCnae('6201501')?.code); // 6201-5/01 (the mask is the formatter's job)
```

### isValidNcm

Check if an NCM (Nomenclatura Comum do Mercosul) code exists in the current table published by Siscomex/MDIC. Accepts the code with or without the dotted mask, or as a number. A string is only read as a code when it is written in one of those forms (the 8 digits, or the `NNNN.NN.NN` mask, with a single separator between the groups and optional surrounding whitespace), and a number only when it is a non-negative safe integer. An NCM code is always 8 digits and its leading zeros are part of it, so a value written as bare digits is left padded with zeros to 8 whether it comes as a string or as a number: `1012100`, `'1012100'` and `'01012100'` are the same code. A masked value already carries its separators and is read as written.

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

### formatNcm

Format an NCM (Nomenclatura Comum do Mercosul) code. `options.pad` (part of `FormatNcmOptions`) works exactly like it does in `formatCpf`/`formatCep`: with the default `false` the mask is applied progressively, as far as the value goes, which is what an input being typed into needs; with `true` the value is first left padded with zeros to the 8 digits of a complete code, so it always comes back fully masked. A number is treated exactly like the string of its digits, so it is only padded under `pad: true`. Like every formatter of this package, the value is read for its digits and masked as far as they go: characters outside the mask are dropped and a number is read as the string of its digits, sign and decimal point included. Use `isValidNcm` to check a code.

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

Remove NCM (Nomenclatura Comum do Mercosul) formatting, keep only digits, and cap the result to the 8 digits of a complete code. Nothing is left padded here; use `isValidNcm`, which does pad a bare numeric code, to check a code against the official table.

```javascript
import { parseNcm } from '@brazilian-utils/brazilian-utils';

parseNcm('8471.30.12'); // '84713012'
parseNcm('8471'); // '8471' (a partial code is kept as written)
```

### isValidCfop

Check if a CFOP (Código Fiscal de Operações e Prestações) code exists in the official table. The table is the [consolidated Anexo II of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), the text in force (current wording given by Ajuste SINIEF 03/24, last amended by [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25)), not the frozen 2001 text of Ajuste SINIEF 07/01. Only operable codes count: the group and subgroup headings of the official nomenclature, the codes ending in `00` and `50` (1000, 1100, 1150, 5350, ...), are section titles rather than codes a document can carry, so they are rejected.

A string is only read as a code when it is written in one of the documented forms (the 4 digits, or the `N.NNN` form the annex prints, with a single separator between the groups and optional surrounding whitespace), and a number only when it is a non-negative safe integer. No CFOP code starts with a zero, its first digit is the operation group (1 to 7), so nothing is ever padded here: a number and the string of the same digits are read identically.

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

### parseCfop

Remove CFOP (Código Fiscal de Operações e Prestações) formatting, keep only digits, and cap the result to 4 digits. A shorter value passes through as far as it goes. No CFOP code starts with a zero, its first digit is the operation group from 1 to 7, so nothing is ever padded here.

```javascript
import { parseCfop } from '@brazilian-utils/brazilian-utils';

parseCfop('5.102'); // '5102'
```

### getCfop

Look a CFOP (Código Fiscal de Operações e Prestações) code up and get its code and official description, as the [consolidated Anexo II of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24) words it, in the text in force, last amended by [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25). The group and subgroup headings of the official nomenclature, the codes ending in `00` and `50`, are not in the table and give `null`. Same input rules as `isValidCfop`.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('1101'); // { code: '1101', description: 'Compra para industrialização ou produção rural' }
getCfop('7504'); // { code: '7504', description: 'Exportação de mercadoria que foi objeto de formação de lote de exportação' }
getCfop('0000'); // null
getCfop('5350'); // null (a subgroup heading, not an operable code)
getCfop('abc5102'); // null (not a documented form)
```

### isValidCst

Check if a CST (Código de Situação Tributária) code is valid for a given tax. Pass the tax through `options.tax`:

| Tax | Format | Accepted codes |
| --- | --- | --- |
| `icms` | 3 digits (origem + CST) | origem `0`-`8` + one of `00`, `02`, `10`, `15`, `20`, `30`, `40`, `41`, `50`, `51`, `53`, `60`, `61`, `70`, `90` |
| `ipi` | 2 digits | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 digits | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 digits | same table as `pis` |

`options.tax` (part of `IsValidCstOptions`) is optional: omit it to accept a code that exists in any one of the four tables above. A `tax` outside those four values falls back to that same default at runtime, the way every other scalar option of this library treats a value it does not know.

The ICMS Tabela B is the one in force: the [consolidated Anexo I of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), whose current wording came from [Ajuste SINIEF 39/23](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2023/ajuste-sinief-39-23) (effective 01.12.23) and which [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24) amended by striking items 12, 13, 52, 72 and 74 (effects from 09.07.24) before they ever took effect: 39/23 had deferred their effect to 1º de outubro de 2024, so the revocation reached them first and those codes were never in force. `02`, `15`, `53` and `61` are its monofasia de combustíveis codes.

A string is only read as a code when it is written in one of the documented forms (the 2 digits of a Tabela B code, or the 3 digits of the ICMS form with an optional single separator after the origin digit, plus optional surrounding whitespace), and a number only when it is a non-negative safe integer. The origin digit is the only boundary a printed CST has, so `'0 10'` and `'1-10'` are read while `'0-0'`, `'11-0'` and `'00-'` are not.

A single digit is narrower than either documented form, so it is left padded with zeros to the 3 digits of the ICMS form, whether it comes as a string or as a number: `0`, `'0'` and `'000'` are all the ICMS code `000`. A 2 digit value is already a documented form, a Tabela B code, and is read as written, so a Tabela B code keeps its own two digits: `'07'`, not `7`, which is the ICMS code `007`.

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

### isValidCsosn

Check if a CSOSN (Código de Situação da Operação no Simples Nacional) code is one of the 10 codes of the [consolidated Anexo III-A of Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70), the table Ajuste SINIEF 03/2010 instituted: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` or `900`.

A string is only read as a code when it is written as the bare 3 digits with optional surrounding whitespace: a CSOSN has no printed grouping (the NF-e carries the origin digit in its own `orig` field), so `'1-01'` is rejected; a number is read only when it is a non-negative safe integer. No CSOSN code starts with a zero, the table runs from `101` to `900`, so nothing is ever padded here: a number and the string of the same digits are read identically.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (not a documented form)
isValidCsosn(-101); // false (not a non-negative safe integer)
```

## Text

### capitalize

Transforms the first letter into a capital one of each word, the way a Brazilian name, company name or address is written, with no options needed. Words are separated by whitespace, by `-` and `/`, by the apostrophe (`'d'oeste'` becomes `'d'Oeste'`) and by punctuation that touches a word (`'(empresa)'` becomes `'(Empresa)'`, `'bairro:centro'` becomes `'Bairro:Centro'`), so `'MOGI-GUAÇU'` becomes `'Mogi-Guaçu'`; the separators are kept where they are. Every run of whitespace (tabs, newlines, repeated spaces) collapses into a single space, and the leading and trailing whitespace is dropped. The particles of foreign-origin names (`del`, `della`, `di`, `du`, `van`, `von`, `der`, `den`) stay lower case like the Portuguese prepositions, and so does the elided `d'`, wherever it appears, whenever an apostrophe and a word follow it (`'dias d'ávila'` becomes `'Dias d'Ávila'`); a single letter written right after an apostrophe is the English possessive and stays lower case too (`"bob's"` becomes `"Bob's"`).

`options.lowerCaseWords` defaults to the Portuguese prepositions, articles and conjunctions that stay in lower case inside a proper name (`de`, `da`, `do`, `e`, ...), and they are only written in lower case when they link two words: one of them that is the first word, that ends the value, or that is followed by punctuation is a designator instead and keeps its capital (`'rua a, 100'` becomes `'Rua A, 100'` and `'condomínio a, quadra d, lote o'` becomes `'Condomínio A, Quadra D, Lote O'`). `options.upperCaseWords` defaults to the company designations and document abbreviations written in upper case in Brazilian usage (`LTDA`, `S.A.`, `S/A`, `S.S.`, `S/S`, `ME`, `EPP`, `MEI`, `EIRELI`, `CIA`, `SCP`, `CNPJ`, `CPF`, `RG`, `CEP`, `UF`) plus the roman numerals that appear in names and addresses (`II` through `XXIII`, except `VI`, which collides with the pt-BR verb form "vi"). `SA` without punctuation is deliberately absent, since it is indistinguishable from the surname "Sá" typed without its accent, while `ME` is also the pronoun "me", so it is only written in upper case in the designation position, as the last word of the value (`'fulano comércio me'` becomes `'Fulano Comércio ME'`) or right before another designation (`'fulano me epp'` becomes `'Fulano ME EPP'`); anywhere else it is an ordinary word (`'diga-me a verdade'` becomes `'Diga-Me a Verdade'`, `'não-me-toque'` becomes `'Não-Me-Toque'`). `S/A` and `S/S` are matched across the slash even though a slash separates words. A two letter word that follows a `/` is upper-cased when it is the code of a Brazilian state (`'porto alegre/rs'` becomes `'Porto Alegre/RS'`); that rule is structural and stays on even when `upperCaseWords` is given, while a state code that does not follow a `/` is left alone.

Either list given in `options` replaces its default entirely, and the comparison against both is case-insensitive (pt-BR locale). Options are typed as `CapitalizeOptions`. Every other word is capitalized letter by letter: `'İSTANBUL'` becomes `'İstanbul'`, and a first letter whose upper case is two letters (`ß`, the `ﬁ` ligature) keeps its case, so `'straße'` becomes `'Straße'` and `'ßa'` stays `'ßa'`.

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

### removeAccents

Remove diacritical marks (accents, tildes, cedillas) from a string, decomposing every accented character into its base letter plus combining marks (Unicode NFD) and dropping the combining marks.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```

## isValidIe

Check if inscrição estadual (state registration) is valid. The state code is case-insensitive. Notable per-state rules: GO accepts prefixes `10`, `11` and `15`; PA accepts `15` and `75`-`79`; MS accepts `28` and `50`; SP has a produtor rural pattern `P0MMMSSSSD000`; TO uses 11-digit type codes (`01`, `02`, `03`, `99`). TO also accepts a 9-digit form, applying the same modulus 11 rule to the first eight digits; the SINTEGRA page documents only the 11-digit one, so that shape is 2.3.0 behaviour kept for compatibility rather than a published rule. An all-zero registration is accepted wherever the published formula yields a check digit of 0 for it (AM, BA with 8 or 9 digits, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS, SC, SE, SP and TO with 9 digits), unlike `isValidCpf` and `isValidCnpj`, which reject repeated digits. AM is on that list through the second branch of its published formula only: the page's first branch, `Se Soma < 11 Então Dígito = 11 - Soma`, gives 11 for an all-zero registration, while the `resto <= 1 ⇒ 0` branch, the one implemented here, gives 0. The registration and the state code go together in a single object, typed as `IsValidIeParams`; the 2.3.0 form, `isValidIe(stateCode, ie)`, still works and is deprecated.

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe({ value: '0187634580933', stateCode: 'AC' }); // false
isValidIe({ value: '109161793', stateCode: 'go' }); // true (case-insensitive)
```

## isValidEmail

Check if email is valid. The accepted set is a practical subset of the WHATWG HTML [valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) definition, not of [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322). The local part is limited to letters, digits and `_'+-.`, and may not start with a dot, end with a dot or an apostrophe, or contain two dots in a row. The domain must carry at least one dot, and each dotted label follows the WHATWG production `[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?`, so a label may neither start nor end with a hyphen nor exceed 63 characters; the final label is alphabetic and 2 to 63 letters long, so `user@example.c1` is rejected. Quoted local parts (`"john doe"@example.com`) and address literals (`john@[127.0.0.1]`) are rejected.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
```

## isValidCreditCard

Check if a payment card number is valid using the Luhn algorithm ([ISO/IEC 7812-1](https://www.iso.org/standard/70484.html)). Accepts the usual mask characters (whitespace, `.`, `-` and `/`, the interchangeable set `isValidCpf` and `isValidCnpj` accept) between any two digits and whitespace around the value; any other character makes the value invalid. They are accepted between any two digits rather than at fixed positions because the printed grouping of a PAN changes with the brand (4-4-4-4 for Visa and Mastercard, 4-6-5 for American Express, 4-6-4 for Diners Club), so there is no single layout to pin them to. Performs no brand detection (Visa, Mastercard, Amex...), issuer range lookup or expiration/CVV checks, only the digit count (12 to 19) and the Luhn check digit. A `number` is only accepted when it is a non-negative safe integer: anything above `Number.MAX_SAFE_INTEGER` (2^53 - 1, 16 digits) has already been rounded to a different number before the function sees it, so pass a longer PAN as a string. A value whose digits are all the same (`'0000000000000000'`) is rejected even when it passes the Luhn check, the way every other validator of this package rejects a repeated-digit document (`isValidCpf('00000000000')`, `isValidCns`, `isValidCaepf`, `isValidCei`).

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (Visa test number)
isValidCreditCard('5555555555554444'); // true (Mastercard test number)
isValidCreditCard('378282246310005'); // true (American Express test number)
isValidCreditCard('4111 1111 1111 1111'); // true (spaced mask)
isValidCreditCard('4111.1111/1111-1111'); // true (any of the mask characters)
isValidCreditCard('4111111111111112'); // false (bad check digit)
isValidCreditCard('0000000000000000'); // false (every digit the same, though the Luhn check passes)
isValidCreditCard('4111a1111b1111c1111'); // false (letters between the digits)
isValidCreditCard(4111111111111111111); // false (above 2^53 - 1, pass it as a string)
```

## isValidRegistroProfissional

Check the structure of a professional council registration number (registro/inscrição profissional). It takes a single object, typed as `IsValidRegistroProfissionalParams`, the shape `isValidBankAccount` takes: `value` is the registration number, `council` picks the issuing council (`"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` or `"CRC"`) and the optional `stateCode` checks the embedded UF (ignored for `"CRP"`, whose 2 digit prefix is a regional code, not a literal UF). Anything that is not an object, and an object missing `value` or `council`, is `false`. The accepted shapes are 4 to 6 digits plus the UF for `"OAB"` and `"CRM"`, 3 to 6 digits plus the UF for `"CRO"`, a 2 digit regional code plus 4 to 6 digits for `"CRP"`, and the UF plus 6 digits, the tipo de registro and one check digit for `"CRC"`. This is a structural check only: digit counts and the UF are validated, but no check digit is computed, even for CRC, whose format includes one. A CRC registration is the UF, 6 digits, the tipo de registro (`"O"` Originário or `"P"` Provisório, which says nothing about the professional category) and the check digit, as published in the [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf) (item 1.1). A Registro Transferido or Secundário appends `"T"` or `"S"` and the UF of the destination CRC **after** the check digit, per that same item and [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), art. 5º parágrafo único: the Manual's own examples are `SP-123456/O-3 T-MG`, `TO-654321/P-8 T-SC` and `PI-111222/O-5 S-AC`. Both UFs must be real state codes, and `stateCode` is compared against the originating one. A CRP regional code has to be one of the [24 Conselhos Regionais](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/) of the CFP system, CRP-01 to CRP-24. Only the CRC shape and those CRP regional codes rest on a published source: the CFP page publishes no length for the inscription number itself, and the OAB, the CFM and the CFO publish no format at all, so the digit ranges accepted for `"CRP"`, `"OAB"`, `"CRM"` and `"CRO"` are conventional rather than normative (the OAB/SP public search field is `maxlength="7"`, and the CFM documents `300`-prefixed and `P`-suffixed CRMs, none of which these shapes express). CREA is not supported: its registration format could not be confirmed from an official, publicly documented source after the 2016 national unification (RNP).

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional({ value: '123456/SP', council: 'OAB' }); // true
isValidRegistroProfissional({ value: '123456-RJ', council: 'OAB', stateCode: 'SP' }); // false (UF mismatch)
isValidRegistroProfissional({ value: '06/12345', council: 'CRP' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3', council: 'CRC' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3 T-MG', council: 'CRC' }); // true (registro transferido)
isValidRegistroProfissional({ value: 'SP-123456/T-3', council: 'CRC' }); // false ("T" is not a tipo de registro)
```

## isValidVin

Check if a VIN (Vehicle Identification Number / chassi) is valid. Checks the length (17 characters), the excluded letters (`I`, `O`, `Q` are never valid; [ISO 3779:2009](https://www.iso.org/standard/52200.html) structure) and the check digit at the 9th position, with the check digit and transliteration computed per [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15). That check digit is a North-American requirement (49 CFR 565.15 / SAE J853): [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf) (which revoked Resolução CONTRAN nº 24/1998 from 1 January 2025) and ABNT NBR 6066 define the Brazilian VIN structure but do not mandate it, so many Brazilian-built VINs do not carry a matching check digit. This function is therefore a North-American-style structural check, not a universal validator of Brazilian VINs. Case-insensitive and trims surrounding whitespace. A VIN is printed as one unbroken run of 17 characters, so, unlike the documents this package masks (`isValidCpf`, `isValidCnpj`, `isValidNfeKey`), it has no group boundary to write a separator at and none is accepted: a space, `.`, `-` or `/` among the characters is rejected instead of being stripped. A value whose 17 characters are all the same (`'00000000000000000'`) is rejected even when it carries a matching check digit, the way every other validator of this package rejects a repeated-digit document.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('1HGCM82633A004352'); // true
isValidVin('1m8gdm9axkp042788'); // true (check digit X, lowercase)
isValidVin('1HGCM82633A004353'); // false (bad check digit)
isValidVin('00000000000000000'); // false (every character the same, though the check digit matches)
isValidVin('1HGCM8263IA004352'); // false (contains the excluded letter I)
```
