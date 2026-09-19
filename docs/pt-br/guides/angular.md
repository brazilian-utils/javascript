---
title: "Uso com Angular"
description: "Valide e formate documentos brasileiros em formulários Angular: signals, máscaras de input, formulários reativos com validadores próprios e esquemas de formulário com zod ou valibot, com exemplos executáveis."
keywords: ["Angular", "signals", "formulários reativos", "validadores", "máscara de input", "zod", "valibot", "CPF", "CNPJ", "CEP", "telefone"]
---

O Brazilian Utils não tem código Angular: cada função recebe um valor e retorna um valor, então funciona em um signal, em um validador ou em um pipe. Esta página mostra os padrões que aparecem na maioria das aplicações, como componentes standalone com signals (Angular 22, sem zone.js). Todos os exemplos rodam no navegador: clique em **Executar** embaixo do código.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validar enquanto o usuário digita

Guarde o input em um signal e derive a validade com `computed`. O validador aceita o valor com ou sem máscara, então não é preciso limpar nada antes.

```typescript
import { Component, computed, signal } from '@angular/core';
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

@Component({
  selector: 'app-root',
  template: `
    <label>
      CPF
      <input
        [value]="cpf()"
        (input)="cpf.set($any($event.target).value)"
        placeholder="000.000.000-00"
        inputmode="numeric"
      />
      @if (cpf()) {
        <small>{{ valid() ? 'CPF válido' : 'CPF inválido' }}</small>
      }
    </label>
  `,
})
export default class CpfField {
  cpf = signal('');
  valid = computed(() => isValidCpf(this.cpf()));
}
```

## Formatar enquanto digita (máscara de input)

As funções `format*` aplicam a máscara até onde o valor vai, então gravar o valor formatado no signal a cada evento `input` já é uma máscara de input, sem biblioteca extra. Use `{ mask: 'nanp' }` para telefone com DDD.

```typescript
import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

const masks = {
  cpf: formatCpf,
  cnpj: formatCnpj,
  phone: (value: string) => formatPhone(value, { mask: 'nanp' }),
  cep: formatCep,
};

type Field = keyof typeof masks;

@Component({
  selector: 'app-root',
  imports: [JsonPipe],
  template: `
    <form>
      @for (field of fields; track field.name) {
        <label>
          {{ field.label }}
          <input
            [value]="values()[field.name]"
            (input)="update(field.name, $event)"
            [placeholder]="field.placeholder"
            inputmode="numeric"
          />
        </label>
      }
      <pre>{{ values() | json }}</pre>
    </form>
  `,
})
export default class MaskedInputs {
  fields: { name: Field; label: string; placeholder: string }[] = [
    { name: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
    { name: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
    { name: 'phone', label: 'Telefone', placeholder: '(00) 00000-0000' },
    { name: 'cep', label: 'CEP', placeholder: '00000-000' },
  ];

  values = signal<Record<Field, string>>({ cpf: '', cnpj: '', phone: '', cep: '' });

  update(name: Field, event: Event) {
    const value = masks[name]((event.target as HTMLInputElement).value);
    this.values.update((current) => ({ ...current, [name]: value }));
  }
}
```

## Validar um formulário reativo

Um validador é uma função que recebe o controle e retorna um objeto de erro, então qualquer `isValid*` vira um em uma linha. As máscaras ficam no evento `input`, e `parse*` tira a máscara antes de os dados saírem do formulário.

```typescript
import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import {
  formatCep, formatCpf, formatPhone,
  isValidCep, isValidCpf, isValidPhone,
  parseCep, parseCpf, parsePhone,
} from '@brazilian-utils/brazilian-utils';

const validator = (check: (value: string) => boolean) =>
  (control: AbstractControl<string>): ValidationErrors | null => (check(control.value) ? null : { invalid: true });

const masks: Partial<Record<string, (value: string) => string>> = {
  cpf: formatCpf,
  phone: (value) => formatPhone(value, { mask: 'nanp' }),
  cep: formatCep,
};

const messages = { name: 'Informe o nome', cpf: 'CPF inválido', phone: 'Telefone inválido', cep: 'CEP inválido' };

type Field = keyof typeof messages;

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, JsonPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @for (name of names; track name) {
        <label>
          {{ name }}
          <input [formControlName]="name" (input)="mask(name, $event)" />
          @if (error(name)) {
            <small>{{ error(name) }}</small>
          }
        </label>
      }
      <button>Enviar</button>
      @if (data()) {
        <pre>{{ data() | json }}</pre>
      }
    </form>
  `,
})
export default class SignupForm {
  private fb = inject(NonNullableFormBuilder);

  names: Field[] = ['name', 'cpf', 'phone', 'cep'];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    cpf: ['', validator(isValidCpf)],
    phone: ['', validator((value) => isValidPhone(value))],
    cep: ['', validator(isValidCep)],
  });

  data = signal<object | null>(null);

  mask(name: Field, event: Event) {
    const format = masks[name];
    if (format) this.form.controls[name].setValue(format((event.target as HTMLInputElement).value));
  }

  error(name: Field) {
    const control = this.form.controls[name];
    return control.touched && control.invalid ? messages[name] : '';
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.data.set(null);
      return;
    }
    const { name, cpf, phone, cep } = this.form.getRawValue();
    this.data.set({ name, cpf: parseCpf(cpf), phone: parsePhone(phone), cep: parseCep(cep) });
  }
}
```

## Validar um formulário com zod

Coloque o validador em um `refine` e o parser em um `transform`: o esquema rejeita um documento inválido com a sua mensagem e entrega os dígitos de um válido, prontos para a API. O formulário fica simples; o zod roda no envio.

```typescript
import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
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

type Field = keyof z.infer<typeof schema>;

const masks: Partial<Record<Field, (value: string) => string>> = {
  cpf: formatCpf,
  phone: (value) => formatPhone(value, { mask: 'nanp' }),
  cep: formatCep,
};

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, JsonPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @for (name of names; track name) {
        <label>
          {{ name }}
          <input [formControlName]="name" (input)="mask(name, $event)" />
          @if (errors()[name]) {
            <small>{{ errors()[name] }}</small>
          }
        </label>
      }
      <button>Enviar</button>
      @if (data()) {
        <pre>{{ data() | json }}</pre>
      }
    </form>
  `,
})
export default class SignupForm {
  private fb = inject(NonNullableFormBuilder);

  names: Field[] = ['name', 'cpf', 'phone', 'cep'];
  form = this.fb.group({ name: '', cpf: '', phone: '', cep: '' });
  errors = signal<Partial<Record<Field, string>>>({});
  data = signal<object | null>(null);

  mask(name: Field, event: Event) {
    const format = masks[name];
    if (format) this.form.controls[name].setValue(format((event.target as HTMLInputElement).value));
  }

  submit() {
    const result = schema.safeParse(this.form.getRawValue());
    if (!result.success) {
      this.errors.set(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])));
      this.data.set(null);
      return;
    }
    this.errors.set({});
    this.data.set(result.data);
  }
}
```

## Validar um formulário com valibot

A mesma ideia no valibot: `check` para o validador, `transform` para o parser, `flatten` para ler as mensagens por campo.

```typescript
import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
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

type Field = keyof v.InferInput<typeof schema>;

const masks: Record<Field, (value: string) => string> = { cpf: formatCpf, cnpj: formatCnpj };

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, JsonPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @for (name of names; track name) {
        <label>
          {{ name.toUpperCase() }}
          <input [formControlName]="name" (input)="mask(name, $event)" />
          @if (errors()[name]) {
            <small>{{ errors()[name] }}</small>
          }
        </label>
      }
      <button>Enviar</button>
      @if (data()) {
        <pre>{{ data() | json }}</pre>
      }
    </form>
  `,
})
export default class CompanyForm {
  private fb = inject(NonNullableFormBuilder);

  names: Field[] = ['cpf', 'cnpj'];
  form = this.fb.group({ cpf: '', cnpj: '' });
  errors = signal<Partial<Record<Field, string>>>({});
  data = signal<object | null>(null);

  mask(name: Field, event: Event) {
    this.form.controls[name].setValue(masks[name]((event.target as HTMLInputElement).value));
  }

  submit() {
    const result = v.safeParse(schema, this.form.getRawValue());
    if (!result.success) {
      const nested = v.flatten(result.issues).nested ?? {};
      this.errors.set(Object.fromEntries(Object.entries(nested).map(([field, messages]) => [field, messages?.[0]])));
      this.data.set(null);
      return;
    }
    this.errors.set({});
    this.data.set(result.output);
  }
}
```

## Formatar para exibição

Guarde os dígitos, formate no template. Exponha as funções que precisar como campos do componente (ou embrulhe uma delas em um pipe). `formatCpf` pode esconder os dígitos como o gov.br faz, e `formatPhone` com `mask: 'auto'` escolhe o padrão certo a partir do próprio número.

```typescript
import { Component } from '@angular/core';
import {
  convertCurrencyToWords, formatCnpj, formatCpf, formatCurrency, formatPhone,
} from '@brazilian-utils/brazilian-utils';

@Component({
  selector: 'app-root',
  template: `
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
  `,
})
export default class Receipt {
  order = {
    customer: 'Maria da Silva',
    cpf: '12345678909',
    company: 'ACME LTDA',
    cnpj: '12345678000195',
    phone: '11987654321',
    total: 1234.56,
  };

  protected readonly formatCpf = formatCpf;
  protected readonly formatCnpj = formatCnpj;
  protected readonly formatPhone = formatPhone;
  protected readonly formatCurrency = formatCurrency;
  protected readonly convertCurrencyToWords = convertCurrencyToWords;
}
```

## Para onde ir depois

- A [referência de utilitários](pt-br/utilities.md) lista todas as funções com suas opções.
- Os mesmos padrões em [React](pt-br/guides/react.md), [Vue](pt-br/guides/vue.md) e [JavaScript puro](pt-br/guides/vanilla.md).
- Utilitários pesados como `getMunicipalities` merecem um import sob demanda; veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle).
