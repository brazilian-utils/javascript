---
title: "Uso com Vue"
description: "Valide e formate documentos brasileiros em formulários Vue: máscaras de input com v-model, validação enquanto o usuário digita e esquemas de formulário com zod ou valibot, com exemplos executáveis."
keywords: ["Vue", "formulário", "v-model", "máscara de input", "zod", "valibot", "vee-validate", "CPF", "CNPJ", "CEP", "telefone"]
---

O Brazilian Utils não tem código Vue: cada função recebe um valor e retorna um valor, então se encaixa em um `ref`, um `computed` ou qualquer biblioteca de formulário. Esta página mostra os padrões que aparecem na maioria das aplicações, como componentes de arquivo único. Todos os exemplos rodam no navegador: clique em **Executar** embaixo do código.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validar enquanto o usuário digita

Guarde o input em um `ref` e derive a validade com `computed`. O validador aceita o valor com ou sem máscara, então não é preciso limpar nada antes.

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
    <small v-if="cpf">{{ valid ? 'CPF válido' : 'CPF inválido' }}</small>
  </label>
</template>
```

## Formatar enquanto digita (máscara de input)

Um `computed` com setter transforma qualquer função `format*` em uma máscara de `v-model`: o setter formata o que foi digitado, o getter retorna o valor. Use `{ mask: 'nanp' }` para telefone com DDD.

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
    <label>Telefone <input v-model="phone" placeholder="(00) 00000-0000" inputmode="numeric" /></label>
    <label>CEP <input v-model="cep" placeholder="00000-000" inputmode="numeric" /></label>
    <pre>{{ values }}</pre>
  </form>
</template>
```

## Validar um formulário com zod

Coloque o validador em um `refine` e o parser em um `transform`: o esquema rejeita um documento inválido com a sua mensagem e entrega os dígitos de um válido, prontos para a API.

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
  name: z.string().min(2, 'Informe o nome'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido').transform(parseCpf),
  phone: z.string().refine((value) => isValidPhone(value), 'Telefone inválido').transform(parsePhone),
  cep: z.string().refine(isValidCep, 'CEP inválido').transform(parseCep),
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
    <button>Enviar</button>
    <pre v-if="data">{{ data }}</pre>
  </form>
</template>
```

Com vee-validate, o mesmo esquema passa por `toTypedSchema` e os campos são ligados com `useField` ou `<Field>`:

```javascript
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';

const { handleSubmit, errors } = useForm({ validationSchema: toTypedSchema(schema) });
```

## Validar um formulário com valibot

A mesma ideia no valibot: `check` para o validador, `transform` para o parser, `flatten` para ler as mensagens por campo.

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
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido'), v.transform(parseCpf)),
  cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'CNPJ inválido'), v.transform(parseCnpj)),
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
    <button>Enviar</button>
    <pre v-if="data">{{ data }}</pre>
  </form>
</template>
```

## Formatar para exibição

Guarde os dígitos, formate no template. `formatCpf` pode esconder os dígitos como o gov.br faz, e `formatPhone` com `mask: 'auto'` escolhe o padrão certo a partir do próprio número.

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
    <dt>Cliente</dt>
    <dd>{{ order.customer }} ({{ formatCpf(order.cpf, { obfuscate: true }) }})</dd>
    <dt>Empresa</dt>
    <dd>{{ order.company }}, CNPJ {{ formatCnpj(order.cnpj) }}</dd>
    <dt>Telefone</dt>
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

## Para onde ir depois

- A [referência de utilitários](pt-br/utilities.md) lista todas as funções com suas opções.
- Os mesmos padrões em [React](pt-br/guides/react.md), [Angular](pt-br/guides/angular.md) e [JavaScript puro](pt-br/guides/vanilla.md).
- Utilitários pesados como `getMunicipalities` merecem um import sob demanda; veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle).
