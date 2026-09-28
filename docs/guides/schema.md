---
title: "Schema libraries"
description: "The validators of Brazilian Utils inside a Zod, Valibot or ArkType schema, or as a Standard Schema of their own."
keywords: ["zod CPF", "valibot CPF", "arktype CPF", "Standard Schema", "toStandardSchema", "validate CNPJ schema"]
---

A validator goes straight into a schema: pick the document and the schema library. Nothing runs here, a schema is the same code everywhere.

Each of these builds the document on its own first, so it can be reused wherever a schema needs it, and composes it into a form afterwards. They all speak [Standard Schema](https://standardschema.dev), which is how a schema reaches a form library, and `toStandardSchema` gives one validator that same interface with no schema library at all.


<div class="example" data-name="Zod">

`refine` takes the validator as it is:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-zod.ts">

[cpf-zod.ts](../snippets/document-field/generated/cpf/schema/cpf-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-zod.ts">

[cnpj-zod.ts](../snippets/document-field/generated/cnpj/schema/cnpj-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-zod.ts">

[cep-zod.ts](../snippets/document-field/generated/cep/schema/cep-zod.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-zod.ts">

[phone-zod.ts](../snippets/document-field/generated/phone/schema/phone-zod.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Valibot">

`check` takes the validator inside a pipe:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-valibot.ts">

[cpf-valibot.ts](../snippets/document-field/generated/cpf/schema/cpf-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-valibot.ts">

[cnpj-valibot.ts](../snippets/document-field/generated/cnpj/schema/cnpj-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-valibot.ts">

[cep-valibot.ts](../snippets/document-field/generated/cep/schema/cep-valibot.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-valibot.ts">

[phone-valibot.ts](../snippets/document-field/generated/phone/schema/phone-valibot.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="ArkType">

`narrow` takes it, and says what the value must be when it says no:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-arktype.ts">

[cpf-arktype.ts](../snippets/document-field/generated/cpf/schema/cpf-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-arktype.ts">

[cnpj-arktype.ts](../snippets/document-field/generated/cnpj/schema/cnpj-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-arktype.ts">

[cep-arktype.ts](../snippets/document-field/generated/cep/schema/cep-arktype.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-arktype.ts">

[phone-arktype.ts](../snippets/document-field/generated/phone/schema/phone-arktype.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Standard Schema">

No schema library at all: `toStandardSchema` gives the validator the interface every form library speaks.

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-standard.ts">

[cpf-standard.ts](../snippets/document-field/generated/cpf/schema/cpf-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-standard.ts">

[cnpj-standard.ts](../snippets/document-field/generated/cnpj/schema/cnpj-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-standard.ts">

[cep-standard.ts](../snippets/document-field/generated/cep/schema/cep-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-standard.ts">

[phone-standard.ts](../snippets/document-field/generated/phone/schema/phone-standard.ts ':include :type=code ts')

</div>

</div>

</div>

The [utilities reference](../utilities.md#tostandardschema) documents `toStandardSchema` and the types of the specification.
