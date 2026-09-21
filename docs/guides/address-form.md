---
title: "Address from a CEP"
description: "A form that looks the CEP up and fills the street, neighborhood, city and state, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["CEP lookup", "address by CEP", "autofill address", "getAddressInfoByCep", "React CEP", "Angular CEP", "Vue CEP"]
---

Type a CEP and the rest of the address fills itself. Pick the framework: each example runs the code below it, which you can copy as is.

`getAddressInfoByCep` asks the CEP providers and returns the street, neighborhood, city and state, or throws when no one has that CEP. It is asked only once `isValidCep` says the CEP is complete, so a request is not made on every keystroke, and what comes back stays editable: a lookup fills a form, it does not own it. The [document field guide](document-field.md) has the mask that keeps the caret where it belongs.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=address-form/react&example=address-form.tsx">

State for the CEP and for the address, and the lookup in the change handler:

<div class="file" data-file="address-form.tsx">

[address-form.tsx](../snippets/address-form/react/address-form.tsx ':include :type=code tsx')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=address-form/angular&example=address-form.ts">

A reactive form, filled with `patchValue` when the lookup answers:

<div class="file" data-file="address-form.ts">

[address-form.ts](../snippets/address-form/angular/address-form.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=address-form/vue&example=address-form.vue">

A `reactive` address, filled with `Object.assign` when the lookup answers:

<div class="file" data-file="address-form.vue">

[address-form.vue](../snippets/address-form/vue/address-form.vue ':include :type=code vue')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=address-form/vanilla/address-form.html">

No build step: save it as an `.html` file and open it. It imports the package from a CDN and fills the form's own elements.

<div class="file" data-file="address-form.html">

[address-form.html](../snippets/address-form/vanilla/address-form.html ':include :type=code html')

</div>

</div>

The [utilities reference](../utilities.md) documents `getAddressInfoByCep`, its providers and what it throws.
