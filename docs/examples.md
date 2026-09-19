---
title: "Examples"
description: "A CPF field that formats as you type and validates the result, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["examples", "CPF input mask", "React CPF", "Angular CPF", "Vue CPF", "format CPF as you type", "validate CPF"]
---

A CPF field that formats as you type, with `formatCpf`, and validates once complete, with `isValidCpf`. Each tab runs the code below it, which you can copy as is.

`formatCpf` formats whatever has been typed so far (`"9438"` becomes `"943.8"`), drops anything that is not a digit and cuts digits past the eleventh. Replacing a field's value moves the caret to the end, though, so `maskCpf` puts it back next to the digit being edited, and turns a deleted `.` or `-` into a deleted digit, which `formatCpf` would otherwise put straight back. The field is marked `aria-invalid` when a complete CPF is not valid, and hands the formatted CPF to its parent the way its framework expects, so it drops into the form library most projects use.

<div class="example" data-name="React" data-demo="/snippets/live/react.html">

[cpf-field.tsx](snippets/cpf-field.tsx ':include :type=code tsx')

A controlled component: the parent holds the CPF and passes `value` and `onChange`. It also takes the input's own props (`name`, `onBlur`, `ref`), so react-hook-form's `field` spreads into it as is, with focus on error and touched state:

[signup-form.tsx](snippets/usage/signup-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/angular.html">

[cpf-field.ts](snippets/cpf-field.ts ':include :type=code ts')

A `ControlValueAccessor`, so it takes `formControlName` (or `formControl`, or `ngModel`) like a native input, touched on blur and disabled with its control. With Reactive Forms:

[signup.ts](snippets/usage/signup.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/vue.html">

[cpf-field.vue](snippets/cpf-field.vue ':include :type=code vue')

The CPF is the component's `v-model` (`defineModel`), which is what VeeValidate's `defineField` binds to:

[signup-form.vue](snippets/usage/signup-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/cpf-field.html">

No build step: save it as an `.html` file and open it. It imports the package from a CDN and calls `setCustomValidity`, so a form around the field refuses to submit an invalid CPF.

[cpf-field.html](snippets/cpf-field.html ':include :type=code html')

</div>

The [utilities reference](utilities.md) lists every function.
