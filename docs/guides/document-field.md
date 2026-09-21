---
title: "Document field"
description: "A field that masks and validates a CPF, CNPJ, CEP or phone number as you type, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["CPF input mask", "CNPJ mask", "CEP mask", "phone mask", "React CPF", "Angular CPF", "Vue CPF", "validate CPF"]
---

A field that formats as you type, inside a form that validates. Pick the document and the framework: each example is only about that document, and runs the code below it, which you can copy as is.

The field only masks. It hands the form the value without its mask, with `parse*`, so the form holds `52998224725` and a submit sends that, and it shows the value back formatted. Validation belongs to the form, where the rest of the form's rules live, which also leaves one error message per field instead of two.

The `mask` function is the same in all of them, and it is all a mask needs. A formatter takes whatever has been typed so far, so it can run on every keystroke; replacing a field's value moves the caret to the end, so `mask` puts the caret back next to the character being edited. Formatting what comes before the caret is what says where it goes. A deleted separator becomes a deleted character, which the formatter would otherwise put straight back.


<div class="example" data-name="React">

The hook owns the input: it takes the formatter and the value the form holds, masks what is typed and says so through its own `onChange`. React never writes the input's value, which is what would undo a mask. The field takes the input's own props, so react-hook-form's `field` spreads into it as is:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/react&example=cpf-field.tsx&usage=cpf-form.tsx">

<div class="file" data-file="cpf-field.tsx">

[cpf-field.tsx](../snippets/document-field/generated/cpf/react/cpf-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../snippets/document-field/generated/cpf/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.tsx">

[cpf-form.tsx](../snippets/document-field/generated/cpf/react/cpf-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/react&example=cnpj-field.tsx&usage=cnpj-form.tsx">

<div class="file" data-file="cnpj-field.tsx">

[cnpj-field.tsx](../snippets/document-field/generated/cnpj/react/cnpj-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../snippets/document-field/generated/cnpj/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.tsx">

[cnpj-form.tsx](../snippets/document-field/generated/cnpj/react/cnpj-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/react&example=cep-field.tsx&usage=cep-form.tsx">

<div class="file" data-file="cep-field.tsx">

[cep-field.tsx](../snippets/document-field/generated/cep/react/cep-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../snippets/document-field/generated/cep/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.tsx">

[cep-form.tsx](../snippets/document-field/generated/cep/react/cep-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/react&example=phone-field.tsx&usage=phone-form.tsx">

<div class="file" data-file="phone-field.tsx">

[phone-field.tsx](../snippets/document-field/generated/phone/react/phone-field.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-mask.ts">

[use-mask.ts](../snippets/document-field/generated/phone/react/use-mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.tsx">

[phone-form.tsx](../snippets/document-field/generated/phone/react/phone-form.tsx ':include :type=code tsx')

</div>

</div>

</div>

<div class="example" data-name="Angular">

A `ControlValueAccessor`, so it takes `formControlName` (or `formControl`, or `ngModel`) like a native input, touched on blur and disabled with its control. The validator is a `ValidatorFn` on the control:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/angular&example=cpf-field.ts&usage=cpf-form.ts">

<div class="file" data-file="cpf-field.ts">

[cpf-field.ts](../snippets/document-field/generated/cpf/angular/cpf-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../snippets/document-field/generated/cpf/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.ts">

[cpf-form.ts](../snippets/document-field/generated/cpf/angular/cpf-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/angular&example=cnpj-field.ts&usage=cnpj-form.ts">

<div class="file" data-file="cnpj-field.ts">

[cnpj-field.ts](../snippets/document-field/generated/cnpj/angular/cnpj-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../snippets/document-field/generated/cnpj/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.ts">

[cnpj-form.ts](../snippets/document-field/generated/cnpj/angular/cnpj-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/angular&example=cep-field.ts&usage=cep-form.ts">

<div class="file" data-file="cep-field.ts">

[cep-field.ts](../snippets/document-field/generated/cep/angular/cep-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../snippets/document-field/generated/cep/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.ts">

[cep-form.ts](../snippets/document-field/generated/cep/angular/cep-form.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/angular&example=phone-field.ts&usage=phone-form.ts">

<div class="file" data-file="phone-field.ts">

[phone-field.ts](../snippets/document-field/generated/phone/angular/phone-field.ts ':include :type=code ts')

</div>

<div class="file" data-file="mask.directive.ts">

[mask.directive.ts](../snippets/document-field/generated/phone/angular/mask.directive.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.ts">

[phone-form.ts](../snippets/document-field/generated/phone/angular/phone-form.ts ':include :type=code ts')

</div>

</div>

</div>

<div class="example" data-name="Vue">

The value is the component's `v-model` (`defineModel`), which is what VeeValidate's `defineField` binds to, and the rule lives in the form's schema:

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?dir=document-field/generated/cpf/vue&example=cpf-field.vue&usage=cpf-form.vue">

<div class="file" data-file="cpf-field.vue">

[cpf-field.vue](../snippets/document-field/generated/cpf/vue/cpf-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../snippets/document-field/generated/cpf/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-form.vue">

[cpf-form.vue](../snippets/document-field/generated/cpf/vue/cpf-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?dir=document-field/generated/cnpj/vue&example=cnpj-field.vue&usage=cnpj-form.vue">

<div class="file" data-file="cnpj-field.vue">

[cnpj-field.vue](../snippets/document-field/generated/cnpj/vue/cnpj-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../snippets/document-field/generated/cnpj/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-form.vue">

[cnpj-form.vue](../snippets/document-field/generated/cnpj/vue/cnpj-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?dir=document-field/generated/cep/vue&example=cep-field.vue&usage=cep-form.vue">

<div class="file" data-file="cep-field.vue">

[cep-field.vue](../snippets/document-field/generated/cep/vue/cep-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../snippets/document-field/generated/cep/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-form.vue">

[cep-form.vue](../snippets/document-field/generated/cep/vue/cep-form.vue ':include :type=code vue')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?dir=document-field/generated/phone/vue&example=phone-field.vue&usage=phone-form.vue">

<div class="file" data-file="phone-field.vue">

[phone-field.vue](../snippets/document-field/generated/phone/vue/phone-field.vue ':include :type=code vue')

</div>

<div class="file" data-file="mask.ts">

[mask.ts](../snippets/document-field/generated/phone/vue/mask.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-form.vue">

[phone-form.vue](../snippets/document-field/generated/phone/vue/phone-form.vue ':include :type=code vue')

</div>

</div>

</div>

<div class="example" data-name="Vanilla">

No build step: save it as an `.html` file and open it. It imports the package from a CDN, masks on `input` and validates on `submit`, moving focus to the field it rejects.

<div class="variant" data-variant="CPF" data-demo="/snippets/live/?page=document-field/generated/cpf/vanilla/cpf-field.html">

<div class="file" data-file="cpf-field.html">

[cpf-field.html](../snippets/document-field/generated/cpf/vanilla/cpf-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CNPJ" data-demo="/snippets/live/?page=document-field/generated/cnpj/vanilla/cnpj-field.html">

<div class="file" data-file="cnpj-field.html">

[cnpj-field.html](../snippets/document-field/generated/cnpj/vanilla/cnpj-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="CEP" data-demo="/snippets/live/?page=document-field/generated/cep/vanilla/cep-field.html">

<div class="file" data-file="cep-field.html">

[cep-field.html](../snippets/document-field/generated/cep/vanilla/cep-field.html ':include :type=code html')

</div>

</div>

<div class="variant" data-variant="Phone" data-demo="/snippets/live/?page=document-field/generated/phone/vanilla/phone-field.html">

<div class="file" data-file="phone-field.html">

[phone-field.html](../snippets/document-field/generated/phone/vanilla/phone-field.html ':include :type=code html')

</div>

</div>

</div>

<div class="example" data-name="Schema">

No demo here: a schema is the same code everywhere. Any of these plugs into the form libraries of the other tabs through [Standard Schema](https://standardschema.dev), which all of them speak, and `toStandardSchema` gives one field the same interface with no schema library at all:

<div class="variant" data-variant="CPF">

<div class="file" data-file="cpf-zod.ts">

[cpf-zod.ts](../snippets/document-field/generated/cpf/schema/cpf-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-valibot.ts">

[cpf-valibot.ts](../snippets/document-field/generated/cpf/schema/cpf-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-arktype.ts">

[cpf-arktype.ts](../snippets/document-field/generated/cpf/schema/cpf-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cpf-standard.ts">

[cpf-standard.ts](../snippets/document-field/generated/cpf/schema/cpf-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CNPJ">

<div class="file" data-file="cnpj-zod.ts">

[cnpj-zod.ts](../snippets/document-field/generated/cnpj/schema/cnpj-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-valibot.ts">

[cnpj-valibot.ts](../snippets/document-field/generated/cnpj/schema/cnpj-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-arktype.ts">

[cnpj-arktype.ts](../snippets/document-field/generated/cnpj/schema/cnpj-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cnpj-standard.ts">

[cnpj-standard.ts](../snippets/document-field/generated/cnpj/schema/cnpj-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="CEP">

<div class="file" data-file="cep-zod.ts">

[cep-zod.ts](../snippets/document-field/generated/cep/schema/cep-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-valibot.ts">

[cep-valibot.ts](../snippets/document-field/generated/cep/schema/cep-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-arktype.ts">

[cep-arktype.ts](../snippets/document-field/generated/cep/schema/cep-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="cep-standard.ts">

[cep-standard.ts](../snippets/document-field/generated/cep/schema/cep-standard.ts ':include :type=code ts')

</div>

</div>

<div class="variant" data-variant="Phone">

<div class="file" data-file="phone-zod.ts">

[phone-zod.ts](../snippets/document-field/generated/phone/schema/phone-zod.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-valibot.ts">

[phone-valibot.ts](../snippets/document-field/generated/phone/schema/phone-valibot.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-arktype.ts">

[phone-arktype.ts](../snippets/document-field/generated/phone/schema/phone-arktype.ts ':include :type=code ts')

</div>

<div class="file" data-file="phone-standard.ts">

[phone-standard.ts](../snippets/document-field/generated/phone/schema/phone-standard.ts ':include :type=code ts')

</div>

</div>

</div>

The [utilities reference](utilities.md) lists every function.
