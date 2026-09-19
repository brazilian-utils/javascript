---
title: "Using with plain JavaScript"
description: "Validate and format Brazilian documents with no framework: input masks on a plain form, validation on submit, and form schemas with zod or valibot, with runnable examples."
keywords: ["vanilla", "JavaScript", "form", "input mask", "zod", "valibot", "script tag", "UMD", "CPF", "CNPJ", "CEP", "phone"]
---

No framework needed: every function takes a value and returns a value. The examples on this page are complete HTML files that load the package from a CDN through an import map, so they run as they are, in the browser or in a file on your disk. Click **Run** under the code. With a bundler, drop the import map and `npm install @brazilian-utils/brazilian-utils`.

## Load the package

As an ES module, with an import map (what the examples below do):

```html
<script type="importmap">
  { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
</script>
<script type="module">
  import { isValidCpf } from '@brazilian-utils/brazilian-utils';
  console.log(isValidCpf('123.456.789-09')); // true
</script>
```

Or as a classic script, which exposes the global `BrazilianUtils`:

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
<script>
  console.log(BrazilianUtils.isValidCpf('123.456.789-09')); // true
</script>
```

## Validate as the user types

Listen to `input` and ask the validator. It accepts the value with or without its mask, so there is nothing to strip first.

```html
<!doctype html>
<html lang="en">
  <body>
    <label>
      CPF
      <input id="cpf" placeholder="000.000.000-00" inputmode="numeric" />
      <small id="status"></small>
    </label>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import { isValidCpf } from '@brazilian-utils/brazilian-utils';

      const input = document.querySelector('#cpf');
      const status = document.querySelector('#status');

      input.addEventListener('input', () => {
        status.textContent = input.value ? (isValidCpf(input.value) ? 'Valid CPF' : 'Invalid CPF') : '';
      });
    </script>
  </body>
</html>
```

## Format while typing (input mask)

The `format*` functions mask a value as far as it goes, so writing the formatted value back on every `input` event gives you an input mask with no extra library. Use `{ mask: 'nanp' }` for a phone with area code.

```html
<!doctype html>
<html lang="en">
  <body>
    <form>
      <label>CPF <input name="cpf" placeholder="000.000.000-00" inputmode="numeric" /></label>
      <label>CNPJ <input name="cnpj" placeholder="00.000.000/0000-00" inputmode="numeric" /></label>
      <label>Phone <input name="phone" placeholder="(00) 00000-0000" inputmode="numeric" /></label>
      <label>CEP <input name="cep" placeholder="00000-000" inputmode="numeric" /></label>
    </form>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

      const masks = {
        cpf: formatCpf,
        cnpj: formatCnpj,
        phone: (value) => formatPhone(value, { mask: 'nanp' }),
        cep: formatCep,
      };

      for (const [name, format] of Object.entries(masks)) {
        const input = document.querySelector(`[name="${name}"]`);
        input.addEventListener('input', () => { input.value = format(input.value); });
      }
    </script>
  </body>
</html>
```

## Validate a form with zod

Put the validator in a `refine` and the parser in a `transform`: the schema rejects a bad document with your message and hands you the digits of a good one, ready for the API.

```html
<!doctype html>
<html lang="en">
  <body>
    <form id="signup" novalidate>
      <label>Name <input name="name" /><small></small></label>
      <label>CPF <input name="cpf" /><small></small></label>
      <label>Phone <input name="phone" /><small></small></label>
      <label>CEP <input name="cep" /><small></small></label>
      <button>Send</button>
    </form>
    <pre id="result"></pre>

    <script type="importmap">
      {
        "imports": {
          "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm",
          "zod": "https://cdn.jsdelivr.net/npm/zod@4.6.5/+esm"
        }
      }
    </script>
    <script type="module">
      import { z } from 'zod';
      import {
        isValidCep, isValidCpf, isValidPhone, parseCep, parseCpf, parsePhone,
      } from '@brazilian-utils/brazilian-utils';

      const schema = z.object({
        name: z.string().min(2, 'Name is required'),
        cpf: z.string().refine(isValidCpf, 'Invalid CPF').transform(parseCpf),
        phone: z.string().refine((value) => isValidPhone(value), 'Invalid phone').transform(parsePhone),
        cep: z.string().refine(isValidCep, 'Invalid CEP').transform(parseCep),
      });

      const form = document.querySelector('#signup');
      const result = document.querySelector('#result');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const parsed = schema.safeParse(values);

        for (const small of form.querySelectorAll('small')) small.textContent = '';
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            form.querySelector(`[name="${issue.path[0]}"] + small`).textContent = issue.message;
          }
          result.textContent = '';
          return;
        }
        result.textContent = JSON.stringify(parsed.data, null, 2);
      });
    </script>
  </body>
</html>
```

## Validate a form with valibot

The same idea in valibot: `check` for the validator, `transform` for the parser, `flatten` to read the messages by field.

```html
<!doctype html>
<html lang="en">
  <body>
    <form id="company" novalidate>
      <label>CPF <input name="cpf" /><small></small></label>
      <label>CNPJ <input name="cnpj" /><small></small></label>
      <button>Send</button>
    </form>
    <pre id="result"></pre>

    <script type="importmap">
      {
        "imports": {
          "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm",
          "valibot": "https://cdn.jsdelivr.net/npm/valibot@1.5.0/+esm"
        }
      }
    </script>
    <script type="module">
      import * as v from 'valibot';
      import { isValidCnpj, isValidCpf, parseCnpj, parseCpf } from '@brazilian-utils/brazilian-utils';

      const schema = v.object({
        cpf: v.pipe(v.string(), v.check(isValidCpf, 'Invalid CPF'), v.transform(parseCpf)),
        cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'Invalid CNPJ'), v.transform(parseCnpj)),
      });

      const form = document.querySelector('#company');
      const result = document.querySelector('#result');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const parsed = v.safeParse(schema, Object.fromEntries(new FormData(form)));

        for (const small of form.querySelectorAll('small')) small.textContent = '';
        if (!parsed.success) {
          for (const [field, messages] of Object.entries(v.flatten(parsed.issues).nested ?? {})) {
            form.querySelector(`[name="${field}"] + small`).textContent = messages[0];
          }
          result.textContent = '';
          return;
        }
        result.textContent = JSON.stringify(parsed.output, null, 2);
      });
    </script>
  </body>
</html>
```

## Format for display

Store the digits, format when rendering. `formatCpf` can hide the digits the way gov.br does, and `formatPhone` with `mask: 'auto'` picks the right pattern from the number itself.

```html
<!doctype html>
<html lang="en">
  <body>
    <dl id="receipt"></dl>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import {
        convertCurrencyToWords, formatCnpj, formatCpf, formatCurrency, formatPhone,
      } from '@brazilian-utils/brazilian-utils';

      const order = {
        customer: 'Maria da Silva',
        cpf: '12345678909',
        company: 'ACME LTDA',
        cnpj: '12345678000195',
        phone: '11987654321',
        total: 1234.56,
      };

      const rows = [
        ['Customer', `${order.customer} (${formatCpf(order.cpf, { obfuscate: true })})`],
        ['Company', `${order.company}, CNPJ ${formatCnpj(order.cnpj)}`],
        ['Phone', formatPhone(order.phone, { mask: 'auto' })],
        ['Total', `${formatCurrency(order.total, { symbol: true })} (${convertCurrencyToWords(order.total)})`],
      ];

      document.querySelector('#receipt').innerHTML = rows
        .map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`)
        .join('');
    </script>
  </body>
</html>
```

## Where to go next

- The [utilities reference](utilities.md) lists every function with its options.
- The same patterns for [React](guides/react.md), [Vue](guides/vue.md) and [Angular](guides/angular.md).
- Heavy utils such as `getMunicipalities` deserve a lazy import; see [Bundle size](getting-started.md#bundle-size).
