---
title: "Examples"
description: "A CPF field that formats as you type and validates the result, with Brazilian Utils in React, Vue, Angular and plain JavaScript."
keywords: ["examples", "CPF input mask", "React CPF", "Vue CPF", "Angular CPF", "format CPF as you type", "validate CPF"]
---

One field does both jobs: `formatCpf` formats whatever has been typed so far (`"9438"` becomes `"943.8"`, letters are dropped and digits past the eleventh are cut), and `isValidCpf` checks the result once it is complete.

## Try it

<div class="cpf-demo" data-valid="✓ Valid CPF" data-invalid="✗ Invalid CPF">
  <label for="cpf-demo">CPF</label>
  <input id="cpf-demo" inputmode="numeric" autocomplete="off" placeholder="529.982.247-25" />
  <output for="cpf-demo" aria-live="polite"></output>
</div>

## React

```jsx
import { useState } from "react";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

export function CpfField() {
  const [cpf, setCpf] = useState("");

  return (
    <label>
      CPF
      <input value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} inputMode="numeric" />
      {cpf.length === 14 && (isValidCpf(cpf) ? "✓ Valid CPF" : "✗ Invalid CPF")}
    </label>
  );
}
```

## Vue

```html
<script setup>
import { ref } from "vue";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

const cpf = ref("");

function onInput(event) {
  cpf.value = formatCpf(event.target.value);
  event.target.value = cpf.value;
}
</script>

<template>
  <label>
    CPF
    <input :value="cpf" @input="onInput" inputmode="numeric" />
    <span v-if="cpf.length === 14">{{ isValidCpf(cpf) ? "✓ Valid CPF" : "✗ Invalid CPF" }}</span>
  </label>
</template>
```

Setting `event.target.value` again keeps the field in sync when a keystroke does not change the formatted value, such as a letter.

## Angular

```ts
import { Component, computed, signal } from "@angular/core";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

@Component({
  selector: "app-cpf-field",
  template: `
    <label>
      CPF
      <input [value]="cpf()" (input)="onInput($event)" inputmode="numeric" />
      @if (cpf().length === 14) {
        <span>{{ valid() ? "✓ Valid CPF" : "✗ Invalid CPF" }}</span>
      }
    </label>
  `,
})
export class CpfFieldComponent {
  readonly cpf = signal("");
  readonly valid = computed(() => isValidCpf(this.cpf()));

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf.set(formatCpf(input.value));
    input.value = this.cpf();
  }
}
```

## Plain JavaScript

No build step: the package is imported straight from a CDN.

```html
<label>CPF <input id="cpf" inputmode="numeric" /></label>
<output id="result"></output>

<script type="module">
  import { formatCpf, isValidCpf } from "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm";

  const input = document.getElementById("cpf");
  const result = document.getElementById("result");

  input.addEventListener("input", () => {
    input.value = formatCpf(input.value);
    result.textContent = input.value.length === 14 ? (isValidCpf(input.value) ? "✓ Valid CPF" : "✗ Invalid CPF") : "";
  });
</script>
```

The same field works for a CNPJ (`formatCnpj` and `isValidCnpj`, complete at 18 characters) or a CEP (`formatCep` and `isValidCep`, complete at 9). The [utilities reference](utilities.md) lists every function.
