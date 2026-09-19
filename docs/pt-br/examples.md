---
title: "Exemplos"
description: "Um campo de CPF que formata enquanto você digita e valida o resultado, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["exemplos", "máscara de CPF", "CPF React", "CPF Angular", "CPF Vue", "formatar CPF ao digitar", "validar CPF"]
---

Um campo de CPF que formata enquanto você digita, com `formatCpf`, e valida quando completo, com `isValidCpf`. Cada aba roda o código logo abaixo dela, que pode ser copiado do jeito que está.

`formatCpf` formata o que já foi digitado (`"9438"` vira `"943.8"`), descarta o que não é dígito e corta os dígitos além do décimo primeiro. Só que trocar o valor do campo joga o cursor para o fim, então `maskCpf` devolve o cursor para perto do dígito que está sendo editado, e transforma um `.` ou `-` apagado num dígito apagado, que o `formatCpf` recolocaria na hora. O campo recebe `aria-invalid` quando um CPF completo não é válido, e entrega o CPF formatado ao componente pai do jeito que cada framework espera, então encaixa na biblioteca de formulários que a maioria dos projetos usa: um componente controlado no React (`value`, `onChange` e as props do próprio input, para o `field` do react-hook-form), um `ControlValueAccessor` no Angular (`formControlName`), `v-model` no Vue (o `defineField` do VeeValidate).

<div class="example" data-name="React" data-demo="/snippets/live/react.html">

[cpf-field.tsx](../snippets/cpf-field.tsx ':include :type=code tsx')

Com react-hook-form:

[signup-form.tsx](../snippets/usage/signup-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/angular.html">

[cpf-field.ts](../snippets/cpf-field.ts ':include :type=code ts')

Com Reactive Forms:

[signup.ts](../snippets/usage/signup.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/vue.html">

[cpf-field.vue](../snippets/cpf-field.vue ':include :type=code vue')

Com VeeValidate:

[signup-form.vue](../snippets/usage/signup-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/cpf-field.html">

[cpf-field.html](../snippets/cpf-field.html ':include :type=code html')

</div>

A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
