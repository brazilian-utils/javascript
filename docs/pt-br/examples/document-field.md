---
title: "Campo de documento"
description: "Um campo que aplica máscara e valida CPF, CNPJ, CEP ou telefone enquanto você digita, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["máscara de CPF", "máscara de CNPJ", "máscara de CEP", "máscara de telefone", "CPF React", "CPF Angular", "CPF Vue", "validar CPF"]
---

Um campo que formata enquanto você digita e valida quando o valor fica completo. Escolha o documento e o framework: cada exemplo é só sobre aquele documento, e roda o código logo abaixo dele, que pode ser copiado do jeito que está.

A função `mask` é a mesma em todos, e é tudo que uma máscara precisa. Um formatter aceita o que já foi digitado, então pode rodar a cada tecla; trocar o valor do campo joga o cursor para o fim, então o `mask` devolve o cursor para perto do caractere que está sendo editado. Formatar o que vem antes do cursor é o que diz para onde ele vai. Um separador apagado vira um caractere apagado, que o formatter recolocaria na hora.


<div class="example" data-name="React">

Um componente controlado: o pai guarda o valor e passa `value` e `onChange`. Ele também aceita as props do próprio input, então o `field` do react-hook-form entra inteiro:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.tsx&usage=cpf-form.tsx">

[cpf-field.tsx](../../snippets/document-field/generated/cpf/cpf-field.tsx ':include :type=code tsx')

[cpf-form.tsx](../../snippets/document-field/generated/cpf/cpf-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.tsx&usage=cnpj-form.tsx">

[cnpj-field.tsx](../../snippets/document-field/generated/cnpj/cnpj-field.tsx ':include :type=code tsx')

[cnpj-form.tsx](../../snippets/document-field/generated/cnpj/cnpj-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.tsx&usage=cep-form.tsx">

[cep-field.tsx](../../snippets/document-field/generated/cep/cep-field.tsx ':include :type=code tsx')

[cep-form.tsx](../../snippets/document-field/generated/cep/cep-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.tsx&usage=phone-form.tsx">

[phone-field.tsx](../../snippets/document-field/generated/phone/phone-field.tsx ':include :type=code tsx')

[phone-form.tsx](../../snippets/document-field/generated/phone/phone-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="example" data-name="Angular">

Um `ControlValueAccessor`, então aceita `formControlName` (ou `formControl`, ou `ngModel`) como um input nativo, fica touched no blur e desabilita junto com o seu controle:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.ts&usage=cpf-form.ts">

[cpf-field.ts](../../snippets/document-field/generated/cpf/cpf-field.ts ':include :type=code ts')

[cpf-form.ts](../../snippets/document-field/generated/cpf/cpf-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.ts&usage=cnpj-form.ts">

[cnpj-field.ts](../../snippets/document-field/generated/cnpj/cnpj-field.ts ':include :type=code ts')

[cnpj-form.ts](../../snippets/document-field/generated/cnpj/cnpj-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.ts&usage=cep-form.ts">

[cep-field.ts](../../snippets/document-field/generated/cep/cep-field.ts ':include :type=code ts')

[cep-form.ts](../../snippets/document-field/generated/cep/cep-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.ts&usage=phone-form.ts">

[phone-field.ts](../../snippets/document-field/generated/phone/phone-field.ts ':include :type=code ts')

[phone-form.ts](../../snippets/document-field/generated/phone/phone-form.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue">

O valor é o `v-model` do componente (`defineModel`), que é onde o `defineField` do VeeValidate se liga:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.vue&usage=cpf-form.vue">

[cpf-field.vue](../../snippets/document-field/generated/cpf/cpf-field.vue ':include :type=code vue')

[cpf-form.vue](../../snippets/document-field/generated/cpf/cpf-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.vue&usage=cnpj-form.vue">

[cnpj-field.vue](../../snippets/document-field/generated/cnpj/cnpj-field.vue ':include :type=code vue')

[cnpj-form.vue](../../snippets/document-field/generated/cnpj/cnpj-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.vue&usage=cep-form.vue">

[cep-field.vue](../../snippets/document-field/generated/cep/cep-field.vue ':include :type=code vue')

[cep-form.vue](../../snippets/document-field/generated/cep/cep-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.vue&usage=phone-form.vue">

[phone-field.vue](../../snippets/document-field/generated/phone/phone-field.vue ':include :type=code vue')

[phone-form.vue](../../snippets/document-field/generated/phone/phone-form.vue ':include :type=code vue')

</div>

</div>

<div class="example" data-name="Vanilla">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN e chama `setCustomValidity`, então o formulário se recusa a enviar um valor inválido.

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?page=document-field/generated/cpf/cpf-field.html">

[cpf-field.html](../../snippets/document-field/generated/cpf/cpf-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?page=document-field/generated/cnpj/cnpj-field.html">

[cnpj-field.html](../../snippets/document-field/generated/cnpj/cnpj-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?page=document-field/generated/cep/cep-field.html">

[cep-field.html](../../snippets/document-field/generated/cep/cep-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?page=document-field/generated/phone/phone-field.html">

[phone-field.html](../../snippets/document-field/generated/phone/phone-field.html ':include :type=code html')

</div>

</div>

A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
