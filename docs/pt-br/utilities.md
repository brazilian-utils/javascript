---
title: "Utilitários"
description: "Todos os utilitários do Brazilian Utils, agrupados por família (CPF, CNPJ, CEP, boleto, Pix e mais), com opções, exemplos e casos de borda."
keywords: ["CPF", "CNPJ", "CEP", "boleto", "Pix", "NF-e", "telefone", "placa", "RENAVAM", "PIS", "CNH", "IBAN", "feriados", "dias úteis", "CBO", "CNAE", "NCM", "CFOP", "validador", "formatador", "parser", "gerador"]
---

Todas as funções do pacote, agrupadas por família. Cada seção diz o que a função faz, quais são as opções, o que ela retorna com entrada inválida e mostra um exemplo.

## Convenções

Estas regras valem para todas as funções, a não ser que a seção diga o contrário.

- **Nada lança erro com entrada inválida** (`null`, `undefined`, tipo errado): `isValid*` retornam `false`, `format*` e `parse*` retornam `''`, `get*` de um item retornam `null`, `get*` de lista retornam `[]`. As únicas exceções são as assíncronas `getAddressInfoByCep` e `getCepInfoByAddress`, que rejeitam com erros tipados.
- **Validadores aceitam o valor com ou sem máscara**: os caracteres de máscara usuais (`.`, `-`, `/`) e espaços entre ou ao redor dos grupos são ignorados, então não é preciso limpar a formatação antes.
- **Um número só é lido quando é um inteiro seguro não negativo**: as funções que recebem `string | number` tratam um número negativo, fracionário, não finito ou inseguro como entrada inválida (`isValidCep(-20040020)` é `false`, `formatCpf(-1)` e `parseCpf(1.5)` são `''`), já que num número `-` e `.` não são caracteres de máscara.
- **Formatadores aplicam a máscara até onde o valor vai**, então também servem como máscara de digitação. As funções `parse*` fazem o inverso e mantêm só os caracteres que importam.
- **Geradores usam `Math.random()`**, então servem para testes e dados de exemplo e nunca para nada relacionado a segurança.
- **Getters retornam um array ou objeto novo a cada chamada**, então alterar um resultado nunca afeta a chamada seguinte.
- **Todas as funções são síncronas**, exceto `getAddressInfoByCep`, `getCepInfoByAddress` e a descontinuada `getMunicipality`.


## CPF

### isValidCpf

Valida um CPF.

- Retorna `false` para um número reservado (todos os dígitos iguais, como `00000000000`) e para um dígito verificador errado.
- Os números reservados são os que o [leiaute DJE](http://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=36307) da Receita Federal lista como inválidos. A norma do CPF, a [IN RFB nº 2.172/2024](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=135611), não traz regra de dígito verificador; a regra é a do manual da e-Financeira da Receita Federal (Anexo II, `REGRA_VALIDA_CPF`, aprovado pelo Ato Declaratório Executivo Cofis nº 10/2026).

```javascript
import { isValidCpf } from '@brazilian-utils/brazilian-utils';

isValidCpf('155151475'); // false
isValidCpf('111 444 777 35'); // true (máscara com espaços)
```

### formatCpf

Formata um CPF.

- **Opções** (`FormatCpfOptions`): `pad` preenche o valor com zeros à esquerda até 11 dígitos antes de aplicar a máscara (padrão `false`); `obfuscate` esconde os 3 primeiros dígitos e os 2 dígitos verificadores.
- `obfuscate` é aplicada após o `pad`. Segue a regra que as Leis de Diretrizes Orçamentárias definem para a divulgação do CPF: "ocultar os três primeiros dígitos e os dois dígitos verificadores" ([Lei nº 14.194/2021, art. 149](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm), regra criada pela Lei nº 12.309/2010, art. 87, § 5º; a LDO de 2026, [Lei nº 15.321/2025, art. 163](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15321.htm#art163), a repete).

```javascript
import { formatCpf } from '@brazilian-utils/brazilian-utils';

formatCpf('74650688000'); // 746.506.880-00
formatCpf('746506880', { pad: true }); // 007.465.068-80
formatCpf('12345678909', { obfuscate: true }); // ***.456.789-**
```

### parseCpf

Remove a formatação do CPF, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCpf } from '@brazilian-utils/brazilian-utils';

parseCpf('746.506.880-00'); // 74650688000
```

### generateCpf

Gera um CPF válido aleatório.

- O argumento opcional `state` (`StateCode`, ex. `"SP"`) fixa o dígito da região fiscal (o 9º) no código desse estado.
- `state` ignora maiúsculas/minúsculas e espaços nas pontas (`'sp'` é `'SP'`). Sem `state`, ou com um código desconhecido, um dígito de região fiscal aleatório é sorteado.

```javascript
import { generateCpf } from '@brazilian-utils/brazilian-utils'

generateCpf();
generateCpf('SP'); // o 9º dígito é 8, o código da região fiscal de SP
generateCpf('MG'); // o 9º dígito é 6, o código da região fiscal de MG
```

### getCpfInfo

Lê os campos que um CPF codifica, como um `CpfInfo`: a `base` de 8 dígitos, o dígito `fiscalRegion` (o 9º dígito, a Região Fiscal da Receita Federal em que o CPF foi inscrito, `"1"` a `"9"` e `"0"` para a 10ª), os `states` dessa região (`StateCode[]`, ordenados pelo nome do estado) e os 2 `checkDigits`. Aceita a mesma entrada com ou sem máscara que o `isValidCpf` e retorna `null` para tudo que não for um CPF válido. A região é a do endereço informado na primeira inscrição: ela não diz onde o titular nasceu, onde mora hoje nem onde pediu o número, e uma região com mais de um estado não diz qual deles foi.

| `fiscalRegion` | `states` |
| --- | --- |
| `"1"` | DF, GO, MT, MS, TO |
| `"2"` | AC, AP, AM, PA, RO, RR |
| `"3"` | CE, MA, PI |
| `"4"` | AL, PB, PE, RN |
| `"5"` | BA, SE |
| `"6"` | MG |
| `"7"` | ES, RJ |
| `"8"` | SP |
| `"9"` | PR, SC |
| `"0"` | RS |

```javascript
import { getCpfInfo } from '@brazilian-utils/brazilian-utils';

getCpfInfo('123.456.789-09');
// {
//   base: '12345678',
//   fiscalRegion: '9',
//   states: ['PR', 'SC'],
//   checkDigits: '09',
// }

getCpfInfo('12345678900'); // null (dígitos verificadores inválidos)
```

Fonte: [Receita Federal, "Cadastros: CPF e CNPJ"](https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf).

## CNPJ

### isValidCnpj

Valida um CNPJ.

- **Opções** (`IsValidCnpjOptions`): `version` escolhe o formato aceito: `1` (padrão) apenas numérico, `2` numérico e alfanumérico. Qualquer outro valor é lido como `1`.
- Um número reservado (todos os dígitos iguais) é rejeitado nas duas versões; a versão `2` não tem lista de reservados para letras.
- O conjunto oficial de caracteres do CNPJ alfanumérico são as letras maiúsculas de `A` a `Z` e os algarismos (os 2 dígitos verificadores são sempre algarismos). Uma letra minúscula só é aceita como normalização da entrada, como um caractere de máscara: a entrada é convertida para maiúsculas antes.
- O Ex1 da pergunta 23 do perguntas e respostas da Receita Federal sobre o CNPJ alfanumérico, `AA345678/0003-29`, tem erro de impressão: os dígitos verificadores dele são `86`, então ele é rejeitado.

```javascript
import { isValidCnpj } from '@brazilian-utils/brazilian-utils';

isValidCnpj('15515147234255'); // false
isValidCnpj('q0slfmbd7vx439', { version: 2 }); // true (lido como Q0SLFMBD7VX439)
```

Fonte: [Instrução Normativa RFB nº 2.229/2024](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=141102) (Anexo XV da IN RFB nº 2.119/2022, pesos "da direita para esquerda" conforme a retificação no DOU de 25/10/2024), [Receita Federal, Manual do DV do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf), [CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico).

### formatCnpj

Formata um CNPJ.

- **Opções** (`FormatCnpjOptions`): `pad` preenche o valor com zeros à esquerda até 14 caracteres antes de aplicar a máscara (padrão `false`); `version` escolhe o formato, `1` (padrão) apenas numérico, `2` alfanumérico; `obfuscate` esconde os 2 primeiros dígitos e os 2 dígitos verificadores.
- A versão `2` mantém letras e dígitos, com uma letra minúscula convertida para maiúscula antes, já que o conjunto oficial é de `A` a `Z`; a versão `1` mantém apenas dígitos.
- `obfuscate` vale para as duas versões e é aplicada após o `pad`. É uma convenção desta biblioteca, não uma regra oficial: nenhuma lei ou ato da Receita Federal define mascaramento para o CNPJ, cujos dados são públicos, a [ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd_uma_visao_de_processo_baseado_em_risco_e_tecnicas_computacionais.pdf) diz que "não há um padrão para o mascaramento" e as [regras do Pix do Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/IV_RequisitosMinimosparaExperienciadoUsuario.pdf) mostram o CNPJ inteiro onde mascaram o CPF; ela esconde os 2 primeiros caracteres e os 2 dígitos verificadores, à semelhança da regra do CPF.

```javascript
import { formatCnpj } from '@brazilian-utils/brazilian-utils';

formatCnpj('24522200000174'); // 24.522.200/0001-74
formatCnpj('245222000174', { pad: true }); // 00.245.222/0001-74
formatCnpj('12OUT345000199', { version: 2 }); // 12.OUT.345/0001-99
formatCnpj('12345678000195', { obfuscate: true }); // **.345.678/0001-**
```

### parseCnpj

Remove a formatação do CNPJ, retorna um valor normalizado e limita o resultado a 14 caracteres.

- **Opções** (`ParseCnpjOptions`): `version` escolhe o formato: `1` (padrão) mantém apenas dígitos, `2` mantém letras e dígitos, com uma letra minúscula convertida para maiúscula, já que o conjunto oficial é de `A` a `Z` (`parseCnpj('12.abc.345/01de-35', { version: 2 })` retorna `'12ABC34501DE35'`).

```javascript
import { parseCnpj } from '@brazilian-utils/brazilian-utils';

parseCnpj('24.522.200/0001-74'); // 24522200000174
parseCnpj('12.OUT.345/0001-99', { version: 2 }); // 12OUT345000199
```

### generateCnpj

Gera um CNPJ válido aleatório.

- O primeiro argumento é a versão, `1` (padrão) numérico ou `2` alfanumérico, ou um objeto `GenerateCnpjParams` com `version` mais `branch`.
- `branch` é o bloco do "número de ordem" (filial), um inteiro de 1 a 9999 (aleatório por padrão). Um `branch` inválido é ignorado. O bloco continua numérico nas duas versões.
- Um bloco de ordem aleatório nunca é `0000`: os estabelecimentos de uma raiz são numerados a partir de `0001`, a matriz, então esse bloco nunca é atribuído.

```javascript
import { generateCnpj } from '@brazilian-utils/brazilian-utils'

generateCnpj();
generateCnpj(2); // CNPJ alfanumérico, ex. 'Q0SLFMBD7VX439'
generateCnpj({ branch: 3 }); // bloco de ordem '0003', ex. '12345678000372'
generateCnpj({ version: 2, branch: 1 }); // CNPJ alfanumérico cujo bloco de ordem é '0001'
```

### getCnpjInfo

Interpreta um CNPJ nos campos que o número codifica. Aceita as mesmas formas de entrada que `isValidCnpj` e retorna `null` sempre que ela retornaria `false` para os mesmos argumentos, então um CNPJ alfanumérico lido na versão `1` é `null`.

- **Opções** (`GetCnpjInfoOptions`): `version` é lida como `isValidCnpj` a lê, `1` (padrão) apenas o formato numérico, `2` tanto o numérico quanto o alfanumérico.
- Retorna um `CnpjInfo`, as 14 posições como o Anexo XV as dispõe: 8 (`root`, a raiz que identifica a entidade) + 4 (`branch`, o número de ordem do estabelecimento) + 2 (`checkDigits`, os dígitos verificadores, sempre numéricos). O nome `branch` segue o parâmetro `branch` do `generateCnpj`, que preenche as mesmas quatro posições.
- `isInitialHeadquarters` diz se o número de ordem é `0001`, a que a Receita Federal atribui à matriz quando a raiz é inscrita. Uma filial pode depois se tornar a matriz mantendo o seu número de ordem, então só o cadastro da Receita Federal diz qual é a matriz atual.
- Os campos de um CNPJ alfanumérico são retornados em maiúsculas.

```javascript
import { getCnpjInfo } from '@brazilian-utils/brazilian-utils';

getCnpjInfo('12.345.678/0001-95');
// {
//   root: '12345678',
//   branch: '0001',
//   checkDigits: '95',
//   isInitialHeadquarters: true
// }

getCnpjInfo('12.abc.345/01de-35', { version: 2 });
// {
//   root: '12ABC345',
//   branch: '01DE',
//   checkDigits: '35',
//   isInitialHeadquarters: false
// }

getCnpjInfo('12.ABC.345/01DE-35'); // null (alfanumérico, lido na versão 1)
getCnpjInfo('12.345.678/0001-90'); // null (dígitos verificadores incorretos)
```

Fonte: [Instrução Normativa RFB nº 2.229/2024](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=141102), cujo Anexo Único é o Anexo XV da IN RFB nº 2.119/2022 e dispõe as 14 posições, [Perguntas e Respostas da Receita Federal sobre o CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf) (perguntas 21, 23 e 25).

## CEP e endereço

### isValidCep

Valida um CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)).

- Aceita `string` ou `number`. Um CEP que começa com `0` precisa ser string, já que um número não preserva o zero à esquerda, e um número só é lido quando é um inteiro seguro não negativo.
- Espaços, pontos e hífens são ignorados. Qualquer outro caractere invalida o valor.

```javascript
import { isValidCep } from '@brazilian-utils/brazilian-utils';

isValidCep('01310100'); // true
isValidCep('92500-000'); // true (hífen entre os grupos)
isValidCep('92.500-000'); // true (ponto e hífen)
isValidCep('013 10 100'); // true (espaços em qualquer posição entre os dígitos)
isValidCep(20040020); // true (entrada numérica)
isValidCep(-20040020); // false (não é um inteiro seguro não negativo)
isValidCep('9250000A'); // false (letras são rejeitadas)
isValidCep('12345'); // false (tamanho inválido)
```

### formatCep

Formata um CEP ([código de endereçamento postal](https://pt.wikipedia.org/wiki/C%C3%B3digo_de_Endere%C3%A7amento_Postal)).

- **Opções** (`FormatCepOptions`): `pad` preenche o valor com zeros à esquerda até 8 dígitos antes de aplicar a máscara (padrão `false`).
- Um CEP que começa com `0` passado como número perde esse zero: passe uma string ou use `pad`. Um número só é lido quando é um inteiro seguro não negativo; qualquer outro número retorna `''`.

```javascript
import { formatCep } from '@brazilian-utils/brazilian-utils';

formatCep('92500000'); // 92500-000
formatCep('9250000', { pad: true }); // 09250-000
formatCep(-92500000); // '' (não é um inteiro seguro não negativo)
```

### parseCep

Remove a formatação do CEP, mantém apenas os dígitos e limita o resultado a 8 dígitos.

```javascript
import { parseCep } from '@brazilian-utils/brazilian-utils';

parseCep('92500-000'); // 92500000
```

### generateCep

Gera um CEP aleatório. Um CEP não tem dígito verificador, então toda string de 8 dígitos é estruturalmente válida.

```javascript
import { generateCep } from '@brazilian-utils/brazilian-utils';

generateCep(); // '92500000'
```

### getAddressInfoByCep

Busca o endereço de um CEP em vários provedores ao mesmo tempo e resolve com a primeira resposta bem-sucedida. O resultado é um `AddressInfo`: `cep`, `state`, `city`, `neighborhood` e `street`.

- **Opções** (`GetAddressInfoByCepOptions`):
  - `providers` (`CepProvider[]`) lista os provedores a disputar (padrão `['viacep', 'brasilapi']`). `'widenet'` está descontinuado e fica fora da lista padrão.
  - `timeoutMs` (`number`) limita a busca inteira, tentativas incluídas (padrão: sem limite). Quando o tempo acaba, todas as requisições são abortadas e a chamada rejeita com `GetAddressInfoByCepServiceError`.
  - `signal` (`AbortSignal`) cancela a busca; a chamada rejeita com `signal.reason`, como o `fetch`.
- Aceita string ou número. Uma string tem removido todo caractere que não é dígito (`'CEP 01310-100'` é `01310100`) e precisa sobrar com 8 dígitos. Um número é preenchido com zeros à esquerda até 8 dígitos, já que não carrega o zero inicial de um CEP de São Paulo, mas só a partir de `1000000` (`01000-000`, o menor CEP que os Correios atribuem). Um número menor, negativo ou fracionário é rejeitado com `GetAddressInfoByCepValidationError` antes de qualquer requisição.
- Repete falhas transitórias de rede por provedor.
- Rejeita com `GetAddressInfoByCepValidationError` quando o CEP é inválido, `providers` não nomeia nenhum provedor conhecido ou `timeoutMs` não é um número finito positivo, com `GetAddressInfoByCepNotFoundError` quando todos os provedores falharam e pelo menos um informou que o CEP é desconhecido, e com `GetAddressInfoByCepServiceError` quando todos os provedores falharam por outro motivo.
- A BrasilAPI responde 404 tanto para um CEP desconhecido quanto quando os serviços por trás dela estão fora do ar, então o 404 dela só conta como "CEP desconhecido" quando nenhum outro provedor deixou de responder.
- Os três estendem `GetAddressInfoByCepError`, então um único `catch` cobre todos.

```javascript
import { getAddressInfoByCep } from '@brazilian-utils/brazilian-utils';

// Usando os provedores padrão (['viacep', 'brasilapi'])
const address = await getAddressInfoByCep('01310100');
// { cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' }

// Usando provedores específicos
const addressFromProviders = await getAddressInfoByCep('01310-100', {
  providers: ['viacep', 'brasilapi']
});

// Usando número como entrada (será preenchido automaticamente com zeros à esquerda)
const addressFromNumber = await getAddressInfoByCep(1310100);

// Desistindo depois de 5 segundos
const addressWithinFiveSeconds = await getAddressInfoByCep('01310100', { timeoutMs: 5000 });
```

### getCepInfoByAddress

Busca os CEPs de um endereço na ViaCEP. Resolve com um array de `CepAddressInfo`.

- O argumento (`GetCepInfoByAddressParams`) traz `federalUnit`, `city` e `street`. `federalUnit` pode estar em minúsculas; `city` e `street` têm os espaços nas pontas removidos e os acentos retirados antes da consulta.
- Rejeita com `GetCepInfoByAddressValidationError` quando a UF, a cidade ou a rua está ausente ou inválida, com `GetCepInfoByAddressNotFoundError` quando nenhum endereço corresponde à busca, e com `GetCepInfoByAddressError` quando a ViaCEP responde com um status de erro HTTP.
- Repete falhas transitórias de rede, como `getAddressInfoByCep`.
- Cada item traz a resposta da ViaCEP sem alterações, com os nomes de campo da própria ViaCEP.

```javascript
import { getCepInfoByAddress } from '@brazilian-utils/brazilian-utils';

const ceps = await getCepInfoByAddress({
  federalUnit: 'MG',
  city: 'Ouro Preto',
  street: 'Rua Direita'
});

// [
//   {
//     cep: '35411-152',
//     logradouro: 'Rua Direita',
//     complemento: '',
//     unidade: '',
//     bairro: 'Riacho (Amarantina)',
//     localidade: 'Ouro Preto',
//     uf: 'MG',
//     estado: 'Minas Gerais',
//     regiao: 'Sudeste',
//     ibge: '3146107',
//     gia: '',
//     ddd: '31',
//     siafi: '4921'
//   }
// ]
```

## Boleto

### isValidBoleto

Valida um boleto ([meio de pagamento brasileiro](https://pt.wikipedia.org/wiki/Boleto_banc%C3%A1rio)).

- Aceita a linha digitável de 47 dígitos da "cobrança bancária", o seu código de barras de 44 dígitos (código do banco, código de moeda `9`, o dígito verificador módulo 11 na posição 5, fator de vencimento, valor e campo livre) e, do "boleto de arrecadação", seja a linha digitável de 48 dígitos, seja o código de barras de 44 dígitos. Um valor de 44 dígitos começando por `8` é sempre um código de barras de arrecadação (o `8` é o seu identificador de produto), então o código de barras de cobrança bancária de um código de banco `8xx` não é aceito, pois os dois não se distinguiriam. Até a 2.4.0 o código de barras da cobrança bancária era rejeitado.
- Os caracteres de máscara usuais (espaço, `.`, `-` e `/`) são aceitos entre os dígitos; qualquer outro caractere invalida o valor, então `abc` + uma linha digitável + `zzz` é rejeitado, não lido como os seus dígitos (até a 2.4.0 todo não dígito era descartado).
- O código de moeda (posição 4 do código de barras e da linha digitável da cobrança bancária) precisa ser `9` (real), o único código que a Carta-Circular BCB nº 2.926/2000 atribui. A única exceção é o boleto da "Situação 2" da Convenção da Cobrança da FEBRABAN, emitido por instituição identificada apenas pelo ISPB: código de banco `988`, código de moeda `0`, fator de vencimento `0000` e o ISPB, completado com zeros, no lugar do valor. Qualquer outro dígito é rejeitado.

```javascript
import { isValidBoleto } from '@brazilian-utils/brazilian-utils';

isValidBoleto('00190000090114971860168524522114675860000102656'); // true
isValidBoleto('00196758600001026560000001149718606852452211'); // true (código de barras da cobrança bancária)
isValidBoleto('846100000005246100291102005460339004695895061080'); // true (boleto de arrecadação)
isValidBoleto('00170000010114971860168524522114275860000102656'); // false (código de moeda 7)
isValidBoleto('abc00190000090114971860168524522114675860000102656zzz'); // false (letras em volta dos dígitos)
isValidBoleto('98800000060114971860168524522114100000018236120'); // true (Situação 2: banco 988, moeda 0, ISPB)
```

Fonte: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação, Versão 08](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf) (vigente desde 01/06/2026), [FEBRABAN, Convenção da Cobrança](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Conven%C3%A7%C3%A3o%20da%20Cobran%C3%A7a%20-%2005_02_2021_f.pdf).

### formatBoleto

Formata um número de boleto.

- **Opções** (`FormatBoletoOptions`): `pad` preenche o valor com zeros à esquerda até o tamanho do padrão antes de aplicar a máscara (padrão `false`).
- Uma linha digitável de 48 dígitos que começa com `8` recebe a máscara de arrecadação: quatro blocos de 11 dígitos, cada um seguido do seu dígito verificador. O código de barras de arrecadação de 44 dígitos mantém a máscara de "cobrança bancária".

```javascript
import { formatBoleto } from '@brazilian-utils/brazilian-utils';

formatBoleto('00190000090114971860168524522114675860000102656'); // 00190.00009 01149.718601 68524.522114 6 75860000102656
formatBoleto('1900000901149', { pad: true }); // 00000.00000 00000.000000 00000.000000 0 01900000901149
formatBoleto('846100000005246100291102005460339004695895061080'); // 84610000000-5 24610029110-2 00546033900-4 69589506108-0 (linha digitável de arrecadação, 48 dígitos)
formatBoleto('84610000000246100291100054603390069589506108'); // 84610.00000 02461.002911 00054.603390 0 69589506108 (código de barras de arrecadação de 44 dígitos mantém a máscara bancária)
```

Fonte: [FEBRABAN, Layout Padrão de Arrecadação, Versão 08](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf) (vigente desde 01/06/2026).

### parseBoleto

Remove a formatação do boleto, mantém apenas os dígitos e limita o resultado a 47 dígitos (48 para boleto de arrecadação).

```javascript
import { parseBoleto } from '@brazilian-utils/brazilian-utils';

parseBoleto('00190.00009 01149.718601 68524.522114 6 75860000102656'); // 00190000090114971860168524522114675860000102656
```

### generateBoleto

Gera um boleto válido aleatório.

- Informe `{ type: 'arrecadacao' }` (`GenerateBoletoParams`) para um boleto de arrecadação de 48 dígitos em vez do tipo padrão `'bancario'` (cobrança bancária, 47 dígitos).
- Um boleto de cobrança bancária traz o código de moeda `9` e um fator de vencimento `0000` (sem vencimento) ou de `1000` a `9999`; de `0001` a `0999` o fator não indica data.

```javascript
import { generateBoleto } from '@brazilian-utils/brazilian-utils';

generateBoleto(); // "00190000090114971860168524522114675860000102656"
generateBoleto({ type: 'arrecadacao' }); // "846100000005246100291102005460339004695895061080"
```

### getBoletoInfo

Extrai informações de um boleto (valor, data de vencimento, código do banco). Retorna `null` quando o valor não é um boleto válido.

- **Opções** (`GetBoletoInfoOptions`): `referenceDate` resolve o ciclo do "fator de vencimento" a partir dessa data em vez de agora.
- Lê a linha digitável de 47 dígitos e o código de barras de 44 dígitos de um boleto de cobrança bancária, e as formas de arrecadação, do mesmo modo que `isValidBoleto` as aceita.
- Retorna um `BoletoInfo`: `amount` em centavos, `expirationDate` e o `bankCode` de três dígitos. `expirationDate` é `null` quando o boleto não traz fator de vencimento (um fator abaixo de `1000`).
- O ciclo do fator de vencimento reiniciou em 22/02/2025, então um fator pode significar uma de duas datas separadas por 9000 dias. Não há comunicado da FEBRABAN publicado sobre o reinício; a regra está em manuais de banco, como o [do Bradesco](https://banco.bradesco/assets/pessoajuridica/pdf/4008-524-0121-layout-cobranca-versao-portugues.pdf) (Versão 17). `referenceDate` escolhe entre elas; informe-a sempre que a resposta precisar ser estável.
- A janela é de cerca de 8 anos para trás e 15 anos para a frente de `referenceDate`: um boleto que venceu há mais de uns 8 anos dela é lido como o próximo ciclo (uma data no futuro), então, para ler um boleto antigo, informe uma `referenceDate` próxima da data de emissão. Uma `referenceDate` que não seja um `Date` válido é ignorada e usa-se agora.
- Um boleto de arrecadação tem `bankCode: ''` e `expirationDate: null`, mais `type: 'arrecadacao'`, `segment`, `value` (o valor em reais) e `hasEffectiveValue`.
- O boleto da "Situação 2" da Convenção da Cobrança da FEBRABAN (código de banco `988`, código de moeda `0`) traz o ISPB do emissor no lugar do valor: ele volta como `ispb`, com `amount: 0`.

```javascript
import { getBoletoInfo } from '@brazilian-utils/brazilian-utils';

getBoletoInfo('00190000090114971860168524522114675860000102656');
// { amount: 102656, expirationDate: Date, bankCode: '001' }

getBoletoInfo('00196758600001026560000001149718606852452211');
// o mesmo boleto lido do código de barras de 44 dígitos

getBoletoInfo('00190000090114971860168524522114675860000102656', {
  referenceDate: new Date(2018, 6, 1)
});
// Resolve o ciclo do fator de vencimento a partir de 01/07/2018

getBoletoInfo('98800000060114971860168524522114100000018236120');
// { amount: 0, expirationDate: null, bankCode: '988', ispb: '18236120' }

getBoletoInfo('846100000005246100291102005460339004695895061080');
// { amount: 2461, expirationDate: null, bankCode: '', type: 'arrecadacao', segment: 4, value: 24.61, hasEffectiveValue: true }

getBoletoInfo('invalid'); // null
```

Fonte: [Carta-Circular BCB nº 2.926/2000](https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf), [FEBRABAN, Layout Padrão de Arrecadação, Versão 08](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf) (vigente desde 01/06/2026), [FEBRABAN, Convenção da Cobrança](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Conven%C3%A7%C3%A3o%20da%20Cobran%C3%A7a%20-%2005_02_2021_f.pdf).

## Pix

### isValidPixKey

Valida uma chave Pix: um CPF, um CNPJ, um e-mail, um telefone celular brasileiro ou uma chave aleatória EVP, conforme os formatos de chave do DICT.

- **Opções** (`IsValidPixKeyOptions`): `accept` (`PixKeyType[]`, padrão todos) lista os tipos de chave aceitos; `[]` rejeita todos.
- Mesmas regras de reconhecimento de `getPixKeyInfo`.

```javascript
import { isValidPixKey } from '@brazilian-utils/brazilian-utils';

isValidPixKey('123.456.789-09'); // true
isValidPixKey('fulano@example.com'); // true
isValidPixKey('(11) 98765-4321'); // true
isValidPixKey('71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d'); // true
isValidPixKey('(11) 3000-0000'); // false (telefone fixo não é chave Pix)
isValidPixKey('123.456.789-09', { accept: ['email', 'evp'] }); // false
isValidPixKey('not a key'); // false
```

Fonte: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [API do DICT 2.12.1](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html) e seu [changelog](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/changelog.html), [pix-api](https://github.com/bacen/pix-api).

### getPixKeyInfo

Identifica uma chave Pix e a normaliza para a forma canônica que o DICT espera dentro de um BR Code. Retorna `null` quando o valor não é uma chave Pix válida.

- Retorna um `PixKeyInfo` com o `type` (`PixKeyType`) e o `value`.
- O `value` canônico é só dígitos para CPF ou CNPJ (letras maiúsculas), e-mail minúsculo, celular em E.164 ou UUID minúsculo.
- Um valor de 11 dígitos válido como CPF e celular é lido como CPF, salvo se escrito como telefone (prefixo `+55` ou DDD entre parênteses).
- Um e-mail é conferido, já em minúsculas, contra a expressão regular que a API do DICT registra e o limite de 77 caracteres, não contra `isValidEmail`: a parte local pode ter qualquer um de ``.!#$'*+/=?^_`{|}~-``, pontos em qualquer posição inclusive, e o domínio pode ter um só rótulo (`a@localhost`). A expressão é a da API do DICT 2.12.1, que não tem `&` desde a versão 2.6.0 (27/09/2025).

```javascript
import { getPixKeyInfo } from '@brazilian-utils/brazilian-utils';

getPixKeyInfo('123.456.789-09'); // { type: 'cpf', value: '12345678909' }
getPixKeyInfo('Fulano@Example.COM '); // { type: 'email', value: 'fulano@example.com' }
getPixKeyInfo('a{b}@example.com'); // { type: 'email', value: 'a{b}@example.com' } (expressão do DICT, isValidEmail o rejeita)
getPixKeyInfo('a&b@example.com'); // null (sem & desde a API do DICT 2.6.0)
getPixKeyInfo('(11) 98765-4321'); // { type: 'phone', value: '+5511987654321' }
getPixKeyInfo('71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D');
// { type: 'evp', value: '71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d' }
getPixKeyInfo('(11) 3000-0000'); // null (telefone fixo não é chave Pix)
getPixKeyInfo('51998259765'); // { type: 'cpf', value: '51998259765' } (também é um telefone válido)
getPixKeyInfo('+5551998259765'); // { type: 'phone', value: '+5551998259765' }
```

Fonte: [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf), [API do DICT 2.12.1](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html) e seu [changelog](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/changelog.html).

### isValidPixPayload

Valida um payload de BR Code Pix (a string por trás de um QR Code Pix e do "Pix copia e cola") pelo Manual de Padrões para Iniciação do Pix e, onde ele é omisso, pela especificação EMV de QR Code em que ele se apoia.

- O payload precisa começar pelo format indicator `000201`.
- A estrutura TLV, o CRC-16 e os objetos obrigatórios (format indicator, category code de 4 dígitos, moeda, país, nome e cidade do recebedor) são verificados. Um ID de objeto não pode se repetir no mesmo nível, e o CRC (`63`) precisa ser o último objeto do payload, não oito caracteres dentro de outro.
- Um template "Merchant Account Information" (IDs 26 a 51) precisa trazer o GUI `br.gov.bcb.pix` com uma chave (estático) ou a URL do PSP (dinâmico), nunca os dois.
- A chave vem na forma do DICT (§2.5.1): a que `getPixKeyInfo` devolve sem mudar, então `12345678909` passa e `123.456.789-09` não. Se ela está registrada não dá para saber pelo payload. A URL do PSP tem no máximo 77 caracteres (§2.5.2).
- O nome do recebedor tem no máximo 25 caracteres e a cidade no máximo 15; o país é `BR` em maiúsculas. Os caracteres deles não são restritos (nenhum dos manuais restringe, e o EMV os tipa como `ans`), então um nome com acento é aceito, embora `generatePixPayload` reduza os dois a ASCII imprimível.
- Nenhum manual do BCB diz se o CRC ou o `BR` podem estar em minúsculas: a única regra de caixa que eles dão é a do GUI, e todos os exemplos oficiais escrevem os dois em maiúsculas. Aceitar CRC em minúsculas (`1d3d`) e rejeitar `br` são escolhas desta biblioteca, como na 2.4.0.
- O objeto `01` (Point of Initiation Method) é opcional e precisa ser `11` ou `12` quando presente.
- O objeto `62` (Additional Data Field) é obrigatório e traz o `txid` (62-05), "sempre presente em um BR Code": `***` ou de 1 a 25 letras e dígitos (§2.6.2); com URL do PSP qualquer valor vale, já que o §2.7 manda o pagador ignorá-lo. O `-` do exemplo `RP12345678-2019` do Manual do BR Code está fora do conjunto de caracteres do Pix do §2.6.2, então esse exemplo estático é rejeitado.
- Um valor (`54`) é feito de dígitos com um `.` opcional e no máximo duas casas decimais (`98.73`, `98` e `98.` são os exemplos do EMV), com no máximo 13 caracteres, e maior que zero, exceto num BR Code de Pix Saque (`fss` de 8 dígitos no subobjeto 26-03) e junto de uma URL do PSP, em que a API Pix lhe dá `0.00` (o Manual do BR Code traz `"0"` entre os exemplos).
- Os Unreserved Templates (IDs 80 a 99) são ignorados.

```javascript
import { isValidPixPayload } from '@brazilian-utils/brazilian-utils';

isValidPixPayload(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
); // true

isValidPixPayload('00020126580014br.gov.bcb.pix...'); // false (CRC quebrado)
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### getPixPayloadInfo

Interpreta um payload de BR Code Pix e retorna seus campos. Aceita o que `isValidPixPayload` aceita; para o resto retorna `null`, nunca um resultado parcial.

- Retorna um `PixPayloadInfo`: `merchantName`, `merchantCity`, `pointOfInitiation` e `key` (estático) ou `url` (dinâmico).
- `amount`, `txid`, `description` e `withdrawalFacilitator` (o `fss` do Pix Saque) só aparecem quando o payload os traz; `txid` fica ausente para o marcador `***`.
- `pointOfInitiation` (`PixPointOfInitiation`) é `"dynamic"` quando o payload traz uma localização de PSP (o QR Code dinâmico do manual do Pix, §2.4.2) ou se marca como de uso único com o objeto `01` = `"12"` (§2.7.2); senão, `"static"`. Um payload com chave e `01` = `"12"` é, portanto, `"dynamic"`; `url` e `key` distinguem os dois tipos de QR Code do manual.
- Com localização de PSP, `amount` e `txid` são ignorados e ficam de fora, como manda o §2.7 do manual ("Se preenchidos, seu conteúdo deve ser ignorado").

```javascript
import { getPixPayloadInfo } from '@brazilian-utils/brazilian-utils';

getPixPayloadInfo(
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
    '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
);
// {
//   merchantName: 'Fulano de Tal',
//   merchantCity: 'BRASILIA',
//   pointOfInitiation: 'static',
//   key: '123e4567-e12b-12d1-a456-426655440000'
// }
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

### generatePixPayload

Gera o payload de um BR Code Pix. Exatamente um entre `params.key` e `params.url` deve ser informado; `null` é retornado quando ambos ou nenhum são informados.

- **Parâmetros** (`GeneratePixPayloadParams`): `key` ou `url`, `merchantName`, `merchantCity` e os opcionais `amount`, `txid` e `description`.
- Com `key` o payload é estático e a chave é normalizada por `getPixKeyInfo`. Com `url` é dinâmico (objeto `01` definido como `12`) e não pode carregar `amount` nem `txid`.
- `url` é uma localização de PSP: host e caminho, sem esquema (`pix.example.com/qr/v2/1234`), com no máximo 77 caracteres.
- `amount` recebe duas casas decimais; `0.005`, `123.456` ou um valor que arredonda para `0.00` é rejeitado.
- `txid` tem de 1 a 25 caracteres de `[A-Za-z0-9]` (padrão `***`).
- `merchantName`, `merchantCity` e `description` perdem os acentos e são truncados a 25, 15 e o que sobra do template.

```javascript
import { generatePixPayload } from '@brazilian-utils/brazilian-utils';

generatePixPayload({
  key: '123.456.789-09',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília',
  amount: 123.45
});
// "00020126330014br.gov.bcb.pix0111123456789095204000053039865406123.455802BR5913Fulano de Tal6008Brasilia62070503***630479EE"

generatePixPayload({
  url: 'pix.example.com/qr/v2/1234',
  merchantName: 'Fulano de Tal',
  merchantCity: 'Brasília'
});
// "00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008Brasilia62070503***6304FC66"

generatePixPayload({ merchantName: 'Fulano', merchantCity: 'Brasília' }); // null (nem key nem url)
```

Fonte: [Manual do BR Code](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf), [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

## Chave de NF-e

### isValidNfeKey

Valida uma chave de acesso de DF-e. Cobre todo DF-e com chave de acesso de 44 caracteres; o CF-e-SAT (59) fica de fora.

- Modelos: NF-e (55), NFC-e (65), CT-e (57), MDF-e (58), CT-e OS (67), GTV-e (64), BP-e (63), NF3e (66) e NFCom (62).
- Todo caractere é dígito, exceto as posições 7 a 18, a raiz e a ordem do CNPJ do emitente, que podem trazer as letras de um CNPJ alfanumérico: os schemas atuais (NF-e PL_010 `TChNFe`, CT-e PL_CTe_400_RTC, MDF-e 3.00b, NFCom) tipam a chave como `[0-9]{6}[0-9A-Z]{12}[0-9]{26}`, em produção na NF-e a partir de 01/07/2026 (NT 2026.004). Uma letra em qualquer outra posição, incluídos os dígitos verificadores do CNPJ nas posições 19 e 20, é rejeitada. O schema só admite maiúsculas; minúsculas são lidas como maiúsculas, como `isValidCnpj` faz com `{ version: 2 }`. Uma letra não ASCII que vira letra ASCII em maiúsculas (`ſ`, `ß`) é rejeitada.
- Os 44 caracteres podem ser agrupados de 4 em 4 por espaço, `.`, `-` ou `/`. Os prefixos `Id` do XML (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) são removidos antes.
- `tpEmis` precisa ser um dos que o MOC do modelo atribui (tabela abaixo).
- Para NF-e e NFC-e o `cNF` precisa passar na regra B03-10 do MOC (sem valores repetidos ou sequenciais, diferente do número do documento). A regra vale para os documentos enviados depois da NT 2019.001, e os softwares de NF-e costumavam usar um `cNF` igual ao número do documento antes dela, então uma chave autorizada antes pode ser rejeitada.
- Os dígitos verificadores do CPF ou CNPJ do emitente não são conferidos, só o dígito verificador da própria chave. Leia a chave com `getNfeKeyInfo` e passe o `taxId` dela ao `isValidCnpj`, ou os 11 últimos dígitos de um `taxId` preenchido com zeros ao `isValidCpf`, para conferir também o emitente.
- Um número de documento todo zerado é rejeitado. O dígito verificador é um módulo 11 sobre os 43 primeiros caracteres, cada um valendo seu código ASCII menos 48 (`A` = 17 ... `Z` = 42), como a NT Conjunta 2025.001 define.

| Modelo | `tpEmis` aceitos |
| --- | --- |
| NF-e (55), NFC-e (65) | 1 a 7 e 9 |
| CT-e (57) | 1, 3, 4, 5, 7, 8 |
| CT-e OS (67) | 1, 5, 7, 8 |
| GTV-e (64) | 1, 2, 7, 8 (veja abaixo) |
| MDF-e (58) | 1, 2, 3 |
| BP-e (63), NF3e (66), NFCom (62) | 1, 2 |

Para a GTV-e, o pacote de schemas atual do CT-e (PL_CTe_400_RTC) enumera apenas os `tpEmis` 1 (normal) e 2 (contingência off-line); o PL_CTe_400 anterior também tinha 7 e 8 (autorização pela SVC-RS e pela SVC-SP). A chave não traz a versão do schema, então a biblioteca aceita os quatro, e as chaves de GTV-e autorizadas sob o pacote anterior continuam válidas.

```javascript
import { isValidNfeKey } from '@brazilian-utils/brazilian-utils';

isValidNfeKey('35170458716523000119550010000000121000123458'); // true (NF-e, SP)
isValidNfeKey('NFe35170458716523000119550010000000121000123458'); // true (prefixo Id do XML)
isValidNfeKey('CTe35170458716523000119570010000000128000123452'); // true (CT-e autorizado pela SVC-SP)
isValidNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'); // true (com máscara)
isValidNfeKey('3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458'); // true (qualquer um dos caracteres de máscara)
isValidNfeKey('35260712ABC34501DE35550010000001231102030403'); // true (CNPJ alfanumérico 12ABC34501DE35)
isValidNfeKey('35260712ABC34501DEA5550010000001231102030408'); // false (letra na posição 19, dígito verificador do CNPJ)
isValidNfeKey('351 70458716523000119550010000000121000123458'); // false (separador dentro de um grupo de 4)
isValidNfeKey('99170458716523000119550010000000121000123458'); // false (cUF inválido)
isValidNfeKey('35170458716523000119010010000000121000123450'); // false (modelo inválido)
isValidNfeKey('35170458716523000119550010000000128000123455'); // false (o MOC da NF-e não atribui tpEmis 8)
isValidNfeKey('35170458716523000119550010000000121000000003'); // false (cNF 00000000, regra B03-10)
```

Fonte: [MOC da NF-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), [schemas da NF-e](https://dfe-portal.svrs.rs.gov.br/NFE/Documentos), [NT Conjunta 2025.001](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D) (CNPJ alfanumérico) e os MOCs citados em `src/is-valid-nfe-key/is-valid-nfe-key.ts`.

### formatNfeKey

Formata uma chave de acesso de DF-e (Documento Fiscal eletrônico) em grupos de 4 caracteres separados por espaço. É a forma em que o DANFE, o DACTE, o DAMDFE, o DABPE, o DANF3E e o DANFE-COM a imprimem.

- **Opções** (`FormatNfeKeyOptions`): `pad` preenche o valor com zeros à esquerda até os 44 caracteres de uma chave de acesso completa (padrão `false`).
- Uma chave com máscara ou parcial é agrupada até onde os caracteres vão.
- As letras de um CNPJ alfanumérico são mantidas, em maiúsculas, nas posições 7 a 18; uma letra em qualquer outra posição é descartada.
- Os prefixos `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` e `NFCom` do atributo `Id` do XML são removidos antes, como o `parseNfeKey` os lê.
- Um valor que não seja string nem inteiro seguro não negativo (`-1`, `1.5`, um bigint, um objeto) resulta em `''`.
- Use `isValidNfeKey` para verificar uma chave.

```javascript
import { formatNfeKey } from '@brazilian-utils/brazilian-utils';

formatNfeKey('35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458'

formatNfeKey('35260712abc34501de35550010000001231102030403');
// '3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403' (CNPJ alfanumérico)

formatNfeKey('NF3e35170458716523000119550010000000121000123458');
// '3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458' (prefixo do Id do XML)

formatNfeKey('12345'); // '1234 5'

formatNfeKey('12345', { pad: true });
// '0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345'
```

### parseNfeKey

Remove a formatação de uma chave de acesso de DF-e (chave de acesso), mantém apenas os seus caracteres e limita o resultado a 44 caracteres.

- Os caracteres mantidos são os dígitos e, nas posições 7 a 18, as letras de um CNPJ alfanumérico, em maiúsculas; uma letra em qualquer outra posição é descartada.

- Os prefixos `Id` do XML (`NFe`, `CTe`, `MDFe`, `BPe`, `NF3e`, `NFCom`) são removidos antes.

```javascript
import { parseNfeKey } from '@brazilian-utils/brazilian-utils';

parseNfeKey('3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458');
// '35170458716523000119550010000000121000123458'

parseNfeKey('NFe35170458716523000119550010000000121000123458');
// '35170458716523000119550010000000121000123458'

parseNfeKey('3526 0712 abc3 4501 de35 5500 1000 0001 2311 0203 0403');
// '35260712ABC34501DE35550010000001231102030403' (CNPJ alfanumérico)
```

### getNfeKeyInfo

Interpreta uma chave de acesso de DF-e e retorna seus campos. Aceita as mesmas formas de entrada de `isValidNfeKey` e retorna `null` quando a chave não é válida.

- Retorna um `NfeKeyInfo`: `stateCode`, `year`, `month`, `taxId`, `model` (`NfeKeyModel`), `series`, `number`, `emissionType`, `code` e `checkDigit`.
- Para NFCom e NF3e (modelos `'62'` e `'66'`) o resultado também traz `authorizationSite` e o `code` tem 7 dígitos em vez de 8.
- `taxId` são os 14 caracteres das posições 7 a 20 como escritos: um CNPJ numérico, um CNPJ alfanumérico (em maiúsculas) ou um CPF completado com zeros à esquerda. Um `taxId` com letra é sempre um CNPJ alfanumérico; um CPF completado e um CNPJ que começa com `000` se parecem, então verifique com `isValidCpf` ou `isValidCnpj` quando o tipo importar.

```javascript
import { getNfeKeyInfo } from '@brazilian-utils/brazilian-utils';

getNfeKeyInfo('35170458716523000119550010000000121000123458');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '55',
//   series: 1, number: 12, emissionType: 1, code: '00012345', checkDigit: 8 }

getNfeKeyInfo('35170458716523000119620010000000121000123450');
// { stateCode: 'SP', year: 2017, month: 4, taxId: '58716523000119', model: '62',
//   series: 1, number: 12, emissionType: 1, code: '0012345', checkDigit: 0, authorizationSite: 0 }

getNfeKeyInfo('35260712ABC34501DE35550010000001231102030403');
// { stateCode: 'SP', year: 2026, month: 7, taxId: '12ABC34501DE35', model: '55',
//   series: 1, number: 123, emissionType: 1, code: '10203040', checkDigit: 3 }

getNfeKeyInfo('invalid'); // null
```

## Chave de NFS-e

### isValidNfseKey

Verifica se a chave de acesso de uma NFS-e nacional, a Nota Fiscal de Serviço eletrônica do Sistema Nacional NFS-e, é válida.

- A chave é um bloco único de 50 caracteres, `Cód.Mun.(7) Amb.Ger.(1) Tipo de Inscrição Federal(1) Inscrição Federal(14) nNFSe(13) AAMM(4) Cód.Num.(9) DV(1)`, todos dígitos exceto um CNPJ alfanumérico na Inscrição Federal.
- O literal `NFS` que o atributo `Id` de `infNFSe` coloca antes da chave é retirado, junto com os espaços nas extremidades.
- O DANFSe imprime a chave em um único bloco, então ela não tem máscara impressa. As fronteiras entre os 8 campos aceitam os caracteres de máscara que o `isValidCpf` lê (espaço, `.`, `-` ou `/`, isolados ou em sequência), enquanto um separador dentro de um campo invalida o valor.
- O código do município precisa começar com um código IBGE de UF; ele não é consultado na tabela do IBGE.
- O `ambGer` precisa ser `1` (o sistema do município) ou `2` (o Sistema Nacional NFS-e), e o tipo de inscrição `1` (um CPF, preenchido com `000` à esquerda) ou `2` (um CNPJ, numérico ou alfanumérico), com um CPF ou CNPJ cujos próprios dígitos verificadores sejam válidos. Letras só são aceitas em um CNPJ, e minúsculas são lidas como maiúsculas, como o `isValidCnpj` com `{ version: 2 }` as lê.
- O `nNFSe` não pode ser todo de zeros e o mês precisa estar entre 01 e 12.
- O dígito verificador é um módulo 11 sobre os 49 primeiros caracteres, pesos de 2 a 9 ciclando a partir da direita, em que resto 0 ou 1 dá 0. Uma letra vale o seu código ASCII menos 48 (`A` vale 17). Nenhum documento oficial diz isso: as notas técnicas 001 a 009 da NFS-e, o Anexo I e as Perguntas e Respostas de 08/09/2026 são omissos, e a Nota Técnica Conjunta 2025.001, cuja regra do ASCII menos 48 vale para a chave dos DF-e, lista os documentos que abrange (NF-e, NFC-e, CT-e, CT-e OS, GTV-e, MDF-e, BP-e, BP-e TM, NF3e e NFCom) sem a NFS-e. A regra vem por analogia com essa NT e com os próprios dígitos verificadores do CNPJ.
- As letras seguem o `TSIdNFSe` do pacote de esquemas de 27/07/2026, nas posições da Inscrição Federal (10 a 23). O pacote de produção de 09/02/2026 ainda tipa a chave como `[0-9]{50}`.
- Os modelos municipais de NFS-e que não são o padrão nacional estão fora do escopo.

```javascript
import { isValidNfseKey } from '@brazilian-utils/brazilian-utils';

isValidNfseKey('35503082258716523000119000000000001226011357924683'); // true (emitente com CNPJ, SP)
isValidNfseKey('NFS35503082258716523000119000000000001226011357924683'); // true (prefixo Id do XML)
isValidNfseKey('43149021100040364478829000000000105725120484407255'); // true (emitente com CPF, RS)
isValidNfseKey('35503082212ABC34501DE35000000000001226091357924682'); // true (emitente com CNPJ alfanumérico)
isValidNfseKey('35503082258716523000119000000000001226011357924684'); // false (dígito verificador)
isValidNfseKey('3550308 2 2 58716523000119 0000000000012 2601 135792468 3'); // true (separadores entre os campos)
```

### parseNfseKey

Remove tudo o que não é dígito ou letra de um CNPJ alfanumérico da chave de acesso de uma NFS-e nacional e limita o resultado a 50 caracteres.

- As letras ficam em maiúsculas, como faz o `parseCnpj` com `{ version: 2 }`, e as letras antes do primeiro dígito são descartadas, inclusive o prefixo `NFS` do atributo `Id` do XML, já que a chave começa com dígitos. O `isValidNfseKey` verifica se as letras que restam estão em um CNPJ.

- Essa é a forma em que o leiaute guarda a chave e a que o DANFSe imprime, um bloco único, e por isso não existe `formatNfseKey`.

```javascript
import { parseNfseKey } from '@brazilian-utils/brazilian-utils';

parseNfseKey('NFS35503082258716523000119000000000001226011357924683');
// '35503082258716523000119000000000001226011357924683'

parseNfseKey('3550308 2 2 58716523000119 0000000000012 2601 135792468 3');
// '35503082258716523000119000000000001226011357924683'

parseNfseKey('nfs3550308 2 2 12.abc.345/01de-35 0000000000012 2609 135792468 2');
// '35503082212ABC34501DE35000000000001226091357924682'
```

### getNfseKeyInfo

Interpreta a chave de acesso de uma NFS-e nacional e retorna seus campos, como um `NfseKeyInfo`. Aceita as mesmas formas de entrada do `isValidNfseKey`.

- Retorna `municipalityCode`, `stateCode`, `generatorEnvironment`, `taxIdType`, `taxId`, `number`, `year`, `month`, `code` e `checkDigit`.
- O `generatorEnvironment` é um `NfseKeyGeneratorEnvironment`: `1` o sistema do município, `2` o Sistema Nacional NFS-e.
- O `taxIdType` é um `NfseKeyTaxIdType`, `'cpf'` ou `'cnpj'`, e o `taxId` é o CPF de 11 dígitos, sem o `000` que o preenche na chave, ou o CNPJ de 14 caracteres, numérico ou alfanumérico, em maiúsculas.
- Retorna `null` quando a chave não é válida.

```javascript
import { getNfseKeyInfo } from '@brazilian-utils/brazilian-utils';

getNfseKeyInfo('35503082258716523000119000000000001226011357924683');
// { municipalityCode: '3550308', stateCode: 'SP', generatorEnvironment: 2, taxIdType: 'cnpj',
//   taxId: '58716523000119', number: 12, year: 2026, month: 1, code: '135792468', checkDigit: 3 }

getNfseKeyInfo('43149021100040364478829000000000105725120484407255');
// { municipalityCode: '4314902', stateCode: 'RS', generatorEnvironment: 1, taxIdType: 'cpf',
//   taxId: '40364478829', number: 1057, year: 2025, month: 12, code: '048440725', checkDigit: 5 }

getNfseKeyInfo('35503082212ABC34501DE35000000000001226091357924682');
// { municipalityCode: '3550308', stateCode: 'SP', generatorEnvironment: 2, taxIdType: 'cnpj',
//   taxId: '12ABC34501DE35', number: 12, year: 2026, month: 9, code: '135792468', checkDigit: 2 }

getNfseKeyInfo('invalid'); // null
```

Fonte: a [documentação técnica do Sistema Nacional NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual), cujos tipos de esquema `TSIdNFSe` e `TSChaveNFSe` e o campo `NFSe/infNFSe/id` do ANEXO I definem o leiaute e as regras E1280 e E1284, o [manual da emissão por decisão administrativa ou judicial](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-emissao-decisao-administrativa-e-judicial.pdf), que nomeia o dígito verificador de módulo 11, a [Nota Técnica SE/CGNFS-e 008](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf) (item 2.1.1), que imprime a chave em bloco único, os [esquemas atualizados para o CNPJ alfanumérico](https://www.gov.br/nfse/pt-br/noticias/plataforma-nfs-e-disponibiliza-novas-evolucoes-em-producao-restrita-e-divulga-cronograma-de-implantacao) (o pacote de produção restrita v1.01-20260727; o serviço trata o CNPJ alfanumérico em produção desde 10/08/2026, enquanto o pacote de produção de 09/02/2026 ainda só tem dígitos) e a [Nota Técnica Conjunta 2025.001](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ=), cuja regra de ASCII menos 48 da chave da NF-e o dígito verificador empresta.

## SUFRAMA

### isValidSuframa

Valida uma Inscrição SUFRAMA. É o número de registro que a Superintendência da Zona Franca de Manaus dá às empresas com incentivo fiscal, informado no campo `ISUF` do destinatário da NF-e.

- O número tem a forma `SS.NNNN.LLD`: setor de atividade, número sequencial, localidade da unidade da SUFRAMA e dígito verificador.
- Aceita 8 ou 9 dígitos. O MOC só diz que o código de setor "pode começar por '0'"; ler um valor de 8 dígitos como um cujo código de setor perdeu esse zero é uma inferência desta biblioteca.
- Retorna `false` para um código de setor `00` e para um dígito verificador módulo 11 errado.
- Os códigos de setor e de localidade não são conferidos com uma tabela, pois o manual os lista apenas como exemplos.
- A regra vem do Manual de Orientação do Contribuinte da NF-e (CONFAZ/ENCAT), não da SUFRAMA, cuja Resolução CAS nº 64/2021, art. 5º, só chama a inscrição de "um número de identificação e controle" e não traz layout nem dígito verificador.
- Além dos caracteres de máscara usuais, `(`, `)`, `,` e `*` também são ignorados.

```javascript
import { isValidSuframa } from '@brazilian-utils/brazilian-utils';

isValidSuframa('123456789'); // true
isValidSuframa('12.3456.789'); // true
isValidSuframa('10001018'); // true (o mesmo que '010001018')
isValidSuframa('123456780'); // false
isValidSuframa('001234560'); // false (setor 00)
```

### formatSuframa

Formata uma Inscrição SUFRAMA.

- **Opções** (`FormatSuframaOptions`): `pad` completa o valor com zeros à esquerda até os 9 dígitos antes de aplicar a máscara (padrão `false`), o que devolve o zero à esquerda de um valor de 8 dígitos.
- A máscara é progressiva, como nas outras funções `format`, então um valor de 8 dígitos sem `pad` é agrupado uma posição antes: use `pad: true` para um valor lido direto do campo `ISUF`, que pode vir com 8 dígitos.

```javascript
import { formatSuframa } from '@brazilian-utils/brazilian-utils';

formatSuframa('123456789'); // 12.3456.789
formatSuframa('10001018'); // 10.0010.18 (8 dígitos, a máscara agrupa uma posição antes)
formatSuframa('10001018', { pad: true }); // 01.0001.018
```

### parseSuframa

Remove a formatação da Inscrição SUFRAMA, mantém apenas os dígitos e limita o resultado a 9 dígitos.

```javascript
import { parseSuframa } from '@brazilian-utils/brazilian-utils';

parseSuframa('12.3456.789'); // 123456789
```

### generateSuframa

Gera uma Inscrição SUFRAMA aleatória válida de 9 dígitos.

- O dígito verificador é válido e o código de setor nunca é `00`. Os códigos de setor e de localidade são aleatórios.

```javascript
import { generateSuframa } from '@brazilian-utils/brazilian-utils';

generateSuframa(); // '205678106'
```

Fonte: [Manual de Orientação do Contribuinte da NF-e 7.0, Visão Geral](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf) (seção 8.4), [MOC 7.0, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf) (campo 79, `E18` `ISUF`, e regra E18-20).

## Telefone

### isValidPhone

Valida um número de telefone (celular ou fixo). Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`. Qualquer caractere além de dígitos, espaços e `()+.-/` (uma letra, por exemplo) torna o valor inválido; até a 2.4.0 esses caracteres eram descartados.

- **Opções** (`IsValidPhoneOptions`): `accept` (`PhoneType[]`, padrão `['mobile', 'landline']`) define quais tipos de número são aceitos; inclua `'service'` para os números que `isValidServicePhone` reconhece. `version` (`PhoneVersion`, padrão `1`) é repassado a `isValidMobilePhone`.
- Um celular precisa começar com 7, 8 ou 9 nas duas versões (Resolução Anatel 749/2022, art. 12, I, "a"), então um 6 inicial é rejeitado; até a 2.4.0 a versão padrão o aceitava.

```javascript
import { isValidPhone } from '@brazilian-utils/brazilian-utils';

isValidPhone('11900000000'); // true
isValidPhone('11712345678', { version: 2 }); // true (7, 8 e 9 são todos SMP)
isValidPhone('11700123456', { version: 2 }); // false (a série 700 é de satélite)
isValidPhone('11612345678'); // false (6 não é SMP)
isValidPhone('+55 11 98765-4321'); // true (código de país aceito)
isValidPhone('08001234567'); // false (números de serviço não são aceitos por padrão)
isValidPhone('08001234567', { accept: ['service'] }); // true
isValidPhone('11900000000', { accept: [] }); // false
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749).

### formatPhone

Formata um número de telefone de acordo com os padrões brasileiros. Se `value` incluir o DDD, informe `{ mask: 'auto' }` ou `'nanp'`: a máscara padrão `"sn"` assume que não há DDD e o trunca.

- **Opções** (`FormatPhoneOptions`): `mask` (`PhoneMask`, padrão `"sn"`) escolhe um dos padrões abaixo. Uma `mask` desconhecida recai para `"sn"`. `obfuscate` (padrão `false`) esconde o número do assinante em todas as máscaras.
- `"sn"`: apenas o número assinante, 9 dígitos. `"nanp"`: DDD mais número assinante, 11 dígitos para celular e 10 para fixo; outros tamanhos mantêm o agrupamento de 11 dígitos.
- `"e164"` e `"international"` removem antes o código de país, como `parsePhone`, e recaem para `"service"` para um número de serviço. `"e164"` mantém no máximo os 11 dígitos nacionais, como `"international"` (até a 2.4.0 mantinha todos).
- `"sn"` e `"nanp"` também removem um `+55` ou `0055` explícito, então `'+5511987654321'` resulta em `(11) 98765-4321` em `"nanp"` (até a 2.4.0 resultava em `(55) 11987-6543`); um `55` isolado permanece, pois pode ser o DDD.
- Um número é lido quando é string ou inteiro seguro não negativo; qualquer outro número (negativo, fracionário, não finito ou inseguro) resulta em string vazia.
- Na máscara `"service"` com `obfuscate`, um valor que ainda é só o prefixo de serviço o mantém (`0800` continua `0800`), pois o prefixo indica um serviço, e não um assinante; um valor curto demais para ser reconhecido (`080`) fica todo oculto (`***`).
- `"service"`: os Códigos Não Geográficos (`0800 123 4567`) e os números abreviados `300X`/`400X` (`4004-1234`).
- `"auto"`: `"service"` para um número de serviço, `"international"` quando `value` traz código de país, senão `"nanp"` para mais de 9 dígitos, ou `"sn"`.
- O `obfuscate` é uma convenção desta biblioteca, não uma regra oficial: nenhuma lei, ato da Anatel ou orientação da [ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd_uma_visao_de_processo_baseado_em_risco_e_tecnicas_computacionais.pdf) define quais dígitos de um telefone mostrar ("não há um padrão para o mascaramento"), e o [Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/IV_RequisitosMinimosparaExperienciadoUsuario.pdf) proíbe mascarar a chave Pix, inclusive telefone, no retorno da consulta ao DICT.
- O `obfuscate` mantém 2 dígitos, a contagem que a conta gov.br usa para o celular cadastrado, e mantém o prefixo que indica uma região ou um serviço, e não um assinante: o DDD, o código do tipo `0800` e a raiz `300X`/`400X`.
- Os 2 dígitos são os últimos que cabem na própria máscara, então na máscara padrão `"sn"` um valor com DDD é truncado antes, igual ao que acontece sem `obfuscate`, e o par visível é o 8º e o 9º dígito, e não os 2 últimos de `value`.
- Nas máscaras `"service"`, `"auto"`, `"e164"` e `"international"` um código de utilidade pública de 3 dígitos (`190`) não identifica ninguém e é devolvido como está (as outras máscaras o leem como um número curto qualquer); num valor que a máscara `"service"` não reconhece cada dígito vira um `*`, o que esconde os dígitos, mas não quantos eram. Os padrões ofuscados têm um número fixo de posições, então em `"e164"` o que passa do 11º dígito nacional é descartado.

```javascript
import { formatPhone } from '@brazilian-utils/brazilian-utils';

formatPhone('987654321'); // 98765-4321 (padrão "sn", sem DDD)
formatPhone('11900000000', { mask: 'nanp' }); // (11) 90000-0000
formatPhone('11900000000', { mask: 'auto' }); // (11) 90000-0000
formatPhone('1130000000', { mask: 'nanp' }); // (11) 3000-0000 (fixo de 10 dígitos)
formatPhone('1130000000', { mask: 'auto' }); // (11) 3000-0000 (fixo de 10 dígitos)
formatPhone('11987654321', { mask: 'e164' }); // +5511987654321
formatPhone('+5511987654321', { mask: 'international' }); // +55 11 98765-4321
formatPhone('+55 11 9', { mask: 'auto' }); // +55 11 9 (digitado após o +55, o 55 não é lido como DDD)
formatPhone('+5511987654321', { mask: 'nanp' }); // (11) 98765-4321
formatPhone('08001234567', { mask: 'service' }); // 0800 123 4567
formatPhone('40041234', { mask: 'service' }); // 4004-1234
formatPhone('+5511987654321', { mask: 'auto' }); // +55 11 98765-4321 ("auto" detecta o prefixo +55 e escolhe "international")
formatPhone('5508001234567', { mask: 'auto' }); // 0800 123 4567 ("auto" lê o número 0800, não um +55 08)
formatPhone('987654321', { obfuscate: true }); // *****-**21
formatPhone('11987654321', { mask: 'auto', obfuscate: true }); // (11) *****-**21
formatPhone('1130000000', { mask: 'auto', obfuscate: true }); // (11) ****-**00
formatPhone('+5511987654321', { mask: 'auto', obfuscate: true }); // +55 11 *****-**21
formatPhone('11987654321', { mask: 'e164', obfuscate: true }); // +5511*******21
formatPhone('08001234567', { mask: 'service', obfuscate: true }); // 0800 *** **67
formatPhone('40041234', { mask: 'service', obfuscate: true }); // 4004-**34
formatPhone('11988887766', { mask: 'service', obfuscate: true }); // *********** (não é número de serviço)
formatPhone('11987654321', { obfuscate: true }); // *****-**43 (CUIDADO: a "sn" trunca antes, então "43", e não "21")
formatPhone('11900000000'); // 11900-0000 (CUIDADO: a máscara padrão "sn" trunca um número com DDD)
```

Fonte: [ITU-T E.164](https://www.itu.int/rec/T-REC-E.164), [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [conta gov.br](https://acesso.gov.br/faq/_perguntasdafaq/formarrecuperarconta.html) para quantos dígitos de um celular ficam visíveis.

### parsePhone

Remove a formatação do telefone, mantém apenas os dígitos e limita o resultado a 11 dígitos.

- Um código de país explícito (`+55` ou `0055`) é sempre removido antes, mesmo com o número ainda sendo digitado (`+55 11 9` resulta em `119`; até a 2.4.0 resultava em `55119`). Um `55` isolado só é removido quando sobram 10 ou 11 dígitos (DDD mais número assinante), então o DDD 55 não é confundido com ele.
- Aceita string ou número inteiro seguro não negativo; qualquer outro número (negativo, fracionário, não finito ou inseguro) resulta em string vazia.

```javascript
import { parsePhone } from '@brazilian-utils/brazilian-utils';

parsePhone('(11) 90000-0000'); // 11900000000
parsePhone('+55 (11) 98765-4321'); // 11987654321
parsePhone('5511987654321'); // 11987654321
parsePhone('+55 11 9'); // 119 (código de país explícito, número ainda curto)
parsePhone('55987654321'); // 55987654321 (DDD 55, não confundido com o código de país +55)
```

### generatePhone

Gera um telefone brasileiro aleatório. Aceita `'mobile'`, `'landline'` ou `'service'` (`GeneratePhoneType`); sem o tipo, gera um celular ou um fixo ao acaso, nunca um número de serviço.

- Um celular começa com 9 depois do DDD (válido nas duas versões de `isValidMobilePhone`); um fixo tem 8 dígitos depois do DDD, começando com 2 a 5 (a faixa que continua válida depois que a Resolução Anatel 777/2025 a reduz em 1º de março de 2027; até a 2.4.0 podia sair um 6); um número de serviço não tem DDD.

```javascript
import { generatePhone } from '@brazilian-utils/brazilian-utils';

generatePhone(); // '11912345678' ou '1131234567'
generatePhone('mobile'); // '11912345678'
generatePhone('landline'); // '1131234567'
generatePhone('service'); // '08001234567' ou '40041234'
```

### isValidMobilePhone

Valida um número de telefone celular. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`. Qualquer caractere além de dígitos, espaços e `()+.-/` (uma letra, por exemplo) torna o valor inválido; até a 2.4.0 esses caracteres eram descartados.

- **Opções** (`IsValidMobilePhoneOptions`): `version` (`PhoneVersion`, padrão `1`) escolhe a regra de numeração. As duas seguem a Resolução Anatel 749/2022, art. 12, I, "a" (`"7", "8" e "9": Serviço Móvel Pessoal (SMP)`) e aceitam só 7, 8 ou 9 como primeiro dígito; `1` também aceita a série `700`, `2` a rejeita por ser de satélite (art. 12, II, "a").
- Até a 2.4.0 a versão `1` também aceitava 6 como primeiro dígito, que não é SMP.
- Mudança agendada, ainda não aplicada: a Resolução Anatel 777/2025, art. 22, reescreve o art. 12 a partir de 1º de março de 2027. O primeiro dígito `6` passa a ser SCM (não é celular), só `8` e `9` continuam SMP, a série `700` passa a ser "SMGS e SMP por Satélite" e qualquer outro número com `7` vira reserva técnica. A partir dessa data, uma `version: 2` que siga essa regra terá de aceitar só `8` e `9`, além da série `700` como SMP por satélite.

```javascript
import { isValidMobilePhone } from '@brazilian-utils/brazilian-utils';

isValidMobilePhone('11900000000'); // true
isValidMobilePhone('11712345678', { version: 1 }); // true
isValidMobilePhone('11712345678', { version: 2 }); // true (7 também é SMP)
isValidMobilePhone('11612345678'); // false (6 não é SMP, em nenhuma das versões)
isValidMobilePhone('11700123456'); // true (a versão 1 mantém a série 700)
isValidMobilePhone('11700123456', { version: 2 }); // false (a série 700 é de satélite)
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749) e [Resolução Anatel nº 777/2025](https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777), art. 22.

### isValidLandlinePhone

Valida um número de telefone fixo. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `parsePhone`. Qualquer caractere além de dígitos, espaços e `()+.-/` (uma letra, por exemplo) torna o valor inválido; até a 2.4.0 esses caracteres eram descartados.

- O número é o DDD mais 8 dígitos começando com `2` a `6`, a faixa de STFC e SCM da Resolução Anatel 749/2022, art. 11, I, "a".
- Mudança agendada, ainda não aplicada: a partir de 1º de março de 2027 a Resolução Anatel 777/2025, art. 21, deixa só `2` a `5` para o STFC, e o SCM passa para números de 9 dígitos começando com `6`. A partir dessa data, um fixo começando com `6` terá de ser rejeitado.

```javascript
import { isValidLandlinePhone } from '@brazilian-utils/brazilian-utils';

isValidLandlinePhone('1130000000'); // true
isValidLandlinePhone('+55 11 3000-0000'); // true (código de país aceito)
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), art. 11, e [Resolução Anatel nº 777/2025](https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777), art. 21.

### isValidServicePhone

Valida um número de serviço brasileiro, discado sem DDD. Apenas a estrutura é verificada: o número não precisa estar atribuído a ninguém. Um código de país brasileiro (`+55`, `0055` ou um `55` isolado) é aceito e removido antes, como em `isValidPhone` com `accept: ['service']` (até a 2.4.0 `+55 0800 123 4567` era rejeitado aqui). Qualquer caractere além de dígitos, espaços e `()+.-/` (uma letra, por exemplo) torna o valor inválido; até a 2.4.0 esses caracteres eram descartados.

- Os Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` e `0900` seguidos de 7 dígitos (11 no total): as séries de 10 dígitos da Resolução Anatel 749/2022, art. 18, discadas atrás do prefixo `0` (art. 28).
- Os números abreviados `300X`/`400X`, com 8 dígitos. Outros prefixos de operadora, como `4020` e `4062`, são rejeitados.
- Os códigos de utilidade pública de 3 dígitos designados pela Anatel (ex.: `190`, `192`), conforme a [página de SUP da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais/servicos-de-utilidade-publica-e-de-emergencia) (modificada em 22/06/2023) e o Anexo do Ato 43.151/2004, o último ato consolidado. A página lista `112/911` para a Polícia Militar no celular: o `112` é aceito; o `911` é rejeitado, porque a Resolução 749/2022, art. 13, deixa toda série fora de `1XX` em reserva técnica. Até a 2.4.0 o `112` também era rejeitado.

```javascript
import { isValidServicePhone } from '@brazilian-utils/brazilian-utils';

isValidServicePhone('0800 123 4567'); // true
isValidServicePhone('4004-1234'); // true
isValidServicePhone('190'); // true
isValidServicePhone('+55 0800 123 4567'); // true (código de país aceito)
isValidServicePhone('11987654321'); // false (número geográfico)
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [página de SUP da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais/servicos-de-utilidade-publica-e-de-emergencia), [Ato Anatel nº 43.151/2004](https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151), [Resolução nº 86/1998](https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86).

### getAreaCodeByMunicipalityCode

Retorna o DDD (código de área) de um município brasileiro a partir do código IBGE de 7 dígitos, segundo a tabela da Anatel dos Códigos Nacionais em vigor.

- Aceita o código como o `getMunicipalityByCode`: string (com todo caractere que não é dígito removido) ou número inteiro não negativo.
- Retorna o DDD como número, ou `null` quando o código não é de um município. Cada um dos 5.571 municípios tem exatamente um DDD.
- O DDD quase sempre segue a divisa dos estados. As exceções: o 61 também cobre 12 municípios de Goiás no entorno de Brasília, e Porto União (SC) usa o 42, Rio Negro (PR) o 47 e Barracão (PR) o 49.

```javascript
import { getAreaCodeByMunicipalityCode } from '@brazilian-utils/brazilian-utils';

getAreaCodeByMunicipalityCode('3550308'); // 11 (São Paulo/SP)
getAreaCodeByMunicipalityCode(3304557); // 21 (Rio de Janeiro/RJ)
getAreaCodeByMunicipalityCode('4122305'); // 47 (Rio Negro/PR)
getAreaCodeByMunicipalityCode('0000000'); // null
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais), [tabela da Anatel dos Códigos Nacionais por município (21/09/2026)](https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais).

### getAreaCodeInfo

Retorna o estado e a região a que um DDD brasileiro (código de área) pertence, dentre os 67 DDDs em uso no Plano Geral de Numeração da Anatel. Aceita string ou número inteiro não negativo.

- Uma string tem removido todo caractere que não é dígito, então `'(11)'`, `'0xx11'` e `'DDD 11'` são o DDD 11.
- Retorna um `AreaCodeInfo`: `areaCode`, `stateCode`, `stateName`, `regionCode`, `regionName` e `stateCodes`. Retorna `null` quando o DDD não está em uso.
- `stateCode` é o estado sede do DDD. Para os quatro DDDs que cruzam uma divisa (61, 42, 47 e 49) `stateCodes` lista também o outro estado, a sede primeiro.

```javascript
import { getAreaCodeInfo } from '@brazilian-utils/brazilian-utils';

getAreaCodeInfo('11');
// { areaCode: 11, stateCode: 'SP', stateName: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['SP'] }

getAreaCodeInfo(21);
// { areaCode: 21, stateCode: 'RJ', stateName: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', stateCodes: ['RJ'] }

getAreaCodeInfo('61');
// { areaCode: 61, stateCode: 'DF', stateName: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', stateCodes: ['DF', 'GO'] }

getAreaCodeInfo('00'); // null
getAreaCodeInfo('(0xx11)'); // o mesmo que '11'
getAreaCodeInfo(-11); // null
getAreaCodeInfo(1.1); // null
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais), [tabela da Anatel dos Códigos Nacionais por município (21/09/2026)](https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais).

### getAreaCodesByState

Retorna todos os DDDs (códigos de área) que atendem um estado brasileiro, dentro do Plano Geral de Numeração da Anatel. A comparação não diferencia maiúsculas de minúsculas e o resultado vem em ordem crescente.

- Retorna `[]` quando `stateCode` não é um estado brasileiro.
- Um DDD de divisa (os mesmos quatro de `getAreaCodeInfo`) é listado em cada estado que atende.

```javascript
import { getAreaCodesByState } from '@brazilian-utils/brazilian-utils';

getAreaCodesByState('SP'); // [11, 12, 13, 14, 15, 16, 17, 18, 19]
getAreaCodesByState('ac'); // [68]
getAreaCodesByState('DF'); // [61]
getAreaCodesByState('GO'); // [61, 62, 64]
getAreaCodesByState('SC'); // [42, 47, 48, 49]
getAreaCodesByState('XX'); // []
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais), [tabela da Anatel dos Códigos Nacionais por município (21/09/2026)](https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais).

### getMunicipalitiesByAreaCode

Lista os municípios brasileiros que usam um DDD (código de área), segundo a tabela da Anatel dos Códigos Nacionais em vigor.

- Aceita o DDD como o `getAreaCodeInfo`: string (com todo caractere que não é dígito removido) ou número inteiro não negativo.
- Retorna um array de `{ code, name, stateCode }` (`Municipality`): primeiro os municípios do estado sede, depois os do outro estado em que o DDD entra, cada estado em ordem alfabética. Retorna `[]` quando o DDD não está em uso.

```javascript
import { getMunicipalitiesByAreaCode } from '@brazilian-utils/brazilian-utils';

getMunicipalitiesByAreaCode(68).length; // 22 (todos os municípios do Acre)
getMunicipalitiesByAreaCode('(61)').length; // 13 (Brasília e 12 municípios de Goiás)
getMunicipalitiesByAreaCode('47').at(-1); // { code: '4122305', name: 'Rio Negro', stateCode: 'PR' }
getMunicipalitiesByAreaCode('20'); // []
```

Fonte: [Resolução Anatel nº 749/2022](https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749), [Códigos Nacionais da Anatel](https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais), [tabela da Anatel dos Códigos Nacionais por município (21/09/2026)](https://informacoes.anatel.gov.br/paineis/areas-tarifarias/codigos-nacionais).


## Placa de veículo

### isValidLicensePlate

Valida uma placa de veículo. Aceita o formato antigo brasileiro (`ABC-1234`) e o formato Mercosul (`ABC1D23`), com ou sem máscara, em maiúsculas ou minúsculas. A máscara (espaço, `.`, `-` ou `/`, isolados ou em sequência) só é aceita entre o terceiro caractere e os quatro últimos; qualquer outro caractere (`@`, um emoji, um separador em outra posição) invalida a placa em vez de ser removido.

A opção `format` restringe a validação a um deles: `"LLLNNNN"` para o formato antigo ou `"LLLNLNN"` para o Mercosul, os nomes que `getFormatLicensePlate` retorna. Funciona como o argumento `type` do `is_valid` da biblioteca Python, cujos valores lá se chamam `"old_format"` e `"mercosul"`. Esses nomes não são formatos aqui: sem `format`, ou com qualquer outro valor, uma placa em qualquer um dos dois formatos é válida.

```javascript
import { isValidLicensePlate } from '@brazilian-utils/brazilian-utils';

isValidLicensePlate('ABC1234'); // true (formato brasileiro)
isValidLicensePlate('ABC-1234'); // true (formato brasileiro com hífen)
isValidLicensePlate('ABC 1234'); // true (máscara com espaço)
isValidLicensePlate('ABC1D23'); // true (formato Mercosul)
isValidLicensePlate('ABC12D3'); // false (não é uma sequência Mercosul)
isValidLicensePlate('ABC1234EXTRA'); // false (caracteres em excesso)
isValidLicensePlate('A-BC1234'); // false (a máscara só fica depois do terceiro caractere)
isValidLicensePlate('ABC1234!'); // false (qualquer outro caractere é rejeitado)
isValidLicensePlate('ABC1D23', { format: 'LLLNLNN' }); // true
isValidLicensePlate('ABC1234', { format: 'LLLNLNN' }); // false (placa no formato antigo)
isValidLicensePlate('ABC-1234', { format: 'LLLNNNN' }); // true
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexos](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

### formatLicensePlate

Formata uma placa. Placas antigas brasileiras (`LLLNNNN`) recebem hífen; placas Mercosul (`LLLNLNN`) são retornadas sem separador.

- Retorna `''` quando o valor não pode iniciar uma placa válida.
- Um valor parcial é formatado progressivamente, então a função serve como máscara de entrada: o hífen aparece assim que o quarto caractere é um dígito, e um quinto caractere que é letra mantém a forma Mercosul.

```javascript
import { formatLicensePlate } from '@brazilian-utils/brazilian-utils';

formatLicensePlate('abc1234'); // 'ABC-1234'
formatLicensePlate('abc1d23'); // 'ABC1D23'
formatLicensePlate('abc1'); // 'ABC-1' (um valor parcial é formatado até onde vai)
formatLicensePlate('abc1d'); // 'ABC1D'
```

### parseLicensePlate

Remove separadores de uma placa, normaliza para letras maiúsculas e limita o resultado a 7 caracteres.

```javascript
import { parseLicensePlate } from '@brazilian-utils/brazilian-utils';

parseLicensePlate('abc-1234'); // 'ABC1234'
```

### generateLicensePlate

Gera uma placa válida aleatória no formato escolhido.

- `format` (`GenerateLicensePlateFormat`): `'LLLNLNN'` (Mercosul, o padrão) ou `'LLLNNNN'` (o formato antigo brasileiro). Qualquer outro valor cai no padrão.
- A letra da quinta posição de uma placa Mercosul é sorteada de `K` a `Z`: `A` a `J` só são usadas para converter uma placa do formato antigo (Anexo II, item 2, da Resolução CONTRAN nº 969/2022), então uma placa nova nunca as tem.

```javascript
import { generateLicensePlate } from '@brazilian-utils/brazilian-utils';

generateLicensePlate(); // 'ABC1K23' (Mercosul, o padrão)
generateLicensePlate('LLLNNNN'); // 'ABC1234'
generateLicensePlate('LLLNNLN'); // 'ABC1K23' (um formato fora dos dois em circulação cai no padrão)
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf).

### getFormatLicensePlate

Detecta o formato normalizado de uma placa: `'LLLNNNN'` para o formato antigo brasileiro, `'LLLNLNN'` para o Mercosul.

- Retorna `null` quando o valor, sem os separadores, não tem 7 letras e dígitos em um dos dois formatos.
- Exporta o tipo `LicensePlateFormat`, que `generateLicensePlate` reexporta como `GenerateLicensePlateFormat`.

```javascript
import { getFormatLicensePlate } from '@brazilian-utils/brazilian-utils';

getFormatLicensePlate('ABC-1234'); // 'LLLNNNN'
getFormatLicensePlate('ABC1D23'); // 'LLLNLNN'
getFormatLicensePlate('ABC12D3'); // null (não é uma sequência Mercosul)
getFormatLicensePlate('INVALID'); // null
getFormatLicensePlate('ABC1234EXTRA'); // null (caracteres em excesso)
```

### convertLicensePlateToMercosul

Converte uma placa brasileira no formato antigo (`LLLNNNN`) para o formato Mercosul (`LLLNLNN`). O 5º dígito vira uma letra, `0` a `9` mapeados para `A` a `J`.

- Retorna `""` quando o valor não é uma placa válida no formato antigo.

```javascript
import { convertLicensePlateToMercosul } from '@brazilian-utils/brazilian-utils';

convertLicensePlateToMercosul('ABC1234'); // 'ABC1C34'
convertLicensePlateToMercosul('abc-1234'); // 'ABC1C34'
convertLicensePlateToMercosul('ABC1D23'); // '' (já está no formato Mercosul)
```

Fonte: [Resolução CONTRAN nº 969/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf), [Anexo II](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf).

## RENAVAM

### isValidRenavam

Valida um RENAVAM (Registro Nacional de Veículos Automotores). Aceita o formato antigo (9 dígitos) e o formato novo (11 dígitos).

- Espaços, pontos e hífens são ignorados; qualquer outro caractere invalida o valor.
- O dígito verificador é o da Portaria DENATRAN nº 27/2013, art. 1º: "10 dígitos e um dígito verificador, calculado através do módulo 11, peso 9", lido como os pesos 3, 2, 9, 8, 7, 6, 5, 4, 3 e 2. A portaria não escreve os pesos um a um nem diz o que fazer com resto 0, 1 ou 10, o que segue o [validation-br](https://github.com/klawdyo/validation-br/blob/main/src/renavam.ts) e o [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/renavam.py); completar com zeros um código de 9 dígitos até 11 é prática de mercado.

```javascript
import { isValidRenavam } from '@brazilian-utils/brazilian-utils';

isValidRenavam('639884962'); // true (9 dígitos, formato antigo)
isValidRenavam('00639884962'); // true (11 dígitos, formato novo)
isValidRenavam('0063988.4962'); // true (pontos e hífens são ignorados)
isValidRenavam('12345678901'); // false (checksum inválido)
isValidRenavam('00000000000'); // false (dígitos repetidos)
isValidRenavam('ab00639884962'); // false (letras são rejeitadas)
```

Fonte: [Portaria DENATRAN nº 27/2013](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2013/portaria0272013.pdf).

### generateRenavam

Gera um RENAVAM válido aleatório na forma de 11 dígitos: dez dígitos de base mais o dígito verificador.

```javascript
import { generateRenavam } from '@brazilian-utils/brazilian-utils';

generateRenavam(); // '12345678900'
```

## PIS

### isValidPis

Valida um PIS. Aceita o valor com ou sem máscara.

- Um valor com todos os dígitos iguais é rejeitado.
- O dígito verificador usa os pesos 3, 2, 9, 8, 7, 6, 5, 4, 3 e 2 e módulo 11. Nenhum documento oficial encontrado publica esses pesos: os manuais do eSocial e do SIRC dizem só que o número tem 11 dígitos e dígito verificador módulo 11, e os leiautes da Caixa pedem um "Número de PIS/PASEP válido" sem dizer como ele é calculado. Os pesos seguem o [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/pis.py).

```javascript
import { isValidPis } from '@brazilian-utils/brazilian-utils';

isValidPis('12056412847'); // true
isValidPis('12056412547'); // false
```

### formatPis

Formata um PIS.

- **Opções** (`FormatPisOptions`): `pad` completa o valor com zeros à esquerda até 11 dígitos antes de aplicar a máscara (padrão `false`); `obfuscate` esconde os 3 primeiros dígitos e o dígito verificador.
- O `obfuscate` é aplicado depois do `pad`.
- Nenhuma autoridade publica uma regra de mascaramento para o PIS, então o `obfuscate` usa a que as Leis de Diretrizes Orçamentárias definem para a divulgação do CPF ("ocultar os três primeiros dígitos e os dois dígitos verificadores", Lei nº 14.194/2021, art. 149, regra criada pela Lei nº 12.309/2010, art. 87, § 5º), um número com a mesma estrutura.

```javascript
import { formatPis } from '@brazilian-utils/brazilian-utils';

formatPis('12345678901'); // 123.45678.90-1
formatPis('123456789', { pad: true }); // 001.23456.78-9
formatPis('12345678901', { obfuscate: true }); // ***.45678.90-*
```

### parsePis

Remove a formatação do PIS, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parsePis } from '@brazilian-utils/brazilian-utils';

parsePis('123.45678.90-1'); // 12345678901
```

### generatePis

Gera um PIS válido aleatório.

```javascript
import { generatePis } from '@brazilian-utils/brazilian-utils';

generatePis(); // '91077906857'
```

Fonte: [Lei nº 14.194/2021, art. 149](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm), a regra de mascaramento do CPF que o `obfuscate` toma emprestada, criada pela [Lei nº 12.309/2010, art. 87, § 5º](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12309.htm) e repetida pelas LDOs seguintes (a de 2026, [Lei nº 15.321/2025, art. 163](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15321.htm#art163), a repete).

## Processo jurídico

### isValidProcessoJuridico

Valida um número de processo jurídico, conforme a Resolução CNJ nº 65/2008. Três coisas são verificadas: o layout `NNNNNNN-DD.AAAA.J.TR.OOOO`, os dígitos verificadores `DD` (ISO 7064 MOD 97-10) e o par `J`/`TR`.

- `J` e `TR` precisam nomear um órgão e um tribunal que existem.
- A unidade de origem (`OOOO`) é verificada apenas como quatro dígitos.

```javascript
import { isValidProcessoJuridico } from '@brazilian-utils/brazilian-utils';

isValidProcessoJuridico('00020802520125150049'); // true
isValidProcessoJuridico('0002080-25.2012.5.15.0049'); // true (máscara do CNJ)
isValidProcessoJuridico('0000100-68.2008.4.06.0000'); // true (TRF da 6ª Região)
isValidProcessoJuridico('0000100-23.2008.8.28.0000'); // false (não existe 28º Tribunal de Justiça)
isValidProcessoJuridico('ab00020802520125150049'); // false (letras são rejeitadas)
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119), art. 1º (layout, `J` e `TR`) e Anexo VIII ("CÁLCULO DO DÍGITO VERIFICADOR"); o TRF da 6ª Região (`4.06`) conforme a [Resolução CNJ nº 477/2022](https://atos.cnj.jus.br/atos/detalhar/4781).

### formatProcessoJuridico

Formata um número de processo jurídico na máscara do CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO`.

- **Opções** (`FormatProcessoJuridicoOptions`): `pad` completa o valor com zeros à esquerda até 20 dígitos antes de aplicar a máscara (padrão `false`).

```javascript
import { formatProcessoJuridico } from '@brazilian-utils/brazilian-utils';

formatProcessoJuridico('00020802520125150049'); // '0002080-25.2012.5.15.0049'
formatProcessoJuridico('20802520125150049', { pad: true }); // '0002080-25.2012.5.15.0049'
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

### parseProcessoJuridico

Remove a formatação do processo jurídico, mantém apenas os dígitos e limita o resultado a 20 dígitos.

```javascript
import { parseProcessoJuridico } from '@brazilian-utils/brazilian-utils';

parseProcessoJuridico('0002080-25.2012.5.15.0049'); // '00020802520125150049'
```

### generateProcessoJuridico

Gera um número de processo jurídico válido aleatório no layout da Resolução CNJ nº 65/2008.

- **Opções** (`GenerateProcessoJuridicoParams`): `year` define o campo `AAAA`, um inteiro entre o ano atual e 9999 (padrão: o ano atual); `court` define o órgão `J`, de 1 a 9 (padrão: aleatório).
- `TR` é sorteado entre os tribunais do órgão escolhido, então o par sempre nomeia um tribunal que existe.
- Retorna `null` quando `year` ou `court` está fora do intervalo.

```javascript
import { generateProcessoJuridico } from '@brazilian-utils/brazilian-utils';

generateProcessoJuridico(); // '89478645020266070326'
generateProcessoJuridico({ year: 2026, court: 5 }); // '98412562120265087260' (Justiça do Trabalho, TRT da 8ª Região)
generateProcessoJuridico({ year: 10000 }); // null (ano fora do intervalo)
generateProcessoJuridico({ court: 10 }); // null (órgão inexistente)
```

Fonte: [Resolução CNJ nº 65/2008](https://atos.cnj.jus.br/atos/detalhar/119).

## Contas bancárias e bancos

### isValidBankAccount

Valida uma conta bancária brasileira. O `bankCode` precisa ser um participante do STR do Banco Central (a lista que `getBankByCode` usa).

- **Parâmetros** (`IsValidBankAccountParams`, todos strings): `bankCode` (3 dígitos), `agency` (1-5 dígitos), `account` (1-13 dígitos) e `digit` (1-2 caracteres, ou `X` para o Banco do Brasil e `P` para o Bradesco).
- Um banco da lista é validado de uma de três formas: por uma regra de dígito verificador, apenas pela estrutura ou por um fallback genérico mod10/mod11.
- Nenhum ato do Banco Central, de outro órgão de governo ou da Febraban define essas regras de dígito verificador. As dos bancos 001, 033, 041, 104, 237, 341, 399 e 745 vêm do compêndio "Regras de Validação de dígito verificador de agência e conta corrente" da Icatu Seguros, uma compilação privada da regra de cada banco. O Nubank não publica regra: o dígito de Verhoeff é o que validadores de código aberto deduziram de contas reais.
- Três bancos publicam a própria regra nos seus manuais de leiaute, e as regras daqui batem com elas: a [Caixa](https://www.caixa.gov.br/Downloads/cobranca-caixa/Manual_de_Leiaute_de_Arquivo_Eletronico_CNAB_400.pdf) os dois dígitos sobre a conta de 12 dígitos (notas NE051 e NE052), o Santander o dígito da conta ([Débito Automático 150 v08](https://www.santander.com.br/layout-de-arquivos), abril de 2026) e o [Banco do Brasil](https://www.bb.com.br/docs/pub/emp/empl/dwn/Doc5175Bloqueto.pdf) só o dígito da agência (Anexo XI); do dígito da conta ele diz só "módulo 11".
- Os únicos textos oficiais sobre esses dígitos dizem que não há regra comum: o [Layout Padrão CNAB 240 v11.0](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2011_0%20-%202026_09_11.pdf) da FEBRABAN (11/09/2026), notas G009, G011 e G012, chama cada um deles de "código adotado pelo Banco" e não dá algoritmo, e a API do DICT do Banco Central recebe a conta com o dígito e não calcula nada.

Bancos validados por uma regra de dígito verificador:

| Banco | Código | Agência | Conta | Observações |
| --- | --- | --- | --- | --- |
| Banco do Brasil | `001` | 4-5 dígitos | 8-10 dígitos | mod11 com pesos 2..9 ciclando da direita para a esquerda; `digit` pode ser `"X"` |
| Santander | `033` | 4 dígitos | 8 dígitos | pesos `9,7,3,1,0,0,9,7,1,3,1,9,7,3` sobre agência + `"00"` + conta, desprezando as dezenas |
| Banrisul | `041` | 4 dígitos | 9 dígitos | pesos `3,2,4,7,6,5,4,3,2`; resto 0 gera `0` e resto 1 gera `6`; `account` é tipo (2 dígitos) + conta (7 dígitos) |
| Caixa Econômica Federal | `104` | 4 dígitos | 11-12 dígitos | mod11 com pesos 2..9 em ciclo a partir da direita, e resultado acima de 9 vira `0`. Uma `account` de 12 dígitos (o formato dos leiautes da Caixa, "sem operação") aceita tanto o dígito da conta (sobre a conta) quanto o de agência/conta (sobre agência + conta); uma de 11 dígitos é operação (3 dígitos) + conta (8 dígitos), com o dígito sobre agência + conta. Até a 2.4.0 a conta de 12 dígitos era rejeitada |
| Bradesco | `237` | 4 dígitos | 7 dígitos | mod11 com pesos 2..7 ciclando da direita para a esquerda; resto 0 gera `0` e resto 1 gera `"P"` |
| Nubank | `260` | 4 dígitos | 5-13 dígitos | dígito de Verhoeff sobre a conta, ignorando zeros à esquerda (sem regra publicada; veja acima) |
| Itaú Unibanco | `341` | 4 dígitos | 5 dígitos | mod10 sobre agência + conta |
| HSBC / Kirton Bank | `399` | 4 dígitos | 6 dígitos | pesos `8,9,2,3,4,5,6,7,8,9` sobre agência + conta; resto 10 gera `0` |
| Citibank | `745` | 4 dígitos | 10 dígitos | pesos `11..2` sobre a conta; resto 0 ou 1 gera `0` |

Bancos validados apenas pela estrutura, já que não se conhece regra de dígito verificador deles (um único `digit` numérico basta):

| Banco | Código | | Banco | Código |
| --- | --- | --- | --- | --- |
| Inter | `077` | | Mercado Pago | `323` |
| Ailos | `085` | | C6 | `336` |
| XP | `102` | | PicPay | `380` |
| Unicred | `136` | | Cora | `403` |
| Stone | `197` | | Pan | `623` |
| BTG Pactual | `208` | | BV | `655` |
| Original | `212` | | Daycoval | `707` |
| PagBank | `290` | | Sicredi | `748` |
| BMG | `318` | | Sicoob | `756` |

- Todo outro banco da lista usa o fallback genérico: `digit` precisa bater com mod10 ou mod11 sobre a conta. Um `digit` de 2 caracteres encadeia mod10 e depois mod11.

```javascript
import { isValidBankAccount } from '@brazilian-utils/brazilian-utils';

isValidBankAccount({
  bankCode: '001',
  agency: '1584',
  account: '00210169',
  digit: '6'
}); // true (Banco do Brasil)

isValidBankAccount({
  bankCode: '341',
  agency: '2545',
  account: '02366',
  digit: '1'
}); // true (Itaú)

isValidBankAccount({
  bankCode: '104',
  agency: '0647',
  account: '00188888888',
  digit: '7'
}); // true (Caixa: operação "001" + conta "88888888")

isValidBankAccount({
  bankCode: '041',
  agency: '2664',
  account: '358507670',
  digit: '6'
}); // true (Banrisul: tipo "35" + conta "8507670")

isValidBankAccount({
  bankCode: '260',
  agency: '0001',
  account: '5216125',
  digit: '0'
}); // true (Nubank, Verhoeff)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: '0'
}); // true (Banco Inter, apenas estrutura)

isValidBankAccount({
  bankCode: '077',
  agency: '0001',
  account: '123456789',
  digit: 'X'
}); // false (banco validado por estrutura ainda exige dígito numérico)

isValidBankAccount({
  bankCode: '999',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // false (999 não é participante do Banco Central)

isValidBankAccount({
  bankCode: '246',
  agency: '1234',
  account: '123456',
  digit: '6'
}); // true (Banco ABC Brasil, fallback genérico mod10)
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv) (oficial). Baseado em: o compêndio da Icatu Seguros [Regras de Validação de dígito verificador de agência e conta corrente](https://github.com/eduardokum/laravel-boleto/blob/master/manuais/Regras%20Validacao%20Conta%20Corrente%20VI_EPS.pdf) e, para o Nubank, o [bran_checker](https://github.com/Xerpa/bran_checker/tree/master/lib/banks).

### getBanks

Obtém todos os bancos brasileiros com código de compensação (COMPE), a partir da lista de participantes do STR do Banco Central do Brasil.

- Cada banco (`Bank`) tem um `code` (COMPE, 3 dígitos), um `ispb` (8 dígitos) e um `name`.

```javascript
import { getBanks } from '@brazilian-utils/brazilian-utils';

getBanks();
// [
//   { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' },
//   { code: '003', ispb: '04902979', name: 'BANCO DA AMAZONIA S.A.' },
//   { code: '004', ispb: '07237373', name: 'Banco do Nordeste do Brasil S.A.' },
//   ... mais 460 itens
// ]
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByCode

Busca um banco brasileiro pelo seu código de compensação (COMPE), a partir da lista de participantes do STR do Banco Central do Brasil. Aceita `string` ou `number`.

- Uma string tem removido todo caractere que não é dígito antes de o código ser completado para 3 dígitos.
- Retorna o `Bank` correspondente, ou `null` quando nenhum banco tem esse código.

```javascript
import { getBankByCode } from '@brazilian-utils/brazilian-utils';

getBankByCode('001'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode(1); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByCode('999'); // null
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv).

### getBankByIspb

Busca um banco brasileiro pelo seu ISPB (Identificador do Sistema de Pagamentos Brasileiro), o código de 8 caracteres de todo participante do SPB. Aceita `string` ou `number`, com ou sem zeros à esquerda.

- Desde a Resolução BCB nº 585/2026 o ISPB pode ter letras, então uma string de 8 letras e dígitos é buscada como está, em maiúsculas ou minúsculas. Todo caractere que não é letra nem dígito é ignorado (`'00.000.000'` é `'00000000'`), e uma letra nunca é descartada (`'0000000A'` não é `'00000000'`).

- Retorna o `Bank` correspondente, ou `null` quando nenhum banco tem esse ISPB. A base só traz as instituições que também têm código COMPE.

```javascript
import { getBankByIspb } from '@brazilian-utils/brazilian-utils';

getBankByIspb('00000000'); // { code: '001', ispb: '00000000', name: 'Banco do Brasil S.A.' }
getBankByIspb('60701190'); // { code: '341', ispb: '60701190', name: 'ITAÚ UNIBANCO S.A.' }
getBankByIspb('99999999'); // null
```

Fonte: [lista de participantes do STR](https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv), [BrasilAPI](https://brasilapi.com.br/api/banks/v1).

## IBAN

### isValidIban

Valida um IBAN (International Bank Account Number) brasileiro. Somente IBANs brasileiros (código de país `BR`) são reconhecidos; qualquer outro país retorna `false`.

- Layout, 29 caracteres (Resolução BCB 585/2026, art. 2º, que revogou a Circular BCB 3.625/2013 e manteve o layout): `BR`, 2 dígitos verificadores (ISO 7064 MOD 97-10), ISPB de 8 caracteres, agência de 5, conta de 10, 1 letra de tipo de conta, 1 indicador de titularidade.
- O ISPB pode ter letras: a Resolução o define como "oito caracteres alfanuméricos", onde a Circular dizia "numéricos". Até a 2.4.0 só dígitos eram aceitos.
- Tipo de conta: qualquer letra, normalmente `C` ou `P`. Titularidade: `1` a `9`, depois `A` a `Z`.
- Aceita a forma compacta ou grupos de 4 separados por um espaço, `.`, `-` ou `/`, em maiúsculas ou minúsculas.

```javascript
import { isValidIban } from '@brazilian-utils/brazilian-utils';

isValidIban('BR1500000000000010932840814P2'); // true
isValidIban('BR15 0000 0000 0000 1093 2840 814P 2'); // true (espaços de agrupamento)
isValidIban('BR15-0000-0000-0000-1093-2840-814P-2'); // true (qualquer um dos caracteres de máscara)
isValidIban('BR1012AB34CD000010932840814P2'); // true (ISPB alfanumérico)
isValidIban('BR1500000000000010932840814P3'); // false (dígitos verificadores inválidos)
isValidIban('BR15 000 00000 0000 1093 2840 814P 2'); // false (separador dentro de um grupo)
isValidIban('DE89370400440532013000'); // false (IBAN não brasileiro)
```

Fonte: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Resolução BCB nº 585/2026](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=585), que revogou a [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

### formatIban

Formata um IBAN no agrupamento impresso da ISO 13616: blocos de 4 caracteres, a apresentação usada em extratos e formulários bancários. Não valida; para isso, use `isValidIban`.

- Limita o resultado a 29 caracteres, o tamanho de um IBAN brasileiro.

```javascript
import { formatIban } from '@brazilian-utils/brazilian-utils';

formatIban('BR1500000000000010932840814P2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('br1500000000000010932840814p2'); // 'BR15 0000 0000 0000 1093 2840 814P 2'
formatIban('BR15'); // 'BR15'
formatIban('BR15 0000-0000.0000/1093 2840 814P-2'); // 'BR15 0000 0000 0000 1093 2840 814P 2' (só letras e dígitos são lidos)
```

### parseIban

Remove a formatação do IBAN, mantém as letras e os dígitos, coloca o resultado em maiúsculas e o limita aos 29 caracteres de um IBAN brasileiro.

```javascript
import { parseIban } from '@brazilian-utils/brazilian-utils';

parseIban('BR15 0000 0000 0000 1093 2840 814P 2'); // 'BR1500000000000010932840814P2'
parseIban('br15-0000.0000/0000 1093 2840 814p-2'); // 'BR1500000000000010932840814P2'
```

### getIbanInfo

Interpreta um IBAN brasileiro em seus campos. Retorna um objeto `IbanInfo`, ou `null` sempre que `isValidIban` retornaria `false`.

- Campos, todos strings: `countryCode`, `checkDigits`, `bankIspb`, `branch`, `account`, `accountType` (normalmente `C` ou `P`) e `owner` (`1` a `9`, depois `A` a `Z`).
- Mesmas regras de entrada de `isValidIban`.

```javascript
import { getIbanInfo } from '@brazilian-utils/brazilian-utils';

getIbanInfo('BR1500000000000010932840814P2');
// {
//   countryCode: 'BR',
//   checkDigits: '15',
//   bankIspb: '00000000',
//   branch: '00001',
//   account: '0932840814',
//   accountType: 'P',
//   owner: '2'
// }

getIbanInfo('DE89370400440532013000'); // null (IBAN não brasileiro)
getIbanInfo('BR15 000 00000 0000 1093 2840 814P 2'); // null (separador dentro de um grupo)
```

Fonte: [Diretrizes de Implementação do IBAN no Brasil](https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf), [Resolução BCB nº 585/2026](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=585), que revogou a [Circular BCB nº 3.625/2013](https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf), [ISO 13616-1:2020](https://www.iso.org/standard/81090.html).

## Moeda, números e datas por extenso

### formatCurrency

Formata um número ou uma string numérica no padrão BRL (`1.234,56`). Um `number` é formatado como está, com sinal e decimais preservados.

- **Opções** (`FormatCurrencyOptions`): `symbol` (padrão `false`) prefixa o resultado com `R$`; `precision` (padrão 2) define as casas decimais, limitada de 0 a 20.
- Uma `string` é lida como `parseCurrency` a lê, com uma diferença: um valor sem nenhum separador permanece em unidades inteiras, então `'1234'` vira `1.234,00`.
- Retorna `''` para um valor não finito ou que não pode ser convertido em número.

```javascript
import { formatCurrency } from '@brazilian-utils/brazilian-utils';

formatCurrency(10); // 10,00
formatCurrency(10756.11); // 10.756,11
formatCurrency(10756.123, { precision: 3 }); // 10.756,123
formatCurrency(1234.56, { symbol: true }); // R$ 1.234,56
formatCurrency(-1050); // -1.050,00 (o sinal de um number é preservado)
formatCurrency('123456'); // 123.456,00 (dígitos simples são lidos como número inteiro)
formatCurrency('1.234,56'); // 1.234,56 (o último "," ou "." seguido de 1 a 2 dígitos é o separador decimal)
formatCurrency('-10.5'); // -10,50 (o "-" inicial é preservado)
formatCurrency(Number.NaN); // "" (números não finitos viram string vazia)
```

### parseCurrency

Converte uma string de moeda no padrão BRL em número.

- **Opções** (`ParseCurrencyOptions`): `precision` (padrão 2) é a quantidade de dígitos lidos como subunidades monetárias, limitada de 0 a 20.
- O último `,` ou `.` seguido de 1 a 2 dígitos (até `precision`, quando maior) é o separador decimal; todo outro `,` ou `.` é separador de milhar.
- Um valor sem nenhum separador é lido como centavos e dividido por `10 ** precision`.

```javascript
import { parseCurrency } from '@brazilian-utils/brazilian-utils';

parseCurrency('R$ 1.234,56'); // 1234.56
parseCurrency('1234,56'); // 1234.56
parseCurrency('R$ 0,50'); // 0.5
parseCurrency('R$ 1.234'); // 1234 ("." seguido de 3 dígitos é separador de milhar)
parseCurrency('1,5'); // 1.5
parseCurrency('1234'); // 12.34 (sem nenhum separador, vale a convenção de centavos)
parseCurrency('-R$ 1,00'); // -1 (o "-" inicial é preservado)
parseCurrency('R$ 1,001', { precision: 3 }); // 1.001
parseCurrency(''); // 0
```

### convertNumberToWords

Escreve um número inteiro por extenso em português do Brasil: `1235` vira `"mil duzentos e trinta e cinco"`.

- **Opções** (`ConvertNumberToWordsOptions`): `gender` (padrão `"masculine"`) concorda "um/dois" e a centena ("duzentos/duzentas") com o substantivo que o número qualifica.
- Aceita inteiros de `-999999999999999` a `999999999999999` (999 trilhões). Um valor não inteiro é truncado em direção a zero.
- Retorna `""` para um valor fora desse intervalo ou não finito.
- O último grupo leva um "e" antes dele só quando é menor que 100 ou uma centena redonda: `1200` é `"mil e duzentos"` e `1100` é `"mil e cem"`, já `1235` é `"mil duzentos e trinta e cinco"` e `1101` é `"mil cento e um"`.

```javascript
import { convertNumberToWords } from '@brazilian-utils/brazilian-utils';

convertNumberToWords(123); // "cento e vinte e três"
convertNumberToWords(1001); // "mil e um"
convertNumberToWords(2000000); // "dois milhões"
convertNumberToWords(-42); // "menos quarenta e dois"
convertNumberToWords(2, { gender: 'feminine' }); // "duas"
convertNumberToWords(12.9); // "doze" (truncado em direção a zero)
convertNumberToWords(NaN); // ""
```

### convertCurrencyToWords

Escreve um valor em reais por extenso, como em cheques e contratos: `1523.45` vira `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`. Não recebe opções.

- O `value` é truncado (não arredondado) para 2 casas decimais.
- Retorna `""` para uma entrada inválida ou um valor acima de 999 trilhões de reais.
- O singular vale para exatamente um (`"um real"`, `"um centavo"`), e um milhão, bilhão ou trilhão redondo de reais leva "de": `"um milhão de reais"`.
- Um valor que trunca para nada é `"zero reais"`, mesmo se negativo (`-0.001`); qualquer outro valor negativo recebe o prefixo `"menos"`.
- Acima de cerca de 90 trilhões de reais (`Number.MAX_SAFE_INTEGER / 100`) um número não guarda centavos, então o valor é lido como reais inteiros.

```javascript
import { convertCurrencyToWords } from '@brazilian-utils/brazilian-utils';

convertCurrencyToWords(1523.45); // "mil quinhentos e vinte e três reais e quarenta e cinco centavos"
convertCurrencyToWords(1); // "um real"
convertCurrencyToWords(0.01); // "um centavo"
convertCurrencyToWords(1000000); // "um milhão de reais"
convertCurrencyToWords(0); // "zero reais"
convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
convertCurrencyToWords(-0.001); // "zero reais" (trunca para nada)
```

### convertDateToWords

Escreve uma data por extenso em português do Brasil: `"01/01/2024"` vira `"primeiro de janeiro de dois mil e vinte e quatro"`. Aceita um `Date`, lido pela sua data de calendário local, ou uma string no formato `"dd/mm/yyyy"` ou ISO `"yyyy-mm-dd"`.

- **Opções** (`ConvertDateToWordsOptions`): `style` (padrão `"full"`) escreve dia, mês e ano por extenso; `"month"` escreve só o mês e deixa dia e ano em dígitos, o dia 1 como `"1º"`. `weekday` (padrão `false`) prefixa o nome do dia da semana em minúsculas e uma vírgula.
- Retorna `""` para um `Date` inválido, uma string malformada, um dia ou mês que não existe ou uma data anterior ao ano 1.

```javascript
import { convertDateToWords } from '@brazilian-utils/brazilian-utils';

convertDateToWords('01/01/2024'); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('2024-01-02'); // "dois de janeiro de dois mil e vinte e quatro"
convertDateToWords(new Date(2024, 0, 1)); // "primeiro de janeiro de dois mil e vinte e quatro"
convertDateToWords('02/03/2024', { style: 'month' }); // "2 de março de 2024"
convertDateToWords('01/01/2024', { style: 'month' }); // "1º de janeiro de 2024"
convertDateToWords('02/03/2024', { weekday: true }); // "sábado, dois de março de dois mil e vinte e quatro"
convertDateToWords('10/05/1999'); // "dez de maio de mil novecentos e noventa e nove"
convertDateToWords('31/04/2024'); // "" (abril tem 30 dias)
convertDateToWords('invalid'); // ""
convertDateToWords('29/02/1900'); // "" (1900 não é bissexto)
```

## Estados e municípios

### getStates

Retorna todos os estados brasileiros, cada um com sigla, nome, código da região, nome da região e código IBGE de 2 dígitos (`cUF`).

- Ordenados por nome no locale "pt-BR".
- Exporta os tipos `State`, `StateCode` e `StateName`. `State` é uma união discriminada: estreitá-lo pelo `code` também estreita os demais campos.

```javascript
import { getStates } from '@brazilian-utils/brazilian-utils';

getStates();
// [
//   { code: 'AC', name: 'Acre', regionCode: 'N', regionName: 'Norte', ibgeCode: 12 },
//   { code: 'AL', name: 'Alagoas', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 27 },
//   { code: 'AP', name: 'Amapá', regionCode: 'N', regionName: 'Norte', ibgeCode: 16 },
//   { code: 'AM', name: 'Amazonas', regionCode: 'N', regionName: 'Norte', ibgeCode: 13 },
//   { code: 'BA', name: 'Bahia', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 29 },
//   { code: 'CE', name: 'Ceará', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 23 },
//   { code: 'DF', name: 'Distrito Federal', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 53 },
//   { code: 'ES', name: 'Espírito Santo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 32 },
//   { code: 'GO', name: 'Goiás', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 52 },
//   { code: 'MA', name: 'Maranhão', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 21 },
//   { code: 'MT', name: 'Mato Grosso', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 51 },
//   { code: 'MS', name: 'Mato Grosso do Sul', regionCode: 'CO', regionName: 'Centro-Oeste', ibgeCode: 50 },
//   { code: 'MG', name: 'Minas Gerais', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 31 },
//   { code: 'PA', name: 'Pará', regionCode: 'N', regionName: 'Norte', ibgeCode: 15 },
//   { code: 'PB', name: 'Paraíba', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 25 },
//   { code: 'PR', name: 'Paraná', regionCode: 'S', regionName: 'Sul', ibgeCode: 41 },
//   { code: 'PE', name: 'Pernambuco', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 26 },
//   { code: 'PI', name: 'Piauí', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 22 },
//   { code: 'RJ', name: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 33 },
//   { code: 'RN', name: 'Rio Grande do Norte', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 24 },
//   { code: 'RS', name: 'Rio Grande do Sul', regionCode: 'S', regionName: 'Sul', ibgeCode: 43 },
//   { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 },
//   { code: 'RR', name: 'Roraima', regionCode: 'N', regionName: 'Norte', ibgeCode: 14 },
//   { code: 'SC', name: 'Santa Catarina', regionCode: 'S', regionName: 'Sul', ibgeCode: 42 },
//   { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 },
//   { code: 'SE', name: 'Sergipe', regionCode: 'NE', regionName: 'Nordeste', ibgeCode: 28 },
//   { code: 'TO', name: 'Tocantins', regionCode: 'N', regionName: 'Norte', ibgeCode: 17 },
// ]
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getStateByCep

Retorna o estado brasileiro ao qual um CEP pertence, a partir das faixas de CEP que os Correios atribuem a cada UF (a "Faixa de CEP" de cada UF).

- Funciona offline: nenhuma API de CEP é chamada, então a resposta diz qual estado é dono da faixa, não se o CEP está em uso.
- Aceita o que o `isValidCep` aceita: 8 dígitos, como string ou número, ignorando espaços, pontos e hifens. Um CEP que começa com `0` precisa ser uma string, e um número negativo ou fracionário é rejeitado.
- Amazonas, Distrito Federal e Goiás têm duas faixas cada, e nenhuma faixa estadual cobre `00000-000` a `00999-999` nem `78900-000` a `78999-999`.
- A faixa é o bloco que pertence ao estado, não uma garantia de que todo CEP dentro dela está em uso: `10000-000` está sem uso dentro da faixa de São Paulo e ainda assim responde São Paulo.
- Retorna `null` para um CEP inválido ou fora de todas as faixas. Exporta o tipo `State`.

```javascript
import { getStateByCep } from '@brazilian-utils/brazilian-utils';

getStateByCep('01310-100');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByCep(20040020);
// { code: 'RJ', name: 'Rio de Janeiro', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 33 }

getStateByCep('69300-000')?.code; // 'RR'
getStateByCep('72800-000')?.code; // 'GO'
getStateByCep('00999-999'); // null
getStateByCep('12345'); // null
```

Fonte: [Correios, Busca Faixa de CEP](https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php)

### getStateByIbgeCode

Retorna o estado brasileiro cujo código IBGE de 2 dígitos (`cUF`, o Código da Unidade da Federação) corresponde ao valor informado.

- É o código de UF do primeiro campo de uma chave de acesso de DF-e, a que `isValidNfeKey` cobre.
- Aceita string ou número inteiro não negativo, com todo caractere que não é dígito removido da string (`'35/SP'` é `35`).
- Retorna `null` quando o código não corresponde a nenhum estado. Exporta o tipo `State`.

```javascript
import { getStateByIbgeCode } from '@brazilian-utils/brazilian-utils';

getStateByIbgeCode('35');
// { code: 'SP', name: 'São Paulo', regionCode: 'SE', regionName: 'Sudeste', ibgeCode: 35 }

getStateByIbgeCode(11);
// { code: 'RO', name: 'Rondônia', regionCode: 'N', regionName: 'Norte', ibgeCode: 11 }

getStateByIbgeCode('00'); // null
getStateByIbgeCode(-35); // null
getStateByIbgeCode(3.5); // null
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/v1/localidades/estados), [Manual de Orientação do Contribuinte](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf)

### getStateCodeByName

Retorna a sigla de um estado brasileiro a partir do nome completo.

- A comparação ignora acentos, não diferencia maiúsculas de minúsculas e remove os espaços nas pontas; espaços internos repetidos viram um só.
- Retorna `null` quando nenhum estado corresponde. Exporta o tipo `StateCode`.

```javascript
import { getStateCodeByName } from '@brazilian-utils/brazilian-utils';

getStateCodeByName('São Paulo'); // 'SP'
getStateCodeByName('sao paulo'); // 'SP'
getStateCodeByName('  Rio de Janeiro  '); // 'RJ'
getStateCodeByName('Neverland'); // null
```

### getStateNameByCode

Retorna o nome completo de um estado brasileiro a partir da sigla.

- A comparação não diferencia maiúsculas de minúsculas e remove os espaços nas pontas.
- Retorna `null` quando nenhum estado corresponde. Exporta o tipo `StateName`.

```javascript
import { getStateNameByCode } from '@brazilian-utils/brazilian-utils';

getStateNameByCode('SP'); // 'São Paulo'
getStateNameByCode('sp'); // 'São Paulo'
getStateNameByCode('  Rj  '); // 'Rio de Janeiro'
getStateNameByCode('ZZ'); // null
```

### getStateCapital

Retorna a capital de um estado brasileiro, no mesmo formato `{ code, name, stateCode }` (`Municipality`) que o `getMunicipalityByCode` retorna para ela.

- A busca ignora maiúsculas e minúsculas e os espaços nas pontas. Retorna `null` quando nenhum estado corresponde.
- Para o Distrito Federal, que não tem municípios, a capital é Brasília, com o código que o IBGE dá ao distrito todo.

```javascript
import { getStateCapital } from '@brazilian-utils/brazilian-utils';

getStateCapital('SP'); // { code: '3550308', name: 'São Paulo', stateCode: 'SP' }
getStateCapital('to'); // { code: '1721000', name: 'Palmas', stateCode: 'TO' }
getStateCapital('ZZ'); // null
```

Fonte: [IBGE, Anuário Estatístico do Brasil, tabela 1.1.1.2 (capitais, 2025)](https://anuario.ibge.gov.br/2024/territorio/posicao-e-extensao.html).

### getRegions

Retorna as cinco Grandes Regiões do Brasil, cada uma com o código (o mesmo `regionCode` de cada estado), o nome e o identificador do IBGE, na ordem desse identificador. Exporta os tipos `Region` e `RegionCode`.

```javascript
import { getRegions } from '@brazilian-utils/brazilian-utils';

getRegions();
// [
//   { code: 'N', name: 'Norte', ibgeCode: 1 },
//   { code: 'NE', name: 'Nordeste', ibgeCode: 2 },
//   { code: 'SE', name: 'Sudeste', ibgeCode: 3 },
//   { code: 'S', name: 'Sul', ibgeCode: 4 },
//   { code: 'CO', name: 'Centro-Oeste', ibgeCode: 5 },
// ]
```

Fonte: [IBGE, API de Localidades, `regioes`](https://servicodados.ibge.gov.br/api/v1/localidades/regioes).

### getStatesByRegion

Retorna os estados de uma região, dado o código dela (`'N'`, `'NE'`, `'SE'`, `'S'` ou `'CO'`), em ordem alfabética, como o `getStates` ordena.

- A busca ignora maiúsculas e minúsculas e os espaços nas pontas. Retorna `[]` quando nenhuma região corresponde.

```javascript
import { getStatesByRegion } from '@brazilian-utils/brazilian-utils';

getStatesByRegion('S').map((state) => state.code); // ['PR', 'RS', 'SC']
getStatesByRegion('co').map((state) => state.code); // ['DF', 'GO', 'MT', 'MS']
getStatesByRegion('X'); // []
```

Fonte: [IBGE, API de Localidades, `estados`](https://servicodados.ibge.gov.br/api/v1/localidades/estados).

### getTimezoneByState

Retorna o nome do fuso horário IANA (zona do tzdata) de um estado brasileiro: o fuso da sua capital.

- A comparação não diferencia maiúsculas de minúsculas e remove os espaços nas pontas.
- Retorna `null` quando nenhum estado corresponde.

```javascript
import { getTimezoneByState } from '@brazilian-utils/brazilian-utils';

getTimezoneByState('SP'); // 'America/Sao_Paulo'
getTimezoneByState('am'); // 'America/Manaus'
getTimezoneByState('AC'); // 'America/Rio_Branco'
getTimezoneByState('PE'); // 'America/Recife'
getTimezoneByState('ZZ'); // null
```

Fonte: [IANA Time Zone Database](https://www.iana.org/time-zones)

### getMunicipalities

Retorna os municípios brasileiros publicados pelo IBGE: todos os municípios, ou só os de um estado quando `stateCode` é informado.

- Cada município (`Municipality`) é `{ code, name, stateCode }`, onde `code` é o código IBGE de 7 dígitos. Ordenados por nome no locale "pt-BR".
- Só um `stateCode` omitido (ou `undefined`) pede a lista completa: `null` e `''` retornam `[]`.
- `stateCode` ignora maiúsculas/minúsculas e espaços nas pontas: `'sp'` retorna os municípios de São Paulo, como `'SP'` (até a 2.4.0 retornava `[]`).
- Embute todos os 5571 municípios, os mesmos códigos da [Divisão Territorial Brasileira 2025](https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip) do IBGE (data base 31/12/2025). Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle) para carregá-lo sob demanda via `@brazilian-utils/brazilian-utils/get-municipalities`.

```javascript
import { getMunicipalities } from '@brazilian-utils/brazilian-utils';

// Retorna todos os municípios brasileiros (ordenados por nome).
getMunicipalities();
// [
//   { code: '5200050', name: 'Abadia de Goiás', stateCode: 'GO' },
//   { code: '3100104', name: 'Abadia dos Dourados', stateCode: 'MG' },
//   { code: '5200100', name: 'Abadiânia', stateCode: 'GO' },
//   { code: '3100203', name: 'Abaeté', stateCode: 'MG' },
//   { code: '1500107', name: 'Abaetetuba', stateCode: 'PA' },
//   ... mais 5566 itens
// ]

// Retorna todos os municípios do estado de São Paulo.
getMunicipalities('SP');
// [
//   { code: '3500105', name: 'Adamantina', stateCode: 'SP' },
//   { code: '3500204', name: 'Adolfo', stateCode: 'SP' },
//   { code: '3500303', name: 'Aguaí', stateCode: 'SP' },
//   { code: '3500402', name: 'Águas da Prata', stateCode: 'SP' },
//   { code: '3500501', name: 'Águas de Lindóia', stateCode: 'SP' },
//   ... mais 640 itens
// ]

getMunicipalities('ZZ'); // []
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipalityByCode

Busca um município brasileiro pelo código IBGE de 7 dígitos.

- Aceita o código como string ou número inteiro não negativo, com todo caractere que não é dígito removido da string.
- Retorna `{ code, name, stateCode }` (`Municipality`), ou `null` quando o código não tem 7 dígitos ou não corresponde a nenhum município.

```javascript
import { getMunicipalityByCode } from '@brazilian-utils/brazilian-utils';

getMunicipalityByCode('3550308');
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode(3550308);
// { code: '3550308', name: 'São Paulo', stateCode: 'SP' }

getMunicipalityByCode('0000000'); // null (código desconhecido)
getMunicipalityByCode('123'); // null (não tem 7 dígitos)
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getCodeByMunicipalityName

Busca o código IBGE de 7 dígitos de um município brasileiro pelo nome e pela sigla do estado. É a versão offline e síncrona do `get_code_by_municipality_name` da biblioteca Python, que consulta a API do IBGE pela rede.

- O nome ignora acentos, cedilha e maiúsculas/minúsculas. Sequências de espaços viram um só e os espaços em volta são removidos, mas um nome escrito sem um espaço que o nome do IBGE tem não é encontrado (`'saopaulo'`).
- Recebe um único objeto, `{ municipalityName, stateCode }` (`GetCodeByMunicipalityNameParams`), com os dois campos obrigatórios. A sigla do estado ignora maiúsculas/minúsculas e espaços em volta, como em todo util que recebe UF. Ela é obrigatória, porque o mesmo nome pode ser de municípios de estados diferentes (`'Bom Jesus'` existe no PI, no RS e em outros estados).
- Retorna o código como string, ou `null` quando a sigla não é de um estado ou nenhum município daquele estado tem esse nome.
- Embute os 5571 municípios, a mesma tabela de `getMunicipalityByCode`. Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle) para carregá-la sob demanda via `@brazilian-utils/brazilian-utils/get-code-by-municipality-name`.

```javascript
import { getCodeByMunicipalityName } from '@brazilian-utils/brazilian-utils';

getCodeByMunicipalityName({ municipalityName: 'Conceição do Coité', stateCode: 'Ba' }); // '2908408'
getCodeByMunicipalityName({ municipalityName: 'sao paulo', stateCode: 'sp' }); // '3550308'
getCodeByMunicipalityName({ municipalityName: 'Bom Jesus', stateCode: 'RS' }); // '4302303'
getCodeByMunicipalityName({ municipalityName: 'São Paulo', stateCode: 'RJ' }); // null (não há São Paulo no Rio de Janeiro)
getCodeByMunicipalityName({ municipalityName: 'Município Inexistente', stateCode: 'RS' }); // null
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getCities

Retorna os nomes das cidades brasileiras: todas as cidades, ou só as de um estado. **Descontinuada:** use `getMunicipalities` no lugar.

- Ordenadas no locale "pt-BR".
- Qualquer `state` falsy pede a lista completa, enquanto `getMunicipalities` retorna `[]`.
- `state` ignora maiúsculas/minúsculas e espaços nas pontas: `'sp'` retorna as cidades de São Paulo, como `'SP'` (até a 2.4.0 retornava `[]`).
- Embute os 5571 nomes (~153,4 KB minificado, ~49,2 KB com gzip). Veja [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle) para carregá-la sob demanda via `@brazilian-utils/brazilian-utils/get-cities`.

```javascript
import { getCities } from '@brazilian-utils/brazilian-utils';

// Retorna todas as cidades brasileiras (ordenadas alfabeticamente).
getCities();
// [
//   'Abadia de Goiás',
//   'Abadia dos Dourados',
//   'Abadiânia',
//   'Abaeté',
//   'Abaetetuba',
//   'Abaiara',
//   'Abaíra',
//   'Abaré',
//   'Abatiá',
//   'Abdon Batista',
//   ... mais 5561 itens
// ]

// Retorna todas as cidades brasileiras do estado de São Paulo (ordenadas alfabeticamente).
getCities('SP');
// [
//   "Adamantina",
//   "Adolfo",
//   "Aguaí",
//   "Águas da Prata",
//   "Águas de Lindóia",
//   "Águas de Santa Bárbara",
//   "Águas de São Pedro",
//   "Agudos",
//   "Alambari",
//   "Alfredo Marcondes",
//   ... mais 635 itens
// ]
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

### getMunicipality

Busca informações de município por código IBGE, ou um código IBGE a partir do nome do município e UF. **Descontinuada:** use `getMunicipalityByCode` para um código e `getCodeByMunicipalityName` para um nome, que são síncronas e offline.

- Uma única função cobre as duas direções, dependendo se `options` tem `code` ou `municipalityName`/`uf`. A busca é offline: nenhuma requisição de rede é feita.
- A comparação do nome ignora acentos, não diferencia maiúsculas de minúsculas e reduz espaços repetidos a um só.
- Resolve para `null` para um município desconhecido, uma UF desconhecida ou uma entrada inválida.
- `GetMunicipalityOptions`, `GetMunicipalityByCodeOptions` e `GetMunicipalityByNameOptions` são aliases descontinuados dos tipos abaixo.

```javascript
import { getMunicipality } from '@brazilian-utils/brazilian-utils';

await getMunicipality({ code: '3550308' });
// ['São Paulo', 'SP']

await getMunicipality({ code: 3550308 });
// ['São Paulo', 'SP']

await getMunicipality({ municipalityName: 'sao paulo', uf: 'sp' });
// '3550308'

await getMunicipality({ code: '0000000' });
// null (código desconhecido)

await getMunicipality({ code: '123' });
// null (não tem 7 dígitos)
```

```typescript
import {
  getMunicipality,
  type GetMunicipalityByCodeParams,
  type GetMunicipalityByNameParams,
  type GetMunicipalityParams,
} from '@brazilian-utils/brazilian-utils';

const byCode: GetMunicipalityByCodeParams = { code: '3550308' };
const byName: GetMunicipalityByNameParams = { municipalityName: 'sao paulo', uf: 'sp' };

await getMunicipality(byCode);
// Promise<[string, string] | null>

await getMunicipality(byName);
// Promise<string | null>

const lookUp = (options: GetMunicipalityParams) => getMunicipality(options);
// (options: GetMunicipalityParams) => Promise<[string, string] | string | null>
```

Fonte: [IBGE Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)

## Feriados e dias úteis

### getHolidays

Retorna os feriados brasileiros de um ano: os nacionais e, com um `stateCode`, também os daquele estado. Aceita um ano ou `{ year, stateCode }` (`GetHolidaysParams`).

- Cada feriado é um `Holiday` cujo `type` (`HolidayType`) é `"national"`, `"state"`, `"optional"` ou `"religious"`. Os feriados vêm ordenados por data.
- O "Dia da Consciência Negra", 20/11, é nacional a partir de 2024.
- O primeiro turno das eleições, "Eleições (primeiro turno)", é feriado nacional nos anos pares a partir de 1998 (Código Eleitoral, art. 380): o primeiro domingo de outubro, ou 15/11 em 2020 (EC nº 107/2020). O segundo turno fica de fora, porque só acontece onde é necessário. Por cair num domingo, nunca muda uma contagem de dias úteis. Antes de 1998, a Lei nº 1.266/1950 fazia do dia das eleições gerais um feriado nacional, então as que caíram num dia de semana também são listadas: 3/10 de 1955 e 1958 ("Eleições gerais") e de 1990 e 1994 ("Eleições (primeiro turno)"). O 3/10/1960 fica de fora, porque nenhum texto oficial encontrado data a eleição presidencial daquele ano, assim como a eleição municipal de 3/10/1996.
- Cada feriado nacional de data fixa só é listado nos anos em que uma norma federal o declarava (a Sexta-feira Santa, que as portarias do calendário federal listam como feriado nacional todo ano, é listada em todos os anos): Nossa Senhora Aparecida a partir de 1980, Natal a partir de 1922, Dia do trabalhador a partir de 1925, Tiradentes até 1930, de 1933 a 1948 e a partir de 1951, e Finados até 1948 e a partir de 2003. A Lei nº 662/1949 deixou Finados fora dos feriados nacionais que o Decreto-lei nº 486/1938 listava, e só a Lei nº 10.607/2002 o recolocou (o parecer da Câmara sobre o projeto: "Só inova ao sugerir o dia de finados"); até a 2.4.0 ele era listado em todos os anos. As outras "festas nacionais" do primeiro calendário republicano (Decreto nº 155-B/1890 e Decreto nº 3/1891: 24/2, 3/5, 13/5, 14/7 e 12/10) são listadas até 1930, e o 3/5 (de 1936 a 1938), o 16/7 e o 12/10 (em 1936 e 1937) de novo pela Lei nº 108/1935.
- As entradas `"optional"` são os pontos facultativos de dia inteiro do calendário federal (Portarias MGI nº 8.617/2023, 9.783/2024 e 11.460/2025, de 2024 a 2026, que listam as duas datas de Carnaval como ponto facultativo, nunca como feriado nacional): a segunda e a terça-feira de Carnaval e o Corpus Christi, os mesmos três dias que o mercado financeiro não conta como úteis (Resolução CMN nº 4.880/2020), mais os estaduais que uma norma estadual declara (o 08/12 do AM a partir de 1999, que o estado declara para as suas repartições por decreto, e o 06/03 de PE em 2008 e 2009). O `includeOptional` liga e desliga exatamente esses. Os parciais ficam de fora: a Quarta-feira de Cinzas (até as 14h), 28/10 (Dia do Servidor Público) e as tardes de 24/12 e 31/12.
- As regras por estado (o deslocamento para domingo em SC da data que cai de segunda a sábado, como o Decreto SC nº 1.460/2018 fez com o 11/08 que caiu num sábado; a data magna de PE no primeiro domingo de março de 2010 a 2017; o 30/11 de AL antecipado para segunda quando cai na terça e adiado para sexta quando cai na quinta, o Corpus Christi no DF, no MA (desde 2024) e no RJ (desde 2026), e a terça-feira de Carnaval no RJ com tipo `"state"`, datas que deixaram de ser feriado) seguem a lei de cada estado; veja a fonte para a lista. O 16/09 de AL é feriado estadual a partir de 2011, como os decretos de calendário do estado o chamam antes da Lei AL nº 9.358/2024. Uma lei estadual que o STF derrubou não tem entrada em nenhum ano: o 18/06 de RO (ADI 3940) e o 25/07 do AP (ADI 4820).
- Outros deslocamentos não são aplicados e a data da lei é a retornada: a lei do AC adia para a sexta-feira os feriados que caem de terça a quinta (Lei AC nº 2.126/2009), mas os próprios decretos anuais do estado a aplicam de forma desigual (em 2026 o 20/1 é adiado e o 17/11, uma terça, fica na data).
- As três datas de GO (26/7, 24/10, 28/10) são os "feriados estaduais" do estatuto dos servidores do estado, listados a partir de 1986 (Lei GO nº 9.990/1986, depois Lei GO nº 10.460/1988 e Lei GO nº 20.756/2020, art. 269, II); os mesmos estatutos faziam do 2/11 feriado em GO de 1986 a 2002, os anos em que ele não era nacional. Não foi achada lei goiana que fixe uma data magna como feriado civil. O governador transfere o 26/7 por decreto todo ano (2025: 28/7; 2026: 20/7), e o 28/10 na maioria dos anos (2025: 27/10; 2026: 30/10), então a data da lei, que é a retornada aqui, muitas vezes não é o dia observado.
- Cada feriado estadual só é listado a partir do primeiro ano em que a sua lei estadual se aplicava (o 9 de julho de SP a partir de 1997, o São Jorge do RJ a partir de 2008, o 11 de agosto de SC a partir de 2004), então um ano mais antigo tem menos feriados estaduais.
- `stateCode` ignora maiúsculas/minúsculas e espaços nas pontas (`'sp'` é `'SP'`). Só um `stateCode` omitido (ou `undefined`) pede apenas os feriados nacionais: qualquer outro valor que não seja uma sigla de estado (`'XX'`, `''`, um valor que não é string) retorna `[]`. Até a 2.4.0 um código desconhecido era ignorado e os feriados nacionais eram retornados, então um erro de digitação como `'sp'` perdia os feriados do estado sem aviso.
- Retorna `[]` quando o ano não é um inteiro de 1900 a 2099, ou quando o argumento não é nem número nem objeto.

```javascript
import { getHolidays } from '@brazilian-utils/brazilian-utils';

// Obtém os feriados de 2024, nacionais e facultativos
getHolidays(2024);
// [
//   { name: 'Ano novo', date: Date('2024-01-01'), type: 'national' },
//   { name: 'Carnaval (segunda-feira)', date: Date('2024-02-12'), type: 'optional' },
//   { name: 'Carnaval (terça-feira)', date: Date('2024-02-13'), type: 'optional' },
//   { name: 'Sexta-feira Santa', date: Date('2024-03-29'), type: 'national' },
//   { name: 'Páscoa', date: Date('2024-03-31'), type: 'religious' },
//   { name: 'Tiradentes', date: Date('2024-04-21'), type: 'national' },
//   { name: 'Dia do trabalhador', date: Date('2024-05-01'), type: 'national' },
//   { name: 'Corpus Christi', date: Date('2024-05-30'), type: 'optional' },
//   { name: 'Independência do Brasil', date: Date('2024-09-07'), type: 'national' },
//   { name: 'Eleições (primeiro turno)', date: Date('2024-10-06'), type: 'national' },
//   { name: 'Nossa Senhora Aparecida', date: Date('2024-10-12'), type: 'national' },
//   { name: 'Finados', date: Date('2024-11-02'), type: 'national' },
//   { name: 'Proclamação da República', date: Date('2024-11-15'), type: 'national' },
//   { name: 'Dia da Consciência Negra', date: Date('2024-11-20'), type: 'national' },
//   { name: 'Natal', date: Date('2024-12-25'), type: 'national' },
// ]

// Obtém feriados para um estado específico
getHolidays({ year: 2024, stateCode: 'SP' });
// Inclui feriados nacionais mais feriados estaduais (ex: "Revolução Constitucionalista")
```

Fonte: `src/get-holidays/constants.ts`, [Lei nº 662/1949](https://www.planalto.gov.br/ccivil_03/leis/l0662.htm), [Lei nº 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm).

### isHoliday

Verifica se uma data é feriado brasileiro. Aceita `{ targetDate, stateCode? }` (`IsHolidayParams`).

- A verificação usa a data de calendário local de `targetDate`, não o seu instante UTC.
- `stateCode` também considera os feriados daquele estado, lido como em `getHolidays` (maiúsculas/minúsculas e espaços nas pontas são ignorados).
- Retorna `false` quando `targetDate` está ausente ou não é um `Date` válido, ou quando `stateCode` está presente e não é uma sigla de estado (`'XX'`, `''`, um valor que não é string), mesmo num feriado nacional.
- Retorna `false` para um ano fora de 1900 a 2099, em que o `getHolidays` não lista nada.
- As entradas `"optional"` e `"religious"` do `getHolidays` contam: segunda e terça de Carnaval, Corpus Christi e Páscoa fazem o `isHoliday` retornar true. Aqui não há `includeOptional`, ao contrário do `isBusinessDay`.

```javascript
import { isHoliday } from '@brazilian-utils/brazilian-utils';

isHoliday({ targetDate: new Date(2024, 0, 1) }); // true
isHoliday({ targetDate: new Date(2024, 6, 9), stateCode: 'SP' }); // true
isHoliday(); // false
```

### isBusinessDay

Verifica se uma data é dia útil no Brasil: não é sábado, domingo nem um feriado que `getHolidays` lista para o seu dia de calendário local.

- **Opções** (`BusinessDayOptions`, as mesmas de todos os utilitários de dias úteis): `includeOptional` (padrão `true`) também conta os feriados `"optional"`, a segunda e a terça-feira de Carnaval e o Corpus Christi, como dias não úteis; `includeSaturday` (padrão `false`) conta o sábado como dia útil; `stateCode` também conta os feriados daquele estado.
- Com `includeSaturday` desligado, é uma contagem de segunda a sexta. Ela não é, por si só, o calendário de bancos ou tribunais: o mercado financeiro também não conta a segunda e a terça-feira de Carnaval e o Corpus Christi (Resolução CMN nº 4.880/2020, art. 6º), que o `includeOptional` padrão cobre, e os bancos fecham nos feriados locais; a Justiça Federal também fecha de 20/12 a 6/1, de quarta-feira santa ao domingo de Páscoa, na segunda e na terça-feira de Carnaval, em 11/8, 1º e 2/11 e 8/12 (Lei nº 5.010/1966, art. 62), e os prazos processuais seguem o calendário de cada tribunal (CPC, art. 216). Ligado, é a contagem trabalhista do prazo de pagamento do salário do art. 459, § 1º, da CLT, a que a fiscalização do trabalho lê pela Instrução Normativa MTP nº 2/2021, art. 14, I: "na contagem dos dias será incluído o sábado, excluindo-se o domingo e o feriado, inclusive o municipal".
- Com `includeSaturday` ligado, o domingo e os feriados continuam excluídos, então um feriado que cai em um sábado continua não sendo dia útil.
- O trecho "inclusive o municipal" dessa regra não é coberto: `getHolidays` tem apenas feriados nacionais e estaduais, então um feriado municipal é contado aqui como dia útil comum. Retire os feriados municipais por conta própria quando a contagem precisar ser exata para um município.
- Retorna `false` quando `value` não é um `Date` válido ou o seu ano está fora de 1900 a 2099, ou quando `stateCode` está presente e não é uma sigla de estado (`'XX'`, `''`, um valor que não é string). Maiúsculas/minúsculas e espaços nas pontas de `stateCode` são ignorados.

```javascript
import { isBusinessDay } from '@brazilian-utils/brazilian-utils';

isBusinessDay(new Date(2024, 0, 2)); // true (terça-feira, não é feriado)
isBusinessDay(new Date(2024, 0, 1)); // false (Ano novo)
isBusinessDay(new Date(2024, 0, 6)); // false (sábado)
isBusinessDay(new Date(2024, 0, 6), { includeSaturday: true }); // true (contagem trabalhista)
isBusinessDay(new Date(2024, 8, 7), { includeSaturday: true }); // false (Independência, feriado em um sábado)
isBusinessDay(new Date(2024, 0, 7), { includeSaturday: true }); // false (o domingo nunca é incluído)
isBusinessDay(new Date(2024, 1, 12)); // false (segunda-feira de Carnaval, feriado facultativo, conta por padrão)
isBusinessDay(new Date(2024, 1, 13)); // false (terça-feira de Carnaval, feriado facultativo, conta por padrão)
isBusinessDay(new Date(2024, 1, 13), { includeOptional: false }); // true
isBusinessDay(new Date(2024, 6, 9), { stateCode: 'SP' }); // false (Revolução Constitucionalista)
isBusinessDay(new Date(2024, 6, 9)); // true (feriado estadual ignorado sem stateCode)
isBusinessDay(new Date('not a date')); // false
```

### addBusinessDays

Soma dias úteis a uma data, pulando sábados, domingos e os feriados que `isBusinessDay` considera. Assinatura: `addBusinessDays(date, amount, options?)`, a mesma do date-fns.

- **Opções** (`BusinessDayOptions`, as mesmas de `isBusinessDay`): `includeOptional` (padrão `true`) também pula a segunda e a terça-feira de Carnaval e o Corpus Christi; `includeSaturday` (padrão `false`) conta o sábado como dia útil; `stateCode` também pula os feriados daquele estado.
- Retorna um novo `Date`, com o horário preservado; `date` não é alterado.
- `amount` igual a `0` retorna a mesma data, mesmo em fim de semana ou feriado. Um `amount` negativo anda para trás.
- Retorna `null` quando `date` é inválido, `amount` não é um inteiro finito, `stateCode` está presente e não é uma sigla de estado ou o resultado sai dos anos de 1900 a 2099.

```javascript
import { addBusinessDays } from '@brazilian-utils/brazilian-utils';

addBusinessDays(new Date(2024, 0, 2, 12), 1); // Date, 2024-01-03 12:00 (o dia seguinte já é útil)
addBusinessDays(new Date(2024, 11, 31, 12), 1); // Date, 2025-01-02 12:00 (2025-01-01 é Ano novo, pulado)
addBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-04 12:00 (anda para trás)
addBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (sem alteração, mesmo o sábado não sendo dia útil)
addBusinessDays(new Date(2024, 0, 5, 12), 1, { includeSaturday: true }); // Date, 2024-01-06 12:00 (contagem trabalhista, o sábado conta)
addBusinessDays(new Date(2024, 10, 1, 12), 1, { includeSaturday: true }); // Date, 2024-11-04 12:00 (2024-11-02 é Finados, feriado em um sábado)
addBusinessDays(new Date(2024, 6, 8, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-10 12:00 (2024-07-09 é a Revolução Constitucionalista em SP, pulado)
addBusinessDays(new Date('not a date'), 1); // null
addBusinessDays(new Date(2024, 0, 2), 1.5); // null (não é um número inteiro)
```

### subBusinessDays

Subtrai dias úteis de uma data. `subBusinessDays(date, amount, options?)` é `addBusinessDays(date, -amount, options)`.

- As mesmas regras de `addBusinessDays`, `BusinessDayOptions` incluídas. Um `amount` negativo anda para frente.

```javascript
import { subBusinessDays } from '@brazilian-utils/brazilian-utils';

subBusinessDays(new Date(2024, 0, 5, 12), 1); // Date, 2024-01-04 12:00 (o dia anterior já é útil)
subBusinessDays(new Date(2024, 0, 8, 12), 1); // Date, 2024-01-05 12:00 (anda para trás passando pelo fim de semana)
subBusinessDays(new Date(2025, 0, 2, 12), 1); // Date, 2024-12-31 12:00 (2025-01-01 é Ano novo, pulado)
subBusinessDays(new Date(2024, 0, 5, 12), -1); // Date, 2024-01-08 12:00 (anda para frente)
subBusinessDays(new Date(2024, 0, 6, 12), 0); // Date, 2024-01-06 12:00 (sem alteração, mesmo o sábado não sendo dia útil)
subBusinessDays(new Date(2024, 0, 8, 12), 1, { includeSaturday: true }); // Date, 2024-01-06 12:00 (contagem trabalhista, o sábado conta)
subBusinessDays(new Date(2024, 10, 4, 12), 1, { includeSaturday: true }); // Date, 2024-11-01 12:00 (2024-11-02 é Finados, feriado em um sábado)
subBusinessDays(new Date(2024, 6, 10, 12), 1, { stateCode: 'SP' }); // Date, 2024-07-08 12:00 (2024-07-09 é a Revolução Constitucionalista em SP, pulado)
subBusinessDays(new Date('not a date'), 1); // null
subBusinessDays(new Date(2024, 0, 2), 1.5); // null (não é um número inteiro)
```

Para o n-ésimo dia útil de um mês, ou o último, comece do dia logo fora do mês:

```javascript
import { addBusinessDays, subBusinessDays } from '@brazilian-utils/brazilian-utils';

// n-ésimo dia útil do mês: some n a partir do último dia do mês anterior
addBusinessDays(new Date(2024, 0, 0), 5); // Date, 2024-01-08 00:00 (5º dia útil de janeiro de 2024)
addBusinessDays(new Date(2024, 1, 0), 10); // Date, 2024-02-16 00:00 (10º de fevereiro de 2024, segunda e terça-feira de Carnaval puladas)

// último dia útil do mês: subtraia 1 a partir do primeiro dia do mês seguinte
subBusinessDays(new Date(2024, 3, 1), 1); // Date, 2024-03-28 00:00 (2024-03-29 é Sexta-feira Santa, seguida de um fim de semana)
subBusinessDays(new Date(2024, 1, 1), 2); // Date, 2024-01-30 00:00 (penúltimo de janeiro de 2024)

// prazo do salário do art. 459, § 1º, da CLT: o 5º dia útil na contagem trabalhista
addBusinessDays(new Date(2024, 2, 0), 5, { includeSaturday: true }); // Date, 2024-03-06 00:00 (2024-03-02, um sábado, conta; a contagem de segunda a sexta dá 2024-03-07)
addBusinessDays(new Date(2024, 10, 0), 5, { includeSaturday: true }); // Date, 2024-11-07 00:00 (2024-11-02 é Finados, um feriado num sábado)
subBusinessDays(new Date(2024, 8, 1), 1, { includeSaturday: true }); // Date, 2024-08-31 00:00 (último dia útil de agosto de 2024, um sábado)
```

- Um `n` maior que os dias úteis do mês cai no mês seguinte (`addBusinessDays(new Date(2024, 0, 0), 23)` é 2024-02-01, janeiro de 2024 tem 22); compare `getMonth()` quando isso importar.
- O "quinto dia útil" do salário, do art. 459, § 1º, da CLT, é a contagem trabalhista: passe `{ includeSaturday: true }`. Os feriados municipais, que essa contagem também exclui, a biblioteca não conhece, então um feriado municipal no começo do mês ainda precisa ser descontado por quem chama.
- O n-ésimo dia útil de janeiro de 1900 e o último dia útil de dezembro de 2099 retornam `null`, porque a receita parte de um dia fora dos anos suportados (31 de dezembro de 1899 e 1º de janeiro de 2100).

### differenceInBusinessDays

Conta os dias úteis entre duas datas. Assinatura: `differenceInBusinessDays(laterDate, earlierDate, options?)`, a mesma do date-fns.

- **Opções** (`BusinessDayOptions`, as mesmas de `isBusinessDay`): `includeOptional` (padrão `true`) também pula a segunda e a terça-feira de Carnaval e o Corpus Christi; `includeSaturday` (padrão `false`) conta o sábado como dia útil; `stateCode` também pula os feriados daquele estado.
- Conta `earlierDate` quando é dia útil e cada dia útil estritamente entre as duas datas; `laterDate` nunca é contado. O horário é ignorado.
- O resultado é negativo quando `laterDate` é anterior a `earlierDate`, e `0` no mesmo dia de calendário.
- Retorna `null` quando uma das datas não é um `Date` válido ou está fora dos anos de 1900 a 2099, ou quando `stateCode` está presente e não é uma sigla de estado.

```javascript
import { differenceInBusinessDays } from '@brazilian-utils/brazilian-utils';

differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 1)); // 0 (01/01 é Ano novo, não contado)
differenceInBusinessDays(new Date(2024, 0, 3), new Date(2024, 0, 2)); // 1 (02/01 contado, uma terça-feira; 03/01 não)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 3)); // -1 (a data posterior vem primeiro, então a contagem é negativa)
differenceInBusinessDays(new Date(2024, 0, 2), new Date(2024, 0, 2)); // 0 (mesmo dia)
differenceInBusinessDays(new Date(2024, 0, 8), new Date(2024, 0, 1)); // 4 (contagem de segunda a sexta, de 2024-01-02 a 2024-01-05)
differenceInBusinessDays(new Date(2024, 0, 8), new Date(2024, 0, 1), { includeSaturday: true }); // 5 (2024-01-06, um sábado, também conta)
differenceInBusinessDays(new Date(2024, 10, 4), new Date(2024, 10, 1), { includeSaturday: true }); // 1 (2024-11-02 é Finados, feriado em um sábado)
differenceInBusinessDays(new Date(2024, 6, 10), new Date(2024, 6, 8), { stateCode: 'SP' }); // 1 (09/07/2024 é feriado estadual em SP)
differenceInBusinessDays(new Date(), new Date('not a date')); // null
```

## Passaporte

### isValidPassport

Valida um número de passaporte brasileiro: 2 letras seguidas de 6 dígitos.

- Não há dígito verificador, então um número bem formado não é necessariamente um passaporte real.
- As 2 letras (a "série") e os 6 dígitos vêm do FAQ da Polícia Federal; nenhuma norma define o número (nem o Decreto nº 5.978/2006 nem a IN nº 173-DG/PF/2020, alterada até a IN nº 283/2024), e o FAQ não lista letra proibida.

```javascript
import { isValidPassport } from '@brazilian-utils/brazilian-utils';

isValidPassport('AB123456'); // true
isValidPassport('ab123456'); // true (não diferencia maiúsculas de minúsculas)
isValidPassport('AB-123.456'); // true (símbolos são ignorados)
isValidPassport('12345678'); // false
```

Fonte: [Polícia Federal](https://www.gov.br/pf/pt-br/assuntos/passaporte) e seu [FAQ](https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-numero-onde-fica-e).

### formatPassport

Formata um número de passaporte brasileiro: maiúsculas, sem símbolos, limitado a 8 caracteres. É a mesma operação de `parsePassport`, da qual é um alias.

```javascript
import { formatPassport } from '@brazilian-utils/brazilian-utils';

formatPassport('ab123456'); // 'AB123456'
formatPassport('AB-123.456'); // 'AB123456'
```

### parsePassport

Remove todos os caracteres não alfanuméricos de um número de passaporte, converte para maiúsculas e limita o resultado a 8 caracteres.

```javascript
import { parsePassport } from '@brazilian-utils/brazilian-utils';

parsePassport('AB-123.456'); // 'AB123456'
parsePassport(' AB 123 456 '); // 'AB123456'
```

### generatePassport

Gera um número de passaporte brasileiro válido aleatório.

```javascript
import { generatePassport } from '@brazilian-utils/brazilian-utils';

generatePassport(); // 'RY393097'
```

## CNH

### isValidCnh

Valida uma CNH. Espaços, pontos e hífens são ignorados; qualquer outro caractere invalida o valor.

- Um valor cujos 11 dígitos são todos iguais é rejeitado, então `'11111111111'` é inválido.
- O primeiro dígito verificador mantém o resto 1 como `1`, como nos números reais de registro. O art. 4º, § 1º, da Resolução CONTRAN nº 886/2021, em que o resto 0 ou 1 dá `0`, fala em "O dígito verificador" sem dizer de qual número: escrito no singular logo depois do Número do Espelho da CNH (o único número do artigo com um só dígito verificador), ele se lê melhor como a regra desse dígito, mas a redação é genérica e não traz pesos, então não serve de fonte para os 2 dígitos verificadores do número de registro; nenhum texto oficial publica os pesos deles. As Resoluções CONTRAN nº 976/2022, nº 998/2023 e nº 1.006/2024 alteram a Resolução nº 886/2021, nenhuma delas no art. 4º. A Resolução CONTRAN nº 1.020/2025, a norma de habilitação mais nova, repete o layout no art. 10 ("nove caracteres e dois dígitos verificadores") sem regra de dígito verificador e não revoga a 886 (art. 140).

```javascript
import { isValidCnh } from '@brazilian-utils/brazilian-utils';

isValidCnh('00000000119'); // true
isValidCnh('000000001-19'); // true (hífen antes dos dígitos verificadores)
isValidCnh('ab00000000119'); // false (letras são rejeitadas)
```

Fonte: [Resolução CONTRAN nº 886/2021, art. 4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao8862021F.pdf), [Resolução CONTRAN nº 1.020/2025, art. 10](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10202025.pdf); pesos conforme o [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-cnh/).

### formatCnh

Formata uma CNH.

- **Opções** (`FormatCnhOptions`): `pad` completa o valor com zeros à esquerda até os 11 dígitos antes de aplicar a máscara (padrão `false`); `obfuscate` esconde os 3 primeiros dígitos e os 2 dígitos verificadores.
- O `obfuscate` é aplicado depois do `pad`.
- Nenhuma autoridade publica uma regra de mascaramento para a CNH, então o `obfuscate` usa a que as Leis de Diretrizes Orçamentárias definem para a divulgação do CPF ("ocultar os três primeiros dígitos e os dois dígitos verificadores", Lei nº 14.194/2021, art. 149, regra criada pela Lei nº 12.309/2010, art. 87, § 5º), um número com a mesma estrutura.

```javascript
import { formatCnh } from '@brazilian-utils/brazilian-utils';

formatCnh('02650306461'); // 026503064-61
formatCnh('2650306461', { pad: true }); // 026503064-61
formatCnh('02650306461', { obfuscate: true }); // ***503064-**
```

### parseCnh

Remove a formatação da CNH, mantém apenas os dígitos e limita o resultado a 11 dígitos.

```javascript
import { parseCnh } from '@brazilian-utils/brazilian-utils';

parseCnh('026503064-61'); // '02650306461'
```

### generateCnh

Gera uma CNH válida aleatória.

```javascript
import { generateCnh } from '@brazilian-utils/brazilian-utils';

generateCnh(); // '02650306461'
```

Fonte: [Lei nº 14.194/2021, art. 149](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm), a regra de mascaramento do CPF que o `obfuscate` toma emprestada, criada pela [Lei nº 12.309/2010, art. 87, § 5º](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12309.htm) e repetida pelas LDOs seguintes (a de 2026, [Lei nº 15.321/2025, art. 163](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15321.htm#art163), a repete).

## Natureza jurídica

### isValidLegalNature

Valida se um código de natureza jurídica existe na lista oficial, a tabela "Natureza Jurídica 2021" do IBGE/CONCLA. Somente hífens, pontos e espaços são tolerados ao redor dos 4 dígitos.

- Os 92 códigos em vigor são aceitos, mais os 8 que uma revisão anterior extinguiu. `getLegalNature` distingue os dois (`legacy: true`).

```javascript
import { isValidLegalNature } from '@brazilian-utils/brazilian-utils';

isValidLegalNature('2062'); // true
isValidLegalNature('2208'); // true (extinto por uma revisão anterior, ainda aceito)
isValidLegalNature('9999'); // false
```

Fonte: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021) e seu [PDF de estrutura detalhada](https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf).

### formatLegalNature

Formata um código de natureza jurídica. Use `isValidLegalNature` para verificar um código.

- **Opções** (`FormatLegalNatureOptions`): `pad` primeiro completa o valor com zeros à esquerda até os 4 dígitos de um código completo (padrão `false`).

```javascript
import { formatLegalNature } from '@brazilian-utils/brazilian-utils';

formatLegalNature('2062'); // 206-2
formatLegalNature(2062); // 206-2
formatLegalNature('206'); // 206 (máscara aplicada até onde o valor vai)
formatLegalNature('62', { pad: true }); // 006-2 (completado até 4 dígitos antes)
```

### parseLegalNature

Remove a formatação da natureza jurídica, mantém apenas os dígitos e limita o resultado a 4 dígitos.

```javascript
import { parseLegalNature } from '@brazilian-utils/brazilian-utils';

parseLegalNature('206-2'); // '2062'
```

### generateLegalNature

Gera um código de natureza jurídica válido aleatório. Apenas os 92 códigos em vigor são sorteados, nunca um extinto.

```javascript
import { generateLegalNature } from '@brazilian-utils/brazilian-utils';

generateLegalNature(); // '2062'
```

### getLegalNature

Busca um código de natureza jurídica na tabela oficial do IBGE/CONCLA. Retorna `null` para um código desconhecido.

- A entrada (`LegalNature`) também traz a categoria do CONCLA do código, dada pelo seu primeiro dígito.
- Um código que uma revisão anterior extinguiu retorna com `legacy: true` e o `currentCode` a que corresponde hoje, ou `currentCode: null` quando não há sucessor. Os códigos em vigor têm `legacy: false` e nenhum `currentCode`.

| Código extinto | Descrição | Corresponde a |
| --- | --- | --- |
| `2076` | Sociedade Empresária em Nome Coletivo | `2070`, o código para o qual a revisão 2003.1 o renumerou, mesma denominação |
| `2100` | Sociedade Mercantil de Capital e Indústria | nenhum, marcado como "categoria extinta" na correspondência 2003.1 x 2009 |
| `2208` | Entidade Binacional Itaipu | `2275` Empresa Binacional |
| `3042` | Organização Social | `3069` Fundação Privada; a revisão de 2014 criou depois o `3301` Organização Social (OS), onde uma entidade assim qualificada é classificada hoje |
| `3050` | Organização da Sociedade Civil de Interesse Público (Oscip) | nenhum, uma Oscip é classificada pela forma que assume (`3999` ou `3069`) |
| `3093` | Unidade Executora (Programa Dinheiro Direto na Escola) | `3999` Associação Privada |
| `3123` | Partido Político | nenhum, a revisão de 2014 o desdobrou em `3255`, `3263` e `3271` |
| `5002` | Organização Internacional e Outras Instituições Extraterritoriais | `5010` Organização Internacional, o código em que foi aberto junto com `5029` e `5037` |

```javascript
import { getLegalNature } from '@brazilian-utils/brazilian-utils';

getLegalNature('2062');
// {
//   code: '2062',
//   description: 'Sociedade Empresária Limitada',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: false,
// }
getLegalNature('2208');
// {
//   code: '2208',
//   description: 'Entidade Binacional Itaipu',
//   category: { code: '2', description: 'Entidades Empresariais' },
//   legacy: true,
//   currentCode: '2275',
// }
getLegalNature('3123')?.currentCode; // null (extinto sem sucessor)
getLegalNature('206-2')?.code; // '2062'
getLegalNature('206.2')?.category.description; // 'Entidades Empresariais'
getLegalNature(206.2); // null (um número só é lido quando é um inteiro seguro não negativo: escreva a forma com ponto como string)
getLegalNature('0000'); // null
```

Fonte: [CONCLA, Natureza Jurídica 2021](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021).

### getLegalNatures

Retorna o mapa de naturezas jurídicas indexado pelo código. Por padrão apenas os 92 códigos em vigor são listados.

- **Opções** (`GetLegalNaturesParams`): `includeLegacy` (padrão `false`) soma os 8 códigos extintos.

```javascript
import { getLegalNatures } from '@brazilian-utils/brazilian-utils';

const legalNatures = getLegalNatures();

legalNatures['2062']; // 'Sociedade Empresária Limitada'
Object.keys(legalNatures).length; // 92
legalNatures['2208']; // undefined (extinto por uma revisão anterior)
getLegalNatures({ includeLegacy: true })['2208']; // 'Entidade Binacional Itaipu'
```

### getLegalNaturesByCategory

Retorna todas as naturezas jurídicas de uma categoria do CONCLA, o grupo dado pelo primeiro dígito do código. A categoria é aceita como string ou como número.

- Categorias: `1` Administração Pública, `2` Entidades Empresariais, `3` Entidades sem Fins Lucrativos, `4` Pessoas Físicas e `5` Organizações Internacionais e Outras Instituições Extraterritoriais.
- **Opções** (`GetLegalNaturesByCategoryOptions`): `includeLegacy` (padrão `false`) soma os códigos extintos da categoria.
- As entradas retornam ordenadas por código. Uma categoria desconhecida retorna `[]`.

```javascript
import { getLegalNaturesByCategory } from '@brazilian-utils/brazilian-utils';

getLegalNaturesByCategory('4')[0];
// {
//   code: '4014',
//   description: 'Empresa Individual Imobiliária',
//   category: { code: '4', description: 'Pessoas Físicas' },
//   legacy: false,
// }
getLegalNaturesByCategory(4).length; // 6
getLegalNaturesByCategory('2').length; // 30
getLegalNaturesByCategory('2', { includeLegacy: true }).length; // 33
getLegalNaturesByCategory('9'); // []
```

## Título de eleitor

### isValidVoterId

Valida um título de eleitor. Um título tem no máximo 12 dígitos, então um valor de 13 dígitos é rejeitado.

- Um título é um número sequencial de 8 dígitos, um código de unidade federativa de 2 dígitos (`01` a `28`) e 2 dígitos verificadores.
- O TSE despreza os zeros à esquerda do número sequencial na emissão, então um valor mais curto é lido como o título sem eles e completado com zeros à esquerda até 12 dígitos antes da validação (`123450159` é validado como `000123450159`). É preciso ao menos um dígito sequencial: o menor valor aceito tem 5 dígitos.
- Espaços e pontos são aceitos ao redor e entre os grupos. Qualquer outro caractere, inclusive um hífen, invalida o valor.
- A Resolução TSE nº 23.659/2021, art. 36, que revogou a Resolução TSE nº 21.538/2003 (art. 140), fixa o layout, a tabela das unidades federativas e dois dígitos verificadores "determinados com base no 'Módulo 11'". Ela não traz pesos nem regra por estado: os pesos e a regra que troca o resto 0 por 1 para São Paulo (`01`) e Minas Gerais (`02`) não têm fonte oficial e seguem as referências da comunidade abaixo.

```javascript
import { generateVoterId, isValidVoterId } from '@brazilian-utils/brazilian-utils';

const voterId = generateVoterId('SP');

isValidVoterId(voterId); // true
isValidVoterId('102385010671'); // true (12 dígitos)
isValidVoterId('123450159'); // true (000123450159 emitido sem os zeros à esquerda)
isValidVoterId('1234567880191'); // false (13 dígitos, mais que os 12 que o TSE permite)
isValidVoterId('123456780124'); // false (dígitos verificadores inválidos)
```

Fonte: [Resolução TSE nº 23.659/2021, art. 36](https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021) ("composto por até 12 algarismos", "os oito primeiros algarismos serão sequenciados, desprezando-se, na emissão, os zeros à esquerda"), [brutils](https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py) e [siga0984](https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/).

### formatVoterId

Formata um título de eleitor com o agrupamento de 12 dígitos `0000 0000 00 00`.

- **Opções** (`FormatVoterIdOptions`): `pad` completa o valor com zeros à esquerda até 12 dígitos, restaurando os zeros de um título emitido sem eles; `obfuscate` esconde os 3 primeiros dígitos e os 2 dígitos verificadores, deixando visível o código da unidade federativa. A máscara esconde por posição, então use `pad` junto com `obfuscate` para um título passado como número, que perdeu os zeros à esquerda: sem ele a máscara cai sobre os dígitos verificadores.
- Sem `pad`, um valor mais curto é formatado a partir da esquerda, como um título digitado pela metade.
- Os dígitos além do 12º são descartados.
- Nenhuma autoridade publica uma regra de mascaramento para o título de eleitor, então o `obfuscate` usa a que as Leis de Diretrizes Orçamentárias definem para a divulgação do CPF ("ocultar os três primeiros dígitos e os dois dígitos verificadores", Lei nº 14.194/2021, art. 149, regra criada pela Lei nº 12.309/2010, art. 87, § 5º), um número com a mesma estrutura.

```javascript
import { formatVoterId } from '@brazilian-utils/brazilian-utils';

formatVoterId('123456780175'); // '1234 5678 01 75'
formatVoterId('123456780175', { obfuscate: true }); // '***4 5678 01 **'
formatVoterId('123450159', { pad: true }); // '0001 2345 01 59'
formatVoterId('123450159'); // '1234 5015 9' (lido como um título digitado pela metade)
```

### parseVoterId

Remove a formatação do título de eleitor, mantém apenas os dígitos e limita o resultado a 12 dígitos. Um valor mais curto é mantido como está, sem acrescentar zeros à esquerda.

```javascript
import { parseVoterId } from '@brazilian-utils/brazilian-utils';

parseVoterId('1234 5678 01 75'); // '123456780175'
parseVoterId('12345 01 59'); // '123450159'
```

### generateVoterId

Gera um título de eleitor válido aleatório. O argumento opcional `state` (`StateCode`, ou `"ZZ"` para um título expedido no exterior) define o código de unidade federativa.

- `state` ignora maiúsculas/minúsculas e espaços nas pontas (`'sp'` é `'SP'`). Uma UF desconhecida, ou um valor que não seja string, usa `"ZZ"` (UF `28`).
- O resultado sempre tem 12 dígitos, com os zeros à esquerda do número sequencial; o mesmo título sem eles também é válido.

```javascript
import { generateVoterId } from '@brazilian-utils/brazilian-utils';

generateVoterId(); // título de eleitor aleatório válido (exterior, "ZZ")
generateVoterId('SP'); // título de eleitor aleatório válido de São Paulo
generateVoterId('XX'); // usa "ZZ" em vez de lançar erro
```

Fonte: [Lei nº 14.194/2021, art. 149](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14194.htm), a regra de mascaramento do CPF que o `obfuscate` toma emprestada, criada pela [Lei nº 12.309/2010, art. 87, § 5º](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12309.htm) e repetida pelas LDOs seguintes (a de 2026, [Lei nº 15.321/2025, art. 163](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15321.htm#art163), a repete).

## CNS

### isValidCns

Valida um número de CNS (Cartão Nacional de Saúde), o identificador do SUS (Sistema Único de Saúde) de um usuário, profissional ou estabelecimento de saúde. O valor precisa ser os 15 dígitos, opcionalmente separados nos grupos impressos de 3-4-4-4 por espaço, `.`, `-` ou `/`.

- Cartões definitivos começam com 1 ou 2, provisórios com 7, 8 ou 9; cada um tem sua própria regra de módulo 11.
- Um número iniciado em 5 é rejeitado. As rotinas de validação do DATASUS ([cópia no Wayback Machine](https://web.archive.org/web/20190106003442/http://cartaonet.datasus.gov.br/Rotina_JavaScript.doc) do arquivo que o site cartaonet.datasus.gov.br publicava) cobrem só os números iniciados em 1 ou 2 (definitivo) e em 7, 8 ou 9 (provisório), como a ANVISA; nenhum documento oficial cita o prefixo 5, que a página do e-SUS APS aceita.

```javascript
import { isValidCns } from '@brazilian-utils/brazilian-utils';

isValidCns('123456789010000'); // true (definitivo)
isValidCns('100000000060018'); // true (definitivo, dígito bruto 10, sufixo 001)
isValidCns('700000000000005'); // true (provisório)
isValidCns('123.4567-8901/0000'); // true (qualquer um dos caracteres de máscara)
isValidCns(-123456789010000); // false (não é um inteiro seguro não negativo)
isValidCns('123456789010001'); // false (dígito verificador inválido)
isValidCns('12345678901'); // false (tamanho inválido)
isValidCns('abc123456789010000'); // false (não escrito como um CNS)
```

Fonte: [rotinas de validação do DATASUS](https://web.archive.org/web/20190106003442/http://cartaonet.datasus.gov.br/Rotina_JavaScript.doc) (cópia no Wayback Machine), [página de validação de CNS da ANVISA](https://rni-docs.anvisa.gov.br/docs/regras_gerais/validacoes/validacaoCNS/) e a [página do e-SUS APS](https://integracao.esusab.ufsc.br/ledi/documentacao/regras/algoritmo_CNS.html).

### formatCns

Formata um número de CNS (Cartão Nacional de Saúde) nos grupos de exibição usuais de 3-4-4-4 dígitos separados por espaço.

- **Opções** (`FormatCnsOptions`): `pad` completa o valor com zeros à esquerda até as 15 posições do padrão antes de aplicar a máscara (padrão `false`).

```javascript
import { formatCns } from '@brazilian-utils/brazilian-utils';

formatCns('123456789010000'); // '123 4567 8901 0000'
formatCns(123456789010000); // '123 4567 8901 0000'
formatCns('89010001', { pad: true }); // '000 0000 8901 0001'
```

### parseCns

Remove a formatação do CNS (Cartão Nacional de Saúde), mantém apenas os dígitos e limita o resultado a 15 dígitos.

```javascript
import { parseCns } from '@brazilian-utils/brazilian-utils';

parseCns('123 4567 8901 0000'); // '123456789010000'
```

## Certidão

### isValidCertidao

Valida a matrícula de uma certidão de registro civil (nascimento, casamento, óbito e os demais atos de um registro civil das pessoas naturais). Só uma string é aceita: os 32 dígitos de uma matrícula são mais do que um número JavaScript comporta.

A matrícula tem 32 dígitos, impressos como `000000 00 00 0000 0 00000 000 0000000 00`:

| Dígitos | Campo |
| --- | --- |
| 6 | CNS da serventia |
| 2 | acervo |
| 2 | serviço, sempre `55` |
| 4 | ano |
| 1 | tipo do livro |
| 5 | livro |
| 3 | folha |
| 7 | termo |
| 2 | dígitos verificadores |

- **Opções** (`IsValidCertidaoOptions`): `accept` restringe os tipos de livro válidos (`CertidaoType`) aos listados (padrão: todos os tipos).
- O serviço precisa ser `55`, e o dígito do tipo de livro um dos códigos de 1 a 9: 1 a 7 são os livros do art. 473, V (Provimento CNJ nº 149/2023, redação do Provimento CN nº 182/2024); 8 (`"emancipation"`, Livro E desdobrado para emancipações) e 9 (`"interdiction"`, Livro E desdobrado para interdições) vêm do Provimento CNJ nº 3/2009, art. 7º, revogado pelo Provimento CNJ nº 63/2017, e são mantidos para que as certidões emitidas sob ele a partir de 2010 continuem válidas. `0` é rejeitado.
- Aceita o valor com ou sem máscara, com espaços entre e ao redor dos grupos.
- Nenhum documento oficial publica o algoritmo dos dígitos verificadores: o art. 473, IX só nomeia os dois dígitos, o revogado Provimento CNJ nº 3/2009 mandava calculá-los com um programa que o CNJ entregava aos registradores e o leiaute do Cadastro NIS da Caixa diz só "módulo 11". Os pesos e a regra do resto seguem as referências da comunidade abaixo.

```javascript
import { isValidCertidao } from '@brazilian-utils/brazilian-utils';

isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21'); // true
isValidCertidao('09430001552010100020112000012087'); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 22'); // false (dígitos verificadores inválidos)
isValidCertidao('09400301542011100110002005191744'); // false (serviço diferente de 55)
isValidCertidao('10453901552013900012021000012398'); // true (código de livro 9, Provimento CNJ nº 3/2009)
isValidCertidao('10453901552013000012021000012387'); // false (o código de livro 0 não nomeia livro)
isValidCertidao('123456'); // false (tamanho inválido)
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['birth'] }); // true
isValidCertidao('104539 01 55 2013 1 00012 021 0000123 21', { accept: ['death'] }); // false
```

Fonte: [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); dígitos verificadores conforme o [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

### formatCertidao

Formata a matrícula de uma certidão de registro civil na máscara impressa do art. 473. Os 32 dígitos são agrupados em 6 2 2 4 1 5 3 7 2 e separados por espaços.

- **Opções** (`FormatCertidaoOptions`): `pad` completa o valor com zeros à esquerda até 32 dígitos (padrão `false`).
- Um número é aceito quando é um inteiro seguro não negativo, então uma matrícula completa de 32 dígitos precisa ser uma string. Qualquer outro número retorna `''`.

```javascript
import { formatCertidao } from '@brazilian-utils/brazilian-utils';

formatCertidao('10453901552013100012021000012321'); // '104539 01 55 2013 1 00012 021 0000123 21'
formatCertidao('104539.01.55.2013.1.00012.021.0000123-21'); // '104539 01 55 2013 1 00012 021 0000123 21'
formatCertidao('1552010100020112000012087', { pad: true }); // '000000 01 55 2010 1 00020 112 0000120 87'
formatCertidao(104539015520); // '104539 01 55 20' (um número é lido como a string dos seus dígitos)
formatCertidao(1045390155.2); // '' (não é um inteiro seguro não negativo)
```

Fonte: [art. 473 do Código Nacional de Normas](https://atos.cnj.jus.br/atos/detalhar/5243).

### parseCertidao

Remove a formatação da matrícula de uma certidão de registro civil, mantém apenas os dígitos e limita o resultado a 32 dígitos.

```javascript
import { parseCertidao } from '@brazilian-utils/brazilian-utils';

parseCertidao('104539 01 55 2013 1 00012 021 0000123 21');
// '10453901552013100012021000012321'
```

### getCertidaoInfo

Extrai os campos da matrícula de uma certidão de registro civil. Aceita as mesmas formas de entrada de `isValidCertidao` e retorna `null` quando a matrícula é inválida.

- Retorna `null` também para um serviço diferente de `55` e para o código de livro `0`.
- O art. 473, V lista os códigos de livro de 1 a 7, de "1: Livro A (Nascimento)" a "7: Livro E (Demais atos relativos ao registro civil)". Os códigos 8 (emancipação) e 9 (interdição) do Provimento CNJ nº 3/2009, art. 7º, revogado pelo Provimento CNJ nº 63/2017, não estão nele, mas continuam sendo lidos, como `"emancipation"` e `"interdiction"`, já que as certidões emitidas sob ele a partir de 2010 os trazem e continuam sendo documentos válidos.

O resultado `CertidaoInfo` traz:

| Chave | Descrição |
| --- | --- |
| `registryCns` | O CNS (Código Nacional de Serventia) de 6 dígitos da serventia que lavrou o ato. |
| `acervo` | Acervo a que o livro pertence: `"01"` acervo próprio, `"02"` em diante um por acervo incorporado. O art. 473, §§ 3º a 5º separa os incorporados pela data em que a serventia de origem foi extinta ou desativada. Até 31/12/2009: o CNS da unidade incorporadora e um código de acervo a partir de `"02"`, um por incorporação. A partir de 01/01/2010: o CNS da própria unidade incorporada e o código `"01"`, considerado acervo próprio dessa unidade. Um acervo fracionado entre duas ou mais serventias sucessoras leva o CNS próprio de cada sucessora com o código `"02"`. |
| `service` | Serviço prestado pela serventia, sempre `"55"`, o registro civil das pessoas naturais. |
| `year` | Ano do registro, com 4 dígitos. |
| `type` | Livro a que o ato pertence: `"birth"`, `"marriage"`, `"religious-marriage"`, `"death"`, `"stillbirth"`, `"banns"`, `"other"`, ou, para os códigos 8 e 9 do Provimento CNJ nº 3/2009, `"emancipation"` e `"interdiction"`. |
| `typeCode` | Código bruto do livro, de 1 a 9, como impresso na décima quinta posição da matrícula. |
| `book` | Número do livro, com 5 dígitos e zeros à esquerda. |
| `page` | Número da folha, com 3 dígitos e zeros à esquerda. |
| `term` | Número do termo, com 7 dígitos e zeros à esquerda. |
| `checkDigits` | Os 2 dígitos verificadores módulo 11 da matrícula. |

```javascript
import { getCertidaoInfo } from '@brazilian-utils/brazilian-utils';

getCertidaoInfo('104539 01 55 2013 1 00012 021 0000123 21');
// {
//   registryCns: '104539',
//   acervo: '01',
//   service: '55',
//   year: 2013,
//   type: 'birth',
//   typeCode: 1,
//   book: '00012',
//   page: '021',
//   term: '0000123',
//   checkDigits: '21'
// }

getCertidaoInfo('invalid'); // null
```

Fonte: [art. 473 do Código Nacional de Normas da Corregedoria Nacional de Justiça](https://atos.cnj.jus.br/atos/detalhar/5243); códigos de livro 8 e 9 conforme o revogado [Provimento CNJ nº 3/2009, art. 7º](https://atos.cnj.jus.br/atos/detalhar/1310), ainda listados pelo [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [validation-br](https://github.com/klawdyo/validation-br/blob/feat-certidao/src/certidao.ts).

## CEI, CNO e CAEPF

### isValidCei

Valida um número de CEI (Cadastro Específico do INSS). O CEI identifica o empregador sem CNPJ, como uma obra ou um produtor rural.

- Layout: 12 dígitos impressos como `00.000.00000/00`, 11 dígitos de base e um dígito verificador.
- Só os 12 dígitos são oficiais: nenhuma norma, leiaute ou manual da Receita Federal publica o dígito verificador, que segue as referências da comunidade abaixo e confere com a base aberta do CNO e com o exemplo `000000336854` do SERPRO.

```javascript
import { isValidCei } from '@brazilian-utils/brazilian-utils';

isValidCei('11.583.00249/85'); // true
isValidCei('277297118187'); // true
isValidCei(249859674386); // true
isValidCei(-249859674386); // false (não é um inteiro seguro não negativo)
isValidCei('24.985.96743/68'); // false (dígito verificador inválido)
isValidCei('000000000000'); // false (dígitos repetidos)
```

Fonte: [SERPRO, cadastro CNO](https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/) (12 posições), [MOS do eSocial S-1.3, item 9.1](https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-07-2026.pdf) (o CNO mantém o número do CEI); dígito verificador conforme o [yii2-br-validator](https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php), [Bigai.Documentos.Brasil](https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs) e a [base de dados aberta do CNO](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCei

Formata um número de CEI (Cadastro Específico do INSS) na máscara usual `00.000.00000/00`.

- **Opções** (`FormatCeiOptions`): `pad` completa o valor com zeros à esquerda até 12 dígitos (padrão `false`).

```javascript
import { formatCei } from '@brazilian-utils/brazilian-utils';

formatCei('277297118187'); // 27.729.71181/87
formatCei(249859674386); // 24.985.96743/86
formatCei('249', { pad: true }); // 00.000.00002/49
```

### parseCei

Remove a formatação do CEI (Cadastro Específico do INSS), mantém apenas os dígitos e limita o resultado a 12 dígitos.

```javascript
import { parseCei } from '@brazilian-utils/brazilian-utils';

parseCei('27.729.71181/87'); // '277297118187'
```

### isValidCno

Valida um número de CNO (Cadastro Nacional de Obras). O CNO substituiu o CEI para obras e manteve a mesma numeração.

- Mesmas regras de `isValidCei`.

```javascript
import { isValidCno } from '@brazilian-utils/brazilian-utils';

isValidCno('11.084.01680/62'); // true
isValidCno('111130137368'); // true
isValidCno(401800097960); // true
isValidCno(-401800097960); // false (não é um inteiro seguro não negativo)
isValidCno('110840168063'); // false (dígito verificador inválido)
isValidCno('000000000000'); // false (dígitos repetidos)
```

Fonte: [página do CNO da Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno), [SERPRO, cadastro CNO](https://bcadastros.serpro.gov.br/documentacao/cadastro_cno/), [MOS do eSocial S-1.3, item 9.1](https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-07-2026.pdf) e a [base de dados aberta do CNO](https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno).

### formatCno

Formata um número de CNO (Cadastro Nacional de Obras).

- Mesmas regras de `formatCei`: a máscara `00.000.00000/00`, com `pad` em `FormatCnoOptions`.

```javascript
import { formatCno } from '@brazilian-utils/brazilian-utils';

formatCno('111130137368'); // 11.113.01373/68
formatCno(401800097960); // 40.180.00979/60
formatCno('979', { pad: true }); // 00.000.00009/79
```

### parseCno

Remove a formatação do CNO (Cadastro Nacional de Obras), mantém apenas os dígitos e limita o resultado a 12 dígitos, a numeração que o CNO herdou do CEI.

```javascript
import { parseCno } from '@brazilian-utils/brazilian-utils';

parseCno('11.113.01373/68'); // '111130137368'
```

### isValidCaepf

Valida um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física). O CAEPF substituiu o CEI para a pessoa física que contrata empregados, como o produtor rural.

- Layout: 14 dígitos impressos como `000.000.000/000-00`: a base de 9 dígitos do CPF do titular, um número de ordem de 3 dígitos e 2 dígitos verificadores.
- Os dois dígitos verificadores seguem o módulo 11 do CNPJ; o par é então somado a 12, com retorno a zero acima de 99.
- Só as 14 posições e a base do CPF são oficiais (SERPRO: "9 primeiros números do CPF + número de inscrição resumido" de 5 posições). A divisão dessas 5 em número de ordem e 2 dígitos verificadores, a regra do dígito e a soma de 12 vêm das referências da comunidade abaixo; elas conferem com o exemplo `00000002500171` do SERPRO.

```javascript
import { isValidCaepf } from '@brazilian-utils/brazilian-utils';

isValidCaepf('293.118.610/001-84'); // true
isValidCaepf('41142260000101'); // true
isValidCaepf(29311861000184); // true
isValidCaepf(-29311861000184); // false (não é um inteiro seguro não negativo)
isValidCaepf('29311861000185'); // false (dígitos verificadores inválidos)
isValidCaepf('00000000000000'); // false (dígitos da base repetidos)
isValidCaepf('00000000000012'); // false (dígitos da base repetidos)
```

Fonte: [SERPRO, cadastro CAEPF](https://bcadastros.serpro.gov.br/documentacao/cadastro_caepf/) (14 posições); dígitos verificadores conforme o [ghiorzi.org](http://ghiorzi.org/DVnew.htm) e o [brazilian-values](https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts).

### formatCaepf

Formata um número de CAEPF (Cadastro de Atividade Econômica da Pessoa Física) na máscara usual `000.000.000/000-00`.

- Mesmas regras de `formatCei`, com `pad` (`FormatCaepfOptions`) completando até 14 dígitos (padrão `false`).

```javascript
import { formatCaepf } from '@brazilian-utils/brazilian-utils';

formatCaepf('29311861000184'); // 293.118.610/001-84
formatCaepf(41142260000101); // 411.422.600/001-01
formatCaepf('184', { pad: true }); // 000.000.000/001-84
```

### parseCaepf

Remove a formatação do CAEPF (Cadastro de Atividade Econômica da Pessoa Física), mantém apenas os dígitos e limita o resultado a 14 dígitos.

```javascript
import { parseCaepf } from '@brazilian-utils/brazilian-utils';

parseCaepf('293.118.610/001-84'); // '29311861000184'
```

## Códigos de classificação (CBO, CNAE, NCM, CFOP, CST, CSOSN)

### isValidCbo

Valida um código CBO (Classificação Brasileira de Ocupações) contra a tabela oficial da CBO 2002.

- Aceita uma string com os 6 dígitos ou com a máscara `NNNN-NN`, ou um número.
- Uma string mascarada precisa de um único separador (espaço, `.`, `-` ou `/`) entre os grupos. Qualquer outra string é rejeitada, em vez de ter seus dígitos extraídos.
- Dígitos sem máscara são completados com zeros à esquerda até 6, como string ou como número. Um valor mascarado é lido como foi escrito.

```javascript
import { isValidCbo } from '@brazilian-utils/brazilian-utils';

isValidCbo('2124-05'); // true
isValidCbo('212405'); // true
isValidCbo(212405); // true
isValidCbo(10205); // true (completado para 6 dígitos, ou seja, '010205')
isValidCbo('10205'); // true (completado do mesmo jeito que um número)
isValidCbo('000000'); // false
isValidCbo('2124abc05'); // false (não é uma forma documentada)
isValidCbo(-212405); // false (não é um inteiro seguro não negativo)
```

Fonte: [tabelas da CBO 2002 publicadas pelo MTE ("Estrutura CBO (CSV)", arquivos de 10/07/2026, 2.725 ocupações)](https://cbo.mte.gov.br/cbosite/pages/downloads.jsf). Até a 2.4.0 a tabela vinha da versão mais antiga do gov.br (06/06/2025): faltavam 37 ocupações, e 6 que o MTE retirou depois (225142, 322105, 322115, 322120, 322125 e 782820) deixam de ser válidas.

### parseCbo

Remove a formatação do CBO (Classificação Brasileira de Ocupações), mantém apenas os dígitos e limita o resultado a 6 dígitos.

- Nada é completado com zeros à esquerda: o zero inicial de um código como `010205` precisa ser escrito. Use `getCbo` ou `isValidCbo` para consultar uma ocupação.

```javascript
import { parseCbo } from '@brazilian-utils/brazilian-utils';

parseCbo('2124-05'); // '212405'
```

### getCbo

Consulta um código CBO (Classificação Brasileira de Ocupações) e retorna o título oficial da ocupação. O resultado é um registro `Cbo`: `{ code, description }`.

- Mesmas regras de `isValidCbo`. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.

```javascript
import { getCbo } from '@brazilian-utils/brazilian-utils';

getCbo('2124-05'); // { code: '212405', description: 'Analista de desenvolvimento de sistemas' }
getCbo(10205); // { code: '010205', description: 'Oficial da aeronáutica' } (completado para 6 dígitos)
getCbo('10205'); // { code: '010205', description: 'Oficial da aeronáutica' } (completado do mesmo jeito)
getCbo('000000'); // null
getCbo('2124abc05'); // null (não é uma forma documentada)
```

Fonte: [tabelas da CBO 2002 publicadas pelo MTE ("Estrutura CBO (CSV)", arquivos de 10/07/2026, 2.725 ocupações)](https://cbo.mte.gov.br/cbosite/pages/downloads.jsf). Até a 2.4.0 a tabela vinha da versão mais antiga do gov.br (06/06/2025): faltavam 37 ocupações, e 6 que o MTE retirou depois (225142, 322105, 322115, 322120, 322125 e 782820) deixam de ser válidas.

### isValidCnae

Valida um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) contra a tabela CNAE-Subclasses 2.3, a revisão de subclasses atual da CNAE 2.0.

- Mesmas regras de `isValidCbo`, com 7 dígitos e a máscara `NNNN-N/NN`.

```javascript
import { isValidCnae } from '@brazilian-utils/brazilian-utils';

isValidCnae('6201-5/01'); // true
isValidCnae('6201501'); // true
isValidCnae(111301); // true (completado para 7 dígitos, ou seja, '0111301')
isValidCnae('111301'); // true (completado do mesmo jeito que um número)
isValidCnae('0000000'); // false
isValidCnae('0111abc301'); // false (não é uma forma documentada)
isValidCnae(-111301); // false (não é um inteiro seguro não negativo)
```

Fonte: [CNAE-Subclasses 2.3 na CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) e a [API de subclasses do IBGE](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### formatCnae

Formata um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas). Só a estrutura muda; use `isValidCnae` para conferir um código com a tabela.

- **Opções** (`FormatCnaeOptions`): `pad` (padrão `false`) completa antes o valor com zeros à esquerda até os 7 dígitos de um código completo. Sem ele a máscara é aplicada até onde o valor vai.
- Caracteres fora da máscara são descartados, e um número só é lido como a string dos seus dígitos quando é um inteiro seguro não negativo: um número negativo, fracionário ou inseguro retorna `''`, já que o sinal e o ponto decimal não são caracteres da máscara. Retorna `''` quando não há dígito algum.

```javascript
import { formatCnae } from '@brazilian-utils/brazilian-utils';

formatCnae('6201501'); // 6201-5/01
formatCnae('62'); // 62 (máscara aplicada até onde o valor vai)
formatCnae('62015'); // 6201-5
formatCnae('62', { pad: true }); // 0000-0/62 (completado até 7 dígitos antes)
formatCnae(111301, { pad: true }); // 0111-3/01
formatCnae('abc6201501'); // 6201-5/01 (só os dígitos são lidos)
formatCnae(-6201501); // '' (não é um inteiro seguro não negativo)
```

### parseCnae

Remove a formatação do CNAE (Classificação Nacional de Atividades Econômicas), mantém apenas os dígitos e limita o resultado aos 7 dígitos de um código de subclasse completo.

- Mesmas regras de `parseCbo`: nada é completado com zeros à esquerda aqui.

```javascript
import { parseCnae } from '@brazilian-utils/brazilian-utils';

parseCnae('6201-5/01'); // '6201501'
parseCnae('62'); // '62' (um código parcial é mantido como está)
```

### getCnae

Consulta um código de subclasse CNAE (Classificação Nacional de Atividades Econômicas) e retorna seu código e a descrição oficial. O resultado é um registro `Cnae`: `{ code, description }`.

- Mesmas regras de `getCbo`, com 7 dígitos e a máscara `NNNN-N/NN`.
- `code` retorna com os 7 dígitos sem máscara; passe-o para `formatCnae` para obter a forma `NNNN-N/NN`.

```javascript
import { formatCnae, getCnae } from '@brazilian-utils/brazilian-utils';

getCnae('6201-5/01'); // { code: '6201501', description: 'DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA' }
getCnae(111301); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado para 7 dígitos)
getCnae('111301'); // { code: '0111301', description: 'CULTIVO DE ARROZ' } (completado do mesmo jeito)
getCnae('0000000'); // null
getCnae('0111abc301'); // null (não é uma forma documentada)
formatCnae(getCnae('6201501')?.code); // 6201-5/01 (aplicar a máscara é trabalho do formatador)
```

Fonte: [CNAE-Subclasses 2.3 na CONCLA/IBGE](https://concla.ibge.gov.br/busca-online-cnae.html) e a [API de subclasses do IBGE](https://servicodados.ibge.gov.br/api/v2/cnae/subclasses).

### isValidNcm

Valida um código NCM (Nomenclatura Comum do Mercosul) contra a tabela vigente publicada pelo Siscomex/MDIC.

- Mesmas regras de `isValidCbo`, com 8 dígitos e a máscara `NNNN.NN.NN`.

```javascript
import { isValidNcm } from '@brazilian-utils/brazilian-utils';

isValidNcm('8471.30.12'); // true
isValidNcm('84713012'); // true
isValidNcm(1012100); // true (completado para 8 dígitos, ou seja, '01012100')
isValidNcm('1012100'); // true (completado do mesmo jeito que um número)
isValidNcm('00000000'); // false
isValidNcm('abc01012100'); // false (não é uma forma documentada)
isValidNcm(-84713012); // false (não é um inteiro seguro não negativo)
```

Fonte: [nomenclatura NCM publicada pelo Portal Único Siscomex](https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json); os 10.515 códigos embutidos são os do arquivo "Vigente em 26/09/2026" (Resolução Gecex nº 926/2026).

### formatNcm

Formata um código NCM (Nomenclatura Comum do Mercosul). Só a estrutura muda; use `isValidNcm` para conferir um código com a tabela.

- **Opções** (`FormatNcmOptions`): `pad` (padrão `false`) completa antes o valor com zeros à esquerda até os 8 dígitos de um código completo.
- Mesmas regras de `formatCnae`, com a máscara `NNNN.NN.NN`.

```javascript
import { formatNcm } from '@brazilian-utils/brazilian-utils';

formatNcm('84713012'); // 8471.30.12
formatNcm('8471'); // 8471 (máscara aplicada até onde o valor vai)
formatNcm('847130'); // 8471.30
formatNcm('8471', { pad: true }); // 0000.84.71 (completado até 8 dígitos antes)
formatNcm('abc8471'); // 8471 (só os dígitos são lidos)
formatNcm(-84713012); // '' (não é um inteiro seguro não negativo)
```

### parseNcm

Remove a formatação do NCM (Nomenclatura Comum do Mercosul), mantém apenas os dígitos e limita o resultado aos 8 dígitos de um código completo.

- Mesmas regras de `parseCbo`: nada é completado com zeros à esquerda aqui.

```javascript
import { parseNcm } from '@brazilian-utils/brazilian-utils';

parseNcm('8471.30.12'); // '84713012'
parseNcm('8471'); // '8471' (um código parcial é mantido como está)
```

### isValidNbs

Valida um código NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que Produzam Variações no Patrimônio) contra a tabela oficial da NBS 2.0, o código que a NFS-e nacional leva em `cNBS`.

- O código tem 9 dígitos, impressos como `N.NNNN.NN.NN`: o algarismo 1, o capítulo, a posição, os dois níveis de subposição, o item e o subitem.
- Aceita uma string com os 9 dígitos ou com a máscara, com um único separador entre os grupos e espaços opcionais nas extremidades, ou um inteiro seguro não negativo. Qualquer outra string é rejeitada em vez de ter os dígitos pinçados.
- Só códigos completos são válidos: os títulos de capítulo (`1.01`), posição (`1.0101`) e subposição (`1.0101.1`) não classificam nada por si sós.
- O ANEXO B do Sistema Nacional NFS-e lista os mesmos 920 códigos menos três (`1.0402.29.00`, `1.0403.29.00` e `1.0904.40.00`), então um código válido aqui ainda pode ser recusado pela NFS-e.

```javascript
import { isValidNbs } from '@brazilian-utils/brazilian-utils';

isValidNbs('1.0101.11.00'); // true
isValidNbs('101011100'); // true
isValidNbs(101011100); // true
isValidNbs('1.0101'); // false (título de posição, não um código completo)
isValidNbs('1.9999.99.99'); // false
isValidNbs('1.0101abc11.00'); // false (não é uma forma documentada)
```

### formatNbs

Formata um código NBS (Nomenclatura Brasileira de Serviços) na máscara `N.NNNN.NN.NN` em que a nomenclatura o imprime. Só a estrutura muda; use `isValidNbs` para conferir um código com a tabela.

- Todo código NBS começa com 1, então, diferente do `formatNcm`, não há opção `pad`.
- No resto, mesmas regras de `formatCnae`: a máscara é aplicada até onde o valor vai, os caracteres fora dela são descartados e um número só é lido como a string dos seus dígitos quando é um inteiro seguro não negativo; qualquer outro número retorna `''`.

```javascript
import { formatNbs } from '@brazilian-utils/brazilian-utils';

formatNbs('101011100'); // 1.0101.11.00
formatNbs(101011100); // 1.0101.11.00
formatNbs('10101'); // 1.0101 (mascarado até onde vai)
formatNbs('abc101011100'); // 1.0101.11.00 (só os dígitos são lidos)
formatNbs(-101011100); // '' (não é um inteiro seguro não negativo)
```

### getNbs

Consulta um código NBS (Nomenclatura Brasileira de Serviços) e retorna a sua descrição oficial. O resultado é um registro `Nbs`: `{ code, description }`.

- Mesmas regras de `isValidNbs`. `code` são os 9 dígitos, sem a máscara. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.

```javascript
import { getNbs } from '@brazilian-utils/brazilian-utils';

getNbs('1.0101.11.00');
// { code: '101011100', description: 'Serviços de construção de edificações residenciais de um e dois pavimentos' }

getNbs(126050000); // { code: '126050000', description: 'Serviços domésticos' }
getNbs('1.0101'); // null (título de posição, não um código completo)
getNbs('1.9999.99.99'); // null
```

Fonte: [tabela da NBS 2.0 publicada pelo MDIC](https://www.gov.br/mdic/pt-br/assuntos/sdic/comercio-e-servicos/nbs-nomenclatura-brasileira-de-servicos), aprovada pela Portaria Conjunta RFB/SCS 1.429/2018 e alterada pela Portaria Conjunta RFB/SCS 2.000/2018.

### isValidServiceItem

Verifica se um valor é um subitem em vigor da lista de serviços anexa à Lei Complementar 116/2003, a lista dos serviços sobre os quais incide o ISS.

- A lei numera o subitem como o item, um ponto e dois dígitos, de `1.01` a `40.01`.
- Aceita essa forma, o item preenchido com zero (`'01.01'`) ou os dígitos puros (`'0101'`, `'101'` ou o inteiro `101`), que são os quatro primeiros dígitos do código `cTribNac` da NFS-e nacional, com espaços opcionais nas extremidades.
- O ponto é o único separador que a lei imprime entre o item e o subitem, então, ao contrário dos códigos com máscara de agrupamento impressa (`isValidCfop`, `isValidNbs`), nada mais é aceito no lugar dele e `'1-01'` é rejeitado.
- Um número só é lido quando é um inteiro seguro não negativo, então o decimal `1.01` é rejeitado: escreva a forma com ponto como string.
- Os subitens vetados (`3.01`, `7.14`, `7.15`, `13.01` e `17.07`), os títulos de item, os códigos nacionais de 6 dígitos em que um subitem se desdobra e o item 99 da lista nacional, que não faz parte da lei, não são válidos. Códigos municipais de serviço estão fora do escopo.

```javascript
import { isValidServiceItem } from '@brazilian-utils/brazilian-utils';

isValidServiceItem('1.01'); // true
isValidServiceItem('01.01'); // true
isValidServiceItem('0101'); // true
isValidServiceItem(101); // true
isValidServiceItem('3.01'); // false (vetado)
isValidServiceItem('99.01'); // false (só da lista nacional, não da lei)
isValidServiceItem(1.01); // false (não é um inteiro seguro não negativo)
```

### getServiceItem

Consulta um subitem da lista de serviços anexa à Lei Complementar 116/2003 e retorna a sua descrição oficial. O resultado é um registro `ServiceItem`: `{ code, description }`.

- Mesmas regras de `isValidServiceItem`. `code` é a forma em que a lei o imprime (`'1.01'`). Retorna `null` quando o subitem é desconhecido ou o valor não está em uma forma documentada.

```javascript
import { getServiceItem } from '@brazilian-utils/brazilian-utils';

getServiceItem('1.01'); // { code: '1.01', description: 'Análise e desenvolvimento de sistemas.' }
getServiceItem('0101'); // { code: '1.01', description: 'Análise e desenvolvimento de sistemas.' }
getServiceItem('40.01'); // { code: '40.01', description: 'Obras de arte sob encomenda.' }
getServiceItem('3.01'); // null (vetado)
```

Fonte: [Lei Complementar 116/2003](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm), cuja lista foi alterada pela última vez pela Lei Complementar 183/2021, e a planilha `LISTA.SERV.NAC.` do [ANEXO B do Sistema Nacional NFS-e](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual), a lista em vigor em formato legível por máquina.

### isValidCfop

Valida um código CFOP (Código Fiscal de Operações e Prestações) contra a tabela oficial, o Anexo II consolidado do Convênio SINIEF s/nº 1970 em vigor.

- Só os códigos operáveis contam: os títulos de grupo e subgrupo, os códigos terminados em `00` e `50`, são rejeitados.
- Aceita uma string com os 4 dígitos ou com a forma `N.NNN`, com um único separador (espaço, `.`, `-` ou `/`), ou um número. Qualquer outra string é rejeitada.
- Nenhum código CFOP começa com zero, então nada é completado.

```javascript
import { isValidCfop } from '@brazilian-utils/brazilian-utils';

isValidCfop('5102'); // true
isValidCfop('1.101'); // true
isValidCfop('7504'); // true (incluído na reescrita de 2022 do anexo)
isValidCfop('0000'); // false
isValidCfop('1150'); // false (título de subgrupo, não é um código operável)
isValidCfop('abc5102'); // false (não é uma forma documentada)
isValidCfop(-5102); // false (não é um inteiro seguro não negativo)
```

Fonte: [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### parseCfop

Remove a formatação do CFOP (Código Fiscal de Operações e Prestações), mantém apenas os dígitos e limita o resultado a 4 dígitos.

- Nenhum código CFOP começa com zero, então nada é completado aqui.

```javascript
import { parseCfop } from '@brazilian-utils/brazilian-utils';

parseCfop('5.102'); // '5102'
```

### getCfop

Consulta um código CFOP (Código Fiscal de Operações e Prestações) e retorna seu código e a descrição oficial. O resultado é um registro `Cfop`: `{ code, description }`.

- Mesmas regras de `isValidCfop`. Retorna `null` para um título, um código desconhecido ou um valor fora das formas documentadas.

```javascript
import { getCfop } from '@brazilian-utils/brazilian-utils';

getCfop('1101'); // { code: '1101', description: 'Compra para industrialização ou produção rural' }
getCfop('7504'); // { code: '7504', description: 'Exportação de mercadoria que foi objeto de formação de lote de exportação' }
getCfop('0000'); // null
getCfop('5350'); // null (título de subgrupo, não é um código operável)
getCfop('abc5102'); // null (não é uma forma documentada)
```

Fonte: [Anexo II consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24), última alteração pelo [Ajuste SINIEF 39/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2025/AJ039_25).

### isValidCest

Valida um CEST (Código Especificador da Substituição Tributária) contra os anexos do Convênio ICMS 142/18, no texto consolidado vigente.

- Só os itens em vigor contam: um item que os anexos marcam como revogado é rejeitado.
- A verificação é só do código: ela não diz se o código combina com um dado NCM, nem se um estado aplica o regime de substituição tributária a ele.
- Um CEST tem 7 dígitos: os dois primeiros são o segmento, do terceiro ao quinto o item do segmento e os dois últimos a especificação do item (cláusula sexta, IV).
- Aceita uma string com os 7 dígitos ou com a forma `NN.NNN.NN` que os anexos imprimem, com um único separador entre os grupos e espaços opcionais nas extremidades, ou um inteiro seguro não negativo. Qualquer outra string é rejeitada em vez de ter os dígitos pinçados.
- O zero à esquerda dos segmentos 01 a 09 faz parte do código, então um valor escrito apenas com dígitos é completado com zeros à esquerda até 7, como string ou como número: `100100`, `'100100'` e `'0100100'` são o mesmo código. Um valor mascarado é lido como foi escrito.

```javascript
import { isValidCest } from '@brazilian-utils/brazilian-utils';

isValidCest('01.001.00'); // true
isValidCest('0100100'); // true
isValidCest(100100); // true (completado para 7 dígitos, ou seja, '0100100')
isValidCest('03.001.00'); // false (um item revogado)
isValidCest('0000000'); // false
isValidCest('abc0100100'); // false (não é uma forma documentada)
isValidCest(-100100); // false (não é um inteiro seguro não negativo)
```

### formatCest

Formata um CEST (Código Especificador da Substituição Tributária) na forma `NN.NNN.NN` que os anexos do Convênio ICMS 142/18 imprimem. Só a estrutura muda; use `isValidCest` para conferir um código com os anexos.

- **Opções** (`FormatCestOptions`): `pad` (padrão `false`) completa antes o valor com zeros à esquerda até os 7 dígitos de um código completo.
- Mesmas regras de `formatNcm`: sem `pad` a máscara é aplicada até onde o valor vai, que é o que um campo sendo digitado precisa, os caracteres fora dela são descartados e um número é lido como a string dos seus dígitos, ou seja, só é completado com `pad: true`. Um número só é lido quando é um inteiro seguro não negativo; qualquer outro número retorna `''`.

```javascript
import { formatCest } from '@brazilian-utils/brazilian-utils';

formatCest('0100100'); // 01.001.00
formatCest(2899900); // 28.999.00
formatCest('01001'); // 01.001 (máscara aplicada até onde o valor vai)
formatCest(100100, { pad: true }); // 01.001.00 (completado até 7 dígitos antes)
formatCest('abc0100100'); // 01.001.00 (só os dígitos são lidos)
formatCest(-2899900); // '' (não é um inteiro seguro não negativo)
```

### parseCest

Remove a formatação do CEST (Código Especificador da Substituição Tributária), mantém apenas os dígitos e limita o resultado aos 7 dígitos de um código completo.

- Mesmas regras de `parseCbo`: nada é completado com zeros à esquerda aqui, então o zero à esquerda dos segmentos 01 a 09 precisa estar escrito. Use `isValidCest` ou `getCest`, que completam um código numérico sem máscara, para consultar um código.

```javascript
import { parseCest } from '@brazilian-utils/brazilian-utils';

parseCest('01.001.00'); // '0100100'
parseCest('28.999'); // '28999' (um código parcial é mantido como foi escrito)
```

### getCest

Consulta um CEST (Código Especificador da Substituição Tributária) e retorna a descrição do bem ou mercadoria e o nome do seu segmento, como os Anexos I a XXVI do Convênio ICMS 142/18 os redigem. O resultado é um registro `Cest`: `{ code, description, segment }`.

- Mesmas regras de `isValidCest`. Retorna `null` para um código desconhecido, revogado ou malformado.
- Os códigos NCM/SH que os anexos associam a cada CEST não fazem parte do resultado.

```javascript
import { getCest } from '@brazilian-utils/brazilian-utils';

getCest('05.001.00'); // { code: '0500100', description: 'Cimento', segment: 'Cimentos' }
getCest(500100); // { code: '0500100', description: 'Cimento', segment: 'Cimentos' }
getCest('03.001.00'); // null (um item revogado)
getCest('0000000'); // null
getCest('abc0500100'); // null (não é uma forma documentada)
```

Fonte: [Convênio ICMS 142/18 consolidado](https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18), alterado por último pelo Convênio ICMS 180/24.

### isValidCst

Valida um código de CST (Código de Situação Tributária) para um tributo. Informe o tributo em `options.tax`:

| Tributo | Formato | Códigos aceitos |
| --- | --- | --- |
| `icms` | 3 dígitos (origem + CST) | origem `0`-`8` + um de `00`, `02`, `10`, `15`, `20`, `30`, `40`, `41`, `50`, `51`, `53`, `60`, `61`, `70`, `90` |
| `ipi` | 2 dígitos | `00`, `01`, `02`, `03`, `04`, `05`, `49`, `50`, `51`, `52`, `53`, `54`, `55`, `99` |
| `pis` | 2 dígitos | `01`-`09`, `49`, `50`-`56`, `60`-`67`, `70`-`75`, `98`, `99` |
| `cofins` | 2 dígitos | mesma tabela do `pis` |

- **Opções** (`IsValidCstOptions`): `tax` escolhe a tabela. Omitido, ou fora desses quatro valores, todas as tabelas são aceitas.
- Aceita uma string com os 2 dígitos de um código da Tabela B ou os 3 dígitos da forma do ICMS, ou um número. A forma do ICMS pode ter um único separador (espaço, `.`, `-` ou `/`) depois do dígito de origem.
- Um único dígito é completado até a forma de 3 dígitos do ICMS; uma string de 2 dígitos é um código da Tabela B, enquanto o número `7` é o código ICMS `007`.

```javascript
import { isValidCst } from '@brazilian-utils/brazilian-utils';

isValidCst('000', { tax: 'icms' }); // true
isValidCst(0, { tax: 'icms' }); // true (um único dígito é completado até a forma de 3 dígitos, '000')
isValidCst('0', { tax: 'icms' }); // true (completado do mesmo jeito que um número)
isValidCst('110', { tax: 'icms' }); // true
isValidCst('002', { tax: 'icms' }); // true (monofasia de combustíveis)
isValidCst('06', { tax: 'pis' }); // true
isValidCst('99', { tax: 'ipi' }); // true
isValidCst('110'); // true (encontrado na tabela icms, tax omitido)
isValidCst('000', { tax: 'nope' }); // true (um tax desconhecido cai em todas as tabelas)
isValidCst('999'); // false (não existe em nenhuma tabela)
isValidCst('abc110'); // false (não é uma forma documentada)
isValidCst(-110); // false (não é um inteiro seguro não negativo)
```

Fonte: Tabela B do ICMS do [Anexo I do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) alterado pelo [Ajuste SINIEF 20/24](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24); IPI, PIS e COFINS da [IN RFB nº 1.009/2010](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974).

### isValidCsosn

Valida um código de CSOSN (Código de Situação da Operação no Simples Nacional) como um dos 10 códigos da tabela oficial: `101`, `102`, `103`, `201`, `202`, `203`, `300`, `400`, `500` ou `900`.

- Aceita uma string com os 3 dígitos puros, ou um número. Um CSOSN não tem agrupamento impresso, então `'1-01'` é rejeitado.

```javascript
import { isValidCsosn } from '@brazilian-utils/brazilian-utils';

isValidCsosn('101'); // true
isValidCsosn(900); // true
isValidCsosn('999'); // false
isValidCsosn('abc101'); // false (não é uma forma documentada)
isValidCsosn(-101); // false (não é um inteiro seguro não negativo)
```

Fonte: [Anexo III-A consolidado do Convênio SINIEF s/nº 1970](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70) e [Ajuste SINIEF 03/2010](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10).

### isValidCstIbsCbs

Valida um CST-IBS/CBS (Código de Situação Tributária do IBS e da CBS) contra a tabela oficial, o código que o campo `CST` do grupo `IBSCBS` leva nos documentos fiscais eletrônicos da reforma tributária (Lei Complementar nº 214/2025): NF-e, NFC-e, CT-e, NFS-e e os demais.

- Os códigos vigentes são `000`, `010`, `011`, `200`, `220`, `221`, `222`, `400`, `410`, `510`, `515`, `550`, `620`, `800`, `810`, `811`, `820` e `830`.
- É uma função própria, não um `tax` de `isValidCst`: IBS e CBS compartilham uma única tabela, seus códigos de 3 dígitos colidem com a forma origem + Tabela B do ICMS (`000`, `200`), e `isValidCst` sem `tax` aceita um código de qualquer tabela, então incluir esta mudaria o que esse padrão aceita.
- Aceita uma string de dígitos puros, com espaços opcionais nas extremidades, ou um inteiro seguro não negativo. O campo é numérico com 3 dígitos e não tem máscara, então qualquer outra string é rejeitada em vez de ter os dígitos pinçados.
- Um valor com menos de 3 dígitos é completado com zeros à esquerda, como string ou como número, já que os códigos começam com zeros que um campo numérico descarta: `0`, `'0'` e `'000'` são todos o código `000`.

```javascript
import { isValidCstIbsCbs } from '@brazilian-utils/brazilian-utils';

isValidCstIbsCbs('000'); // true
isValidCstIbsCbs(410); // true
isValidCstIbsCbs(10); // true (completado para '010')
isValidCstIbsCbs('100'); // false
isValidCstIbsCbs('cst200'); // false (não é uma forma documentada)
isValidCstIbsCbs(-200); // false (não é um inteiro seguro não negativo)
```

### getCstIbsCbs

Busca um CST-IBS/CBS e retorna a descrição que a tabela oficial de CST dá a ele. O resultado é um registro `CstIbsCbs`: `{ code, description }`.

- Valem a mesma tabela e as mesmas regras de entrada de `isValidCstIbsCbs`. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.

```javascript
import { getCstIbsCbs } from '@brazilian-utils/brazilian-utils';

getCstIbsCbs('000'); // { code: '000', description: 'Tributação integral' }
getCstIbsCbs(410); // { code: '410', description: 'Imunidade e não incidência' }
getCstIbsCbs(10); // { code: '010', description: 'Tributação com alíquotas uniformes' }
getCstIbsCbs('100'); // null
getCstIbsCbs('cst200'); // null (não é uma forma documentada)
```

### isValidClassTrib

Valida um cClassTrib (Código de Classificação Tributária do IBS e da CBS) contra a tabela oficial, o código que o campo `cClassTrib` leva ao lado do CST-IBS/CBS.

- **Opções** (`IsValidClassTribOptions`): `cst` é o CST-IBS/CBS que o documento leva, validado também contra a classificação. Omita-o para validar só o cClassTrib.
- Toda classificação pertence a exatamente um CST-IBS/CBS, os 3 primeiros dígitos do seu código, e um documento que leva um cClassTrib com outro CST é rejeitado (rejeição 1024, "Classificação Tributária do IBS e da CBS incompatível com o CST informado"). Um `cst` informado que não seja o CST da classificação, seja ele qual for, torna o resultado `false`.
- Só contam as classificações vigentes: o Informe Técnico 2025.002 exclui uma classificação encerrando sua vigência (`dFimVig`), como a v.1.60 fez com `220001`, `220002` e `220003`, e essas são rejeitadas. São 161 vigentes na versão publicada em 23/06/2026.
- Aceita uma string de dígitos puros, com espaços opcionais nas extremidades, ou um inteiro seguro não negativo. O campo é numérico com 6 dígitos e não tem máscara, então qualquer outra string é rejeitada.
- Um valor com menos de 6 dígitos é completado com zeros à esquerda: `1`, `'1'` e `'000001'` são todos o código `000001`. `cst` é lido da mesma forma, completado para 3 dígitos.
- Só a lista de códigos entra no bundle com esta função, não as descrições que `getClassTrib` retorna.

```javascript
import { isValidClassTrib } from '@brazilian-utils/brazilian-utils';

isValidClassTrib('200001'); // true
isValidClassTrib(1); // true (completado para '000001')
isValidClassTrib('200001', { cst: '200' }); // true
isValidClassTrib('200001', { cst: '000' }); // false (a classificação pertence ao CST 200)
isValidClassTrib('999999'); // false
isValidClassTrib('220001'); // false (excluído pelo Informe Técnico 2025.002 v.1.60)
isValidClassTrib('c200001'); // false (não é uma forma documentada)
```

### getClassTrib

Busca um cClassTrib e retorna a sua classificação oficial. O resultado é um registro `ClassTrib`: `{ code, cst, name, description }`.

- Valem a mesma tabela e as mesmas regras de leitura do código de `isValidClassTrib`. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.
- A opção `cst` existe só em `isValidClassTrib`, já que o registro retornado aqui já traz o seu CST em `cst`.
- `cst` é o CST-IBS/CBS a que a classificação pertence, os 3 primeiros dígitos do seu código; `name` é o nome reduzido que a tabela oficial dá para apresentação (a coluna "Nome cClassTrib") e `description` a situação a que se refere (a coluna "Descrição cClassTrib").
- A redação legal que a planilha também traz em cada linha (o artigo da Lei Complementar nº 214/2025 e dos dois regulamentos) não é distribuída.

```javascript
import { getClassTrib } from '@brazilian-utils/brazilian-utils';

getClassTrib('000002');
// {
//   code: '000002',
//   cst: '000',
//   name: 'Exploração de via',
//   description: 'Exploração de via, observado o art. 11 da Lei Complementar nº 214, de 2025.',
// }
getClassTrib(2)?.code; // '000002'
getClassTrib('999999'); // null
getClassTrib('220001'); // null (excluído pelo Informe Técnico 2025.002 v.1.60)
getClassTrib('c200001'); // null (não é uma forma documentada)
```

Fonte: as abas CST e cClassTrib da planilha "Tabela de Classificação Tributária do IBS e CBS" que o [Portal Nacional da NF-e publica em "Documentos" > "Diversos"](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/NJarYc9nus=) (a versão publicada em 23/06/2026), divulgada pelo [Informe Técnico 2025.002](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=) (v.1.60), e a [Nota Técnica 2025.002-RTC](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=), campos UB13 e UB14.

## GTIN (código de barras de produto)

### isValidGtin

Verifica se um GTIN (Global Trade Item Number, o número sob um código de barras EAN/UPC) é válido.

- Cobre as quatro estruturas das GS1 General Specifications, as mesmas quatro que a NF-e aceita em `cEAN` e `cEANTrib`: GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) e GTIN-14 (DUN-14).
- **Opções** (`IsValidGtinOptions`): `lengths` aceita só alguns dos quatro tamanhos. O padrão são os quatro.
- O valor deve ser uma string de 8, 12, 13 ou 14 dígitos, fora os espaços em volta, cujo último dígito é o dígito verificador módulo 10 da GS1: pesos 3 e 1 alternados a partir da direita, e a soma subtraída do múltiplo de dez igual ou imediatamente superior. É o que as regras I03-10 e I12-10 da Nota Técnica 2021.003 da SEFAZ verificam (rejeições 611 e 612).
- Zeros à esquerda contam, então um número nunca é aceito, e um valor com máscara (`'7 890000 000017'`) é rejeitado em vez de ter seus dígitos extraídos.
- O literal `'SEM GTIN'`, que a NF-e usa para produto sem GTIN, não é um GTIN e portanto não é válido aqui: teste por ele antes de chamar.
- Um valor só com zeros é rejeitado, embora o dígito verificador seja válido. Essa é uma regra desta biblioteca, não da NF-e nem da GS1: a rejeição 611 trata só do dígito verificador, e as GS1 General Specifications (release 26.0, tabela 1-4) reservam o GS1 Prefix `0000000` para Números de Circulação Restrita dentro de uma empresa, sem proibi-lo. Os zeros são rejeitados por serem o preenchimento usual de um GTIN ausente.
- O prefixo não muda o veredito. Os Números de Circulação Restrita (prefixos 02, 04 e 20 a 29, os códigos que a loja imprime nas etiquetas da própria balança) e as faixas de ISSN, ISBN e cupons têm a mesma estrutura e o mesmo dígito verificador, e a "Tabela Prefixo GS1", contra a qual a SEFAZ valida o `cEAN`, lista essas faixas como válidas; use `getGtinInfo` para distingui-las.
- O prefixo também não é conferido contra a lista de Organizações Membro da GS1: a GS1 segue atribuindo faixas, e uma cópia dessa lista passaria a recusar números válidos conforme envelhecesse. Se o número está cadastrado (a consulta ao Cadastro Centralizado de GTIN que a SEFAZ faz para os prefixos 789 e 790) não dá para verificar offline.

```javascript
import { isValidGtin } from '@brazilian-utils/brazilian-utils';

isValidGtin('7890000000017'); // true (GTIN-13, prefixo da GS1 Brasil)
isValidGtin('6291041500213'); // true (o exemplo da página de dígito verificador da GS1)
isValidGtin('78912342'); // true (GTIN-8)
isValidGtin('061414112345'); // true (GTIN-12)
isValidGtin('17890000000014'); // true (GTIN-14)
isValidGtin('7890000000018'); // false (dígito verificador errado)
isValidGtin('17890000000014', { lengths: [8, 12, 13] }); // false (GTIN-14 não aceito)
isValidGtin('7 890000 000017'); // false (somente dígitos)
isValidGtin('SEM GTIN'); // false
isValidGtin('0000000000000'); // false (só zeros, regra desta biblioteca)
```

### getGtinInfo

Extrai os campos de um GTIN, como um `GtinInfo`.

- Retorna `null` quando o valor não é um GTIN válido, sob as mesmas regras de `isValidGtin`.
- O prefixo é lido como as GS1 General Specifications (tabelas 1-4, 1-5 e 1-9) organizam os números: o valor é preenchido com zeros à esquerda até 14 dígitos, e o prefixo são as posições 7 a 9 quando as posições 2 a 6 são zeros (um GTIN-8, ou um GTIN-14 que agrupa um) e as posições 2 a 4 caso contrário. O primeiro dígito, o zero de preenchimento ou o dígito indicador, nunca faz parte do prefixo, então um GTIN-12 tem um prefixo que começa com `0`, e um GTIN-14 tem o prefixo do GTIN que ele agrupa.

| Campo | Descrição |
| --- | --- |
| `type` | `'GTIN-8'`, `'GTIN-12'`, `'GTIN-13'` ou `'GTIN-14'` (`GtinType`), conforme o tamanho com que o valor foi escrito |
| `length` | `8`, `12`, `13` ou `14` (`GtinLength`) |
| `prefix` | O Prefixo GS1 de três dígitos, ou um Prefixo GS1-8 quando as posições 2 a 6 da forma de 14 dígitos são zeros, o que cobre todo GTIN-8, um GTIN-14 que agrupa um e o Prefixo GS1 `0000000`. Identifica a Organização Membro da GS1 que licenciou o número, não o país de origem |
| `isBrazilian` | `true` quando o prefixo é um dos da GS1 Brasil, `789` ou `790`, o que a NT 2021.003 chama de "prefixo do Brasil" |
| `isRestrictedCirculation` | `true` quando o prefixo está em uma faixa que a GS1 reserva para Números de Circulação Restrita (Prefixos GS1 02, 04 e 20 a 29; Prefixos GS1-8 000 a 099 e 200 a 299, faixa em que também cai o Prefixo GS1 `0000000`, já que sua forma de 14 dígitos começa com seis zeros), ou seja, o número só é único dentro de uma empresa ou região |
| `checkDigit` | O dígito verificador módulo 10, o último dígito |

```javascript
import { getGtinInfo } from '@brazilian-utils/brazilian-utils';

getGtinInfo('7890000000017');
// { type: 'GTIN-13', length: 13, prefix: '789', isBrazilian: true,
//   isRestrictedCirculation: false, checkDigit: 7 }

getGtinInfo('17890000000014');
// { type: 'GTIN-14', length: 14, prefix: '789', isBrazilian: true,
//   isRestrictedCirculation: false, checkDigit: 4 }

getGtinInfo('061414112345');
// { type: 'GTIN-12', length: 12, prefix: '006', isBrazilian: false,
//   isRestrictedCirculation: false, checkDigit: 5 }

getGtinInfo('2000000000015')?.isRestrictedCirculation; // true (número interno da loja)
getGtinInfo('7890000000018'); // null (dígito verificador errado)
```

Fonte: [GS1 General Specifications](https://ref.gs1.org/standards/genspecs/), [calculadora de dígito verificador da GS1](https://www.gs1.org/services/how-calculate-check-digit-manually), [Nota Técnica 2021.003 da SEFAZ](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=SrQT9ys8ODo%3D) e [Tabela Prefixo GS1](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Oc+fygAxwmc%3D) do Portal da NF-e.

## ISBN

O ISBN (International Standard Book Number) tem 13 dígitos desde 2007: o prefixo GS1 (`978`, ou `979` para as faixas mais novas), o grupo de registro (`85` e `65` para o Brasil), o registrante (a editora), a publicação e um dígito verificador. O ISBN de 10 dígitos não é aceito: o Manual do Usuário do ISBN atual (7ª edição) e a Agência Brasileira do ISBN só definem a forma de 13 dígitos.

### isValidIsbn

Verifica se um ISBN-13 é válido: o prefixo `978` ou `979` e o dígito verificador módulo 10 do Manual do Usuário do ISBN (os 12 primeiros dígitos com pesos alternados 1 e 3, a mesma regra do GTIN-13).

- Separadores entre dois dígitos (espaço, `.`, `-` ou `/`, sozinhos ou em sequência, como o `isValidCpf` lê a máscara dele) e espaços em volta do valor são aceitos; qualquer outra coisa, inclusive um separador no começo ou no fim ou o rótulo `ISBN` que o livro imprime antes do número, torna o valor inválido.
- Um número `979-0` é um ISMN (partitura impressa), não um ISBN: a RangeMessage não dá grupo de ISBN a essa faixa, então ele é rejeitado.
- Não verifica se o grupo e o registrante estão atribuídos; veja `getIsbnInfo`.
- O exemplo impresso da Agência Brasileira do ISBN, `ISBN 978-65-89999-01-3`, não traz o dígito que a regra dá (`0`), então é rejeitado.

```javascript
import { isValidIsbn } from '@brazilian-utils/brazilian-utils';

isValidIsbn('9788533302273'); // true
isValidIsbn('978-65-89999-01-0'); // true
isValidIsbn('978-85-333-0227-4'); // false (dígito verificador errado)
isValidIsbn('8533302276'); // false (a forma de 10 dígitos)
```

### parseIsbn

Remove os hífens e todo caractere que não seja dígito, mantendo no máximo 13 dígitos.

```javascript
import { parseIsbn } from '@brazilian-utils/brazilian-utils';

parseIsbn('978-85-333-0227-3'); // '9788533302273'
```

### getIsbnInfo

Divide um ISBN-13 válido nos seus elementos, como um `IsbnInfo`, seguindo as faixas que a Agência Internacional do ISBN publica (a RangeMessage), que dão os comprimentos variáveis do grupo e do registrante.

- Retorna `null` quando o valor não é válido pelo `isValidIsbn`, ou quando o grupo ou o registrante cai numa faixa ainda não atribuída.
- As faixas são atualizadas pelo workflow de datasets.

| Campo | Descrição |
| --- | --- |
| `isbn` | Os 13 dígitos |
| `prefix` | `'978'` ou `'979'` |
| `registrationGroup` | O país, região ou área de idioma, por exemplo `'85'` ou `'65'` para o Brasil |
| `registrant` | A editora ou selo dentro do grupo |
| `publication` | A edição dentro do registrante |
| `checkDigit` | O dígito verificador, o último dígito |
| `agency` | A agência que a Agência Internacional do ISBN lista para o grupo, por exemplo `'Brazil'` ou `'English language'` |
| `isBrazilian` | `true` para os grupos da Agência Brasileira do ISBN, `85` e `65` |

```javascript
import { getIsbnInfo } from '@brazilian-utils/brazilian-utils';

getIsbnInfo('978-65-89999-01-0');
// { isbn: '9786589999010', prefix: '978', registrationGroup: '65', registrant: '89999',
//   publication: '01', checkDigit: 0, agency: 'Brazil', isBrazilian: true }

getIsbnInfo('9780306406157')?.agency; // 'English language'
```

### formatIsbn

Coloca os hífens de um ISBN-13 entre os seus elementos, como o `getIsbnInfo` o divide. Os comprimentos dos elementos variam, então um valor parcial ou inválido, ou numa faixa ainda não atribuída, retorna `''`. O rótulo `ISBN` não é acrescentado.

```javascript
import { formatIsbn } from '@brazilian-utils/brazilian-utils';

formatIsbn('9788533302273'); // '978-85-333-0227-3'
formatIsbn('9780306406157'); // '978-0-306-40615-7'
formatIsbn('978853330227'); // ''
```

Fonte: [Manual do Usuário do ISBN, 7ª edição](https://www.isbn-international.org/content/isbn-users-manual/29), [faixas do ISBN (RangeMessage)](https://www.isbn-international.org/range_file_generation) da Agência Internacional do ISBN e a [Agência Brasileira do ISBN](https://www.cblservicos.org.br/isbn/estrutura/).

## CID-10

### isValidCid10

Valida um código CID-10 contra as tabelas que o DATASUS publica, a edição brasileira da CID-10 (Classificação Estatística Internacional de Doenças e Problemas Relacionados à Saúde, 10ª revisão), o código que atestados médicos e sistemas de saúde carregam.

- Os dois níveis da classificação são válidos: as categorias de 3 caracteres (`A00`) e as subcategorias de 4 caracteres, escritas com o ponto (`A00.0`) ou sem ele (`A000`).
- Maiúsculas, minúsculas e espaços em volta são ignorados. Qualquer outra coisa (outro separador, um quinto caractere, um sufixo de cruz ou asterisco, um valor que não é string) é rejeitada.
- As tabelas são as V2008 do DATASUS, mais a categoria `U07` da tabela da CID-10 que o DATASUS mantém para o SIM (`U07`, `U07.0`, `U07.1` COVID-19 com vírus identificado e `U07.2` vírus não identificado), que as V2008 não têm. Um código que não está em nenhuma delas não é encontrado, como `U09.9` (condição pós-COVID-19) e `U10.9` (síndrome inflamatória multissistêmica associada à COVID-19). Até a 2.4.0 os códigos `U07` também não eram encontrados.
- Só uma tabela de códigos é lida (cerca de 26 KB minificada), não as descrições que `getCid10` carrega.

```javascript
import { isValidCid10 } from '@brazilian-utils/brazilian-utils';

isValidCid10('A00.0'); // true
isValidCid10('a000'); // true
isValidCid10('A00'); // true (uma categoria)
isValidCid10('I10'); // true (uma categoria que não é subdividida)
isValidCid10('A00.5'); // false (A00 não tem a subcategoria 5)
isValidCid10('I10.0'); // false (I10 não tem subcategorias)
isValidCid10('A00-0'); // false (não é uma forma documentada)
```

### formatCid10

Formata um código CID-10 do jeito que ele é impresso: em maiúsculas, com um ponto entre a categoria de 3 caracteres e o quarto caractere da subcategoria. Só a estrutura muda; use `isValidCid10` para conferir um código com as tabelas.

- A máscara é aplicada até onde o valor vai, então uma categoria fica como está e o ponto só aparece com o quarto caractere.
- Caracteres fora da máscara são descartados e o valor é limitado a 4 caracteres.

```javascript
import { formatCid10 } from '@brazilian-utils/brazilian-utils';

formatCid10('A000'); // A00.0
formatCid10('f322'); // F32.2
formatCid10('A00'); // A00 (uma categoria não tem ponto)
formatCid10('A00.0'); // A00.0
```

### parseCid10

Remove a formatação de um código CID-10, mantém apenas letras e dígitos, em maiúsculas, e limita o resultado aos 4 caracteres de uma subcategoria, a forma que as tabelas do DATASUS guardam.

- Um valor mais curto passa até onde ele vai.

```javascript
import { parseCid10 } from '@brazilian-utils/brazilian-utils';

parseCid10('A00.0'); // 'A000'
parseCid10('f32.2'); // 'F322'
parseCid10('A00'); // 'A00'
```

### getCid10

Busca um código CID-10 e retorna a sua descrição oficial em português. O resultado é um registro `Cid10`: `{ code, description }`.

- Mesmas regras de entrada de `isValidCid10`. O `code` vem em maiúsculas e sem o ponto. Retorna `null` quando o código é desconhecido ou o valor não está em uma forma documentada.
- Mesma tabela de `isValidCid10`: a V2008 do DATASUS mais os códigos `U07` da tabela do SIM (`getCid10('U07.1')` é `{ code: 'U071', description: 'Infecção pelo novo Coronavírus (COVID-19)' }`); `U09.9` e `U10.9` não são encontrados.
- Este é o utilitário mais pesado do pacote: ele embute as 2046 categorias e 12191 subcategorias com suas descrições, cerca de 990 KB minificado (124 KB com gzip). Carregue-o sob demanda pelo seu subpath, como mostrado em [Tamanho do bundle](pt-br/getting-started.md#tamanho-do-bundle), e use `isValidCid10` quando a descrição não for necessária.

```javascript
import { getCid10 } from '@brazilian-utils/brazilian-utils';

getCid10('A00.0'); // { code: 'A000', description: 'Cólera devida a Vibrio cholerae 01, biótipo cholerae' }
getCid10('a000'); // { code: 'A000', description: 'Cólera devida a Vibrio cholerae 01, biótipo cholerae' }
getCid10('A00'); // { code: 'A00', description: 'Cólera' }
getCid10('A00.5'); // null
getCid10('A00-0'); // null (não é uma forma documentada)
```

Fonte: [tabelas da CID-10 V2008 que o DATASUS publica em CSV](http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm) e a [tabela da CID-10 do SIM](ftp://ftp.datasus.gov.br/dissemin/publicos/SIM/CID10/TABELAS/CID10.DBF) para os códigos `U07`.

## Texto

### capitalize

Transforma em maiúscula a primeira letra de cada palavra, do jeito que se escreve um nome, uma razão social ou um endereço brasileiro, sem precisar de opções.

- **Opções** (`CapitalizeOptions`): `lowerCaseWords`, palavras mantidas em minúsculas entre duas palavras, por padrão as preposições e a conjunção `e`, como `de`, `da`, `do`, `ao`, `para`, `pelo`, `sobre`, `até` (os artigos são só `a` e `o`); `upperCaseWords`, palavras sempre em maiúsculas, por padrão designações societárias e abreviações como `LTDA`, `S.A.`, `ME`, `CNPJ` e algarismos romanos. Uma lista substitui a padrão.
- Palavras se separam em espaços, `-`, `/`, apóstrofos e pontuação colada; espaços repetidos viram um só.
- Palavra minúscula que é a primeira, a última ou precede pontuação é designativo e mantém a maiúscula.
- `ME` só vira maiúsculas como designação (última palavra ou antes de outra); `S.A` sem o ponto final também é designação, já `SA` sem pontos fica como está (o sobrenome Sá). Sigla de estado após `/` vira maiúsculas mesmo com `upperCaseWords` informado, assim como a que termina o valor depois de `-` ou `–` entre espaços ou de `, `, o "Cidade – UF" dos Correios.

```javascript
import { capitalize } from '@brazilian-utils/brazilian-utils';

capitalize('jose da silva'); // Jose da Silva
capitalize('JOSÉ DA SILVA'); // José da Silva
capitalize('empresa ltda'); // Empresa LTDA
capitalize('banco do brasil s.a.'); // Banco do Brasil S.A.
capitalize('casa de carnes s/a'); // Casa de Carnes S/A ("S/A" é reconhecido com a barra no meio)
capitalize('mogi-guaçu'); // Mogi-Guaçu ("-" inicia uma nova palavra)
capitalize("santa bárbara d'oeste"); // Santa Bárbara d'Oeste ("'" inicia uma nova palavra, "d" fica minúsculo)
capitalize("bob's"); // Bob's (uma letra sozinha depois do apóstrofo é o possessivo do inglês)
capitalize('rua a, 100'); // Rua A, 100 (uma preposição antes de pontuação é um designativo)
capitalize('fulano comércio me'); // Fulano Comércio ME ("ME" como última palavra é a designação)
capitalize('não-me-toque'); // Não-Me-Toque (em qualquer outro lugar "me" é palavra comum)
capitalize('(empresa) ltda'); // (Empresa) LTDA
capitalize('luiz von schmidt'); // Luiz von Schmidt
capitalize('casa para todos'); // Casa para Todos (preposições contraídas como "ao", "às", "pelo" e "sobre" também ficam minúsculas)
capitalize('empresa s.a'); // Empresa S.A
capitalize('santana/rs'); // Santana/RS ("RS" é sigla de estado logo depois de uma "/")
capitalize('porto alegre/rs'); // Porto Alegre/RS
capitalize('brasília - df'); // Brasília - DF (sigla de estado como última palavra depois de " - ", " – " ou ", ")
capitalize('santana rs'); // Santana Rs (sem "/", "rs" é só uma palavra)
capitalize('rua xv de novembro'); // Rua XV de Novembro (algarismo romano, "de" fica em minúsculas)
capitalize('joão paulo ii'); // João Paulo II
capitalize('rua xxiv de maio'); // Rua XXIV de Maio (algarismos romanos de II a XXXIX, exceto VI, o verbo "vi")
capitalize('de'); // De (uma preposição mantém a maiúscula quando é a primeira palavra)
capitalize('empresa ltda', { upperCaseWords: [] }); // Empresa Ltda (a lista informada substitui a padrão)
capitalize('josé Ama MARIA', { lowerCaseWords: ['ama'] }); // José ama Maria
capitalize('doc inválido', { upperCaseWords: ['DOC'] }); // DOC Inválido (comparação sem diferenciar maiúsculas de minúsculas)
capitalize('  josé   maria  '); // José Maria (toda sequência de espaço em branco, tabs e quebras de linha inclusive, vira um único espaço)
```

Fonte: [Manual de Redação da Presidência da República](https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf).

### removeAccents

Remove marcas diacríticas (acentos, tils, cedilhas) de uma string.

- Toda marca de combinação (categoria geral M do Unicode) é descartada, então acentos de qualquer escrita são removidos.

```javascript
import { removeAccents } from '@brazilian-utils/brazilian-utils';

removeAccents('São Paulo'); // 'Sao Paulo'
removeAccents('Piauí'); // 'Piaui'
removeAccents('Ceará'); // 'Ceara'
removeAccents('Açaí'); // 'Acai'
removeAccents(''); // ''
```

## Inscrição estadual (IE)

### isValidIe

Valida uma inscrição estadual para um estado. **Descontinuada:** a forma posicional `isValidIe(stateCode, ie)` continua funcionando, mas está descontinuada; use a forma com objeto `isValidIe({ value, stateCode })`.

- Recebe um único objeto (`IsValidIeParams`): `value` é a inscrição e `stateCode` o estado ao qual ela pertence (um `StateCode`, sem diferenciar maiúsculas de minúsculas e ignorando espaços em volta).
- Alguns estados têm casos especiais, um prefixo ou formato que a página do SINTEGRA não traz ou um desvio proposital dela (detalhes e fontes no JSDoc em `src/is-valid-ie`):
  - GO: os prefixos 10, 11, 15 e 20 a 29, a união de fontes que divergem: a norma (IN nº 946/09-GSF, art. 39, I, na redação da IN nº 1.535/22-GSE) traz 10, 20 e 11, a página do SINTEGRA 10, 11 e 20 a 29, o roteiro de crítica de 2012 10, 11 e 15. O dígito verificador segue o roteiro, como na 2.4.0: resto 1 dá 1 na faixa 10103105 a 10119997, e 11094402 aceita os dois dígitos, casos especiais que a página do SINTEGRA (2022) não tem.
  - MT: 11 dígitos, ou os 9 dígitos que a Portaria SEFAZ-MT nº 59/2025 (art. 8º, § 1º) prevê, lidos como a forma de 11 dígitos com dois zeros à esquerda (nenhum texto oficial traz a regra do dígito verificador da forma de 9 dígitos).
  - PA: os prefixos 15 e 75 a 79 que a página do SINTEGRA lista (a SEFA-PA atribui 75 desde 07/10/2024). MS: os prefixos 28 e 50 que a página do SINTEGRA traz (o 50 também está em um comunicado da SEFAZ-MS sobre o e-CCE; a única norma, a Resolução/SEF nº 1.344/1999, traz só o 28).
  - DF: a regra de 13 dígitos do AC com os prefixos 07 e 08. A página do SINTEGRA não diz que o 07 é fixo; a folha de regras da SEFAZ-DF o chama de "campo fixo". O DF passou a 08 quando os números iniciados por 07 acabaram.
  - RR: o prefixo 24, que a página do SINTEGRA não escreve como regra: ele vem dos dez exemplos da página.
  - SP: o formato de produtor rural `P0MMMSSSSD000`, com o zero depois do `P`; o `P` pode ser minúsculo.
  - TO: os 9 dígitos em vigor (Portaria SEFAZ-TO nº 676/2002, art. 3º; RICMS-TO, Decreto nº 2.912/2006, art. 90), ou os antigos 11 dígitos que a página do SINTEGRA documenta, com os dígitos de tipo 01, 02, 03 ou 99.
  - AM: a regra do dígito verificador da página tem dois ramos e não define "Resto"; a biblioteca o lê como a soma módulo 11 e dá 0 a uma soma 0 ou 1, a regra comum de módulo 11.
  - MG: um primeiro dígito verificador 10, de uma soma que já é múltiplo de dez, é lido como 0.
  - PE: o formato eFisco de 9 dígitos e o antigo formato CACEPE de 14 dígitos, ambos na página do SINTEGRA (a Portaria SF nº 087/2007 converteu os números antigos, mas não fixou data a partir da qual deixam de valer).
  - AL: o terceiro dígito, o tipo de empresa, deve ser 0, 3, 5, 7 ou 8, os valores que a página do SINTEGRA lista.
- Uma inscrição só de zeros é aceita em todo estado cuja fórmula publicada produz dígito verificador 0 para ela: AM, CE, ES, MG, PB, PE (9 dígitos), PI, PR, RJ, RS, SC, SE e SP, mais BA com 8 ou 9 dígitos, MT com 9 ou 11 dígitos e TO com 9 dígitos.

```javascript
import { isValidIe } from '@brazilian-utils/brazilian-utils';

isValidIe({ value: '110042490114', stateCode: 'SP' }); // true
isValidIe({ value: 'P011004243002', stateCode: 'SP' }); // true (produtor rural)
isValidIe({ value: '0187634580933', stateCode: 'AC' }); // false
isValidIe({ value: '109161793', stateCode: 'go' }); // true (não diferencia maiúsculas de minúsculas)
isValidIe({ value: '109161793', stateCode: ' GO ' }); // true (espaços em volta são ignorados)
isValidIe({ value: '200000004', stateCode: 'GO' }); // true (prefixo 20)
isValidIe({ value: '130000019', stateCode: 'MT' }); // true (9 dígitos)
```

Fonte: [páginas dos estados no SINTEGRA](http://www.sintegra.gov.br/insc_est.html), o [roteiro de crítica de Goiás](https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/) e a [IN nº 946/09-GSF](https://appasp.economia.go.gov.br/Legislacao/arquivos/secretario/in/IN_0946_2009.htm).

## E-mail

### isValidEmail

Valida um endereço de e-mail. Um subconjunto prático da definição do HTML da WHATWG.

- Parte local: letras, dígitos e `_'+-.`, sem ponto no início ou no fim, sem apóstrofo no fim e sem dois pontos seguidos, com no máximo 64 caracteres. O endereço todo é limitado a 254 caracteres (RFC 5321, seção 4.5.3.1); até a 2.4.0 não havia limite em nenhum dos dois.
- Domínio: pelo menos um ponto, rótulos de até 63 caracteres, rótulo final de 2 a 63 letras ou um rótulo punycode (`xn--`, até 63 caracteres, então `user@example.xn--p1ai` é válido).
- Rejeitados, embora a WHATWG permita alguns: partes locais entre aspas, literais de endereço, domínios de um só rótulo como `user@localhost`, e os caracteres `! # $ % & * = ? ^ { | } ~`, a barra e a crase na parte local.

```javascript
import { isValidEmail } from '@brazilian-utils/brazilian-utils';

isValidEmail('john.doe@hotmail.com'); // true
isValidEmail('invalid.email'); // false
isValidEmail('user@example.xn--p1ai'); // true (domínio de topo punycode)
isValidEmail('a%b@example.com'); // false (% fica fora do conjunto aceito na parte local)
```

Fonte: [HTML da WHATWG, valid e-mail address](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address) e [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322).

## Cartão de crédito

### isValidCreditCard

Valida um número de cartão de pagamento (crédito ou débito) com o algoritmo de Luhn. Só a quantidade de dígitos (12 a 19) e o dígito verificador de Luhn são conferidos. Não há detecção de bandeira (Visa, Mastercard, Amex...), consulta de faixa de emissor nem validação de validade/CVV.

- Aceita uma string ou um número, com os caracteres de máscara (espaço em branco, `.`, `-` e `/`) em qualquer posição entre os dígitos.

```javascript
import { isValidCreditCard } from '@brazilian-utils/brazilian-utils';

isValidCreditCard('4111111111111111'); // true (número de teste Visa)
isValidCreditCard('5555555555554444'); // true (número de teste Mastercard)
isValidCreditCard('378282246310005'); // true (número de teste American Express)
isValidCreditCard('4111 1111 1111 1111'); // true (máscara com espaços)
isValidCreditCard('4111 - 1111 - 1111 - 1111'); // true (uma sequência de separadores entre os dígitos)
isValidCreditCard('4111.1111/1111-1111'); // true (qualquer um dos caracteres de máscara)
isValidCreditCard('4111111111111112'); // false (dígito verificador inválido)
isValidCreditCard('0000000000000000'); // false (todos os dígitos iguais, ainda que o Luhn feche)
isValidCreditCard('4111a1111b1111c1111'); // false (letras entre os dígitos)
isValidCreditCard(4111111111111111111); // false (acima de 2^53 - 1, passe como string)
```

Fonte: [ISO/IEC 7812-1](https://www.iso.org/standard/70484.html).

## Registro profissional

### isValidRegistroProfissional

Verifica a estrutura de um número de registro em conselho profissional (registro/inscrição profissional). Só a quantidade de dígitos e a UF são conferidas, nunca o dígito verificador, nem no CRC.

- Os separadores da máscara (espaço, `.`, `-` e `/`) são ignorados em qualquer posição; qualquer outro caractere (`@`, um emoji) invalida o valor em vez de ser removido.

- Recebe um objeto (`IsValidRegistroProfissionalParams`): `value`, `council` (`RegistroProfissionalCouncil`: `"OAB"`, `"CRM"`, `"CRO"`, `"CRP"` ou `"CRC"`) e `stateCode` opcional (UF esperada, sem diferenciar maiúsculas/minúsculas e ignorando espaços nas pontas).
- `"OAB"` e `"CRM"`: 4 a 6 dígitos mais a UF (`123456/SP`, `123456-SP`); `"CRO"`: 3 a 6 dígitos (`12345/SP`), ou a forma da Consolidação das Normas do CFO (Resolução CFO-63/2005), art. 115, § 1º: a sigla do Conselho Regional antes, ligada por hífen à categoria (`TPD`, `TSB`, `ASB`, `APD`, `CLM`/`CLF`, `LPM`/`LPF`, `PV`, `T`) quando houver, depois o número, seguido de `-IS` na secundária ou `-R` na remida (`CRO-SP 12345`, `CRO-SP-TPD 1234`, `CRO-SP 12345-IS`). Até a 2.4.0 essa forma era rejeitada.
- `"CRP"`: código regional de 2 dígitos (`01` a `24`) mais 4 a 6 dígitos (`06/12345`); `stateCode` é ignorado. O sistema CFP tem 24 regionais; o CRP-25 (Amapá) é só uma proposta.
- `"CRC"`: UF, 6 dígitos, tipo de registro (`O` ou `P`) e dígito verificador (`SP-123456/O-3`); transferência acrescenta `T` ou `S` e a UF destino (`SP-123456/O-3 T-MG`). `stateCode` confere a UF de origem. Essa forma e os registros `P`/`S` vêm do Manual de Registro de 2009; a Resolução CFC nº 1.707/2023, em vigor, só fixa uma numeração "única e sequencial em cada CRC" e o `T` da transferência, e o algoritmo do dígito verificador não é publicado.
- As quantidades de dígitos de OAB, CRM, CRO e CRP são convencionais: a OAB e o CFM não publicam formato, e nem o art. 115 do CFO nem o CFP fixam quantidade de dígitos. CREA não é coberto.

```javascript
import { isValidRegistroProfissional } from '@brazilian-utils/brazilian-utils';

isValidRegistroProfissional({ value: '123456/SP', council: 'OAB' }); // true
isValidRegistroProfissional({ value: '123456-RJ', council: 'OAB', stateCode: 'SP' }); // false (UF divergente)
isValidRegistroProfissional({ value: '123456', council: 'OAB' }); // false (sem UF)
isValidRegistroProfissional({ value: '12@3456/SP', council: 'OAB' }); // false (um caractere fora da máscara)
isValidRegistroProfissional({ value: 'CRO-SP-TPD 1234', council: 'CRO' }); // true (art. 115 das normas do CFO)
isValidRegistroProfissional({ value: '06/12345', council: 'CRP' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3', council: 'CRC' }); // true
isValidRegistroProfissional({ value: 'SP-123456/O-3 T-MG', council: 'CRC' }); // true (registro transferido)
isValidRegistroProfissional({ value: 'SP-123456/T-3', council: 'CRC' }); // false ("T" não é tipo de registro)
```

Fonte: [Consolidação das Normas do CFO, art. 115](https://transparencia.cfo.org.br/wp-content/uploads/2023/09/Consolida%C3%A7%C3%A3o-das-Normas-Atualizado-emsetembro-de-2023.pdf), [Manual de Registro do Sistema CFC/CRCs](https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf), [Resolução CFC nº 1.707/2023](https://www1.cfc.org.br/sisweb/SRE/docs/Res_1707.pdf), [regionais do CFP](https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/).

## VIN

### isValidVin

Valida um VIN (Vehicle Identification Number / chassi). Por padrão confere 17 caracteres nas três seções da Resolução CONTRAN nº 968/2022, art. 3º (o WMI, o VDS e o VIS), cada um algarismo ou letra maiúscula exceto `I`, `O` e `Q`.

- A exclusão de `I`, `O` e `Q` vem da ISO 3779, não da resolução: ela não lista caractere proibido e remete a gravação à ABNT NBR 6066:2022 (art. 5º), norma paga sem cópia oficial gratuita. Os VINs de regularização do Anexo II dela (WMI `XXX`) são escritos sem essas letras, então passam.
- **Opções** (`IsValidVinOptions`): `checkDigit: true` também exige as regras norte-americanas do 49 CFR 565.15, o dígito verificador na 9ª posição e um código de ano-modelo diferente de `U`, `Z` e `0` na 10ª. Use para o VIN de um veículo fabricado para os Estados Unidos ou o Canadá.
- As normas brasileiras não exigem o dígito verificador, e muitos VINs fabricados no Brasil não o têm. Até a 2.4.0 ele era sempre exigido; passe `{ checkDigit: true }` para manter esse comportamento.
- Não diferencia maiúsculas de minúsculas e ignora espaços ao redor; um valor de um único caractere repetido é rejeitado. Um VIN é impresso em uma sequência contínua, então espaço, `.`, `-` ou `/` entre os caracteres é rejeitado em vez de removido. Só contam letras ASCII e algarismos: uma letra não ASCII que vira letra ASCII em maiúsculas (`ſ`, `ß`) é rejeitada.

```javascript
import { isValidVin } from '@brazilian-utils/brazilian-utils';

isValidVin('9BWZZZ377VT004251'); // true (VIN brasileiro, sem dígito verificador)
isValidVin('9BWZZZ377VT004251', { checkDigit: true }); // false (o 9º caractere não é o dígito verificador)
isValidVin('1HGCM82633A004352', { checkDigit: true }); // true
isValidVin('1m8gdm9axkp042788', { checkDigit: true }); // true (dígito verificador X, minúsculo)
isValidVin('1HGCM82633A004353', { checkDigit: true }); // false (dígito verificador inválido)
isValidVin('00000000000000000'); // false (todos os caracteres iguais)
isValidVin('1HGCM8263IA004352'); // false (contém a letra excluída I)
isValidVin('1HGCM82633A00435'); // false (16 caracteres)
isValidVin('1HGCM 82633 A004352'); // false (um separador entre os caracteres)
```

Fonte: [ISO 3779:2009](https://www.iso.org/standard/52200.html), [49 CFR 565.15](https://www.ecfr.gov/current/title-49/section-565.15) e [Resolução CONTRAN nº 968/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9682022.pdf).

## Standard Schema

### toStandardSchema

Embrulha um utilitário `isValid*` em um [Standard Schema](https://standardschema.dev), o formato de validador que bibliotecas de formulário, roteadores e frameworks de API aceitam: TanStack Form, react-hook-form, tRPC, Hono e outros.

- O segundo argumento (`ToStandardSchemaOptions`) recebe `options`, repassado ao validador a cada chamada, e `message`, a mensagem da issue (padrão `'Invalid value'`).
- Valida de forma síncrona e não transforma: um valor válido volta como foi passado, um inválido gera uma única issue, e um validador que lança um erro conta como inválido.
- Validadores que recebem um objeto (`isValidBankAccount`, `isValidRegistroProfissional`, `isValidIe`) funcionam do mesmo jeito. Embrulhe o `isValidIe`, que tem sobrecarga, em uma arrow function: `toStandardSchema((params) => isValidIe(params))`.
- Os tipos da especificação (`StandardSchemaV1`, `StandardSchemaV1Result`, `StandardSchemaV1Issue` e os demais) também são exportados, então nada mais é instalado.

```javascript
import { isValidCnpj, isValidCpf, toStandardSchema } from '@brazilian-utils/brazilian-utils';

const cpf = toStandardSchema(isValidCpf, { message: 'CPF inválido' });

cpf['~standard'].validate('123.456.789-09'); // { value: '123.456.789-09' }
cpf['~standard'].validate('123'); // { issues: [{ message: 'CPF inválido' }] }

const cnpj = toStandardSchema(isValidCnpj, { options: { version: 2 } }); // CNPJ alfanumérico

// Tudo que recebe um Standard Schema aceita o resultado como está, um campo do TanStack Form por exemplo
<form.Field name="cpf" validators={{ onChange: cpf }} />;
```

Dentro de um schema do Zod ou do Valibot os validadores entram direto, sem wrapper, e o resultado já é um Standard Schema:

```javascript
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { isValidCep, isValidCpf } from '@brazilian-utils/brazilian-utils';
import { useForm } from 'react-hook-form';
import * as v from 'valibot';
import { z } from 'zod';

const zodSchema = z.object({
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  cep: z.string().refine(isValidCep, 'CEP inválido'),
});

const valibotSchema = v.object({
  cpf: v.pipe(v.string(), v.check(isValidCpf, 'CPF inválido')),
  cep: v.pipe(v.string(), v.check(isValidCep, 'CEP inválido')),
});

const form = useForm({ resolver: standardSchemaResolver(zodSchema) }); // ou valibotSchema
```

Fonte: [especificação do Standard Schema](https://standardschema.dev).
