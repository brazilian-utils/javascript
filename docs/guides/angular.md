---
title: "Using with Angular"
description: "Validate and format Brazilian documents in Angular forms: signals, input masks, reactive forms with custom validators, and form schemas with zod or valibot, with runnable examples."
keywords: ["Angular", "signals", "reactive forms", "validators", "input mask", "zod", "valibot", "CPF", "CNPJ", "CEP", "phone"]
---

Brazilian Utils has no Angular code in it: every function takes a value and returns a value, so it works in a signal, a validator or a pipe. This page shows the patterns that come up in most apps, as standalone components with signals (Angular 22, zoneless). Every example runs in your browser: click **Run** under the code.

```bash
npm install @brazilian-utils/brazilian-utils
```

## Validate as the user types

Keep the input in a signal and derive the validity with `computed`. The validator accepts the value with or without its mask, so there is nothing to strip first.

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
        <small>{{ valid() ? 'Valid CPF' : 'Invalid CPF' }}</small>
      }
    </label>
  `,
})
export default class CpfField {
  cpf = signal('');
  valid = computed(() => isValidCpf(this.cpf()));
}
```

## Format while typing (input mask)

The `format*` functions mask a value as far as it goes, so writing the formatted value into the signal on every `input` event gives you an input mask with no extra library. Use `{ mask: 'nanp' }` for a phone with area code.

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
    { name: 'phone', label: 'Phone', placeholder: '(00) 00000-0000' },
    { name: 'cep', label: 'CEP', placeholder: '00000-000' },
  ];

  values = signal<Record<Field, string>>({ cpf: '', cnpj: '', phone: '', cep: '' });

  update(name: Field, event: Event) {
    const value = masks[name]((event.target as HTMLInputElement).value);
    this.values.update((current) => ({ ...current, [name]: value }));
  }
}
```

## Validate a reactive form

A validator is a function from a control to an error object, so any `isValid*` becomes one in a line. The masks go on the `input` event, and `parse*` strips them before the data leaves the form.

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

const messages = { name: 'Name is required', cpf: 'Invalid CPF', phone: 'Invalid phone', cep: 'Invalid CEP' };

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
      <button>Send</button>
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

## Validate a form with zod

Put the validator in a `refine` and the parser in a `transform`: the schema rejects a bad document with your message and hands you the digits of a good one, ready for the API. The form itself stays plain; zod runs on submit.

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
  name: z.string().min(2, 'Name is required'),
  cpf: z.string().refine(isValidCpf, 'Invalid CPF').transform(parseCpf),
  phone: z.string().refine((value) => isValidPhone(value), 'Invalid phone').transform(parsePhone),
  cep: z.string().refine(isValidCep, 'Invalid CEP').transform(parseCep),
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
      <button>Send</button>
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

## Validate a form with valibot

The same idea in valibot: `check` for the validator, `transform` for the parser, `flatten` to read the messages by field.

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
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'Invalid CPF'), v.transform(parseCpf)),
  cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'Invalid CNPJ'), v.transform(parseCnpj)),
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
      <button>Send</button>
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

## Format for display

Store the digits, format in the template. Expose the functions you need as fields of the component (or wrap one in a pipe). `formatCpf` can hide the digits the way gov.br does, and `formatPhone` with `mask: 'auto'` picks the right pattern from the number itself.

```typescript
import { Component } from '@angular/core';
import {
  convertCurrencyToWords, formatCnpj, formatCpf, formatCurrency, formatPhone,
} from '@brazilian-utils/brazilian-utils';

@Component({
  selector: 'app-root',
  template: `
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

## Where to go next

- The [utilities reference](utilities.md) lists every function with its options.
- The same patterns for [React](guides/react.md), [Vue](guides/vue.md) and [plain JavaScript](guides/vanilla.md).
- Heavy utils such as `getMunicipalities` deserve a lazy import; see [Bundle size](getting-started.md#bundle-size).
