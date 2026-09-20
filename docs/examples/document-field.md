---
title: "Document field"
description: "A field that masks and validates a CPF, CNPJ, CEP or phone number as you type, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["CPF input mask", "CNPJ mask", "CEP mask", "phone mask", "React CPF", "Angular CPF", "Vue CPF", "validate CPF"]
---

A field that formats as you type and validates once the value is complete. Pick the document and the framework: each example is only about that document, and runs the code below it, which you can copy as is.

The `mask` function is the same in all of them, and it is all a mask needs. A formatter takes whatever has been typed so far, so it can run on every keystroke; replacing a field's value moves the caret to the end, so `mask` puts the caret back next to the character being edited. Formatting what comes before the caret is what says where it goes. A deleted separator becomes a deleted character, which the formatter would otherwise put straight back.


<div class="example" data-name="React">

A controlled component: the parent holds the value and passes `value` and `onChange`. It also takes the input's own props, so react-hook-form's `field` spreads into it as is:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.tsx&usage=cpf-form.tsx">

[cpf-field.tsx](../snippets/document-field/generated/cpf/cpf-field.tsx ':include :type=code tsx')

[cpf-form.tsx](../snippets/document-field/generated/cpf/cpf-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.tsx&usage=cnpj-form.tsx">

[cnpj-field.tsx](../snippets/document-field/generated/cnpj/cnpj-field.tsx ':include :type=code tsx')

[cnpj-form.tsx](../snippets/document-field/generated/cnpj/cnpj-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.tsx&usage=cep-form.tsx">

[cep-field.tsx](../snippets/document-field/generated/cep/cep-field.tsx ':include :type=code tsx')

[cep-form.tsx](../snippets/document-field/generated/cep/cep-form.tsx ':include :type=code tsx')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.tsx&usage=phone-form.tsx">

[phone-field.tsx](../snippets/document-field/generated/phone/phone-field.tsx ':include :type=code tsx')

[phone-form.tsx](../snippets/document-field/generated/phone/phone-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="example" data-name="Angular">

A `ControlValueAccessor`, so it takes `formControlName` (or `formControl`, or `ngModel`) like a native input, touched on blur and disabled with its control:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.ts&usage=cpf-form.ts">

[cpf-field.ts](../snippets/document-field/generated/cpf/cpf-field.ts ':include :type=code ts')

[cpf-form.ts](../snippets/document-field/generated/cpf/cpf-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.ts&usage=cnpj-form.ts">

[cnpj-field.ts](../snippets/document-field/generated/cnpj/cnpj-field.ts ':include :type=code ts')

[cnpj-form.ts](../snippets/document-field/generated/cnpj/cnpj-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.ts&usage=cep-form.ts">

[cep-field.ts](../snippets/document-field/generated/cep/cep-field.ts ':include :type=code ts')

[cep-form.ts](../snippets/document-field/generated/cep/cep-form.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.ts&usage=phone-form.ts">

[phone-field.ts](../snippets/document-field/generated/phone/phone-field.ts ':include :type=code ts')

[phone-form.ts](../snippets/document-field/generated/phone/phone-form.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue">

The value is the component's `v-model` (`defineModel`), which is what VeeValidate's `defineField` binds to:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf&example=cpf-field.vue&usage=cpf-form.vue">

[cpf-field.vue](../snippets/document-field/generated/cpf/cpf-field.vue ':include :type=code vue')

[cpf-form.vue](../snippets/document-field/generated/cpf/cpf-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj&example=cnpj-field.vue&usage=cnpj-form.vue">

[cnpj-field.vue](../snippets/document-field/generated/cnpj/cnpj-field.vue ':include :type=code vue')

[cnpj-form.vue](../snippets/document-field/generated/cnpj/cnpj-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep&example=cep-field.vue&usage=cep-form.vue">

[cep-field.vue](../snippets/document-field/generated/cep/cep-field.vue ':include :type=code vue')

[cep-form.vue](../snippets/document-field/generated/cep/cep-form.vue ':include :type=code vue')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone&example=phone-field.vue&usage=phone-form.vue">

[phone-field.vue](../snippets/document-field/generated/phone/phone-field.vue ':include :type=code vue')

[phone-form.vue](../snippets/document-field/generated/phone/phone-form.vue ':include :type=code vue')

</div>

</div>

<div class="example" data-name="Vanilla">

No build step: save it as an `.html` file and open it. It imports the package from a CDN and calls `setCustomValidity`, so the form refuses to submit an invalid value.

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?page=document-field/generated/cpf/cpf-field.html">

[cpf-field.html](../snippets/document-field/generated/cpf/cpf-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?page=document-field/generated/cnpj/cnpj-field.html">

[cnpj-field.html](../snippets/document-field/generated/cnpj/cnpj-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?page=document-field/generated/cep/cep-field.html">

[cep-field.html](../snippets/document-field/generated/cep/cep-field.html ':include :type=code html')

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?page=document-field/generated/phone/phone-field.html">

[phone-field.html](../snippets/document-field/generated/phone/phone-field.html ':include :type=code html')

</div>

</div>

<div class="example" data-name="Schema">

No demo here: a schema is the same code everywhere. Any of these plugs into the form libraries of the other tabs through [Standard Schema](https://standardschema.dev), which all of them speak, and `toStandardSchema` gives one field the same interface with no schema library at all:

<div class="variant" data-variant="CPF">

[cpf-zod.ts](../snippets/document-field/generated/cpf/cpf-zod.ts ':include :type=code ts')

[cpf-valibot.ts](../snippets/document-field/generated/cpf/cpf-valibot.ts ':include :type=code ts')

[cpf-arktype.ts](../snippets/document-field/generated/cpf/cpf-arktype.ts ':include :type=code ts')

[cpf-standard.ts](../snippets/document-field/generated/cpf/cpf-standard.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CNPJ">

[cnpj-zod.ts](../snippets/document-field/generated/cnpj/cnpj-zod.ts ':include :type=code ts')

[cnpj-valibot.ts](../snippets/document-field/generated/cnpj/cnpj-valibot.ts ':include :type=code ts')

[cnpj-arktype.ts](../snippets/document-field/generated/cnpj/cnpj-arktype.ts ':include :type=code ts')

[cnpj-standard.ts](../snippets/document-field/generated/cnpj/cnpj-standard.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="CEP">

[cep-zod.ts](../snippets/document-field/generated/cep/cep-zod.ts ':include :type=code ts')

[cep-valibot.ts](../snippets/document-field/generated/cep/cep-valibot.ts ':include :type=code ts')

[cep-arktype.ts](../snippets/document-field/generated/cep/cep-arktype.ts ':include :type=code ts')

[cep-standard.ts](../snippets/document-field/generated/cep/cep-standard.ts ':include :type=code ts')

</div>

<div class="variant" data-variant="Phone">

[phone-zod.ts](../snippets/document-field/generated/phone/phone-zod.ts ':include :type=code ts')

[phone-valibot.ts](../snippets/document-field/generated/phone/phone-valibot.ts ':include :type=code ts')

[phone-arktype.ts](../snippets/document-field/generated/phone/phone-arktype.ts ':include :type=code ts')

[phone-standard.ts](../snippets/document-field/generated/phone/phone-standard.ts ':include :type=code ts')

</div>

</div>

The [utilities reference](utilities.md) lists every function.
