---
title: "Examples"
description: "A CPF field that formats as you type and validates the result, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["examples", "CPF input mask", "React CPF", "Angular CPF", "Vue CPF", "format CPF as you type", "validate CPF"]
---

A CPF field that formats as you type, with `formatCpf`, and validates once complete, with `isValidCpf`. Each tab runs the code below it, which you can copy as is.

`formatCpf` formats whatever has been typed so far (`"9438"` becomes `"943.8"`), drops anything that is not a digit and cuts digits past the eleventh. Replacing a field's value moves the caret to the end, though, so `maskCpf` puts it back next to the digit being edited, and turns a deleted `.` or `-` into a deleted digit, which `formatCpf` would otherwise put straight back. The field is marked `aria-invalid` when a complete CPF is not valid, and hands the formatted CPF to its parent the way each framework expects, so it drops into the form library most projects use: a controlled component in React (`value`, `onChange` and the input's own props, for react-hook-form's `field`), a `ControlValueAccessor` in Angular (`formControlName`), `v-model` in Vue (VeeValidate's `defineField`).

<div class="example" data-name="React" data-demo="/snippets/live/react.html">

[cpf-field.tsx](snippets/cpf-field.tsx ':include :type=code tsx')

With react-hook-form:

[signup-form.tsx](snippets/usage/signup-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/angular.html">

[cpf-field.ts](snippets/cpf-field.ts ':include :type=code ts')

With Reactive Forms:

[signup.ts](snippets/usage/signup.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/vue.html">

[cpf-field.vue](snippets/cpf-field.vue ':include :type=code vue')

With VeeValidate:

[signup-form.vue](snippets/usage/signup-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/cpf-field.html">

[cpf-field.html](snippets/cpf-field.html ':include :type=code html')

</div>

The [utilities reference](utilities.md) lists every function.
