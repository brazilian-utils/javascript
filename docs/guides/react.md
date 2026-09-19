---
title: "Using with React"
description: "Validate and format Brazilian documents in React forms: input masks, validation as the user types, and form schemas with zod or valibot, with runnable examples."
keywords: ["React", "form", "input mask", "zod", "valibot", "react-hook-form", "CPF", "CNPJ", "CEP", "phone"]
---

Brazilian Utils has no React code in it: every function takes a value and returns a value, so it plugs into any component, hook or form library. This page shows the patterns that come up in most apps. Every example runs in your browser: click **Run** under the code.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validate as the user types

Keep the input in state and ask the validator on every render. The validator accepts the value with or without its mask, so there is nothing to strip first.

```jsx
import { useState } from 'react';
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

export default function CpfField() {
  const [cpf, setCpf] = useState('');
  const valid = isValidCpf(cpf);

  return (
    <label>
      CPF
      <input
        value={cpf}
        onChange={(event) => setCpf(event.target.value)}
        placeholder="000.000.000-00"
        inputMode="numeric"
      />
      {cpf && <small>{valid ? 'Valid CPF' : 'Invalid CPF'}</small>}
    </label>
  );
}
```

## Format while typing (input mask)

The `format*` functions mask a value as far as it goes, so passing the raw input through one of them on every change gives you an input mask with no extra library. Use `{ mask: 'nanp' }` for a phone with area code.

```jsx
import { useState } from 'react';
import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

const fields = [
  { name: 'cpf', label: 'CPF', format: formatCpf, placeholder: '000.000.000-00' },
  { name: 'cnpj', label: 'CNPJ', format: formatCnpj, placeholder: '00.000.000/0000-00' },
  { name: 'phone', label: 'Phone', format: (value) => formatPhone(value, { mask: 'nanp' }), placeholder: '(00) 00000-0000' },
  { name: 'cep', label: 'CEP', format: formatCep, placeholder: '00000-000' },
];

export default function MaskedInputs() {
  const [values, setValues] = useState({ cpf: '', cnpj: '', phone: '', cep: '' });

  return (
    <form>
      {fields.map(({ name, label, format, placeholder }) => (
        <label key={name}>
          {label}
          <input
            value={values[name]}
            onChange={(event) => setValues({ ...values, [name]: format(event.target.value) })}
            placeholder={placeholder}
            inputMode="numeric"
          />
        </label>
      ))}
      <pre>{JSON.stringify(values, null, 2)}</pre>
    </form>
  );
}
```

## Validate a form with zod

Put the validator in a `refine` and the parser in a `transform`: the schema rejects a bad document with your message and hands you the digits of a good one, ready for the API.

```jsx
import { useState } from 'react';
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

export default function SignupForm() {
  const [values, setValues] = useState({ name: '', cpf: '', phone: '', cep: '' });
  const [errors, setErrors] = useState({});
  const [data, setData] = useState(null);

  function change(event) {
    const { name, value } = event.target;
    setValues({ ...values, [name]: masks[name] ? masks[name](value) : value });
  }

  function submit(event) {
    event.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])));
      setData(null);
      return;
    }
    setErrors({});
    setData(result.data);
  }

  return (
    <form onSubmit={submit} noValidate>
      {['name', 'cpf', 'phone', 'cep'].map((name) => (
        <label key={name}>
          {name}
          <input name={name} value={values[name]} onChange={change} />
          {errors[name] && <small>{errors[name]}</small>}
        </label>
      ))}
      <button>Send</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </form>
  );
}
```

With react-hook-form, the same schema goes into the resolver and the fields are registered as usual:

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
```

## Validate a form with valibot

The same idea in valibot: `check` for the validator, `transform` for the parser, `flatten` to read the messages by field.

```jsx
import { useState } from 'react';
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

export default function CompanyForm() {
  const [values, setValues] = useState({ cpf: '', cnpj: '' });
  const [errors, setErrors] = useState({});
  const [data, setData] = useState(null);

  function submit(event) {
    event.preventDefault();
    const result = v.safeParse(schema, values);
    if (!result.success) {
      const nested = v.flatten(result.issues).nested ?? {};
      setErrors(Object.fromEntries(Object.entries(nested).map(([field, messages]) => [field, messages[0]])));
      setData(null);
      return;
    }
    setErrors({});
    setData(result.output);
  }

  return (
    <form onSubmit={submit} noValidate>
      {Object.keys(values).map((name) => (
        <label key={name}>
          {name.toUpperCase()}
          <input
            value={values[name]}
            onChange={(event) => setValues({ ...values, [name]: masks[name](event.target.value) })}
          />
          {errors[name] && <small>{errors[name]}</small>}
        </label>
      ))}
      <button>Send</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </form>
  );
}
```

## Format for display

Store the digits, format on render. `formatCpf` can hide the digits the way gov.br does, and `formatPhone` with `mask: 'auto'` picks the right pattern from the number itself.

```jsx
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

export default function Receipt() {
  return (
    <dl>
      <dt>Customer</dt>
      <dd>{order.customer} ({formatCpf(order.cpf, { obfuscate: true })})</dd>
      <dt>Company</dt>
      <dd>{order.company}, CNPJ {formatCnpj(order.cnpj)}</dd>
      <dt>Phone</dt>
      <dd>{formatPhone(order.phone, { mask: 'auto' })}</dd>
      <dt>Total</dt>
      <dd>
        {formatCurrency(order.total, { symbol: true })}
        <br />
        <small>{convertCurrencyToWords(order.total)}</small>
      </dd>
    </dl>
  );
}
```

## Where to go next

- The [utilities reference](utilities.md) lists every function with its options.
- The same patterns for [Vue](guides/vue.md) and for [plain JavaScript](guides/vanilla.md).
- Heavy utils such as `getMunicipalities` deserve a lazy import; see [Bundle size](getting-started.md#bundle-size).
