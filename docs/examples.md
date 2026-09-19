---
title: "Examples"
description: "A CPF field that formats as you type and validates the result, with Brazilian Utils in React, Vue, Angular and plain JavaScript."
keywords: ["examples", "CPF input mask", "React CPF", "Vue CPF", "Angular CPF", "format CPF as you type", "validate CPF"]
---

One field does both jobs: `formatCpf` formats whatever has been typed so far (`"9438"` becomes `"943.8"`, letters are dropped and digits past the eleventh are cut), and `isValidCpf` checks the result once it is complete.

## Try it

<iframe src="/snippets/cpf-field.html" title="Live CPF field" loading="lazy" width="100%" height="40" style="border: 0; border-radius: 6px; background: #fff"></iframe>

## React

[cpf-field.jsx](snippets/cpf-field.jsx ':include :type=code jsx')

## Vue

[cpf-field.vue](snippets/cpf-field.vue ':include :type=code html')

Setting `event.target.value` again keeps the field in sync when a keystroke does not change the formatted value, such as a letter.

## Angular

[cpf-field.component.ts](snippets/cpf-field.component.ts ':include :type=code ts')

## Plain JavaScript

No build step: the package is imported straight from a CDN.

[cpf-field.html](snippets/cpf-field.html ':include :type=code html')

The same field works for a CNPJ (`formatCnpj` and `isValidCnpj`, complete at 18 characters) or a CEP (`formatCep` and `isValidCep`, complete at 9). The [utilities reference](utilities.md) lists every function.
