---
title: "Campo de documento"
description: "Um campo que aplica máscara e valida CPF, CNPJ, CEP ou telefone enquanto você digita, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["máscara de CPF", "máscara de CNPJ", "máscara de CEP", "máscara de telefone", "CPF React", "CPF Angular", "CPF Vue", "validar CPF"]
---

Um campo que formata enquanto você digita, dentro de um formulário que valida. Escolha o documento e o framework: cada exemplo é só sobre aquele documento, e roda o código logo abaixo dele, que pode ser copiado do jeito que está.

O campo só aplica a máscara. Ele entrega ao formulário o valor sem máscara, com `parse*`, então o formulário guarda `52998224725` e é isso que o envio manda, e mostra o valor de volta formatado. Validar é trabalho do formulário, onde moram as outras regras dele, o que também deixa uma mensagem de erro por campo em vez de duas.

A função `mask` é a mesma em todos, e é tudo que uma máscara precisa. Um formatter aceita o que já foi digitado, então pode rodar a cada tecla; trocar o valor do campo joga o cursor para o fim, então o `mask` devolve o cursor para perto do caractere que está sendo editado. Formatar o que vem antes do cursor é o que diz para onde ele vai. Um separador apagado vira um caractere apagado, que o formatter recolocaria na hora.


<div class="example" data-name="React">

Um componente controlado: o formulário guarda o valor e passa `value` e `onChange`. Ele também aceita as props do próprio input, então o `field` do react-hook-form entra inteiro, e as regras ficam no formulário:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.tsx&usage=cpf-form.tsx">

<div class="file" data-file="cpf-field.tsx">

[cpf-field.tsx](../../snippets/document-field/generated/cpf/cpf-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="cpf-form.tsx">

[cpf-form.tsx](../../snippets/document-field/generated/cpf/cpf-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.tsx&usage=cnpj-form.tsx">

<div class="file" data-file="cnpj-field.tsx">

[cnpj-field.tsx](../../snippets/document-field/generated/cnpj/cnpj-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="cnpj-form.tsx">

[cnpj-form.tsx](../../snippets/document-field/generated/cnpj/cnpj-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.tsx&usage=cep-form.tsx">

<div class="file" data-file="cep-field.tsx">

[cep-field.tsx](../../snippets/document-field/generated/cep/cep-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="cep-form.tsx">

[cep-form.tsx](../../snippets/document-field/generated/cep/cep-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.tsx&usage=phone-form.tsx">

<div class="file" data-file="phone-field.tsx">

[phone-field.tsx](../../snippets/document-field/generated/phone/phone-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="phone-form.tsx">

[phone-form.tsx](../../snippets/document-field/generated/phone/phone-form.tsx ':include :type=code tsx')

</div>

</div>

</div>

<div class="example" data-name="Angular">

Um `ControlValueAccessor`, então aceita `formControlName` (ou `formControl`, ou `ngModel`) como um input nativo, fica touched no blur e desabilita junto com o seu controle. O validador é um `ValidatorFn` no controle:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.ts&usage=cpf-form.ts">

<div class="file" data-file="cpf-field.ts">

[cpf-field.ts](../../snippets/document-field/generated/cpf/cpf-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.ts">

[cpf-form.ts](../../snippets/document-field/generated/cpf/cpf-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.ts&usage=cnpj-form.ts">

<div class="file" data-file="cnpj-field.ts">

[cnpj-field.ts](../../snippets/document-field/generated/cnpj/cnpj-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.ts">

[cnpj-form.ts](../../snippets/document-field/generated/cnpj/cnpj-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.ts&usage=cep-form.ts">

<div class="file" data-file="cep-field.ts">

[cep-field.ts](../../snippets/document-field/generated/cep/cep-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.ts">

[cep-form.ts](../../snippets/document-field/generated/cep/cep-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.ts&usage=phone-form.ts">

<div class="file" data-file="phone-field.ts">

[phone-field.ts](../../snippets/document-field/generated/phone/phone-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.ts">

[phone-form.ts](../../snippets/document-field/generated/phone/phone-form.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Vue">

O valor é o `v-model` do componente (`defineModel`), que é onde o `defineField` do VeeValidate se liga, e a regra fica no schema do formulário:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.vue&usage=cpf-form.vue">

<div class="file" data-file="cpf-field.vue">

[cpf-field.vue](../../snippets/document-field/generated/cpf/cpf-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="cpf-form.vue">

[cpf-form.vue](../../snippets/document-field/generated/cpf/cpf-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.vue&usage=cnpj-form.vue">

<div class="file" data-file="cnpj-field.vue">

[cnpj-field.vue](../../snippets/document-field/generated/cnpj/cnpj-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="cnpj-form.vue">

[cnpj-form.vue](../../snippets/document-field/generated/cnpj/cnpj-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.vue&usage=cep-form.vue">

<div class="file" data-file="cep-field.vue">

[cep-field.vue](../../snippets/document-field/generated/cep/cep-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="cep-form.vue">

[cep-form.vue](../../snippets/document-field/generated/cep/cep-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.vue&usage=phone-form.vue">

<div class="file" data-file="phone-field.vue">

[phone-field.vue](../../snippets/document-field/generated/phone/phone-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="phone-form.vue">

[phone-form.vue](../../snippets/document-field/generated/phone/phone-form.vue ':include :type=code vue')

</div>

</div>

</div>

<div class="example" data-name="Vanilla">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN, aplica a máscara no `input` e valida no `submit`, levando o foco ao campo que recusou.

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?page=document-field/generated/cpf/cpf-field.html">

<div class="file" data-file="cpf-field.html">

[cpf-field.html](../../snippets/document-field/generated/cpf/cpf-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?page=document-field/generated/cnpj/cnpj-field.html">

<div class="file" data-file="cnpj-field.html">

[cnpj-field.html](../../snippets/document-field/generated/cnpj/cnpj-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?page=document-field/generated/cep/cep-field.html">

<div class="file" data-file="cep-field.html">

[cep-field.html](../../snippets/document-field/generated/cep/cep-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?page=document-field/generated/phone/phone-field.html">

<div class="file" data-file="phone-field.html">

[phone-field.html](../../snippets/document-field/generated/phone/phone-field.html ':include :type=code html')

</div>

</div>

</div>

<div class="example" data-name="Schema">

Aqui não tem demo: um schema é o mesmo código em qualquer lugar. Qualquer um deles entra nas bibliotecas de formulário das outras abas via [Standard Schema](https://standardschema.dev), que todas elas falam, e o `toStandardSchema` dá a mesma interface a um campo só, sem nenhuma biblioteca de schema:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-zod.ts">

[cpf-zod.ts](../../snippets/document-field/generated/cpf/cpf-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-valibot.ts">

[cpf-valibot.ts](../../snippets/document-field/generated/cpf/cpf-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-arktype.ts">

[cpf-arktype.ts](../../snippets/document-field/generated/cpf/cpf-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-standard.ts">

[cpf-standard.ts](../../snippets/document-field/generated/cpf/cpf-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-zod.ts">

[cnpj-zod.ts](../../snippets/document-field/generated/cnpj/cnpj-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-valibot.ts">

[cnpj-valibot.ts](../../snippets/document-field/generated/cnpj/cnpj-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-arktype.ts">

[cnpj-arktype.ts](../../snippets/document-field/generated/cnpj/cnpj-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-standard.ts">

[cnpj-standard.ts](../../snippets/document-field/generated/cnpj/cnpj-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-zod.ts">

[cep-zod.ts](../../snippets/document-field/generated/cep/cep-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-valibot.ts">

[cep-valibot.ts](../../snippets/document-field/generated/cep/cep-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-arktype.ts">

[cep-arktype.ts](../../snippets/document-field/generated/cep/cep-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-standard.ts">

[cep-standard.ts](../../snippets/document-field/generated/cep/cep-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-zod.ts">

[phone-zod.ts](../../snippets/document-field/generated/phone/phone-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-valibot.ts">

[phone-valibot.ts](../../snippets/document-field/generated/phone/phone-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-arktype.ts">

[phone-arktype.ts](../../snippets/document-field/generated/phone/phone-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-standard.ts">

[phone-standard.ts](../../snippets/document-field/generated/phone/phone-standard.ts ':include :type=code ts')

</div>

</div>

</div>

A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
