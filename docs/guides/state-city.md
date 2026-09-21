---
title: "State and city"
description: "Pick a state and the cities of that state load on demand, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["state and city select", "IBGE cities", "getCities", "lazy import", "code splitting", "municipalities of a state"]
---

Pick a state and its cities fill the second select. Pick the framework: each example runs the code below it, which you can copy as is.

The point of this one is when each table is loaded. The states are 27 rows and come with the page, 2.5 KB; the cities are 5,571 of them, 154 KB, which no one should pay for before picking a state. Each util is also its own subpath, so `import { getStates } from "@brazilian-utils/brazilian-utils/get-states"` costs the states alone, and the cities arrive through `await import(".../get-cities")` the first time a state is picked. A bundler makes that a chunk of its own; the browser fetches it once and keeps it.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=state-city/react&example=state-city.tsx">

State for the cities, and the import inside the change handler:

<div class="file" data-file="state-city.tsx">

[state-city.tsx](../snippets/state-city/react/state-city.tsx ':include :type=code tsx')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=state-city/angular&example=state-city.ts">

Signals for the cities and for the wait, and the import inside the change handler:

<div class="file" data-file="state-city.ts">

[state-city.ts](../snippets/state-city/angular/state-city.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=state-city/vue&example=state-city.vue">

Refs for the cities and for the wait, and the import inside the change handler:

<div class="file" data-file="state-city.vue">

[state-city.vue](../snippets/state-city/vue/state-city.vue ':include :type=code vue')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=state-city/vanilla/state-city.html">

No build step: save it as an `.html` file and open it. Each subpath is its own module on the CDN, so the browser fetches the cities only when one is needed.

<div class="file" data-file="state-city.html">

[state-city.html](../snippets/state-city/vanilla/state-city.html ':include :type=code html')

</div>

</div>

The [getting started guide](../getting-started.md#bundle-size) lists every util that embeds a table and is worth a subpath of its own.
