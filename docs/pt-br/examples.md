---
title: "Exemplos"
description: "Um campo de CPF que formata enquanto você digita e valida o resultado, com Brazilian Utils em React, Vue, Angular e JavaScript puro."
keywords: ["exemplos", "máscara de CPF", "CPF React", "CPF Vue", "CPF Angular", "formatar CPF ao digitar", "validar CPF"]
---

Um campo só faz as duas coisas: `formatCpf` formata o que já foi digitado (`"9438"` vira `"943.8"`, letras são descartadas e dígitos além do décimo primeiro são cortados), e `isValidCpf` confere o resultado quando ele está completo.

## Experimente

<div class="cpf-demo" data-valid="✓ CPF válido" data-invalid="✗ CPF inválido">
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
      {cpf.length === 14 && (isValidCpf(cpf) ? "✓ CPF válido" : "✗ CPF inválido")}
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
    <span v-if="cpf.length === 14">{{ isValidCpf(cpf) ? "✓ CPF válido" : "✗ CPF inválido" }}</span>
  </label>
</template>
```

Atribuir `event.target.value` de novo mantém o campo em sincronia quando uma tecla não muda o valor formatado, como uma letra.

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
        <span>{{ valid() ? "✓ CPF válido" : "✗ CPF inválido" }}</span>
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

## JavaScript puro

Sem build: o pacote é importado direto de um CDN.

```html
<label>CPF <input id="cpf" inputmode="numeric" /></label>
<output id="result"></output>

<script type="module">
  import { formatCpf, isValidCpf } from "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm";

  const input = document.getElementById("cpf");
  const result = document.getElementById("result");

  input.addEventListener("input", () => {
    input.value = formatCpf(input.value);
    result.textContent = input.value.length === 14 ? (isValidCpf(input.value) ? "✓ CPF válido" : "✗ CPF inválido") : "";
  });
</script>
```

O mesmo campo serve para CNPJ (`formatCnpj` e `isValidCnpj`, completo com 18 caracteres) ou CEP (`formatCep` e `isValidCep`, completo com 9). A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
