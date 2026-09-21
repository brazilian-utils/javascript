---
title: "Estado e cidade"
description: "Escolha um estado e as cidades dele carregam sob demanda, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["select de estado e cidade", "cidades do IBGE", "getCities", "import lazy", "code splitting", "municípios de um estado"]
---

Escolha um estado e as cidades dele preenchem o segundo select. Escolha o framework: cada exemplo roda o código logo abaixo dele, que pode ser copiado do jeito que está.

O ponto aqui é quando cada tabela é carregada. Os estados são 27 linhas e vêm com a página, 2,5 KB; as cidades são 5.571, 154 KB, que ninguém deveria pagar antes de escolher um estado. Cada utilitário também é um subpath, então `import { getStates } from "@brazilian-utils/brazilian-utils/get-states"` custa só os estados, e as cidades chegam pelo `await import(".../get-cities")` na primeira vez que um estado é escolhido. O bundler transforma isso num chunk separado, e o browser busca uma vez e guarda.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=state-city/react&example=state-city.tsx">

Um hook busca a tabela e guarda as cidades; o componente só escolhe:

<div class="file" data-file="state-city.tsx">

[state-city.tsx](../../snippets/state-city/react/state-city.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-cities.ts">

[use-cities.ts](../../snippets/state-city/react/use-cities.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=state-city/angular&example=state-city.ts">

Um service busca a tabela, com `switchMap` descartando a que já não é do estado na tela:

<div class="file" data-file="state-city.ts">

[state-city.ts](../../snippets/state-city/angular/state-city.ts ':include :type=code ts')

</div>

<div class="file" data-file="cities.ts">

[cities.ts](../../snippets/state-city/angular/cities.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=state-city/vue&example=state-city.vue">

Um composable busca a tabela e guarda as cidades; o componente só escolhe:

<div class="file" data-file="state-city.vue">

[state-city.vue](../../snippets/state-city/vue/state-city.vue ':include :type=code vue')

</div>

<div class="file" data-file="use-cities.ts">

[use-cities.ts](../../snippets/state-city/vue/use-cities.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=state-city/vanilla/state-city.html">

Sem build: salve como um arquivo `.html` e abra. Cada subpath é um módulo próprio no CDN, então o browser busca as cidades só quando alguma é necessária.

<div class="file" data-file="state-city.html">

[state-city.html](../../snippets/state-city/vanilla/state-city.html ':include :type=code html')

</div>

</div>

A [introdução](pt-br/getting-started.md#bundle-size) lista todos os utilitários que embutem uma tabela e valem um subpath próprio.
