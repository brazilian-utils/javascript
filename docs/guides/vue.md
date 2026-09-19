---
title: "Using with Vue"
description: "Validate and format Brazilian documents in Vue forms: input masks with v-model, validation as the user types, and form schemas with zod or valibot, with runnable examples."
keywords: ["Vue", "form", "v-model", "input mask", "zod", "valibot", "vee-validate", "CPF", "CNPJ", "CEP", "phone"]
---

Brazilian Utils has no Vue code in it: every function takes a value and returns a value, so it plugs into a `ref`, a `computed` or any form library. This page shows the patterns that come up in most apps, as single-file components. Every example runs in your browser: click **Run** under the code.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validate as the user types

Keep the input in a `ref` and derive the validity with `computed`. The validator accepts the value with or without its mask, so there is nothing to strip first.

```vue
<script setup>
import { computed, ref } from 'vue';
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

const cpf = ref('');
const valid = computed(() => isValidCpf(cpf.value));
</script>

<template>
  <label>
    CPF
    <input v-model="cpf" placeholder="000.000.000-00" inputmode="numeric" />
    <small v-if="cpf">{{ valid ? 'Valid CPF' : 'Invalid CPF' }}</small>
  </label>
</template>
```

## Format while typing (input mask)

A writable `computed` turns any `format*` function into a `v-model` mask: the setter formats what was typed, the getter returns it. Use `{ mask: 'nanp' }` for a phone with area code.

```vue
<script setup>
import { computed, reactive } from 'vue';
import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

const values = reactive({ cpf: '', cnpj: '', phone: '', cep: '' });

const masked = (name, format) =>
  computed({
    get: () => values[name],
    set: (value) => { values[name] = format(value); },
  });

const cpf = masked('cpf', formatCpf);
const cnpj = masked('cnpj', formatCnpj);
const phone = masked('phone', (value) => formatPhone(value, { mask: 'nanp' }));
const cep = masked('cep', formatCep);
</script>

<template>
  <form>
    <label>CPF <input v-model="cpf" placeholder="000.000.000-00" inputmode="numeric" /></label>
    <label>CNPJ <input v-model="cnpj" placeholder="00.000.000/0000-00" inputmode="numeric" /></label>
    <label>Phone <input v-model="phone" placeholder="(00) 00000-0000" inputmode="numeric" /></label>
    <label>CEP <input v-model="cep" placeholder="00000-000" inputmode="numeric" /></label>
    <pre>{{ values }}</pre>
  </form>
</template>
```

## Validate a form with zod

Put the validator in a `refine` and the parser in a `transform`: the schema rejects a bad document with your message and hands you the digits of a good one, ready for the API.

```vue
<script setup>
import { reactive, ref } from 'vue';
import { z } from 'zod';
import {
  formatCep, formatCpf, formatPhone,
  isValidCep, isValidCpf, isValidPhone,
  parseCep, parseCpf, parsePhone,
} from '@brazilian-utils/brazilian-utils';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  cpf: z.string().refine(isValidCpf, 'Invalid CPF').transform(parseCpf),
  phone: z.string().refine((value) => isValidPhone(value), 'Invalid phone').transform(parsePhone),
  cep: z.string().refine(isValidCep, 'Invalid CEP').transform(parseCep),
});

const masks = { cpf: formatCpf, phone: (value) => formatPhone(value, { mask: 'nanp' }), cep: formatCep };
const values = reactive({ name: '', cpf: '', phone: '', cep: '' });
const errors = ref({});
const data = ref(null);

function input(name, event) {
  const mask = masks[name];
  values[name] = mask ? mask(event.target.value) : event.target.value;
}

function submit() {
  const result = schema.safeParse(values);
  if (!result.success) {
    errors.value = Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
    data.value = null;
    return;
  }
  errors.value = {};
  data.value = result.data;
}
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <label v-for="name in Object.keys(values)" :key="name">
      {{ name }}
      <input :value="values[name]" @input="input(name, $event)" />
      <small v-if="errors[name]">{{ errors[name] }}</small>
    </label>
    <button>Send</button>
    <pre v-if="data">{{ data }}</pre>
  </form>
</template>
```

With vee-validate, the same schema goes through `toTypedSchema` and the fields are bound with `useField` or `<Field>`:

```javascript
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';

const { handleSubmit, errors } = useForm({ validationSchema: toTypedSchema(schema) });
```

## Validate a form with valibot

The same idea in valibot: `check` for the validator, `transform` for the parser, `flatten` to read the messages by field.

```vue
<script setup>
import { reactive, ref } from 'vue';
import * as v from 'valibot';
import {
  formatCnpj, formatCpf,
  isValidCnpj, isValidCpf,
  parseCnpj, parseCpf,
} from '@brazilian-utils/brazilian-utils';

const schema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'Invalid CPF'), v.transform(parseCpf)),
  cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'Invalid CNPJ'), v.transform(parseCnpj)),
});

const masks = { cpf: formatCpf, cnpj: formatCnpj };
const values = reactive({ cpf: '', cnpj: '' });
const errors = ref({});
const data = ref(null);

function submit() {
  const result = v.safeParse(schema, values);
  if (!result.success) {
    const nested = v.flatten(result.issues).nested ?? {};
    errors.value = Object.fromEntries(Object.entries(nested).map(([field, messages]) => [field, messages[0]]));
    data.value = null;
    return;
  }
  errors.value = {};
  data.value = result.output;
}
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <label v-for="name in Object.keys(values)" :key="name">
      {{ name.toUpperCase() }}
      <input :value="values[name]" @input="values[name] = masks[name]($event.target.value)" />
      <small v-if="errors[name]">{{ errors[name] }}</small>
    </label>
    <button>Send</button>
    <pre v-if="data">{{ data }}</pre>
  </form>
</template>
```

## Format for display

Store the digits, format in the template. `formatCpf` can hide the digits the way gov.br does, and `formatPhone` with `mask: 'auto'` picks the right pattern from the number itself.

```vue
<script setup>
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
</script>

<template>
  <dl>
    <dt>Customer</dt>
    <dd>{{ order.customer }} ({{ formatCpf(order.cpf, { obfuscate: true }) }})</dd>
    <dt>Company</dt>
    <dd>{{ order.company }}, CNPJ {{ formatCnpj(order.cnpj) }}</dd>
    <dt>Phone</dt>
    <dd>{{ formatPhone(order.phone, { mask: 'auto' }) }}</dd>
    <dt>Total</dt>
    <dd>
      {{ formatCurrency(order.total, { symbol: true }) }}
      <br />
      <small>{{ convertCurrencyToWords(order.total) }}</small>
    </dd>
  </dl>
</template>
```

## Where to go next

- The [utilities reference](utilities.md) lists every function with its options.
- The same patterns for [React](guides/react.md) and for [plain JavaScript](guides/vanilla.md).
- Heavy utils such as `getMunicipalities` deserve a lazy import; see [Bundle size](getting-started.md#bundle-size).
