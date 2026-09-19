---
title: "Uso com React"
description: "Valide e formate documentos brasileiros em formulários React: máscaras de input, validação enquanto o usuário digita e esquemas de formulário com zod ou valibot, com exemplos executáveis."
keywords: ["React", "formulário", "máscara de input", "zod", "valibot", "react-hook-form", "CPF", "CNPJ", "CEP", "telefone"]
---

O Brazilian Utils não tem código React: cada função recebe um valor e retorna um valor, então se encaixa em qualquer componente, hook ou biblioteca de formulário. Esta página mostra os padrões que aparecem na maioria das aplicações. Todos os exemplos rodam no navegador: clique em **Executar** embaixo do código.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validar enquanto o usuário digita

Guarde o input no estado e consulte o validador a cada render. O validador aceita o valor com ou sem máscara, então não é preciso limpar nada antes.

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
      {cpf && <small>{valid ? 'CPF válido' : 'CPF inválido'}</small>}
    </label>
  );
}
```

## Formatar enquanto digita (máscara de input)

As funções `format*` aplicam a máscara até onde o valor vai, então passar o que foi digitado por uma delas a cada mudança já é uma máscara de input, sem biblioteca extra. Use `{ mask: 'nanp' }` para telefone com DDD.

```jsx
import { useState } from 'react';
import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

const fields = [
  { name: 'cpf', label: 'CPF', format: formatCpf, placeholder: '000.000.000-00' },
  { name: 'cnpj', label: 'CNPJ', format: formatCnpj, placeholder: '00.000.000/0000-00' },
  { name: 'phone', label: 'Telefone', format: (value) => formatPhone(value, { mask: 'nanp' }), placeholder: '(00) 00000-0000' },
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

## Validar um formulário com zod

Coloque o validador em um `refine` e o parser em um `transform`: o esquema rejeita um documento inválido com a sua mensagem e entrega os dígitos de um válido, prontos para a API.

```jsx
import { useState } from 'react';
import { z } from 'zod';
import {
  formatCep, formatCpf, formatPhone,
  isValidCep, isValidCpf, isValidPhone,
  parseCep, parseCpf, parsePhone,
} from '@brazilian-utils/brazilian-utils';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido').transform(parseCpf),
  phone: z.string().refine((value) => isValidPhone(value), 'Telefone inválido').transform(parsePhone),
  cep: z.string().refine(isValidCep, 'CEP inválido').transform(parseCep),
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
      <button>Enviar</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </form>
  );
}
```

Com react-hook-form, o mesmo esquema vai no resolver e os campos são registrados como de costume:

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
```

## Validar um formulário com valibot

A mesma ideia no valibot: `check` para o validador, `transform` para o parser, `flatten` para ler as mensagens por campo.

```jsx
import { useState } from 'react';
import * as v from 'valibot';
import {
  formatCnpj, formatCpf,
  isValidCnpj, isValidCpf,
  parseCnpj, parseCpf,
} from '@brazilian-utils/brazilian-utils';

const schema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido'), v.transform(parseCpf)),
  cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'CNPJ inválido'), v.transform(parseCnpj)),
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
      <button>Enviar</button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </form>
  );
}
```

## Formatar para exibição

Guarde os dígitos, formate na hora de renderizar. `formatCpf` pode esconder os dígitos como o gov.br faz, e `formatPhone` com `mask: 'auto'` escolhe o padrão certo a partir do próprio número.

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
      <dt>Cliente</dt>
      <dd>{order.customer} ({formatCpf(order.cpf, { obfuscate: true })})</dd>
      <dt>Empresa</dt>
      <dd>{order.company}, CNPJ {formatCnpj(order.cnpj)}</dd>
      <dt>Telefone</dt>
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

## Para onde ir depois

- A [referência de utilitários](pt-br/utilities.md) lista todas as funções com suas opções.
- Os mesmos padrões em [Vue](pt-br/guides/vue.md) e em [JavaScript puro](pt-br/guides/vanilla.md).
- Utilitários pesados como `getMunicipalities` merecem um import sob demanda; veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle).
