---
title: "Document field"
description: "One field that masks and validates CPF, CNPJ, CEP or a phone number as you type, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["CPF input mask", "CNPJ mask", "CEP mask", "phone mask", "React CPF", "Angular CPF", "Vue CPF", "validate CPF"]
---

One field for any of the documents, picked from the select: it formats as you type and validates once the value is complete. Each tab runs the code below it, which you can copy as is.

The field is generic: a small map gives each document its label, its complete format, its `format*` and its `isValid*`, so adding another one is four lines. Formatting a field's value moves the caret to the end, so `mask` puts the caret back next to the character being edited, and turns a deleted separator into a deleted character, which the formatter would otherwise put straight back. The caret comes out of the formatter itself: whatever is typed before the caret, formatted, is as long as the caret's new position.


<div class="example" data-name="React" data-demo="/snippets/live/document-field-react.html">

A controlled component: the parent holds the value and passes `value` and `onChange`. It also takes the input's own props, so react-hook-form's `field` spreads into it as is:

[document-field.tsx](../snippets/document-field/document-field.tsx ':include :type=code tsx')

[document-form.tsx](../snippets/document-field/document-form.tsx ':include :type=code tsx')

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/document-field-angular.html">

A `ControlValueAccessor`, so it takes `formControlName` (or `formControl`, or `ngModel`) like a native input, touched on blur and disabled with its control:

[document-field.ts](../snippets/document-field/document-field.ts ':include :type=code ts')

[document-form.ts](../snippets/document-field/document-form.ts ':include :type=code ts')

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/document-field-vue.html">

The value is the component's `v-model` (`defineModel`), which is what VeeValidate's `defineField` binds to:

[document-field.vue](../snippets/document-field/document-field.vue ':include :type=code vue')

[document-form.vue](../snippets/document-field/document-form.vue ':include :type=code vue')

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/document-field/document-field.html">

No build step: save it as an `.html` file and open it. It imports the package from a CDN and calls `setCustomValidity`, so the form refuses to submit an invalid document.

[document-field.html](../snippets/document-field/document-field.html ':include :type=code html')

</div>


The [utilities reference](utilities.md) lists every function.
