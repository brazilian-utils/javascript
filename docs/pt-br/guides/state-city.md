---
title: "Estado e cidade"
description: "Escolha um estado e as cidades dele carregam sob demanda, com Brazilian Utils em React, Angular, Vue e JavaScript puro."
keywords: ["select de estado e cidade", "cidades do IBGE", "getCities", "import lazy", "code splitting", "municípios de um estado"]
---

Escolha um estado e as cidades dele preenchem o segundo select. Escolha o framework: cada exemplo roda o código logo abaixo dele, que pode ser copiado do jeito que está.

O ponto aqui é quando cada tabela é carregada, e a resposta é: quando alguém abre o select que a mostra. Nem com a página, nem ao escolher um estado — num formulário em que a cidade vem preenchida de outro lugar, ou é deixada em branco, os 154 KB de cidades nunca são buscados. Os estados são 27 linhas, 2,5 KB; as cidades são 5.571, 154 KB. Cada utilitário é um subpath, então `await import("@brazilian-utils/brazilian-utils/get-cities")` busca essa tabela e nada mais. O bundler transforma isso num chunk separado, e o browser busca uma vez e guarda, então só a primeira abertura espera.


<div class="example" data-name="React" data-demo="/snippets/live/?dir=state-city/react&example=state-city.tsx">

Um hook por lista, cada um buscando sua tabela quando o `onFocus` avisa que o select foi aberto. As cidades são de um estado, então o que foi carregado só vale como as cidades da tela enquanto aquele estado for o escolhido:

<div class="file" data-file="state-city.tsx">

[state-city.tsx](../../snippets/state-city/react/state-city.tsx ':include :type=code tsx')

</div>

<div class="file" data-file="use-states.ts">

[use-states.ts](../../snippets/state-city/react/use-states.ts ':include :type=code ts')

</div>

<div class="file" data-file="use-cities-of-state.ts">

[use-cities-of-state.ts](../../snippets/state-city/react/use-cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Angular" data-demo="/snippets/live/?dir=state-city/angular&example=state-city.ts">

Um `resource` sem nada para perguntar espera, que é onde os dois começam; abrir o select dá a ele o que perguntar. As cidades são do estado para o qual foram pedidas, então escolher outro estado devolve esse resource à espera:

<div class="file" data-file="state-city.ts">

[state-city.ts](../../snippets/state-city/angular/state-city.ts ':include :type=code ts')

</div>

<div class="file" data-file="states.ts">

[states.ts](../../snippets/state-city/angular/states.ts ':include :type=code ts')

</div>

<div class="file" data-file="cities-of-state.ts">

[cities-of-state.ts](../../snippets/state-city/angular/cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vue" data-demo="/snippets/live/?dir=state-city/vue&example=state-city.vue">

Um composable por lista, cada um buscando sua tabela quando o `@focus` avisa que o select foi aberto. As cidades são de um estado, então o que foi carregado só vale como as cidades da tela enquanto aquele estado for o escolhido:

<div class="file" data-file="state-city.vue">

[state-city.vue](../../snippets/state-city/vue/state-city.vue ':include :type=code vue')

</div>

<div class="file" data-file="use-states.ts">

[use-states.ts](../../snippets/state-city/vue/use-states.ts ':include :type=code ts')

</div>

<div class="file" data-file="use-cities-of-state.ts">

[use-cities-of-state.ts](../../snippets/state-city/vue/use-cities-of-state.ts ':include :type=code ts')

</div>

</div>

<div class="example" data-name="Vanilla" data-demo="/snippets/live/?page=state-city/vanilla/state-city.html">

Sem build: salve como um arquivo `.html` e abra. Cada subpath é um módulo próprio no CDN, e o `import()` dentro de um listener de `focus` busca esse módulo na primeira vez que o select é aberto.

<div class="file" data-file="state-city.html">

[state-city.html](../../snippets/state-city/vanilla/state-city.html ':include :type=code html')

</div>

</div>

A [introdução](pt-br/getting-started.md#bundle-size) lista todos os utilitários que embutem uma tabela e valem um subpath próprio.
