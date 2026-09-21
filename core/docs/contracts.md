# Contracts

What the published package actually does, measured rather than assumed, split into what the
**core** owes and what the **DX** owes. The core is generated; the DX stays handwritten in each
language's repository.

Every fact here was measured against the sources in `../src` on Node 22 with ICU 78.2, and is
pinned by a case in `conformance/cases.ts`.

---

## `isValidCpf`

**Core.** The value is trimmed and matched against
`^[0-9]{3}M*[0-9]{3}M*[0-9]{3}M*[0-9]{2}$`, where `M` is the mask class. The digits are then
extracted from the *untrimmed* value, which is equivalent because the mask class contains no
digits. A value whose digits are all the same is rejected. The two check digits follow the Receita
Federal rule (weights 10…2 and 11…2, remainder below 2 meaning 0).

**Measured details.**

- The package's `\s` inside the mask class is JavaScript's `\s`: the 25 code points listed in
  `docs/semantics.md`. The core spells them out, because `\s` means a different set in Python and
  in Go.
- Mask characters are allowed *between* groups and any number of them, so `"123  456  789  09"`
  is valid and `"123.456.789.09"` is valid too.
- A value with 12 digits fails the format check; a value with 10 fails it as well.

**DX.** A non-string returns `false` without reaching the core.

---

## `isValidCnpj`

**Core.** `isValidCnpj(value: string, version: "1" | "2")`.

- Under `"2"`, the alphanumeric path runs only when the sanitized value contains an upper-cased
  ASCII letter; otherwise the numeric path runs. The alphanumeric path upper-cases the trimmed
  value before the format check and does **not** apply the repeated-character rule, because the
  Receita Federal manual defines no reserved values for the alphanumeric format.
- Both paths share one check digit calculation: each character contributes its code point minus
  48, which is the digit itself for `0`–`9` and the value the manual assigns to `A`–`Z` (17 to
  42).

**Measured details.**

- The numeric path rejects a repeated value (`"00000000000000"`), the alphanumeric path does not.
- The sanitizers read the original value, not the trimmed one.

**DX.** `options.version` is mapped onto `"1"` or `"2"`: the published package reads *any* value
other than `2` as the numeric format, and the DX reproduces that.

**Documented divergence.** The package upper-cases with `String#toUpperCase`, which maps some
non-ASCII scalars into ASCII (U+0131 "ı" becomes "I"). The core's case mapping is ASCII-only, so
such a value is rejected where the package would accept it. Full Unicode case mapping is out of
scope (`docs/semantics.md`, "Strings").

---

## `formatCnpj`

**Core.** `formatCnpj(value: string, options: { pad, version, obfuscate })`, with the pattern
`00.000.000/0000-00` or, when obfuscating, `**.000.000/0000-**`.

The pattern is read scalar by scalar: `0` copies one input scalar, `*` hides one, anything else is
a separator emitted only while the value still has scalars left. With `pad`, the value is left
padded with zeros to the number of slots the pattern has — which is why `formatCnpj("4", { pad:
true })` is `"00.000.000/0000-04"` and `formatCnpj("")` is `""`.

**DX.** A number is converted with `String(value)`; a missing options object becomes
`{ pad: false, version: "1", obfuscate: false }`; `obfuscate` is read for truthiness, so `1`
obfuscates.

---

## `getHolidays` and `isBusinessDay`

**Core.** `getHolidays(year)` answers the national holidays of a year sorted by date, with a
**stable** sort, so two holidays on the same day keep the order they were built in — which is
observable in 2000, where Tiradentes and Sexta-feira Santa both fall on 21 April and Tiradentes
comes first.

The build order is the one the package uses: the eight fixed holidays in statutory order, then Dia
da Consciência Negra from 2024 (Lei 14.759/2023), then Carnaval (Easter − 47), Sexta-feira Santa
(Easter − 2), Páscoa (Easter) and Corpus Christi (Easter + 60). Easter is Meeus/Jones/Butcher.

`isBusinessDay(date, includeOptional)` answers `false` on a weekend, on any listed holiday, and
outside 1900–2099.

**DX.** The host `Date` is interpreted as a **local** calendar day — the package reads
`getFullYear`, `getMonth` and `getDate` — and the DX converts that day into a `CivilDate`. The
core never sees a zone. `includeOptional` defaults to `true`.

**Not in the pilot.** State holidays, the Santa Catarina next-Sunday rule, and the `stateCode`
handling (including the non-string rejection) stay with the package for now.

---

## `getAddressInfoByCep`

**Core.** The value must be exactly eight digits, or the core raises
`GetAddressInfoByCepValidationError`. ViaCEP and BrasilAPI are then queried concurrently, each GET
retried twice more at 250 ms, and the first service that answers wins. A service answers when its
payload carries a non-empty `cep` field. When neither does, the core raises
`GetAddressInfoByCepNotFoundError`.

**Measured details.**

- Provider URLs: `https://viacep.com.br/ws/<cep>/json/` and
  `https://brasilapi.com.br/api/cep/v1/<cep>`; the package's default provider list is
  `["viacep", "brasilapi"]`, in that order.
- The retry policy is the package's `fetchWithRetry` default: 2 retries, 250 ms apart.
- The returned `cep` has its mask removed, which matters for ViaCEP (`"01310-100"`).

**DX.** Sanitizing the input to digits, left padding a number to eight, and the third provider
(WideNet) stay in the DX for now. The published package performs real requests, so conformance
drives the core with scripted responses instead (`conformance/cases.ts`), and the reference
interpreter and all three targets are compared against each other on them.

---

## `formatCurrency`

**Core.** `formatCurrency(value: Decimal<2>, symbol: boolean)` formats an exact amount: `.` between
thousands, `,` before the centavos, and with `symbol` the prefix `R$` followed by **an ordinary
space**.

**Measured details.**

- `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` emits U+00A0 after `R$`,
  and the package replaces it with U+0020 before returning. The core produces the ordinary space,
  matching the package rather than CLDR.
- A negative amount puts the sign before the symbol: `-R$ 10,50`.
- Rounding belongs to the DX, and it is **not** `toFixed`. `Intl` rounds the shortest round-trip
  decimal representation of the double, half away from zero, so `1.005` formats as `"1,01"` while
  `(1.005).toFixed(2)` is `"1.00"`, and `2.675` formats as `"2,68"` while `toFixed` gives
  `"2.67"`. `conformance/cases.ts` implements exactly that rule in `toScaled`.

**Not in the pilot.** The `precision` option (0 to 20), string inputs read by `parseCurrency`'s
rule, and the empty string answered for a non-finite value. The first needs a run-time scale,
which `Decimal<S>` deliberately does not have; the other two are DX coercion.
