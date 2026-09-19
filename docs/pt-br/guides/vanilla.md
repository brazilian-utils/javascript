---
title: "Uso com JavaScript puro"
description: "Valide e formate documentos brasileiros sem framework: máscaras de input em um formulário comum, validação no envio e esquemas de formulário com zod ou valibot, com exemplos executáveis."
keywords: ["vanilla", "JavaScript", "formulário", "máscara de input", "zod", "valibot", "tag script", "UMD", "CPF", "CNPJ", "CEP", "telefone"]
---

Não precisa de framework: cada função recebe um valor e retorna um valor. Os exemplos desta página são arquivos HTML completos que carregam o pacote de um CDN por um import map, então rodam como estão, no navegador ou em um arquivo no seu disco. Clique em **Executar** embaixo do código. Com um bundler, tire o import map e faça `npm install @brazilian-utils/brazilian-utils`.

## Carregar o pacote

Como módulo ES, com um import map (o que os exemplos abaixo fazem):

```html
<script type="importmap">
  { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
</script>
<script type="module">
  import { isValidCpf } from '@brazilian-utils/brazilian-utils';
  console.log(isValidCpf('123.456.789-09')); // true
</script>
```

Ou como script clássico, que expõe a global `BrazilianUtils`:

```html
<script src="https://unpkg.com/@brazilian-utils/brazilian-utils/dist/brazilian-utils.umd.cjs"></script>
<script>
  console.log(BrazilianUtils.isValidCpf('123.456.789-09')); // true
</script>
```

## Validar enquanto o usuário digita

Escute o evento `input` e consulte o validador. Ele aceita o valor com ou sem máscara, então não é preciso limpar nada antes.

```html
<!doctype html>
<html lang="pt-BR">
  <body>
    <label>
      CPF
      <input id="cpf" placeholder="000.000.000-00" inputmode="numeric" />
      <small id="status"></small>
    </label>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import { isValidCpf } from '@brazilian-utils/brazilian-utils';

      const input = document.querySelector('#cpf');
      const status = document.querySelector('#status');

      input.addEventListener('input', () => {
        status.textContent = input.value ? (isValidCpf(input.value) ? 'CPF válido' : 'CPF inválido') : '';
      });
    </script>
  </body>
</html>
```

## Formatar enquanto digita (máscara de input)

As funções `format*` aplicam a máscara até onde o valor vai, então escrever o valor formatado de volta a cada evento `input` já é uma máscara de input, sem biblioteca extra. Use `{ mask: 'nanp' }` para telefone com DDD.

```html
<!doctype html>
<html lang="pt-BR">
  <body>
    <form>
      <label>CPF <input name="cpf" placeholder="000.000.000-00" inputmode="numeric" /></label>
      <label>CNPJ <input name="cnpj" placeholder="00.000.000/0000-00" inputmode="numeric" /></label>
      <label>Telefone <input name="phone" placeholder="(00) 00000-0000" inputmode="numeric" /></label>
      <label>CEP <input name="cep" placeholder="00000-000" inputmode="numeric" /></label>
    </form>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import { formatCep, formatCnpj, formatCpf, formatPhone } from '@brazilian-utils/brazilian-utils';

      const masks = {
        cpf: formatCpf,
        cnpj: formatCnpj,
        phone: (value) => formatPhone(value, { mask: 'nanp' }),
        cep: formatCep,
      };

      for (const [name, format] of Object.entries(masks)) {
        const input = document.querySelector(`[name="${name}"]`);
        input.addEventListener('input', () => { input.value = format(input.value); });
      }
    </script>
  </body>
</html>
```

## Validar um formulário com zod

Coloque o validador em um `refine` e o parser em um `transform`: o esquema rejeita um documento inválido com a sua mensagem e entrega os dígitos de um válido, prontos para a API.

```html
<!doctype html>
<html lang="pt-BR">
  <body>
    <form id="signup" novalidate>
      <label>Nome <input name="name" /><small></small></label>
      <label>CPF <input name="cpf" /><small></small></label>
      <label>Telefone <input name="phone" /><small></small></label>
      <label>CEP <input name="cep" /><small></small></label>
      <button>Enviar</button>
    </form>
    <pre id="result"></pre>

    <script type="importmap">
      {
        "imports": {
          "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm",
          "zod": "https://cdn.jsdelivr.net/npm/zod@4.6.5/+esm"
        }
      }
    </script>
    <script type="module">
      import { z } from 'zod';
      import {
        isValidCep, isValidCpf, isValidPhone, parseCep, parseCpf, parsePhone,
      } from '@brazilian-utils/brazilian-utils';

      const schema = z.object({
        name: z.string().min(2, 'Informe o nome'),
        cpf: z.string().refine(isValidCpf, 'CPF inválido').transform(parseCpf),
        phone: z.string().refine((value) => isValidPhone(value), 'Telefone inválido').transform(parsePhone),
        cep: z.string().refine(isValidCep, 'CEP inválido').transform(parseCep),
      });

      const form = document.querySelector('#signup');
      const result = document.querySelector('#result');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const parsed = schema.safeParse(values);

        for (const small of form.querySelectorAll('small')) small.textContent = '';
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            form.querySelector(`[name="${issue.path[0]}"] + small`).textContent = issue.message;
          }
          result.textContent = '';
          return;
        }
        result.textContent = JSON.stringify(parsed.data, null, 2);
      });
    </script>
  </body>
</html>
```

## Validar um formulário com valibot

A mesma ideia no valibot: `check` para o validador, `transform` para o parser, `flatten` para ler as mensagens por campo.

```html
<!doctype html>
<html lang="pt-BR">
  <body>
    <form id="company" novalidate>
      <label>CPF <input name="cpf" /><small></small></label>
      <label>CNPJ <input name="cnpj" /><small></small></label>
      <button>Enviar</button>
    </form>
    <pre id="result"></pre>

    <script type="importmap">
      {
        "imports": {
          "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm",
          "valibot": "https://cdn.jsdelivr.net/npm/valibot@1.5.0/+esm"
        }
      }
    </script>
    <script type="module">
      import * as v from 'valibot';
      import { isValidCnpj, isValidCpf, parseCnpj, parseCpf } from '@brazilian-utils/brazilian-utils';

      const schema = v.object({
        cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido'), v.transform(parseCpf)),
        cnpj: v.pipe(v.string(), v.check((value) => isValidCnpj(value), 'CNPJ inválido'), v.transform(parseCnpj)),
      });

      const form = document.querySelector('#company');
      const result = document.querySelector('#result');

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const parsed = v.safeParse(schema, Object.fromEntries(new FormData(form)));

        for (const small of form.querySelectorAll('small')) small.textContent = '';
        if (!parsed.success) {
          for (const [field, messages] of Object.entries(v.flatten(parsed.issues).nested ?? {})) {
            form.querySelector(`[name="${field}"] + small`).textContent = messages[0];
          }
          result.textContent = '';
          return;
        }
        result.textContent = JSON.stringify(parsed.output, null, 2);
      });
    </script>
  </body>
</html>
```

## Formatar para exibição

Guarde os dígitos, formate na hora de renderizar. `formatCpf` pode esconder os dígitos como o gov.br faz, e `formatPhone` com `mask: 'auto'` escolhe o padrão certo a partir do próprio número.

```html
<!doctype html>
<html lang="pt-BR">
  <body>
    <dl id="receipt"></dl>

    <script type="importmap">
      { "imports": { "@brazilian-utils/brazilian-utils": "https://cdn.jsdelivr.net/npm/@brazilian-utils/brazilian-utils/+esm" } }
    </script>
    <script type="module">
      import {
        convertCurrencyToWords, formatCnpj, formatCpf, formatCurrency, formatPhone,
      } from '@brazilian-utils/brazilian-utils';

      const order = {
        customer: 'Maria da Silva',
        cpf: '12345678909',
        company: 'ACME LTDA',
        cnpj: '12345678000195',
        phone: '11987654321',
        total: 1234.56,
      };

      const rows = [
        ['Cliente', `${order.customer} (${formatCpf(order.cpf, { obfuscate: true })})`],
        ['Empresa', `${order.company}, CNPJ ${formatCnpj(order.cnpj)}`],
        ['Telefone', formatPhone(order.phone, { mask: 'auto' })],
        ['Total', `${formatCurrency(order.total, { symbol: true })} (${convertCurrencyToWords(order.total)})`],
      ];

      document.querySelector('#receipt').innerHTML = rows
        .map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`)
        .join('');
    </script>
  </body>
</html>
```

## Para onde ir depois

- A [referência de utilitários](pt-br/utilities.md) lista todas as funções com suas opções.
- Os mesmos padrões em [React](pt-br/guides/react.md), [Vue](pt-br/guides/vue.md) e [Angular](pt-br/guides/angular.md).
- Utilitários pesados como `getMunicipalities` merecem um import sob demanda; veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle).
