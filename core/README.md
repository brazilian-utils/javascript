# Brazilian Utils core

The single-source core of Brazilian Utils: each utility is written **once**, in the engine's
restricted subset, and generated for TypeScript, Python and Go.

```sh
npm run check        # types, ranges, refinements, effects
npm run build        # generate every target, in both idiom modes
npm run conformance  # interpreter vs the npm package vs every target
npm run verify       # all of it, plus linters and a determinism check
```

## Layout

```
source/
  is-valid-cpf.ts             one utility per file: one export, at the root
  is-valid-cnpj.ts
  format-cnpj.ts
  get-holidays.ts
  is-business-day.ts
  get-address-info-by-cep.ts
  format-currency.ts
  lib/                        library code: check digits, masks, JSON, Easter
conformance/
  cases.ts                    vectors, seeded inputs and the scripted Http
  run.ts                      the differential runner
docs/
  contracts.md                what the published package does, measured
  survey.md                   every utility of the package, by feature
out/                          generated, and committed so it can be read in review
```

## What the core owes, and what the DX owes

The core takes already-normalized values and returns semantic ones. Coercion stays in the
handwritten DX of each language: reading a number as a string, defaulting an options object,
turning a host `Date` into a civil date. [`docs/contracts.md`](docs/contracts.md) records that
split for every pilot, with the behavior measured from `../src` rather than assumed.

## Status

Seven utilities, generated for three languages, verified against the published package on every
case that can be reproduced offline. [`docs/survey.md`](docs/survey.md) counts what the rest of
the package would need.
