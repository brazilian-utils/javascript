---
title: "Endereço pelo CEP"
description: "Um formulário que consulta o CEP e preenche rua, bairro, cidade e estado, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["consulta de CEP", "endereço pelo CEP", "preencher endereço", "getAddressInfoByCep", "CEP React", "CEP Angular", "CEP Vue"]
---

Digite um CEP e o resto do endereço se preenche. Escolha o framework: cada exemplo roda o código logo abaixo dele, que pode ser copiado do jeito que está.

O `getAddressInfoByCep` pergunta aos provedores de CEP e devolve rua, bairro, cidade e estado, ou lança quando ninguém tem aquele CEP. Ele só é chamado quando o `isValidCep` diz que o CEP está completo, então não sai uma requisição a cada tecla, e o que volta continua editável: a consulta preenche o formulário, não toma conta dele. O [guia do campo de documento](pt-br/guides/document-field.md) tem a máscara que mantém o cursor no lugar.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=address-form/react&example=address-form.tsx">

Um hook recebe o CEP e devolve o que se sabe sobre ele; o formulário desenha isso. O campo de CEP é o que o [guia do campo de documento](pt-br/guides/document-field.md) constrói:

<div class="file" data-file="address-form.tsx">

[address-form.tsx](../../snippets/address-form/react/address-form.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-get-address-by-cep.ts">

[use-get-address-by-cep.ts](../../snippets/address-form/react/use-get-address-by-cep.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=address-form/angular&example=address-form.ts">

Um `resource` recebe o CEP e devolve o que se sabe sobre ele, recarregando quando ele muda. O campo de CEP é o que o [guia do campo de documento](pt-br/guides/document-field.md) constrói:

<div class="file" data-file="address-form.ts">

[address-form.ts](../../snippets/address-form/angular/address-form.ts ':include :type=code ts')

</div>

<div class="file" data-file="address-by-cep.ts">

[address-by-cep.ts](../../snippets/address-form/angular/address-by-cep.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=address-form/vue&example=address-form.vue">

Um composable recebe o CEP e devolve o que se sabe sobre ele; o formulário desenha isso. O campo de CEP é o que o [guia do campo de documento](pt-br/guides/document-field.md) constrói:

<div class="file" data-file="address-form.vue">

[address-form.vue](../../snippets/address-form/vue/address-form.vue ':include :type=code vue')

</div>

<div class="file" data-file="use-get-address-by-cep.ts">

[use-get-address-by-cep.ts](../../snippets/address-form/vue/use-get-address-by-cep.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=address-form/vanilla/address-form.html">

Sem build: salve como um arquivo `.html` e abra. Ele importa o pacote de um CDN e descarta a resposta de um CEP que já não é o do campo.

<div class="file" data-file="address-form.html">

[address-form.html](../../snippets/address-form/vanilla/address-form.html ':include :type=code html')

</div>

</div>

A [referência de utilitários](pt-br/utilities.md) documenta o `getAddressInfoByCep`, os provedores e o que ele lança.
