---
title: "Campo de documento"
description: "Um campo que aplica máscara e valida CPF, CNPJ, CEP ou telefone enquanto você digita, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["máscara de CPF", "máscara de CNPJ", "máscara de CEP", "máscara de telefone", "CPF React", "CPF Angular", "CPF Vue", "validar CPF"]
---

Um campo que formata enquanto você digita, dentro de um formulário que valida. Escolha o documento e o framework: cada exemplo roda o código logo abaixo dele, que pode ser copiado do jeito que está.

O campo só aplica a máscara e entrega ao formulário o valor sem ela, com `parse*`, então o formulário guarda `52998224725` e é isso que o envio manda. Validar é trabalho do formulário, o que também deixa uma mensagem de erro por campo em vez de duas. A máscara é a mesma em todos: um formatter aceita o que já foi digitado, e formatar o que vem antes do cursor diz para onde ele vai, então editar no meio funciona.

<div class="example" data-name="React">

O hook é dono do input: ele recebe o formatter e o valor que o formulário guarda, aplica a máscara no que é digitado e avisa pelo próprio `onChange`. O React nunca escreve o valor do input, que é o que desfaria a máscara. O campo aceita as props do próprio input, então o `field` do react-hook-form entra inteiro:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/react&example=cpf-field.tsx&usage=cpf-form.tsx">

<div class="file" data-file="cpf-field.tsx">

[cpf-field.tsx](../../snippets/document-field/generated/cpf/react/cpf-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="field.tsx">

[field.tsx](../../snippets/document-field/generated/cpf/react/field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../../snippets/document-field/generated/cpf/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.tsx">

[cpf-form.tsx](../../snippets/document-field/generated/cpf/react/cpf-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/react&example=cnpj-field.tsx&usage=cnpj-form.tsx">

<div class="file" data-file="cnpj-field.tsx">

[cnpj-field.tsx](../../snippets/document-field/generated/cnpj/react/cnpj-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="field.tsx">

[field.tsx](../../snippets/document-field/generated/cnpj/react/field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../../snippets/document-field/generated/cnpj/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.tsx">

[cnpj-form.tsx](../../snippets/document-field/generated/cnpj/react/cnpj-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/react&example=cep-field.tsx&usage=cep-form.tsx">

<div class="file" data-file="cep-field.tsx">

[cep-field.tsx](../../snippets/document-field/generated/cep/react/cep-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="field.tsx">

[field.tsx](../../snippets/document-field/generated/cep/react/field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../../snippets/document-field/generated/cep/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.tsx">

[cep-form.tsx](../../snippets/document-field/generated/cep/react/cep-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/react&example=phone-field.tsx&usage=phone-form.tsx">

<div class="file" data-file="phone-field.tsx">

[phone-field.tsx](../../snippets/document-field/generated/phone/react/phone-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="field.tsx">

[field.tsx](../../snippets/document-field/generated/phone/react/field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../../snippets/document-field/generated/phone/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.tsx">

[phone-form.tsx](../../snippets/document-field/generated/phone/react/phone-form.tsx ':include :type=code tsx')

</div>

</div>

</div>

<div class="example" data-name="Angular">

Um `ControlValueAccessor`, então aceita `formControlName` (ou `formControl`, ou `ngModel`) como um input nativo, fica touched no blur e desabilita junto com o seu controle. O validador é um `ValidatorFn` no controle:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/angular&example=cpf-field.ts&usage=cpf-form.ts">

<div class="file" data-file="cpf-field.ts">

[cpf-field.ts](../../snippets/document-field/generated/cpf/angular/cpf-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="field.ts">

[field.ts](../../snippets/document-field/generated/cpf/angular/field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../../snippets/document-field/generated/cpf/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.ts">

[cpf-form.ts](../../snippets/document-field/generated/cpf/angular/cpf-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/angular&example=cnpj-field.ts&usage=cnpj-form.ts">

<div class="file" data-file="cnpj-field.ts">

[cnpj-field.ts](../../snippets/document-field/generated/cnpj/angular/cnpj-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="field.ts">

[field.ts](../../snippets/document-field/generated/cnpj/angular/field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../../snippets/document-field/generated/cnpj/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.ts">

[cnpj-form.ts](../../snippets/document-field/generated/cnpj/angular/cnpj-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/angular&example=cep-field.ts&usage=cep-form.ts">

<div class="file" data-file="cep-field.ts">

[cep-field.ts](../../snippets/document-field/generated/cep/angular/cep-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="field.ts">

[field.ts](../../snippets/document-field/generated/cep/angular/field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../../snippets/document-field/generated/cep/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.ts">

[cep-form.ts](../../snippets/document-field/generated/cep/angular/cep-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/angular&example=phone-field.ts&usage=phone-form.ts">

<div class="file" data-file="phone-field.ts">

[phone-field.ts](../../snippets/document-field/generated/phone/angular/phone-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="field.ts">

[field.ts](../../snippets/document-field/generated/phone/angular/field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../../snippets/document-field/generated/phone/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.ts">

[phone-form.ts](../../snippets/document-field/generated/phone/angular/phone-form.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Vue">

O valor é o `v-model` do componente (`defineModel`), que é onde o `defineField` do VeeValidate se liga, e a regra fica no schema do formulário:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/vue&example=cpf-field.vue&usage=cpf-form.vue">

<div class="file" data-file="cpf-field.vue">

[cpf-field.vue](../../snippets/document-field/generated/cpf/vue/cpf-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="field.vue">

[field.vue](../../snippets/document-field/generated/cpf/vue/field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../../snippets/document-field/generated/cpf/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.vue">

[cpf-form.vue](../../snippets/document-field/generated/cpf/vue/cpf-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/vue&example=cnpj-field.vue&usage=cnpj-form.vue">

<div class="file" data-file="cnpj-field.vue">

[cnpj-field.vue](../../snippets/document-field/generated/cnpj/vue/cnpj-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="field.vue">

[field.vue](../../snippets/document-field/generated/cnpj/vue/field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../../snippets/document-field/generated/cnpj/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.vue">

[cnpj-form.vue](../../snippets/document-field/generated/cnpj/vue/cnpj-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/vue&example=cep-field.vue&usage=cep-form.vue">

<div class="file" data-file="cep-field.vue">

[cep-field.vue](../../snippets/document-field/generated/cep/vue/cep-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="field.vue">

[field.vue](../../snippets/document-field/generated/cep/vue/field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../../snippets/document-field/generated/cep/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.vue">

[cep-form.vue](../../snippets/document-field/generated/cep/vue/cep-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/vue&example=phone-field.vue&usage=phone-form.vue">

<div class="file" data-file="phone-field.vue">

[phone-field.vue](../../snippets/document-field/generated/phone/vue/phone-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="field.vue">

[field.vue](../../snippets/document-field/generated/phone/vue/field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../../snippets/document-field/generated/phone/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.vue">

[phone-form.vue](../../snippets/document-field/generated/phone/vue/phone-form.vue ':include :type=code vue')

</div>

</div>

</div>

<div class="example" data-name="Vanilla">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN, aplica a máscara no `input` e valida no `submit`, levando o foco ao campo que recusou.

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?page=document-field/generated/cpf/vanilla/cpf-field.html">

<div class="file" data-file="cpf-field.html">

[cpf-field.html](../../snippets/document-field/generated/cpf/vanilla/cpf-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?page=document-field/generated/cnpj/vanilla/cnpj-field.html">

<div class="file" data-file="cnpj-field.html">

[cnpj-field.html](../../snippets/document-field/generated/cnpj/vanilla/cnpj-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?page=document-field/generated/cep/vanilla/cep-field.html">

<div class="file" data-file="cep-field.html">

[cep-field.html](../../snippets/document-field/generated/cep/vanilla/cep-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?page=document-field/generated/phone/vanilla/phone-field.html">

<div class="file" data-file="phone-field.html">

[phone-field.html](../../snippets/document-field/generated/phone/vanilla/phone-field.html ':include :type=code html')

</div>

</div>

</div>

A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
