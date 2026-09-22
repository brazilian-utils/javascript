---
title: "State and city"
description: "Pick a state and the cities of that state load on demand, with Brazilian Utils in React, Angular, Vue and plain JavaScript."
keywords: ["state and city select", "IBGE cities", "getCities", "lazy import", "code splitting", "municipalities of a state"]
---

Pick a state and its cities fill the second select. Pick the framework: each example runs the code below it, which you can copy as is.

The point of this one is when each table is loaded, and the answer is: when someone opens the select that shows it. Not with the page, and not when a state is picked either — a form where the city is filled in by something else, or left alone, never fetches 154 KB of cities. The states are 27 rows, 2.5 KB; the cities are 5,571 of them, 154 KB. Each util is its own subpath, so `await import("@brazilian-utils/brazilian-utils/get-cities")` fetches that table and nothing else. A bundler makes it a chunk of its own; the browser fetches it once and keeps it, so only the first opening waits.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=state-city/react&example=state-city.tsx">

One hook per list, each fetching its table when `onFocus` says the select was opened. The cities belong to a state, so what was loaded counts as the cities on screen only while that state is the one picked:

<div class="file" data-file="state-city.tsx">

[state-city.tsx](../snippets/state-city/react/state-city.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-states.ts">

[use-states.ts](../snippets/state-city/react/use-states.ts ':include :type=code ts')

</div>

<div class="file" data-file="use-cities-of-state.ts">

[use-cities-of-state.ts](../snippets/state-city/react/use-cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=state-city/angular&example=state-city.ts">

A `resource` with nothing to ask about waits, which is where both of these start; opening a select gives one something to ask about. The cities are about the state they were asked for, so picking another state puts that resource back to waiting:

<div class="file" data-file="state-city.ts">

[state-city.ts](../snippets/state-city/angular/state-city.ts ':include :type=code ts')

</div>

<div class="file" data-file="states.ts">

[states.ts](../snippets/state-city/angular/states.ts ':include :type=code ts')

</div>

<div class="file" data-file="cities-of-state.ts">

[cities-of-state.ts](../snippets/state-city/angular/cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=state-city/vue&example=state-city.vue">

One composable per list, each fetching its table when `@focus` says the select was opened. The cities belong to a state, so what was loaded counts as the cities on screen only while that state is the one picked:

<div class="file" data-file="state-city.vue">

[state-city.vue](../snippets/state-city/vue/state-city.vue ':include :type=code vue')

</div>

<div class="file" data-file="use-states.ts">

[use-states.ts](../snippets/state-city/vue/use-states.ts ':include :type=code ts')

</div>

<div class="file" data-file="use-cities-of-state.ts">

[use-cities-of-state.ts](../snippets/state-city/vue/use-cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=state-city/vanilla/state-city.html">

No build step: save it as an `.html` file and open it. Each subpath is its own module on the CDN, and `import()` inside a `focus` listener fetches it the first time the select is opened.

<div class="file" data-file="state-city.html">

[state-city.html](../snippets/state-city/vanilla/state-city.html ':include :type=code html')

</div>

</div>

The [getting started guide](../getting-started.md#bundle-size) lists every util that embeds a table and is worth a subpath of its own.
