---
title: "Um schema para um documento"
description: "Os validadores do Brazilian Utils dentro de um schema do Zod, do Valibot ou do ArkType, ou como um Standard Schema próprio."
keywords: ["zod CPF", "valibot CPF", "arktype CPF", "Standard Schema", "toStandardSchema", "validar CNPJ schema"]
---

Um validador entra direto num schema: escolha o documento e a biblioteca. Aqui não roda nada, um schema é o mesmo código em qualquer lugar.

Cada um deles monta o documento sozinho primeiro, para ser reaproveitado onde um schema precisar dele, e depois compõe num formulário. Todos falam [Standard Schema](https://standardschema.dev), que é como um schema chega a uma biblioteca de formulário, e o `toStandardSchema` dá essa mesma interface a um validador sem nenhuma biblioteca de schema.


<div class="example" data-name="Zod">

O `refine` recebe o validador como ele é:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-zod.ts">

[cpf-zod.ts](../../snippets/document-field/generated/cpf/schema/cpf-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-zod.ts">

[cnpj-zod.ts](../../snippets/document-field/generated/cnpj/schema/cnpj-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-zod.ts">

[cep-zod.ts](../../snippets/document-field/generated/cep/schema/cep-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-zod.ts">

[phone-zod.ts](../../snippets/document-field/generated/phone/schema/phone-zod.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Valibot">

O `check` recebe o validador dentro de um pipe:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-valibot.ts">

[cpf-valibot.ts](../../snippets/document-field/generated/cpf/schema/cpf-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-valibot.ts">

[cnpj-valibot.ts](../../snippets/document-field/generated/cnpj/schema/cnpj-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-valibot.ts">

[cep-valibot.ts](../../snippets/document-field/generated/cep/schema/cep-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-valibot.ts">

[phone-valibot.ts](../../snippets/document-field/generated/phone/schema/phone-valibot.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="ArkType">

O `narrow` recebe ele, e diz o que o valor tem que ser quando recusa:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-arktype.ts">

[cpf-arktype.ts](../../snippets/document-field/generated/cpf/schema/cpf-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-arktype.ts">

[cnpj-arktype.ts](../../snippets/document-field/generated/cnpj/schema/cnpj-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-arktype.ts">

[cep-arktype.ts](../../snippets/document-field/generated/cep/schema/cep-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-arktype.ts">

[phone-arktype.ts](../../snippets/document-field/generated/phone/schema/phone-arktype.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Standard Schema">

Sem biblioteca de schema nenhuma: o `toStandardSchema` dá ao validador a interface que toda biblioteca de formulário fala.

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-standard.ts">

[cpf-standard.ts](../../snippets/document-field/generated/cpf/schema/cpf-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-standard.ts">

[cnpj-standard.ts](../../snippets/document-field/generated/cnpj/schema/cnpj-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-standard.ts">

[cep-standard.ts](../../snippets/document-field/generated/cep/schema/cep-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-standard.ts">

[phone-standard.ts](../../snippets/document-field/generated/phone/schema/phone-standard.ts ':include :type=code ts')

</div>

</div>

</div>

A [referência de utilitários](pt-br/utilities.md#tostandardschema) documenta o `toStandardSchema` e os tipos da especificação.
