---
title: "Exemplos"
description: "Um campo de CPF que formata enquanto você digita e valida o resultado, com Brazilian Utils em React, Vue, Angular e JavaScript puro."
keywords: ["exemplos", "máscara de CPF", "CPF React", "CPF Vue", "CPF Angular", "formatar CPF ao digitar", "validar CPF"]
---

Um campo só faz as duas coisas: `formatCpf` formata o que já foi digitado (`"9438"` vira `"943.8"`, letras são descartadas e dígitos além do décimo primeiro são cortados), e `isValidCpf` confere o resultado quando ele está completo.

## Experimente

<iframe src="/snippets/cpf-field.html" title="Campo de CPF ao vivo" loading="lazy" width="100%" height="40" style="border: 0; border-radius: 6px; background: #fff"></iframe>

## React

[cpf-field.jsx](../snippets/cpf-field.jsx ':include :type=code jsx')

## Vue

[cpf-field.vue](../snippets/cpf-field.vue ':include :type=code html')

Atribuir `event.target.value` de novo mantém o campo em sincronia quando uma tecla não muda o valor formatado, como uma letra.

## Angular

[cpf-field.component.ts](../snippets/cpf-field.component.ts ':include :type=code ts')

## JavaScript puro

Sem build: o pacote é importado direto de um CDN.

[cpf-field.html](../snippets/cpf-field.html ':include :type=code html')

O mesmo campo serve para CNPJ (`formatCnpj` e `isValidCnpj`, completo com 18 caracteres) ou CEP (`formatCep` e `isValidCep`, completo com 9). A [referência de utilitários](pt-br/utilities.md) lista todas as funções.
