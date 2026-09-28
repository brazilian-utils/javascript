---
title: "Migration Guide: v1 to v2"
description: "How to move a project from Brazilian Utils v1.x to v2: the renamed exports, the deprecated aliases that still work and a checklist to follow."
keywords: ["migration", "v1", "v2", "deprecated", "renamed exports", "upgrade"]
---

This guide covers moving a project from Brazilian Utils v1.x to v2.

## Summary

v2 renames every function to camelCase (`formatCPF` is now `formatCpf`) but keeps the v1 names as deprecated aliases, so most projects upgrade without changing code. TypeScript and your editor flag the old names. The aliases are removed in v3.0.0.

Four v1 helpers were internal and have no alias. Replace them before upgrading:

| v1 | Replacement |
|---|---|
| `onlyNumbers(value)` | `value.replace(/\D/g, '')` |
| `isLastChar(index, input)` | `index === input.length - 1` |
| `generateChecksum` | Not exported anymore. Inline the check-digit calculation you need. |
| `generateRandomNumber(length)` | Your own loop over `Math.floor(Math.random() * 10)`. |

## What changed

- **Names are camelCase.** See [Renamed functions](#renamed-functions).
- **Tree-shaking works down to the function**, and every util is also its own subpath (`@brazilian-utils/brazilian-utils/is-valid-cpf`), so the heavy ones can be lazy-loaded. See [Bundle size](getting-started.md#bundle-size).
- **Alphanumeric CNPJ.** `isValidCnpj` and `generateCnpj` accept the new alphanumeric format with `{ version: 2 }`. Numeric (version 1) stays the default. See [`generateCnpj` and the version](#generatecnpj-and-the-version).
- **`getAddressInfoByCep`** accepts a `providers` option, pads a numeric CEP, and throws typed errors: `GetAddressInfoByCepValidationError`, `GetAddressInfoByCepNotFoundError` and `GetAddressInfoByCepServiceError`. Calls without options work as in v1.
- **`getCities`** returns the list sorted alphabetically. Since 2.4.0 it is deprecated: `getMunicipalities('SP')` returns the same municipalities with their IBGE codes, and `getMunicipalityByCode('3550308')` looks one up offline.
- **`isValidIe`** takes one object since 2.4.0, `isValidIe({ value, stateCode })`. The positional form is deprecated.
- **Many new utilities** since v2: holidays and business days, Pix, NF-e keys, boleto parsing, phone formatting, bank accounts and lookups, classification codes (CBO, CNAE, NCM, CFOP), municipalities offline, numbers in words and more. They are all in the [utilities reference](utilities.md).
- **Tooling** moved to Vite+ and Vitest, with browser tests in CI. This only matters if you contribute; see [CONTRIBUTING.md](https://github.com/brazilian-utils/javascript/blob/main/CONTRIBUTING.md).

## Renamed functions

Every other export keeps its v1 name.

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

Before (v1):

```javascript
import { isValidCPF, formatCPF, generateCNPJ } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCPF('12345678909');
const formatted = formatCPF('12345678909');
const cnpj = generateCNPJ();
```

After (v2):

```javascript
import { isValidCpf, formatCpf, generateCnpj } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCpf('12345678909');
const formatted = formatCpf('12345678909');
const cnpj = generateCnpj();
```

### `generateCnpj` and the version

`generateCnpj()` without arguments generates a numeric CNPJ in v2.x. In v3.0.0 it will pick numeric or alphanumeric at random, so pass the version when you need a specific one:

```javascript
generateCnpj(1); // always numeric
generateCnpj(2); // always alphanumeric, e.g. "Q0SLFMBD7VX439"
generateCnpj(); // numeric today, random in v3.0.0
```

`isValidCnpj` validates numeric CNPJs by default. To validate alphanumeric ones, pass `{ version: 2 }`:

```javascript
isValidCnpj('12.345.678/0001-95'); // true
isValidCnpj('Q0.SLF.MBD/7VX4-39', { version: 2 }); // true
isValidCnpj('Q0.SLF.MBD/7VX4-39'); // false (numeric only without the option)
```

### `getAddressInfoByCep` errors

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
    // invalid CEP
  } else if (error instanceof GetAddressInfoByCepNotFoundError) {
    // no address for this CEP
  } else if (error instanceof GetAddressInfoByCepServiceError) {
    // the providers failed
  }
}
```

## Checklist

Required before upgrading:

- [ ] Replace `onlyNumbers`, `isLastChar`, `generateChecksum` and `generateRandomNumber`.

Recommended before v3.0.0:

- [ ] Rename the imports and calls in the table above to camelCase.
- [ ] Replace `getCities` with `getMunicipalities` and `getMunicipality` with `getMunicipalityByCode`.
- [ ] Call `isValidIe({ value, stateCode })` instead of `isValidIe(stateCode, ie)`.
- [ ] Import the `*Params` type names instead of the `*Options` aliases of the single-object-argument functions.
- [ ] Drop `'widenet'` from the `providers` of `getAddressInfoByCep` (the service is gone).
- [ ] Pass the version to `generateCnpj` when you need a specific one.

Found a bug during the migration? [Open an issue](https://github.com/brazilian-utils/javascript/issues).
