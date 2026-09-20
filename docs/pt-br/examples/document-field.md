---
title: "Campo de documento"
description: "Um campo que aplica máscara e valida CPF, CNPJ, CEP ou telefone enquanto você digita, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["máscara de CPF", "máscara de CNPJ", "máscara de CEP", "máscara de telefone", "CPF React", "CPF Angular", "CPF Vue", "validar CPF"]
---

Um campo para qualquer um dos documentos, escolhido no select: formata enquanto você digita e valida quando o valor fica completo. Cada aba roda o código logo abaixo dela, que pode ser copiado do jeito que está.

O campo é genérico: um mapa pequeno dá a cada documento o rótulo, o formato completo, o `format*` e o `isValid*`, então incluir outro são quatro linhas. Formatar o valor do campo joga o cursor para o fim, então o `mask` devolve o cursor para perto do caractere que está sendo editado, e transforma um separador apagado num caractere apagado, que o formatter recolocaria na hora. A posição do cursor sai do próprio formatter: o que foi digitado antes do cursor, formatado, tem o tamanho da nova posição.


<div class="example" data-name="React" data-demo="/snippets/live/document-field-react.html">

Um componente controlado: o pai guarda o valor e passa `value` e `onChange`. Ele também aceita as props do próprio input, então o `field` do react-hook-form entra inteiro:

[document-field.tsx](../../snippets/document-field/document-field.tsx ':include :type=code tsx')

[document-form.tsx](../../snippets/document-field/document-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/document-field-angular.html">

Um `ControlValueAccessor`, então aceita `formControlName` (ou `formControl`, ou `ngModel`) como um input nativo, fica touched no blur e desabilita junto com o seu controle:

[document-field.ts](../../snippets/document-field/document-field.ts ':include :type=code ts')

[document-form.ts](../../snippets/document-field/document-form.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/document-field-vue.html">

O valor é o `v-model` do componente (`defineModel`), que é onde o `defineField` do VeeValidate se liga:

[document-field.vue](../../snippets/document-field/document-field.vue ':include :type=code vue')

[document-form.vue](../../snippets/document-field/document-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/document-field/document-field.html">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN e chama `setCustomValidity`, então o formulário se recusa a enviar um documento inválido.

[document-field.html](../../snippets/document-field/document-field.html ':include :type=code html')

</div>


A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
