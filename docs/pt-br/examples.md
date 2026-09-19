---
title: "Exemplos"
description: "Um campo de CPF que formata enquanto você digita e valida o resultado, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["exemplos", "máscara de CPF", "CPF React", "CPF Angular", "CPF Vue", "formatar CPF ao digitar", "validar CPF"]
---

Um campo de CPF que formata enquanto você digita, com `formatCpf`, e valida quando completo, com `isValidCpf`. Cada aba roda o código logo abaixo dela, que pode ser copiado do jeito que está.

`formatCpf` formata o que já foi digitado (`"9438"` vira `"943.8"`), descarta o que não é dígito e corta os dígitos além do décimo primeiro. Só que trocar o valor do campo joga o cursor para o fim, então `maskCpf` devolve o cursor para perto do dígito que está sendo editado, e transforma um `.` ou `-` apagado num dígito apagado, que o `formatCpf` recolocaria na hora. O campo recebe `aria-invalid` quando um CPF completo não é válido, e entrega o CPF formatado ao componente pai do jeito que o seu framework espera, então encaixa na biblioteca de formulários que a maioria dos projetos usa.

<div class="example" data-name="React" data-demo="/snippets/live/react.html">

[cpf-field.tsx](../snippets/cpf-field.tsx ':include :type=code tsx')

Um componente controlado: o pai guarda o CPF e passa `value` e `onChange`. Ele também aceita as props do próprio input (`name`, `onBlur`, `ref`), então o `field` do react-hook-form entra inteiro, com foco no erro e estado de touched:

[signup-form.tsx](../snippets/usage/signup-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/angular.html">

[cpf-field.ts](../snippets/cpf-field.ts ':include :type=code ts')

Um `ControlValueAccessor`, então aceita `formControlName` (ou `formControl`, ou `ngModel`) como um input nativo, fica touched no blur e desabilitado junto com o seu controle. Com Reactive Forms:

[signup.ts](../snippets/usage/signup.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/vue.html">

[cpf-field.vue](../snippets/cpf-field.vue ':include :type=code vue')

O CPF é o `v-model` do componente (`defineModel`), que é onde o `defineField` do VeeValidate se liga:

[signup-form.vue](../snippets/usage/signup-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/cpf-field.html">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN e chama `setCustomValidity`, então um formulário em volta do campo se recusa a enviar um CPF inválido.

[cpf-field.html](../snippets/cpf-field.html ':include :type=code html')

</div>

A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
