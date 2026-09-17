# Migration Guide: v1 to v2

This guide will help you migrate from Brazilian Utils v1.x to v2.0.0.

## TL;DR - Quick Migration

**Good news!** v2.x maintains backward compatibility for most breaking changes:

✅ **You can upgrade to v2.x without changing your code** - old function names like `formatCPF`, `isValidCNPJ`, etc. still work
⚠️ **You'll receive deprecation warnings** - encouraging you to migrate to the new names
🗑️ **Old names will be removed in v3.0.0** - so migrate gradually

**However**, you must remove usage of these helper functions before upgrading:
- `onlyNumbers` → use `string.replace(/\D/g, '')`
- `isLastChar` → use `index === input.length - 1`
- `generateChecksum` → now internal only
- `generateRandomNumber` → now internal only

## Improvements in v2.0.0

Version 2.0.0 brings significant improvements in architecture, tooling, and developer experience:

### 🎯 Better Tree Shaking

The library now uses modern ES module exports with proper `exports` field in `package.json`, enabling better tree shaking in modern bundlers. You can import only what you need:

```javascript
// Only the functions you import will be included in your bundle
import { isValidCpf, formatCpf } from '@brazilian-utils/brazilian-utils';
```

### 📁 Simpler Structure

The codebase has been reorganized for better maintainability:
- **v1**: Complex structure with separate `utilities/` and `helpers/` directories
- **v2**: Flat structure with internal utilities in `_internals/` directory
- Each utility is self-contained in its own directory
- Cleaner import paths and better code organization

### 🔧 Modern Tooling

Updated to modern, faster tooling:
- **Build**: Migrated from `tsdx` to a **Vite+** toolchain for faster builds and scripts
- **Testing**: Migrated from `jest` to **Vitest** (faster, Jest-compatible, ESM-native)
- **Linting/Formatting**: Migrated from `prettier` + `eslint` to the Vite+ toolchain (`vp fmt` and `vp check`, backed by Oxc)
- **TypeScript**: Modern configuration optimized for bundlers

### 🌐 Browser Testing

Now includes cross-browser testing support:
- Tests run in real browsers (Chrome, Firefox, Safari, Edge)
- Ensures compatibility across different browser environments
- Better confidence in cross-platform functionality

Run browser tests with:
```bash
npm run test:chrome-browser
npm run test:firefox-browser
npm run test:safari-browser
npm run test:edge-browser
```

### 📦 Fewer Dependencies

Reduced development dependencies while maintaining zero runtime dependencies:
- **v1**: Multiple tools (tsdx, jest, prettier, eslint, husky, lint-staged, etc.)
- **v2**: One toolchain (Vite+ for build, lint, format and tests, with Vitest browser support through webdriverio) plus the quality gates listed in CONTRIBUTING.md (Stryker, knip, jscpd, API Extractor, commitlint)
- Simpler maintenance and faster CI/CD pipelines
- Zero runtime dependencies (maintained)

### ✨ New Functions & Features

Added new useful utilities:
- `getHolidays` - Get Brazilian holidays (national and state-specific)
- `getBoletoInfo` - Extract information from boleto (amount, expiration, bank code)
- `formatPhone` - Format phone numbers with Brazilian patterns
- `formatBoleto` - Format boleto numbers
- `generateBoleto` - Generate valid random boleto numbers
- `formatPis` - Format PIS numbers
- `isValidRenavam` - Validate RENAVAM (vehicle registration number)
- `isValidBankAccount` - Validate Brazilian bank accounts with specific algorithms for major banks

#### Alphanumeric CNPJ Support (Version 2)

v2.0.0 adds support for the new alphanumeric CNPJ format introduced by the Brazilian Federal Revenue. Both `isValidCnpj` and `generateCnpj` now support version 2 (alphanumeric) CNPJs:

```javascript
import { isValidCnpj, generateCnpj } from '@brazilian-utils/brazilian-utils';

// Generate alphanumeric CNPJ
const alphaCnpj = generateCnpj(2); // e.g., "Q0SLFMBD7VX439"

// Validate alphanumeric CNPJ (requires version option)
isValidCnpj("Q0.SLF.MBD/7VX4-39", { version: 2 }); // true
isValidCnpj("Q0SLFMBD7VX439", { version: 2 }); // true

// Version 1 (numeric) is the default
isValidCnpj("12.345.678/0001-95"); // true (validates numeric only)
isValidCnpj("12.345.678/0001-95", { version: 1 }); // true (explicit)
```

**Important**: By default, `isValidCnpj()` validates only numeric (version 1) CNPJs. To validate alphanumeric CNPJs, you must explicitly pass `{ version: 2 }`.

### 📈 Better TypeScript Support

- Modern TypeScript configuration optimized for bundlers
- Better type inference and exports
- Improved developer experience with better autocomplete

## Breaking Changes

### Function Names Changed (PascalCase → camelCase)

All function names have been changed from PascalCase to camelCase to follow JavaScript naming conventions.

**⚠️ Important: Backward Compatibility**

To make the migration easier, **v2.x still exports the old PascalCase names as deprecated aliases**. This means:

- ✅ Your existing code using `formatCPF`, `isValidCNPJ`, etc. will continue to work in v2.x
- ⚠️ You'll receive deprecation warnings in your IDE/TypeScript
- 🗑️ The old names will be **removed in v3.0.0**

**Recommendation:** While you can upgrade to v2.x without changing your code immediately, we recommend migrating to the new camelCase names as soon as possible to prepare for v3.0.0.

#### Validation Functions

| v1 | v2 |
|---|---|
| `isValidCPF` | `isValidCpf` |
| `isValidCNPJ` | `isValidCnpj` |
| `isValidCEP` | `isValidCep` |
| `isValidPIS` | `isValidPis` |
| `isValidIE` | `isValidIe` |
| `isValidProcessoJuridico` | `isValidProcessoJuridico` (unchanged) |
| `isValidBoleto` | `isValidBoleto` (unchanged) |
| `isValidEmail` | `isValidEmail` (unchanged) |
| `isValidPhone` | `isValidPhone` (unchanged) |
| `isValidMobilePhone` | `isValidMobilePhone` (unchanged) |
| `isValidLandlinePhone` | `isValidLandlinePhone` (unchanged) |
| `isValidLicensePlate` | `isValidLicensePlate` (unchanged) |
| `isValidRenavam` | `isValidRenavam` (new) |

#### Format Functions

| v1 | v2 |
|---|---|
| `formatCPF` | `formatCpf` |
| `formatCNPJ` | `formatCnpj` |
| `formatCEP` | `formatCep` |
| `formatProcessoJuridico` | `formatProcessoJuridico` (unchanged) |
| `formatBoleto` | `formatBoleto` (unchanged) |
| `formatCurrency` | `formatCurrency` (unchanged) |
| `formatPhone` | `formatPhone` (new) |

#### Generation Functions

| v1 | v2 |
|---|---|
| `generateCPF` | `generateCpf` |
| `generateCNPJ` | `generateCnpj` |
| `generateBoleto` | `generateBoleto` (unchanged) |

**⚠️ Note on `generateCnpj` behavior:**

In v2.x, `generateCnpj()` without arguments defaults to version 1 (numeric CNPJ). In v3.0.0, this behavior will change to randomly select between version 1 (numeric) and version 2 (alphanumeric) CNPJs for better randomness. If you need a specific version, always pass the version parameter explicitly:

```javascript
// Recommended: Always specify the version
generateCnpj(1); // Always generates numeric CNPJ
generateCnpj(2); // Always generates alphanumeric CNPJ

// Not recommended: Relying on default behavior
generateCnpj(); // Currently generates numeric (v1), but will be random in v3.0.0
```

#### Other Functions

| v1 | v2 |
|---|---|
| `parseCurrency` | `parseCurrency` (unchanged) |
| `capitalize` | `capitalize` (unchanged) |
| `getStates` | `getStates` (unchanged) |
| `getCities` | `getCities` (unchanged; deprecated in 2.4.0 in favour of `getMunicipalities`) |
| `getAddressInfoByCep` | `getAddressInfoByCep` (API changed, see below) |

### Migration Example

**Before (v1):**
```javascript
import { isValidCPF, formatCPF, generateCNPJ } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCPF('12345678909');
const formatted = formatCPF('12345678909');
const cnpj = generateCNPJ();
```

**After (v2):**
```javascript
import { isValidCpf, formatCpf, generateCnpj } from '@brazilian-utils/brazilian-utils';

const isValid = isValidCpf('12345678909');
const formatted = formatCpf('12345678909');
const cnpj = generateCnpj();
```

### Removed Helper Functions

The following helper functions are no longer exported in the public API. These were internal utilities that should not have been exposed.

**⚠️ Note:** Unlike the renamed functions above, these helpers do **NOT** have backward compatibility aliases. You must migrate away from them before upgrading to v2.x.

#### `onlyNumbers`
This function has been removed from the public API. It's now an internal utility called `sanitizeToDigits`.

**Migration:**
```javascript
// v1 - Don't use this anymore
import { onlyNumbers } from '@brazilian-utils/brazilian-utils';
const digits = onlyNumbers('123-456');

// v2 - Use a simple replacement
const digits = '123-456'.replace(/\D/g, '');
```

#### `isLastChar`
This function has been removed. Use a simple inline comparison instead.

**Migration:**
```javascript
// v1 - Don't use this anymore
import { isLastChar } from '@brazilian-utils/brazilian-utils';
if (isLastChar(index, input)) { /* ... */ }

// v2 - Use inline comparison
if (index === input.length - 1) { /* ... */ }
```

#### `generateChecksum`
This function is now internal and no longer exported in the public API. The package exports no internals: `dist/_internals` is not published and there is no subpath for it, so there is no supported way to import this function in v2. Inline the check digit calculation you need instead.

**Migration:**
```javascript
// v1 - Don't use this anymore
import { generateChecksum } from '@brazilian-utils/brazilian-utils';
```

#### `generateRandomNumber`
This function is now internal and no longer exported in the public API.

**Migration:**
```javascript
// v1 - Don't use this anymore
import { generateRandomNumber } from '@brazilian-utils/brazilian-utils';

// v2 - Use your own implementation
function generateRandomNumber(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}
```

## New Functions

The following functions are new in v2.0.0:

### `getHolidays`

Get Brazilian holidays for a given year. Supports national and state-specific holidays.

```javascript
import { getHolidays } from '@brazilian-utils/brazilian-utils';

// Get all national holidays
const holidays = getHolidays(2024);

// Get holidays for a specific state
const spHolidays = getHolidays({ year: 2024, stateCode: 'SP' });
```

### `getBoletoInfo`

Extract information from a boleto (amount, expiration date, bank code).

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

const info = getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }
```

### `formatPhone`

Format phone numbers according to Brazilian patterns.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('11900000000'); // 11900-0000 (BEWARE: default "sn" truncates a DDD-prefixed number)
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // (11) 90000-0000
```

### `isValidRenavam`

Validate RENAVAM (Registro Nacional de Veículos Automotores). Supports both old format (9 digits) and new format (11 digits).

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 digits, old format)
isValidRenavam('00639884962'); // true (11 digits, new format)
isValidRenavam('12345678901'); // false (invalid checksum)
```

### `isValidBankAccount`

Validate Brazilian bank accounts. Supports specific validation algorithms for major banks (Banco do Brasil, Itaú, Bradesco, Santander, Caixa Econômica Federal) and generic mod10/mod11 validation for other banks.

```javascript
import { isValidBankAccount } from '@brazilian-utils/brazilian-utils';

// Banco do Brasil
isValidBankAccount({
  bankCode: '001',
  agency: '1584',
  account: '00210169',
  digit: '6'
}); // true

// Itaú
isValidBankAccount({
  bankCode: '341',
  agency: '2545',
  account: '02366',
  digit: '1'
}); // true

// Other banks use generic validation
isValidBankAccount({
  bankCode: '246',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // true (the digit matches mod10)
```

## API Changes

### `getAddressInfoByCep`

The `getAddressInfoByCep` function now supports additional options and improved error handling.

**Before (v1):**
```javascript
const address = await getAddressInfoByCep('01310100');
```

**After (v2):**
```javascript
// Still works the same way
const address = await getAddressInfoByCep('01310100');

// But now supports options
const address = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Also accepts numbers (will be padded automatically)
const address = await getAddressInfoByCep(1310100);
```

The function now exports error classes for better error handling:

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
    // Handle validation error
  } else if (error instanceof GetAddressInfoByCepNotFoundError) {
    // Handle not found error
  } else if (error instanceof GetAddressInfoByCepServiceError) {
    // Handle service error
  }
}
```

### `getCities`

The `getCities` function now returns sorted results alphabetically.

**Before (v1):**
```javascript
getCities(); // Returned unsorted array
getCities('SP'); // Returned unsorted array
```

**After (v2):**
```javascript
getCities(); // Returns sorted alphabetically
getCities('SP'); // Returns sorted alphabetically
```

## Migration Checklist

### Required (before upgrading to v2.x)
- [ ] Remove usage of helper functions (`onlyNumbers`, `isLastChar`, `generateChecksum`, `generateRandomNumber`)

### Optional (recommended before v3.0.0)
- [ ] Update all imports to use camelCase function names
- [ ] Replace all function calls with camelCase names

### Review if applicable
- [ ] Update error handling for `getAddressInfoByCep` if needed
- [ ] Review usage of `getCities` if sorting was important
- [ ] Test all validation and formatting functions
- [ ] Update any TypeScript type imports if applicable

## Getting Help

If you encounter any issues during migration, please:

1. Check the [utilities documentation](utilities.md) for the correct function signatures
2. Review the examples in this migration guide
3. Open an issue on the [GitHub repository](https://github.com/brazilian-utils/javascript) if you find a bug
